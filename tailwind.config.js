/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: 'hsl(var(--color-primary-50) / <alpha-value>)',
          500: 'hsl(var(--color-primary-500) / <alpha-value>)',
          600: 'hsl(var(--color-primary-600) / <alpha-value>)',
        },
        bg: {
          base: 'hsl(var(--color-bg-base) / <alpha-value>)',
          surface: 'hsl(var(--color-bg-surface) / <alpha-value>)',
        },
        text: {
          base: 'hsl(var(--color-text-base) / <alpha-value>)',
          muted: 'hsl(var(--color-text-muted) / <alpha-value>)',
        },
        success: 'hsl(var(--color-success) / <alpha-value>)',
        warning: 'hsl(var(--color-warning) / <alpha-value>)',
        danger: 'hsl(var(--color-danger) / <alpha-value>)',
      },
      spacing: {
        'token-1': 'var(--space-1)',
        'token-2': 'var(--space-2)',
        'token-3': 'var(--space-3)',
        'token-4': 'var(--space-4)',
        'token-6': 'var(--space-6)',
        'token-8': 'var(--space-8)',
        'token-12': 'var(--space-12)',
      },
      fontFamily: {
        sans: ['var(--font-family-sans)'],
        display: ['var(--font-family-display)'],
      }
    },
  },
  plugins: [],
}