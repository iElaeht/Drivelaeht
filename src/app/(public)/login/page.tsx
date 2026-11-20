"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [twoFactorStep, setTwoFactorStep] = useState(false);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleLoginSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "No se pudo iniciar sesión");
        return;
      }

      if (data.requiresTwoFactor) {
        setTwoFactorStep(true);
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Error de red al intentar iniciar sesión");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyTwoFactor(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/verify-2fa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Código inválido");
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Error de red al verificar el código");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100 flex items-center justify-center p-6">
      <div className="max-w-md w-full rounded-2xl border border-neutral-800 bg-neutral-900/60 p-6 space-y-6">
        <div className="space-y-1">
          <Link href="/" className="text-xs font-mono text-emerald-400">
            ← Drivelaeht
          </Link>
          <h1 className="text-2xl font-bold tracking-tight">
            {twoFactorStep ? "Verificación en dos pasos" : "Iniciar sesión"}
          </h1>
          <p className="text-sm text-neutral-400">
            {twoFactorStep
              ? `Ingresa el código de 6 dígitos enviado a ${email}`
              : "Accede a tu espacio privado desde este dispositivo."}
          </p>
        </div>

        {error && (
          <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-300">
            {error}
          </div>
        )}

        {!twoFactorStep ? (
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-xs text-neutral-300">Correo</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="correo@ejemplo.com"
                className="w-full rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm text-neutral-100 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs text-neutral-300">
                Contraseña
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm text-neutral-100 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-lg bg-emerald-500 text-neutral-950 font-semibold text-sm hover:bg-emerald-400 disabled:opacity-50 transition-colors"
            >
              {loading ? "Verificando..." : "Continuar"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyTwoFactor} className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-xs text-neutral-300">
                Código de 6 dígitos
              </label>
              <input
                type="text"
                inputMode="numeric"
                pattern="\d{6}"
                maxLength={6}
                required
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                placeholder="123456"
                className="w-full rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2 text-center font-mono text-lg tracking-widest text-neutral-100 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-lg bg-emerald-500 text-neutral-950 font-semibold text-sm hover:bg-emerald-400 disabled:opacity-50 transition-colors"
            >
              {loading ? "Validando..." : "Confirmar código"}
            </button>
          </form>
        )}

        <p className="text-xs text-neutral-400 text-center">
          ¿No tienes cuenta?{" "}
          <Link href="/register" className="text-emerald-400 hover:underline">
            Regístrate aquí
          </Link>
        </p>
      </div>
    </main>
  );
}