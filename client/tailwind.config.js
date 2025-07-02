/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'trading-dark': '#0f172a',
        'trading-gray': '#1e293b',
        'trading-light': '#f1f5f9',
        'trading-green': '#10b981',
        'trading-red': '#ef4444',
        'trading-blue': '#3b82f6',
      }
    },
  },
  plugins: [],
}
