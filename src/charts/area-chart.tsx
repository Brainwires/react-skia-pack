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

export interface AreaChartDataPoint {
  x: number | string
  y: number
}

export interface AreaChartSeries {
  name: string
  data: AreaChartDataPoint[]
  color?: ColorTuple
}

export interface AreaChartProps {
  series: AreaChartSeries[]
  width?: number
  height?: number
  className?: string
  showGrid?: boolean
  showLegend?: boolean
  showPoints?: boolean
  stacked?: boolean
  gradient?: boolean
  xAxisLabels?: string[]
  formatXLabel?: (value: number | string) => string
  formatYLabel?: (value: number) => string
}

const PADDING = { top: 20, right: 20, bottom: 40, left: 50 }

export function AreaChart({
  series,
  width = 400,
  height = 300,
  className,
  showGrid = true,
  showLegend = true,
  showPoints = false,
  stacked = false,
  gradient = true,
  xAxisLabels,
  formatXLabel = String,
  formatYLabel = formatAxisValue
}: AreaChartProps) {
  // Process series with colors
  const processedSeries = useMemo(() => {
    return series.map((s, i) => ({
      ...s,
      color: s.color || getSeriesColor(i)
    }))
  }, [series])

  // Calculate domains
  const { xDomain, yDomain, stackedData } = useMemo(() => {
    if (processedSeries.length === 0) {
      return {
        xDomain: [0, 1] as [number, number],
        yDomain: [0, 1] as [number, number],
        stackedData: []
      }
    }

    // Get all x values
    const allX = processedSeries.flatMap((s) =>
      s.data.map((d) => (typeof d.x === "number" ? d.x : 0))
    )
    const minX = Math.min(...allX)
    const maxX = Math.max(...allX)

    // Calculate stacked data and y domain
    const numPoints = processedSeries[0]?.data.length || 0
    const stacked: number[][] = []

    if (processedSeries.length > 0) {
      for (let i = 0; i < numPoints; i++) {
        const values: number[] = []
        let cumulative = 0
        for (const s of processedSeries) {
          const value = s.data[i]?.y || 0
          cumulative += value
          values.push(cumulative)
        }
        stacked.push(values)
      }
    }

    let allY: number[]
    if (stacked && stacked.length > 0) {
      // For stacked, use cumulative values
      allY = stacked.flatMap((row) => row)
    } else {
      allY = processedSeries.flatMap((s) => s.data.map((d) => d.y))
    }

    const [yMin, yMax] = calculateDomain(allY, 0.1)

    return {
      xDomain: [minX, maxX] as [number, number],
      yDomain: [Math.min(0, yMin), yMax] as [number, number],
      stackedData: stacked
    }
  }, [processedSeries, stacked])

  const draw = useCallback(
    (canvas: Canvas, ck: CanvasKit, w: number, h: number, typeface: Typeface | null) => {
      const isDark = detectDarkMode()
      const theme = getThemeColors(isDark)

      // Clear background
      canvas.clear(createColor(ck, theme.background))

      const chartWidth = w - PADDING.left - PADDING.right
      const chartHeight = h - PADDING.top - PADDING.bottom
      const legendHeight = showLegend ? 20 : 0

      if (processedSeries.length === 0) return

      // Create scales
      const xScale = createLinearScale(xDomain, [
        PADDING.left,
        PADDING.left + chartWidth
      ])
      const yScale = createLinearScale(yDomain, [
        PADDING.top + chartHeight - legendHeight,
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
      }

      // Draw axes
      const axisPath = new ck.Path()
      axisPath.moveTo(PADDING.left, PADDING.top)
      axisPath.lineTo(PADDING.left, PADDING.top + chartHeight - legendHeight)
      axisPath.lineTo(
        PADDING.left + chartWidth,
        PADDING.top + chartHeight - legendHeight
      )
      canvas.drawPath(axisPath, axisPaint)
      axisPath.delete()

      // Draw axis labels
      const font = new ck.Font(typeface, 10)

      // Y-axis labels
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

      // X-axis labels
      const numPoints = processedSeries[0]?.data.length || 0
      const labelStep = Math.max(1, Math.floor(numPoints / 6))
      for (let i = 0; i < numPoints; i += labelStep) {
        const dataPoint = processedSeries[0].data[i]
        const x =
          typeof dataPoint.x === "number"
            ? scaleValue(xScale, dataPoint.x)
            : PADDING.left + (i / (numPoints - 1 || 1)) * chartWidth

        const label = xAxisLabels?.[i] || formatXLabel(dataPoint.x)
        const blob = ck.TextBlob.MakeFromText(label, font)
        if (blob) {
          canvas.drawTextBlob(
            blob,
            x - 15,
            PADDING.top + chartHeight - legendHeight + 15,
            textPaint
          )
          blob.delete()
        }
      }

      // Draw areas (in reverse order so first series is on top)
      const baselineY = scaleValue(yScale, 0)

      for (let seriesIdx = processedSeries.length - 1; seriesIdx >= 0; seriesIdx--) {
        const s = processedSeries[seriesIdx]
        const areaPath = new ck.Path()

        // Get points
        const points: { x: number; y: number }[] = []
        for (let i = 0; i < s.data.length; i++) {
          const dataPoint = s.data[i]
          const x =
            typeof dataPoint.x === "number"
              ? scaleValue(xScale, dataPoint.x)
              : PADDING.left + (i / (s.data.length - 1 || 1)) * chartWidth

          let y: number
          if (stacked && stackedData.length > 0) {
            const stackValue = stackedData[i]?.[seriesIdx] || 0
            y = scaleValue(yScale, stackValue)
          } else {
            y = scaleValue(yScale, dataPoint.y)
          }

          points.push({ x, y })
        }

        if (points.length === 0) continue

        // Calculate baseline for stacked areas
        const baselinePoints: { x: number; y: number }[] = []
        if (stacked && seriesIdx > 0) {
          for (let i = 0; i < s.data.length; i++) {
            const dataPoint = s.data[i]
            const x =
              typeof dataPoint.x === "number"
                ? scaleValue(xScale, dataPoint.x)
                : PADDING.left + (i / (s.data.length - 1 || 1)) * chartWidth

            const prevStackValue = stackedData[i]?.[seriesIdx - 1] || 0
            const y = scaleValue(yScale, prevStackValue)
            baselinePoints.push({ x, y })
          }
        }

        // Build area path
        areaPath.moveTo(points[0].x, stacked && seriesIdx > 0 ? baselinePoints[0].y : baselineY)

        // Draw top line
        for (const point of points) {
          areaPath.lineTo(point.x, point.y)
        }

        // Draw bottom line (reverse direction)
        if (stacked && seriesIdx > 0) {
          for (let i = baselinePoints.length - 1; i >= 0; i--) {
            areaPath.lineTo(baselinePoints[i].x, baselinePoints[i].y)
          }
        } else {
          areaPath.lineTo(points[points.length - 1].x, baselineY)
          areaPath.lineTo(points[0].x, baselineY)
        }

        areaPath.close()

        // Draw area with gradient or solid fill
        if (gradient) {
          const topY = Math.min(...points.map((p) => p.y))
          const bottomY = stacked && seriesIdx > 0
            ? Math.max(...baselinePoints.map((p) => p.y))
            : baselineY

          const shader = ck.Shader.MakeLinearGradient(
            [PADDING.left, topY],
            [PADDING.left, bottomY],
            [createColor(ck, withAlpha(s.color, 0.6)), createColor(ck, withAlpha(s.color, 0.1))],
            null,
            ck.TileMode.Clamp
          )

          const gradientPaint = new ck.Paint()
          gradientPaint.setShader(shader)
          gradientPaint.setStyle(ck.PaintStyle.Fill)
          gradientPaint.setAntiAlias(true)

          canvas.drawPath(areaPath, gradientPaint)

          gradientPaint.delete()
          shader.delete()
        } else {
          const areaPaint = new ck.Paint()
          areaPaint.setColor(createColor(ck, withAlpha(s.color, 0.4)))
          areaPaint.setStyle(ck.PaintStyle.Fill)
          areaPaint.setAntiAlias(true)

          canvas.drawPath(areaPath, areaPaint)
          areaPaint.delete()
        }

        areaPath.delete()

        // Draw line on top of area
        const linePaint = new ck.Paint()
        linePaint.setColor(createColor(ck, s.color))
        linePaint.setStrokeWidth(2)
        linePaint.setStyle(ck.PaintStyle.Stroke)
        linePaint.setAntiAlias(true)

        const linePath = new ck.Path()
        linePath.moveTo(points[0].x, points[0].y)
        for (let i = 1; i < points.length; i++) {
          linePath.lineTo(points[i].x, points[i].y)
        }
        canvas.drawPath(linePath, linePaint)
        linePath.delete()
        linePaint.delete()

        // Draw points
        if (showPoints) {
          const pointPaint = new ck.Paint()
          pointPaint.setColor(createColor(ck, s.color))
          pointPaint.setStyle(ck.PaintStyle.Fill)
          pointPaint.setAntiAlias(true)

          for (const point of points) {
            canvas.drawCircle(point.x, point.y, 3, pointPaint)
          }

          pointPaint.delete()
        }
      }

      // Draw legend
      if (showLegend) {
        const legendY = h - 15
        let legendX = PADDING.left

        processedSeries.forEach((s) => {
          const dotPaint = new ck.Paint()
          dotPaint.setColor(createColor(ck, s.color))
          dotPaint.setStyle(ck.PaintStyle.Fill)
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
      }

      // Cleanup
      gridPaint.delete()
      axisPaint.delete()
      textPaint.delete()
      font.delete()
    },
    [
      processedSeries,
      xDomain,
      yDomain,
      stackedData,
      showGrid,
      showLegend,
      showPoints,
      stacked,
      gradient,
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
