import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: ['class'],
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        condensed: ['Barlow Condensed', 'sans-serif'],
        sans: ['Barlow', 'sans-serif'],
      },
      colors: {
        primary: 'var(--primary)',
        'primary-dark': 'var(--primary-dark)',
        'primary-light': 'var(--primary-light)',
        cta: 'var(--cta)',
        'cta-hover': 'var(--cta-hover)',
        dark: '#0d1b2a',
        dark2: '#1a2e42',
        ocean: '#023e8a',
      },
      borderRadius: {
        DEFAULT: '12px',
        sm: '8px',
      },
      keyframes: {
        'fade-up': {
          from: { opacity: '0', transform: 'translateY(12px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        'pop': {
          from: { opacity: '0', transform: 'scale(0.85)' },
          to:   { opacity: '1', transform: 'scale(1)' },
        },
        'ocean-pulse': {
          '0%,100%': { transform: 'translateX(-50%) scale(1)' },
          '50%':      { transform: 'translateX(-50%) scale(1.07)' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.4s cubic-bezier(.4,0,.2,1) both',
        'pop':     'pop 0.35s cubic-bezier(.4,0,.2,1) both',
        'ocean':   'ocean-pulse 7s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}

export default config
