/**
 * Gradient creation utilities for Skia
 * Linear, radial, and sweep gradients with color stops
 */

import type { CanvasKit, Shader } from "canvaskit-wasm"
import { createColor, type ColorTuple } from "../utils/colors"

// Create a linear gradient
export function createLinearGradient(
  ck: CanvasKit,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  colors: ColorTuple[],
  positions?: number[] | null,
  tileMode: "clamp" | "repeat" | "mirror" | "decal" = "clamp"
): Shader {
  const colorFloats = colors.map((c) => createColor(ck, c))
  const tileModeMap = {
    clamp: ck.TileMode.Clamp,
    repeat: ck.TileMode.Repeat,
    mirror: ck.TileMode.Mirror,
    decal: ck.TileMode.Decal
  }

  return ck.Shader.MakeLinearGradient(
    [x0, y0],
    [x1, y1],
    colorFloats,
    positions || null,
    tileModeMap[tileMode]
  )
}

// Create a radial gradient
export function createRadialGradient(
  ck: CanvasKit,
  cx: number,
  cy: number,
  radius: number,
  colors: ColorTuple[],
  positions?: number[] | null,
  tileMode: "clamp" | "repeat" | "mirror" | "decal" = "clamp"
): Shader {
  const colorFloats = colors.map((c) => createColor(ck, c))
  const tileModeMap = {
    clamp: ck.TileMode.Clamp,
    repeat: ck.TileMode.Repeat,
    mirror: ck.TileMode.Mirror,
    decal: ck.TileMode.Decal
  }

  return ck.Shader.MakeRadialGradient(
    [cx, cy],
    radius,
    colorFloats,
    positions || null,
    tileModeMap[tileMode]
  )
}

// Create a two-point radial gradient (conical gradient)
export function createTwoPointRadialGradient(
  ck: CanvasKit,
  x0: number,
  y0: number,
  r0: number,
  x1: number,
  y1: number,
  r1: number,
  colors: ColorTuple[],
  positions?: number[] | null,
  tileMode: "clamp" | "repeat" | "mirror" | "decal" = "clamp"
): Shader {
  const colorFloats = colors.map((c) => createColor(ck, c))
  const tileModeMap = {
    clamp: ck.TileMode.Clamp,
    repeat: ck.TileMode.Repeat,
    mirror: ck.TileMode.Mirror,
    decal: ck.TileMode.Decal
  }

  return ck.Shader.MakeTwoPointConicalGradient(
    [x0, y0],
    r0,
    [x1, y1],
    r1,
    colorFloats,
    positions || null,
    tileModeMap[tileMode]
  )
}

// Create a sweep gradient (angular gradient)
export function createSweepGradient(
  ck: CanvasKit,
  cx: number,
  cy: number,
  colors: ColorTuple[],
  positions?: number[] | null,
  startAngle: number = 0,
  endAngle: number = 360,
  tileMode: "clamp" | "repeat" | "mirror" | "decal" = "clamp"
): Shader {
  const colorFloats = colors.map((c) => createColor(ck, c))
  const tileModeMap = {
    clamp: ck.TileMode.Clamp,
    repeat: ck.TileMode.Repeat,
    mirror: ck.TileMode.Mirror,
    decal: ck.TileMode.Decal
  }

  return ck.Shader.MakeSweepGradient(
    cx,
    cy,
    colorFloats,
    positions || null,
    tileModeMap[tileMode],
    null,
    0,
    startAngle,
    endAngle
  )
}

// Preset gradient: vertical (top to bottom)
export function createVerticalGradient(
  ck: CanvasKit,
  y0: number,
  y1: number,
  colors: ColorTuple[],
  positions?: number[] | null
): Shader {
  return createLinearGradient(ck, 0, y0, 0, y1, colors, positions)
}

// Preset gradient: horizontal (left to right)
export function createHorizontalGradient(
  ck: CanvasKit,
  x0: number,
  x1: number,
  colors: ColorTuple[],
  positions?: number[] | null
): Shader {
  return createLinearGradient(ck, x0, 0, x1, 0, colors, positions)
}

// Preset gradient: diagonal (top-left to bottom-right)
export function createDiagonalGradient(
  ck: CanvasKit,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  colors: ColorTuple[],
  positions?: number[] | null
): Shader {
  return createLinearGradient(ck, x0, y0, x1, y1, colors, positions)
}

