import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { ensureUserStorageDir } from "@/lib/storage";
import { validateEmailDomain } from "@/lib/email-domain";
import {
  generateSessionToken,
  getSessionExpirationDate,
} from "@/lib/session";
import {
  sendAccountReminderEmail,
  sendPasswordResetCodeEmail,
  sendRegistrationCodeEmail,
} from "@/lib/mailer";

const BCRYPT_ROUNDS = 12;
const MAX_FAILED_ATTEMPTS = 5;
const LOCK_DURATION_MINUTES = 10;
const MAX_2FA_ATTEMPTS = 5;
const TWO_FACTOR_LOCK_MINUTES = 10;
const TWO_FACTOR_TTL_MINUTES = 10;
const MAX_RESET_ATTEMPTS = 5;
const RESET_LOCK_MINUTES = 10;
const RESET_TTL_MINUTES = 10;
const UNVERIFIED_CLEANUP_MINUTES = 30;
const UNVERIFIED_RESET_MESSAGE =
  "Esta cuenta aún no tiene un correo verificado. Completa o crea tu registro para solicitar la recuperación.";

export type PendingRegistrationResolution =
  | "resume_existing"
  | "replace_with_new";

interface RequestMeta {
  ipAddress?: string | null;
  userAgent?: string | null;
}

export class AuthFieldError extends Error {
  field: "email" | "username" | "password";
  remainingAttempts?: number;
  pendingConflict?: boolean;
  pendingAction?: "choose_resolution";

  constructor(
    field: "email" | "username" | "password",
    message: string,
    remainingAttempts?: number,
    options?: {
      pendingConflict?: boolean;
      pendingAction?: "choose_resolution";
    }
  ) {
    super(message);
    this.name = "AuthFieldError";
    this.field = field;
    this.remainingAttempts = remainingAttempts;
    this.pendingConflict = options?.pendingConflict;
    this.pendingAction = options?.pendingAction;
  }
}

export class AccountLockedError extends Error {
  statusCode = 429;
  lockedUntil: string;

  constructor(
    lockedUntil: Date,
    message = "Account is temporarily locked due to failed attempts"
  ) {
    super(message);
    this.name = "AccountLockedError";
    this.lockedUntil = lockedUntil.toISOString();
  }
}

export function generateSixDigitCode(): string {
  return crypto.randomInt(100000, 1000000).toString();
}

export function getTwoFactorExpirationDate(): Date {
  return new Date(Date.now() + TWO_FACTOR_TTL_MINUTES * 60 * 1000);
}

export function getPasswordResetExpirationDate(): Date {
  return new Date(Date.now() + RESET_TTL_MINUTES * 60 * 1000);
}

