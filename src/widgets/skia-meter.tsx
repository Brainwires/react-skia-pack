"use client"

import { useCallback } from "react"
import type { CanvasKit, Canvas, Typeface } from "canvaskit-wasm"
import { SkiaCanvas } from "../skia-canvas"
import { createColor, getThemeColors, detectDarkMode, type ColorTuple } from "../utils/colors"
import { drawRoundedRect } from "../primitives/shapes"
import { drawText, createFont } from "../primitives/text"
import { useAnimation, easing } from "../utils/animation"
import { clamp, lerp } from "../utils/geometry"

export interface SkiaMeterProps {
  value: number
  min?: number
  max?: number
  width?: number
  height?: number
  className?: string
  orientation?: "horizontal" | "vertical"
  showValue?: boolean
  showPeak?: boolean
  peakHoldTime?: number
  segments?: number
  segmentGap?: number
  colors?: ColorTuple[]
  backgroundColor?: ColorTuple
  formatValue?: (value: number) => string
}

export function SkiaMeter({
  value,
  min = 0,
  max = 100,
  width = 24,
  height = 200,
  className,
  orientation = "vertical",
  showValue = false,
  showPeak = true,
  peakHoldTime: _peakHoldTime = 1000,
  segments = 20,
  segmentGap = 2,
  colors,
  backgroundColor,
  formatValue = (v) => v.toFixed(0)
}: SkiaMeterProps) {
  // Clamp value
  const clampedValue = clamp(value, min, max)
  const normalizedValue = (clampedValue - min) / (max - min)

  // Animate value changes with fast attack, slow release
  const [animatedValue] = useAnimation(normalizedValue, {
    duration: 100,
    easing: easing.easeOutQuad
  })

  // Default gradient colors (green -> yellow -> red)
  const defaultColors: ColorTuple[] = colors || [
    [0.2, 0.8, 0.2, 1.0], // Green
    [0.2, 0.8, 0.2, 1.0], // Green
    [1.0, 0.9, 0.0, 1.0], // Yellow
    [1.0, 0.5, 0.0, 1.0], // Orange
    [1.0, 0.2, 0.2, 1.0], // Red
  ]

  const isHorizontal = orientation === "horizontal"

  const draw = useCallback(
    (canvas: Canvas, ck: CanvasKit, w: number, h: number, typeface: Typeface | null) => {
      const isDark = detectDarkMode()
      const theme = getThemeColors(isDark)

      // Clear background
      canvas.clear(createColor(ck, [0, 0, 0, 0]))

      const bgColor = backgroundColor || (isDark ? [0.1, 0.1, 0.12, 1.0] : [0.15, 0.15, 0.18, 1.0]) as ColorTuple
      const meterPadding = showValue ? (isHorizontal ? 20 : 24) : 4

      // Calculate meter area
      let meterX: number, meterY: number, meterWidth: number, meterHeight: number

      if (isHorizontal) {
        meterX = meterPadding
        meterY = 4
        meterWidth = w - meterPadding * 2
        meterHeight = h - 8 - (showValue ? 16 : 0)
      } else {
        meterX = 4
        meterY = meterPadding
        meterWidth = w - 8 - (showValue ? 32 : 0)
        meterHeight = h - meterPadding * 2
      }

      // Draw background
      const bgPaint = new ck.Paint()
      bgPaint.setColor(createColor(ck, bgColor))
      bgPaint.setAntiAlias(true)

      drawRoundedRect(canvas, ck, meterX, meterY, meterWidth, meterHeight, 4, bgPaint)

      // Calculate segment dimensions
      const totalGaps = (segments - 1) * segmentGap
      let segmentSize: number

      if (isHorizontal) {
        segmentSize = (meterWidth - totalGaps - 4) / segments
      } else {
        segmentSize = (meterHeight - totalGaps - 4) / segments
      }

      // Determine how many segments to light up
      const litSegments = Math.round(animatedValue * segments)

      // Draw segments
      for (let i = 0; i < segments; i++) {
        const isLit = i < litSegments
        const segmentPosition = i / (segments - 1)

        // Get color from gradient
        const colorIndex = Math.floor(segmentPosition * (defaultColors.length - 1))
        const colorT = (segmentPosition * (defaultColors.length - 1)) % 1
        const c1 = defaultColors[colorIndex]
        const c2 = defaultColors[Math.min(colorIndex + 1, defaultColors.length - 1)]

        const segmentColor: ColorTuple = [
          lerp(c1[0], c2[0], colorT),
          lerp(c1[1], c2[1], colorT),
          lerp(c1[2], c2[2], colorT),
          1.0
        ]

        // Dim unlit segments
        const displayColor: ColorTuple = isLit
          ? segmentColor
          : [segmentColor[0] * 0.2, segmentColor[1] * 0.2, segmentColor[2] * 0.2, 0.4]

        const segmentPaint = new ck.Paint()
        segmentPaint.setColor(createColor(ck, displayColor))
        segmentPaint.setAntiAlias(true)

        let sx: number, sy: number, sw: number, sh: number

        if (isHorizontal) {
          sx = meterX + 2 + i * (segmentSize + segmentGap)
          sy = meterY + 2
          sw = segmentSize
          sh = meterHeight - 4
        } else {
          sx = meterX + 2
          sy = meterY + meterHeight - 2 - (i + 1) * segmentSize - i * segmentGap
          sw = meterWidth - 4
          sh = segmentSize
        }

        drawRoundedRect(canvas, ck, sx, sy, sw, sh, 2, segmentPaint)
        segmentPaint.delete()
      }

      // Draw peak indicator
      if (showPeak && litSegments > 0) {
        const peakSegment = litSegments - 1
        const peakColor = defaultColors[Math.min(
          Math.floor((peakSegment / (segments - 1)) * (defaultColors.length - 1)),
          defaultColors.length - 1
        )]

        const peakPaint = new ck.Paint()
        peakPaint.setColor(createColor(ck, peakColor))
        peakPaint.setAntiAlias(true)

        let px: number, py: number, pw: number, ph: number

        if (isHorizontal) {
          px = meterX + 2 + peakSegment * (segmentSize + segmentGap)
          py = meterY + 2
          pw = segmentSize
          ph = meterHeight - 4
        } else {
          px = meterX + 2
          py = meterY + meterHeight - 2 - (peakSegment + 1) * segmentSize - peakSegment * segmentGap
          pw = meterWidth - 4
          ph = segmentSize
        }

        // Draw with glow effect
        const glowPaint = new ck.Paint()
        glowPaint.setColor(createColor(ck, [peakColor[0], peakColor[1], peakColor[2], 0.5]))
        glowPaint.setMaskFilter(ck.MaskFilter.MakeBlur(ck.BlurStyle.Normal, 3, true))
        glowPaint.setAntiAlias(true)
        drawRoundedRect(canvas, ck, px - 1, py - 1, pw + 2, ph + 2, 3, glowPaint)
        glowPaint.delete()

        drawRoundedRect(canvas, ck, px, py, pw, ph, 2, peakPaint)
        peakPaint.delete()
      }

      // Draw value
      if (showValue) {
        const font = createFont(ck, typeface, 12)
        const textPaint = new ck.Paint()
        textPaint.setColor(createColor(ck, theme.text))
        textPaint.setAntiAlias(true)

        const displayValue = min + animatedValue * (max - min)

        if (isHorizontal) {
          drawText(
            canvas,
            ck,
            formatValue(displayValue),
            w / 2,
            h - 4,
            font,
            textPaint,
            "center"
          )
        } else {
          drawText(
            canvas,
            ck,
            formatValue(displayValue),
            meterX + meterWidth + 8,
            h / 2 + 4,
            font,
            textPaint,
            "left"
          )
        }

        font.delete()
        textPaint.delete()
      }

      // Cleanup
      bgPaint.delete()
    },
    [
      animatedValue,
      min,
      max,
      isHorizontal,
      showValue,
      showPeak,
      segments,
      segmentGap,
      defaultColors,
      backgroundColor,
      formatValue
    ]
  )

  return (
    <SkiaCanvas
      width={width}
      height={height}
      className={className}
      onDraw={draw}
    />
  )
}

