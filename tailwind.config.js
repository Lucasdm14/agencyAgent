/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['system-ui', 'sans-serif'],
        display: ['Georgia', 'serif'],
        mono: ['ui-monospace', 'monospace'],
      },
      colors: {
        ink:     '#0D0D0D',
        paper:   '#F7F5F0',
        accent:  '#E8440A',
        muted:   '#8C8C8C',
        border:  '#E0DDD8',
        card:    '#FFFFFF',
        success: '#1A7A4A',
        warning: '#C97A00',
      },
    },
  },
  plugins: [],
}
