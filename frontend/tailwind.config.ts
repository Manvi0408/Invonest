import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        border: "var(--border)",
      },
      /**
       * Tailwind's defaults must be overridden, not just supplemented. Any
       * `font-sans` / `font-mono` utility emits its own font-family and beats
       * the rule on <body> for every descendant — the dashboard shell wears
       * `font-sans`, which was silently rendering 52 elements in the system
       * font regardless of what <body> asked for.
       */
      fontFamily: {
        sans: ["var(--font-body)", "system-ui", "-apple-system", "sans-serif"],
        heading: ["var(--font-heading)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "SFMono-Regular", "monospace"],
      },
    },
  },
  plugins: [],
};
export default config;
