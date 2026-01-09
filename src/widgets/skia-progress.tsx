"use client"

import { useCallback } from "react"
import type { CanvasKit, Canvas, Typeface } from "canvaskit-wasm"
import { SkiaCanvas } from "../skia-canvas"
import { createColor, getThemeColors, detectDarkMode, type ColorTuple } from "../utils/colors"
import { drawRoundedRect } from "../primitives/shapes"
import { drawText, createFont } from "../primitives/text"
import { useAnimation, easing } from "../utils/animation"

export interface SkiaProgressProps {
  value: number // 0-100
  width?: number
  height?: number
  className?: string
  variant?: "linear" | "circular" | "semicircular"
  color?: ColorTuple
  trackColor?: ColorTuple
  showValue?: boolean
  animate?: boolean
  animationDuration?: number
  strokeWidth?: number
  formatValue?: (value: number) => string
}

export function SkiaProgress({
  value,
  width = 200,
  height,
  className,
  variant = "linear",
  color,
  trackColor,
  showValue = false,
  animate = true,
  animationDuration = 300,
  strokeWidth,
  formatValue = (v) => `${Math.round(v)}%`
}: SkiaProgressProps) {
  // Clamp value to 0-100
  const clampedValue = Math.max(0, Math.min(100, value))

  // Animate value changes
  const [animatedValue] = useAnimation(clampedValue, {
    duration: animate ? animationDuration : 0,
    easing: easing.easeOutCubic,
    immediate: !animate
  })

  // Calculate dimensions based on variant
  const actualHeight = height ?? (variant === "linear" ? 8 : width)
  const actualStrokeWidth = strokeWidth ?? (variant === "linear" ? actualHeight : Math.max(4, width / 10))

  const draw = useCallback(
    (canvas: Canvas, ck: CanvasKit, w: number, h: number, typeface: Typeface | null) => {
      const isDark = detectDarkMode()
      const theme = getThemeColors(isDark)

      // Clear background
      canvas.clear(createColor(ck, [0, 0, 0, 0]))

      // Colors
      const progressColor = color || [0.2, 0.6, 1.0, 1.0] as ColorTuple
      const bgColor = trackColor || theme.grid

      const trackPaint = new ck.Paint()
      trackPaint.setColor(createColor(ck, bgColor))
      trackPaint.setAntiAlias(true)

      const fillPaint = new ck.Paint()
      fillPaint.setColor(createColor(ck, progressColor))
      fillPaint.setAntiAlias(true)

      const textPaint = new ck.Paint()
      textPaint.setColor(createColor(ck, theme.text))
      textPaint.setAntiAlias(true)

      if (variant === "linear") {
        // Linear progress bar
        const barHeight = actualStrokeWidth
        const y = (h - barHeight) / 2
        const radius = barHeight / 2

        // Track
        drawRoundedRect(canvas, ck, 0, y, w, barHeight, radius, trackPaint)

        // Fill
        const fillWidth = (animatedValue / 100) * w
        if (fillWidth > 0) {
          drawRoundedRect(canvas, ck, 0, y, fillWidth, barHeight, radius, fillPaint)
        }

        // Value label
        if (showValue) {
          const font = createFont(ck, typeface, 12)
          drawText(
            canvas,
            ck,
            formatValue(animatedValue),
            w / 2,
            y - 8,
            font,
            textPaint,
            "center"
          )
          font.delete()
        }
      } else if (variant === "circular") {
        // Circular progress
        const cx = w / 2
        const cy = h / 2
        const radius = Math.min(w, h) / 2 - actualStrokeWidth / 2

        // Track ring
        trackPaint.setStyle(ck.PaintStyle.Stroke)
        trackPaint.setStrokeWidth(actualStrokeWidth)
        canvas.drawCircle(cx, cy, radius, trackPaint)

        // Progress arc
        if (animatedValue > 0) {
          fillPaint.setStyle(ck.PaintStyle.Stroke)
          fillPaint.setStrokeWidth(actualStrokeWidth)
          fillPaint.setStrokeCap(ck.StrokeCap.Round)

          const startAngle = -90 // Start from top
          const sweepAngle = (animatedValue / 100) * 360

          const rect = ck.LTRBRect(
            cx - radius,
            cy - radius,
            cx + radius,
            cy + radius
          )
          canvas.drawArc(rect, startAngle, sweepAngle, false, fillPaint)
        }

        // Value label
        if (showValue) {
          const fontSize = Math.max(12, radius / 2)
          const font = createFont(ck, typeface, fontSize)
          drawText(
            canvas,
            ck,
            formatValue(animatedValue),
            cx,
            cy + fontSize / 3,
            font,
            textPaint,
            "center"
          )
          font.delete()
        }
      } else if (variant === "semicircular") {
        // Semicircular (gauge-like) progress
        const cx = w / 2
        const cy = h * 0.8
        const radius = Math.min(w / 2, h * 0.75) - actualStrokeWidth / 2

        // Track arc (180 degrees)
        trackPaint.setStyle(ck.PaintStyle.Stroke)
        trackPaint.setStrokeWidth(actualStrokeWidth)
        trackPaint.setStrokeCap(ck.StrokeCap.Round)

        const rect = ck.LTRBRect(
          cx - radius,
          cy - radius,
          cx + radius,
          cy + radius
        )
        canvas.drawArc(rect, 180, 180, false, trackPaint)

        // Progress arc
        if (animatedValue > 0) {
          fillPaint.setStyle(ck.PaintStyle.Stroke)
          fillPaint.setStrokeWidth(actualStrokeWidth)
          fillPaint.setStrokeCap(ck.StrokeCap.Round)

          const sweepAngle = (animatedValue / 100) * 180
          canvas.drawArc(rect, 180, sweepAngle, false, fillPaint)
        }

        // Value label
        if (showValue) {
          const fontSize = Math.max(12, radius / 2.5)
          const font = createFont(ck, typeface, fontSize)
          drawText(
            canvas,
            ck,
            formatValue(animatedValue),
            cx,
            cy - radius / 3,
            font,
            textPaint,
            "center"
          )
          font.delete()
        }
      }

      // Cleanup
      trackPaint.delete()
      fillPaint.delete()
      textPaint.delete()
    },
    [animatedValue, variant, color, trackColor, showValue, actualStrokeWidth, formatValue]
  )

  return (
    <SkiaCanvas
      width={width}
      height={actualHeight}
      className={className}
      onDraw={draw}
    />
  )
}

