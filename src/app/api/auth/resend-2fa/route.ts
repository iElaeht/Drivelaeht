import { NextRequest, NextResponse } from "next/server";
import { resendTwoFactorCode } from "@/services/auth.service";

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
    const email = typeof body?.email === "string" ? body.email.trim() : "";

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const result = await resendTwoFactorCode(email, getClientMeta(req));

    return NextResponse.json(
      {
        message: "Token reenviado",
        email: result.email,
        twoFactorExpires: result.twoFactorExpires.toISOString(),
        ...(process.env.NODE_ENV !== "production"
          ? { debugTwoFactorCode: result.twoFactorCode }
          : {}),
      },
      { status: 200 }
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to resend code";

    const extra =
      error && typeof error === "object"
        ? (error as { statusCode?: unknown; lockedUntil?: unknown })
        : null;

    if (extra?.statusCode === 429 || typeof extra?.lockedUntil === "string") {
      return NextResponse.json(
        {
          error: message,
          ...(typeof extra?.lockedUntil === "string"
            ? { lockedUntil: extra.lockedUntil }
            : {}),
        },
        { status: 429 }
      );
    }

    return NextResponse.json({ error: message }, { status: 400 });
  }
}