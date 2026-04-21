import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        paper: {
          DEFAULT: "var(--paper)",
          raised: "var(--paper-raised)",
          sunken: "var(--paper-sunken)",
          tint: "var(--paper-tint)",
        },
        ink: {
          1: "var(--ink-1)",
          2: "var(--ink-2)",
          3: "var(--ink-3)",
          4: "var(--ink-4)",
          5: "var(--ink-5)",
          6: "var(--ink-6)",
        },
        ds: {
          blue:   "var(--blue-500)",
          green:  "var(--green-500)",
          red:    "var(--red-500)",
          amber:  "var(--amber-500)",
          violet: "var(--violet-500)",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)"],
        mono: ["var(--font-mono)"],
      },
      fontSize: {
        display: ["var(--fs-display)", { lineHeight: "var(--lh-tight)", letterSpacing: "var(--ls-tight)" }],
        h1:      ["var(--fs-h1)",      { lineHeight: "var(--lh-snug)",  letterSpacing: "var(--ls-tight)" }],
        h2:      ["var(--fs-h2)",      { lineHeight: "var(--lh-snug)" }],
        h3:      ["var(--fs-h3)",      { lineHeight: "var(--lh-snug)" }],
        body:    ["var(--fs-body)",    { lineHeight: "var(--lh-reading)" }],
        small:   ["var(--fs-small)",   { lineHeight: "var(--lh-normal)" }],
        micro:   ["var(--fs-micro)",   { lineHeight: "1.4" }],
      },
      borderRadius: {
        r1:   "var(--r-1)",
        r2:   "var(--r-2)",
        r3:   "var(--r-3)",
        r4:   "var(--r-4)",
        r5:   "var(--r-5)",
      },
      boxShadow: {
        s1:   "var(--shadow-1)",
        s2:   "var(--shadow-2)",
        s3:   "var(--shadow-3)",
        lift: "var(--shadow-lift)",
      },
      transitionTimingFunction: {
        "ease-out": "var(--ease-out)",
        "ease-inout": "var(--ease-inout)",
      },
      transitionDuration: {
        quick: "var(--dur-quick)",
        base:  "var(--dur-base)",
        flip:  "var(--dur-flip)",
        slide: "var(--dur-slide)",
      },
    },
  },
  plugins: [],
};
export default config;
