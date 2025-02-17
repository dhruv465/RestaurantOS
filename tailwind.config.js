/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
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
          light: '#f8fafc',
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
  plugins: [],
}
