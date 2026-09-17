/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        accent: {
          DEFAULT: '#1F2937',
          dark: '#111827',
          bright: '#374151',
          soft: '#F3F4F6',
        },
        night: {
          DEFAULT: '#F9FAFB',
          deep: '#FFFFFF',
          soft: '#FFFFFF',
          raise: '#F3F4F6',
          line: '#E5E7EB',
          lineSoft: '#F3F4F6',
        },
        bone: {
          DEFAULT: '#111827',
          soft: '#1F2937',
          muted: '#4B5563',
          faint: '#6B7280',
        },
        paper: {
          DEFAULT: '#FFFFFF',
          deep: '#F9FAFB',
        },
        surface: {
          DEFAULT: '#FFFFFF',
          deep: '#F3F4F6',
        },
        ink: {
          DEFAULT: '#111827',
          soft: '#1F2937',
          muted: '#4B5563',
          faint: '#6B7280',
        },
        line: {
          DEFAULT: '#D1D5DB',
          soft: '#E5E7EB',
        },
        success: {
          DEFAULT: '#15803D',
          soft: '#F0FDF4',
        },
        warning: {
          DEFAULT: '#D97706',
          soft: '#FFFBEB',
        },
        error: {
          DEFAULT: '#DC2626',
          soft: '#FEF2F2',
        },
      },
      fontFamily: {
        sans: ['Inter', '"Segoe UI"', 'Arial', 'system-ui', 'sans-serif'],
        display: ['Inter', '"Segoe UI"', 'Arial', 'system-ui', 'sans-serif'],
        mono: ['Inter', '"Segoe UI"', 'Arial', 'ui-monospace', 'monospace'],
      },
      letterSpacing: {
        tightest: '-0.03em',
      },
      borderRadius: {
        xl2: '1.25rem',
      },
      boxShadow: {
        card: '0 1px 2px rgba(16,24,40,0.04), 0 1px 3px rgba(16,24,40,0.06)',
        soft: '0 8px 24px -8px rgba(16,24,40,0.10)',
        drawer: '-16px 0 40px -12px rgba(16,24,40,0.25)',
      },
    },
  },
  plugins: [],
};