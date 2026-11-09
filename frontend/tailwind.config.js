/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        nexo: {
          bg: "#000000",
          card: "#0A0A0A",
          surface: "#141414",
          border: "#262626",
          accent: "#FFFFFF",
          muted: "#737373",
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
