// tailwind.config.js
/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        "red-500": "#f87171", // Light red
        "green-500": "#34d399", // Light green
        "blue-500": "#3b82f6", // Light blue
        "yellow-500": "#facc15", // Light yellow
        "bold-red": "#b91c1c", // Bold red
        "bold-blue": "#1d4ed8", // Bold blue
        "bold-green": "#059669", // Bold green
      },
      fontWeight: {
        bold: "bold",
      },
    },
  },
  plugins: [],
};
