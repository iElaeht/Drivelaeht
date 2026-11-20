import { NextRequest, NextResponse } from "next/server";
import { registerSchema } from "@/lib/validators";
import { registerUser } from "@/services/auth.service";

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
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid registration payload",
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const result = await registerUser(parsed.data, getClientMeta(req));

    return NextResponse.json(
      {
        message: "Account created. Verification code required.",
        user: result.user,
        twoFactorExpires: result.twoFactorExpires.toISOString(),
        ...(process.env.NODE_ENV !== "production"
          ? { debugTwoFactorCode: result.twoFactorCode }
          : {}),
      },
      { status: 201 }
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to register user";

    if (message.includes("already registered")) {
      return NextResponse.json({ error: message }, { status: 409 });
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}