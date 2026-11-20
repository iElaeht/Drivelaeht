import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { formatStorageSize } from "@/lib/format";


async function ProtectedShell({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col md:flex-row">
      <aside className="w-full md:w-64 border-b md:border-b-0 md:border-r border-neutral-800 bg-neutral-900/50 p-4 flex flex-col justify-between gap-6">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <Link
              href="/dashboard"
              className="text-base font-bold tracking-tight text-emerald-400"
            >
              Drivelaeht
            </Link>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-neutral-800 text-neutral-300">
              {user.status}
            </span>
          </div>

          <nav className="flex md:flex-col gap-1.5 overflow-x-auto text-sm">
            <Link
              href="/dashboard"
              className="px-3 py-2 rounded-lg hover:bg-neutral-800/80 text-neutral-200 whitespace-nowrap"
            >
              Archivos y Carpetas
            </Link>
            <Link
              href="/clipboard"
              className="px-3 py-2 rounded-lg hover:bg-neutral-800/80 text-neutral-200 whitespace-nowrap"
            >
              Portapapeles
            </Link>
            <Link
              href="/contacts"
              className="px-3 py-2 rounded-lg hover:bg-neutral-800/80 text-neutral-200 whitespace-nowrap"
            >
              Contactos
            </Link>
            <Link
              href="/settings"
              className="px-3 py-2 rounded-lg hover:bg-neutral-800/80 text-neutral-200 whitespace-nowrap"
            >
              Seguridad y Sesiones
            </Link>
          </nav>
        </div>

        <div className="border-t border-neutral-800 pt-4 text-xs space-y-1">
          <p className="font-medium text-neutral-200 truncate">{user.username}</p>
          <p className="text-neutral-400 truncate">{user.email}</p>
          <p className="text-neutral-500 font-mono">
            Usado: {formatStorageSize(user.storageUsed)}
          </p>
        </div>
      </aside>

      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-neutral-950 text-neutral-400 flex items-center justify-center text-sm">
          Cargando espacio...
        </div>
      }
    >
      <ProtectedShell>{children}</ProtectedShell>
    </Suspense>
  );
}