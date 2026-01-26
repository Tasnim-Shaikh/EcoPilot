/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#0B0518",
        foreground: "#F3F4F6",
        card: "#150E25",
        "card-foreground": "#FFFFFF",
        popover: "#150E25",
        "popover-foreground": "#FFFFFF",
        primary: "#00FF94",
        "primary-foreground": "#000000",
        secondary: "#7000FF",
        "secondary-foreground": "#FFFFFF",
        muted: "#2A2438",
        "muted-foreground": "#9CA3AF",
        accent: "#1F1635",
        "accent-foreground": "#00FF94",
        destructive: "#FF3B30",
        "destructive-foreground": "#FFFFFF",
        border: "#2D2445",
        input: "#2D2445",
        ring: "#00FF94",
      },
      fontFamily: {
        heading: ['Manrope', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
      },
      borderRadius: {
        lg: "0.75rem",
        md: "0.5rem",
        sm: "0.25rem",
      },
      boxShadow: {
        'neon': '0 0 15px rgba(0, 255, 148, 0.4)',
        'neon-primary': '0 0 20px rgba(0, 255, 148, 0.3)',
        'neon-secondary': '0 0 20px rgba(112, 0, 255, 0.3)',
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}