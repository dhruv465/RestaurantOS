/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'media', // Change to 'media' to support system theme
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      // Add any custom theme settings here
    },
    screens: {
      'sm': '640px',
      'md': '768px',
      'lg': '1024px',
      'xl': '1280px',
      '2xl': '1536px',
    },
    extend: {
      colors: {
        primary: {
          light: '#e0e0e0',
          dark: '#1a1a1a',
        },
        secondary: {
          light: '#ffffff',
          dark: '#1f1f1f',
        },
        text: {
          light: '#1a1a1a',
          dark: '#f3f4f6',
        },
        accent: {
          light: '#3b82f6',
          dark: '#60a5fa',
        },
      },
    },
  },
  plugins: [
    require('tailwind-scrollbar-hide')
  ],
}
