import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#08111f",
        mist: "#eef5f2",
        tide: "#27b99a",
        coral: "#ff8066",
        primary: "#27b99a",
        accent: "#ff8066",
        surface: "#ffffff",
        muted: "#7b8b95",
      },
      boxShadow: {
        glow: "0 0 80px rgba(39, 185, 154, 0.18)",
        card: "0 4px 6px -1px rgba(8, 17, 31, 0.1)",
        sm: "0 1px 2px 0 rgba(8, 17, 31, 0.05)",
      },
      borderRadius: {
        card: "1.5rem",
        button: "0.85rem",
      },
      fontSize: {
        display: ["3rem", { lineHeight: "1", letterSpacing: "-0.04em" }],
        heading: ["1.5rem", { lineHeight: "1.25", letterSpacing: "-0.02em" }],
      },
    },
  },
  plugins: [],
};

export default config;
