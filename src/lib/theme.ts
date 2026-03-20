/**
 * Sentinal Worker — Shared Design Tokens
 * Aligned with the desktop app's refreshed design system.
 * Single source of truth for colors, radii, and status indicators.
 */

export const colors = {
  background: "#060e1a",
  foreground: "#e8edf5",
  surface: "#0a1322",
  surfaceSubtle: "#0e182a",
  surfaceElevated: "#16233a",
  panel: "#070e1c",

  primary: "#5b8cff",
  primaryStrong: "#7ca3ff",
  primaryForeground: "#f7fbff",
  primaryGlow: "rgba(91,140,255,0.15)",

  success: "#34d399",
  successSurface: "rgba(52,211,153,0.08)",
  successBorder: "rgba(52,211,153,0.2)",

  warning: "#f5b84d",
  warningSurface: "rgba(245,184,77,0.08)",
  warningBorder: "rgba(245,184,77,0.2)",

  info: "#60a5fa",
  infoSurface: "rgba(96,165,250,0.08)",
  infoBorder: "rgba(96,165,250,0.2)",

  danger: "#f87171",
  dangerSurface: "rgba(248,113,113,0.08)",
  dangerBorder: "rgba(248,113,113,0.2)",

  border: "#1a2438",
  borderStrong: "#243046",
  mutedForeground: "#7d94b4",
  ring: "rgba(91,140,255,0.55)",
} as const;

export const radii = {
  interactive: 12,
  container: 16,
  pill: 999,
} as const;

export type TaskStatus =
  | "queued"
  | "running"
  | "waiting_for_approval"
  | "completed"
  | "failed"
  | "rejected";

export const STATUS_COLOR: Record<TaskStatus, string> = {
  queued: colors.warning,
  running: colors.info,
  waiting_for_approval: "#fb923c",
  completed: colors.success,
  failed: colors.danger,
  rejected: colors.mutedForeground,
};
