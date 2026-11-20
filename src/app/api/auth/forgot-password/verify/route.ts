import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  getClientMeta,
  handleAuthRouteError,
  readJsonBody,
} from "@/lib/api-auth";
import { verifyPasswordResetCode } from "@/services/auth.service";

const verifyResetSchema = z.object({
  email: z.string().trim().email("Correo electrónico no válido"),
  code: z
    .string()
    .trim()
    .regex(/^\d{6}$/, "El código debe contener exactamente 6 dígitos"),
});

export async function POST(req: NextRequest) {
  try {
    const bodyResult = await readJsonBody(req);
    if (!bodyResult.ok) {
      return bodyResult.response;
    }

    const parsed = verifyResetSchema.safeParse(bodyResult.data);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid verification payload",
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const result = await verifyPasswordResetCode(
      parsed.data.email,
      parsed.data.code,
      getClientMeta(req)
    );

    return NextResponse.json(
      {
        message: "Código verificado correctamente.",
        verified: true,
        email: result.email,
        username: result.username,
      },
      { status: 200 }
    );
  } catch (error) {
    return handleAuthRouteError(error, "POST /api/auth/forgot-password/verify");
  }
}