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
        /* ===== Sage + Gold palette — full scales (mechanical swap targets) ===== */
        /* sage = brand green (mint → forest); replaces emerald/lime */
        sage: {
          50: "#F0F5F2",
          100: "#DDEAE3",
          200: "#BDD4C8",
          300: "#95B9A8",
          400: "#6E9A86",
          500: "#5A7D6F",
          600: "#4A6A5D",
          700: "#3F5C50",
          800: "#344A41",
          900: "#2E3A33",
          950: "#1C241F",
          DEFAULT: "#5A7D6F",
          deep: "#3F5C50",
          tint: "#DDEAE3",
        },
        /* gold = warm accent (cream-gold → bronze); replaces amber/orange/yellow */
        gold: {
          50: "#FBF6EA",
          100: "#F5EAD0",
          200: "#ECD9A9",
          300: "#E0C383",
          400: "#D2AE66",
          500: "#C5A05E",
          600: "#AE8748",
          700: "#8E6C3A",
          800: "#6F5530",
          900: "#5C4729",
          950: "#342716",
          DEFAULT: "#C5A05E",
          deep: "#8E6C3A",
          soft: "#E6D5AE",
        },
        mist: { DEFAULT: "#A8C3B5", soft: "#CADCD2" },
        /* slate-blue (logo wings) + warm kraft (newsprint-leaf texture) */
        slate: { DEFAULT: "var(--slate)", soft: "var(--slate-soft)" },
        kraft: { DEFAULT: "var(--kraft)", soft: "var(--kraft-soft)" },
        /* ===== Per-skill accent hues (sage+gold base, distinct per module) ===== */
        skill: {
          reading: "#4F7A66",     /* sage green   */
          listening: "#5B7E9C",   /* slate blue   */
          writing: "#B6883F",     /* bronze gold  */
          speaking: "#C0714E",    /* terracotta   */
          shadowing: "#8A6E9C",   /* plum         */
          grammar: "#3E8C84",     /* teal         */
          vocab: "#BD6B6B",       /* dusty rose   */
          mock: "#4C5B8A",        /* indigo       */
          climber: "#7A8C46",     /* olive        */
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
