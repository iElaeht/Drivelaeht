import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { ensureUserStorageDir } from "@/lib/storage";
import {
  generateSessionToken,
  getSessionExpirationDate,
} from "@/lib/session";

const BCRYPT_ROUNDS = 12;
const MAX_FAILED_ATTEMPTS = 5;
const LOCK_DURATION_MINUTES = 15;
const TWO_FACTOR_TTL_MINUTES = 10;

interface RequestMeta {
  ipAddress?: string | null;
  userAgent?: string | null;
}

export function generateSixDigitCode(): string {
  return crypto.randomInt(100000, 1000000).toString();
}

export function getTwoFactorExpirationDate(): Date {
  return new Date(Date.now() + TWO_FACTOR_TTL_MINUTES * 60 * 1000);
}

export async function logActivity(
  userId: string | null,
  action: string,
  meta: RequestMeta = {}
): Promise<void> {
  await prisma.activityLog.create({
    data: {
      userId,
      action,
      ipAddress: meta.ipAddress ?? null,
      userAgent: meta.userAgent ?? null,
    },
  });
}

export async function registerUser(
  input: {
    email: string;
    username: string;
    password: string;
    firstName?: string | null;
    lastName?: string | null;
    country?: string | null;
    city?: string | null;
    birthDate?: string | null;
  },
  meta: RequestMeta = {}
) {
  const normalizedEmail = input.email.trim().toLowerCase();
  const normalizedUsername = input.username.trim();

  const existing = await prisma.user.findFirst({
    where: {
      OR: [{ email: normalizedEmail }, { username: normalizedUsername }],
    },
    select: { id: true, email: true, username: true },
  });

  if (existing) {
    throw new Error("Email or username is already registered");
  }

  const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);
  const twoFactorCode = generateSixDigitCode();
  const twoFactorExpires = getTwoFactorExpirationDate();

  const user = await prisma.user.create({
    data: {
      email: normalizedEmail,
      username: normalizedUsername,
      passwordHash,
      twoFactorCode,
      twoFactorExpires,
      isEmailVerified: false,
      status: "ONLINE",
    },
    select: {
      id: true,
      email: true,
      username: true,
      isEmailVerified: true,
      createdAt: true,
    },
  });

  ensureUserStorageDir(user.email);

  await logActivity(user.id, "AUTH_REGISTER", meta);

  return {
    user,
    twoFactorCode,
    twoFactorExpires,
  };
}

export async function createDeviceSession(
  userId: string,
  meta: RequestMeta = {}
) {
  const token = generateSessionToken();
  const expiresAt = getSessionExpirationDate();

  const session = await prisma.session.create({
    data: {
      userId,
      token,
      deviceAgent: meta.userAgent ?? null,
      ipAddress: meta.ipAddress ?? null,
      expiresAt,
    },
  });

  await prisma.user.update({
    where: { id: userId },
    data: {
      status: "ONLINE",
      lastKnownIp: meta.ipAddress ?? null,
      failedLoginAttempts: 0,
      lockedUntil: null,
    },
  });

  await logActivity(userId, "AUTH_SESSION_CREATED", meta);

  return session;
}

export async function verifyTwoFactorAndCreateSession(
  email: string,
  code: string,
  meta: RequestMeta = {}
) {
  const normalizedEmail = email.trim().toLowerCase();
  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });

  if (!user || !user.twoFactorCode || !user.twoFactorExpires) {
    throw new Error("Invalid or expired verification code");
  }

  if (user.twoFactorExpires <= new Date()) {
    throw new Error("Verification code has expired");
  }

  if (user.twoFactorCode !== code) {
    await logActivity(user.id, "AUTH_2FA_FAILED", meta);
    throw new Error("Invalid verification code");
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      isEmailVerified: true,
      twoFactorCode: null,
      twoFactorExpires: null,
    },
  });

  const session = await createDeviceSession(user.id, meta);
  await logActivity(user.id, "AUTH_2FA_VERIFIED", meta);

  return { user, session };
}

export async function loginUser(
  email: string,
  password: string,
  meta: RequestMeta = {}
) {
  const normalizedEmail = email.trim().toLowerCase();
  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });

  if (!user) {
    await logActivity(null, "AUTH_LOGIN_UNKNOWN_USER", meta);
    throw new Error("Invalid credentials");
  }

  const now = new Date();
  if (user.lockedUntil && user.lockedUntil > now) {
    await logActivity(user.id, "AUTH_LOGIN_LOCKED", meta);
    throw new Error("Account is temporarily locked due to failed attempts");
  }

  const validPassword = await bcrypt.compare(password, user.passwordHash);
  if (!validPassword) {
    const nextAttempts = user.failedLoginAttempts + 1;
    const shouldLock = nextAttempts >= MAX_FAILED_ATTEMPTS;

    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: shouldLock ? 0 : nextAttempts,
        lockedUntil: shouldLock
          ? new Date(Date.now() + LOCK_DURATION_MINUTES * 60 * 1000)
          : null,
      },
    });

    await logActivity(user.id, "AUTH_LOGIN_FAILED", meta);
    throw new Error("Invalid credentials");
  }

  if (!user.isEmailVerified) {
    const twoFactorCode = generateSixDigitCode();
    const twoFactorExpires = getTwoFactorExpirationDate();

    await prisma.user.update({
      where: { id: user.id },
      data: {
        twoFactorCode,
        twoFactorExpires,
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
    });

    await logActivity(user.id, "AUTH_2FA_CHALLENGE_ISSUED", meta);

    return {
      requiresTwoFactor: true as const,
      email: user.email,
      twoFactorCode,
      twoFactorExpires,
    };
  }

  const session = await createDeviceSession(user.id, meta);
  await logActivity(user.id, "AUTH_LOGIN_SUCCESS", meta);

  return {
    requiresTwoFactor: false as const,
    user,
    session,
  };
}

export async function logoutSessionByToken(
  token: string | undefined | null,
  meta: RequestMeta = {}
): Promise<void> {
  if (!token) {
    return;
  }

  const existing = await prisma.session.findUnique({
    where: { token },
    select: { id: true, userId: true },
  });

  if (existing) {
    await prisma.session.delete({ where: { token } });
    await logActivity(existing.userId, "AUTH_LOGOUT", meta);
  }
}

export async function listUserSessions(userId: string, currentSessionId?: string) {
  const sessions = await prisma.session.findMany({
    where: {
      userId,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      deviceAgent: true,
      ipAddress: true,
      expiresAt: true,
      createdAt: true,
    },
  });

  return sessions.map((s) => ({
    ...s,
    expiresAt: s.expiresAt.toISOString(),
    createdAt: s.createdAt.toISOString(),
    isCurrent: s.id === currentSessionId,
  }));
}

export async function revokeUserSession(
  userId: string,
  sessionId: string,
  meta: RequestMeta = {}
): Promise<boolean> {
  const result = await prisma.session.deleteMany({
    where: {
      id: sessionId,
      userId,
    },
  });

  if (result.count > 0) {
    await logActivity(userId, "AUTH_SESSION_REVOKED", meta);
    return true;
  }

  return false;
}