"use client"

import { useCallback, useRef, useState } from "react"
import type { CanvasKit, Canvas, Typeface } from "canvaskit-wasm"
import {
  SkiaInteractiveCanvas,
  type InteractionState,
  type PointerEventData
} from "../skia-interactive-canvas"
import { createColor, getThemeColors, detectDarkMode, type ColorTuple } from "../utils/colors"
import { drawArcRing, drawLine } from "../primitives/shapes"
import { drawText, createFont } from "../primitives/text"
import { useAnimation, easing } from "../utils/animation"
import {
  degreesToRadians,
  radiansToDegrees,
  roundToStep
} from "../utils/math"
import { clamp, polarToCartesian } from "../utils/geometry"

export interface SkiaKnobProps {
  value: number
  min?: number
  max?: number
  step?: number
  onChange?: (value: number) => void
  onChangeEnd?: (value: number) => void
  size?: number
  className?: string
  disabled?: boolean
  showValue?: boolean
  showTicks?: boolean
  tickCount?: number
  startAngle?: number // In degrees
  endAngle?: number // In degrees
  color?: ColorTuple
  trackColor?: ColorTuple
  indicatorColor?: ColorTuple
  /**
   * Interaction mode for adjusting the knob value:
   * - "angular": Drag around the knob center like turning a real dial
   * - "vertical": Drag up/down to adjust (simple but disconnected from visual)
   * - "hybrid": Angular when near knob, vertical when dragged far (Ableton/FL Studio style)
   * - "relative": Distance from center controls sensitivity - farther = finer control (pro audio style)
   * - "circular": Track angle delta as you drag, not absolute position (Native Instruments style)
   */
  interactionMode?: "angular" | "vertical" | "hybrid" | "relative" | "circular"
  sensitivity?: number
  formatValue?: (value: number) => string
}

