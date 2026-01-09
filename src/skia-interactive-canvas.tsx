"use client"

import {
  useRef,
  useEffect,
  useCallback,
  useState,
  forwardRef,
  useImperativeHandle,
  type CSSProperties
} from "react"
import type { CanvasKit, Surface, Canvas, Typeface } from "canvaskit-wasm"
import { useCanvasKit, useTypeface } from "./skia-provider"
import type { PointerEventData } from "./utils/interaction"
import { normalizePointerEvent } from "./utils/interaction"

export interface InteractionState {
  isHovering: boolean
  isPressed: boolean
  pointerPosition: { x: number; y: number } | null
  activePointerId: number | null
}

export interface SkiaInteractiveCanvasProps {
  width?: number
  height?: number
  className?: string
  style?: CSSProperties
  onDraw: (
    canvas: Canvas,
    ck: CanvasKit,
    width: number,
    height: number,
    typeface: Typeface | null,
    interactionState: InteractionState
  ) => void
  onPointerDown?: (e: PointerEventData) => void
  onPointerMove?: (e: PointerEventData) => void
  onPointerUp?: (e: PointerEventData) => void
  onPointerLeave?: () => void
  onWheel?: (e: WheelEvent, position: { x: number; y: number }) => void
  interactive?: boolean
  cursor?: string
  animate?: boolean
  id?: string
  tabIndex?: number
  role?: string
  "aria-label"?: string
  "aria-valuenow"?: number
  "aria-valuemin"?: number
  "aria-valuemax"?: number
  onKeyDown?: (e: React.KeyboardEvent) => void
}

export interface SkiaInteractiveCanvasRef {
  redraw: () => void
  getCanvas: () => HTMLCanvasElement | null
}

// Hook to detect and track theme changes
function useThemeObserver() {
  const [isDark, setIsDark] = useState(() => {
    if (typeof document === "undefined") return false
    return document.documentElement.classList.contains("dark")
  })

  useEffect(() => {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === "class") {
          const newIsDark = document.documentElement.classList.contains("dark")
          setIsDark(newIsDark)
        }
      })
    })

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"]
    })

    return () => observer.disconnect()
  }, [])

  return isDark
}

export const SkiaInteractiveCanvas = forwardRef<
  SkiaInteractiveCanvasRef,
  SkiaInteractiveCanvasProps