function getUnverifiedCutoffDate(now = new Date()): Date {
  return new Date(now.getTime() - UNVERIFIED_CLEANUP_MINUTES * 60 * 1000);
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

export async function cleanupExpiredUnverifiedUsers(
  now = new Date()
): Promise<number> {
  const cutoff = getUnverifiedCutoffDate(now);

  const deleted = await prisma.user.deleteMany({
    where: {
      isEmailVerified: false,
      updatedAt: { lt: cutoff },
      OR: [
        { twoFactorLockedUntil: null },
        { twoFactorLockedUntil: { lte: now } },
      ],
    },
  });

  return deleted.count;
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
    pendingResolution?: PendingRegistrationResolution;
  },
  meta: RequestMeta = {}
) {
  const normalizedEmail = input.email.trim().toLowerCase();
  const normalizedUsername = input.username.trim();
  const now = new Date();

  const domainCheck = await validateEmailDomain(normalizedEmail);
  if (!domainCheck.valid) {
    throw new AuthFieldError(
      "email",
      domainCheck.reason || "No pudimos verificar este correo. Revisa que esté bien escrito."
    );
  }

  await cleanupExpiredUnverifiedUsers(now);

  const existingRecords = await prisma.user.findMany({
    where: {
      OR: [
        { email: { equals: normalizedEmail, mode: "insensitive" } },
        { username: { equals: normalizedUsername, mode: "insensitive" } },
      ],
    },
    select: {
      id: true,
      email: true,
      username: true,
      isEmailVerified: true,
      twoFactorCode: true,
      twoFactorExpires: true,
      twoFactorAttempts: true,
      twoFactorLockedUntil: true,
    },
  });

  const verifiedEmailConflict = existingRecords.find(
    (r) => r.isEmailVerified && r.email.toLowerCase() === normalizedEmail
  );
  if (verifiedEmailConflict) {
    throw new AuthFieldError("email", "Correo Email ya se encuentra en uso");
  }

  const verifiedUsernameConflict = existingRecords.find(
    (r) =>
      r.isEmailVerified &&
      r.username.toLowerCase() === normalizedUsername.toLowerCase()
  );
  if (verifiedUsernameConflict) {
    throw new AuthFieldError("username", "El usuario ya existe");
  }

  const pendingEmailUser = existingRecords.find(
    (r) => !r.isEmailVerified && r.email.toLowerCase() === normalizedEmail
  );

  if (pendingEmailUser) {
    if (
      pendingEmailUser.twoFactorLockedUntil &&
      pendingEmailUser.twoFactorLockedUntil > now
    ) {
      throw new AccountLockedError(
        pendingEmailUser.twoFactorLockedUntil,
        "2FA verification is temporarily locked due to failed attempts"
      );
    }

    const sameUsername =
      pendingEmailUser.username.toLowerCase() ===
      normalizedUsername.toLowerCase();

    if (!sameUsername && !input.pendingResolution) {
      throw new AuthFieldError(
        "username",
        "Este correo ya tiene un registro pendiente con otro nombre de usuario.",
        undefined,
        {
          pendingConflict: true,
          pendingAction: "choose_resolution",
        }
      );
    }

    const otherUnverified = existingRecords.filter(
      (r) => !r.isEmailVerified && r.id !== pendingEmailUser.id
    );

    const hasValidExistingCode =
      sameUsername &&
      Boolean(pendingEmailUser.twoFactorCode) &&
      Boolean(pendingEmailUser.twoFactorExpires) &&
      pendingEmailUser.twoFactorExpires! > now;

    const twoFactorCode = hasValidExistingCode
      ? pendingEmailUser.twoFactorCode!
      : generateSixDigitCode();
    const twoFactorExpires = hasValidExistingCode
      ? pendingEmailUser.twoFactorExpires!
      : getTwoFactorExpirationDate();

    const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);

    const updatedUser = await prisma.$transaction(async (tx) => {
      let targetUsername = pendingEmailUser.username;

      if (!sameUsername && input.pendingResolution === "replace_with_new") {
        const usernameTakenByOther = await tx.user.findFirst({
          where: {
            username: { equals: normalizedUsername, mode: "insensitive" },
            id: { not: pendingEmailUser.id },
          },
          select: { id: true },
        });
        if (usernameTakenByOther) {
          throw new AuthFieldError("username", "El usuario ya existe");
        }
        targetUsername = normalizedUsername;
      }

      if (otherUnverified.length > 0) {
        await tx.user.deleteMany({
          where: { id: { in: otherUnverified.map((r) => r.id) } },
        });
      }

      return tx.user.update({
        where: { id: pendingEmailUser.id },
        data: {
          email: pendingEmailUser.email,
          username: targetUsername,
          passwordHash,
          twoFactorCode,
          twoFactorExpires,
          twoFactorAttempts: 0,
          twoFactorLockedUntil: null,
        },
        select: {
          id: true,
          email: true,
          username: true,
          isEmailVerified: true,
          createdAt: true,
        },
      });
    });

    await sendRegistrationCodeEmail(updatedUser.email, twoFactorCode);
    await logActivity(
      updatedUser.id,
      sameUsername
        ? "AUTH_REGISTER_RESUME_2FA"
        : input.pendingResolution === "resume_existing"
          ? "AUTH_REGISTER_RESUME_EXISTING_USERNAME"
          : "AUTH_REGISTER_REPLACED_PENDING_USERNAME",
      meta
    );

    return {
      user: updatedUser,
      twoFactorCode,
      twoFactorExpires,
      action: sameUsername ? ("resumed" as const) : input.pendingResolution!,
    };
  }

  const pendingUsernameConflict = existingRecords.find(
    (r) =>
      !r.isEmailVerified &&
      r.username.toLowerCase() === normalizedUsername.toLowerCase()
  );
  if (pendingUsernameConflict) {
    throw new AuthFieldError("username", "El usuario ya existe");
  }

  const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);
  const twoFactorCode = generateSixDigitCode();
  const twoFactorExpires = getTwoFactorExpirationDate();

  const user = await prisma.$transaction(async (tx) => {
    const concurrentConflict = await tx.user.findFirst({
      where: {
        OR: [
          { email: { equals: normalizedEmail, mode: "insensitive" } },
          {
            username: { equals: normalizedUsername, mode: "insensitive" },
            isEmailVerified: true,
          },
        ],
      },
      select: { id: true, email: true, isEmailVerified: true },
    });

    if (concurrentConflict) {
      if (concurrentConflict.email.toLowerCase() === normalizedEmail) {
        throw new AuthFieldError("email", "Correo Email ya se encuentra en uso");
      }
      throw new AuthFieldError("username", "El usuario ya existe");
    }

    if (existingRecords.length > 0) {
      await tx.user.deleteMany({
        where: {
          id: { in: existingRecords.map((r) => r.id) },
          isEmailVerified: false,
        },
      });
    }

    return tx.user.create({
      data: {
        email: normalizedEmail,
        username: normalizedUsername,
        passwordHash,
        twoFactorCode,
        twoFactorExpires,
        twoFactorAttempts: 0,
        twoFactorLockedUntil: null,
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
  });

  ensureUserStorageDir(user.email);
  await sendRegistrationCodeEmail(user.email, twoFactorCode);
  await logActivity(user.id, "AUTH_REGISTER", meta);

  return {
    user,
    twoFactorCode,
    twoFactorExpires,
    action: "created" as const,
  };
}

export async function createDeviceSession(
  userId: string,
  meta: RequestMeta = {}
) {
  const token = generateSessionToken();
  const expiresAt = getSessionExpirationDate();

  const session = await prisma.$transaction(async (tx) => {
    await tx.session.deleteMany({
      where: {
        userId,
        expiresAt: { lte: new Date() },
      },
    });

    const created = await tx.session.create({
      data: {
        userId,
        token,
        deviceAgent: meta.userAgent ?? null,
        ipAddress: meta.ipAddress ?? null,
        expiresAt,
      },
    });

    await tx.user.update({
      where: { id: userId },
      data: {
        status: "ONLINE",
        lastKnownIp: meta.ipAddress ?? null,
        failedLoginAttempts: 0,
        lockedUntil: null,
        twoFactorAttempts: 0,
        twoFactorLockedUntil: null,
      },
    });

    return created;
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
  const normalizedCode = code.trim();
  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });

  if (!user) {
    throw new Error("Invalid or expired verification code");
  }

  const now = new Date();
  if (user.twoFactorLockedUntil && user.twoFactorLockedUntil > now) {
    await logActivity(user.id, "AUTH_2FA_LOCKED", meta);
    throw new AccountLockedError(
      user.twoFactorLockedUntil,
      "2FA verification is temporarily locked due to failed attempts"
    );
  }

  if (user.twoFactorLockedUntil && user.twoFactorLockedUntil <= now) {
    await prisma.user.update({
      where: { id: user.id },
      data: {
        twoFactorAttempts: 0,
        twoFactorLockedUntil: null,
      },
    });
    user.twoFactorAttempts = 0;
    user.twoFactorLockedUntil = null;
  }

  if (!user.twoFactorCode || !user.twoFactorExpires) {
    throw new Error("Invalid or expired verification code");
  }

  if (user.twoFactorExpires <= now) {
    throw new Error("Verification code has expired");
  }

  if (user.twoFactorCode !== normalizedCode) {
    const nextAttempts = user.twoFactorAttempts + 1;
    const shouldLock = nextAttempts >= MAX_2FA_ATTEMPTS;
    const lockedUntil = shouldLock
      ? new Date(Date.now() + TWO_FACTOR_LOCK_MINUTES * 60 * 1000)
      : null;

    await prisma.user.update({
      where: { id: user.id },
      data: {
        twoFactorAttempts: shouldLock ? 0 : nextAttempts,
        twoFactorLockedUntil: lockedUntil,
      },
    });

    await logActivity(user.id, "AUTH_2FA_FAILED", meta);

    if (shouldLock && lockedUntil) {
      throw new AccountLockedError(
        lockedUntil,
        "2FA verification is temporarily locked due to failed attempts"
      );
    }

    const remainingAttempts = Math.max(0, MAX_2FA_ATTEMPTS - nextAttempts);
    throw new AuthFieldError(
      "password",
      "Invalid verification code",
      remainingAttempts
    );
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      isEmailVerified: true,
      twoFactorCode: null,
      twoFactorExpires: null,
      twoFactorAttempts: 0,
      twoFactorLockedUntil: null,
    },
  });

  const session = await createDeviceSession(user.id, meta);
  await logActivity(user.id, "AUTH_2FA_VERIFIED", meta);

  return { user, session };
}

