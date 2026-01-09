/**
 * Visual effects for Skia
 * Blur, shadow, glow, and other image filters
 */

import type { CanvasKit, ImageFilter, Paint, MaskFilter } from "canvaskit-wasm"
import { createColor, type ColorTuple } from "../utils/colors"

// Create a blur filter
export function createBlurFilter(
  ck: CanvasKit,
  sigmaX: number,
  sigmaY?: number
): ImageFilter {
  const sy = sigmaY ?? sigmaX
  return ck.ImageFilter.MakeBlur(sigmaX, sy, ck.TileMode.Clamp, null)
}

// Create a drop shadow filter
export function createDropShadow(
  ck: CanvasKit,
  dx: number,
  dy: number,
  sigmaX: number,
  sigmaY: number,
  color: ColorTuple
): ImageFilter {
  return ck.ImageFilter.MakeDropShadow(
    dx,
    dy,
    sigmaX,
    sigmaY,
    createColor(ck, color),
    null
  )
}

// Create a drop shadow that only shows the shadow (no source image)
export function createDropShadowOnly(
  ck: CanvasKit,
  dx: number,
  dy: number,
  sigmaX: number,
  sigmaY: number,
  color: ColorTuple
): ImageFilter {
  return ck.ImageFilter.MakeDropShadowOnly(
    dx,
    dy,
    sigmaX,
    sigmaY,
    createColor(ck, color),
    null
  )
}

// Create an inner shadow effect (simulated with blur and composite)
export function createInnerShadow(
  ck: CanvasKit,
  dx: number,
  dy: number,
  sigma: number,
  color: ColorTuple
): ImageFilter {
  // Inner shadows are more complex - we simulate with offset blur
  const blur = ck.ImageFilter.MakeBlur(sigma, sigma, ck.TileMode.Clamp, null)
  const offset = ck.ImageFilter.MakeOffset(dx, dy, blur)
  return offset
}

// Create a glow effect (radial blur around edges)
export function createGlow(
  ck: CanvasKit,
  radius: number,
  color: ColorTuple
): ImageFilter {
  // Glow is a drop shadow with no offset
  return createDropShadow(ck, 0, 0, radius, radius, color)
}

// Create a color matrix filter for adjusting colors
export function createColorMatrixFilter(
  ck: CanvasKit,
  matrix: number[]
): ImageFilter {
  if (matrix.length !== 20) {
    throw new Error("Color matrix must have exactly 20 values (4x5 matrix)")
  }
  const colorFilter = ck.ColorFilter.MakeMatrix(matrix)
  return ck.ImageFilter.MakeColorFilter(colorFilter, null)
}

// Preset color matrices
export const colorMatrices = {
  // Grayscale
  grayscale: [
    0.299, 0.587, 0.114, 0, 0,
    0.299, 0.587, 0.114, 0, 0,
    0.299, 0.587, 0.114, 0, 0,
    0, 0, 0, 1, 0
  ],

  // Sepia
  sepia: [
    0.393, 0.769, 0.189, 0, 0,
    0.349, 0.686, 0.168, 0, 0,
    0.272, 0.534, 0.131, 0, 0,
    0, 0, 0, 1, 0
  ],

  // Invert colors
  invert: [
    -1, 0, 0, 0, 1,
    0, -1, 0, 0, 1,
    0, 0, -1, 0, 1,
    0, 0, 0, 1, 0
  ],

  // Increase brightness
  brighten: (amount: number = 0.2) => [
    1, 0, 0, 0, amount,
    0, 1, 0, 0, amount,
    0, 0, 1, 0, amount,
    0, 0, 0, 1, 0
  ],

  // Increase contrast
  contrast: (amount: number = 1.5) => {
    const t = (1 - amount) / 2
    return [
      amount, 0, 0, 0, t,
      0, amount, 0, 0, t,
      0, 0, amount, 0, t,
      0, 0, 0, 1, 0
    ]
  },

  // Adjust saturation
  saturate: (amount: number = 1.5) => {
    const s = amount
    const sr = (1 - s) * 0.3086
    const sg = (1 - s) * 0.6094
    const sb = (1 - s) * 0.0820
    return [
      sr + s, sg, sb, 0, 0,
      sr, sg + s, sb, 0, 0,
      sr, sg, sb + s, 0, 0,
      0, 0, 0, 1, 0
    ]
  },

  // Hue rotate (degrees)
  hueRotate: (degrees: number) => {
    const rad = (degrees * Math.PI) / 180
    const cos = Math.cos(rad)
    const sin = Math.sin(rad)
    return [
      0.213 + cos * 0.787 - sin * 0.213,
      0.715 - cos * 0.715 - sin * 0.715,
      0.072 - cos * 0.072 + sin * 0.928, 0, 0,
      0.213 - cos * 0.213 + sin * 0.143,
      0.715 + cos * 0.285 + sin * 0.140,
      0.072 - cos * 0.072 - sin * 0.283, 0, 0,
      0.213 - cos * 0.213 - sin * 0.787,
      0.715 - cos * 0.715 + sin * 0.715,
      0.072 + cos * 0.928 + sin * 0.072, 0, 0,
      0, 0, 0, 1, 0
    ]
  }
}

