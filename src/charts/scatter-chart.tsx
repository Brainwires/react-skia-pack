"use client"

import { useCallback, useMemo } from "react"
import type { CanvasKit, Canvas, Typeface } from "canvaskit-wasm"
import { SkiaCanvas } from "../skia-canvas"
import {
  createLinearScale,
  scaleValue,
  calculateTicks,
  calculateDomain,
  formatAxisValue
} from "../utils/scales"
import {
  getSeriesColor,
  createColor,
  getThemeColors,
  detectDarkMode,
  withAlpha,
  type ColorTuple
} from "../utils/colors"

export interface ScatterChartDataPoint {
  x: number
  y: number
  size?: number
  label?: string
  color?: ColorTuple
}

export interface ScatterChartSeries {
  name: string
  data: ScatterChartDataPoint[]
  color?: ColorTuple
  shape?: "circle" | "square" | "triangle" | "diamond"
}

export interface ScatterChartProps {
  series: ScatterChartSeries[]
  width?: number
  height?: number
  className?: string
  showGrid?: boolean
  showXAxis?: boolean
  showYAxis?: boolean
  showLegend?: boolean
  showTrendLine?: boolean
  xAxisLabel?: string
  yAxisLabel?: string
  minBubbleSize?: number
  maxBubbleSize?: number
  formatXLabel?: (value: number) => string
  formatYLabel?: (value: number) => string
}

const PADDING = { top: 20, right: 20, bottom: 45, left: 55 }

