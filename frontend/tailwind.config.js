/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      spacing: {
        4.5: '1.125rem',
        13: '3.25rem',
        15: '3.75rem',
        18: '4.5rem',
      },
      colors: {
        brand: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
        },
        dashboard: {
          bg: '#0f172a',
          sidebar: '#111827',
          card: '#1e293b',
          'card-secondary': '#243041',
          input: '#0f172a',
          hover: '#273449',
        },
      },
      boxShadow: {
        soft: '0 1px 2px 0 rgb(0 0 0 / 0.04), 0 4px 12px -2px rgb(0 0 0 / 0.06)',
        card: '0 2px 8px -2px rgb(0 0 0 / 0.08), 0 8px 24px -4px rgb(37 99 235 / 0.06)',
        glow: '0 0 20px -4px rgb(59 130 246 / 0.28)',
        'dark-soft': '0 1px 2px 0 rgb(0 0 0 / 0.2), 0 4px 16px -4px rgb(0 0 0 / 0.35)',
        'dark-card': '0 2px 12px -2px rgb(0 0 0 / 0.35), 0 0 0 1px rgb(148 163 184 / 0.06)',
      },
      backgroundImage: {
        mesh: 'linear-gradient(135deg, #eff6ff 0%, #f0fdfa 50%, #f8fafc 100%)',
        hero: 'linear-gradient(135deg, #2563eb 0%, #3b82f6 40%, #14b8a6 100%)',
        auth: 'linear-gradient(160deg, #1e40af 0%, #2563eb 35%, #0d9488 100%)',
        'stat-brand': 'linear-gradient(145deg, rgba(37,99,235,0.12) 0%, rgba(30,41,59,0) 60%)',
        'stat-teal': 'linear-gradient(145deg, rgba(20,184,166,0.1) 0%, rgba(30,41,59,0) 60%)',
      },
    },
  },
  plugins: [],
};
