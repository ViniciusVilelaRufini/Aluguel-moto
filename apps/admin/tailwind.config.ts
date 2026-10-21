import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: { 50: 'var(--ink-50)', 100: 'var(--ink-100)', 200: 'var(--ink-200)', 300: 'var(--ink-300)', 400: 'var(--ink-400)', 500: 'var(--ink-500)', 600: 'var(--ink-600)', 700: 'var(--ink-700)', 800: 'var(--ink-800)', 900: 'var(--ink-900)' },
        brand: { DEFAULT: 'var(--brand)', hover: 'var(--brand-hover)', press: 'var(--brand-press)', soft: 'var(--brand-soft)' },
        green: { 50: 'var(--green-50)', 100: 'var(--green-100)', 400: 'var(--green-400)', 500: 'var(--green-500)', 600: 'var(--green-600)', 700: 'var(--green-700)' },
        danger: { DEFAULT: 'var(--danger)', soft: 'var(--danger-soft)', ink: 'var(--danger-ink)' },
        warning: { DEFAULT: 'var(--warning)', soft: 'var(--warning-soft)', ink: 'var(--warning-ink)' },
        info: { DEFAULT: 'var(--info)', soft: 'var(--info-soft)', ink: 'var(--info-ink)' },
        success: { DEFAULT: 'var(--success)', soft: 'var(--success-soft)', ink: 'var(--success-ink)' },
        surface: { app: 'var(--surface-app)', card: 'var(--surface-card)', sunken: 'var(--surface-sunken)' },
      },
      fontFamily: { sans: ['var(--font-sans)'], mono: ['var(--font-mono)'] },
      borderRadius: { xs: 'var(--radius-xs)', sm: 'var(--radius-sm)', md: 'var(--radius-md)', lg: 'var(--radius-lg)', xl: 'var(--radius-xl)' },
      boxShadow: { 1: 'var(--shadow-1)', 2: 'var(--shadow-2)', brand: 'var(--shadow-brand)' },
    },
  },
  plugins: [],
};
export default config;
