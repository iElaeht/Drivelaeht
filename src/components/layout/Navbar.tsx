import { Suspense } from "react";
import Link from "next/link";
import { getCurrentUser } from "@/lib/session";
import { ThemeToggle } from "@/components/shared/ThemeToggle";
import { NavbarShell } from "@/components/layout/NavbarShell";

async function SessionActions() {
  const user = await getCurrentUser();

  if (user) {
    return (
      <Link
        href="/dashboard"
        className="inline-flex h-9 items-center rounded-lg bg-accent px-3.5 text-xs sm:text-sm font-semibold text-accent-fg transition-colors hover:bg-accent-hover"
      >
        Ir al Dashboard
      </Link>
    );
  }

  return (
    <>
      <Link
        href="/login"
        className="inline-flex h-9 items-center rounded-lg border border-edge bg-surface px-3 sm:px-3.5 text-xs sm:text-sm font-medium text-ink transition-colors hover:bg-surface-hover"
      >
        Iniciar sesión
      </Link>
      <Link
        href="/register"
        className="inline-flex h-9 items-center rounded-lg bg-accent px-3 sm:px-3.5 text-xs sm:text-sm font-semibold text-accent-fg transition-colors hover:bg-accent-hover"
      >
        Crear cuenta
      </Link>
    </>
  );
}

export function Navbar() {
  return (
    <NavbarShell
      themeToggle={<ThemeToggle />}
      sessionActions={
        <Suspense
          fallback={
            <span className="inline-flex h-9 items-center px-3 rounded-lg border border-edge text-muted text-xs">
              Cargando...
            </span>
          }
        >
          <SessionActions />
        </Suspense>
      }
    />
  );
}