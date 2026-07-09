"use client";

import { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";

/**
 * Dark/light theme toggle. The active theme is just the presence of the
 * `.light` class on <html>; we persist the choice to localStorage and a tiny
 * inline script in the root layout applies it before paint (no flash). Default
 * is dark, matching the original design.
 */
export function ThemeToggle() {
  const [light, setLight] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Read the real state on mount (the layout script may already have set it).
  useEffect(() => {
    setLight(document.documentElement.classList.contains("light"));
    setMounted(true);
  }, []);

  function toggle() {
    const next = !light;
    setLight(next);
    document.documentElement.classList.toggle("light", next);
    try {
      localStorage.setItem("theme", next ? "light" : "dark");
    } catch {
      /* storage unavailable — toggle still works for this session */
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      title={light ? "Switch to dark mode" : "Switch to light mode"}
      aria-label="Toggle theme"
      aria-pressed={light}
      className="focusring rounded-xl border border-border bg-panel p-2 text-ink-faint hover:bg-hover hover:text-ink"
    >
      {/* Until mounted, render a stable icon to avoid hydration mismatch. */}
      {mounted && light ? <Moon size={16} /> : <Sun size={16} />}
    </button>
  );
}
