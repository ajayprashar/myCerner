/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{html,js,svelte,ts}'],
  theme: {
    extend: {
      colors: {
        primary: '#2563eb',  // blue-600
        'primary-dark': '#1d4ed8',  // blue-700
        secondary: '#4b5563',  // gray-600
        'secondary-hover': '#374151',  // gray-700
        accent: '#3b82f6',  // blue-500
      },
    },
  },
  plugins: [],
}

