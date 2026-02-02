
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./index.tsx",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      screens: {
        'xs': '400px',
      },
      boxShadow: {
        'inner-sm': 'inset 0 1px 2px 0 rgb(0 0 0 / 0.05)',
      }
    },
  },
  plugins: [],
}
