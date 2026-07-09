import type { Config } from "tailwindcss";

/**
 * Design tokens — §9 "premium fintech" direction.
 * Dark, layered near-black surfaces, single orange accent, restrained.
 */
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Tokens resolve to CSS variables (RGB channels) so the active theme can
        // be flipped by toggling the `.light` class on <html>. `<alpha-value>`
        // keeps Tailwind opacity modifiers (e.g. bg-base/80) working. Channel
        // values are defined in globals.css (:root = dark, .light = light).
        // Layered backgrounds
        base: "rgb(var(--c-base) / <alpha-value>)",
        panel: "rgb(var(--c-panel) / <alpha-value>)",
        raised: "rgb(var(--c-raised) / <alpha-value>)",
        hover: "rgb(var(--c-hover) / <alpha-value>)",
        border: "rgb(var(--c-border) / <alpha-value>)",
        // Accent + semantic
        accent: "rgb(var(--c-accent) / <alpha-value>)",
        "accent-soft": "rgb(var(--c-accent) / 0.12)",
        gain: "rgb(var(--c-gain) / <alpha-value>)",
        loss: "rgb(var(--c-loss) / <alpha-value>)",
        // Text
        ink: "rgb(var(--c-ink) / <alpha-value>)",
        "ink-muted": "rgb(var(--c-ink-muted) / <alpha-value>)",
        "ink-faint": "rgb(var(--c-ink-faint) / <alpha-value>)",

        // ---- NomadWealth design tokens (design-exports/tokens.css) ----
        // Consumed as raw var() (hex tokens) by the marketing / setup /
        // cockpit surfaces. `brand` is the design accent (== #ff7a18).
        bg: "var(--bg)",
        surface: {
          DEFAULT: "var(--surface)",
          2: "var(--surface-2)",
          3: "var(--surface-3)",
        },
        input: "var(--input-bg)",
        text: { DEFAULT: "var(--text)", 2: "var(--text-2)" },
        muted: "var(--muted)",
        dim: "var(--dim)",
        disabled: "var(--disabled)",
        brand: {
          DEFAULT: "var(--accent)",
          on: "var(--accent-on)",
          ink: "var(--accent-ink)",
          tint: "var(--accent-tint)",
        },
        "nw-gain": "var(--nw-gain)",
        "nw-loss": "var(--nw-loss)",
        series: {
          holdings: "var(--series-holdings)",
          realestate: "var(--series-realestate)",
          loans: "var(--series-loans)",
          cash: "var(--series-cash)",
          business: "var(--series-business)",
        },
        neon: "var(--neon)",
      },
      borderColor: {
        hair: "var(--hair)",
        line: "var(--line)",
        "line-strong": "var(--line-strong)",
        btn: "var(--border-btn)",
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-geist-mono)", "ui-monospace", "monospace"],
      },
      borderRadius: {
        "2xl": "1rem",
        chip: "6px",
        pill: "7px",
        sm: "8px",
        md: "10px",
        btn: "12px",
        card: "14px",
        panel: "16px",
        full: "99px",
      },
      boxShadow: {
        card: "0 1px 0 0 rgba(255,255,255,0.02) inset, 0 8px 24px -12px rgba(0,0,0,0.6)",
        glow: "0 0 80px -10px rgba(255,122,24,0.35)",
        float: "var(--shadow)",
        "brand-glow": "var(--glow)",
        "brand-glow-hover": "var(--glow-hover)",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          "100%": { transform: "translateX(100%)" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.4s cubic-bezier(0.16,1,0.3,1) both",
        shimmer: "shimmer 1.5s infinite",
      },
    },
  },
  plugins: [],
};

export default config;
