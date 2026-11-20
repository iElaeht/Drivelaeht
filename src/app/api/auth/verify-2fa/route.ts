import { NextRequest, NextResponse } from "next/server";
import { verifyTwoFactorSchema } from "@/lib/validators";
import { verifyTwoFactorAndCreateSession } from "@/services/auth.service";
import { attachSessionCookie } from "@/lib/session";

function getClientMeta(req: NextRequest) {
  const forwardedFor = req.headers.get("x-forwarded-for");
  const ipAddress =
    forwardedFor?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || null;
  const userAgent = req.headers.get("user-agent") || null;
  return { ipAddress, userAgent };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = verifyTwoFactorSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid verification payload",
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { user, session } = await verifyTwoFactorAndCreateSession(
      parsed.data.email,
      parsed.data.code,
      getClientMeta(req)
    );

    const response = NextResponse.json(
      {
        message: "Verification successful",
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          avatarUrl: user.avatarUrl,
          status: user.status,
          role: user.role,
          storageUsed: Number(user.storageUsed),
          isEmailVerified: user.isEmailVerified,
          themePreference: user.themePreference,
        },
      },
      { status: 200 }
    );

    attachSessionCookie(response, session.token, session.expiresAt);
    return response;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to verify code";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}