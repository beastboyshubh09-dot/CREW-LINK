/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        forest: { 50: '#eef7f3', 100: '#d9eee5', 500: '#24816b', 600: '#176b5b', 700: '#125448', 900: '#113c35' },
        ink: '#192a26',
        canvas: '#f5f7f4'
      },
      fontFamily: { sans: ['DM Sans', 'sans-serif'], display: ['Manrope', 'sans-serif'] },
      boxShadow: { lift: '0 12px 35px rgba(20, 54, 46, .08)' }
    }
  },
  plugins: []
};