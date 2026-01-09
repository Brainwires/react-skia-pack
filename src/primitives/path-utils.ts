/**
 * Path utilities for Skia
 * Bezier curves, path operations, and path generation
 */

import type { CanvasKit, Path } from "canvaskit-wasm"
import type { Point } from "../utils/geometry"

// Create an empty path
export function createPath(ck: CanvasKit): Path {
  return new ck.Path()
}

// Move to a point
export function moveTo(path: Path, x: number, y: number): Path {
  path.moveTo(x, y)
  return path
}

// Line to a point
export function lineTo(path: Path, x: number, y: number): Path {
  path.lineTo(x, y)
  return path
}

// Quadratic bezier curve
export function quadTo(
  path: Path,
  cpx: number,
  cpy: number,
  x: number,
  y: number
): Path {
  path.quadTo(cpx, cpy, x, y)
  return path
}

// Cubic bezier curve
export function cubicTo(
  path: Path,
  cp1x: number,
  cp1y: number,
  cp2x: number,
  cp2y: number,
  x: number,
  y: number
): Path {
  path.cubicTo(cp1x, cp1y, cp2x, cp2y, x, y)
  return path
}

// Close the current contour
export function closePath(path: Path): Path {
  path.close()
  return path
}

// Create a path from an array of points
export function pathFromPoints(
  ck: CanvasKit,
  points: Point[],
  closed: boolean = false
): Path {
  const path = new ck.Path()
  if (points.length === 0) return path

  path.moveTo(points[0].x, points[0].y)
  for (let i = 1; i < points.length; i++) {
    path.lineTo(points[i].x, points[i].y)
  }

  if (closed) path.close()
  return path
}

// Create a smooth path through points using Catmull-Rom splines
export function smoothPathFromPoints(
  ck: CanvasKit,
  points: Point[],
  tension: number = 1,
  closed: boolean = false
): Path {
  const path = new ck.Path()
  if (points.length < 2) return path

  if (points.length === 2) {
    path.moveTo(points[0].x, points[0].y)
    path.lineTo(points[1].x, points[1].y)
    return path
  }

  path.moveTo(points[0].x, points[0].y)

  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)]
    const p1 = points[i]
    const p2 = points[i + 1]
    const p3 = points[Math.min(points.length - 1, i + 2)]

    // Catmull-Rom to Bezier conversion
    const cp1x = p1.x + ((p2.x - p0.x) / 6) * tension
    const cp1y = p1.y + ((p2.y - p0.y) / 6) * tension
    const cp2x = p2.x - ((p3.x - p1.x) / 6) * tension
    const cp2y = p2.y - ((p3.y - p1.y) / 6) * tension

    path.cubicTo(cp1x, cp1y, cp2x, cp2y, p2.x, p2.y)
  }

  if (closed) path.close()
  return path
}

// Create a rounded polygon path
export function roundedPolygonPath(
  ck: CanvasKit,
  points: Point[],
  radius: number
): Path {
  const path = new ck.Path()
  if (points.length < 3) return path

  for (let i = 0; i < points.length; i++) {
    const prev = points[(i - 1 + points.length) % points.length]
    const curr = points[i]
    const next = points[(i + 1) % points.length]

    // Calculate vectors
    const v1 = { x: prev.x - curr.x, y: prev.y - curr.y }
    const v2 = { x: next.x - curr.x, y: next.y - curr.y }

    // Normalize
    const len1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y)
    const len2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y)
    v1.x /= len1
    v1.y /= len1
    v2.x /= len2
    v2.y /= len2

    // Calculate the corner radius (limited by edge lengths)
    const r = Math.min(radius, len1 / 2, len2 / 2)

    // Start and end points of the arc
    const start = { x: curr.x + v1.x * r, y: curr.y + v1.y * r }
    const end = { x: curr.x + v2.x * r, y: curr.y + v2.y * r }

    if (i === 0) {
      path.moveTo(start.x, start.y)
    } else {
      path.lineTo(start.x, start.y)
    }

    // Use arc
    path.arcToTangent(curr.x, curr.y, end.x, end.y, r)
  }

  path.close()
  return path
}

// Create a wave path
export function wavePath(
  ck: CanvasKit,
  x: number,
  y: number,
  width: number,
  amplitude: number,
  frequency: number,
  phase: number = 0
): Path {
  const path = new ck.Path()
  const steps = Math.ceil(width / 2) // 2 pixels per step

  path.moveTo(x, y + amplitude * Math.sin(phase))

  for (let i = 1; i <= steps; i++) {
    const px = x + (i / steps) * width
    const py = y + amplitude * Math.sin(phase + (i / steps) * frequency * Math.PI * 2)
    path.lineTo(px, py)
  }

  return path
}

// Create a zigzag path
export function zigzagPath(
  ck: CanvasKit,
  x: number,
  y: number,
  width: number,
  amplitude: number,
  segments: number
): Path {
  const path = new ck.Path()
  const segmentWidth = width / segments

  path.moveTo(x, y)

  for (let i = 0; i < segments; i++) {
    const px = x + (i + 0.5) * segmentWidth
    const py = y + (i % 2 === 0 ? amplitude : -amplitude)
    path.lineTo(px, py)
  }

  path.lineTo(x + width, y)
  return path
}

