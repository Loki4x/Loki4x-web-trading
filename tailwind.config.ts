import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#5F85DB",
          hover: "#90B8F8",
          subtle: "rgba(95, 133, 219, 0.15)",
        },
        secondary: "#06b6d4",
        background: "rgb(var(--color-background) / <alpha-value>)",
        surface: {
          DEFAULT: "rgb(var(--color-surface) / <alpha-value>)",
          2: "rgb(var(--color-surface-2) / <alpha-value>)",
          hover: "rgb(var(--color-surface-hover) / <alpha-value>)",
        },
        text: {
          primary: "rgb(var(--color-text-primary) / <alpha-value>)",
          secondary: "rgb(var(--color-text-secondary) / <alpha-value>)",
          muted: "rgb(var(--color-text-muted) / <alpha-value>)",
          "on-primary": "#ffffff",
        },
        border: {
          DEFAULT: "rgb(var(--color-border) / <alpha-value>)",
          strong: "rgb(var(--color-border-strong) / <alpha-value>)",
        },
        success: { DEFAULT: "#10b981", subtle: "rgba(16, 185, 129, 0.15)" },
        error: { DEFAULT: "#ef4444", subtle: "rgba(239, 68, 68, 0.15)" },
        warning: { DEFAULT: "#f59e0b", subtle: "rgba(245, 158, 11, 0.15)" },
        info: { DEFAULT: "#3b82f6", subtle: "rgba(59, 130, 246, 0.15)" },
      },
      fontFamily: {
        display: ["var(--font-plus-jakarta-sans)", "system-ui", "sans-serif"],
        body: ["var(--font-inter)", "system-ui", "-apple-system", "sans-serif"],
        mono: ["var(--font-jetbrains-mono)", "ui-monospace", "monospace"],
      },
      fontSize: {
        display: ["2.5rem", { lineHeight: "1.15", letterSpacing: "-0.025em", fontWeight: "800" }],
        h1: ["2rem", { lineHeight: "1.2", letterSpacing: "-0.02em", fontWeight: "700" }],
        h2: ["1.5rem", { lineHeight: "1.25", fontWeight: "700" }],
        h3: ["1.25rem", { lineHeight: "1.3", fontWeight: "600" }],
        "body-lg": ["1.125rem", { lineHeight: "1.6", fontWeight: "400" }],
        body: ["0.9375rem", { lineHeight: "1.5", fontWeight: "400" }],
        "body-sm": ["0.8125rem", { lineHeight: "1.45", fontWeight: "400" }],
        caption: ["0.75rem", { lineHeight: "1.4", fontWeight: "500" }],
      },
      borderRadius: {
        sm: "0.375rem",
        md: "0.5rem",
        lg: "0.75rem",
        xl: "1rem",
        "2xl": "1.25rem",
        full: "9999px",
      },
      boxShadow: {
        sm: "0 2px 8px rgba(0, 0, 0, 0.5)",
        md: "0 4px 16px rgba(0, 0, 0, 0.6)",
        glow: "0 0 25px rgba(95, 133, 219, 0.25)",
        focus: "0 0 0 3px rgba(95, 133, 219, 0.4)",
      },
      maxWidth: {
        content: "1280px",
      },
      spacing: {
        sidebar: "260px",
        topbar: "64px",
      },
    },
  },
  plugins: [],
};

export default config;
