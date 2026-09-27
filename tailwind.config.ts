import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/**/*.{js,ts,jsx,tsx}',
    './app/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f5f3ff', 100: '#ede9fe', 200: '#ddd6fe', 300: '#c4b5fd', 400: '#a78bfa',
          500: '#8b5cf6', 600: '#7c3aed', 700: '#6d28d9', 800: '#5b21b6', 900: '#4c1d95',
        },
        accent: {
          50: '#fdf2f8', 100: '#fce7f3', 200: '#fbcfe8', 300: '#f8b4d8', 400: '#f472b6',
          500: '#ec4899', 600: '#db2777', 700: '#be185d', 800: '#9d174d', 900: '#831843',
        },
        cyan: {
          50: '#ecf9ff', 100: '#cff9fe', 200: '#a5f3fc', 300: '#67e8f9', 400: '#22d3ee',
          500: '#06b6d4', 600: '#0891b2', 700: '#0e7490', 800: '#155e75', 900: '#164e63',
        },
        success: {
          50: '#f0fdf4', 100: '#dcfce7', 200: '#bbf7d0', 300: '#86efac', 400: '#4ade80',
          500: '#22c55e', 600: '#16a34a', 700: '#15803d', 800: '#166534', 900: '#145231',
        },
        warning: {
          50: '#fffbeb', 100: '#fef3c7', 200: '#fde68a', 300: '#fcd34d', 400: '#fbbf24',
          500: '#f59e0b', 600: '#d97706', 700: '#b45309', 800: '#92400e', 900: '#78350f',
        },
        error: {
          50: '#fef2f2', 100: '#fee2e2', 200: '#fecaca', 300: '#fca5a5', 400: '#f87171',
          500: '#ef4444', 600: '#dc2626', 700: '#b91c1c', 800: '#991b1b', 900: '#7f1d1d',
        },
        neutral: {
          0: '#ffffff', 50: '#fafafa', 100: '#f5f5f5', 150: '#f0f0f0', 200: '#e5e5e5',
          300: '#d4d4d4', 400: '#a3a3a3', 500: '#737373', 600: '#525252', 700: '#404040',
          800: '#262626', 900: '#171717',
        },
      },
      spacing: {
        0: '0px', 1: '4px', 2: '8px', 3: '12px', 4: '16px', 5: '20px', 6: '24px',
        7: '28px', 8: '32px', 9: '36px', 10: '40px', 12: '48px', 14: '56px',
        16: '64px', 20: '80px', 24: '96px',
      },
      borderRadius: {
        none: '0px', sm: '4px', md: '6px', lg: '8px', xl: '12px', '2xl': '16px',
        '3xl': '20px', full: '9999px',
      },
      fontSize: {
        xs: ['12px', { lineHeight: '16px', fontWeight: '400' }],
        sm: ['14px', { lineHeight: '20px', fontWeight: '400' }],
        base: ['16px', { lineHeight: '24px', fontWeight: '400' }],
        lg: ['18px', { lineHeight: '28px', fontWeight: '500' }],
        xl: ['20px', { lineHeight: '28px', fontWeight: '600' }],
        '2xl': ['24px', { lineHeight: '32px', fontWeight: '600' }],
        '3xl': ['30px', { lineHeight: '36px', fontWeight: '700' }],
        '4xl': ['36px', { lineHeight: '44px', fontWeight: '700' }],
      },
      fontFamily: { sans: ['system-ui', 'sans-serif'], mono: ['Menlo', 'Monaco', 'monospace'] },
      boxShadow: {
        none: 'none',
        xs: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        sm: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
        md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
        xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
      },
      transition: {
        fast: 'all 150ms ease-in-out',
        base: 'all 200ms ease-in-out',
        slow: 'all 300ms ease-in-out',
      },
    },
  },
  plugins: [],
};

export default config;
