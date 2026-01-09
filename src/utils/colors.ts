import type { CanvasKit } from "canvaskit-wasm"

// Chart color palette - works well in both light and dark modes
export const CHART_COLORS = {
  primary: [0.2, 0.6, 1.0, 1.0] as const, // Blue
  secondary: [0.6, 0.2, 1.0, 1.0] as const, // Purple
  success: [0.2, 0.8, 0.4, 1.0] as const, // Green
  warning: [1.0, 0.7, 0.2, 1.0] as const, // Orange
  error: [1.0, 0.3, 0.3, 1.0] as const, // Red
  info: [0.2, 0.8, 0.9, 1.0] as const, // Cyan
  neutral: [0.5, 0.5, 0.5, 1.0] as const // Gray
}

// Multi-series color palette
export const SERIES_COLORS: ReadonlyArray<readonly [number, number, number, number]> = [
  [0.2, 0.6, 1.0, 1.0], // Blue
  [0.2, 0.8, 0.4, 1.0], // Green
  [1.0, 0.7, 0.2, 1.0], // Orange
  [0.6, 0.2, 1.0, 1.0], // Purple
  [1.0, 0.3, 0.3, 1.0], // Red
  [0.2, 0.8, 0.9, 1.0], // Cyan
  [1.0, 0.5, 0.7, 1.0], // Pink
  [0.5, 0.8, 0.2, 1.0] // Lime
]

export type ColorTuple = readonly [number, number, number, number]

export function getSeriesColor(index: number): ColorTuple {
  return SERIES_COLORS[index % SERIES_COLORS.length]
}

export function createColor(
  ck: CanvasKit,
  color: ColorTuple
): Float32Array {
  return ck.Color4f(color[0], color[1], color[2], color[3])
}

export function withAlpha(color: ColorTuple, alpha: number): ColorTuple {
  return [color[0], color[1], color[2], alpha]
}

// Theme-aware colors
export interface ThemeColors {
  background: ColorTuple
  surface: ColorTuple
  text: ColorTuple
  textMuted: ColorTuple
  border: ColorTuple
  grid: ColorTuple
}

export const LIGHT_THEME: ThemeColors = {
  background: [1.0, 1.0, 1.0, 1.0],
  surface: [0.98, 0.98, 0.98, 1.0],
  text: [0.1, 0.1, 0.1, 1.0],
  textMuted: [0.5, 0.5, 0.5, 1.0],
  border: [0.9, 0.9, 0.9, 1.0],
  grid: [0.92, 0.92, 0.92, 1.0]
}

export const DARK_THEME: ThemeColors = {
  background: [0.09, 0.09, 0.11, 1.0],
  surface: [0.12, 0.12, 0.14, 1.0],
  text: [0.95, 0.95, 0.95, 1.0],
  textMuted: [0.6, 0.6, 0.6, 1.0],
  border: [0.2, 0.2, 0.22, 1.0],
  grid: [0.18, 0.18, 0.2, 1.0]
}

export function getThemeColors(isDark: boolean): ThemeColors {
  return isDark ? DARK_THEME : LIGHT_THEME
}

// Detect dark mode from document
export function detectDarkMode(): boolean {
  if (typeof window === "undefined") return false
  return document.documentElement.classList.contains("dark")
}
