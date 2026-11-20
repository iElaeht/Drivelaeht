import { NextRequest, NextResponse } from "next/server";
import { cancelTwoFactorVerification } from "@/services/auth.service";

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

    if (email) {
      await cancelTwoFactorVerification(email, getClientMeta(req));
    }

    return NextResponse.json({ cancelled: true }, { status: 200 });
  } catch {
    return NextResponse.json({ cancelled: true }, { status: 200 });
  }
}