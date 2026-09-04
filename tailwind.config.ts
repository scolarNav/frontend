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
        forest: "#d3622c",
        "forest-light": "#e07840",
        rule: "#c5d5e8",
        "rule-strong": "#a8bfd8",
        alert: "#DC2626",
        navy: "#1a2d45",
        indigo: "#dce8f5",
      },
      fontFamily: {
        display: ["var(--font-display)", "serif"],
        body: ["var(--font-body)", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
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
      transitionDuration: {
        "150": "150ms",
      },
    },
  },
  plugins: [],
};

export default config;
