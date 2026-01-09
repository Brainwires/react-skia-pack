"use client"

import { useCallback } from "react"
import type { CanvasKit, Canvas, Typeface } from "canvaskit-wasm"
import { SkiaCanvas } from "../skia-canvas"
import {
  createColor,
  getThemeColors,
  detectDarkMode,
  type ColorTuple
} from "../utils/colors"
import { drawArcRing, drawLine } from "../primitives/shapes"
import { drawText, createFont } from "../primitives/text"
import { useAnimation, easing } from "../utils/animation"
import { degreesToRadians, mapRange } from "../utils/math"
import { polarToCartesian, lerp } from "../utils/geometry"

export interface GaugeChartProps {
  value: number
  min?: number
  max?: number
  width?: number
  height?: number
  className?: string
  startAngle?: number // In degrees (default: 135)
  endAngle?: number // In degrees (default: 405)
  showValue?: boolean
  showLabels?: boolean
  showTicks?: boolean
  tickCount?: number
  colors?: ColorTuple[]
  thresholds?: { value: number; color: ColorTuple }[]
  label?: string
  formatValue?: (value: number) => string
  animate?: boolean
  animationDuration?: number
}

export function GaugeChart({
  value,
  min = 0,
  max = 100,
  width = 200,
  height = 160,
  className,
  startAngle = 135,
  endAngle = 405,
  showValue = true,
  showLabels = true,
  showTicks = true,
  tickCount = 5,
  colors,
  thresholds,
  label,
  formatValue = (v) => v.toFixed(0),
  animate = true,
  animationDuration = 500
}: GaugeChartProps) {
  // Clamp value
  const clampedValue = Math.max(min, Math.min(max, value))

  // Animate value
  const [animatedValue] = useAnimation(clampedValue, {
    duration: animate ? animationDuration : 0,
    easing: easing.easeOutCubic,
    immediate: !animate
  })

  // Default gradient colors
  const defaultColors: ColorTuple[] = colors || [
    [0.2, 0.8, 0.4, 1.0], // Green
    [1.0, 0.8, 0.0, 1.0], // Yellow
    [1.0, 0.3, 0.3, 1.0]  // Red
  ]

  // Get color at a specific value
  const getColorAtValue = useCallback(
    (val: number): ColorTuple => {
      if (thresholds && thresholds.length > 0) {
        // Use thresholds
        const sorted = [...thresholds].sort((a, b) => a.value - b.value)
        for (let i = sorted.length - 1; i >= 0; i--) {
          if (val >= sorted[i].value) {
            return sorted[i].color
          }
        }
        return defaultColors[0]
      }

      // Use gradient colors
      const percent = (val - min) / (max - min)
      const colorIndex = percent * (defaultColors.length - 1)
      const i = Math.floor(colorIndex)
      const t = colorIndex - i

      if (i >= defaultColors.length - 1) return defaultColors[defaultColors.length - 1]

      return [
        lerp(defaultColors[i][0], defaultColors[i + 1][0], t),
        lerp(defaultColors[i][1], defaultColors[i + 1][1], t),
        lerp(defaultColors[i][2], defaultColors[i + 1][2], t),
        1.0
      ]
    },
    [min, max, defaultColors, thresholds]
  )

  const draw = useCallback(
    (canvas: Canvas, ck: CanvasKit, w: number, h: number, typeface: Typeface | null) => {
      const isDark = detectDarkMode()
      const theme = getThemeColors(isDark)

      // Clear background
      canvas.clear(createColor(ck, theme.background))

      // Calculate dimensions
      const cx = w / 2
      const cy = h * 0.65
      const outerRadius = Math.min(w / 2, h * 0.6) - 10
      const arcWidth = outerRadius * 0.15
      const innerRadius = outerRadius - arcWidth

      // Draw track
      const trackPaint = new ck.Paint()
      trackPaint.setColor(createColor(ck, theme.grid))
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
      trackPaint.delete()

      // Draw colored arc segments
      if (thresholds && thresholds.length > 0) {
        // Draw threshold segments
        const sorted = [...thresholds].sort((a, b) => a.value - b.value)
        let prevValue = min

        sorted.forEach((threshold, _i) => {
          const segmentStart = mapRange(prevValue, min, max, startAngle, endAngle)
          const segmentEnd = mapRange(threshold.value, min, max, startAngle, endAngle)

          const segmentPaint = new ck.Paint()
          segmentPaint.setColor(createColor(ck, threshold.color))
          segmentPaint.setAntiAlias(true)

          if (animatedValue >= prevValue) {
            const fillEnd = Math.min(
              segmentEnd,
              mapRange(animatedValue, min, max, startAngle, endAngle)
            )
            if (fillEnd > segmentStart) {
              drawArcRing(
                canvas,
                ck,
                cx,
                cy,
                innerRadius,
                outerRadius,
                segmentStart,
                fillEnd - segmentStart,
                segmentPaint
              )
            }
          }

          segmentPaint.delete()
          prevValue = threshold.value
        })
      } else {
        // Draw gradient fill
        const fillAngle = mapRange(animatedValue, min, max, startAngle, endAngle)
        const sweepAngle = fillAngle - startAngle

        if (sweepAngle > 0) {
          // Draw in small segments for gradient effect
          const segments = Math.ceil(sweepAngle / 5)
          for (let i = 0; i < segments; i++) {
            const segStart = startAngle + (i / segments) * sweepAngle
            const segEnd = startAngle + ((i + 1) / segments) * sweepAngle
            const segValue = min + ((i + 0.5) / segments) * (animatedValue - min)
            const segColor = getColorAtValue(segValue)

            const segPaint = new ck.Paint()
            segPaint.setColor(createColor(ck, segColor))
            segPaint.setAntiAlias(true)

            drawArcRing(
              canvas,
              ck,
              cx,
              cy,
              innerRadius,
              outerRadius,
              segStart,
              segEnd - segStart + 0.5, // Slight overlap to prevent gaps
              segPaint
            )
            segPaint.delete()
          }
        }
      }

      // Draw ticks
      if (showTicks) {
        const tickPaint = new ck.Paint()
        tickPaint.setColor(createColor(ck, theme.textMuted))
        tickPaint.setStrokeWidth(1)
        tickPaint.setAntiAlias(true)

        for (let i = 0; i <= tickCount; i++) {
          const tickValue = min + (i / tickCount) * (max - min)
          const tickAngle = mapRange(tickValue, min, max, startAngle, endAngle)
          const tickAngleRad = degreesToRadians(tickAngle)

          const isMajor = i === 0 || i === tickCount || i === Math.floor(tickCount / 2)
          const tickLength = isMajor ? 8 : 5

          const tickStart = polarToCartesian(cx, cy, outerRadius + 2, tickAngleRad)
          const tickEnd = polarToCartesian(cx, cy, outerRadius + 2 + tickLength, tickAngleRad)

          drawLine(canvas, ck, tickStart.x, tickStart.y, tickEnd.x, tickEnd.y, tickPaint)
        }

        tickPaint.delete()
      }

      // Draw labels at min/max
      if (showLabels) {
        const labelFont = createFont(ck, typeface, 10)
        const labelPaint = new ck.Paint()
        labelPaint.setColor(createColor(ck, theme.textMuted))
        labelPaint.setAntiAlias(true)

        // Min label
        const minAngleRad = degreesToRadians(startAngle)
        const minPos = polarToCartesian(cx, cy, outerRadius + 18, minAngleRad)
        drawText(canvas, ck, formatValue(min), minPos.x, minPos.y + 4, labelFont, labelPaint, "center")

        // Max label
        const maxAngleRad = degreesToRadians(endAngle)
        const maxPos = polarToCartesian(cx, cy, outerRadius + 18, maxAngleRad)
        drawText(canvas, ck, formatValue(max), maxPos.x, maxPos.y + 4, labelFont, labelPaint, "center")

        labelFont.delete()
        labelPaint.delete()
      }

      // Draw needle
      const needleAngle = mapRange(animatedValue, min, max, startAngle, endAngle)
      const needleAngleRad = degreesToRadians(needleAngle)
      const needleLength = innerRadius - 8

      const needlePaint = new ck.Paint()
      needlePaint.setColor(createColor(ck, getColorAtValue(animatedValue)))
      needlePaint.setStrokeWidth(3)
      needlePaint.setStrokeCap(ck.StrokeCap.Round)
      needlePaint.setAntiAlias(true)

      const needleEnd = polarToCartesian(cx, cy, needleLength, needleAngleRad)
      drawLine(canvas, ck, cx, cy, needleEnd.x, needleEnd.y, needlePaint)

      // Draw center dot
      canvas.drawCircle(cx, cy, 6, needlePaint)
      needlePaint.delete()

      // Draw center overlay
      const centerPaint = new ck.Paint()
      centerPaint.setColor(createColor(ck, theme.background))
      centerPaint.setAntiAlias(true)
      canvas.drawCircle(cx, cy, 4, centerPaint)
      centerPaint.delete()

      // Draw value
      if (showValue) {
        const valueFont = createFont(ck, typeface, 24)
        const valuePaint = new ck.Paint()
        valuePaint.setColor(createColor(ck, theme.text))
        valuePaint.setAntiAlias(true)

        drawText(
          canvas,
          ck,
          formatValue(animatedValue),
          cx,
          cy + innerRadius * 0.4,
          valueFont,
          valuePaint,
          "center"
        )

        valueFont.delete()
        valuePaint.delete()
      }

      // Draw label
      if (label) {
        const labelFont = createFont(ck, typeface, 12)
        const labelPaint = new ck.Paint()
        labelPaint.setColor(createColor(ck, theme.textMuted))
        labelPaint.setAntiAlias(true)

        drawText(
          canvas,
          ck,
          label,
          cx,
          h - 8,
          labelFont,
          labelPaint,
          "center"
        )

        labelFont.delete()
        labelPaint.delete()
      }
    },
    [
      animatedValue,
      min,
      max,
      startAngle,
      endAngle,
      showValue,
      showLabels,
      showTicks,
      tickCount,
      thresholds,
      label,
      formatValue,
      defaultColors,
      getColorAtValue
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
