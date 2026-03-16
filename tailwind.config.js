/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans:    ['"Inter"', 'system-ui', 'sans-serif'],
        display: ['"Inter"', 'system-ui', 'sans-serif'],
        mono:    ['"Geist Mono"', 'ui-monospace', 'monospace'],
      },
      colors: {
        // Vercel-like palette
        bg:       '#0a0a0a',      // true black (sidebar)
        surface:  '#111111',      // card on dark
        panel:    '#1a1a1a',      // slightly lighter panel
        line:     '#2a2a2a',      // border on dark
        // Light
        canvas:   '#fafafa',      // page background
        card:     '#ffffff',      // card
        border:   '#e5e7eb',      // light border
        // Text
        primary:  '#0a0a0a',      // main text
        secondary:'#6b7280',      // secondary text
        tertiary: '#9ca3af',      // placeholder
        // Accent
        accent:   '#0070f3',      // Vercel blue (we use this for actions)
        accentHover: '#0060d3',
        // Status
        success:  '#10b981',
        warning:  '#f59e0b',
        danger:   '#ef4444',
        // Brand accent (keep orange for brand identity badges)
        brand:    '#E8440A',
      },
      borderRadius: {
        sm: '4px',
        DEFAULT: '6px',
        md: '8px',
        lg: '12px',
        xl: '16px',
      },
      fontSize: {
        '2xs': ['10px', '14px'],
      },
      boxShadow: {
        card: '0 1px 3px 0 rgba(0,0,0,0.06), 0 1px 2px -1px rgba(0,0,0,0.04)',
        float: '0 4px 16px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.04)',
        sm: '0 1px 2px 0 rgba(0,0,0,0.05)',
      },
    },
  },
  plugins: [],
}
