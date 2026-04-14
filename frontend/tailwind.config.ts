import type { Config } from 'tailwindcss';

export default {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './ui/**/*.{ts,tsx}'
  ],
  theme: {
    extend: {
      boxShadow: {
        glow: '0 0 40px rgba(99, 102, 241, 0.45)',
        portal: '0 0 60px rgba(56, 189, 248, 0.25), inset 0 0 30px rgba(167, 139, 250, 0.25)'
      },
      colors: {
        aurora: {
          50: '#eef2ff',
          100: '#e0e7ff',
          500: '#8b5cf6'
        }
      },
      backgroundImage: {
        cosmic: 'radial-gradient(circle at top, rgba(56, 189, 248, 0.16), transparent 30%), radial-gradient(circle at 20% 20%, rgba(236, 72, 153, 0.12), transparent 24%), radial-gradient(circle at 85% 15%, rgba(124, 58, 237, 0.16), transparent 18%), radial-gradient(circle at 10% 80%, rgba(16, 185, 129, 0.14), transparent 16%)'
      }
    }
  },
  plugins: []
} satisfies Config;
