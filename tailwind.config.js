/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    fontSize: {
      '2xs':  ['0.6875rem', { lineHeight: '1rem' }],     // 11px
      'xs':   ['0.75rem',   { lineHeight: '1rem' }],     // 12px
      'sm':   ['0.875rem',  { lineHeight: '1.25rem' }],  // 14px
      'base': ['0.9375rem', { lineHeight: '1.5rem' }],   // 15px
      'lg':   ['1rem',      { lineHeight: '1.5rem' }],   // 16px
      'xl':   ['1.125rem',  { lineHeight: '1.75rem' }],  // 18px
      '2xl':  ['1.5rem',    { lineHeight: '2rem' }],     // 24px
      '3xl':  ['1.875rem',  { lineHeight: '2.25rem' }],  // 30px
      '4xl':  ['2.25rem',   { lineHeight: '2.5rem' }],   // 36px
      '5xl':  ['3rem',      { lineHeight: '3rem' }],     // 48px
    },
    extend: {
      colors: {
        /* ── Token-driven (from CSS variables) ── */
        background: 'rgb(var(--background) / <alpha-value>)',
        foreground: 'rgb(var(--foreground) / <alpha-value>)',
        card: {
          DEFAULT: 'rgb(var(--card) / <alpha-value>)',
          foreground: 'rgb(var(--card-foreground) / <alpha-value>)',
        },
        popover: {
          DEFAULT: 'rgb(var(--popover) / <alpha-value>)',
          foreground: 'rgb(var(--popover-foreground) / <alpha-value>)',
        },
        muted: {
          DEFAULT: 'rgb(var(--muted) / <alpha-value>)',
          foreground: 'rgb(var(--muted-foreground) / <alpha-value>)',
        },
        primary: {
          DEFAULT: 'rgb(var(--primary) / <alpha-value>)',
          foreground: 'rgb(var(--primary-foreground) / <alpha-value>)',
        },
        secondary: {
          DEFAULT: 'rgb(var(--secondary) / <alpha-value>)',
          foreground: 'rgb(var(--secondary-foreground) / <alpha-value>)',
        },
        accent: {
          DEFAULT: 'rgb(var(--accent) / <alpha-value>)',
          foreground: 'rgb(var(--accent-foreground) / <alpha-value>)',
        },
        border: 'rgb(var(--border) / <alpha-value>)',
        input: 'rgb(var(--input) / <alpha-value>)',
        ring: 'rgb(var(--ring) / <alpha-value>)',
        destructive: {
          DEFAULT: 'rgb(var(--destructive) / <alpha-value>)',
          foreground: 'rgb(var(--destructive-foreground) / <alpha-value>)',
        },
        warning: 'rgb(var(--warning) / <alpha-value>)',
        success: 'rgb(var(--success) / <alpha-value>)',

        /* ── Brand (static, for backward compat) ── */
        navy: {
          DEFAULT: '#0D1E3A',
          50: '#E8EDF4',
          100: '#C5D0DF',
          200: '#9AAFC8',
          300: '#6F8DB0',
          400: '#4F729F',
          500: '#305789',
          600: '#244471',
          700: '#183459',
          800: '#0E2445',
          900: '#0B1F3A',
          950: '#071426',
        },
        cyan: {
          DEFAULT: '#25C2D3',
          50: '#E0F9FB',
          100: '#B3F0F5',
          200: '#80E6EF',
          300: '#4DDBE9',
          400: '#26D3E3',
          500: '#00C2D4',
          600: '#00A8B8',
          700: '#008A98',
          800: '#006D78',
          900: '#004F58',
        },
        green: '#10B981',
        'off-white': '#F4F7FB',

        // Legacy aliases — keep until phase 03 migrates all pages
        paper: '#FFFFFF',
        canvas: '#F8FAFC',
        ink: '#0F172A',
        rule: '#E2E8F0',
      },
      fontFamily: {
        sans: ['"Geist Variable"', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['"Geist Mono Variable"', 'ui-monospace', 'monospace'],
        // Legacy aliases — keep until phase 03 removes font-syne usage
        syne:      ['"Geist Variable"', 'system-ui', '-apple-system', 'sans-serif'],
        'dm-sans': ['"Geist Variable"', 'system-ui', '-apple-system', 'sans-serif'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'scan-line': 'scanLine 2s ease-in-out infinite',
        'fade-in': 'fadeIn 0.5s ease-out forwards',
        'slide-up': 'slideUp 0.4s ease-out forwards',
      },
      keyframes: {
        scanLine: {
          '0%, 100%': { opacity: '0.3' },
          '50%': { opacity: '1' },
        },
        fadeIn: {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        slideUp: {
          from: { opacity: '0', transform: 'translateY(16px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}
