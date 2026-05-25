import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        card: {
          DEFAULT: "var(--card)",
          foreground: "var(--card-foreground)",
        },
        popover: {
          DEFAULT: "var(--popover)",
          foreground: "var(--popover-foreground)",
        },
        primary: {
          DEFAULT: "var(--primary)",
          foreground: "var(--primary-foreground)",
        },
        secondary: {
          DEFAULT: "var(--secondary)",
          foreground: "var(--secondary-foreground)",
        },
        muted: {
          DEFAULT: "var(--muted)",
          foreground: "var(--muted-foreground)",
        },
        accent: {
          DEFAULT: "var(--accent)",
          foreground: "var(--accent-foreground)",
        },
        destructive: {
          DEFAULT: "var(--destructive)",
          foreground: "var(--destructive-foreground)",
        },
        border: "var(--border)",
        input: "var(--input)",
        ring: "var(--ring)",
        success: "var(--success)",
        warning: "var(--warning)",
        danger: "var(--danger)",
      },
      borderRadius: {
        lg: "var(--radius-lg)",
        md: "var(--radius)",
        sm: "var(--radius)",
      },
      fontFamily: {
        display: ["Fraunces", "Newsreader", "Times New Roman", "serif"],
        body:    ["Newsreader", "Iowan Old Style", "Georgia", "serif"],
        sans:    ["Newsreader", "Iowan Old Style", "Georgia", "serif"],
        serif:   ["Newsreader", "Iowan Old Style", "Georgia", "serif"],
        mono:    ["JetBrains Mono", "ui-monospace", "SF Mono", "Menlo", "monospace"],
      },
      fontSize: {
        "2xs": ["10.5px", { lineHeight: "1.4", letterSpacing: "0.18em" }],
        xs:    ["12px",   { lineHeight: "1.5" }],
        sm:    ["13.5px", { lineHeight: "1.5" }],
        base:  ["15px",   { lineHeight: "1.55" }],
        lg:    ["18px",   { lineHeight: "1.4" }],
        xl:    ["22px",   { lineHeight: "1.3" }],
        "2xl": ["32px",   { lineHeight: "1.15", letterSpacing: "-0.01em" }],
        "3xl": ["44px",   { lineHeight: "1.05", letterSpacing: "-0.015em" }],
        "4xl": ["64px",   { lineHeight: "1.02", letterSpacing: "-0.02em" }],
      },
      letterSpacing: {
        widest: "0.22em",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
export default config;
