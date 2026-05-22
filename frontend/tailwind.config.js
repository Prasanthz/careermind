/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#6C63FF",
        dark: "#1A1A2E",
        card: "#16213E",
      },
    },
  },
  plugins: [],
}