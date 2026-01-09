/**
 * Shape drawing primitives for Skia
 * Basic shapes: rectangles, circles, ellipses, polygons, stars, arcs
 */

import type { CanvasKit, Canvas, Paint, Path } from "canvaskit-wasm"
import type { Point } from "../utils/geometry"
import { polarToCartesian, generatePolygonPoints, generateStarPoints } from "../utils/geometry"
import { degreesToRadians } from "../utils/math"

// Draw a rounded rectangle
export function drawRoundedRect(
  canvas: Canvas,
  ck: CanvasKit,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number | [number, number, number, number],
  paint: Paint
): void {
  let radii: number[]

  if (typeof radius === "number") {
    radii = [radius, radius, radius, radius, radius, radius, radius, radius]
  } else {
    // [topLeft, topRight, bottomRight, bottomLeft] -> CanvasKit format
    radii = [
      radius[0], radius[0], // top-left
      radius[1], radius[1], // top-right
      radius[2], radius[2], // bottom-right
      radius[3], radius[3]  // bottom-left
    ]
  }

  const rrect = ck.RRectXY(
    ck.LTRBRect(x, y, x + width, y + height),
    radii[0],
    radii[1]
  )

  canvas.drawRRect(rrect, paint)
}

// Draw a rounded rectangle with individual corner radii
export function drawRoundedRectComplex(
  canvas: Canvas,
  ck: CanvasKit,
  x: number,
  y: number,
  width: number,
  height: number,
  radii: [number, number, number, number], // [topLeft, topRight, bottomRight, bottomLeft]
  paint: Paint
): void {
  const path = new ck.Path()

  const [tl, tr, br, bl] = radii

  // Start from top-left, after the corner radius
  path.moveTo(x + tl, y)

  // Top edge and top-right corner
  path.lineTo(x + width - tr, y)
  if (tr > 0) {
    path.arcToTangent(x + width, y, x + width, y + tr, tr)
  }

  // Right edge and bottom-right corner
  path.lineTo(x + width, y + height - br)
  if (br > 0) {
    path.arcToTangent(x + width, y + height, x + width - br, y + height, br)
  }

  // Bottom edge and bottom-left corner
  path.lineTo(x + bl, y + height)
  if (bl > 0) {
    path.arcToTangent(x, y + height, x, y + height - bl, bl)
  }

  // Left edge and top-left corner
  path.lineTo(x, y + tl)
  if (tl > 0) {
    path.arcToTangent(x, y, x + tl, y, tl)
  }

  path.close()
  canvas.drawPath(path, paint)
  path.delete()
}

// Draw a circle
export function drawCircle(
  canvas: Canvas,
  _ck: CanvasKit,
  cx: number,
  cy: number,
  radius: number,
  paint: Paint
): void {
  canvas.drawCircle(cx, cy, radius, paint)
}

// Draw an ellipse
export function drawEllipse(
  canvas: Canvas,
  ck: CanvasKit,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  paint: Paint
): void {
  const rect = ck.LTRBRect(cx - rx, cy - ry, cx + rx, cy + ry)
  canvas.drawOval(rect, paint)
}

// Draw a regular polygon
export function drawPolygon(
  canvas: Canvas,
  ck: CanvasKit,
  cx: number,
  cy: number,
  radius: number,
  sides: number,
  rotation: number,
  paint: Paint
): void {
  const points = generatePolygonPoints(cx, cy, radius, sides, rotation)
  drawPolygonFromPoints(canvas, ck, points, true, paint)
}

// Draw a polygon from an array of points
export function drawPolygonFromPoints(
  canvas: Canvas,
  ck: CanvasKit,
  points: Point[],
  closed: boolean,
  paint: Paint
): void {
  if (points.length < 2) return

  const path = new ck.Path()
  path.moveTo(points[0].x, points[0].y)

  for (let i = 1; i < points.length; i++) {
    path.lineTo(points[i].x, points[i].y)
  }

  if (closed) {
    path.close()
  }

  canvas.drawPath(path, paint)
  path.delete()
}

// Draw a star
export function drawStar(
  canvas: Canvas,
  ck: CanvasKit,
  cx: number,
  cy: number,
  points: number,
  outerRadius: number,
  innerRadius: number,
  rotation: number,
  paint: Paint
): void {
  const starPoints = generateStarPoints(cx, cy, outerRadius, innerRadius, points, rotation)
  drawPolygonFromPoints(canvas, ck, starPoints, true, paint)
}

// Draw an arc
export function drawArc(
  canvas: Canvas,
  ck: CanvasKit,
  cx: number,
  cy: number,
  radius: number,
  startAngleDegrees: number,
  sweepAngleDegrees: number,
  useCenter: boolean,
  paint: Paint
): void {
  const rect = ck.LTRBRect(cx - radius, cy - radius, cx + radius, cy + radius)
  canvas.drawArc(rect, startAngleDegrees, sweepAngleDegrees, useCenter, paint)
}