// Apply blur to a paint (mask filter)
export function applyBlurMask(
  paint: Paint,
  ck: CanvasKit,
  sigma: number,
  style: "normal" | "solid" | "outer" | "inner" = "normal"
): void {
  const blurStyles = {
    normal: ck.BlurStyle.Normal,
    solid: ck.BlurStyle.Solid,
    outer: ck.BlurStyle.Outer,
    inner: ck.BlurStyle.Inner
  }

  const maskFilter = ck.MaskFilter.MakeBlur(blurStyles[style], sigma, true)
  paint.setMaskFilter(maskFilter)
}

// Create a mask filter for blur
export function createBlurMaskFilter(
  ck: CanvasKit,
  sigma: number,
  style: "normal" | "solid" | "outer" | "inner" = "normal"
): MaskFilter {
  const blurStyles = {
    normal: ck.BlurStyle.Normal,
    solid: ck.BlurStyle.Solid,
    outer: ck.BlurStyle.Outer,
    inner: ck.BlurStyle.Inner
  }

  return ck.MaskFilter.MakeBlur(blurStyles[style], sigma, true)
}

// Compose multiple image filters
export function composeFilters(
  ck: CanvasKit,
  outer: ImageFilter,
  inner: ImageFilter
): ImageFilter {
  return ck.ImageFilter.MakeCompose(outer, inner)
}

// Create dilate (expand) filter
export function createDilateFilter(
  ck: CanvasKit,
  radiusX: number,
  radiusY?: number
): ImageFilter {
  return ck.ImageFilter.MakeDilate(radiusX, radiusY ?? radiusX, null)
}

// Create erode (shrink) filter
export function createErodeFilter(
  ck: CanvasKit,
  radiusX: number,
  radiusY?: number
): ImageFilter {
  return ck.ImageFilter.MakeErode(radiusX, radiusY ?? radiusX, null)
}

// Create offset filter
export function createOffsetFilter(
  ck: CanvasKit,
  dx: number,
  dy: number,
  input?: ImageFilter | null
): ImageFilter {
  return ck.ImageFilter.MakeOffset(dx, dy, input ?? null)
}

// Helper to create a simple shadow configuration
export interface ShadowConfig {
  offsetX: number
  offsetY: number
  blur: number
  color: ColorTuple
  spread?: number
}

// Create shadow from config
export function createShadowFromConfig(
  ck: CanvasKit,
  config: ShadowConfig
): ImageFilter {
  const { offsetX, offsetY, blur, color, spread = 0 } = config

  if (spread > 0) {
    // With spread, we need to dilate first then blur
    const dilate = createDilateFilter(ck, spread)
    const shadow = createDropShadowOnly(ck, offsetX, offsetY, blur, blur, color)
    return composeFilters(ck, shadow, dilate)
  }

  return createDropShadow(ck, offsetX, offsetY, blur, blur, color)
}

// Multiple shadows
export function createMultipleShadows(
  ck: CanvasKit,
  shadows: ShadowConfig[]
): ImageFilter | null {
  if (shadows.length === 0) return null

  let result = createShadowFromConfig(ck, shadows[0])

  for (let i = 1; i < shadows.length; i++) {
    const next = createShadowFromConfig(ck, shadows[i])
    result = composeFilters(ck, next, result)
  }

  return result
}

// Preset shadow styles
export const shadowPresets = {
  sm: { offsetX: 0, offsetY: 1, blur: 2, color: [0, 0, 0, 0.05] as ColorTuple },
  md: { offsetX: 0, offsetY: 4, blur: 6, color: [0, 0, 0, 0.1] as ColorTuple },
  lg: { offsetX: 0, offsetY: 10, blur: 15, color: [0, 0, 0, 0.1] as ColorTuple },
  xl: { offsetX: 0, offsetY: 20, blur: 25, color: [0, 0, 0, 0.1] as ColorTuple },
  "2xl": { offsetX: 0, offsetY: 25, blur: 50, color: [0, 0, 0, 0.25] as ColorTuple },
  inner: { offsetX: 0, offsetY: 2, blur: 4, color: [0, 0, 0, 0.05] as ColorTuple }
}
