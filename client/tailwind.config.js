/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0B1A33",
        brand: {
          50: "#EFF6FF",
          100: "#DBEAFE",
          200: "#BFDBFE",
          400: "#60A5FA",
          500: "#3B82F6",
          600: "#2563EB",
          700: "#1D4ED8",
          800: "#1E40AF",
          900: "#172F63",
        },
        gold: {
          50: "#FFFBEB",
          100: "#FEF3C7",
          200: "#FDE68A",
          300: "#FCD34D",
          400: "#FBBF24",
          500: "#F5B301",
          600: "#D99900",
          700: "#B57C00",
          800: "#8A5F00",
          900: "#5C3F00",
        },
        surface: "#FFFFFF",
        canvas: "#F6F8FB",
        line: "#E4EAF2",
        muted: "#64748B",
      },
      fontFamily: {
        display: ['"Plus Jakarta Sans"', "system-ui", "sans-serif"],
        sans: ['"Inter"', "system-ui", "sans-serif"],
        mono: ['"JetBrains Mono"', "ui-monospace", "monospace"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(11,26,51,.04), 0 8px 24px -12px rgba(11,26,51,.12)",
        lift: "0 12px 32px -12px rgba(37,99,235,.35)",
      },
      borderRadius: { xl2: "1rem" },
    },
  },
  plugins: [],
};
