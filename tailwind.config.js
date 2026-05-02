/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#eef4fb',
          100: '#d4e6f5',
          200: '#aacceb',
          400: '#4a90d9',
          600: '#2e72be',
          800: '#1a4a8a',
        },
        'nc-red': {
          50:  '#f5d4d4',
          100: '#ebb8b8',
          400: '#e05c5c',
          600: '#c43a3a',
        },
      },
      fontFamily: {
        sans: ["'Nunito'", 'system-ui', 'sans-serif'],
        mono: ["'JetBrains Mono'", 'monospace'],
      },
      borderRadius: {
        xl:  '14px',
        '2xl': '20px',
        '3xl': '28px',
      },
    },
  },
  plugins: [],
}
