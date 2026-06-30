/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,mjs,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'polyglot-dark': '#0f0e17',
        'polyglot-card': '#1a1a2e',
        'polyglot-accent': '#e94560',
        'polyglot-gold': '#ffd700',
        'polyglot-green': '#2ecc71',
        'polyglot-blue': '#3498db',
        'polyglot-purple': '#9b59b6',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'bounce-slow': 'bounce 2s infinite',
        'shimmer': 'shimmer 2s linear infinite',
        'shimmer-slow': 'shimmer 13s linear infinite',
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '-1000px 0' },
          '100%': { backgroundPosition: '1000px 0' },
        }
      }
    },
  },
  plugins: [],
}