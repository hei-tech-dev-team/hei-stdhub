/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        navy: {
          DEFAULT: "#001948",
          dark: "#0A1A33",
        },
        gold: {
          DEFAULT: "#DFA408",
          light: "#F2C94C",
        },
        surface: "#F2F4F8",
        contact: "#D9DCE3",
      },
      fontFamily: {
        quicksand: ["Quicksand", "sans-serif"],
      },
      boxShadow: {
        card: "0 2px 12px 0 rgba(0,25,72,0.08)",
        modal: "0 8px 32px 0 rgba(0,25,72,0.16)",
      },
    },
  },
  plugins: [],
};
