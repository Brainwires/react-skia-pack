"use client"

import {
  useRef,
  useEffect,
  useCallback,
  useState,
  type CSSProperties
} from "react"
import type { CanvasKit, Surface, Canvas, Typeface } from "canvaskit-wasm"
import { useCanvasKit, useTypeface } from "./skia-provider"

export interface SkiaCanvasProps {
  width?: number
  height?: number
  className?: string
  style?: CSSProperties
  onDraw: (canvas: Canvas, ck: CanvasKit, width: number, height: number, typeface: Typeface | null) => void
  animate?: boolean
  id?: string
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

export function SkiaCanvas({
  width = 400,
  height = 300,
  className,
  style,
  onDraw,
  animate = false,
  id
}: SkiaCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const surfaceRef = useRef<Surface | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  const canvasKit = useCanvasKit()
  const typeface = useTypeface()
  const isDark = useThemeObserver()

  // Stable reference for draw callback
  const drawRef = useRef(onDraw)
  drawRef.current = onDraw

  // Create or recreate surface when dimensions change
  const setupSurface = useCallback(() => {
    if (!canvasKit || !canvasRef.current) return null

    // Clean up existing surface
    if (surfaceRef.current) {
      surfaceRef.current.delete()
      surfaceRef.current = null
    }

    // Set canvas dimensions
    const canvas = canvasRef.current
    const dpr = window.devicePixelRatio || 1
    canvas.width = width * dpr
    canvas.height = height * dpr

    // Create surface
    const surface = canvasKit.MakeCanvasSurface(canvas)
    if (!surface) {
      console.error("[SkiaCanvas] Failed to create surface")
      return null
    }

    surfaceRef.current = surface
    return surface
  }, [canvasKit, width, height])

  // Draw function
  const draw = useCallback(() => {
    if (!canvasKit || !surfaceRef.current) return

    const surface = surfaceRef.current
    const canvas = surface.getCanvas()
    const dpr = window.devicePixelRatio || 1

    // Scale for device pixel ratio
    canvas.save()
    canvas.scale(dpr, dpr)

    // Call user's draw function with typeface
    drawRef.current(canvas, canvasKit, width, height, typeface)

    canvas.restore()

    // Flush to display
    surface.flush()

    // Continue animation loop if enabled
    if (animate) {
      animationFrameRef.current = requestAnimationFrame(draw)
    }
  }, [canvasKit, width, height, animate, typeface])

  // Setup and initial draw
  useEffect(() => {
    const surface = setupSurface()
    if (surface) {
      draw()
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
        animationFrameRef.current = null
      }
      if (surfaceRef.current) {
        surfaceRef.current.delete()
        surfaceRef.current = null
      }
    }
  }, [setupSurface, draw])

  // Redraw when onDraw changes or theme changes (but not animate)
  useEffect(() => {
    if (surfaceRef.current && !animate) {
      draw()
    }
  }, [onDraw, draw, animate, isDark])

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
        <span className="text-muted-foreground text-sm">Loading chart...</span>
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
        ...style
      }}
    />
  )
}

// Hook for manual redraws
export function useSkiaRedraw() {
  const canvasKit = useCanvasKit()
  const redrawCallbacks = useRef<Set<() => void>>(new Set())

  const registerRedraw = useCallback((callback: () => void) => {
    redrawCallbacks.current.add(callback)
    return () => {
      redrawCallbacks.current.delete(callback)
    }
  }, [])

  const triggerRedraw = useCallback(() => {
    redrawCallbacks.current.forEach((cb) => cb())
  }, [])

  return { canvasKit, registerRedraw, triggerRedraw }
}