export function SkiaKnob({
  value,
  min = 0,
  max = 100,
  step = 1,
  onChange,
  onChangeEnd,
  size = 80,
  className,
  disabled = false,
  showValue = true,
  showTicks = true,
  tickCount = 11,
  startAngle = 135,
  endAngle = 405,
  color,
  trackColor,
  indicatorColor,
  interactionMode = "angular",
  sensitivity = 1,
  formatValue = (v) => v.toFixed(0)
}: SkiaKnobProps) {
  const [isDragging, setIsDragging] = useState(false)
  const dragStartRef = useRef<{ y: number; angle: number; value: number }>({ y: 0, angle: 0, value })
  const lastValueRef = useRef(value)
  const centerRef = useRef({ x: size / 2, y: size / 2 })

  // Animate value changes
  const [animatedValue] = useAnimation(value, {
    duration: 80,
    easing: easing.easeOutCubic
  })

  // Calculate angle from value
  const getAngleFromValue = useCallback(
    (val: number) => {
      const percent = (val - min) / (max - min)
      return startAngle + percent * (endAngle - startAngle)
    },
    [min, max, startAngle, endAngle]
  )

  // Calculate value from angle
  const getValueFromAngle = useCallback(
    (angle: number) => {
      // Normalize angle to be within the valid range
      const totalAngle = endAngle - startAngle
      const clampedAngle = clamp(angle, startAngle, endAngle)
      const percent = (clampedAngle - startAngle) / totalAngle
      const newValue = min + percent * (max - min)
      return roundToStep(clamp(newValue, min, max), step)
    },
    [min, max, step, startAngle, endAngle]
  )

  // Get angle from pointer position relative to knob center
  const getAngleFromPointer = useCallback(
    (x: number, y: number) => {
      const cx = centerRef.current.x
      const cy = centerRef.current.y
      // Calculate angle in degrees (0 = right, 90 = down, etc.)
      const dx = x - cx
      const dy = y - cy
      // atan2 returns radians, convert to degrees
      // Adjust so 0 degrees is at top and increases clockwise
      let angle = radiansToDegrees(Math.atan2(dy, dx)) + 90
      // Normalize to 0-360
      if (angle < 0) angle += 360
      // Map to our startAngle..endAngle range
      // Our knob typically goes from 135 to 405 (270 degree sweep)
      // We need to handle the wrap-around
      if (angle < startAngle - 45) {
        angle += 360
      }
      return angle
    },
    [startAngle]
  )

  // Calculate value from vertical drag delta
  const getValueFromVerticalDrag = useCallback(
    (startValue: number, deltaY: number) => {
      const range = max - min
      const pixelsPerUnit = (size * 2) / range
      const delta = (-deltaY / pixelsPerUnit) * sensitivity
      const newValue = startValue + delta
      return roundToStep(clamp(newValue, min, max), step)
    },
    [min, max, step, size, sensitivity]
  )

  const handlePointerDown = useCallback(
    (e: PointerEventData) => {
      if (disabled) return
      setIsDragging(true)
      const currentAngle = getAngleFromPointer(e.x, e.y)
      dragStartRef.current = { y: e.y, angle: currentAngle, value: value }
      lastValueRef.current = value
    },
    [disabled, value, getAngleFromPointer]
  )

  const handlePointerMove = useCallback(
    (e: PointerEventData) => {
      if (disabled || !isDragging) return

      let newValue: number
      const cx = centerRef.current.x
      const cy = centerRef.current.y
      const dx = e.x - cx
      const dy = e.y - cy
      const distance = Math.sqrt(dx * dx + dy * dy)

      switch (interactionMode) {
        case "vertical": {
          // Pure vertical mode - drag up/down
          const deltaY = e.y - dragStartRef.current.y
          newValue = getValueFromVerticalDrag(dragStartRef.current.value, deltaY)
          break
        }

        case "angular": {
          // Pure angular mode - drag around the knob (absolute position)
          const currentAngle = getAngleFromPointer(e.x, e.y)
          newValue = getValueFromAngle(currentAngle)
          break
        }

        case "hybrid": {
          // Hybrid mode - angular when close, vertical when far (Ableton/FL Studio)
          const threshold = size * 0.6

          if (distance < threshold) {
            const currentAngle = getAngleFromPointer(e.x, e.y)
            newValue = getValueFromAngle(currentAngle)
          } else {
            const deltaY = e.y - dragStartRef.current.y
            newValue = getValueFromVerticalDrag(dragStartRef.current.value, deltaY)
          }
          break
        }

        case "relative": {
          // Distance-from-center sensitivity - farther = finer control (pro audio)
          // Use vertical movement but scale sensitivity by distance from center
          const deltaY = e.y - dragStartRef.current.y
          const maxDistance = size * 2
          // Sensitivity decreases as you drag further from center
          // At center: 1x sensitivity, at maxDistance: 0.1x sensitivity
          const distanceFactor = Math.max(0.1, 1 - (distance / maxDistance) * 0.9)
          const range = max - min
          const pixelsPerUnit = (size * 2) / range
          const delta = (-deltaY / pixelsPerUnit) * sensitivity * distanceFactor
          const rawValue = dragStartRef.current.value + delta
          newValue = roundToStep(clamp(rawValue, min, max), step)
          break
        }

        case "circular": {
          // Circular gesture - track angle delta, not absolute (Native Instruments)
          // This allows continuous rotation without snapping to absolute position
          const currentAngle = getAngleFromPointer(e.x, e.y)
          let angleDelta = currentAngle - dragStartRef.current.angle

          // Handle wrap-around (e.g., going from 350 to 10 degrees)
          if (angleDelta > 180) angleDelta -= 360
          if (angleDelta < -180) angleDelta += 360

          // Convert angle delta to value delta
          const totalAngle = endAngle - startAngle
          const valueDelta = (angleDelta / totalAngle) * (max - min) * sensitivity
          const rawValue = dragStartRef.current.value + valueDelta
          newValue = roundToStep(clamp(rawValue, min, max), step)

          // Update the start angle for continuous tracking
          dragStartRef.current.angle = currentAngle
          dragStartRef.current.value = newValue
          break
        }

        default:
          newValue = lastValueRef.current
      }

      if (newValue !== lastValueRef.current) {
        lastValueRef.current = newValue
        onChange?.(newValue)
      }
    },
    [disabled, isDragging, interactionMode, size, min, max, step, startAngle, endAngle, sensitivity, getAngleFromPointer, getValueFromAngle, getValueFromVerticalDrag, onChange]
  )

  const handlePointerUp = useCallback(() => {
    if (isDragging) {
      setIsDragging(false)
      onChangeEnd?.(lastValueRef.current)
    }
  }, [isDragging, onChangeEnd])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (disabled) return

      let delta = 0
      switch (e.key) {
        case "ArrowUp":
        case "ArrowRight":
          delta = step
          break
        case "ArrowDown":
        case "ArrowLeft":
          delta = -step
          break
        case "PageUp":
          delta = step * 10
          break
        case "PageDown":
          delta = -step * 10
          break
        case "Home":
          onChange?.(min)
          onChangeEnd?.(min)
          return
        case "End":
          onChange?.(max)
          onChangeEnd?.(max)
          return
        default:
          return
      }

      e.preventDefault()
      const newValue = clamp(value + delta, min, max)
      if (newValue !== value) {
        onChange?.(newValue)
        onChangeEnd?.(newValue)
      }
    },
    [disabled, value, min, max, step, onChange, onChangeEnd]
  )

  const draw = useCallback(
    (
      canvas: Canvas,
      ck: CanvasKit,
      w: number,
      h: number,
      typeface: Typeface | null,
      state: InteractionState
    ) => {
      const isDark = detectDarkMode()
      const theme = getThemeColors(isDark)

      // Clear background
      canvas.clear(createColor(ck, [0, 0, 0, 0]))

      const cx = w / 2
      const cy = h / 2
      const outerRadius = Math.min(w, h) / 2 - 4
      const trackWidth = 6
      const innerRadius = outerRadius - trackWidth

      // Colors
      const activeColor = color || [0.2, 0.6, 1.0, 1.0] as ColorTuple
      const bgColor = trackColor || theme.grid
      const indicatorFillColor = indicatorColor || activeColor

      // Draw track background
      const trackPaint = new ck.Paint()
      trackPaint.setColor(createColor(ck, disabled ? theme.textMuted : bgColor))
      trackPaint.setAntiAlias(true)

      drawArcRing(
        canvas,
        ck,
        cx,
        cy,
        innerRadius,
        outerRadius,
        startAngle,
        endAngle - startAngle,
        trackPaint
      )

      // Draw filled arc
      const fillPaint = new ck.Paint()
      fillPaint.setColor(
        createColor(ck, disabled ? theme.textMuted : activeColor)
      )
      fillPaint.setAntiAlias(true)

      const currentAngle = getAngleFromValue(animatedValue)
      const sweepAngle = currentAngle - startAngle

      if (sweepAngle > 0) {
        drawArcRing(
          canvas,
          ck,
          cx,
          cy,
          innerRadius,
          outerRadius,
          startAngle,
          sweepAngle,
          fillPaint
        )
      }

      // Draw ticks
      if (showTicks) {
        const tickPaint = new ck.Paint()
        tickPaint.setColor(createColor(ck, theme.textMuted))
        tickPaint.setStrokeWidth(1)
        tickPaint.setAntiAlias(true)

        for (let i = 0; i < tickCount; i++) {
          const tickAngle = startAngle + (i / (tickCount - 1)) * (endAngle - startAngle)
          const tickAngleRad = degreesToRadians(tickAngle)
          const tickInner = polarToCartesian(cx, cy, outerRadius + 4, tickAngleRad)
          const tickOuter = polarToCartesian(cx, cy, outerRadius + 8, tickAngleRad)
          drawLine(canvas, ck, tickInner.x, tickInner.y, tickOuter.x, tickOuter.y, tickPaint)
        }

        tickPaint.delete()
      }

      // Draw indicator line
      const indicatorPaint = new ck.Paint()
      indicatorPaint.setColor(
        createColor(ck, disabled ? theme.textMuted : indicatorFillColor)
      )
      indicatorPaint.setStrokeWidth(3)
      indicatorPaint.setStrokeCap(ck.StrokeCap.Round)
      indicatorPaint.setAntiAlias(true)

      const indicatorAngleRad = degreesToRadians(currentAngle)
      const indicatorStart = polarToCartesian(cx, cy, innerRadius * 0.3, indicatorAngleRad)
      const indicatorEnd = polarToCartesian(cx, cy, innerRadius * 0.7, indicatorAngleRad)
      drawLine(canvas, ck, indicatorStart.x, indicatorStart.y, indicatorEnd.x, indicatorEnd.y, indicatorPaint)

      // Draw center dot
      const centerPaint = new ck.Paint()
      centerPaint.setColor(createColor(ck, disabled ? theme.textMuted : indicatorFillColor))
      centerPaint.setAntiAlias(true)
      canvas.drawCircle(cx, cy, 4, centerPaint)

      // Draw value
      if (showValue) {
        const font = createFont(ck, typeface, 14)
        const textPaint = new ck.Paint()
        textPaint.setColor(createColor(ck, theme.text))
        textPaint.setAntiAlias(true)

        drawText(
          canvas,
          ck,
          formatValue(animatedValue),
          cx,
          cy + innerRadius * 0.4,
          font,
          textPaint,
          "center"
        )

        font.delete()
        textPaint.delete()
      }

      // Hover/focus ring
      if ((state.isHovering || isDragging) && !disabled) {
        const focusPaint = new ck.Paint()
        focusPaint.setColor(createColor(ck, [activeColor[0], activeColor[1], activeColor[2], 0.2]))
        focusPaint.setStyle(ck.PaintStyle.Stroke)
        focusPaint.setStrokeWidth(2)
        focusPaint.setAntiAlias(true)
        canvas.drawCircle(cx, cy, outerRadius + 2, focusPaint)
        focusPaint.delete()
      }

      // Cleanup
      trackPaint.delete()
      fillPaint.delete()
      indicatorPaint.delete()
      centerPaint.delete()
    },
    [
      animatedValue,
      disabled,
      startAngle,
      endAngle,
      showTicks,
      tickCount,
      showValue,
      color,
      trackColor,
      indicatorColor,
      isDragging,
      getAngleFromValue,
      formatValue
    ]
  )

  return (
    <div
      role="slider"
      aria-valuenow={value}
      aria-valuemin={min}
      aria-valuemax={max}
      aria-disabled={disabled}
      tabIndex={disabled ? -1 : 0}
      onKeyDown={handleKeyDown}
      className={className}
      style={{ outline: "none", display: "inline-block" }}
    >
      <SkiaInteractiveCanvas
        width={size}
        height={size}
        onDraw={draw}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        interactive={!disabled}
        cursor={
          disabled
            ? "not-allowed"
            : isDragging
              ? interactionMode === "vertical" || interactionMode === "relative"
                ? "ns-resize"
                : "grabbing"
              : "grab"
        }
      />
    </div>
  )
}
