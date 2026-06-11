/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'Segoe UI', 'Arial', 'sans-serif'],
      },
      colors: {
        ink: '#17202a',
        paper: '#f7f6f2',
        line: '#d9d4c8',
        sage: '#3f6f5e',
        brick: '#9b4d3f',
        steel: '#435b75',
      },
    },
  },
  plugins: [],
};
