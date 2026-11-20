"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";

interface NavbarShellProps {
  themeToggle: ReactNode;
  sessionActions: ReactNode;
}

export function NavbarShell({ themeToggle, sessionActions }: NavbarShellProps) {
  const [docked, setDocked] = useState(true);

  useEffect(() => {
    function handleScroll() {
      setDocked(window.scrollY <= 24);
    }

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={`sticky z-40 w-full transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
        docked
          ? "top-0 px-0 pt-0"
          : "top-2 sm:top-3 px-3 sm:px-6 pt-1"
      }`}
    >
      <div
        className={`mx-auto flex flex-wrap items-center justify-between gap-3 transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
          docked
            ? "max-w-5xl rounded-none border-b border-edge bg-app/90 px-4 sm:px-6 py-4 backdrop-blur-md"
            : "max-w-5xl rounded-2xl border border-edge bg-surface/90 px-4 sm:px-5 py-3 shadow-lg backdrop-blur-md"
        }`}
      >
        <Link href="/" className="flex items-center gap-2.5">
          <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-lg bg-accent-soft border border-accent/35 flex items-center justify-center font-mono text-xs sm:text-sm font-bold text-accent transition-transform duration-300">
            DL
          </div>
          <span className="text-base sm:text-lg font-semibold tracking-tight">
            Drivelaeht
          </span>
        </Link>

        <nav className="flex items-center gap-2 sm:gap-2.5">
          {themeToggle}
          {sessionActions}
        </nav>
      </div>
    </header>
  );
}