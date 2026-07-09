"use client";

import { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";

/**
 * Flips the `.light` class on <html> and persists to localStorage('theme') —
 * the same mechanism the dashboard uses (see app/layout.tsx pre-paint script),
 * so the choice is shared across the marketing and app surfaces.
 */
export function ThemeToggle({ className }: { className?: string }) {
  const [light, setLight] = useState(false);

  useEffect(() => {
    setLight(document.documentElement.classList.contains("light"));
  }, []);

  function toggle() {
    const next = !light;
    setLight(next);
    document.documentElement.classList.toggle("light", next);
    try {
      localStorage.setItem("theme", next ? "light" : "dark");
    } catch {
      /* ignore */
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={light ? "Switch to dark theme" : "Switch to light theme"}
      className={
        "grid h-[34px] w-[34px] place-items-center rounded-md border border-line bg-[color:var(--chip)] text-text transition-colors hover:bg-[color:var(--hair)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent-ring)] " +
        (className ?? "")
      }
    >
      {light ? <Moon size={16} /> : <Sun size={16} />}
    </button>
  );
}