// Draw an arc with different inner and outer radii (donut segment)
export function drawArcRing(
  canvas: Canvas,
  ck: CanvasKit,
  cx: number,
  cy: number,
  innerRadius: number,
  outerRadius: number,
  startAngleDegrees: number,
  sweepAngleDegrees: number,
  paint: Paint
): void {
  const path = new ck.Path()

  const startAngleRad = degreesToRadians(startAngleDegrees)
  const endAngleRad = degreesToRadians(startAngleDegrees + sweepAngleDegrees)

  // Start at outer radius
  const outerStart = polarToCartesian(cx, cy, outerRadius, startAngleRad)
  path.moveTo(outerStart.x, outerStart.y)

  // Outer arc
  path.arcToOval(
    ck.LTRBRect(cx - outerRadius, cy - outerRadius, cx + outerRadius, cy + outerRadius),
    startAngleDegrees,
    sweepAngleDegrees,
    false
  )

  // Line to inner radius at end angle
  const innerEnd = polarToCartesian(cx, cy, innerRadius, endAngleRad)
  path.lineTo(innerEnd.x, innerEnd.y)

  // Inner arc (reverse direction)
  path.arcToOval(
    ck.LTRBRect(cx - innerRadius, cy - innerRadius, cx + innerRadius, cy + innerRadius),
    startAngleDegrees + sweepAngleDegrees,
    -sweepAngleDegrees,
    false
  )

  path.close()
  canvas.drawPath(path, paint)
  path.delete()
}

// Draw a line
export function drawLine(
  canvas: Canvas,
  ck: CanvasKit,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  paint: Paint
): void {
  const path = new ck.Path()
  path.moveTo(x1, y1)
  path.lineTo(x2, y2)
  canvas.drawPath(path, paint)
  path.delete()
}

// Draw multiple lines efficiently
export function drawLines(
  canvas: Canvas,
  ck: CanvasKit,
  lines: Array<[Point, Point]>,
  paint: Paint
): void {
  const path = new ck.Path()

  for (const [start, end] of lines) {
    path.moveTo(start.x, start.y)
    path.lineTo(end.x, end.y)
  }

  canvas.drawPath(path, paint)
  path.delete()
}

// Draw a polyline (connected line segments)
export function drawPolyline(
  canvas: Canvas,
  ck: CanvasKit,
  points: Point[],
  paint: Paint
): void {
  if (points.length < 2) return

  const path = new ck.Path()
  path.moveTo(points[0].x, points[0].y)

  for (let i = 1; i < points.length; i++) {
    path.lineTo(points[i].x, points[i].y)
  }

  canvas.drawPath(path, paint)
  path.delete()
}

// Draw a smooth curve through points
export function drawSmoothCurve(
  canvas: Canvas,
  ck: CanvasKit,
  points: Point[],
  tension: number,
  paint: Paint
): void {
  if (points.length < 2) return
  if (points.length === 2) {
    drawPolyline(canvas, ck, points, paint)
    return
  }

  const path = new ck.Path()
  path.moveTo(points[0].x, points[0].y)

  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)]
    const p1 = points[i]
    const p2 = points[i + 1]
    const p3 = points[Math.min(points.length - 1, i + 2)]

    // Catmull-Rom to Bezier conversion
    const cp1x = p1.x + (p2.x - p0.x) / 6 * tension
    const cp1y = p1.y + (p2.y - p0.y) / 6 * tension
    const cp2x = p2.x - (p3.x - p1.x) / 6 * tension
    const cp2y = p2.y - (p3.y - p1.y) / 6 * tension

    path.cubicTo(cp1x, cp1y, cp2x, cp2y, p2.x, p2.y)
  }

  canvas.drawPath(path, paint)
  path.delete()
}

// Draw a ring (donut shape)
export function drawRing(
  canvas: Canvas,
  ck: CanvasKit,
  cx: number,
  cy: number,
  innerRadius: number,
  outerRadius: number,
  paint: Paint
): void {
  const path = new ck.Path()

  // Outer circle (clockwise)
  path.addCircle(cx, cy, outerRadius, false)

  // Inner circle (counter-clockwise to create hole)
  path.addCircle(cx, cy, innerRadius, true)

  canvas.drawPath(path, paint)
  path.delete()
}

// Draw a capsule (stadium shape)
export function drawCapsule(
  canvas: Canvas,
  ck: CanvasKit,
  x: number,
  y: number,
  width: number,
  height: number,
  paint: Paint
): void {
  const radius = Math.min(width, height) / 2
  drawRoundedRect(canvas, ck, x, y, width, height, radius, paint)
}

// Draw a cross/plus shape
export function drawCross(
  canvas: Canvas,
  ck: CanvasKit,
  cx: number,
  cy: number,
  size: number,
  thickness: number,
  paint: Paint
): void {
  const path = new ck.Path()
  const halfSize = size / 2
  const halfThickness = thickness / 2

  // Horizontal bar
  path.addRect(
    ck.LTRBRect(
      cx - halfSize,
      cy - halfThickness,
      cx + halfSize,
      cy + halfThickness
    )
  )

  // Vertical bar
  path.addRect(
    ck.LTRBRect(
      cx - halfThickness,
      cy - halfSize,
      cx + halfThickness,
      cy + halfSize
    )
  )

  canvas.drawPath(path, paint)
  path.delete()
}

// Create a path for a shape (returns Path that must be deleted by caller)
export function createRoundedRectPath(
  ck: CanvasKit,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
): Path {
  const path = new ck.Path()
  path.addRRect(
    ck.RRectXY(
      ck.LTRBRect(x, y, x + width, y + height),
      radius,
      radius
    )
  )
  return path
}

export function createCirclePath(
  ck: CanvasKit,
  cx: number,
  cy: number,
  radius: number
): Path {
  const path = new ck.Path()
  path.addCircle(cx, cy, radius, false)
  return path
}

export function createPolygonPath(
  ck: CanvasKit,
  points: Point[],
  closed: boolean = true
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
