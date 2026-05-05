/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        agro: {
          green: "#16a34a",
          orange: "#ea580c",
          background: "#f0fdf4",
        },
      },
      fontFamily: {
        sans: ['"Noto Sans Devanagari"', "Inter", "system-ui", "sans-serif"],
      },
      boxShadow: {
        soft: "0 18px 45px rgba(22, 163, 74, 0.12)",
      },
    },
  },
  plugins: [],
};
