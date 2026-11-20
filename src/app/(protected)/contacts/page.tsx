"use client";

import { useEffect, useState, type FormEvent } from "react";
import type { ContactItem } from "@/types/drivelaeht";

export default function ContactsPage() {
  const [contacts, setContacts] = useState<ContactItem[]>([]);
  const [search, setSearch] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  async function fetchContacts(query = "") {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (query.trim()) {
        params.set("q", query.trim());
      }
      const res = await fetch(`/api/contacts?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setContacts(data.contacts ?? []);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchContacts();
  }, []);

  async function handleSearchSubmit(e: FormEvent) {
    e.preventDefault();
    await fetchContacts(search);
  }

  async function handleCreateContact(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    setSaving(true);
    try {
      const res = await fetch("/api/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          phone: phone || null,
          email: email || null,
          notes: notes || null,
        }),
      });

      if (res.ok) {
        setName("");
        setPhone("");
        setEmail("");
        setNotes("");
        await fetchContacts(search);
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    const res = await fetch(`/api/contacts?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    if (res.ok) {
      await fetchContacts(search);
    }
  }

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <header className="border-b border-neutral-800 pb-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Contactos</h1>
          <p className="text-xs text-neutral-400">
            Agenda privada asociada a tu cuenta.
          </p>
        </div>

        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar contacto..."
            className="rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-1.5 text-xs text-neutral-100"
          />
          <button
            type="submit"
            className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-xs"
          >
            Buscar
          </button>
        </form>
      </header>

      <form
        onSubmit={handleCreateContact}
        className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3"
      >
        <input
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nombre *"
          className="rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm text-neutral-100"
        />
        <input
          type="text"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="Teléfono"
          className="rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm text-neutral-100"
        />
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Correo"
          className="rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm text-neutral-100"
        />
        <input
          type="text"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Notas"
          className="rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm text-neutral-100"
        />
        <button
          type="submit"
          disabled={saving || !name.trim()}
          className="rounded-lg bg-emerald-500 text-neutral-950 hover:bg-emerald-400 disabled:opacity-50 px-4 py-2 text-sm font-semibold"
        >
          {saving ? "Guardando..." : "Agregar"}
        </button>
      </form>

      {loading ? (
        <p className="text-sm text-neutral-400">Cargando contactos...</p>
      ) : contacts.length === 0 ? (
        <p className="text-sm text-neutral-500">No se encontraron contactos.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {contacts.map((contact) => (
            <div
              key={contact.id}
              className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-4 flex items-start justify-between gap-3"
            >
              <div className="space-y-1 min-w-0">
                <p className="font-semibold text-sm truncate">{contact.name}</p>
                {contact.phone && (
                  <p className="text-xs text-neutral-300 font-mono">
                    {contact.phone}
                  </p>
                )}
                {contact.email && (
                  <p className="text-xs text-neutral-400 truncate">
                    {contact.email}
                  </p>
                )}
                {contact.notes && (
                  <p className="text-xs text-neutral-500">{contact.notes}</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => handleDelete(contact.id)}
                className="text-xs text-red-400 hover:underline shrink-0"
              >
                Eliminar
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}