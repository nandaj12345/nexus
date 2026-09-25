/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Main brand
        brand: {
          50:  '#f0f0ff',
          100: '#e0e1ff',
          200: '#c7c8fe',
          300: '#a6a4fc',
          400: '#8880f8',
          500: '#7c6cf2',
          600: '#6d4fe7',
          700: '#5e3dcb',
          800: '#4d34a4',
          900: '#412e83',
          950: '#271c4e',
        },
        // Backgrounds
        bg: {
          primary:   '#0e0e14',
          secondary: '#13131b',
          tertiary:  '#1a1a25',
          elevated:  '#1f1f2e',
          hover:     '#252535',
          active:    '#2a2a3d',
          border:    '#2d2d42',
        },
        // Text
        text: {
          primary:   '#e8e8f0',
          secondary: '#9999b5',
          muted:     '#5c5c78',
          inverse:   '#0e0e14',
        },
        // Status
        online:  '#3bce6f',
        idle:    '#f0a733',
        dnd:     '#f04747',
        offline: '#4a4a6a',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      animation: {
        'fade-in':    'fadeIn 0.15s ease-out',
        'slide-up':   'slideUp 0.2s ease-out',
        'slide-in':   'slideIn 0.2s ease-out',
        'scale-in':   'scaleIn 0.15s ease-out',
        'pulse-slow': 'pulse 3s ease-in-out infinite',
        'bounce-sm':  'bounceSm 0.6s ease-out',
      },
      keyframes: {
        fadeIn:   { from: { opacity: '0' },                        to: { opacity: '1' } },
        slideUp:  { from: { opacity: '0', transform: 'translateY(8px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        slideIn:  { from: { opacity: '0', transform: 'translateX(-8px)' }, to: { opacity: '1', transform: 'translateX(0)' } },
        scaleIn:  { from: { opacity: '0', transform: 'scale(0.95)' }, to: { opacity: '1', transform: 'scale(1)' } },
        bounceSm: { '0%, 100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-4px)' } },
      },
      borderRadius: {
        'xl':  '0.75rem',
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
      boxShadow: {
        'glow':    '0 0 20px rgba(124, 108, 242, 0.15)',
        'glow-lg': '0 0 40px rgba(124, 108, 242, 0.25)',
        'card':    '0 4px 24px rgba(0, 0, 0, 0.4)',
        'popup':   '0 8px 32px rgba(0, 0, 0, 0.6)',
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
}
