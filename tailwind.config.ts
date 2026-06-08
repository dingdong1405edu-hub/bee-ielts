import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "1.25rem",
      screens: { "2xl": "1280px" },
    },
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)", "var(--font-vn)", "system-ui", "-apple-system", "Segoe UI", "sans-serif"],
        display: ["var(--font-display)", "var(--font-vn)", "Georgia", "serif"],
        serif: ["var(--font-display)", "var(--font-vn)", "Georgia", "serif"],
      },
      colors: {
        /* ===== Bee × Duolingo palette — full scales (mechanical swap targets) ===== */
        /* sage = brand green (legacy name) — vibrant grass green */
        sage: {
          50: "#F1FCE3",
          100: "#DDF4C0",
          200: "#C2EA92",
          300: "#9FDD5C",
          400: "#7DD030",
          500: "#58CC02",
          600: "#46A302",
          700: "#3A8500",
          800: "#2F6A06",
          900: "#285708",
          950: "#112E02",
          DEFAULT: "#58CC02",
          deep: "#46A302",
          tint: "#DDF4C0",
        },
        /* gold = honey accent (XP / streak / brand highlight) */
        gold: {
          50: "#FFF9E5",
          100: "#FFF0BF",
          200: "#FFE38A",
          300: "#FFD24D",
          400: "#FFC526",
          500: "#FFC107",
          600: "#E5A100",
          700: "#C98A00",
          800: "#A06E00",
          900: "#805700",
          950: "#4A3200",
          DEFAULT: "#FFC107",
          deep: "#C98A00",
          soft: "#FFE38A",
        },
        mist: { DEFAULT: "#BCE89A", soft: "#E4F5D2" },
        /* sky-blue (listening / wings) + warm kraft (leaf texture) */
        slate: { DEFAULT: "var(--slate)", soft: "var(--slate-soft)" },
        kraft: { DEFAULT: "var(--kraft)", soft: "var(--kraft-soft)" },
        /* ===== Per-skill accent hues — vibrant & distinct per module ===== */
        skill: {
          reading: "#58CC02",     /* grass green */
          listening: "#1CB0F6",   /* sky blue    */
          writing: "#FF9600",     /* orange      */
          speaking: "#FF4B6E",    /* rose        */
          shadowing: "#A560E8",   /* violet      */
          grammar: "#14B8A6",     /* teal        */
          vocab: "#FF5CA8",       /* pink        */
          mock: "#4B6BFB",        /* indigo      */
          climber: "#F0A800",     /* amber       */
        },
        /* Honey aliases kept for back-compat — now resolve to sage/gold tokens */
        honey: {
          DEFAULT: "hsl(var(--primary))",
          deep: "hsl(var(--accent-foreground))",
          tint: "hsl(var(--accent))",
        },
        leaf: {
          DEFAULT: "hsl(var(--success))",
          deep: "var(--accent-deep)",
          tint: "var(--accent-tint)",
        },
        ink: {
          DEFAULT: "var(--ink)",
          soft: "var(--ink-soft)",
          faint: "var(--ink-faint)",
        },
        cream: { DEFAULT: "var(--cream)", soft: "var(--cream-2)" },
        paper: "var(--paper)",
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        success: {
          DEFAULT: "hsl(var(--success))",
          foreground: "hsl(var(--success-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 4px)",
        sm: "calc(var(--radius) - 8px)",
        xl: "calc(var(--radius) + 4px)",
        "2xl": "calc(var(--radius) + 8px)",
      },
      keyframes: {
        "fade-in": { "0%": { opacity: "0" }, "100%": { opacity: "1" } },
        "slide-up": {
          "0%": { transform: "translateY(8px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        shake: {
          "0%, 100%": { transform: "translateX(0)" },
          "25%": { transform: "translateX(-6px)" },
          "75%": { transform: "translateX(6px)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-8px)" },
        },
        blob: {
          "0%, 100%": { transform: "translate(0, 0) scale(1)" },
          "33%": { transform: "translate(30px, -50px) scale(1.1)" },
          "66%": { transform: "translate(-20px, 20px) scale(0.9)" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.3s ease-out",
        "slide-up": "slide-up 0.4s ease-out",
        shake: "shake 0.4s ease-in-out",
        float: "float 4s ease-in-out infinite",
        blob: "blob 12s ease-in-out infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
