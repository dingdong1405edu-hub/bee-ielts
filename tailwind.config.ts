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
        /* ===== Bee "Honey" palette — full scales (mechanical swap targets) ===== */
        /* sage = brand green (legacy name) — friendly leaf green */
        sage: {
          50: "#F1F8EC",
          100: "#DDEECF",
          200: "#C0DEA8",
          300: "#9BCB7B",
          400: "#79B658",
          500: "#5FA046",
          600: "#46812F",
          700: "#386825",
          800: "#2E5220",
          900: "#27451E",
          950: "#11240C",
          DEFAULT: "#5FA046",
          deep: "#46812F",
          tint: "#DDEECF",
        },
        /* gold = honey accent (XP / streak / brand highlight) */
        gold: {
          50: "#FFF8E3",
          100: "#FFEEB8",
          200: "#FFE08A",
          300: "#FFD158",
          400: "#FAC22E",
          500: "#F7B500",
          600: "#E0A52B",
          700: "#C98A14",
          800: "#A06E00",
          900: "#805700",
          950: "#4A3200",
          DEFAULT: "#F7B500",
          deep: "#C98A14",
          soft: "#FFE08A",
        },
        mist: { DEFAULT: "#CFE0B8", soft: "#EAF2DF" },
        /* sage band (hero/nav honeycomb) */
        band: { DEFAULT: "var(--band)", deep: "var(--band-deep)" },
        /* indigo (listening / wings) + warm kraft (leaf texture) */
        slate: { DEFAULT: "var(--slate)", soft: "var(--slate-soft)" },
        kraft: { DEFAULT: "var(--kraft)", soft: "var(--kraft-soft)" },
        /* ===== Per-skill accent hues — matched to BeeEnglish (hello.html) cards ===== */
        skill: {
          reading: "#2F9E5E",     /* green       */
          listening: "#3A4ED4",   /* indigo blue */
          writing: "#D75E79",     /* rose pink   */
          speaking: "#DF6F33",    /* orange      */
          shadowing: "#5B3A9E",   /* violet      */
          grammar: "#2E8C88",     /* teal        */
          vocab: "#D6488F",       /* pink        */
          mock: "#4B6BFB",        /* indigo      */
          climber: "#E0A52B",     /* honey       */
        },
        /* Honey aliases kept for back-compat — now resolve to sage/gold tokens */
        /* honey alias = literal gold scale (NOT primary, which is now green) so
           bg-honey / text-honey stay honey-gold as the secondary accent. */
        honey: {
          DEFAULT: "var(--honey)",
          deep: "var(--gold-deep)",
          tint: "var(--gold-soft)",
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
