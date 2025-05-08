/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // MictlAI Aztec-inspired colors with pixel art palette
        mictlai: {
          obsidian: '#0D0D0D',
          blood: '#8B0000',
          bone: '#F5F5DC',
          turquoise: '#40E0D0',
          gold: '#FFD700',
        },
        // Keep the existing color scheme for backward compatibility
        skull: {
          black: '#111827',
          gold: '#D97706',
          teal: '#22D3EE',
          red: '#DC2626',
          jade: '#059669',
          amber: {
            DEFAULT: '#D97706',
            50: '#FFFBEB',
            100: '#FEF3C7',
            200: '#FDE68A',
            300: '#FCD34D',
            400: '#FBBF24',
            500: '#F59E0B',
            600: '#D97706',
            700: '#B45309',
            800: '#92400E',
            900: '#78350F',
          },
        },
      },
      fontFamily: {
        'aztec': ['Minecraft', 'Cinzel', 'serif'],
        'body': ['Minecraft', 'Inter', 'system-ui', 'sans-serif'],
        'pixel': ['Minecraft', 'monospace'],
      },
      borderWidth: {
        '1': '1px',
        '3': '3px',
        '5': '5px',
      },
      boxShadow: {
        'pixel': '3px 3px 0 rgba(0, 0, 0, 0.3)',
        'pixel-lg': '5px 5px 0 rgba(0, 0, 0, 0.3)',
        'pixel-inner': 'inset 3px 3px 0 rgba(0, 0, 0, 0.3)',
        'pixel-gold': '3px 3px 0 rgba(255, 215, 0, 0.3)',
      },
    },
  },
  plugins: [],
};
