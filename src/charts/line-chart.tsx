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
  type ColorTuple
} from "../utils/colors"

export interface LineChartDataPoint {
  x: number | string | Date
  y: number
}

export interface LineChartSeries {
  name: string
  data: LineChartDataPoint[]
  color?: ColorTuple
}

export interface LineChartProps {
  /** Can use 'data' or 'series' - both work */
  data?: LineChartSeries[]
  series?: LineChartSeries[]
  width?: number
  height?: number
  className?: string
  showGrid?: boolean
  showXAxis?: boolean
  showYAxis?: boolean
  showLegend?: boolean
  showPoints?: boolean
  xAxisLabel?: string
  yAxisLabel?: string
  xAxisLabels?: string[]
  formatXLabel?: (value: number) => string
  formatYLabel?: (value: number) => string
}

const PADDING = { top: 20, right: 20, bottom: 40, left: 50 }

export function LineChart({
  data,
  series,
  width = 400,
  height = 300,
  className,
  showGrid = true,
  showXAxis = true,
  showYAxis = true,
  showLegend = true,
  showPoints = true,
  xAxisLabels,
  formatXLabel = formatAxisValue,
  formatYLabel = formatAxisValue
}: LineChartProps) {
  // Support both 'data' and 'series' props
  const chartData = data || series || []
  // Process data to get numeric x values
  const processedData = useMemo(() => {
    return chartData.map((s, i) => ({
      ...s,
      color: s.color || getSeriesColor(i),
      points: s.data.map((point, j) => ({
        x: typeof point.x === "number" ? point.x : j,
        y: point.y,
        label:
          point.x instanceof Date
            ? point.x.toLocaleDateString()
            : String(point.x)
      }))
    }))
  }, [chartData])

  // Calculate domains
  const { xDomain, yDomain } = useMemo(() => {
    const allX: number[] = []
    const allY: number[] = []

    processedData.forEach((series) => {
      series.points.forEach((p) => {
        allX.push(p.x)
        allY.push(p.y)
      })
    })

    return {
      xDomain: calculateDomain(allX, 0.05) as [number, number],
      yDomain: calculateDomain(allY, 0.1) as [number, number]
    }
  }, [processedData])

  const draw = useCallback(
    (canvas: Canvas, ck: CanvasKit, w: number, h: number, typeface: Typeface | null) => {
      const isDark = detectDarkMode()
      const theme = getThemeColors(isDark)

      // Clear background
      canvas.clear(createColor(ck, theme.background))

      const chartWidth = w - PADDING.left - PADDING.right
      const chartHeight = h - PADDING.top - PADDING.bottom

      // Create scales
      const xScale = createLinearScale(xDomain, [
        PADDING.left,
        PADDING.left + chartWidth
      ])
      const yScale = createLinearScale(yDomain, [
        PADDING.top + chartHeight,
        PADDING.top
      ])

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

        // X axis labels
        const font = new ck.Font(typeface, 10)
        if (xAxisLabels && xAxisLabels.length > 0) {
          // Use custom labels - calculate how many we can fit
          const numLabels = xAxisLabels.length
          const avgLabelWidth = 50 // Approximate width per label in pixels
          const maxLabels = Math.max(2, Math.floor(chartWidth / avgLabelWidth))
          const step = Math.ceil(numLabels / maxLabels)

          xAxisLabels.forEach((label, i) => {
            // Only draw every Nth label, always include first and last
            if (i % step !== 0 && i !== numLabels - 1) return

            const x = PADDING.left + (i / (numLabels - 1 || 1)) * chartWidth
            // Truncate label if too long
            const displayLabel = label.length > 8 ? label.slice(0, 5) : label
            const blob = ck.TextBlob.MakeFromText(displayLabel, font)
            if (blob) {
              // Center the label under its position
              canvas.drawTextBlob(blob, x - 15, h - 10, textPaint)
              blob.delete()
            }
          })
        } else {
          // Use calculated ticks
          const xTicks = calculateTicks(xDomain[0], xDomain[1], 5)
          xTicks.forEach((tick) => {
            const x = scaleValue(xScale, tick)
            const label = formatXLabel(tick)
            const blob = ck.TextBlob.MakeFromText(label, font)
            if (blob) {
              canvas.drawTextBlob(blob, x - 10, h - 10, textPaint)
              blob.delete()
            }
          })
        }
        font.delete()
      }

      if (showYAxis) {
        const axisPath = new ck.Path()
        axisPath.moveTo(PADDING.left, PADDING.top)
        axisPath.lineTo(PADDING.left, PADDING.top + chartHeight)
        canvas.drawPath(axisPath, axisPaint)
        axisPath.delete()

        // Y axis labels
        const yTicks = calculateTicks(yDomain[0], yDomain[1], 5)
        const font = new ck.Font(typeface, 10)
        yTicks.forEach((tick) => {
          const y = scaleValue(yScale, tick)
          const label = formatYLabel(tick)
          const blob = ck.TextBlob.MakeFromText(label, font)
          if (blob) {
            canvas.drawTextBlob(blob, 5, y + 3, textPaint)
            blob.delete()
          }
        })
        font.delete()
      }

      // Draw lines
      processedData.forEach((series) => {
        if (series.points.length < 2) return

        const linePaint = new ck.Paint()
        linePaint.setColor(createColor(ck, series.color))
        linePaint.setStrokeWidth(2)
        linePaint.setStyle(ck.PaintStyle.Stroke)
        linePaint.setAntiAlias(true)

        const path = new ck.Path()
        series.points.forEach((point, i) => {
          const x = scaleValue(xScale, point.x)
          const y = scaleValue(yScale, point.y)
          if (i === 0) {
            path.moveTo(x, y)
          } else {
            path.lineTo(x, y)
          }
        })
        canvas.drawPath(path, linePaint)
        path.delete()

        // Draw points
        if (showPoints) {
          const pointPaint = new ck.Paint()
          pointPaint.setColor(createColor(ck, series.color))
          pointPaint.setStyle(ck.PaintStyle.Fill)
          pointPaint.setAntiAlias(true)

          series.points.forEach((point) => {
            const x = scaleValue(xScale, point.x)
            const y = scaleValue(yScale, point.y)
            canvas.drawCircle(x, y, 3, pointPaint)
          })

          pointPaint.delete()
        }

        linePaint.delete()
      })

      // Draw legend
      if (showLegend && processedData.length > 1) {
        const legendY = 10
        let legendX = PADDING.left
        const font = new ck.Font(typeface, 11)

        processedData.forEach((series) => {
          const dotPaint = new ck.Paint()
          dotPaint.setColor(createColor(ck, series.color))
          dotPaint.setStyle(ck.PaintStyle.Fill)
          dotPaint.setAntiAlias(true)

          canvas.drawCircle(legendX + 5, legendY + 5, 4, dotPaint)

          const blob = ck.TextBlob.MakeFromText(series.name, font)
          if (blob) {
            canvas.drawTextBlob(blob, legendX + 15, legendY + 9, textPaint)
            legendX += 15 + series.name.length * 6 + 15
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
      processedData,
      xDomain,
      yDomain,
      showGrid,
      showXAxis,
      showYAxis,
      showLegend,
      showPoints,
      xAxisLabels,
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
