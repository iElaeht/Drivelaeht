import crypto from "node:crypto";
import { cookies } from "next/headers";
import type { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { SessionUser } from "@/types/drivelaeht";

export const SESSION_COOKIE_NAME = "drivelaeht_session";
const SESSION_TTL_DAYS = 14;

export function generateSessionToken(): string {
  return crypto.randomBytes(48).toString("hex");
}

export function getSessionExpirationDate(days = SESSION_TTL_DAYS): Date {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

export function attachSessionCookie(
  response: NextResponse,
  token: string,
  expiresAt: Date
): void {
  response.cookies.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

export function clearSessionCookie(response: NextResponse): void {
  response.cookies.set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(0),
  });
}

export async function getSessionContextByToken(token: string | undefined | null) {
  if (!token) {
    return null;
  }

  const now = new Date();
  const session = await prisma.session.findUnique({
    where: { token },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          username: true,
          avatarUrl: true,
          status: true,
          role: true,
          storageUsed: true,
          isEmailVerified: true,
          themePreference: true,
        },
      },
    },
  });

  if (!session) {
    return null;
  }

  if (session.expiresAt <= now) {
    await prisma.session.delete({ where: { id: session.id } }).catch(() => null);
    return null;
  }

  const user: SessionUser = {
    id: session.user.id,
    email: session.user.email,
    username: session.user.username,
    avatarUrl: session.user.avatarUrl,
    status: session.user.status as SessionUser["status"],
    role: session.user.role as SessionUser["role"],
    storageUsed: Number(session.user.storageUsed),
    isEmailVerified: session.user.isEmailVerified,
    themePreference: session.user.themePreference,
  };

  return {
    sessionId: session.id,
    token: session.token,
    expiresAt: session.expiresAt,
    user,
  };
}

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const ctx = await getSessionContextByToken(token);
  return ctx ? ctx.user : null;
}

export async function getCurrentSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  return getSessionContextByToken(token);
}