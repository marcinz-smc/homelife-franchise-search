/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          950: "#070b0e",
          900: "#0b1014",
          800: "#121920",
          700: "#1a232c",
          600: "#24303b",
        },
        parchment: {
          100: "#f4ead8",
          200: "#e8dcc8",
          300: "#d4c4a8",
        },
        copper: {
          400: "#d9a066",
          500: "#c9844a",
          600: "#a86a36",
        },
        signal: {
          400: "#5eb8ad",
          500: "#3d9b8f",
          600: "#2d7a71",
        },
        gap: {
          400: "#d47a60",
          500: "#c45c3e",
          600: "#9a4630",
        },
        fog: {
          300: "#c5d0d8",
          400: "#8a9aa8",
          500: "#5c6d7a",
        },
        steel: {
          300: "#c5e0f2",
          400: "#7ea8c9",
          500: "#4a7fa3",
          600: "#3d5a73",
        },
      },
      fontFamily: {
        display: ["Fraunces", "Georgia", "serif"],
        sans: ["Outfit", "Segoe UI", "sans-serif"],
        mono: ["IBM Plex Mono", "ui-monospace", "monospace"],
      },
      boxShadow: {
        panel: "0 24px 60px rgba(0, 0, 0, 0.35)",
        inset: "inset 0 1px 0 rgba(255, 255, 255, 0.04)",
      },
      backgroundImage: {
        topo: "radial-gradient(circle at 1px 1px, rgba(201, 132, 74, 0.08) 1px, transparent 0)",
      },
    },
  },
  plugins: [],
};