>(function SkiaInteractiveCanvas(
  {
    width = 400,
    height = 300,
    className,
    style,
    onDraw,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerLeave,
    onWheel,
    interactive = true,
    cursor = "default",
    animate = false,
    id,
    tabIndex,
    role,
    "aria-label": ariaLabel,
    "aria-valuenow": ariaValueNow,
    "aria-valuemin": ariaValueMin,
    "aria-valuemax": ariaValueMax,
    onKeyDown
  },
  ref
) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const surfaceRef = useRef<Surface | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  const canvasKit = useCanvasKit()
  const typeface = useTypeface()
  const isDark = useThemeObserver()

  const [interactionState, setInteractionState] = useState<InteractionState>({
    isHovering: false,
    isPressed: false,
    pointerPosition: null,
    activePointerId: null
  })

  // Stable reference for draw callback
  const drawRef = useRef(onDraw)
  drawRef.current = onDraw

  // Create or recreate surface when dimensions change
  const setupSurface = useCallback(() => {
    if (!canvasKit || !canvasRef.current) return null

    // Clean up existing surface
    if (surfaceRef.current) {
      try {
        surfaceRef.current.delete()
      } catch {
        // Surface may already be invalid
      }
      surfaceRef.current = null
    }

    // Set canvas dimensions
    const canvas = canvasRef.current
    const dpr = window.devicePixelRatio || 1
    canvas.width = width * dpr
    canvas.height = height * dpr

    // Create surface with error handling for WebGL context limits
    let surface: Surface | null = null
    try {
      surface = canvasKit.MakeCanvasSurface(canvas)
    } catch (error) {
      // WebGL context creation failed (likely hit browser limit)
      console.warn("[SkiaInteractiveCanvas] WebGL surface creation failed, trying software fallback:", error)
      try {
        // Try software rasterizer as fallback
        surface = canvasKit.MakeSWCanvasSurface(canvas)
      } catch {
        console.error("[SkiaInteractiveCanvas] All surface creation methods failed")
        return null
      }
    }

    if (!surface) {
      // Try software fallback if MakeCanvasSurface returned null
      try {
        surface = canvasKit.MakeSWCanvasSurface(canvas)
      } catch {
        console.error("[SkiaInteractiveCanvas] Failed to create any surface")
        return null
      }
    }

    if (!surface) {
      console.error("[SkiaInteractiveCanvas] Failed to create surface")
      return null
    }

    surfaceRef.current = surface
    return surface
  }, [canvasKit, width, height])

  // Draw function
  const draw = useCallback(() => {
    if (!canvasKit || !surfaceRef.current) return

    try {
      const surface = surfaceRef.current
      const canvas = surface.getCanvas()
      const dpr = window.devicePixelRatio || 1

      // Scale for device pixel ratio
      canvas.save()
      canvas.scale(dpr, dpr)

      // Call user's draw function with interaction state
      drawRef.current(canvas, canvasKit, width, height, typeface, interactionState)

      canvas.restore()

      // Flush to display
      surface.flush()
    } catch (error) {
      // Surface may have been lost (WebGL context lost)
      console.warn("[SkiaInteractiveCanvas] Draw failed, surface may be invalid:", error)
      // Don't continue animation if draw failed
      return
    }

    // Continue animation loop if enabled
    if (animate) {
      animationFrameRef.current = requestAnimationFrame(draw)
    }
  }, [canvasKit, width, height, animate, typeface, interactionState])

  // Setup and initial draw
  useEffect(() => {
    let mounted = true

    const initSurface = () => {
      if (!mounted) return
      const surface = setupSurface()
      if (surface && mounted) {
        draw()
      }
    }

    initSurface()

    return () => {
      mounted = false
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
        animationFrameRef.current = null
      }
      if (surfaceRef.current) {
        try {
          surfaceRef.current.delete()
        } catch {
          // Surface may already be invalid (context lost)
        }
        surfaceRef.current = null
      }
    }
  }, [setupSurface, draw])

  // Redraw when onDraw changes, theme changes, or interaction state changes
  useEffect(() => {
    if (surfaceRef.current && !animate) {
      draw()
    }
  }, [onDraw, draw, animate, isDark, interactionState])

  // Expose imperative methods
  useImperativeHandle(ref, () => ({
    redraw: () => {
      if (surfaceRef.current) {
        draw()
      }
    },
    getCanvas: () => canvasRef.current
  }), [draw])

  // Pointer event handlers
  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (!interactive || !canvasRef.current) return

      const normalized = normalizePointerEvent(e.nativeEvent, canvasRef.current)

      setInteractionState((prev) => ({
        ...prev,
        isPressed: true,
        pointerPosition: { x: normalized.x, y: normalized.y },
        activePointerId: e.pointerId
      }))

      // Capture pointer for drag operations
      canvasRef.current.setPointerCapture(e.pointerId)

      onPointerDown?.(normalized)
    },
    [interactive, onPointerDown]
  )

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!interactive || !canvasRef.current) return

      const normalized = normalizePointerEvent(e.nativeEvent, canvasRef.current)

      setInteractionState((prev) => ({
        ...prev,
        isHovering: true,
        pointerPosition: { x: normalized.x, y: normalized.y }
      }))

      onPointerMove?.(normalized)
    },
    [interactive, onPointerMove]
  )

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (!interactive || !canvasRef.current) return

      const normalized = normalizePointerEvent(e.nativeEvent, canvasRef.current)

      setInteractionState((prev) => ({
        ...prev,
        isPressed: false,
        activePointerId: null
      }))

      // Release pointer capture
      if (canvasRef.current.hasPointerCapture(e.pointerId)) {
        canvasRef.current.releasePointerCapture(e.pointerId)
      }

      onPointerUp?.(normalized)
    },
    [interactive, onPointerUp]
  )

  const handlePointerLeave = useCallback(() => {
    if (!interactive) return

    setInteractionState((prev) => ({
      ...prev,
      isHovering: false,
      pointerPosition: null
    }))

    onPointerLeave?.()
  }, [interactive, onPointerLeave])

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      if (!interactive || !canvasRef.current || !onWheel) return

      const rect = canvasRef.current.getBoundingClientRect()
      const position = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      }

      onWheel(e.nativeEvent, position)
    },
    [interactive, onWheel]
  )

  if (!canvasKit) {
    return (
      <div
        className={className}
        style={{
          width,
          height,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "var(--muted)",
          borderRadius: "var(--radius)",
          ...style
        }}
      >
        <span className="text-muted-foreground text-sm">Loading...</span>
      </div>
    )
  }

  return (
    <canvas
      ref={canvasRef}
      id={id}
      className={className}
      style={{
        width,
        height,
        cursor: interactive ? cursor : "default",
        touchAction: "none",
        ...style
      }}
      tabIndex={tabIndex}
      role={role}
      aria-label={ariaLabel}
      aria-valuenow={ariaValueNow}
      aria-valuemin={ariaValueMin}
      aria-valuemax={ariaValueMax}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerLeave}
      onPointerCancel={handlePointerUp}
      onWheel={handleWheel}
      onKeyDown={onKeyDown}
    />
  )
})

// Re-export interaction state type
export type { PointerEventData }
