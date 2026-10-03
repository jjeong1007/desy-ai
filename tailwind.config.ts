import type { Config } from "tailwindcss";

const v = (name: string) => `rgb(var(--${name}) / <alpha-value>)`;

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    container: { center: true, padding: "1.25rem", screens: { "2xl": "1200px" } },
    extend: {
      fontFamily: {
        sans: ["var(--font-geist-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["var(--font-geist-mono)", "ui-monospace", "monospace"],
      },
      colors: {
        canvas: v("canvas"),
        surface: v("surface"),
        "surface-2": v("surface-2"),
        well: v("well"),
        line: v("line"),
        "line-strong": v("line-strong"),
        ink: v("ink"),
        "ink-2": v("ink-2"),
        muted: v("muted"),
        accent: { DEFAULT: v("accent"), strong: v("accent-strong"), tint: v("accent-tint"), fg: v("accent-fg") },
        strong: { DEFAULT: v("strong"), tint: v("strong-tint") },
        promising: { DEFAULT: v("promising"), tint: v("promising-tint") },
        weak: { DEFAULT: v("weak"), tint: v("weak-tint") },
        lowconf: { DEFAULT: v("lowconf"), tint: v("lowconf-tint") },
        capped: { DEFAULT: v("capped"), tint: v("capped-tint") },
      },
      borderRadius: { sm: "2px", DEFAULT: "4px", md: "6px", lg: "8px" },
      boxShadow: {
        float: "none",
        pop: "none",
        ring: "none",
      },
      fontSize: { "2xs": ["11px", "14px"] },
      keyframes: {
        "fade-in": { from: { opacity: "0" }, to: { opacity: "1" } },
        "slide-in-right": { from: { transform: "translateX(100%)" }, to: { transform: "translateX(0)" } },
        pulse2: { "0%,100%": { opacity: "1" }, "50%": { opacity: ".45" } },
        flash: { "0%": { backgroundColor: "rgb(var(--accent-tint))" }, "100%": { backgroundColor: "transparent" } },
      },
      animation: {
        "fade-in": "fade-in .15s ease-out",
        "slide-in-right": "slide-in-right .2s ease-out",
        pulse2: "pulse2 1.4s ease-in-out infinite",
        flash: "flash 1.6s ease-out",
      },
    },
  },
  plugins: [],
};
export default config;
