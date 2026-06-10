import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: 'var(--color-background)',
        surface: 'var(--color-surface)',
        foreground: 'var(--color-foreground)',
        muted: 'var(--color-muted)',
        'muted-foreground': 'var(--color-muted-foreground)',
        border: 'var(--color-border)',
        primary: 'var(--color-primary)',
        'primary-foreground': 'var(--color-primary-foreground)',
        success: 'var(--color-success)',
        warning: 'var(--color-warning)',
        error: 'var(--color-error)',
        critical: 'var(--color-critical)',
        node: {
          problem: '#3b82f6',
          failure: '#fb923c',
          rootCause: '#f59e0b',
          weakness: '#a855f7',
          strategy: '#22c55e',
        },
      },
      fontFamily: {
        sans: ['var(--font-geist-sans)'],
        mono: ['var(--font-geist-mono)'],
      },
      borderRadius: {
        card: '12px',
        input: '8px',
      },
      spacing: {
        sidebar: '80px',
      },
      keyframes: {
        'root-cause-pulse': {
          '0%, 100%': {
            boxShadow: '0 0 0 0 rgba(255, 95, 82, 0.7)',
          },
          '50%': {
            boxShadow: '0 0 0 10px rgba(255, 95, 82, 0)',
          },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'slide-up': {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-in-right': {
          '0%': { opacity: '0', transform: 'translateX(-10px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
      },
      animation: {
        'root-cause-pulse': 'root-cause-pulse 2s infinite',
        'fade-in': 'fade-in 0.3s ease-in-out',
        'slide-up': 'slide-up 0.3s ease-in-out',
        'slide-in-right': 'slide-in-right 0.3s ease-in-out',
      },
    },
  },
  plugins: [],
};

export default config;