// Linear scale - maps data values to pixel coordinates
export interface LinearScale {
  domain: [number, number] // Data range [min, max]
  range: [number, number] // Pixel range [start, end]
}

export function createLinearScale(
  domain: [number, number],
  range: [number, number]
): LinearScale {
  return { domain, range }
}

export function scaleValue(scale: LinearScale, value: number): number {
  const [dMin, dMax] = scale.domain
  const [rMin, rMax] = scale.range
  const ratio = (value - dMin) / (dMax - dMin || 1)
  return rMin + ratio * (rMax - rMin)
}

export function invertScale(scale: LinearScale, pixel: number): number {
  const [dMin, dMax] = scale.domain
  const [rMin, rMax] = scale.range
  const ratio = (pixel - rMin) / (rMax - rMin || 1)
  return dMin + ratio * (dMax - dMin)
}

// Calculate nice axis ticks
export function calculateTicks(
  min: number,
  max: number,
  targetCount: number = 5
): number[] {
  const range = max - min
  if (range === 0) return [min]

  // Calculate step size
  const roughStep = range / targetCount
  const magnitude = Math.pow(10, Math.floor(Math.log10(roughStep)))
  const normalized = roughStep / magnitude

  let step: number
  if (normalized <= 1.5) step = magnitude
  else if (normalized <= 3) step = 2 * magnitude
  else if (normalized <= 7) step = 5 * magnitude
  else step = 10 * magnitude

  // Generate ticks
  const ticks: number[] = []
  const start = Math.ceil(min / step) * step
  for (let tick = start; tick <= max; tick += step) {
    ticks.push(tick)
  }

  return ticks
}

// Calculate domain from data with padding
export function calculateDomain(
  values: number[],
  padding: number = 0.1
): [number, number] {
  if (values.length === 0) return [0, 1]

  const min = Math.min(...values)
  const max = Math.max(...values)

  // Handle case where all values are the same
  if (min === max) {
    const offset = min === 0 ? 1 : Math.abs(min) * 0.1
    return [min - offset, max + offset]
  }

  const range = max - min
  const pad = range * padding

  // For positive-only data, don't go below 0
  if (min >= 0) {
    return [Math.max(0, min - pad), max + pad]
  }

  return [min - pad, max + pad]
}

// Format number for axis labels
export function formatAxisValue(value: number): string {
  const absValue = Math.abs(value)

  if (absValue >= 1_000_000) {
    return (value / 1_000_000).toFixed(1) + "M"
  }
  if (absValue >= 1_000) {
    return (value / 1_000).toFixed(1) + "K"
  }
  if (absValue < 1 && absValue > 0) {
    return value.toFixed(2)
  }
  if (Number.isInteger(value)) {
    return value.toString()
  }
  return value.toFixed(1)
}

// Format percentage
export function formatPercent(value: number, decimals: number = 0): string {
  return (value * 100).toFixed(decimals) + "%"
}

// Format duration in ms
export function formatDuration(ms: number): string {
  if (ms < 1) return "<1ms"
  if (ms < 1000) return Math.round(ms) + "ms"
  return (ms / 1000).toFixed(2) + "s"
}