// VU Meter variant with dB scale or stereo meters
export interface SkiaVUMeterProps {
  value?: number // Single value (0-1 for linear, or dB if useDb=true)
  leftValue?: number // Left channel (0-1)
  rightValue?: number // Right channel (0-1)
  useDb?: boolean // Interpret values as dB (-60 to 0)
  width?: number
  height?: number
  className?: string
  orientation?: "horizontal" | "vertical"
}

export function SkiaVUMeter({
  value,
  leftValue,
  rightValue,
  useDb = false,
  width = 48,
  height = 200,
  className,
  orientation = "vertical"
}: SkiaVUMeterProps) {
  // Convert dB to linear (0-1) with -60dB = 0, 0dB = 1
  const dbToLinear = (db: number) => {
    const minDb = -60
    const maxDb = 0
    return clamp((db - minDb) / (maxDb - minDb), 0, 1)
  }

  // Determine values
  const left = leftValue ?? value ?? 0
  const right = rightValue ?? value ?? 0
  const leftLinear = useDb ? dbToLinear(left) : left
  const rightLinear = useDb ? dbToLinear(right) : right

  // If we have stereo (two values), render two meters side by side
  const isStereo = leftValue !== undefined || rightValue !== undefined

  if (isStereo) {
    const meterWidth = Math.floor(width / 2) - 2
    return (
      <div className={className} style={{ display: "flex", gap: 4, width, height }}>
        <SkiaMeter
          value={leftLinear * 100}
          min={0}
          max={100}
          width={meterWidth}
          height={height}
          orientation={orientation}
          showValue={false}
          showPeak={true}
          segments={20}
          segmentGap={1}
          colors={[
            [0.0, 0.8, 0.3, 1.0],
            [0.0, 0.8, 0.3, 1.0],
            [0.8, 0.8, 0.0, 1.0],
            [1.0, 0.4, 0.0, 1.0],
            [1.0, 0.0, 0.0, 1.0],
          ]}
        />
        <SkiaMeter
          value={rightLinear * 100}
          min={0}
          max={100}
          width={meterWidth}
          height={height}
          orientation={orientation}
          showValue={false}
          showPeak={true}
          segments={20}
          segmentGap={1}
          colors={[
            [0.0, 0.8, 0.3, 1.0],
            [0.0, 0.8, 0.3, 1.0],
            [0.8, 0.8, 0.0, 1.0],
            [1.0, 0.4, 0.0, 1.0],
            [1.0, 0.0, 0.0, 1.0],
          ]}
        />
      </div>
    )
  }

  // Single meter
  return (
    <SkiaMeter
      value={leftLinear * 100}
      min={0}
      max={100}
      width={width}
      height={height}
      className={className}
      orientation={orientation}
      showValue={false}
      showPeak={true}
      segments={30}
      segmentGap={1}
      colors={[
        [0.0, 0.8, 0.3, 1.0],
        [0.0, 0.8, 0.3, 1.0],
        [0.0, 0.8, 0.3, 1.0],
        [0.8, 0.8, 0.0, 1.0],
        [1.0, 0.4, 0.0, 1.0],
        [1.0, 0.0, 0.0, 1.0],
      ]}
    />
  )
}
