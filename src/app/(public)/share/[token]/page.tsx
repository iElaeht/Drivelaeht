import { Suspense } from "react";
import Link from "next/link";
import { prisma } from "@/lib/prisma";

async function ShareLinkContent({
  paramsPromise,
}: {
  paramsPromise: Promise<{ token: string }>;
}) {
  const { token } = await paramsPromise;
  const now = new Date();

  const shareLink = await prisma.shareLink.findUnique({
    where: { token },
    include: {
      file: {
        select: {
          id: true,
          filename: true,
          mimeType: true,
          size: true,
          deletedAt: true,
        },
      },
    },
  });

  const isValid =
    Boolean(shareLink) &&
    shareLink!.expiresAt > now &&
    shareLink!.file &&
    shareLink!.file.deletedAt === null;

  if (!isValid || !shareLink) {
    return (
      <div className="max-w-md w-full rounded-2xl border border-neutral-800 bg-neutral-900/60 p-6 space-y-4 text-center">
        <h1 className="text-xl font-semibold">Enlace no disponible</h1>
        <p className="text-sm text-neutral-400">
          Este enlace compartido ha expirado, fue revocado o el archivo ya no
          existe.
        </p>
        <Link
          href="/"
          className="inline-block px-4 py-2 rounded-lg bg-emerald-500 text-neutral-950 text-sm font-medium"
        >
          Volver al inicio
        </Link>
      </div>
    );
  }

  await prisma.shareLink.update({
    where: { id: shareLink.id },
    data: { viewsCount: { increment: 1 } },
  });

  return (
    <div className="max-w-lg w-full rounded-2xl border border-neutral-800 bg-neutral-900/60 p-6 space-y-5">
      <div className="space-y-1">
        <span className="text-xs font-mono text-emerald-400">
          ENLACE COMPARTIDO TEMPORAL
        </span>
        <h1 className="text-xl font-semibold break-all">
          {shareLink.file.filename}
        </h1>
      </div>

      <div className="rounded-xl bg-neutral-950 border border-neutral-800 p-4 text-xs font-mono text-neutral-400 space-y-1.5">
        <p>Tipo: {shareLink.file.mimeType}</p>
        <p>Tamaño: {(Number(shareLink.file.size) / 1024).toFixed(1)} KB</p>
        <p>Expira: {shareLink.expiresAt.toLocaleString()}</p>
        <p>Visitas: {shareLink.viewsCount + 1}</p>
      </div>

      <div className="flex items-center justify-between pt-2">
        <Link
          href="/"
          className="text-xs text-neutral-400 hover:text-neutral-200"
        >
          Ir a Drivelaeht
        </Link>
        <span className="text-xs text-neutral-500 font-mono">
          Token: {shareLink.token.slice(0, 12)}...
        </span>
      </div>
    </div>
  );
}

export default function PublicSharePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100 flex items-center justify-center p-6">
      <Suspense
        fallback={
          <div className="max-w-md w-full rounded-2xl border border-neutral-800 bg-neutral-900/60 p-6 text-center text-sm text-neutral-400">
            Cargando enlace compartido...
          </div>
        }
      >
        <ShareLinkContent paramsPromise={params} />
      </Suspense>
    </main>
  );
}