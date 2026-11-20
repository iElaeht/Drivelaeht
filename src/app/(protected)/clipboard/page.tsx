"use client";

import { useEffect, useState, type FormEvent } from "react";
import type { ClipboardItem, ClipboardType } from "@/types/drivelaeht";

export default function ClipboardPage() {
  const [items, setItems] = useState<ClipboardItem[]>([]);
  const [content, setContent] = useState("");
  const [type, setType] = useState<ClipboardType>("TEXT");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  async function fetchItems() {
    setLoading(true);
    try {
      const res = await fetch("/api/clipboard");
      if (res.ok) {
        const data = await res.json();
        setItems(data.items ?? []);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchItems();
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!content.trim()) return;

    setSaving(true);
    try {
      const res = await fetch("/api/clipboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, type }),
      });

      if (res.ok) {
        setContent("");
        await fetchItems();
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    const res = await fetch(`/api/clipboard?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    if (res.ok) {
      await fetchItems();
    }
  }

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <header className="border-b border-neutral-800 pb-4">
        <h1 className="text-2xl font-bold tracking-tight">Portapapeles</h1>
        <p className="text-xs text-neutral-400">
          Sincroniza fragmentos de texto, enlaces o código entre dispositivos.
        </p>
      </header>

      <form
        onSubmit={handleSubmit}
        className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-4 space-y-3"
      >
        <div className="flex items-center justify-between gap-3">
          <select
            value={type}
            onChange={(e) => setType(e.target.value as ClipboardType)}
            className="rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-1.5 text-xs text-neutral-200"
          >
            <option value="TEXT">Texto</option>
            <option value="URL">Enlace (URL)</option>
            <option value="CODE">Código</option>
          </select>

          <button
            type="submit"
            disabled={saving || !content.trim()}
            className="px-4 py-1.5 rounded-lg bg-emerald-500 text-neutral-950 text-xs font-semibold hover:bg-emerald-400 disabled:opacity-50"
          >
            {saving ? "Guardando..." : "Guardar fragmento"}
          </button>
        </div>

        <textarea
          rows={3}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Pega o escribe aquí..."
          className="w-full rounded-lg border border-neutral-800 bg-neutral-950 p-3 text-sm text-neutral-100 focus:outline-none focus:border-emerald-500"
        />
      </form>

      {loading ? (
        <p className="text-sm text-neutral-400">Cargando historial...</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-neutral-500">
          Aún no hay elementos guardados.
        </p>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <div
              key={item.id}
              className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-4 space-y-2"
            >
              <div className="flex items-center justify-between text-xs text-neutral-500 font-mono">
                <span>{item.type}</span>
                <div className="flex items-center gap-3">
                  <span>{new Date(item.createdAt).toLocaleString()}</span>
                  <button
                    type="button"
                    onClick={() => handleDelete(item.id)}
                    className="text-red-400 hover:underline"
                  >
                    Borrar
                  </button>
                </div>
              </div>
              <pre className="text-sm text-neutral-200 whitespace-pre-wrap break-all font-mono bg-neutral-950 p-3 rounded-lg border border-neutral-800/80">
                {item.content}
              </pre>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}