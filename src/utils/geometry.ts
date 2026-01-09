/**
 * Geometry utilities for Skia components
 * Point, bounds, distance calculations, and coordinate transformations
 */

export interface Point {
  x: number
  y: number
}

export interface Bounds {
  x: number
  y: number
  width: number
  height: number
}

export interface Circle {
  cx: number
  cy: number
  radius: number
}

// Distance and vector operations

export function distance(p1: Point, p2: Point): number {
  const dx = p2.x - p1.x
  const dy = p2.y - p1.y
  return Math.sqrt(dx * dx + dy * dy)
}

export function distanceSquared(p1: Point, p2: Point): number {
  const dx = p2.x - p1.x
  const dy = p2.y - p1.y
  return dx * dx + dy * dy
}

export function magnitude(p: Point): number {
  return Math.sqrt(p.x * p.x + p.y * p.y)
}

export function normalize(p: Point): Point {
  const mag = magnitude(p)
  if (mag === 0) return { x: 0, y: 0 }
  return { x: p.x / mag, y: p.y / mag }
}

export function add(p1: Point, p2: Point): Point {
  return { x: p1.x + p2.x, y: p1.y + p2.y }
}

export function subtract(p1: Point, p2: Point): Point {
  return { x: p1.x - p2.x, y: p1.y - p2.y }
}

export function scale(p: Point, factor: number): Point {
  return { x: p.x * factor, y: p.y * factor }
}

export function dot(p1: Point, p2: Point): number {
  return p1.x * p2.x + p1.y * p2.y
}

// Interpolation

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

export function lerpPoint(p1: Point, p2: Point, t: number): Point {
  return {
    x: lerp(p1.x, p2.x, t),
    y: lerp(p1.y, p2.y, t)
  }
}

export function inverseLerp(a: number, b: number, value: number): number {
  if (a === b) return 0
  return (value - a) / (b - a)
}

// Clamping and constraints

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

export function clampPoint(p: Point, bounds: Bounds): Point {
  return {
    x: clamp(p.x, bounds.x, bounds.x + bounds.width),
    y: clamp(p.y, bounds.y, bounds.y + bounds.height)
  }
}

// Hit testing

export function pointInBounds(p: Point, bounds: Bounds): boolean {
  return (
    p.x >= bounds.x &&
    p.x <= bounds.x + bounds.width &&
    p.y >= bounds.y &&
    p.y <= bounds.y + bounds.height
  )
}

export function pointInCircle(p: Point, circle: Circle): boolean {
  return distanceSquared(p, { x: circle.cx, y: circle.cy }) <= circle.radius * circle.radius
}

export function pointInPolygon(p: Point, polygon: Point[]): boolean {
  let inside = false
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x
    const yi = polygon[i].y
    const xj = polygon[j].x
    const yj = polygon[j].y

    if (yi > p.y !== yj > p.y && p.x < ((xj - xi) * (p.y - yi)) / (yj - yi) + xi) {
      inside = !inside
    }
  }
  return inside
}

// Polar / Cartesian conversions

export function polarToCartesian(
  cx: number,
  cy: number,
  radius: number,
  angleRadians: number
): Point {
  return {
    x: cx + radius * Math.cos(angleRadians),
    y: cy + radius * Math.sin(angleRadians)
  }
}

export function cartesianToPolar(
  cx: number,
  cy: number,
  x: number,
  y: number
): { radius: number; angle: number } {
  const dx = x - cx
  const dy = y - cy
  return {
    radius: Math.sqrt(dx * dx + dy * dy),
    angle: Math.atan2(dy, dx)
  }
}

// Bounds operations

export function boundsCenter(bounds: Bounds): Point {
  return {
    x: bounds.x + bounds.width / 2,
    y: bounds.y + bounds.height / 2
  }
}

export function boundsFromPoints(points: Point[]): Bounds {
  if (points.length === 0) {
    return { x: 0, y: 0, width: 0, height: 0 }
  }

  let minX = points[0].x
  let minY = points[0].y
  let maxX = points[0].x
  let maxY = points[0].y

  for (let i = 1; i < points.length; i++) {
    minX = Math.min(minX, points[i].x)
    minY = Math.min(minY, points[i].y)
    maxX = Math.max(maxX, points[i].x)
    maxY = Math.max(maxY, points[i].y)
  }

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY
  }
}

export function expandBounds(bounds: Bounds, padding: number): Bounds {
  return {
    x: bounds.x - padding,
    y: bounds.y - padding,
    width: bounds.width + padding * 2,
    height: bounds.height + padding * 2
  }
}

export function boundsIntersect(a: Bounds, b: Bounds): boolean {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  )
}

// Angle operations

export function angleBetweenPoints(p1: Point, p2: Point): number {
  return Math.atan2(p2.y - p1.y, p2.x - p1.x)
}

export function rotatePoint(p: Point, center: Point, angleRadians: number): Point {
  const cos = Math.cos(angleRadians)
  const sin = Math.sin(angleRadians)
  const dx = p.x - center.x
  const dy = p.y - center.y

  return {
    x: center.x + dx * cos - dy * sin,
    y: center.y + dx * sin + dy * cos
  }
}

// Generate points on shapes

export function generateCirclePoints(
  cx: number,
  cy: number,
  radius: number,
  numPoints: number
): Point[] {
  const points: Point[] = []
  for (let i = 0; i < numPoints; i++) {
    const angle = (i / numPoints) * Math.PI * 2
    points.push(polarToCartesian(cx, cy, radius, angle))
  }
  return points
}

export function generatePolygonPoints(
  cx: number,
  cy: number,
  radius: number,
  sides: number,
  rotation: number = -Math.PI / 2
): Point[] {
  const points: Point[] = []
  for (let i = 0; i < sides; i++) {
    const angle = rotation + (i / sides) * Math.PI * 2
    points.push(polarToCartesian(cx, cy, radius, angle))
  }
  return points
}

export function generateStarPoints(
  cx: number,
  cy: number,
  outerRadius: number,
  innerRadius: number,
  points: number,
  rotation: number = -Math.PI / 2
): Point[] {
  const result: Point[] = []
  const angleStep = Math.PI / points

  for (let i = 0; i < points * 2; i++) {
    const angle = rotation + i * angleStep
    const radius = i % 2 === 0 ? outerRadius : innerRadius
    result.push(polarToCartesian(cx, cy, radius, angle))
  }

  return result
}
