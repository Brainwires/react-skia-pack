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
import { lerp } from "../utils/geometry"

export interface HeatmapCell {
  x: number | string
  y: number | string
  value: number
}

export interface HeatmapChartProps {
  data: HeatmapCell[]
  width?: number
  height?: number
  className?: string
  xLabels?: string[]
  yLabels?: string[]
  colorScale?: ColorTuple[]
  showValues?: boolean
  showLabels?: boolean
  cellPadding?: number
  minValue?: number
  maxValue?: number
  formatValue?: (value: number) => string
}

export function HeatmapChart({
  data,
  width = 400,
  height = 300,
  className,
  xLabels: xLabelsProp,
  yLabels: yLabelsProp,
  colorScale,
  showValues = true,
  showLabels = true,
  cellPadding = 2,
  minValue: minValueProp,
  maxValue: maxValueProp,
  formatValue = (v) => v.toFixed(1)
}: HeatmapChartProps) {
  // Extract unique labels from data if not provided
  const { xLabels, yLabels, dataMatrix, minValue, maxValue } = useMemo(() => {
    const xSet = new Set<string>()
    const ySet = new Set<string>()
    let min = Infinity
    let max = -Infinity

    data.forEach((cell) => {
      xSet.add(String(cell.x))
      ySet.add(String(cell.y))
      if (cell.value < min) min = cell.value
      if (cell.value > max) max = cell.value
    })

    const xLabelsArr = xLabelsProp || Array.from(xSet)
    const yLabelsArr = yLabelsProp || Array.from(ySet)

    // Create matrix lookup
    const matrix = new Map<string, number>()
    data.forEach((cell) => {
      matrix.set(`${cell.x}-${cell.y}`, cell.value)
    })

    return {
      xLabels: xLabelsArr,
      yLabels: yLabelsArr,
      dataMatrix: matrix,
      minValue: minValueProp ?? min,
      maxValue: maxValueProp ?? max
    }
  }, [data, xLabelsProp, yLabelsProp, minValueProp, maxValueProp])

  // Default color scale (blue to red via yellow)
  const defaultColorScale: ColorTuple[] = colorScale || [
    [0.2, 0.4, 0.8, 1.0], // Blue (low)
    [0.2, 0.8, 0.6, 1.0], // Teal
    [0.4, 0.9, 0.4, 1.0], // Green
    [0.9, 0.9, 0.2, 1.0], // Yellow
    [1.0, 0.6, 0.2, 1.0], // Orange
    [0.9, 0.2, 0.2, 1.0] // Red (high)
  ]

  // Get color for value
  const getColorForValue = useCallback(
    (value: number): ColorTuple => {
      if (maxValue === minValue) return defaultColorScale[Math.floor(defaultColorScale.length / 2)]

      const percent = (value - minValue) / (maxValue - minValue)
      const colorIndex = percent * (defaultColorScale.length - 1)
      const i = Math.floor(colorIndex)
      const t = colorIndex - i

      if (i >= defaultColorScale.length - 1) return defaultColorScale[defaultColorScale.length - 1]
      if (i < 0) return defaultColorScale[0]

      return [
        lerp(defaultColorScale[i][0], defaultColorScale[i + 1][0], t),
        lerp(defaultColorScale[i][1], defaultColorScale[i + 1][1], t),
        lerp(defaultColorScale[i][2], defaultColorScale[i + 1][2], t),
        1.0
      ]
    },
    [minValue, maxValue, defaultColorScale]
  )

  const draw = useCallback(
    (canvas: Canvas, ck: CanvasKit, w: number, h: number, typeface: Typeface | null) => {
      const isDark = detectDarkMode()
      const theme = getThemeColors(isDark)

      // Clear background
      canvas.clear(createColor(ck, theme.background))

      if (xLabels.length === 0 || yLabels.length === 0) {
        const font = createFont(ck, typeface, 14)
        const paint = new ck.Paint()
        paint.setColor(createColor(ck, theme.textMuted))
        drawText(canvas, ck, "No data", w / 2, h / 2, font, paint, "center")
        font.delete()
        paint.delete()
        return
      }

      // Calculate dimensions
      const labelWidth = showLabels ? 60 : 0
      const labelHeight = showLabels ? 30 : 0
      const legendWidth = 40
      const chartWidth = w - labelWidth - legendWidth - 10
      const chartHeight = h - labelHeight - 10

      const cellWidth = chartWidth / xLabels.length
      const cellHeight = chartHeight / yLabels.length

      // Draw cells
      yLabels.forEach((yLabel, yi) => {
        xLabels.forEach((xLabel, xi) => {
          const key = `${xLabel}-${yLabel}`
          const value = dataMatrix.get(key)

          if (value !== undefined) {
            const x = labelWidth + xi * cellWidth
            const y = yi * cellHeight
            const color = getColorForValue(value)

            const cellPaint = new ck.Paint()
            cellPaint.setColor(createColor(ck, color))
            cellPaint.setAntiAlias(true)

            canvas.drawRect(
              ck.XYWHRect(
                x + cellPadding,
                y + cellPadding,
                cellWidth - cellPadding * 2,
                cellHeight - cellPadding * 2
              ),
              cellPaint
            )
            cellPaint.delete()

            // Draw value
            if (showValues && cellWidth > 30 && cellHeight > 20) {
              const fontSize = Math.min(10, cellHeight / 2)
              const valueFont = createFont(ck, typeface, fontSize)
              const valuePaint = new ck.Paint()

              // Choose text color based on cell brightness
              const brightness = color[0] * 0.299 + color[1] * 0.587 + color[2] * 0.114
              valuePaint.setColor(
                createColor(ck, brightness > 0.5 ? [0, 0, 0, 1] : [1, 1, 1, 1])
              )
              valuePaint.setAntiAlias(true)

              drawText(
                canvas,
                ck,
                formatValue(value),
                x + cellWidth / 2,
                y + cellHeight / 2 + fontSize / 3,
                valueFont,
                valuePaint,
                "center"
              )

              valueFont.delete()
              valuePaint.delete()
            }
          }
        })
      })

      // Draw Y labels
      if (showLabels) {
        const labelFont = createFont(ck, typeface, 10)
        const labelPaint = new ck.Paint()
        labelPaint.setColor(createColor(ck, theme.text))
        labelPaint.setAntiAlias(true)

        yLabels.forEach((label, i) => {
          const y = i * cellHeight + cellHeight / 2
          const displayLabel = label.length > 8 ? label.slice(0, 7) + "..." : label
          drawText(canvas, ck, displayLabel, labelWidth - 5, y + 4, labelFont, labelPaint, "right")
        })

        labelFont.delete()
        labelPaint.delete()
      }

      // Draw X labels
      if (showLabels) {
        const labelFont = createFont(ck, typeface, 10)
        const labelPaint = new ck.Paint()
        labelPaint.setColor(createColor(ck, theme.text))
        labelPaint.setAntiAlias(true)

        xLabels.forEach((label, i) => {
          const x = labelWidth + i * cellWidth + cellWidth / 2
          const y = chartHeight + 15
          const displayLabel = label.length > 6 ? label.slice(0, 5) + ".." : label
          drawText(canvas, ck, displayLabel, x, y, labelFont, labelPaint, "center")
        })

        labelFont.delete()
        labelPaint.delete()
      }

      // Draw color legend
      const legendX = w - legendWidth
      const legendY = 10
      const legendHeight = chartHeight - 20
      const gradientSteps = 20

      for (let i = 0; i < gradientSteps; i++) {
        const t = i / (gradientSteps - 1)
        const y = legendY + (1 - t) * legendHeight
        const stepHeight = legendHeight / gradientSteps + 1
        const value = minValue + t * (maxValue - minValue)
        const color = getColorForValue(value)

        const gradientPaint = new ck.Paint()
        gradientPaint.setColor(createColor(ck, color))
        canvas.drawRect(ck.XYWHRect(legendX, y, 15, stepHeight), gradientPaint)
        gradientPaint.delete()
      }

      // Draw legend labels
      const legendFont = createFont(ck, typeface, 9)
      const legendPaint = new ck.Paint()
      legendPaint.setColor(createColor(ck, theme.text))
      legendPaint.setAntiAlias(true)

      drawText(canvas, ck, formatValue(maxValue), legendX + 20, legendY + 4, legendFont, legendPaint, "left")
      drawText(canvas, ck, formatValue(minValue), legendX + 20, legendY + legendHeight + 4, legendFont, legendPaint, "left")

      legendFont.delete()
      legendPaint.delete()
    },
    [xLabels, yLabels, dataMatrix, minValue, maxValue, showLabels, showValues, cellPadding, formatValue, getColorForValue]
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