export async function resendTwoFactorCode(
  email: string,
  meta: RequestMeta = {}
) {
  const normalizedEmail = email.trim().toLowerCase();
  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });

  if (!user) {
    throw new Error("User not found");
  }

  const now = new Date();
  if (user.twoFactorLockedUntil && user.twoFactorLockedUntil > now) {
    await logActivity(user.id, "AUTH_2FA_LOCKED", meta);
    throw new AccountLockedError(
      user.twoFactorLockedUntil,
      "2FA verification is temporarily locked due to failed attempts"
    );
  }

  const hadExpiredLock = Boolean(
    user.twoFactorLockedUntil && user.twoFactorLockedUntil <= now
  );
  const twoFactorCode = generateSixDigitCode();
  const twoFactorExpires = getTwoFactorExpirationDate();

  await prisma.user.update({
    where: { id: user.id },
    data: {
      twoFactorCode,
      twoFactorExpires,
      ...(hadExpiredLock
        ? {
            twoFactorAttempts: 0,
            twoFactorLockedUntil: null,
          }
        : {}),
    },
  });

  await sendRegistrationCodeEmail(user.email, twoFactorCode);
  await logActivity(user.id, "AUTH_2FA_RESENT", meta);

  return {
    email: user.email,
    twoFactorCode,
    twoFactorExpires,
  };
}

