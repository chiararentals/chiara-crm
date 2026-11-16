/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        navy: '#1F2328',            // glavni tekst
        ink: { DEFAULT: '#262A31', dark: '#14171B' }, // primarni gumbi, aktivni izbornik
        wine: { DEFAULT: '#B42318', dark: '#912018' }, // upozorenja / brisanje
        gold: '#E9C46A',
        mist: '#F4F3F0',            // pozadina stranice
        mute: '#9A9A94',
        soft: '#5C6066',
      },
      fontFamily: {
        serif: ['Inter', 'system-ui', 'sans-serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(20,23,27,.04), 0 2px 8px rgba(20,23,27,.04)',
      },
    },
  },
  plugins: [],
};
