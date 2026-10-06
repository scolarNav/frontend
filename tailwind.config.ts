import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: "#FFFFFF",
        "paper-alt": "#f0ece4",
        surface: "#f8f6f2",
        ink: "#0F172A",
        "ink-soft": "#334155",
        slate: "#64748B",
        brass: "#f0c845",
        "brass-light": "#f5d65e",
        forest: "#b8501f",
        "forest-light": "#9f4519",
        rule: "#c5d5e8",
        "rule-strong": "#a8bfd8",
        alert: "#b91c1c",
        navy: "#1a2d45",
        "navy-soft": "#223a57",
        "navy-raised": "#2c4a6e",
        ok: { DEFAULT: "#15803d", soft: "#f0fdf4" },
        warn: { DEFAULT: "#92400e", soft: "#fffbeb" },
        danger: { DEFAULT: "#b91c1c", soft: "#fef2f2" },
        info: { DEFAULT: "#1d4ed8", soft: "#eff6ff" },
        indigo: "#dce8f5",
      },
      fontFamily: {
        display: ["var(--font-display)", "serif"],
        body: ["var(--font-body)", "sans-serif"],
        // One interface family: the "mono" utility is kept for existing markup but renders in the body font (tabular numerals via globals.css).
        mono: ["var(--font-body)", "sans-serif"],
      },
      boxShadow: {
        card: "none",
        "card-hover": "none",
        "focus-ring": "0 0 0 3px rgba(211,98,44,0.15)",
        "btn": "none",
      },
      borderRadius: {
        none: "0px",
        sm: "4px",
        DEFAULT: "6px",
        md: "8px",
        lg: "10px",
        xl: "12px",
        "2xl": "16px",
        full: "9999px",
      },
      minHeight: { touch: "44px" },
      gridTemplateColumns: { detail: "minmax(0,1fr) 20rem" },
      transitionDuration: {
        "150": "150ms",
      },
    },
  },
  plugins: [],
};

export default config;