export async function cancelTwoFactorVerification(
  email: string,
  meta: RequestMeta = {}
): Promise<void> {
  const normalizedEmail = email.trim().toLowerCase();
  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    select: {
      id: true,
      isEmailVerified: true,
      twoFactorAttempts: true,
      twoFactorLockedUntil: true,
    },
  });

  if (!user) {
    return;
  }

  const now = new Date();
  const isCurrentlyLocked = Boolean(
    user.twoFactorLockedUntil && user.twoFactorLockedUntil > now
  );
  const hasFailedAttempts = user.twoFactorAttempts > 0;

  if (!user.isEmailVerified && !isCurrentlyLocked && !hasFailedAttempts) {
    await logActivity(null, "AUTH_2FA_CANCELLED_UNVERIFIED_DELETED", meta);
    await prisma.user.delete({
      where: { id: user.id },
    });
    return;
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      twoFactorCode: null,
      twoFactorExpires: null,
    },
  });

  await logActivity(user.id, "AUTH_2FA_CANCELLED", meta);
}

export async function requestPasswordReset(
  email: string,
  meta: RequestMeta = {}
) {
  const normalizedEmail = email.trim().toLowerCase();
  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    select: {
      id: true,
      email: true,
      username: true,
      isEmailVerified: true,
      resetCode: true,
      resetExpires: true,
      resetAttempts: true,
      resetLockedUntil: true,
    },
  });

  if (!user || !user.isEmailVerified) {
    await logActivity(null, "AUTH_RESET_UNKNOWN_OR_UNVERIFIED", meta);
    throw new AuthFieldError("email", UNVERIFIED_RESET_MESSAGE);
  }

  const now = new Date();
  if (user.resetLockedUntil && user.resetLockedUntil > now) {
    await logActivity(user.id, "AUTH_RESET_LOCKED", meta);
    throw new AccountLockedError(
      user.resetLockedUntil,
      "Password reset is temporarily locked due to failed attempts"
    );
  }

  const hadExpiredLock = Boolean(
    user.resetLockedUntil && user.resetLockedUntil <= now
  );
  const resetCode = generateSixDigitCode();
  const resetExpires = getPasswordResetExpirationDate();

  await prisma.user.update({
    where: { id: user.id },
    data: {
      resetCode,
      resetExpires,
      ...(hadExpiredLock
        ? {
            resetAttempts: 0,
            resetLockedUntil: null,
          }
        : {}),
    },
  });

  await sendPasswordResetCodeEmail(user.email, user.username, resetCode);
  await logActivity(user.id, "AUTH_RESET_REQUESTED", meta);

  return {
    sent: true,
    email: user.email,
    resetCode,
    resetExpires,
  };
}

