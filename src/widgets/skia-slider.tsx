"use client"

import { useCallback, useMemo, useRef, useState } from "react"
import type { CanvasKit, Canvas, Typeface } from "canvaskit-wasm"
import {
  SkiaInteractiveCanvas,
  type InteractionState,
  type PointerEventData
} from "../skia-interactive-canvas"
import { createColor, getThemeColors, detectDarkMode, type ColorTuple } from "../utils/colors"
import { clamp } from "../utils/geometry"
import { roundToStep } from "../utils/math"
import { drawRoundedRect } from "../primitives/shapes"
import { drawText, createFont } from "../primitives/text"
import { useAnimation, easing } from "../utils/animation"
import { keyToDirection, directionToValue } from "../utils/interaction"

export interface SkiaSliderProps {
  value: number
  min?: number
  max?: number
  step?: number
  onChange?: (value: number) => void
  onChangeEnd?: (value: number) => void
  width?: number
  height?: number
  className?: string
  orientation?: "horizontal" | "vertical"
  disabled?: boolean
  showValue?: boolean
  showTicks?: boolean
  tickCount?: number
  trackColor?: ColorTuple
  fillColor?: ColorTuple
  thumbColor?: ColorTuple
  thumbRadius?: number
  formatValue?: (value: number) => string
}

