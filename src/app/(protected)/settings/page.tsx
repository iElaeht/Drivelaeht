"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { ActiveSessionItem } from "@/types/drivelaeht";

export default function SettingsPage() {
  const router = useRouter();
  const [sessions, setSessions] = useState<ActiveSessionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);

  async function loadSessions() {
    setLoading(true);
    try {
      const res = await fetch("/api/auth/sessions");
      if (res.ok) {
        const data = await res.json();
        setSessions(data.sessions ?? []);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSessions();
  }, []);

  async function handleRevoke(sessionId: string) {
    const res = await fetch(
      `/api/auth/sessions?sessionId=${encodeURIComponent(sessionId)}`,
      { method: "DELETE" }
    );
    if (res.ok) {
      await loadSessions();
    }
  }

  async function handleLogoutCurrent() {
    setLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
      router.refresh();
    } finally {
      setLoggingOut(false);
    }
  }

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <header className="border-b border-neutral-800 pb-4 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Seguridad y Sesiones
          </h1>
          <p className="text-xs text-neutral-400">
            Administra los dispositivos conectados a tu cuenta.
          </p>
        </div>

        <button
          type="button"
          onClick={handleLogoutCurrent}
          disabled={loggingOut}
          className="px-4 py-2 rounded-lg border border-red-500/40 bg-red-500/10 text-red-300 hover:bg-red-500/20 text-xs font-semibold"
        >
          {loggingOut ? "Cerrando..." : "Cerrar sesión actual"}
        </button>
      </header>

      <section className="space-y-3">
        <h2 className="text-xs font-mono uppercase text-neutral-400">
          Sesiones activas ({sessions.length})
        </h2>

        {loading ? (
          <p className="text-sm text-neutral-400">Cargando sesiones...</p>
        ) : sessions.length === 0 ? (
          <p className="text-sm text-neutral-500">No hay sesiones activas.</p>
        ) : (
          <div className="space-y-3">
            {sessions.map((session) => (
              <div
                key={session.id}
                className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-4 flex flex-wrap items-center justify-between gap-3"
              >
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium truncate">
                      {session.deviceAgent || "Dispositivo desconocido"}
                    </span>
                    {session.isCurrent && (
                      <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                        Este dispositivo
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-neutral-400 font-mono">
                    IP: {session.ipAddress || "N/A"} · Expira:{" "}
                    {new Date(session.expiresAt).toLocaleString()}
                  </p>
                </div>

                {!session.isCurrent && (
                  <button
                    type="button"
                    onClick={() => handleRevoke(session.id)}
                    className="text-xs text-red-400 hover:underline"
                  >
                    Revocar sesión
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}