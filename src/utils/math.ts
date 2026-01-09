/**
 * Math utilities for Skia components
 * Angle conversions, range mapping, and numerical operations
 */

// Angle conversions

export function degreesToRadians(degrees: number): number {
  return (degrees * Math.PI) / 180
}

export function radiansToDegrees(radians: number): number {
  return (radians * 180) / Math.PI
}

export function normalizeAngle(angle: number): number {
  // Normalize angle to [0, 2*PI)
  const twoPi = Math.PI * 2
  return ((angle % twoPi) + twoPi) % twoPi
}

export function normalizeAngleDegrees(angle: number): number {
  // Normalize angle to [0, 360)
  return ((angle % 360) + 360) % 360
}

export function angleDifference(a: number, b: number): number {
  // Shortest angular distance between two angles (in radians)
  const diff = normalizeAngle(b - a)
  return diff > Math.PI ? diff - Math.PI * 2 : diff
}

// Range mapping and interpolation

export function mapRange(
  value: number,
  inMin: number,
  inMax: number,
  outMin: number,
  outMax: number
): number {
  if (inMax === inMin) return outMin
  return ((value - inMin) / (inMax - inMin)) * (outMax - outMin) + outMin
}

export function mapRangeClamped(
  value: number,
  inMin: number,
  inMax: number,
  outMin: number,
  outMax: number
): number {
  const mapped = mapRange(value, inMin, inMax, outMin, outMax)
  return outMin < outMax
    ? Math.min(Math.max(mapped, outMin), outMax)
    : Math.min(Math.max(mapped, outMax), outMin)
}

// Stepping and rounding

export function roundToStep(value: number, step: number): number {
  if (step === 0) return value
  return Math.round(value / step) * step
}

export function floorToStep(value: number, step: number): number {
  if (step === 0) return value
  return Math.floor(value / step) * step
}

export function ceilToStep(value: number, step: number): number {
  if (step === 0) return value
  return Math.ceil(value / step) * step
}

// Percentage and ratio conversions

export function percentToValue(percent: number, min: number, max: number): number {
  return min + (percent / 100) * (max - min)
}

export function valueToPercent(value: number, min: number, max: number): number {
  if (max === min) return 0
  return ((value - min) / (max - min)) * 100
}

export function percentToAngle(
  percent: number,
  startAngle: number,
  endAngle: number
): number {
  return startAngle + (percent / 100) * (endAngle - startAngle)
}

export function angleToPercent(
  angle: number,
  startAngle: number,
  endAngle: number
): number {
  if (endAngle === startAngle) return 0
  return ((angle - startAngle) / (endAngle - startAngle)) * 100
}

// Numerical utilities

export function sign(value: number): number {
  if (value > 0) return 1
  if (value < 0) return -1
  return 0
}

export function mod(n: number, m: number): number {
  // True modulo (always positive)
  return ((n % m) + m) % m
}

export function wrap(value: number, min: number, max: number): number {
  const range = max - min
  if (range === 0) return min
  return mod(value - min, range) + min
}

export function smoothStep(edge0: number, edge1: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)))
  return t * t * (3 - 2 * t)
}

export function smootherStep(edge0: number, edge1: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)))
  return t * t * t * (t * (t * 6 - 15) + 10)
}

// Precision utilities

export function roundToPrecision(value: number, precision: number): number {
  const multiplier = Math.pow(10, precision)
  return Math.round(value * multiplier) / multiplier
}

export function almostEqual(a: number, b: number, epsilon: number = 1e-10): boolean {
  return Math.abs(a - b) < epsilon
}

// Statistical utilities

export function sum(values: number[]): number {
  return values.reduce((acc, val) => acc + val, 0)
}

export function average(values: number[]): number {
  if (values.length === 0) return 0
  return sum(values) / values.length
}

export function min(values: number[]): number {
  if (values.length === 0) return 0
  return Math.min(...values)
}

export function max(values: number[]): number {
  if (values.length === 0) return 0
  return Math.max(...values)
}

export function minMax(values: number[]): [number, number] {
  if (values.length === 0) return [0, 0]
  let minVal = values[0]
  let maxVal = values[0]
  for (let i = 1; i < values.length; i++) {
    if (values[i] < minVal) minVal = values[i]
    if (values[i] > maxVal) maxVal = values[i]
  }
  return [minVal, maxVal]
}

// Squircle (superellipse) utilities

export function squircle(
  angle: number,
  squareness: number = 0.5
): { x: number; y: number } {
  // squareness: 0 = circle, 1 = square
  const n = 2 + squareness * 8 // exponent from 2 (circle) to 10 (nearly square)
  const cos = Math.cos(angle)
  const sin = Math.sin(angle)
  const signCos = sign(cos)
  const signSin = sign(sin)

  return {
    x: signCos * Math.pow(Math.abs(cos), 2 / n),
    y: signSin * Math.pow(Math.abs(sin), 2 / n)
  }
}

// Bezier utilities

export function quadraticBezier(
  t: number,
  p0: number,
  p1: number,
  p2: number
): number {
  const oneMinusT = 1 - t
  return oneMinusT * oneMinusT * p0 + 2 * oneMinusT * t * p1 + t * t * p2
}

export function cubicBezier(
  t: number,
  p0: number,
  p1: number,
  p2: number,
  p3: number
): number {
  const oneMinusT = 1 - t
  return (
    oneMinusT * oneMinusT * oneMinusT * p0 +
    3 * oneMinusT * oneMinusT * t * p1 +
    3 * oneMinusT * t * t * p2 +
    t * t * t * p3
  )
}