// Indeterminate progress component
export interface SkiaIndeterminateProgressProps {
  width?: number
  height?: number
  className?: string
  variant?: "linear" | "circular"
  color?: ColorTuple
  trackColor?: ColorTuple
  strokeWidth?: number
}

export function SkiaIndeterminateProgress({
  width = 200,
  height,
  className,
  variant = "linear",
  color,
  trackColor,
  strokeWidth
}: SkiaIndeterminateProgressProps) {
  const actualHeight = height ?? (variant === "linear" ? 4 : width)
  const actualStrokeWidth = strokeWidth ?? (variant === "linear" ? actualHeight : Math.max(4, width / 10))

  const draw = useCallback(
    (canvas: Canvas, ck: CanvasKit, w: number, h: number) => {
      const isDark = detectDarkMode()
      const theme = getThemeColors(isDark)
      const time = Date.now() / 1000

      // Clear background
      canvas.clear(createColor(ck, [0, 0, 0, 0]))

      const progressColor = color || [0.2, 0.6, 1.0, 1.0] as ColorTuple
      const bgColor = trackColor || theme.grid

      const trackPaint = new ck.Paint()
      trackPaint.setColor(createColor(ck, bgColor))
      trackPaint.setAntiAlias(true)

      const fillPaint = new ck.Paint()
      fillPaint.setColor(createColor(ck, progressColor))
      fillPaint.setAntiAlias(true)

      if (variant === "linear") {
        // Animated linear progress
        const barHeight = actualStrokeWidth
        const y = (h - barHeight) / 2
        const radius = barHeight / 2

        // Track
        drawRoundedRect(canvas, ck, 0, y, w, barHeight, radius, trackPaint)

        // Animated fill (moves back and forth)
        const fillWidth = w * 0.3
        const cycle = (time % 2) / 2 // 0 to 1 over 2 seconds
        const position = cycle < 0.5
          ? cycle * 2 * (w - fillWidth) // Moving right
          : (1 - (cycle - 0.5) * 2) * (w - fillWidth) // Moving left

        drawRoundedRect(canvas, ck, position, y, fillWidth, barHeight, radius, fillPaint)
      } else {
        // Animated circular progress
        const cx = w / 2
        const cy = h / 2
        const radius = Math.min(w, h) / 2 - actualStrokeWidth / 2

        // Track ring
        trackPaint.setStyle(ck.PaintStyle.Stroke)
        trackPaint.setStrokeWidth(actualStrokeWidth)
        canvas.drawCircle(cx, cy, radius, trackPaint)

        // Rotating arc
        fillPaint.setStyle(ck.PaintStyle.Stroke)
        fillPaint.setStrokeWidth(actualStrokeWidth)
        fillPaint.setStrokeCap(ck.StrokeCap.Round)

        const rotation = (time * 360) % 360
        const rect = ck.LTRBRect(
          cx - radius,
          cy - radius,
          cx + radius,
          cy + radius
        )
        canvas.drawArc(rect, rotation - 90, 90, false, fillPaint)
      }

      // Cleanup
      trackPaint.delete()
      fillPaint.delete()
    },
    [variant, color, trackColor, actualStrokeWidth]
  )

  return (
    <SkiaCanvas
      width={width}
      height={actualHeight}
      className={className}
      onDraw={draw}
      animate={true}
    />
  )
}
