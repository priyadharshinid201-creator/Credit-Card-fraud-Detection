/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        fraud: '#ef4444',
        legitimate: '#10b981',
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
  ],
}
