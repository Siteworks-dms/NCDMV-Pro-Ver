/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  'rgba(56,189,248,0.06)',
          100: 'rgba(56,189,248,0.12)',
          200: 'rgba(56,189,248,0.20)',
          400: '#38bdf8',
          600: '#0ea5e9',
          800: '#0c4a6e',
        },
        'nc-red': {
          50:  'rgba(248,113,113,0.10)',
          100: 'rgba(248,113,113,0.20)',
          400: '#f87171',
          600: '#ef4444',
        },
      },
      fontFamily: {
        sans: ["'Outfit'", 'system-ui', 'sans-serif'],
        mono: ["'Space Mono'", 'monospace'],
      },
    },
  },
  plugins: [],
}
