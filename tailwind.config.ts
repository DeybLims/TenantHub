import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          DEFAULT: "#1e2a4a",
          dark: "#152038",
        },
        brand: {
          blue: "#2563eb",
          "blue-dark": "#1d4ed8",
          emerald: "#10b981",
          orange: "#f97316",
          coral: "#ef4444",
          purple: "#8b5cf6",
        },
        surface: {
          DEFAULT: "#f3f4f6",
          card: "#ffffff",
        },
      },
      boxShadow: {
        card: "0 1px 3px 0 rgb(0 0 0 / 0.08), 0 1px 2px -1px rgb(0 0 0 / 0.08)",
      },
    },
  },
  plugins: [],
};

export default config;
