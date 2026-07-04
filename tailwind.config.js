/** @type {import('tailwindcss').Config} */
export default {
  content: ['./*.html', './src/**/*.{ts,tsx}'],
  // CRITICAL: disable Tailwind's preflight (CSS reset). The Webflow stylesheet IS the
  // design system and relies on default element styling; a reset would break the 1:1 look.
  // Tailwind utilities are still available for any NEW React components.
  corePlugins: { preflight: false },
  theme: {
    extend: {
      // Mirrored from docs/design-dna.json so Tailwind classes match the brand tokens.
      colors: {
        lime: '#d2ff00',
        'lime-off': '#b2c73a',
        'dark-green': '#282c20',
        black: '#111112',
        cream: '#efefe5',
        white: '#f4f4ed',
        orange: '#ff6b00',
      },
      fontFamily: {
        display: ['Brier', 'Arial', 'sans-serif'],
        sans: ['"Mona Sans Variable"', 'Arial', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
