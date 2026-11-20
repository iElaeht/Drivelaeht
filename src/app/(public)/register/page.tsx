"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [step, setStep] = useState<"form" | "2fa">("form");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleRegisterSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, username, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "No se pudo completar el registro");
        return;
      }

      setStep("2fa");
    } catch {
      setError("Error de red al registrar la cuenta");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifySubmit(e: FormEvent) {
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
            {step === "form" ? "Crear cuenta" : "Verificar correo"}
          </h1>
          <p className="text-sm text-neutral-400">
            {step === "form"
              ? "Se creará tu carpeta aislada y se generará un código de 6 dígitos."
              : `Ingresa el código de 6 dígitos generado para ${email}`}
          </p>
        </div>

        {error && (
          <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-300">
            {error}
          </div>
        )}

        {step === "form" ? (
          <form onSubmit={handleRegisterSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-xs text-neutral-300">
                Correo electrónico
              </label>
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
                Nombre de usuario
              </label>
              <input
                type="text"
                required
                minLength={3}
                maxLength={30}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="tu_usuario"
                className="w-full rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm text-neutral-100 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs text-neutral-300">
                Contraseña (mínimo 8 caracteres)
              </label>
              <input
                type="password"
                required
                minLength={8}
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
              {loading ? "Registrando..." : "Registrarme"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifySubmit} className="space-y-4">
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
              {loading ? "Activando..." : "Activar cuenta"}
            </button>
          </form>
        )}

        <p className="text-xs text-neutral-400 text-center">
          ¿Ya tienes cuenta?{" "}
          <Link href="/login" className="text-emerald-400 hover:underline">
            Inicia sesión
          </Link>
        </p>
      </div>
    </main>
  );
}