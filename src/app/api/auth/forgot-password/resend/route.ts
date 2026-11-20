import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  getClientMeta,
  handleAuthRouteError,
  readJsonBody,
} from "@/lib/api-auth";
import { resendPasswordResetCode } from "@/services/auth.service";

const resendSchema = z.object({
  email: z.string().trim().email("Correo electrónico no válido"),
});

export async function POST(req: NextRequest) {
  try {
    const bodyResult = await readJsonBody(req);
    if (!bodyResult.ok) {
      return bodyResult.response;
    }

    const parsed = resendSchema.safeParse(bodyResult.data);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid resend payload",
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const result = await resendPasswordResetCode(
      parsed.data.email,
      getClientMeta(req)
    );

    return NextResponse.json(
      {
        message: "Nuevo código de recuperación enviado.",
        email: result.email,
        resetExpires: result.resetExpires.toISOString(),
        ...(process.env.NODE_ENV !== "production" && "resetCode" in result
          ? { debugResetCode: result.resetCode }
          : {}),
      },
      { status: 200 }
    );
  } catch (error) {
    return handleAuthRouteError(error, "POST /api/auth/forgot-password/resend");
  }
}