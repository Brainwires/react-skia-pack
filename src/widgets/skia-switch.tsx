"use client"

import { useCallback } from "react"
import type { CanvasKit, Canvas, Typeface } from "canvaskit-wasm"
import {
  SkiaInteractiveCanvas,
  type InteractionState,
  type PointerEventData
} from "../skia-interactive-canvas"
import { createColor, detectDarkMode, type ColorTuple } from "../utils/colors"
import { drawRoundedRect } from "../primitives/shapes"
import { useSpring } from "../utils/animation"

export interface SkiaSwitchProps {
  checked: boolean
  onChange?: (checked: boolean) => void
  width?: number
  height?: number
  className?: string
  disabled?: boolean
  onColor?: ColorTuple
  offColor?: ColorTuple
  thumbColor?: ColorTuple
}

export function SkiaSwitch({
  checked,
  onChange,
  width = 48,
  height = 28,
  className,
  disabled = false,
  onColor,
  offColor,
  thumbColor
}: SkiaSwitchProps) {
  // Animate the toggle position with spring physics
  const targetPosition = checked ? 1 : 0
  const animatedPosition = useSpring(targetPosition, {
    tension: 300,
    friction: 20
  })

  const handleClick = useCallback(
    (_e: PointerEventData) => {
      if (!disabled) {
        onChange?.(!checked)
      }
    },
    [disabled, checked, onChange]
  )

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (disabled) return

      if (e.key === " " || e.key === "Enter") {
        e.preventDefault()
        onChange?.(!checked)
      }
    },
    [disabled, checked, onChange]
  )

  const draw = useCallback(
    (
      canvas: Canvas,
      ck: CanvasKit,
      w: number,
      h: number,
      _typeface: Typeface | null,
      state: InteractionState
    ) => {
      const isDark = detectDarkMode()
      // const theme = getThemeColors(isDark)

      // Clear background
      canvas.clear(createColor(ck, [0, 0, 0, 0]))

      // Calculate dimensions
      const trackRadius = h / 2
      const thumbRadius = (h - 8) / 2
      const thumbPadding = 4

      // Interpolate colors based on animated position
      const defaultOnColor: ColorTuple = [0.2, 0.6, 1.0, 1.0]
      const defaultOffColor: ColorTuple = isDark
        ? [0.3, 0.3, 0.35, 1.0]
        : [0.8, 0.8, 0.82, 1.0]

      const activeOnColor = onColor || defaultOnColor
      const activeOffColor = offColor || defaultOffColor

      // Lerp between colors
      const trackColor: ColorTuple = [
        activeOffColor[0] + (activeOnColor[0] - activeOffColor[0]) * animatedPosition,
        activeOffColor[1] + (activeOnColor[1] - activeOffColor[1]) * animatedPosition,
        activeOffColor[2] + (activeOnColor[2] - activeOffColor[2]) * animatedPosition,
        1.0
      ]

      // Apply disabled state
      const finalTrackColor: ColorTuple = disabled
        ? [trackColor[0], trackColor[1], trackColor[2], 0.5]
        : trackColor

      // Draw track
      const trackPaint = new ck.Paint()
      trackPaint.setColor(createColor(ck, finalTrackColor))
      trackPaint.setAntiAlias(true)

      drawRoundedRect(canvas, ck, 0, 0, w, h, trackRadius, trackPaint)

      // Calculate thumb position
      const thumbMinX = thumbPadding + thumbRadius
      const thumbMaxX = w - thumbPadding - thumbRadius
      const thumbX = thumbMinX + (thumbMaxX - thumbMinX) * animatedPosition
      const thumbY = h / 2

      // Apply hover/press effects
      let thumbScale = 1
      if (!disabled) {
        if (state.isPressed) {
          thumbScale = 1.05
        } else if (state.isHovering) {
          thumbScale = 1.02
        }
      }

      // Draw thumb shadow
      const shadowPaint = new ck.Paint()
      shadowPaint.setColor(createColor(ck, [0, 0, 0, 0.2]))
      shadowPaint.setAntiAlias(true)
      shadowPaint.setMaskFilter(ck.MaskFilter.MakeBlur(ck.BlurStyle.Normal, 2, true))
      canvas.drawCircle(thumbX, thumbY + 1, thumbRadius * thumbScale, shadowPaint)
      shadowPaint.delete()

      // Draw thumb
      const thumbPaint = new ck.Paint()
      const thumbFillColor = thumbColor || [1, 1, 1, 1] as ColorTuple
      const finalThumbColor: ColorTuple = disabled
        ? [thumbFillColor[0], thumbFillColor[1], thumbFillColor[2], 0.7]
        : thumbFillColor
      thumbPaint.setColor(createColor(ck, finalThumbColor))
      thumbPaint.setAntiAlias(true)

      canvas.drawCircle(thumbX, thumbY, thumbRadius * thumbScale, thumbPaint)

      // Focus ring when focused (simulated via hover for canvas)
      if (state.isHovering && !disabled) {
        const focusPaint = new ck.Paint()
        focusPaint.setColor(createColor(ck, [activeOnColor[0], activeOnColor[1], activeOnColor[2], 0.3]))
        focusPaint.setStyle(ck.PaintStyle.Stroke)
        focusPaint.setStrokeWidth(2)
        focusPaint.setAntiAlias(true)
        canvas.drawCircle(thumbX, thumbY, thumbRadius * thumbScale + 3, focusPaint)
        focusPaint.delete()
      }

      // Cleanup
      trackPaint.delete()
      thumbPaint.delete()
    },
    [animatedPosition, disabled, onColor, offColor, thumbColor]
  )

  return (
    <div
      role="switch"
      aria-checked={checked}
      aria-disabled={disabled}
      tabIndex={disabled ? -1 : 0}
      onKeyDown={handleKeyDown}
      className={className}
      style={{ outline: "none", display: "inline-block" }}
    >
      <SkiaInteractiveCanvas
        width={width}
        height={height}
        onDraw={draw}
        onPointerUp={handleClick}
        interactive={!disabled}
        cursor={disabled ? "not-allowed" : "pointer"}
      />
    </div>
  )
}
