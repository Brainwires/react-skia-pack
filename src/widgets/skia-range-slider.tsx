"use client"

import { useCallback, useRef, useState } from "react"
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

export interface SkiaRangeSliderProps {
  value: [number, number]
  min?: number
  max?: number
  step?: number
  onChange?: (value: [number, number]) => void
  onChangeEnd?: (value: [number, number]) => void
  width?: number
  height?: number
  className?: string
  orientation?: "horizontal" | "vertical"
  disabled?: boolean
  showValues?: boolean
  minGap?: number
  trackColor?: ColorTuple
  fillColor?: ColorTuple
  thumbColor?: ColorTuple
  thumbRadius?: number
  formatValue?: (value: number) => string
}

type ThumbType = "start" | "end" | null

export function SkiaRangeSlider({
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
  showValues = false,
  minGap = 0,
  trackColor,
  fillColor,
  thumbColor,
  thumbRadius = 8,
  formatValue = (v) => v.toFixed(0)
}: SkiaRangeSliderProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [activeThumb, setActiveThumb] = useState<ThumbType>(null)
  const [focusedThumb, setFocusedThumb] = useState<ThumbType>("start")
  const lastValueRef = useRef(value)

  // Animate thumb positions
  const [animatedStart] = useAnimation(value[0], {
    duration: 80,
    easing: easing.easeOutCubic
  })
  const [animatedEnd] = useAnimation(value[1], {
    duration: 80,
    easing: easing.easeOutCubic
  })

  const isHorizontal = orientation === "horizontal"

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

  // Determine which thumb to move based on click position
  const getNearestThumb = useCallback(
    (x: number, y: number): ThumbType => {
      const startPos = getThumbPosition(value[0])
      const endPos = getThumbPosition(value[1])

      if (isHorizontal) {
        const distToStart = Math.abs(x - startPos)
        const distToEnd = Math.abs(x - endPos)
        return distToStart <= distToEnd ? "start" : "end"
      } else {
        const distToStart = Math.abs(y - startPos)
        const distToEnd = Math.abs(y - endPos)
        return distToStart <= distToEnd ? "start" : "end"
      }
    },
    [value, getThumbPosition, isHorizontal]
  )

  const handlePointerDown = useCallback(
    (e: PointerEventData) => {
      if (disabled) return

      const thumb = getNearestThumb(e.x, e.y)
      setActiveThumb(thumb)
      setFocusedThumb(thumb)
      setIsDragging(true)

      const newValue = getValueFromPosition(e.x, e.y)
      const [start, end] = value

      let newRange: [number, number]
      if (thumb === "start") {
        const constrainedStart = Math.min(newValue, end - minGap)
        newRange = [constrainedStart, end]
      } else {
        const constrainedEnd = Math.max(newValue, start + minGap)
        newRange = [start, constrainedEnd]
      }

      if (newRange[0] !== value[0] || newRange[1] !== value[1]) {
        lastValueRef.current = newRange
        onChange?.(newRange)
      }
    },
    [disabled, getNearestThumb, getValueFromPosition, value, minGap, onChange]
  )

  const handlePointerMove = useCallback(
    (e: PointerEventData) => {
      if (disabled || !isDragging || !activeThumb) return

      const newValue = getValueFromPosition(e.x, e.y)
      const [start, end] = lastValueRef.current

      let newRange: [number, number]
      if (activeThumb === "start") {
        const constrainedStart = Math.min(newValue, end - minGap)
        newRange = [constrainedStart, end]
      } else {
        const constrainedEnd = Math.max(newValue, start + minGap)
        newRange = [start, constrainedEnd]
      }

      if (newRange[0] !== lastValueRef.current[0] || newRange[1] !== lastValueRef.current[1]) {
        lastValueRef.current = newRange
        onChange?.(newRange)
      }
    },
    [disabled, isDragging, activeThumb, getValueFromPosition, minGap, onChange]
  )

  const handlePointerUp = useCallback(() => {
    if (isDragging) {
      setIsDragging(false)
      setActiveThumb(null)
      onChangeEnd?.(lastValueRef.current)
    }
  }, [isDragging, onChangeEnd])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (disabled || !focusedThumb) return

      const direction = keyToDirection(e.key)
      if (direction) {
        e.preventDefault()
        const delta = directionToValue(direction, orientation) * step
        const [start, end] = value

        let newRange: [number, number]
        if (focusedThumb === "start") {
          const newStart = clamp(start + delta, min, end - minGap)
          newRange = [newStart, end]
        } else {
          const newEnd = clamp(end + delta, start + minGap, max)
          newRange = [start, newEnd]
        }

        if (newRange[0] !== value[0] || newRange[1] !== value[1]) {
          onChange?.(newRange)
          onChangeEnd?.(newRange)
        }
      } else if (e.key === "Tab") {
        // Switch between thumbs
        setFocusedThumb(focusedThumb === "start" ? "end" : "start")
      }
    },
    [disabled, focusedThumb, value, min, max, step, minGap, orientation, onChange, onChangeEnd]
  )

  const draw = useCallback(
    (
      canvas: Canvas,
      ck: CanvasKit,
      w: number,
      h: number,
      typeface: Typeface | null,
      _state: InteractionState
    ) => {
      const isDark = detectDarkMode()
      const theme = getThemeColors(isDark)

      // Clear background
      canvas.clear(createColor(ck, [0, 0, 0, 0]))

      const startPos = getThumbPosition(animatedStart)
      const endPos = getThumbPosition(animatedEnd)
      const centerY = h / 2
      const centerX = w / 2

      // Create paints
      const trackPaint = new ck.Paint()
      trackPaint.setColor(createColor(ck, trackColor || theme.grid))
      trackPaint.setAntiAlias(true)

      const fillPaint = new ck.Paint()
      fillPaint.setColor(
        createColor(ck, disabled ? theme.textMuted : fillColor || [0.2, 0.6, 1.0, 1.0])
      )
      fillPaint.setAntiAlias(true)

      const thumbPaint = new ck.Paint()
      thumbPaint.setColor(createColor(ck, disabled ? theme.textMuted : thumbColor || [1, 1, 1, 1]))
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

        // Draw filled portion between thumbs
        const fillStart = Math.min(startPos, endPos)
        const fillEnd = Math.max(startPos, endPos)
        drawRoundedRect(canvas, ck, fillStart, trackY, fillEnd - fillStart, 4, 2, fillPaint)

        // Draw start thumb
        const startScale = (activeThumb === "start" && isDragging) || focusedThumb === "start" ? 1.15 : 1
        canvas.drawCircle(startPos, centerY, thumbRadius * startScale, thumbPaint)
        canvas.drawCircle(startPos, centerY, thumbRadius * startScale, thumbBorderPaint)

        // Draw end thumb
        const endScale = (activeThumb === "end" && isDragging) || focusedThumb === "end" ? 1.15 : 1
        canvas.drawCircle(endPos, centerY, thumbRadius * endScale, thumbPaint)
        canvas.drawCircle(endPos, centerY, thumbRadius * endScale, thumbBorderPaint)

        // Draw value labels
        if (showValues) {
          const font = createFont(ck, typeface, 11)
          const textPaint = new ck.Paint()
          textPaint.setColor(createColor(ck, theme.text))
          textPaint.setAntiAlias(true)

          drawText(canvas, ck, formatValue(animatedStart), startPos, centerY - 18, font, textPaint, "center")
          drawText(canvas, ck, formatValue(animatedEnd), endPos, centerY - 18, font, textPaint, "center")

          font.delete()
          textPaint.delete()
        }
      } else {
        // Vertical orientation
        const trackX = centerX - 2
        drawRoundedRect(canvas, ck, trackX, 0, 4, h, 2, trackPaint)

        // Draw filled portion between thumbs
        const fillTop = Math.min(startPos, endPos)
        const fillBottom = Math.max(startPos, endPos)
        drawRoundedRect(canvas, ck, trackX, fillTop, 4, fillBottom - fillTop, 2, fillPaint)

        // Draw start thumb
        const startScale = (activeThumb === "start" && isDragging) || focusedThumb === "start" ? 1.15 : 1
        canvas.drawCircle(centerX, startPos, thumbRadius * startScale, thumbPaint)
        canvas.drawCircle(centerX, startPos, thumbRadius * startScale, thumbBorderPaint)

        // Draw end thumb
        const endScale = (activeThumb === "end" && isDragging) || focusedThumb === "end" ? 1.15 : 1
        canvas.drawCircle(centerX, endPos, thumbRadius * endScale, thumbPaint)
        canvas.drawCircle(centerX, endPos, thumbRadius * endScale, thumbBorderPaint)

        // Draw value labels
        if (showValues) {
          const font = createFont(ck, typeface, 11)
          const textPaint = new ck.Paint()
          textPaint.setColor(createColor(ck, theme.text))
          textPaint.setAntiAlias(true)

          drawText(canvas, ck, formatValue(animatedStart), centerX + 20, startPos + 4, font, textPaint, "left")
          drawText(canvas, ck, formatValue(animatedEnd), centerX + 20, endPos + 4, font, textPaint, "left")

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
      animatedStart,
      animatedEnd,
      disabled,
      isHorizontal,
      thumbRadius,
      trackColor,
      fillColor,
      thumbColor,
      showValues,
      activeThumb,
      focusedThumb,
      isDragging,
      getThumbPosition,
      formatValue
    ]
  )

  return (
    <div
      role="slider"
      aria-valuenow={focusedThumb === "start" ? value[0] : value[1]}
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
        interactive={!disabled}
        cursor={disabled ? "not-allowed" : isDragging ? "grabbing" : "pointer"}
      />
    </div>
  )
}