// Create a spiral path
export function spiralPath(
  ck: CanvasKit,
  cx: number,
  cy: number,
  startRadius: number,
  endRadius: number,
  turns: number,
  steps: number = 100
): Path {
  const path = new ck.Path()
  const angleStep = (turns * Math.PI * 2) / steps
  const radiusStep = (endRadius - startRadius) / steps

  for (let i = 0; i <= steps; i++) {
    const angle = i * angleStep
    const radius = startRadius + i * radiusStep
    const px = cx + radius * Math.cos(angle)
    const py = cy + radius * Math.sin(angle)

    if (i === 0) {
      path.moveTo(px, py)
    } else {
      path.lineTo(px, py)
    }
  }

  return path
}

// Create a heart shape path
export function heartPath(
  ck: CanvasKit,
  cx: number,
  cy: number,
  size: number
): Path {
  const path = new ck.Path()
  const s = size / 2

  path.moveTo(cx, cy + s * 0.3)

  // Left curve
  path.cubicTo(
    cx - s * 0.5, cy - s * 0.3,
    cx - s, cy - s * 0.3,
    cx - s, cy + s * 0.1
  )
  path.cubicTo(
    cx - s, cy + s * 0.6,
    cx, cy + s,
    cx, cy + s
  )

  // Right curve
  path.cubicTo(
    cx, cy + s,
    cx + s, cy + s * 0.6,
    cx + s, cy + s * 0.1
  )
  path.cubicTo(
    cx + s, cy - s * 0.3,
    cx + s * 0.5, cy - s * 0.3,
    cx, cy + s * 0.3
  )

  path.close()
  return path
}

// Create an arrow path
export function arrowPath(
  ck: CanvasKit,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  headLength: number = 10,
  headWidth: number = 6
): Path {
  const path = new ck.Path()

  // Calculate angle
  const angle = Math.atan2(y2 - y1, x2 - x1)

  // Arrow head points
  const leftAngle = angle + Math.PI - Math.PI / 6
  const rightAngle = angle + Math.PI + Math.PI / 6

  path.moveTo(x1, y1)
  path.lineTo(x2, y2)

  // Arrow head
  path.moveTo(x2, y2)
  path.lineTo(
    x2 + headLength * Math.cos(leftAngle),
    y2 + headLength * Math.sin(leftAngle)
  )
  path.moveTo(x2, y2)
  path.lineTo(
    x2 + headLength * Math.cos(rightAngle),
    y2 + headLength * Math.sin(rightAngle)
  )

  return path
}

// Create a rounded rectangle path
export function roundedRectPath(
  ck: CanvasKit,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number | [number, number, number, number]
): Path {
  const path = new ck.Path()
  const r = typeof radius === "number"
    ? [radius, radius, radius, radius]
    : radius

  const [tl, tr, br, bl] = r

  path.moveTo(x + tl, y)
  path.lineTo(x + width - tr, y)
  if (tr > 0) path.arcToTangent(x + width, y, x + width, y + tr, tr)
  path.lineTo(x + width, y + height - br)
  if (br > 0) path.arcToTangent(x + width, y + height, x + width - br, y + height, br)
  path.lineTo(x + bl, y + height)
  if (bl > 0) path.arcToTangent(x, y + height, x, y + height - bl, bl)
  path.lineTo(x, y + tl)
  if (tl > 0) path.arcToTangent(x, y, x + tl, y, tl)
  path.close()

  return path
}

// Get path bounds
export function getPathBounds(path: Path): {
  x: number
  y: number
  width: number
  height: number
} {
  const bounds = path.getBounds()
  return {
    x: bounds[0],
    y: bounds[1],
    width: bounds[2] - bounds[0],
    height: bounds[3] - bounds[1]
  }
}

// Check if a point is inside a path
export function pointInPath(path: Path, x: number, y: number): boolean {
  return path.contains(x, y)
}

// Combine multiple paths
export function combinePaths(
  ck: CanvasKit,
  paths: Path[],
  operation: "union" | "intersect" | "difference" | "xor" = "union"
): Path {
  if (paths.length === 0) return new ck.Path()
  if (paths.length === 1) return paths[0].copy()

  const ops = {
    union: ck.PathOp.Union,
    intersect: ck.PathOp.Intersect,
    difference: ck.PathOp.Difference,
    xor: ck.PathOp.XOR
  }

  // Start with a copy of the first path
  const result = paths[0].copy()

  for (let i = 1; i < paths.length; i++) {
    // op() mutates the path in place and returns boolean success
    const success = result.op(paths[i], ops[operation])
    if (!success) {
      // If operation failed, return what we have so far
      break
    }
  }

  return result
}

// Transform a path
export function transformPath(
  path: Path,
  matrix: number[]
): Path {
  const copy = path.copy()
  copy.transform(matrix)
  return copy
}

// Dash a path
export function dashPath(
  ck: CanvasKit,
  path: Path,
  intervals: number[],
  phase: number = 0
): Path {
  const effect = ck.PathEffect.MakeDash(intervals, phase)
  const newPath = path.copy()
  // Note: CanvasKit doesn't have direct path dashing,
  // dash effect is applied via paint
  return newPath
}