// Create a gradient from a color to transparent
export function createFadeGradient(
  ck: CanvasKit,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  color: ColorTuple,
  direction: "in" | "out" = "out"
): Shader {
  const transparent: ColorTuple = [color[0], color[1], color[2], 0]
  const colors = direction === "out" ? [color, transparent] : [transparent, color]
  return createLinearGradient(ck, x0, y0, x1, y1, colors)
}

// Create a color scale gradient (for heatmaps, etc.)
export function createColorScaleGradient(
  ck: CanvasKit,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  preset: "thermal" | "viridis" | "plasma" | "rainbow" | "grayscale"
): Shader {
  const presets: Record<string, ColorTuple[]> = {
    thermal: [
      [0, 0, 0, 1],           // black
      [0.5, 0, 0.5, 1],       // purple
      [1, 0, 0, 1],           // red
      [1, 0.5, 0, 1],         // orange
      [1, 1, 0, 1],           // yellow
      [1, 1, 1, 1]            // white
    ],
    viridis: [
      [0.267, 0.004, 0.329, 1],
      [0.282, 0.140, 0.458, 1],
      [0.253, 0.265, 0.529, 1],
      [0.206, 0.371, 0.553, 1],
      [0.163, 0.471, 0.558, 1],
      [0.127, 0.566, 0.551, 1],
      [0.134, 0.658, 0.518, 1],
      [0.266, 0.749, 0.441, 1],
      [0.477, 0.821, 0.318, 1],
      [0.741, 0.873, 0.150, 1],
      [0.993, 0.906, 0.144, 1]
    ],
    plasma: [
      [0.050, 0.030, 0.528, 1],
      [0.294, 0.012, 0.615, 1],
      [0.491, 0.012, 0.658, 1],
      [0.658, 0.139, 0.635, 1],
      [0.797, 0.280, 0.469, 1],
      [0.899, 0.424, 0.297, 1],
      [0.965, 0.580, 0.102, 1],
      [0.988, 0.752, 0.164, 1],
      [0.940, 0.975, 0.131, 1]
    ],
    rainbow: [
      [1, 0, 0, 1],           // red
      [1, 0.5, 0, 1],         // orange
      [1, 1, 0, 1],           // yellow
      [0, 1, 0, 1],           // green
      [0, 1, 1, 1],           // cyan
      [0, 0, 1, 1],           // blue
      [0.5, 0, 1, 1]          // purple
    ],
    grayscale: [
      [0, 0, 0, 1],
      [1, 1, 1, 1]
    ]
  }

  return createLinearGradient(ck, x0, y0, x1, y1, presets[preset])
}

// Create a gradient with automatic evenly-spaced positions
export function createEvenGradient(
  ck: CanvasKit,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  colors: ColorTuple[]
): Shader {
  const positions = colors.map((_, i) => i / (colors.length - 1))
  return createLinearGradient(ck, x0, y0, x1, y1, colors, positions)
}

// Gradient builder for complex gradients
export interface GradientStop {
  color: ColorTuple
  position: number
}

export class GradientBuilder {
  private stops: GradientStop[] = []

  addStop(color: ColorTuple, position: number): GradientBuilder {
    this.stops.push({ color, position })
    return this
  }

  addStops(...stops: GradientStop[]): GradientBuilder {
    this.stops.push(...stops)
    return this
  }

  buildLinear(
    ck: CanvasKit,
    x0: number,
    y0: number,
    x1: number,
    y1: number
  ): Shader {
    // Sort by position
    const sorted = [...this.stops].sort((a, b) => a.position - b.position)
    const colors = sorted.map((s) => s.color)
    const positions = sorted.map((s) => s.position)
    return createLinearGradient(ck, x0, y0, x1, y1, colors, positions)
  }

  buildRadial(
    ck: CanvasKit,
    cx: number,
    cy: number,
    radius: number
  ): Shader {
    const sorted = [...this.stops].sort((a, b) => a.position - b.position)
    const colors = sorted.map((s) => s.color)
    const positions = sorted.map((s) => s.position)
    return createRadialGradient(ck, cx, cy, radius, colors, positions)
  }

  buildSweep(
    ck: CanvasKit,
    cx: number,
    cy: number,
    startAngle: number = 0,
    endAngle: number = 360
  ): Shader {
    const sorted = [...this.stops].sort((a, b) => a.position - b.position)
    const colors = sorted.map((s) => s.color)
    const positions = sorted.map((s) => s.position)
    return createSweepGradient(ck, cx, cy, colors, positions, startAngle, endAngle)
  }

  clear(): GradientBuilder {
    this.stops = []
    return this
  }
}

// Create a new gradient builder
export function gradientBuilder(): GradientBuilder {
  return new GradientBuilder()
}
