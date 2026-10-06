import type { Config } from "tailwindcss";

/**
 * ScolarNav design tokens.
 * Colour: warm neutral surfaces, navy for structure, one orange accent, four semantic pairs.
 * Everything in the UI should come from these tokens; do not add arbitrary values in markup.
 */
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Surfaces
        paper: "#FFFFFF",
        surface: "#f8f6f2", // page background
        "surface-2": "#efe9de", // sunken areas, hover on white, skeletons
        "paper-alt": "#f0ece4",
        // Text
        ink: "#0F172A",
        "ink-soft": "#334155",
        slate: "#5b6b80", // secondary text, 5.3:1 on white, 4.9:1 on surface
        // Lines
        rule: "#e4ded2", // decorative dividers
        "rule-strong": "#cfc7b8",
        control: "#7c8ba0", // edges of inputs and checkboxes, 3.5:1 on white
        // Brand
        forest: "#b8501f", // accent: primary actions, links, current item
        "forest-light": "#9f4519", // accent hover
        "forest-soft": "#fbeee6",
        brass: "#f0c845",
        "brass-light": "#f5d65e",
        navy: "#1a2d45",
        "navy-soft": "#223a57",
        "navy-raised": "#2c4a6e",
        indigo: "#ece6da",
        alert: "#b91c1c",
        // Semantic pairs: DEFAULT for text and icons, soft for backgrounds
        ok: { DEFAULT: "#15803d", soft: "#f0fdf4" },
        warn: { DEFAULT: "#92400e", soft: "#fffbeb" },
        danger: { DEFAULT: "#b91c1c", soft: "#fef2f2" },
        info: { DEFAULT: "#1d4ed8", soft: "#eff6ff" },
      },
      fontFamily: {
        display: ["var(--font-display)", "serif"],
        body: ["var(--font-body)", "sans-serif"],
        // One interface family: "mono" stays so older markup keeps working, but renders in the body font
        // with tabular numerals (see globals.css).
        mono: ["var(--font-body)", "sans-serif"],
      },
      boxShadow: {
        card: "none",
        "card-hover": "none",
        // Two levels only: raised (menus) and overlay (dialogs).
        raised: "0 4px 16px rgba(15,23,42,0.10)",
        overlay: "0 16px 48px rgba(15,23,42,0.20)",
        "focus-ring": "0 0 0 3px rgba(184,80,31,0.20)",
        btn: "none",
      },
      borderRadius: {
        none: "0px",
        sm: "4px",
        DEFAULT: "6px",
        md: "8px", // inputs and buttons
        lg: "10px",
        xl: "12px", // cards
        "2xl": "16px", // dialogs
        full: "9999px",
      },
      minHeight: { touch: "44px" },
      minWidth: { table: "40rem" },
      gridTemplateColumns: { detail: "minmax(0,1fr) 20rem", footer: "1.5fr 1fr 1fr", workspace: "13rem minmax(0,1fr)" },
      transitionDuration: { "150": "150ms" },
      keyframes: {
        "soft-pulse": { "0%, 100%": { opacity: "1" }, "50%": { opacity: "0.5" } },
        "fade-in": { from: { opacity: "0" }, to: { opacity: "1" } },
        "rise-in": { from: { opacity: "0", transform: "translateY(6px)" }, to: { opacity: "1", transform: "translateY(0)" } },
        indeterminate: { "0%": { transform: "translateX(-100%)" }, "100%": { transform: "translateX(350%)" } },
      },
      animation: {
        "soft-pulse": "soft-pulse 1.4s ease-in-out infinite",
        "fade-in": "fade-in 150ms ease-out both",
        "rise-in": "rise-in 220ms ease-out both",
        indeterminate: "indeterminate 1.2s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
