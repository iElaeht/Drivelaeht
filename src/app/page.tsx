import { Suspense } from "react";
import Link from "next/link";
import { getCurrentUser } from "@/lib/session";

async function HeaderSessionActions() {
  const user = await getCurrentUser();

  if (user) {
    return (
      <Link
        href="/dashboard"
        className="px-4 py-2 rounded-lg bg-emerald-500 text-neutral-950 font-medium text-sm hover:bg-emerald-400 transition-colors"
      >
        Ir al Dashboard
      </Link>
    );
  }

  return (
    <>
      <Link
        href="/login"
        className="px-4 py-2 rounded-lg border border-neutral-800 text-neutral-200 text-sm hover:bg-neutral-900 transition-colors"
      >
        Iniciar sesión
      </Link>
      <Link
        href="/register"
        className="px-4 py-2 rounded-lg bg-emerald-500 text-neutral-950 font-medium text-sm hover:bg-emerald-400 transition-colors"
      >
        Crear cuenta
      </Link>
    </>
  );
}

async function HeroSessionActions() {
  const user = await getCurrentUser();

  if (user) {
    return (
      <Link
        href="/dashboard"
        className="px-6 py-3 rounded-xl bg-emerald-500 text-neutral-950 font-semibold text-sm hover:bg-emerald-400 transition-colors"
      >
        Abrir mi espacio ({user.username})
      </Link>
    );
  }

  return (
    <>
      <Link
        href="/login"
        className="px-6 py-3 rounded-xl bg-emerald-500 text-neutral-950 font-semibold text-sm hover:bg-emerald-400 transition-colors"
      >
        Login
      </Link>
      <Link
        href="/register"
        className="px-6 py-3 rounded-xl border border-neutral-700 text-neutral-100 font-semibold text-sm hover:bg-neutral-900 transition-colors"
      >
        Register
      </Link>
    </>
  );
}

export default function HomePage() {
  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col justify-between px-6 py-10">
      <header className="max-w-5xl w-full mx-auto flex items-center justify-between border-b border-neutral-800 pb-6">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-emerald-500/15 border border-emerald-500/40 flex items-center justify-center font-mono text-sm font-bold text-emerald-400">
            DL
          </div>
          <span className="text-lg font-semibold tracking-tight">Drivelaeht</span>
        </div>

        <nav className="flex items-center gap-3">
          <Suspense
            fallback={
              <span className="px-4 py-2 rounded-lg border border-neutral-800 text-neutral-400 text-sm">
                Cargando...
              </span>
            }
          >
            <HeaderSessionActions />
          </Suspense>
        </nav>
      </header>

      <section className="max-w-4xl w-full mx-auto py-20 space-y-8">
        <p className="inline-block px-3 py-1 rounded-full text-xs font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
          Almacenamiento privado y defensivo
        </p>

        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight leading-tight">
          Tu espacio personal en la nube, aislado por cuenta y controlado desde
          cualquier dispositivo.
        </h1>

        <p className="text-neutral-400 text-base sm:text-lg max-w-2xl leading-relaxed">
          Drivelaeht organiza tus carpetas, archivos, miniaturas, portapapeles
          y contactos bajo verificación de sesión en servidor, doble factor de
          6 dígitos y almacenamiento local aislado por usuario.
        </p>

        <div className="flex flex-wrap items-center gap-4 pt-2">
          <Suspense
            fallback={
              <span className="px-6 py-3 rounded-xl border border-neutral-800 text-neutral-400 text-sm">
                Verificando sesión...
              </span>
            }
          >
            <HeroSessionActions />
          </Suspense>
        </div>
      </section>

      <footer className="max-w-5xl w-full mx-auto border-t border-neutral-800 pt-6 text-xs text-neutral-500 flex flex-col sm:flex-row justify-between gap-2">
        <span>Drivelaeht Cloud System</span>
        <span>Sesiones por dispositivo · Aislamiento por usuario · 2FA</span>
      </footer>
    </main>
  );
}