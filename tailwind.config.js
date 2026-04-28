/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#FEF3DB',
          100: '#FDE5A8',
          200: '#FBD06E',
          400: '#C67C0F',
          600: '#9A5E08',
          800: '#633806',
          900: '#412402',
        },
        'nc-red': {
          50:  '#FBEAEA',
          100: '#F5C4C4',
          400: '#C84040',
          600: '#B03030',
          800: '#7A1F1F',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
    },
  },
  plugins: [],
}