export async function resendPasswordResetCode(
  email: string,
  meta: RequestMeta = {}
) {
  const normalizedEmail = email.trim().toLowerCase();
  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    select: {
      id: true,
      email: true,
      username: true,
      isEmailVerified: true,
      resetLockedUntil: true,
    },
  });

  if (!user || !user.isEmailVerified) {
    await logActivity(null, "AUTH_RESET_RESEND_UNKNOWN_OR_UNVERIFIED", meta);
    throw new AuthFieldError("email", UNVERIFIED_RESET_MESSAGE);
  }

  const now = new Date();
  if (user.resetLockedUntil && user.resetLockedUntil > now) {
    await logActivity(user.id, "AUTH_RESET_LOCKED", meta);
    throw new AccountLockedError(
      user.resetLockedUntil,
      "Password reset is temporarily locked due to failed attempts"
    );
  }

  const hadExpiredLock = Boolean(
    user.resetLockedUntil && user.resetLockedUntil <= now
  );
  const resetCode = generateSixDigitCode();
  const resetExpires = getPasswordResetExpirationDate();

  await prisma.user.update({
    where: { id: user.id },
    data: {
      resetCode,
      resetExpires,
      ...(hadExpiredLock
        ? {
            resetAttempts: 0,
            resetLockedUntil: null,
          }
        : {}),
    },
  });

  await sendPasswordResetCodeEmail(user.email, user.username, resetCode);
  await logActivity(user.id, "AUTH_RESET_RESENT", meta);

  return {
    sent: true,
    email: user.email,
    resetCode,
    resetExpires,
  };
}

export async function verifyPasswordResetCode(
  email: string,
  code: string,
  meta: RequestMeta = {}
) {
  const normalizedEmail = email.trim().toLowerCase();
  const normalizedCode = code.trim();
  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    select: {
      id: true,
      email: true,
      username: true,
      isEmailVerified: true,
      resetCode: true,
      resetExpires: true,
      resetAttempts: true,
      resetLockedUntil: true,
    },
  });

  if (!user || !user.isEmailVerified) {
    throw new Error("Invalid or expired recovery code");
  }

  const now = new Date();
  if (user.resetLockedUntil && user.resetLockedUntil > now) {
    await logActivity(user.id, "AUTH_RESET_LOCKED", meta);
    throw new AccountLockedError(
      user.resetLockedUntil,
      "Password reset is temporarily locked due to failed attempts"
    );
  }

  if (user.resetLockedUntil && user.resetLockedUntil <= now) {
    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetAttempts: 0,
        resetLockedUntil: null,
      },
    });
    user.resetAttempts = 0;
    user.resetLockedUntil = null;
  }

  if (!user.resetCode || !user.resetExpires) {
    throw new Error("Invalid or expired recovery code");
  }

  if (user.resetExpires <= now) {
    throw new Error("Recovery code has expired");
  }

  if (user.resetCode !== normalizedCode) {
    const nextAttempts = user.resetAttempts + 1;
    const shouldLock = nextAttempts >= MAX_RESET_ATTEMPTS;
    const lockedUntil = shouldLock
      ? new Date(Date.now() + RESET_LOCK_MINUTES * 60 * 1000)
      : null;

    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetAttempts: shouldLock ? 0 : nextAttempts,
        resetLockedUntil: lockedUntil,
      },
    });

    await logActivity(user.id, "AUTH_RESET_FAILED", meta);

    if (shouldLock && lockedUntil) {
      throw new AccountLockedError(
        lockedUntil,
        "Password reset is temporarily locked due to failed attempts"
      );
    }

    const remainingAttempts = Math.max(0, MAX_RESET_ATTEMPTS - nextAttempts);
    throw new AuthFieldError(
      "password",
      "Invalid recovery code",
      remainingAttempts
    );
  }

  await logActivity(user.id, "AUTH_RESET_CODE_VERIFIED", meta);

  return {
    verified: true,
    email: user.email,
    username: user.username,
  };
}

