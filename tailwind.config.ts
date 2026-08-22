import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#f4f8ff",
        mist: "#dce8f5",
        tide: "#82f3d4",
        coral: "#ff9b7b",
        primary: "#82f3d4",
        accent: "#ff9b7b",
        surface: "#111b2b",
        muted: "#8c9aab",
      },
      boxShadow: {
        glow: "0 0 80px rgba(130, 243, 212, 0.18)",
        card: "0 24px 70px rgba(0, 0, 0, 0.32)",
        sm: "0 8px 24px rgba(0, 0, 0, 0.20)",
      },
      borderRadius: {
        card: "1.625rem",
        button: "0.9375rem",
      },
      fontFamily: {
        display: ["Space Grotesk", "Manrope", "sans-serif"],
        sans: ["Manrope", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["DM Mono", "ui-monospace", "monospace"],
      },
      fontSize: {
        display: ["clamp(3.5rem, 9vw, 8.5rem)", { lineHeight: ".88", letterSpacing: "-.075em" }],
        heading: ["clamp(1.75rem, 4vw, 3rem)", { lineHeight: "1.05", letterSpacing: "-.055em" }],
      },
      keyframes: {
        shimmer: { "0%": { backgroundPosition: "200% 0" }, "100%": { backgroundPosition: "-200% 0" } },
      },
      animation: {
        shimmer: "shimmer 5s linear infinite",
      },
    },
  },
  plugins: [],
};

export default config;
