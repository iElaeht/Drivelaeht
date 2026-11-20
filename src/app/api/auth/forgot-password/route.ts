import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  getClientMeta,
  handleAuthRouteError,
  readJsonBody,
} from "@/lib/api-auth";
import {
  requestPasswordReset,
  sendUsernameReminder,
} from "@/services/auth.service";

const forgotPasswordSchema = z.discriminatedUnion("mode", [
  z.object({
    mode: z.literal("email"),
    email: z.string().trim().email("Correo electrónico no válido"),
  }),
  z.object({
    mode: z.literal("username"),
    username: z
      .string()
      .trim()
      .min(3, "Nombre de usuario no válido")
      .max(24, "Nombre de usuario no válido"),
  }),
]);

export async function POST(req: NextRequest) {
  try {
    const bodyResult = await readJsonBody(req);
    if (!bodyResult.ok) {
      return bodyResult.response;
    }

    const parsed = forgotPasswordSchema.safeParse(bodyResult.data);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid recovery payload",
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const meta = getClientMeta(req);

    if (parsed.data.mode === "username") {
      await sendUsernameReminder(parsed.data.username, meta);
      return NextResponse.json(
        {
          message:
            "Si el usuario existe en nuestros registros, enviamos un recordatorio al correo electrónico asociado.",
          mode: "username",
        },
        { status: 200 }
      );
    }

    const result = await requestPasswordReset(parsed.data.email, meta);

    return NextResponse.json(
      {
        message:
          "Si el correo está registrado y verificado, enviamos un código de 6 dígitos para recuperar tu acceso.",
        mode: "email",
        email: result.email,
        resetExpires: result.resetExpires.toISOString(),
        ...(process.env.NODE_ENV !== "production" && "resetCode" in result
          ? { debugResetCode: result.resetCode }
          : {}),
      },
      { status: 200 }
    );
  } catch (error) {
    return handleAuthRouteError(error, "POST /api/auth/forgot-password");
  }
}