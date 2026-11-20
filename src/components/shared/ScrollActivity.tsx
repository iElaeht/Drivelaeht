"use client";

import { useEffect } from "react";

export function ScrollActivity() {
  useEffect(() => {
    const root = document.documentElement;
    let timeoutId: number | undefined;

    function markActive() {
      root.setAttribute("data-scrolling", "true");
      window.clearTimeout(timeoutId);
      timeoutId = window.setTimeout(() => {
        root.removeAttribute("data-scrolling");
      }, 1100);
    }

    function handleMouseMove(event: MouseEvent) {
      if (window.innerWidth - event.clientX <= 28) {
        markActive();
      }
    }

    window.addEventListener("scroll", markActive, { passive: true });
    window.addEventListener("mousemove", handleMouseMove, { passive: true });

    return () => {
      window.clearTimeout(timeoutId);
      window.removeEventListener("scroll", markActive);
      window.removeEventListener("mousemove", handleMouseMove);
      root.removeAttribute("data-scrolling");
    };
  }, []);

  return null;
}