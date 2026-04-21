/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#1a9d5c",
          foreground: "#ffffff",
        },
        accent: {
          DEFAULT: "#f5a524",
          foreground: "#ffffff",
        },
      },
      fontFamily: {
        display: ["DMSerifDisplay_400Regular"],
        body: ["DMSans_400Regular"],
      },
    },
  },
  plugins: [],
};
