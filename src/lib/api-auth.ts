import { NextRequest, NextResponse } from "next/server";
import { AuthFieldError } from "@/services/auth.service";

export function getClientMeta(req: NextRequest) {
  const forwardedFor = req.headers.get("x-forwarded-for");
  const ipAddress =
    forwardedFor?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || null;
  const userAgent = req.headers.get("user-agent") || null;
  return { ipAddress, userAgent };
}

export async function readJsonBody(
  req: NextRequest
): Promise<{ ok: true; data: unknown } | { ok: false; response: NextResponse }> {
  try {
    const data = await req.json();
    return { ok: true, data };
  } catch {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Invalid JSON payload" },
        { status: 400 }
      ),
    };
  }
}

export function handleAuthRouteError(error: unknown, logTag: string) {
  if (error instanceof AuthFieldError) {
    return NextResponse.json(
      {
        error: error.message,
        field: error.field,
        ...(typeof error.remainingAttempts === "number"
          ? { remainingAttempts: error.remainingAttempts }
          : {}),
      },
      { status: 400 }
    );
  }

  const message =
    error instanceof Error ? error.message : "Authentication request failed";

  const extra =
    error && typeof error === "object"
      ? (error as {
          statusCode?: unknown;
          lockedUntil?: unknown;
        })
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

  console.error(`[${logTag}]`, error);
  return NextResponse.json(
    { error: "Internal server error" },
    { status: 500 }
  );
}