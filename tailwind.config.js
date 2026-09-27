/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // NEST@R brand colors
        ink: {
          950: '#0d1929',
          900: '#152238',
          800: '#1a2a4a',
          700: '#243556',
          600: '#2e4166',
        },
        brand: {
          50: '#fdf9ef',
          100: '#faf0d5',
          200: '#f5e0aa',
          300: '#eecb75',
          400: '#e5b343',
          500: '#d4a832',  // Main gold
          600: '#c9a962',  // Logo gold
          700: '#a68a3d',
          800: '#866d32',
          900: '#6d5a2b',
        },
        navy: {
          50: '#f0f4f8',
          100: '#d9e2ec',
          200: '#bcccdc',
          300: '#9fb3c8',
          400: '#829ab1',
          500: '#627d98',
          600: '#486581',
          700: '#334e68',
          800: '#243b53',
          900: '#1a2a4a',  // Logo navy
          950: '#0d1929',
        },
      },
      fontFamily: {
        sans: ['"Inter"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 3px 0 rgba(26, 42, 74, 0.08), 0 4px 12px -2px rgba(26, 42, 74, 0.08)',
        'card-lg': '0 4px 16px -2px rgba(26, 42, 74, 0.10), 0 12px 28px -8px rgba(26, 42, 74, 0.14)',
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
