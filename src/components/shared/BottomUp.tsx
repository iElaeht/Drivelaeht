"use client";

import { useEffect, useState } from "react";

export function BottomUp() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    function onScroll() {
      setShow(window.scrollY > 260);
    }

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  function scrollToTop() {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <button
      type="button"
      onClick={scrollToTop}
      aria-label="Volver arriba"
      title="Volver arriba"
      className={`fixed bottom-5 right-5 sm:bottom-7 sm:right-7 z-40 flex h-12 w-12 sm:h-13 sm:w-13 md:h-14 md:w-14 items-center justify-center rounded-2xl border border-accent/40 bg-accent text-accent-fg shadow-xl transition-all duration-300 hover:scale-105 hover:bg-accent-hover active:scale-95 ${
        show
          ? "opacity-100 translate-y-0 pointer-events-auto"
          : "opacity-0 translate-y-4 pointer-events-none"
      }`}
    >
      <svg
        className="h-5 w-5 sm:h-6 sm:w-6"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="m18 15-6-6-6 6" />
      </svg>
    </button>
  );
}