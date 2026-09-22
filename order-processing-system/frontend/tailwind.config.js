/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        cyber: {
          900: '#0a0e17',
          800: '#0f172a',
          700: '#1e293b',
          600: '#334155',
          accent: '#00f0ff',
          green: '#00ff9d',
          red: '#ff2e63',
          yellow: '#ffd700',
        }
      },
      animation: {
        'pulse-glow': 'pulse-glow 1.5s ease-in-out infinite',
        'flash': 'flash 0.6s ease-out',
      },
      keyframes: {
        'pulse-glow': {
          '0%, 100%': { boxShadow: '0 0 5px #00f0ff' },
          '50%': { boxShadow: '0 0 20px #00f0ff, 0 0 30px #00f0ff' },
        },
        flash: {
          '0%': { backgroundColor: 'rgba(0, 240, 255, 0.3)' },
          '100%': { backgroundColor: 'transparent' },
        }
      }
    },
  },
  plugins: [],
}
