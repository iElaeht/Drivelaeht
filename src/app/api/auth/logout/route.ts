import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { SESSION_COOKIE_NAME, clearSessionCookie } from "@/lib/session";
import { logoutSessionByToken } from "@/services/auth.service";

function getClientMeta(req: NextRequest) {
  const forwardedFor = req.headers.get("x-forwarded-for");
  const ipAddress =
    forwardedFor?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || null;
  const userAgent = req.headers.get("user-agent") || null;
  return { ipAddress, userAgent };
}

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

    await logoutSessionByToken(token, getClientMeta(req));

    const response = NextResponse.json(
      { message: "Session closed" },
      { status: 200 }
    );

    clearSessionCookie(response);
    return response;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to close session";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}