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
        "border-strong": "var(--border-strong)",
        input: "var(--input)",
        ring: "var(--ring)",
        success: "var(--success)",
        warning: "var(--warning)",
        danger: "var(--danger)",
        info: "var(--info)",
        violet: "var(--violet)",
        "fg-dim": "var(--fg-dim)",
        "fg-faint": "var(--fg-faint)",
        "bg-hover": "var(--bg-hover)",
      },
      borderRadius: {
        lg: "var(--radius-lg)",
        md: "var(--radius)",
        sm: "calc(var(--radius) - 2px)",
      },
      fontFamily: {
        display: ["Geist", "ui-sans-serif", "system-ui", "sans-serif"],
        body:    ["Geist", "ui-sans-serif", "system-ui", "sans-serif"],
        sans:    ["Geist", "ui-sans-serif", "system-ui", "sans-serif"],
        mono:    ["Geist Mono", "ui-monospace", "JetBrains Mono", "Menlo", "monospace"],
      },
      fontSize: {
        "2xs": ["10px",   { lineHeight: "1.5", letterSpacing: "0.18em" }],
        xs:    ["11px",   { lineHeight: "1.5" }],
        sm:    ["12.5px", { lineHeight: "1.5" }],
        base:  ["13.5px", { lineHeight: "1.55" }],
        lg:    ["17px",   { lineHeight: "1.4" }],
        xl:    ["22px",   { lineHeight: "1.3",  letterSpacing: "-0.01em" }],
        "2xl": ["28px",   { lineHeight: "1.05", letterSpacing: "-0.02em" }],
        "3xl": ["36px",   { lineHeight: "1.02", letterSpacing: "-0.025em" }],
      },
      letterSpacing: {
        widest: "0.22em",
      },
      animation: {
        "console-rise": "console-rise 540ms cubic-bezier(.2,.7,.2,1) both",
        "console-pulse": "console-pulse 1.8s ease-out infinite",
        "mascot-dance": "mascot-dance 5.4s cubic-bezier(.5,.1,.3,1) infinite",
        "mascot-blink": "mascot-blink 5.4s ease-in-out infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
export default config;
