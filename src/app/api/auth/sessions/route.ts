import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/session";
import {
  listUserSessions,
  revokeUserSession,
} from "@/services/auth.service";

function getClientMeta(req: NextRequest) {
  const forwardedFor = req.headers.get("x-forwarded-for");
  const ipAddress =
    forwardedFor?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || null;
  const userAgent = req.headers.get("user-agent") || null;
  return { ipAddress, userAgent };
}

export async function GET() {
  try {
    const current = await getCurrentSession();

    if (!current) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const sessions = await listUserSessions(current.user.id, current.sessionId);

    return NextResponse.json({ sessions }, { status: 200 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load sessions";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const current = await getCurrentSession();

    if (!current) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get("sessionId")?.trim();

    if (!sessionId) {
      return NextResponse.json(
        { error: "sessionId is required" },
        { status: 400 }
      );
    }

    const revoked = await revokeUserSession(
      current.user.id,
      sessionId,
      getClientMeta(req)
    );

    if (!revoked) {
      return NextResponse.json(
        { error: "Session not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: "Session revoked" }, { status: 200 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to revoke session";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}