/** @type {import('tailwindcss').Config} */
const colors = require("./src/lib/theme.colors");

module.exports = {
  content: ["./app/**/*.{js,ts,jsx,tsx}", "./src/**/*.{js,ts,jsx,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        background: colors.background,
        foreground: colors.foreground,
        surface: colors.surface,
        "surface-subtle": colors.surfaceSubtle,
        "surface-elevated": colors.surfaceElevated,
        panel: colors.panel,
        primary: colors.primary,
        "primary-strong": colors.primaryStrong,
        "primary-foreground": colors.primaryForeground,
        success: colors.success,
        warning: colors.warning,
        info: colors.info,
        danger: colors.danger,
        border: colors.border,
        "border-strong": colors.borderStrong,
        "muted-foreground": colors.mutedForeground,
      },
    },
  },
  plugins: [],
};
