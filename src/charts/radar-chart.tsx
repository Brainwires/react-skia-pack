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
import { drawPolygonFromPoints, drawLine } from "../primitives/shapes"
import { drawText, createFont } from "../primitives/text"
import { polarToCartesian } from "../utils/geometry"

export interface RadarDataPoint {
  label: string
  value: number
}

export interface RadarSeries {
  data: RadarDataPoint[]
  color?: ColorTuple
  fillOpacity?: number
  label?: string
}

export interface RadarChartProps {
  series: RadarSeries[]
  width?: number
  height?: number
  className?: string
  max?: number
  levels?: number
  showLabels?: boolean
  showLevels?: boolean
  showValues?: boolean
  showLegend?: boolean
  labelOffset?: number
}

export function RadarChart({
  series,
  width = 300,
  height = 300,
  className,
  max: maxProp,
  levels = 5,
  showLabels = true,
  showLevels = true,
  showValues = false,
  showLegend = true,
  labelOffset = 20
}: RadarChartProps) {
  // Get axis labels from first series
  const axisLabels = useMemo(() => {
    if (series.length === 0 || series[0].data.length === 0) return []
    return series[0].data.map((d) => d.label)
  }, [series])

  const axisCount = axisLabels.length

  // Calculate max value
  const maxValue = useMemo(() => {
    if (maxProp !== undefined) return maxProp
    let max = 0
    series.forEach((s) => {
      s.data.forEach((d) => {
        if (d.value > max) max = d.value
      })
    })
    return max || 100
  }, [series, maxProp])

  // Default colors for series
  const defaultColors: ColorTuple[] = useMemo(
    () => [
      [0.2, 0.6, 1.0, 1.0], // Blue
      [1.0, 0.4, 0.4, 1.0], // Red
      [0.2, 0.8, 0.4, 1.0], // Green
      [1.0, 0.6, 0.2, 1.0], // Orange
      [0.6, 0.4, 1.0, 1.0], // Purple
      [0.2, 0.8, 0.8, 1.0] // Cyan
    ],
    []
  )

  const draw = useCallback(
    (canvas: Canvas, ck: CanvasKit, w: number, h: number, typeface: Typeface | null) => {
      const isDark = detectDarkMode()
      const theme = getThemeColors(isDark)

      // Clear background
      canvas.clear(createColor(ck, theme.background))

      if (axisCount < 3) {
        // Need at least 3 axes for a radar chart
        const font = createFont(ck, typeface, 14)
        const paint = new ck.Paint()
        paint.setColor(createColor(ck, theme.textMuted))
        drawText(canvas, ck, "Need at least 3 data points", w / 2, h / 2, font, paint, "center")
        font.delete()
        paint.delete()
        return
      }

      // Calculate dimensions
      const legendHeight = showLegend && series.length > 1 ? 30 : 0
      const cx = w / 2
      const cy = (h - legendHeight) / 2
      const radius = Math.min(w / 2, (h - legendHeight) / 2) - labelOffset - 20

      // Angle step between axes
      const angleStep = (Math.PI * 2) / axisCount
      // Start from top (-90 degrees)
      const startAngle = -Math.PI / 2

      // Draw level polygons
      if (showLevels) {
        const levelPaint = new ck.Paint()
        levelPaint.setColor(createColor(ck, theme.grid))
        levelPaint.setStyle(ck.PaintStyle.Stroke)
        levelPaint.setStrokeWidth(1)
        levelPaint.setAntiAlias(true)

        for (let level = 1; level <= levels; level++) {
          const levelRadius = (radius * level) / levels
          const points: { x: number; y: number }[] = []

          for (let i = 0; i < axisCount; i++) {
            const angle = startAngle + i * angleStep
            points.push(polarToCartesian(cx, cy, levelRadius, angle))
          }

          drawPolygonFromPoints(canvas, ck, points, true, levelPaint)
        }

        levelPaint.delete()
      }

      // Draw axes
      const axisPaint = new ck.Paint()
      axisPaint.setColor(createColor(ck, theme.grid))
      axisPaint.setStrokeWidth(1)
      axisPaint.setAntiAlias(true)

      for (let i = 0; i < axisCount; i++) {
        const angle = startAngle + i * angleStep
        const endPoint = polarToCartesian(cx, cy, radius, angle)
        drawLine(canvas, ck, cx, cy, endPoint.x, endPoint.y, axisPaint)
      }

      axisPaint.delete()

      // Draw axis labels
      if (showLabels) {
        const labelFont = createFont(ck, typeface, 11)
        const labelPaint = new ck.Paint()
        labelPaint.setColor(createColor(ck, theme.text))
        labelPaint.setAntiAlias(true)

        for (let i = 0; i < axisCount; i++) {
          const angle = startAngle + i * angleStep
          const labelPos = polarToCartesian(cx, cy, radius + labelOffset, angle)

          // Determine text alignment based on position
          let align: "left" | "center" | "right" = "center"
          const angleDeg = (angle * 180) / Math.PI
          if (angleDeg > -80 && angleDeg < 80) {
            // Right side
            align = "left"
          } else if (angleDeg > 100 || angleDeg < -100) {
            // Left side
            align = "right"
          }

          drawText(canvas, ck, axisLabels[i], labelPos.x, labelPos.y + 4, labelFont, labelPaint, align)
        }

        labelFont.delete()
        labelPaint.delete()
      }

      // Draw series
      series.forEach((s, seriesIndex) => {
        const color = s.color || defaultColors[seriesIndex % defaultColors.length]
        const fillOpacity = s.fillOpacity ?? 0.2

        // Calculate points for this series
        const points: { x: number; y: number }[] = []
        s.data.forEach((d, i) => {
          const angle = startAngle + i * angleStep
          const valueRadius = (d.value / maxValue) * radius
          points.push(polarToCartesian(cx, cy, valueRadius, angle))
        })

        // Draw fill
        if (fillOpacity > 0 && points.length >= 3) {
          const fillPaint = new ck.Paint()
          fillPaint.setColor(createColor(ck, [color[0], color[1], color[2], fillOpacity]))
          fillPaint.setStyle(ck.PaintStyle.Fill)
          fillPaint.setAntiAlias(true)

          const path = new ck.Path()
          path.moveTo(points[0].x, points[0].y)
          for (let i = 1; i < points.length; i++) {
            path.lineTo(points[i].x, points[i].y)
          }
          path.close()

          canvas.drawPath(path, fillPaint)
          path.delete()
          fillPaint.delete()
        }

        // Draw stroke
        const strokePaint = new ck.Paint()
        strokePaint.setColor(createColor(ck, color))
        strokePaint.setStyle(ck.PaintStyle.Stroke)
        strokePaint.setStrokeWidth(2)
        strokePaint.setAntiAlias(true)

        drawPolygonFromPoints(canvas, ck, points, true, strokePaint)
        strokePaint.delete()

        // Draw points
        const pointPaint = new ck.Paint()
        pointPaint.setColor(createColor(ck, color))
        pointPaint.setAntiAlias(true)

        points.forEach((p) => {
          canvas.drawCircle(p.x, p.y, 4, pointPaint)
        })

        // Draw point centers
        const centerPaint = new ck.Paint()
        centerPaint.setColor(createColor(ck, theme.background))
        centerPaint.setAntiAlias(true)

        points.forEach((p) => {
          canvas.drawCircle(p.x, p.y, 2, centerPaint)
        })

        centerPaint.delete()
        pointPaint.delete()

        // Draw values
        if (showValues) {
          const valueFont = createFont(ck, typeface, 9)
          const valuePaint = new ck.Paint()
          valuePaint.setColor(createColor(ck, color))
          valuePaint.setAntiAlias(true)

          s.data.forEach((d, i) => {
            const angle = startAngle + i * angleStep
            const valueRadius = (d.value / maxValue) * radius + 12
            const pos = polarToCartesian(cx, cy, valueRadius, angle)
            drawText(canvas, ck, d.value.toFixed(0), pos.x, pos.y + 3, valueFont, valuePaint, "center")
          })

          valueFont.delete()
          valuePaint.delete()
        }
      })

      // Draw legend
      if (showLegend && series.length > 1) {
        const legendFont = createFont(ck, typeface, 11)
        const legendY = h - 15

        let legendX = 10
        series.forEach((s, i) => {
          const color = s.color || defaultColors[i % defaultColors.length]
          const label = s.label || `Series ${i + 1}`

          // Draw color box
          const boxPaint = new ck.Paint()
          boxPaint.setColor(createColor(ck, color))
          boxPaint.setAntiAlias(true)
          canvas.drawRect(ck.XYWHRect(legendX, legendY - 8, 12, 12), boxPaint)
          boxPaint.delete()

          // Draw label
          const textPaint = new ck.Paint()
          textPaint.setColor(createColor(ck, theme.text))
          textPaint.setAntiAlias(true)
          drawText(canvas, ck, label, legendX + 16, legendY + 2, legendFont, textPaint, "left")
          textPaint.delete()

          legendX += 16 + label.length * 7 + 20
        })

        legendFont.delete()
      }
    },
    [series, axisLabels, axisCount, maxValue, levels, showLabels, showLevels, showValues, showLegend, labelOffset, defaultColors]
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
