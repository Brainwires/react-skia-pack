"use client"

import { useCallback, useMemo } from "react"
import type { CanvasKit, Canvas, Typeface } from "canvaskit-wasm"
import { SkiaCanvas } from "../skia-canvas"
import {
  createLinearScale,
  scaleValue,
  calculateDomain
} from "../utils/scales"
import {
  createColor,
  // getThemeColors,
  // detectDarkMode,
  withAlpha,
  type ColorTuple
} from "../utils/colors"

export interface SparklineChartProps {
  data: number[]
  width?: number
  height?: number
  className?: string
  type?: "line" | "bar" | "area"
  color?: ColorTuple
  showMinMax?: boolean
  showLast?: boolean
  fill?: boolean
  strokeWidth?: number
  curveType?: "linear" | "smooth"
}

export function SparklineChart({
  data,
  width = 120,
  height = 32,
  className,
  type = "line",
  color,
  showMinMax = false,
  showLast = false,
  fill = false,
  strokeWidth = 1.5,
  curveType = "linear"
}: SparklineChartProps) {
  // Calculate domain
  const { yDomain, minIndex, maxIndex } = useMemo(() => {
    if (data.length === 0) {
      return { yDomain: [0, 1] as [number, number], minIndex: -1, maxIndex: -1 }
    }

    let minVal = data[0]
    let maxVal = data[0]
    let minIdx = 0
    let maxIdx = 0

    for (let i = 1; i < data.length; i++) {
      if (data[i] < minVal) {
        minVal = data[i]
        minIdx = i
      }
      if (data[i] > maxVal) {
        maxVal = data[i]
        maxIdx = i
      }
    }

    return {
      yDomain: calculateDomain([minVal, maxVal], 0.05) as [number, number],
      minIndex: minIdx,
      maxIndex: maxIdx
    }
  }, [data])

  const draw = useCallback(
    (canvas: Canvas, ck: CanvasKit, w: number, h: number, _typeface: Typeface | null) => {
      // const isDark = detectDarkMode()
      // const theme = getThemeColors(isDark)

      // Clear background
      canvas.clear(createColor(ck, [0, 0, 0, 0]))

      if (data.length === 0) return

      const sparkColor = color || [0.2, 0.6, 1.0, 1.0] as ColorTuple
      const padding = showMinMax || showLast ? 4 : 2

      // Create scales
      const xScale = createLinearScale([0, data.length - 1], [padding, w - padding])
      const yScale = createLinearScale(yDomain, [h - padding, padding])

      if (type === "bar") {
        // Draw bars
        const barWidth = Math.max(1, (w - padding * 2) / data.length - 1)
        const barPaint = new ck.Paint()
        barPaint.setAntiAlias(true)

        data.forEach((value, i) => {
          const x = scaleValue(xScale, i) - barWidth / 2
          const y = scaleValue(yScale, value)
          // const barHeight = h - padding - y

          // Color based on position
          if (showMinMax && i === minIndex) {
            barPaint.setColor(createColor(ck, [1, 0.3, 0.3, 1]))
          } else if (showMinMax && i === maxIndex) {
            barPaint.setColor(createColor(ck, [0.2, 0.8, 0.4, 1]))
          } else {
            barPaint.setColor(createColor(ck, sparkColor))
          }

          canvas.drawRect(ck.LTRBRect(x, y, x + barWidth, h - padding), barPaint)
        })

        barPaint.delete()
      } else {
        // Draw line/area
        const path = new ck.Path()

        // Build path
        data.forEach((value, i) => {
          const x = scaleValue(xScale, i)
          const y = scaleValue(yScale, value)

          if (i === 0) {
            path.moveTo(x, y)
          } else if (curveType === "smooth" && i > 0) {
            // Smooth curve using quadratic bezier
            const prevX = scaleValue(xScale, i - 1)
            const prevY = scaleValue(yScale, data[i - 1])
            const cpX = (prevX + x) / 2
            path.quadTo(cpX, prevY, cpX, (prevY + y) / 2)
            path.quadTo(cpX, y, x, y)
          } else {
            path.lineTo(x, y)
          }
        })

        // Draw fill if enabled or type is area
        if (fill || type === "area") {
          const fillPath = path.copy()
          fillPath.lineTo(scaleValue(xScale, data.length - 1), h - padding)
          fillPath.lineTo(scaleValue(xScale, 0), h - padding)
          fillPath.close()

          const fillPaint = new ck.Paint()
          fillPaint.setColor(createColor(ck, withAlpha(sparkColor, 0.2)))
          fillPaint.setAntiAlias(true)

          canvas.drawPath(fillPath, fillPaint)
          fillPath.delete()
          fillPaint.delete()
        }

        // Draw line
        const linePaint = new ck.Paint()
        linePaint.setColor(createColor(ck, sparkColor))
        linePaint.setStrokeWidth(strokeWidth)
        linePaint.setStyle(ck.PaintStyle.Stroke)
        linePaint.setAntiAlias(true)
        linePaint.setStrokeCap(ck.StrokeCap.Round)
        linePaint.setStrokeJoin(ck.StrokeJoin.Round)

        canvas.drawPath(path, linePaint)
        path.delete()
        linePaint.delete()

        // Draw min/max points
        if (showMinMax) {
          const pointPaint = new ck.Paint()
          pointPaint.setAntiAlias(true)

          // Min point (red)
          pointPaint.setColor(createColor(ck, [1, 0.3, 0.3, 1]))
          canvas.drawCircle(
            scaleValue(xScale, minIndex),
            scaleValue(yScale, data[minIndex]),
            3,
            pointPaint
          )

          // Max point (green)
          pointPaint.setColor(createColor(ck, [0.2, 0.8, 0.4, 1]))
          canvas.drawCircle(
            scaleValue(xScale, maxIndex),
            scaleValue(yScale, data[maxIndex]),
            3,
            pointPaint
          )

          pointPaint.delete()
        }

        // Draw last point
        if (showLast && data.length > 0) {
          const lastIndex = data.length - 1
          const pointPaint = new ck.Paint()
          pointPaint.setColor(createColor(ck, sparkColor))
          pointPaint.setAntiAlias(true)

          canvas.drawCircle(
            scaleValue(xScale, lastIndex),
            scaleValue(yScale, data[lastIndex]),
            3,
            pointPaint
          )

          pointPaint.delete()
        }
      }
    },
    [data, yDomain, minIndex, maxIndex, type, color, showMinMax, showLast, fill, strokeWidth, curveType]
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
