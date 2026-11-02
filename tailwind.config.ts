import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#17211d',
        canvas: '#f5f2eb',
        panel: '#fcfbf8',
        sage: {
          50: '#f1f5f0',
          100: '#e2ebe0',
          300: '#a9bea3',
          500: '#668360',
          700: '#40563c',
          900: '#263523',
        },
        coral: '#e9775b',
      },
      boxShadow: { soft: '0 18px 50px rgba(40, 54, 47, 0.08)' },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['Segoe UI', 'Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
} satisfies Config
