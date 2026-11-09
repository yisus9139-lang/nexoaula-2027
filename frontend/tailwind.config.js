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
          canvas: "#F8F8F8",
          card: "#FFFFFF",
          surface: "#F1F5F9",
          border: "#E2E8F0",
          primary: "#005FB8",
          primaryHover: "#004C94",
          text: "#0F172A",
          muted: "#64748B",
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
