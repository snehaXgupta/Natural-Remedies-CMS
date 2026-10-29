/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          '"Salesforce Sans"',
          '"ITC Avant Garde"',
          'system-ui',
          '-apple-system',
          '"Segoe UI"',
          'Roboto',
          'Arial',
          'sans-serif',
        ],
        display: ['"Salesforce Sans"', 'Arial', 'sans-serif'],
        headline: ['"ITC Avant Garde"', 'sans-serif', 'Arial'],
      },
      fontSize: {
        xs: ['0.75rem', { lineHeight: '1.1rem' }],
        sm: ['0.8125rem', { lineHeight: '1.25rem' }],
        base: ['0.875rem', { lineHeight: '1.4rem' }],
        lg: ['1rem', { lineHeight: '1.5rem' }],
        xl: ['1.25rem', { lineHeight: '1.75rem' }],
        'headline-display': ['40px', { lineHeight: '48px', letterSpacing: '0px' }],
        'headline-lg': ['32px', { lineHeight: '48px', letterSpacing: '-0.13px' }],
        'headline-md': ['25px', { lineHeight: '32px', letterSpacing: '-0.06px' }],
      },
      borderRadius: {
        none: '0px',
        sm: '4px',
        md: '8px',
        lg: '16px',
        xl: '24px',
        full: '9999px',
      },
      colors: {
        // Salesforce design tokens
        primary: '#0176d3',
        secondary: '#0b5cab',
        tertiary: '#121212',
        neutral: {
          0: '#ffffff',
          700: '#374151',
          800: '#1f2a44',
          900: '#121212',
        },
        surface: {
          DEFAULT: '#FFFFFF',
          default: '#FFFFFF',
          inverse: '#121212',
          brand: '#75c6ff',
          band: '#0a2a7a',
          card: '#121212',
        },
        'on-surface': {
          default: '#121212',
          inverse: '#ffffff',
          brand: '#0a2a7a',
        },
        // Existing tokens aligned with Salesforce system
        page: '#F4F5F7',
        line: '#DCDFE4',
        'line-strong': '#C3C8D0',
        ink: { DEFAULT: '#121212', muted: '#374151', faint: '#8A929C' },
        brand: { DEFAULT: '#0176d3', hover: '#0b5cab', soft: '#E8F4FC', ring: '#75c6ff' },
        ok: { DEFAULT: '#1E7A46', soft: '#E6F4EC' },
        warn: { DEFAULT: '#9A5B00', soft: '#FDF3E1' },
        bad: { DEFAULT: '#ba0517', soft: '#FDF0F1' },
      },
      boxShadow: {
        panel: 'none',
        overlay: '0 8px 24px rgba(31, 35, 40, 0.16)',
      },
    },
  },
  plugins: [],
};
