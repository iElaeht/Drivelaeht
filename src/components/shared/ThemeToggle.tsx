"use client";

import { useEffect, useRef, useState } from "react";

type ThemeId = "light" | "dark" | "capuccino" | "rose-pine" | "catppuccin";

interface ThemeOption {
  id: ThemeId;
  label: string;
  iconColor: string;
}

const THEME_OPTIONS: ThemeOption[] = [
  { id: "light", label: "Light", iconColor: "#f59e0b" },
  { id: "dark", label: "Dark", iconColor: "#10b981" },
  { id: "capuccino", label: "Capuccino", iconColor: "#d4a373" },
  { id: "rose-pine", label: "Rosé Pine", iconColor: "#ebbcba" },
  { id: "catppuccin", label: "Catppuccin", iconColor: "#cba6f7" },
];

function ThemeIcon({ id, color }: { id: ThemeId; color: string }) {
  switch (id) {
    case "light":
      return (
        <svg className="h-3.5 w-3.5 shrink-0" style={{ color }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
        </svg>
      );
    case "dark":
      return (
        <svg className="h-3.5 w-3.5 shrink-0" style={{ color }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
        </svg>
      );
    case "capuccino":
      return (
        <svg className="h-3.5 w-3.5 shrink-0" style={{ color }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M17 8h1a4 4 0 1 1 0 8h-1" />
          <path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z" />
          <path d="M6 2v2M10 2v2M14 2v2" />
        </svg>
      );
    case "rose-pine":
      return (
        <svg className="h-3.5 w-3.5 shrink-0" style={{ color }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 7.5a4.5 4.5 0 1 1 4.5 4.5M12 7.5A4.5 4.5 0 1 0 7.5 12M12 7.5V9m-4.5 3a4.5 4.5 0 1 0 4.5 4.5M7.5 12H9m7.5 0a4.5 4.5 0 1 1-4.5 4.5m4.5-4.5H15m-3 4.5V15" />
          <circle cx="12" cy="12" r="2" />
        </svg>
      );
    case "catppuccin":
      return (
        <svg className="h-3.5 w-3.5 shrink-0" style={{ color }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 5c.67 0 1.35.09 2 .26 1.78-2 5.03-2.84 6.42-2.26 1.4.58-.42 7-.42 7 .57 1.07 1 2.24 1 3.44C21 17.9 16.97 21 12 21s-9-3-9-7.56c0-1.25.5-2.4 1-3.44 0 0-1.89-6.42-.5-7 1.39-.58 4.72.23 6.5 2.23A9.04 9.04 0 0 1 12 5Z" />
          <path d="M8 14v.5M16 14v.5M11.25 16.25h1.5L12 17l-.75-.75Z" />
        </svg>
      );
  }
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<ThemeId | null>(null);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem("drivelaeht-theme") as ThemeId | null;
    const valid = THEME_OPTIONS.some((item) => item.id === saved);
    const initial: ThemeId = valid && saved ? saved : "dark";

    document.documentElement.setAttribute("data-theme", initial);
    document.documentElement.classList.toggle("dark", initial !== "light");
    setTheme(initial);
  }, []);

  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  function selectTheme(next: ThemeId) {
    document.documentElement.setAttribute("data-theme", next);
    document.documentElement.classList.toggle("dark", next !== "light");
    localStorage.setItem("drivelaeht-theme", next);
    setTheme(next);
    setOpen(false);
  }

  const current = THEME_OPTIONS.find((item) => item.id === theme);

  if (!current) {
    return (
      <div
        aria-hidden="true"
        className="h-9 w-28 animate-pulse rounded-lg border border-edge bg-surface"
      />
    );
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label="Seleccionar tema"
        className="inline-flex h-9 items-center gap-2 rounded-lg border border-edge bg-surface px-3 text-xs font-medium text-ink transition-colors hover:bg-surface-hover"
      >
        <ThemeIcon id={current.id} color={current.iconColor} />
        <span>{current.label}</span>
        <svg
          className={`h-3.5 w-3.5 text-muted transition-transform duration-150 ${open ? "rotate-180" : ""}`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div
          role="listbox"
          className="absolute right-0 z-50 mt-2 w-44 rounded-xl border border-edge bg-surface p-1.5 shadow-lg"
        >
          {THEME_OPTIONS.map((option) => {
            const active = option.id === theme;
            return (
              <button
                key={option.id}
                type="button"
                role="option"
                aria-selected={active}
                onClick={() => selectTheme(option.id)}
                className={`flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-xs transition-colors ${
                  active
                    ? "bg-accent-soft font-semibold text-accent"
                    : "text-ink hover:bg-surface-hover"
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <ThemeIcon id={option.id} color={option.iconColor} />
                  <span>{option.label}</span>
                </span>
                {active && (
                  <svg
                    className="h-3.5 w-3.5 text-accent"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                  >
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}