/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Base colors
        'base-blue': '#2574ff',
        'base-blue-dark': '#1e5dcc',
        'base-blue-light': '#3a8aff',
        
        // Dark theme colors
        'dark-bg': '#0D0D0D',
        'dark-card': '#161616',
        'dark-surface': '#1e1e1e',
        'dark-text': '#f3f3f3',
        'dark-secondary': '#aaaaaa',
        'dark-border': '#2a2a2a',
        
        // Light theme colors
        'light-bg': '#f5f2e8', // Creamy background
        'light-card': '#fffefc', // Light creamy card
        'light-surface': '#f0ece0', // Beige surface
        'light-text': '#333333', // Dark text for contrast
        'light-secondary': '#666666', // Secondary text
        'light-border': '#d8d0c0', // Beige border
        
        // Legacy Mictlai colors - keeping for compatibility
        'mictlai-gold': '#FFD700',
        'mictlai-turquoise': '#40E0D0',
        'mictlai-blood': '#8B0000',
        'mictlai-bone': '#F5F5DC',
        'mictlai-obsidian': '#0D0D0D',
      },
      boxShadow: {
        'pixel': '4px 4px 0px 0px rgba(0, 0, 0, 0.2)',
        'pixel-lg': '6px 6px 0px 0px rgba(0, 0, 0, 0.2)',
        'pixel-inner': 'inset 4px 4px 0px 0px rgba(0, 0, 0, 0.2)',
      },
      fontFamily: {
        'pixel': ['"Press Start 2P"', 'monospace'],
        'aztec': ['"Press Start 2P"', 'monospace'],
      },
      animation: {
        'pulse': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      borderWidth: {
        '1': '1px',
        '3': '3px',
      },
    },
  },
  plugins: [],
}
