/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ['./app/**/*.{js,ts,jsx,tsx,mdx}', './components/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        primary:   { DEFAULT: '#6874B5', dark: '#5563a0', light: '#8591c8' },
        secondary: '#65A0D3',
        sidebar:   '#0a1018',
        app: { dark: '#0d1520', light: '#F0F2F5' },
        card: { dark: 'rgba(255,255,255,0.04)', light: '#ffffff' },
      },
      fontFamily: { sans: ['Inter', 'Montserrat', 'sans-serif'] },
    },
  },
  plugins: [],
}
