"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { formatStorageSize } from "@/lib/format";
import type { FileItem, FolderItem } from "@/types/drivelaeht";

export default function DashboardPage() {
  const router = useRouter();
  const [folders, setFolders] = useState<FolderItem[]>([]);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"explorer" | "starred" | "trash">(
    "explorer"
  );
  const [newFolderName, setNewFolderName] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadDriveData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const folderParams = new URLSearchParams();
      const fileParams = new URLSearchParams();

      if (viewMode === "trash") {
        folderParams.set("trashed", "true");
        fileParams.set("trashed", "true");
      } else if (viewMode === "starred") {
        fileParams.set("starred", "true");
      } else if (currentFolderId) {
        folderParams.set("parentId", currentFolderId);
        fileParams.set("folderId", currentFolderId);
      }

      const [foldersRes, filesRes] = await Promise.all([
        viewMode === "starred"
          ? Promise.resolve(null)
          : fetch(`/api/folders?${folderParams.toString()}`),
        fetch(`/api/files?${fileParams.toString()}`).catch(() => null),
      ]);

      if (foldersRes && foldersRes.ok) {
        const folderJson = await foldersRes.json();
        setFolders(folderJson.folders ?? []);
      } else {
        setFolders([]);
      }

      if (filesRes && filesRes.ok) {
        const fileJson = await filesRes.json();
        setFiles(fileJson.files ?? []);
      } else {
        setFiles([]);
      }
    } catch {
      setError("No se pudieron cargar los elementos del Drive");
    } finally {
      setLoading(false);
    }
  }, [currentFolderId, viewMode]);

  useEffect(() => {
    loadDriveData();
  }, [loadDriveData]);

  async function handleCreateFolder(e: FormEvent) {
    e.preventDefault();
    if (!newFolderName.trim()) return;

    setError(null);
    const res = await fetch("/api/folders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: newFolderName.trim(),
        parentId: currentFolderId,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Error al crear carpeta");
      return;
    }

    setNewFolderName("");
    await loadDriveData();
  }

  async function handleUploadFile(e: FormEvent) {
    e.preventDefault();
    if (!selectedFile) return;

    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      if (currentFolderId) {
        formData.append("folderId", currentFolderId);
      }

      const res = await fetch("/api/files/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Error al subir archivo");
        return;
      }

      setSelectedFile(null);
      await loadDriveData();
      router.refresh();
    } finally {
      setUploading(false);
    }
  }

  async function handleToggleStar(file: FileItem) {
    const res = await fetch(`/api/files/${file.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isStarred: !file.isStarred }),
    });
    if (res.ok) {
      await loadDriveData();
    }
  }

  async function handleDeleteFile(fileId: string, permanent = false) {
    const query = permanent ? "?permanent=true" : "";
    const res = await fetch(`/api/files/${fileId}${query}`, {
      method: "DELETE",
    });
    if (res.ok) {
      await loadDriveData();
      router.refresh();
    }
  }

  async function handleDeleteFolder(folderId: string, permanent = false) {
    const query = permanent ? "?permanent=true" : "";
    const res = await fetch(`/api/folders/${folderId}${query}`, {
      method: "DELETE",
    });
    if (res.ok) {
      if (currentFolderId === folderId) {
        setCurrentFolderId(null);
      }
      await loadDriveData();
      router.refresh();
    }
  }

  const visibleBytes = files.reduce((acc, item) => acc + Number(item.size || 0), 0);

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-neutral-800 pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Explorador</h1>
          <p className="text-xs text-neutral-400 font-mono">
            {viewMode === "trash"
              ? "Papelera"
              : viewMode === "starred"
                ? "Destacados"
                : currentFolderId
                  ? `Carpeta ID: ${currentFolderId}`
                  : "Raíz del usuario"}
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <button
            type="button"
            onClick={() => {
              setViewMode("explorer");
              setCurrentFolderId(null);
            }}
            className={`px-3 py-1.5 rounded-lg border ${
              viewMode === "explorer"
                ? "border-emerald-500 bg-emerald-500/15 text-emerald-300"
                : "border-neutral-800 text-neutral-300"
            }`}
          >
            Todos
          </button>
          <button
            type="button"
            onClick={() => setViewMode("starred")}
            className={`px-3 py-1.5 rounded-lg border ${
              viewMode === "starred"
                ? "border-emerald-500 bg-emerald-500/15 text-emerald-300"
                : "border-neutral-800 text-neutral-300"
            }`}
          >
            Destacados
          </button>
          <button
            type="button"
            onClick={() => setViewMode("trash")}
            className={`px-3 py-1.5 rounded-lg border ${
              viewMode === "trash"
                ? "border-emerald-500 bg-emerald-500/15 text-emerald-300"
                : "border-neutral-800 text-neutral-300"
            }`}
          >
            Papelera
          </button>
        </div>
      </header>

      {error && (
        <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-2.5 text-xs text-red-300">
          {error}
        </div>
      )}

      {viewMode === "explorer" && (
        <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <form
            onSubmit={handleCreateFolder}
            className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-4 flex items-center gap-2"
          >
            <input
              type="text"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="Nueva carpeta..."
              className="flex-1 rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm text-neutral-100 focus:outline-none focus:border-emerald-500"
            />
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-sm font-medium"
            >
              Crear
            </button>
          </form>

          <form
            onSubmit={handleUploadFile}
            className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-4 flex items-center gap-2"
          >
            <input
              type="file"
              onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
              className="flex-1 text-xs text-neutral-300 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-neutral-800 file:text-neutral-200 hover:file:bg-neutral-700"
            />
            <button
              type="submit"
              disabled={!selectedFile || uploading}
              className="px-4 py-2 rounded-lg bg-emerald-500 text-neutral-950 hover:bg-emerald-400 disabled:opacity-50 text-sm font-semibold"
            >
              {uploading ? "Subiendo..." : "Subir"}
            </button>
          </form>
        </section>
      )}

      {currentFolderId && viewMode === "explorer" && (
        <div>
          <button
            type="button"
            onClick={() => setCurrentFolderId(null)}
            className="text-xs font-mono text-emerald-400 hover:underline"
          >
            ← Volver a la raíz
          </button>
        </div>
      )}

      {loading ? (
        <p className="text-sm text-neutral-400">Cargando elementos...</p>
      ) : (
        <div className="space-y-6">
          {folders.length > 0 && (
            <section className="space-y-2">
              <h2 className="text-xs font-mono uppercase text-neutral-400">
                Carpetas ({folders.length})
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {folders.map((folder) => (
                  <div
                    key={folder.id}
                    className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-4 flex items-center justify-between gap-2"
                  >
                    <button
                      type="button"
                      onClick={() => {
                        if (viewMode === "explorer") {
                          setCurrentFolderId(folder.id);
                        }
                      }}
                      className="text-left font-medium text-sm truncate hover:text-emerald-400 transition-colors"
                    >
                      {folder.name}
                    </button>
                    <div className="flex items-center gap-2 text-xs">
                      <button
                        type="button"
                        onClick={() =>
                          handleDeleteFolder(folder.id, viewMode === "trash")
                        }
                        className="text-red-400 hover:underline"
                      >
                        {viewMode === "trash" ? "Eliminar" : "Papelera"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          <section className="space-y-2">
            <div className="flex items-center justify-between text-xs font-mono uppercase text-neutral-400">
              <h2>Archivos ({files.length})</h2>
              <span>Total en vista: {formatStorageSize(visibleBytes)}</span>
            </div>
            {files.length === 0 ? (
              <p className="text-sm text-neutral-500">
                No hay archivos en esta vista.
              </p>
            ) : (
              <div className="divide-y divide-neutral-800 rounded-xl border border-neutral-800 bg-neutral-900/40">
                {files.map((file) => (
                  <div
                    key={file.id}
                    className="p-3.5 flex flex-wrap items-center justify-between gap-3 text-sm"
                  >
                    <div className="min-w-0">
                      <p className="font-medium truncate">{file.filename}</p>
                      <p className="text-xs text-neutral-500 font-mono">
                        {file.mimeType} · {formatStorageSize(file.size)}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 text-xs">
                      <a
                        href={`/api/files/${file.id}/download`}
                        className="text-emerald-400 hover:underline"
                      >
                        Descargar
                      </a>
                      <button
                        type="button"
                        onClick={() => handleToggleStar(file)}
                        className="text-neutral-300 hover:text-amber-300"
                      >
                        {file.isStarred ? "Quitar ★" : "Destacar ☆"}
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          handleDeleteFile(file.id, viewMode === "trash")
                        }
                        className="text-red-400 hover:underline"
                      >
                        {viewMode === "trash" ? "Eliminar" : "Papelera"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}