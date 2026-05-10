import type { Config } from "tailwindcss";
const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        "whoop-green": "#00ff87",
        "whoop-blue": "#4a9eff",
        "whoop-orange": "#ff6b35",
        "whoop-gold": "#c9a84c",
        "whoop-purple": "#9b8afb",
        "surface": "#111111",
        "border-subtle": "#1f1f1f",
        "bg-base": "#0a0a0a",
      },
      fontFamily: {
        mono: ["DM Mono", "monospace"],
        sans: ["Geist", "sans-serif"],
      },
      gridTemplateColumns: {
        "12": "repeat(12, minmax(0, 1fr))",
      },
    },
  },
  plugins: [],
};
export default config;
