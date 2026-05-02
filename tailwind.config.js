/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          400: '#2563eb',
          600: '#1d4ed8',
          800: '#1e3a8a',
        },
        'nc-red': {
          50:  '#fee2e2',
          100: '#fecaca',
          400: '#ef4444',
          600: '#b91c1c',
        },
      },
      fontFamily: {
        sans: ["'Plus Jakarta Sans'", 'system-ui', 'sans-serif'],
        mono: ["'JetBrains Mono'", 'monospace'],
      },
      borderRadius: {
        xl:  '14px',
        '2xl': '18px',
      },
    },
  },
  plugins: [],
}
