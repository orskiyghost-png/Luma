import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "var(--text)",
        mist: "var(--bg)",
        tide: "var(--accent)",
        coral: "#f2b394",
        primary: "var(--accent)",
        accent: "var(--accent)",
        surface: "var(--surface)",
        muted: "var(--text-muted)",
      },
      boxShadow: {
        glow: "var(--shadow-accent)",
        card: "var(--shadow-md)",
        sm: "var(--shadow-sm)",
      },
      borderRadius: {
        card: "var(--radius-card)",
        button: "var(--radius-control)",
      },
      fontFamily: {
        sans: ["var(--font-luma)", "DejaVu Sans", "Arial", "sans-serif"],
        mono: ["DejaVu Sans Mono", "ui-monospace", "monospace"],
      },
      fontSize: {
        display: ["clamp(2.8rem, 7vw, 5.8rem)", { lineHeight: "0.98", letterSpacing: "-0.07em" }],
        heading: ["clamp(1.9rem, 4vw, 2.7rem)", { lineHeight: "1.1", letterSpacing: "-0.05em" }],
      },
    },
  },
  plugins: [],
};

export default config;
