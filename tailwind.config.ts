import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        canvas: "#F7F6F3",
        ink: "#1C1917",
        accent: {
          50: "#F0F5F2",
          100: "#DDE8E1",
          200: "#BCD2C5",
          500: "#5E8470",
          600: "#47695A",
          700: "#36513F",
        },
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "Roboto", "Helvetica Neue", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "Consolas", "monospace"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(28,25,23,0.04), 0 6px 20px -8px rgba(28,25,23,0.08)",
        float: "0 10px 30px -10px rgba(28,25,23,0.35)",
      },
      keyframes: {
        "fade-up": { from: { opacity: "0", transform: "translateY(6px)" }, to: { opacity: "1", transform: "none" } },
        scan: { "0%": { transform: "translateY(-120%)" }, "100%": { transform: "translateY(520%)" } },
        shimmer: { "0%": { backgroundPosition: "-200% 0" }, "100%": { backgroundPosition: "200% 0" } },
      },
      animation: {
        "fade-up": "fade-up .35s ease-out both",
        scan: "scan 1.8s ease-in-out infinite",
        shimmer: "shimmer 1.6s linear infinite",
      },
    },
  },
  plugins: [],
};

export default config;
