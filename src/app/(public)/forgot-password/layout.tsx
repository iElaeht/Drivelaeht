import type { ReactNode } from "react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Recuperar Acceso | Drivelaeht",
  description:
    "Recupera el acceso a tu cuenta en Drivelaeht mediante código de verificación o recordatorio de usuario.",
};

export default function ForgotPasswordLayout({
  children,
}: {
  children: ReactNode;
}) {
  return children;
}