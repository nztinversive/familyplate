/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        background: "#fbfaf7",
        foreground: "#171d1a",
        card: "#ffffff",
        border: "#e7e0d6",
        muted: "#f3efe8",
        "muted-foreground": "#6f756f",
        primary: {
          DEFAULT: "#248f58",
          foreground: "#ffffff",
        },
        accent: {
          DEFAULT: "#c66a1c",
          foreground: "#ffffff",
        },
        destructive: "#dc2626",
      },
      fontFamily: {
        display: ["DMSerifDisplay_400Regular"],
        body: ["DMSans_400Regular"],
      },
    },
  },
  plugins: [],
};
