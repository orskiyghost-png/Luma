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
      },
      boxShadow: {
        glow: "0 0 80px rgba(39, 185, 154, 0.18)",
      },
    },
  },
  plugins: [],
};

export default config;