export async function completePasswordReset(
  input: {
    email: string;
    code: string;
    newPassword: string;
    newUsername?: string;
    revokeAllSessions?: boolean;
  },
  meta: RequestMeta = {}
) {
  const verified = await verifyPasswordResetCode(
    input.email,
    input.code,
    meta
  );

  const normalizedCode = input.code.trim();
  const now = new Date();
  const passwordHash = await bcrypt.hash(input.newPassword, BCRYPT_ROUNDS);

  const updated = await prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({
      where: { email: verified.email },
      select: {
        id: true,
        email: true,
        username: true,
        isEmailVerified: true,
        resetCode: true,
        resetExpires: true,
      },
    });

    if (
      !user ||
      !user.isEmailVerified ||
      !user.resetCode ||
      !user.resetExpires ||
      user.resetExpires <= now ||
      user.resetCode !== normalizedCode
    ) {
      throw new Error("Invalid or expired recovery code");
    }

    const trimmedUsername = input.newUsername?.trim();
    let finalUsername = user.username;

    if (trimmedUsername && trimmedUsername !== user.username) {
      const usernameConflict = await tx.user.findFirst({
        where: {
          username: { equals: trimmedUsername, mode: "insensitive" },
          id: { not: user.id },
        },
        select: { id: true },
      });

      if (usernameConflict) {
        throw new AuthFieldError(
          "username",
          "Este nombre de usuario ya está en uso"
        );
      }

      finalUsername = trimmedUsername;
    }

    const savedUser = await tx.user.update({
      where: { id: user.id },
      data: {
        username: finalUsername,
        passwordHash,
        resetCode: null,
        resetExpires: null,
        resetAttempts: 0,
        resetLockedUntil: null,
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
      select: {
        id: true,
        email: true,
        username: true,
      },
    });

    if (input.revokeAllSessions) {
      await tx.session.deleteMany({
        where: { userId: user.id },
      });
    }

    return savedUser;
  });

  await logActivity(updated.id, "AUTH_PASSWORD_RESET_COMPLETED", meta);

  return {
    email: updated.email,
    username: updated.username,
  };
}

export async function sendUsernameReminder(
  username: string,
  meta: RequestMeta = {}
): Promise<void> {
  const normalizedUsername = username.trim();
  const user = await prisma.user.findFirst({
    where: {
      username: { equals: normalizedUsername, mode: "insensitive" },
    },
    select: {
      id: true,
      email: true,
      username: true,
      isEmailVerified: true,
    },
  });

  if (!user || !user.isEmailVerified) {
    await logActivity(null, "AUTH_USERNAME_REMINDER_UNKNOWN", meta);
    return;
  }

  await sendAccountReminderEmail(user.email, user.username);
  await logActivity(user.id, "AUTH_USERNAME_REMINDER_SENT", meta);
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
    throw new AuthFieldError("email", "Invalid email");
  }

  const now = new Date();
  if (user.lockedUntil && user.lockedUntil > now) {
    await logActivity(user.id, "AUTH_LOGIN_LOCKED", meta);
    throw new AccountLockedError(user.lockedUntil);
  }

  const validPassword = await bcrypt.compare(password, user.passwordHash);
  if (!validPassword) {
    const nextAttempts = user.failedLoginAttempts + 1;
    const shouldLock = nextAttempts >= MAX_FAILED_ATTEMPTS;
    const lockedUntil = shouldLock
      ? new Date(Date.now() + LOCK_DURATION_MINUTES * 60 * 1000)
      : null;

    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: shouldLock ? 0 : nextAttempts,
        lockedUntil,
      },
    });

    await logActivity(user.id, "AUTH_LOGIN_FAILED", meta);

    if (shouldLock && lockedUntil) {
      throw new AccountLockedError(lockedUntil);
    }

    const remainingAttempts = Math.max(0, MAX_FAILED_ATTEMPTS - nextAttempts);
    throw new AuthFieldError("password", "Invalid password", remainingAttempts);
  }

  if (!user.isEmailVerified) {
    await logActivity(user.id, "AUTH_LOGIN_UNVERIFIED_REJECTED", meta);
    throw new AuthFieldError("email", "Invalid email or password");
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