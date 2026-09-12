/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        surface: "var(--surface)",
        'surface-hover': "var(--surface-hover)",
        'surface-active': "var(--surface-active)",
        ink: "var(--ink)",
        'ink-muted': "var(--ink-muted)",
        'ink-faint': "var(--ink-faint)",
        line: "var(--line)",
        'line-strong': "var(--line-strong)",
        accent: {
          DEFAULT: "var(--accent)",
          hover: "var(--accent-hover)",
          ink: "var(--accent-ink)",
        },
      },
      borderRadius: {
        lg: `var(--radius-lg)`,
        md: `var(--radius)`,
        sm: "calc(var(--radius) - 4px)",
      },
    },
  },
  plugins: [],
}