export function ScatterChart({
  series,
  width = 400,
  height = 300,
  className,
  showGrid = true,
  showXAxis = true,
  showYAxis = true,
  showLegend = true,
  showTrendLine = false,
  xAxisLabel,
  yAxisLabel,
  minBubbleSize = 4,
  maxBubbleSize = 20,
  formatXLabel = formatAxisValue,
  formatYLabel = formatAxisValue
}: ScatterChartProps) {
  // Process series with colors
  const processedSeries = useMemo(() => {
    return series.map((s, i) => ({
      ...s,
      color: s.color || getSeriesColor(i)
    }))
  }, [series])

  // Calculate domains and size range
  const { xDomain, yDomain, sizeRange } = useMemo(() => {
    const allX: number[] = []
    const allY: number[] = []
    const allSizes: number[] = []

    processedSeries.forEach((s) => {
      s.data.forEach((p) => {
        allX.push(p.x)
        allY.push(p.y)
        if (p.size !== undefined) {
          allSizes.push(p.size)
        }
      })
    })

    return {
      xDomain: calculateDomain(allX, 0.1) as [number, number],
      yDomain: calculateDomain(allY, 0.1) as [number, number],
      sizeRange: allSizes.length > 0
        ? [Math.min(...allSizes), Math.max(...allSizes)]
        : [1, 1]
    }
  }, [processedSeries])

  // Calculate trend line if needed
  const trendLines = useMemo(() => {
    if (!showTrendLine) return []

    return processedSeries.map((s) => {
      if (s.data.length < 2) return null

      // Simple linear regression
      const n = s.data.length
      let sumX = 0
      let sumY = 0
      let sumXY = 0
      let sumXX = 0

      s.data.forEach((p) => {
        sumX += p.x
        sumY += p.y
        sumXY += p.x * p.y
        sumXX += p.x * p.x
      })

      const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX)
      const intercept = (sumY - slope * sumX) / n

      return { slope, intercept, color: s.color }
    })
  }, [processedSeries, showTrendLine])

  const draw = useCallback(
    (canvas: Canvas, ck: CanvasKit, w: number, h: number, typeface: Typeface | null) => {
      const isDark = detectDarkMode()
      const theme = getThemeColors(isDark)

      // Clear background
      canvas.clear(createColor(ck, theme.background))

      const legendHeight = showLegend ? 25 : 0
      const chartWidth = w - PADDING.left - PADDING.right
      const chartHeight = h - PADDING.top - PADDING.bottom - legendHeight

      // Create scales
      const xScale = createLinearScale(xDomain, [PADDING.left, PADDING.left + chartWidth])
      const yScale = createLinearScale(yDomain, [PADDING.top + chartHeight, PADDING.top])

      // Size scale for bubble charts
      const sizeScale = (size: number | undefined) => {
        if (size === undefined) return minBubbleSize
        if (sizeRange[0] === sizeRange[1]) return (minBubbleSize + maxBubbleSize) / 2
        const t = (size - sizeRange[0]) / (sizeRange[1] - sizeRange[0])
        return minBubbleSize + t * (maxBubbleSize - minBubbleSize)
      }

      // Create paints
      const gridPaint = new ck.Paint()
      gridPaint.setColor(createColor(ck, theme.grid))
      gridPaint.setStrokeWidth(1)
      gridPaint.setStyle(ck.PaintStyle.Stroke)
      gridPaint.setAntiAlias(true)

      const axisPaint = new ck.Paint()
      axisPaint.setColor(createColor(ck, theme.border))
      axisPaint.setStrokeWidth(1)
      axisPaint.setStyle(ck.PaintStyle.Stroke)
      axisPaint.setAntiAlias(true)

      const textPaint = new ck.Paint()
      textPaint.setColor(createColor(ck, theme.textMuted))
      textPaint.setAntiAlias(true)

      // Draw grid
      if (showGrid) {
        const yTicks = calculateTicks(yDomain[0], yDomain[1], 5)
        yTicks.forEach((tick) => {
          const y = scaleValue(yScale, tick)
          const path = new ck.Path()
          path.moveTo(PADDING.left, y)
          path.lineTo(PADDING.left + chartWidth, y)
          canvas.drawPath(path, gridPaint)
          path.delete()
        })

        const xTicks = calculateTicks(xDomain[0], xDomain[1], 5)
        xTicks.forEach((tick) => {
          const x = scaleValue(xScale, tick)
          const path = new ck.Path()
          path.moveTo(x, PADDING.top)
          path.lineTo(x, PADDING.top + chartHeight)
          canvas.drawPath(path, gridPaint)
          path.delete()
        })
      }

      // Draw axes
      if (showXAxis) {
        const axisPath = new ck.Path()
        axisPath.moveTo(PADDING.left, PADDING.top + chartHeight)
        axisPath.lineTo(PADDING.left + chartWidth, PADDING.top + chartHeight)
        canvas.drawPath(axisPath, axisPaint)
        axisPath.delete()

        // X-axis labels
        const font = new ck.Font(typeface, 10)
        const xTicks = calculateTicks(xDomain[0], xDomain[1], 5)
        xTicks.forEach((tick) => {
          const x = scaleValue(xScale, tick)
          const label = formatXLabel(tick)
          const blob = ck.TextBlob.MakeFromText(label, font)
          if (blob) {
            canvas.drawTextBlob(blob, x - 10, h - legendHeight - 8, textPaint)
            blob.delete()
          }
        })

        // X-axis label
        if (xAxisLabel) {
          const labelFont = new ck.Font(typeface, 11)
          const blob = ck.TextBlob.MakeFromText(xAxisLabel, labelFont)
          if (blob) {
            canvas.drawTextBlob(blob, PADDING.left + chartWidth / 2 - 20, h - legendHeight - 2, textPaint)
            blob.delete()
          }
          labelFont.delete()
        }

        font.delete()
      }

      if (showYAxis) {
        const axisPath = new ck.Path()
        axisPath.moveTo(PADDING.left, PADDING.top)
        axisPath.lineTo(PADDING.left, PADDING.top + chartHeight)
        canvas.drawPath(axisPath, axisPaint)
        axisPath.delete()

        // Y-axis labels
        const font = new ck.Font(typeface, 10)
        const yTicks = calculateTicks(yDomain[0], yDomain[1], 5)
        yTicks.forEach((tick) => {
          const y = scaleValue(yScale, tick)
          const label = formatYLabel(tick)
          const blob = ck.TextBlob.MakeFromText(label, font)
          if (blob) {
            canvas.drawTextBlob(blob, 5, y + 3, textPaint)
            blob.delete()
          }
        })

        // Y-axis label (rotated)
        if (yAxisLabel) {
          canvas.save()
          const labelFont = new ck.Font(typeface, 11)
          canvas.rotate(-90, 12, PADDING.top + chartHeight / 2)
          const blob = ck.TextBlob.MakeFromText(yAxisLabel, labelFont)
          if (blob) {
            canvas.drawTextBlob(blob, 12 - 20, PADDING.top + chartHeight / 2, textPaint)
            blob.delete()
          }
          labelFont.delete()
          canvas.restore()
        }

        font.delete()
      }

      // Draw trend lines
      trendLines.forEach((trend) => {
        if (!trend) return

        const trendPaint = new ck.Paint()
        trendPaint.setColor(createColor(ck, withAlpha(trend.color, 0.5)))
        trendPaint.setStrokeWidth(2)
        trendPaint.setStyle(ck.PaintStyle.Stroke)
        trendPaint.setAntiAlias(true)

        const x1 = xDomain[0]
        const x2 = xDomain[1]
        const y1 = trend.slope * x1 + trend.intercept
        const y2 = trend.slope * x2 + trend.intercept

        const path = new ck.Path()
        path.moveTo(scaleValue(xScale, x1), scaleValue(yScale, y1))
        path.lineTo(scaleValue(xScale, x2), scaleValue(yScale, y2))
        canvas.drawPath(path, trendPaint)
        path.delete()
        trendPaint.delete()
      })

      // Draw points
      processedSeries.forEach((s) => {
        const pointPaint = new ck.Paint()
        pointPaint.setAntiAlias(true)

        s.data.forEach((point) => {
          const x = scaleValue(xScale, point.x)
          const y = scaleValue(yScale, point.y)
          const size = sizeScale(point.size)
          const pointColor = point.color || s.color

          pointPaint.setColor(createColor(ck, withAlpha(pointColor, 0.7)))

          switch (s.shape) {
            case "square":
              canvas.drawRect(
                ck.LTRBRect(x - size / 2, y - size / 2, x + size / 2, y + size / 2),
                pointPaint
              )
              break
            case "triangle": {
              const path = new ck.Path()
              path.moveTo(x, y - size)
              path.lineTo(x + size * 0.866, y + size / 2)
              path.lineTo(x - size * 0.866, y + size / 2)
              path.close()
              canvas.drawPath(path, pointPaint)
              path.delete()
              break
            }
            case "diamond": {
              const path = new ck.Path()
              path.moveTo(x, y - size)
              path.lineTo(x + size, y)
              path.lineTo(x, y + size)
              path.lineTo(x - size, y)
              path.close()
              canvas.drawPath(path, pointPaint)
              path.delete()
              break
            }
            case "circle":
            default:
              canvas.drawCircle(x, y, size, pointPaint)
          }
        })

        pointPaint.delete()
      })

      // Draw legend
      if (showLegend && processedSeries.length > 1) {
        const legendY = h - 15
        let legendX = PADDING.left
        const font = new ck.Font(typeface, 11)

        processedSeries.forEach((s) => {
          const dotPaint = new ck.Paint()
          dotPaint.setColor(createColor(ck, s.color))
          dotPaint.setAntiAlias(true)

          canvas.drawCircle(legendX + 5, legendY, 4, dotPaint)

          const blob = ck.TextBlob.MakeFromText(s.name, font)
          if (blob) {
            canvas.drawTextBlob(blob, legendX + 12, legendY + 4, textPaint)
            legendX += 20 + s.name.length * 6
            blob.delete()
          }

          dotPaint.delete()
        })

        font.delete()
      }

      // Cleanup
      gridPaint.delete()
      axisPaint.delete()
      textPaint.delete()
    },
    [
      processedSeries,
      xDomain,
      yDomain,
      sizeRange,
      trendLines,
      showGrid,
      showXAxis,
      showYAxis,
      showLegend,
      xAxisLabel,
      yAxisLabel,
      minBubbleSize,
      maxBubbleSize,
      formatXLabel,
      formatYLabel
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
