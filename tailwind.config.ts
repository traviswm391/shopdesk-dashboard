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
        orange: {
          400: "#fb923c",
          500: "#f97316",
          600: "#ea580c",
        },
        charcoal: {
          800: "#1f2937",
          900: "#111827",
          950: "#030712",
        },
      },
    },
  },
  plugins: [],
};

export default config;
