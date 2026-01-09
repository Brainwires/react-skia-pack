/**
 * Interaction utilities for Skia components
 * Hit testing, pointer event handling, and gesture detection
 */

import type { Point, Bounds, Circle } from "./geometry"
import { pointInBounds, pointInCircle, pointInPolygon } from "./geometry"

// Pointer event data (normalized)
export interface PointerEventData {
  x: number
  y: number
  pressure: number
  pointerId: number
  pointerType: "mouse" | "touch" | "pen"
  isPrimary: boolean
  buttons: number
  shiftKey: boolean
  ctrlKey: boolean
  altKey: boolean
  metaKey: boolean
}

// Hit test result
export interface HitTestResult<T = unknown> {
  hit: boolean
  index?: number
  data?: T
}

// Hit test function type
export type HitTestFunction<T = unknown> = (x: number, y: number) => HitTestResult<T>

// Normalize pointer event to canvas-relative coordinates
export function normalizePointerEvent(
  e: React.PointerEvent | PointerEvent,
  canvas: HTMLCanvasElement
): PointerEventData {
  const rect = canvas.getBoundingClientRect()
  const dpr = window.devicePixelRatio || 1

  return {
    x: (e.clientX - rect.left) * (canvas.width / rect.width) / dpr,
    y: (e.clientY - rect.top) * (canvas.height / rect.height) / dpr,
    pressure: e.pressure,
    pointerId: e.pointerId,
    pointerType: e.pointerType as "mouse" | "touch" | "pen",
    isPrimary: e.isPrimary,
    buttons: e.buttons,
    shiftKey: e.shiftKey,
    ctrlKey: e.ctrlKey,
    altKey: e.altKey,
    metaKey: e.metaKey
  }
}

// Get relative position without DPR adjustment (for display coordinates)
export function getRelativePosition(
  e: React.PointerEvent | PointerEvent | React.MouseEvent | MouseEvent,
  element: HTMLElement
): Point {
  const rect = element.getBoundingClientRect()
  return {
    x: e.clientX - rect.left,
    y: e.clientY - rect.top
  }
}

// Create hit test for rectangles
export function createRectHitTest<T = unknown>(
  rects: Array<{ bounds: Bounds; data?: T }>
): HitTestFunction<T> {
  return (x: number, y: number): HitTestResult<T> => {
    const point: Point = { x, y }
    for (let i = 0; i < rects.length; i++) {
      if (pointInBounds(point, rects[i].bounds)) {
        return { hit: true, index: i, data: rects[i].data }
      }
    }
    return { hit: false }
  }
}

// Create hit test for circles
export function createCircleHitTest<T = unknown>(
  circles: Array<{ circle: Circle; data?: T }>
): HitTestFunction<T> {
  return (x: number, y: number): HitTestResult<T> => {
    const point: Point = { x, y }
    for (let i = 0; i < circles.length; i++) {
      if (pointInCircle(point, circles[i].circle)) {
        return { hit: true, index: i, data: circles[i].data }
      }
    }
    return { hit: false }
  }
}

// Create hit test for polygons
export function createPolygonHitTest<T = unknown>(
  polygons: Array<{ points: Point[]; data?: T }>
): HitTestFunction<T> {
  return (x: number, y: number): HitTestResult<T> => {
    const point: Point = { x, y }
    for (let i = 0; i < polygons.length; i++) {
      if (pointInPolygon(point, polygons[i].points)) {
        return { hit: true, index: i, data: polygons[i].data }
      }
    }
    return { hit: false }
  }
}

// Combine multiple hit tests (first match wins)
export function combineHitTests<T = unknown>(
  ...hitTests: HitTestFunction<T>[]
): HitTestFunction<T> {
  return (x: number, y: number): HitTestResult<T> => {
    for (const hitTest of hitTests) {
      const result = hitTest(x, y)
      if (result.hit) return result
    }
    return { hit: false }
  }
}

// Drag state management
export interface DragState {
  isDragging: boolean
  startPoint: Point | null
  currentPoint: Point | null
  delta: Point
  totalDelta: Point
}

export function createInitialDragState(): DragState {
  return {
    isDragging: false,
    startPoint: null,
    currentPoint: null,
    delta: { x: 0, y: 0 },
    totalDelta: { x: 0, y: 0 }
  }
}

export function startDrag(_state: DragState, point: Point): DragState {
  return {
    isDragging: true,
    startPoint: point,
    currentPoint: point,
    delta: { x: 0, y: 0 },
    totalDelta: { x: 0, y: 0 }
  }
}

export function updateDrag(state: DragState, point: Point): DragState {
  if (!state.isDragging || !state.currentPoint || !state.startPoint) {
    return state
  }

  return {
    ...state,
    currentPoint: point,
    delta: {
      x: point.x - state.currentPoint.x,
      y: point.y - state.currentPoint.y
    },
    totalDelta: {
      x: point.x - state.startPoint.x,
      y: point.y - state.startPoint.y
    }
  }
}

export function endDrag(state: DragState): DragState {
  return {
    ...state,
    isDragging: false,
    delta: { x: 0, y: 0 }
  }
}

// Wheel event normalization
export interface WheelData {
  deltaX: number
  deltaY: number
  deltaZ: number
  deltaMode: "pixel" | "line" | "page"
}

export function normalizeWheelEvent(e: WheelEvent): WheelData {
  const modes = ["pixel", "line", "page"] as const
  return {
    deltaX: e.deltaX,
    deltaY: e.deltaY,
    deltaZ: e.deltaZ,
    deltaMode: modes[e.deltaMode] || "pixel"
  }
}

// Gesture detection utilities
export interface PinchState {
  isPinching: boolean
  startDistance: number
  currentDistance: number
  startCenter: Point
  currentCenter: Point
  scale: number
}

export function detectPinch(touches: TouchList): PinchState | null {
  if (touches.length < 2) return null

  const t1 = touches[0]
  const t2 = touches[1]
  const p1: Point = { x: t1.clientX, y: t1.clientY }
  const p2: Point = { x: t2.clientX, y: t2.clientY }

  const dx = p2.x - p1.x
  const dy = p2.y - p1.y
  const distance = Math.sqrt(dx * dx + dy * dy)

  return {
    isPinching: true,
    startDistance: distance,
    currentDistance: distance,
    startCenter: { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 },
    currentCenter: { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 },
    scale: 1
  }
}

export function updatePinch(state: PinchState, touches: TouchList): PinchState {
  if (touches.length < 2) return state

  const t1 = touches[0]
  const t2 = touches[1]
  const p1: Point = { x: t1.clientX, y: t1.clientY }
  const p2: Point = { x: t2.clientX, y: t2.clientY }

  const dx = p2.x - p1.x
  const dy = p2.y - p1.y
  const distance = Math.sqrt(dx * dx + dy * dy)

  return {
    ...state,
    currentDistance: distance,
    currentCenter: { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 },
    scale: state.startDistance > 0 ? distance / state.startDistance : 1
  }
}

// Keyboard navigation utilities
export type Direction = "up" | "down" | "left" | "right"

export function keyToDirection(key: string): Direction | null {
  switch (key) {
    case "ArrowUp":
      return "up"
    case "ArrowDown":
      return "down"
    case "ArrowLeft":
      return "left"
    case "ArrowRight":
      return "right"
    default:
      return null
  }
}

export function directionToValue(
  direction: Direction,
  orientation: "horizontal" | "vertical" = "horizontal"
): number {
  if (orientation === "horizontal") {
    return direction === "right" || direction === "up" ? 1 : -1
  } else {
    return direction === "up" || direction === "right" ? 1 : -1
  }
}
