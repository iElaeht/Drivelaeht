import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { registerSchema } from "@/lib/validators";
import {
  registerUser,
  type PendingRegistrationResolution,
} from "@/services/auth.service";

const pendingResolutionSchema = z
  .enum(["resume_existing", "replace_with_new"])
  .optional();

function getClientMeta(req: NextRequest) {
  const forwardedFor = req.headers.get("x-forwarded-for");
  const ipAddress =
    forwardedFor?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || null;
  const userAgent = req.headers.get("user-agent") || null;
  return { ipAddress, userAgent };
}

export async function POST(req: NextRequest) {
  try {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON payload" },
        { status: 400 }
      );
    }

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

    const rawBody =
      body && typeof body === "object"
        ? (body as { pendingResolution?: unknown })
        : null;

    const parsedResolution = pendingResolutionSchema.safeParse(
      rawBody?.pendingResolution
    );
    if (!parsedResolution.success) {
      return NextResponse.json(
        { error: "Invalid pending resolution option" },
        { status: 400 }
      );
    }

    const pendingResolution: PendingRegistrationResolution | undefined =
      parsedResolution.data;

    const result = await registerUser(
      {
        ...parsed.data,
        pendingResolution,
      },
      getClientMeta(req)
    );

    const isResumed = result.action !== "created";

    return NextResponse.json(
      {
        message: isResumed
          ? "Pending registration resumed. Verification code required."
          : "Account created. Verification code required.",
        requiresTwoFactor: true,
        action: result.action,
        email: result.user.email,
        user: result.user,
        twoFactorExpires: result.twoFactorExpires.toISOString(),
        ...(process.env.NODE_ENV !== "production"
          ? { debugTwoFactorCode: result.twoFactorCode }
          : {}),
      },
      { status: isResumed ? 200 : 201 }
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to register user";

    const extra =
      error && typeof error === "object"
        ? (error as {
            field?: unknown;
            statusCode?: unknown;
            lockedUntil?: unknown;
            pendingConflict?: unknown;
            pendingAction?: unknown;
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

    const field =
      extra?.field === "email" || extra?.field === "username"
        ? extra.field
        : undefined;

    if (field || message.includes("already registered")) {
      return NextResponse.json(
        {
          error: message,
          ...(field ? { field } : {}),
          ...(extra?.pendingConflict === true
            ? {
                pendingConflict: true,
                ...(extra?.pendingAction === "choose_resolution"
                  ? { pendingAction: "choose_resolution" }
                  : {}),
              }
            : {}),
        },
        { status: 409 }
      );
    }

    console.error("[POST /api/auth/register]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}