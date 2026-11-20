import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  getClientMeta,
  handleAuthRouteError,
  readJsonBody,
} from "@/lib/api-auth";
import { completePasswordReset } from "@/services/auth.service";

const resetPasswordSchema = z
  .object({
    email: z.string().trim().email("Correo electrónico no válido"),
    code: z
      .string()
      .trim()
      .regex(/^\d{6}$/, "El código debe contener exactamente 6 dígitos"),
    newPassword: z
      .string()
      .min(9, "La contraseña debe tener más de 8 caracteres")
      .regex(/[A-Z]/, "La contraseña debe incluir al menos una mayúscula")
      .regex(/[0-9]/, "La contraseña debe incluir al menos un número"),
    confirmPassword: z.string(),
    newUsername: z
      .string()
      .trim()
      .regex(
        /^[a-zA-Z0-9._-]{3,24}$/,
        "Usuario no válido (3 a 24 caracteres: letras, números, punto, guion o guion bajo)"
      )
      .optional(),
    revokeAllSessions: z.boolean().optional(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Las contraseñas no coinciden",
    path: ["confirmPassword"],
  });

export async function POST(req: NextRequest) {
  try {
    const bodyResult = await readJsonBody(req);
    if (!bodyResult.ok) {
      return bodyResult.response;
    }

    const parsed = resetPasswordSchema.safeParse(bodyResult.data);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid password reset payload",
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const result = await completePasswordReset(
      {
        email: parsed.data.email,
        code: parsed.data.code,
        newPassword: parsed.data.newPassword,
        newUsername: parsed.data.newUsername,
        revokeAllSessions: parsed.data.revokeAllSessions,
      },
      getClientMeta(req)
    );

    return NextResponse.json(
      {
        message:
          "Credenciales actualizadas correctamente. Ya puedes iniciar sesión.",
        email: result.email,
        username: result.username,
      },
      { status: 200 }
    );
  } catch (error) {
    return handleAuthRouteError(error, "POST /api/auth/forgot-password/reset");
  }
}