export function SkiaSlider({
  value,
  min = 0,
  max = 100,
  step = 1,
  onChange,
  onChangeEnd,
  width = 200,
  height = 40,
  className,
  orientation = "horizontal",
  disabled = false,
  showValue = false,
  showTicks = false,
  tickCount = 5,
  trackColor,
  fillColor,
  thumbColor,
  thumbRadius = 8,
  formatValue = (v) => v.toFixed(0)
}: SkiaSliderProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [hoverValue, setHoverValue] = useState<number | null>(null)
  const lastValueRef = useRef(value)

  // Animate thumb position
  const [animatedValue] = useAnimation(value, {
    duration: 100,
    easing: easing.easeOutCubic
  })

  const isHorizontal = orientation === "horizontal"
  // const trackHeight = isHorizontal ? 4 : width
  // const trackWidth = isHorizontal ? width : 4

  // Calculate thumb position from value
  const getThumbPosition = useCallback(
    (val: number) => {
      const percent = (val - min) / (max - min)
      if (isHorizontal) {
        return thumbRadius + percent * (width - thumbRadius * 2)
      } else {
        return height - thumbRadius - percent * (height - thumbRadius * 2)
      }
    },
    [min, max, width, height, thumbRadius, isHorizontal]
  )

  // Calculate value from position
  const getValueFromPosition = useCallback(
    (x: number, y: number) => {
      let percent: number
      if (isHorizontal) {
        percent = (x - thumbRadius) / (width - thumbRadius * 2)
      } else {
        percent = 1 - (y - thumbRadius) / (height - thumbRadius * 2)
      }
      percent = clamp(percent, 0, 1)
      const rawValue = min + percent * (max - min)
      return roundToStep(rawValue, step)
    },
    [min, max, step, width, height, thumbRadius, isHorizontal]
  )

  const handlePointerDown = useCallback(
    (e: PointerEventData) => {
      if (disabled) return
      setIsDragging(true)
      const newValue = getValueFromPosition(e.x, e.y)
      if (newValue !== lastValueRef.current) {
        lastValueRef.current = newValue
        onChange?.(newValue)
      }
    },
    [disabled, getValueFromPosition, onChange]
  )

  const handlePointerMove = useCallback(
    (e: PointerEventData) => {
      if (disabled) return

      const newValue = getValueFromPosition(e.x, e.y)
      setHoverValue(newValue)

      if (isDragging && newValue !== lastValueRef.current) {
        lastValueRef.current = newValue
        onChange?.(newValue)
      }
    },
    [disabled, isDragging, getValueFromPosition, onChange]
  )

  const handlePointerUp = useCallback(() => {
    if (isDragging) {
      setIsDragging(false)
      onChangeEnd?.(lastValueRef.current)
    }
  }, [isDragging, onChangeEnd])

  const handlePointerLeave = useCallback(() => {
    setHoverValue(null)
  }, [])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (disabled) return

      const direction = keyToDirection(e.key)
      if (direction) {
        e.preventDefault()
        const delta = directionToValue(direction, orientation) * step
        const newValue = clamp(value + delta, min, max)
        if (newValue !== value) {
          onChange?.(newValue)
          onChangeEnd?.(newValue)
        }
      } else if (e.key === "Home") {
        e.preventDefault()
        onChange?.(min)
        onChangeEnd?.(min)
      } else if (e.key === "End") {
        e.preventDefault()
        onChange?.(max)
        onChangeEnd?.(max)
      }
    },
    [disabled, value, min, max, step, orientation, onChange, onChangeEnd]
  )

  // Calculate tick positions
  const ticks = useMemo(() => {
    if (!showTicks) return []
    const result: number[] = []
    for (let i = 0; i <= tickCount; i++) {
      result.push(min + (i / tickCount) * (max - min))
    }
    return result
  }, [showTicks, tickCount, min, max])

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

      const thumbPos = getThumbPosition(animatedValue)
      const centerY = h / 2
      const centerX = w / 2

      // Create paints
      const trackPaint = new ck.Paint()
      trackPaint.setColor(
        createColor(ck, trackColor || theme.grid)
      )
      trackPaint.setAntiAlias(true)

      const fillPaint = new ck.Paint()
      fillPaint.setColor(
        createColor(
          ck,
          disabled
            ? theme.textMuted
            : fillColor || [0.2, 0.6, 1.0, 1.0]
        )
      )
      fillPaint.setAntiAlias(true)

      const thumbPaint = new ck.Paint()
      thumbPaint.setColor(
        createColor(
          ck,
          disabled
            ? theme.textMuted
            : thumbColor || [1, 1, 1, 1]
        )
      )
      thumbPaint.setAntiAlias(true)

      const thumbBorderPaint = new ck.Paint()
      thumbBorderPaint.setColor(createColor(ck, fillColor || [0.2, 0.6, 1.0, 1.0]))
      thumbBorderPaint.setStyle(ck.PaintStyle.Stroke)
      thumbBorderPaint.setStrokeWidth(2)
      thumbBorderPaint.setAntiAlias(true)

      if (isHorizontal) {
        // Draw track background
        const trackY = centerY - 2
        drawRoundedRect(canvas, ck, 0, trackY, w, 4, 2, trackPaint)

        // Draw filled portion
        drawRoundedRect(canvas, ck, 0, trackY, thumbPos, 4, 2, fillPaint)

        // Draw ticks
        if (showTicks) {
          const tickPaint = new ck.Paint()
          tickPaint.setColor(createColor(ck, theme.textMuted))
          tickPaint.setAntiAlias(true)

          for (const tick of ticks) {
            const tickX = getThumbPosition(tick)
            canvas.drawLine(tickX, centerY + 8, tickX, centerY + 14, tickPaint)
          }

          tickPaint.delete()
        }

        // Draw thumb
        const thumbScale = state.isPressed || isDragging ? 1.2 : state.isHovering ? 1.1 : 1
        const actualRadius = thumbRadius * thumbScale

        canvas.drawCircle(thumbPos, centerY, actualRadius, thumbPaint)
        canvas.drawCircle(thumbPos, centerY, actualRadius, thumbBorderPaint)

        // Draw value label
        if (showValue) {
          const font = createFont(ck, typeface, 12)
          const textPaint = new ck.Paint()
          textPaint.setColor(createColor(ck, theme.text))
          textPaint.setAntiAlias(true)

          const displayValue = hoverValue !== null && state.isHovering ? hoverValue : value
          drawText(canvas, ck, formatValue(displayValue), thumbPos, centerY - 20, font, textPaint, "center")

          font.delete()
          textPaint.delete()
        }
      } else {
        // Vertical orientation
        const trackX = centerX - 2
        drawRoundedRect(canvas, ck, trackX, 0, 4, h, 2, trackPaint)

        // Draw filled portion (from bottom)
        const fillHeight = h - thumbPos
        drawRoundedRect(canvas, ck, trackX, thumbPos, 4, fillHeight, 2, fillPaint)

        // Draw ticks
        if (showTicks) {
          const tickPaint = new ck.Paint()
          tickPaint.setColor(createColor(ck, theme.textMuted))
          tickPaint.setAntiAlias(true)

          for (const tick of ticks) {
            const tickY = getThumbPosition(tick)
            canvas.drawLine(centerX + 8, tickY, centerX + 14, tickY, tickPaint)
          }

          tickPaint.delete()
        }

        // Draw thumb
        const thumbScale = state.isPressed || isDragging ? 1.2 : state.isHovering ? 1.1 : 1
        const actualRadius = thumbRadius * thumbScale

        canvas.drawCircle(centerX, thumbPos, actualRadius, thumbPaint)
        canvas.drawCircle(centerX, thumbPos, actualRadius, thumbBorderPaint)

        // Draw value label
        if (showValue) {
          const font = createFont(ck, typeface, 12)
          const textPaint = new ck.Paint()
          textPaint.setColor(createColor(ck, theme.text))
          textPaint.setAntiAlias(true)

          const displayValue = hoverValue !== null && state.isHovering ? hoverValue : value
          drawText(canvas, ck, formatValue(displayValue), centerX + 24, thumbPos + 4, font, textPaint, "left")

          font.delete()
          textPaint.delete()
        }
      }

      // Cleanup
      trackPaint.delete()
      fillPaint.delete()
      thumbPaint.delete()
      thumbBorderPaint.delete()
    },
    [
      animatedValue,
      value,
      disabled,
      isHorizontal,
      thumbRadius,
      trackColor,
      fillColor,
      thumbColor,
      showValue,
      showTicks,
      ticks,
      hoverValue,
      isDragging,
      getThumbPosition,
      formatValue
    ]
  )

  return (
    <div
      role="slider"
      aria-valuenow={value}
      aria-valuemin={min}
      aria-valuemax={max}
      aria-orientation={orientation}
      aria-disabled={disabled}
      tabIndex={disabled ? -1 : 0}
      onKeyDown={handleKeyDown}
      className={className}
      style={{ outline: "none" }}
    >
      <SkiaInteractiveCanvas
        width={width}
        height={height}
        onDraw={draw}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerLeave}
        interactive={!disabled}
        cursor={disabled ? "not-allowed" : isDragging ? "grabbing" : "pointer"}
      />
    </div>
  )
}
