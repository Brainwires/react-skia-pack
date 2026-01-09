"use client"

import { useCallback, useMemo } from "react"
import type { CanvasKit, Canvas, Typeface } from "canvaskit-wasm"
import { SkiaCanvas } from "../skia-canvas"
import {
  createColor,
  getThemeColors,
  detectDarkMode,
  type ColorTuple
} from "../utils/colors"
import { drawText, createFont } from "../primitives/text"

export interface FunnelData {
  label: string
  value: number
  color?: ColorTuple
}

export interface FunnelChartProps {
  data: FunnelData[]
  width?: number
  height?: number
  className?: string
  showLabels?: boolean
  showValues?: boolean
  showPercentages?: boolean
  orientation?: "vertical" | "horizontal"
  formatValue?: (value: number) => string
  gap?: number
  neckWidth?: number // Ratio of smallest segment width to largest (0-1)
}

export function FunnelChart({
  data,
  width = 400,
  height = 300,
  className,
  showLabels = true,
  showValues = true,
  showPercentages = true,
  orientation = "vertical",
  formatValue = (v) => v.toLocaleString(),
  gap = 2,
  neckWidth = 0.3
}: FunnelChartProps) {
  // Default colors
  const defaultColors: ColorTuple[] = useMemo(
    () => [
      [0.2, 0.6, 1.0, 1.0], // Blue
      [0.3, 0.7, 0.9, 1.0], // Light blue
      [0.4, 0.8, 0.6, 1.0], // Teal
      [0.5, 0.8, 0.4, 1.0], // Green
      [0.7, 0.8, 0.3, 1.0], // Yellow-green
      [1.0, 0.7, 0.3, 1.0], // Orange
      [1.0, 0.5, 0.3, 1.0], // Red-orange
      [1.0, 0.3, 0.3, 1.0] // Red
    ],
    []
  )

  // Calculate totals
  const { maxValue: _maxValue, segments } = useMemo(() => {
    if (data.length === 0) return { maxValue: 0, segments: [] }

    const maxVal = Math.max(...data.map((d) => d.value))
    const segs = data.map((d, i) => ({
      ...d,
      color: d.color || defaultColors[i % defaultColors.length],
      percent: maxVal > 0 ? (d.value / maxVal) * 100 : 0,
      conversionRate: i > 0 && data[i - 1].value > 0 ? (d.value / data[i - 1].value) * 100 : 100
    }))

    return { maxValue: maxVal, segments: segs }
  }, [data, defaultColors])

  const draw = useCallback(
    (canvas: Canvas, ck: CanvasKit, w: number, h: number, typeface: Typeface | null) => {
      const isDark = detectDarkMode()
      const theme = getThemeColors(isDark)

      // Clear background
      canvas.clear(createColor(ck, theme.background))

      if (segments.length === 0) {
        const font = createFont(ck, typeface, 14)
        const paint = new ck.Paint()
        paint.setColor(createColor(ck, theme.textMuted))
        drawText(canvas, ck, "No data", w / 2, h / 2, font, paint, "center")
        font.delete()
        paint.delete()
        return
      }

      const isVertical = orientation === "vertical"
      const labelSpace = showLabels ? (isVertical ? 100 : 30) : 0
      const valueSpace = showValues || showPercentages ? (isVertical ? 80 : 20) : 0

      if (isVertical) {
        // Vertical funnel
        const chartWidth = w - labelSpace - valueSpace - 20
        const chartHeight = h - 20
        const segmentHeight = (chartHeight - gap * (segments.length - 1)) / segments.length
        const centerX = labelSpace + chartWidth / 2 + 10

        segments.forEach((seg, i) => {
          const y = 10 + i * (segmentHeight + gap)

          // Calculate widths (top and bottom of this segment)
          const topWidth = chartWidth * (1 - (i / segments.length) * (1 - neckWidth))
          const bottomWidth = chartWidth * (1 - ((i + 1) / segments.length) * (1 - neckWidth))

          // Draw trapezoid
          const path = new ck.Path()
          path.moveTo(centerX - topWidth / 2, y)
          path.lineTo(centerX + topWidth / 2, y)
          path.lineTo(centerX + bottomWidth / 2, y + segmentHeight)
          path.lineTo(centerX - bottomWidth / 2, y + segmentHeight)
          path.close()

          const paint = new ck.Paint()
          paint.setColor(createColor(ck, seg.color))
          paint.setAntiAlias(true)
          canvas.drawPath(path, paint)

          // Draw border
          const borderPaint = new ck.Paint()
          borderPaint.setColor(createColor(ck, theme.background))
          borderPaint.setStyle(ck.PaintStyle.Stroke)
          borderPaint.setStrokeWidth(1)
          borderPaint.setAntiAlias(true)
          canvas.drawPath(path, borderPaint)

          path.delete()
          paint.delete()
          borderPaint.delete()

          // Draw label on left
          if (showLabels) {
            const labelFont = createFont(ck, typeface, 11)
            const labelPaint = new ck.Paint()
            labelPaint.setColor(createColor(ck, theme.text))
            labelPaint.setAntiAlias(true)

            const labelY = y + segmentHeight / 2 + 4
            drawText(canvas, ck, seg.label, 5, labelY, labelFont, labelPaint, "left")

            labelFont.delete()
            labelPaint.delete()
          }

          // Draw value/percentage on right
          if (showValues || showPercentages) {
            const valueFont = createFont(ck, typeface, 10)
            const valuePaint = new ck.Paint()
            valuePaint.setColor(createColor(ck, theme.text))
            valuePaint.setAntiAlias(true)

            const valueY = y + segmentHeight / 2
            const valueX = w - 5
            let valueText = ""

            if (showValues) {
              valueText = formatValue(seg.value)
            }
            if (showPercentages && i > 0) {
              const pctText = `${seg.conversionRate.toFixed(0)}%`
              if (valueText) {
                valueText += ` (${pctText})`
              } else {
                valueText = pctText
              }
            }

            drawText(canvas, ck, valueText, valueX, valueY + 4, valueFont, valuePaint, "right")

            valueFont.delete()
            valuePaint.delete()
          }
        })
      } else {
        // Horizontal funnel
        const chartWidth = w - 20
        const chartHeight = h - labelSpace - valueSpace - 20
        const segmentWidth = (chartWidth - gap * (segments.length - 1)) / segments.length
        const centerY = 10 + chartHeight / 2

        segments.forEach((seg, i) => {
          const x = 10 + i * (segmentWidth + gap)

          // Calculate heights (left and right of this segment)
          const leftHeight = chartHeight * (1 - (i / segments.length) * (1 - neckWidth))
          const rightHeight = chartHeight * (1 - ((i + 1) / segments.length) * (1 - neckWidth))

          // Draw trapezoid
          const path = new ck.Path()
          path.moveTo(x, centerY - leftHeight / 2)
          path.lineTo(x + segmentWidth, centerY - rightHeight / 2)
          path.lineTo(x + segmentWidth, centerY + rightHeight / 2)
          path.lineTo(x, centerY + leftHeight / 2)
          path.close()

          const paint = new ck.Paint()
          paint.setColor(createColor(ck, seg.color))
          paint.setAntiAlias(true)
          canvas.drawPath(path, paint)

          // Draw border
          const borderPaint = new ck.Paint()
          borderPaint.setColor(createColor(ck, theme.background))
          borderPaint.setStyle(ck.PaintStyle.Stroke)
          borderPaint.setStrokeWidth(1)
          borderPaint.setAntiAlias(true)
          canvas.drawPath(path, borderPaint)

          path.delete()
          paint.delete()
          borderPaint.delete()

          // Draw label below
          if (showLabels) {
            const labelFont = createFont(ck, typeface, 10)
            const labelPaint = new ck.Paint()
            labelPaint.setColor(createColor(ck, theme.text))
            labelPaint.setAntiAlias(true)

            const labelX = x + segmentWidth / 2
            const labelY = 10 + chartHeight + 15
            const displayLabel = seg.label.length > 10 ? seg.label.slice(0, 9) + ".." : seg.label
            drawText(canvas, ck, displayLabel, labelX, labelY, labelFont, labelPaint, "center")

            labelFont.delete()
            labelPaint.delete()
          }

          // Draw value inside segment
          if (showValues) {
            const valueFont = createFont(ck, typeface, 10)
            const valuePaint = new ck.Paint()

            // Choose text color based on segment brightness
            const brightness = seg.color[0] * 0.299 + seg.color[1] * 0.587 + seg.color[2] * 0.114
            valuePaint.setColor(
              createColor(ck, brightness > 0.5 ? [0, 0, 0, 1] : [1, 1, 1, 1])
            )
            valuePaint.setAntiAlias(true)

            drawText(canvas, ck, formatValue(seg.value), x + segmentWidth / 2, centerY + 4, valueFont, valuePaint, "center")

            valueFont.delete()
            valuePaint.delete()
          }
        })
      }
    },
    [segments, orientation, showLabels, showValues, showPercentages, gap, neckWidth, formatValue]
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
