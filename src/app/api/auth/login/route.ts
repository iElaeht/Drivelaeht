import { NextRequest, NextResponse } from "next/server";
import { loginSchema } from "@/lib/validators";
import { loginUser } from "@/services/auth.service";
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
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid login payload",
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const result = await loginUser(
      parsed.data.email,
      parsed.data.password,
      getClientMeta(req)
    );

    if (result.requiresTwoFactor) {
      return NextResponse.json(
        {
          requiresTwoFactor: true,
          email: result.email,
          twoFactorExpires: result.twoFactorExpires.toISOString(),
          ...(process.env.NODE_ENV !== "production"
            ? { debugTwoFactorCode: result.twoFactorCode }
            : {}),
        },
        { status: 200 }
      );
    }

    const response = NextResponse.json(
      {
        requiresTwoFactor: false,
        user: {
          id: result.user.id,
          email: result.user.email,
          username: result.user.username,
          avatarUrl: result.user.avatarUrl,
          status: result.user.status,
          role: result.user.role,
          storageUsed: Number(result.user.storageUsed),
          isEmailVerified: result.user.isEmailVerified,
          themePreference: result.user.themePreference,
        },
      },
      { status: 200 }
    );

    attachSessionCookie(response, result.session.token, result.session.expiresAt);
    return response;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Authentication failed";

    if (message.includes("locked")) {
      return NextResponse.json({ error: message }, { status: 429 });
    }

    return NextResponse.json({ error: message }, { status: 401 });
  }
}