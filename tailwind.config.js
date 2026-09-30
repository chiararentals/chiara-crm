/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        navy: '#011329',
        wine: { DEFAULT: '#68051A', dark: '#430512' },
        gold: '#F8B42B',
        mist: '#F1F2F3',
        mute: '#949CA5',
        soft: '#4F5962',
      },
      fontFamily: {
        serif: ['"Playfair Display"', 'serif'],
        sans: ['Quicksand', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(1,19,41,.04), 0 4px 16px rgba(1,19,41,.06)',
      },
    },
  },
  plugins: [],
};
