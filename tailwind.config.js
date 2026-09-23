/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          950: '#0b1220',
          900: '#0f172a',
          800: '#141e33',
          700: '#1b273f',
        },
        brand: {
          50: '#e9fbf4',
          100: '#c9f5e2',
          400: '#2fd6a0',
          500: '#14b98a',
          600: '#0ea377',
          700: '#0a8562',
        },
      },
      fontFamily: {
        sans: ['"Inter"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 3px 0 rgba(15, 23, 42, 0.08), 0 4px 12px -2px rgba(15, 23, 42, 0.08)',
        'card-lg': '0 4px 16px -2px rgba(15, 23, 42, 0.10), 0 12px 28px -8px rgba(15, 23, 42, 0.14)',
      },
      borderRadius: {
        xl2: '1rem',
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      animation: {
        shimmer: 'shimmer 1.5s ease-in-out infinite',
      },
      backgroundImage: {
        shimmer: 'linear-gradient(90deg, #eef2f7 25%, #e2e8f0 37%, #eef2f7 63%)',
      },
      backgroundSize: {
        shimmer: '200% 100%',
      },
    },
  },
  plugins: [],
}
