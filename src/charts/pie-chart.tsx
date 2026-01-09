"use client"

import { useCallback, useMemo } from "react"
import type { CanvasKit, Canvas, Typeface } from "canvaskit-wasm"
import { SkiaCanvas } from "../skia-canvas"
import {
  getSeriesColor,
  createColor,
  getThemeColors,
  detectDarkMode,
  type ColorTuple
} from "../utils/colors"
import { formatPercent } from "../utils/scales"

export interface PieChartDataItem {
  label: string
  value: number
  color?: ColorTuple
}

export interface PieChartProps {
  data: PieChartDataItem[]
  width?: number
  height?: number
  className?: string
  donut?: boolean
  donutRatio?: number
  showLabels?: boolean
  showLegend?: boolean
  showPercentages?: boolean
}

export function PieChart({
  data,
  width = 300,
  height = 300,
  className,
  donut = false,
  donutRatio = 0.5,
  showLabels = true,
  showLegend = true,
  showPercentages = true
}: PieChartProps) {
  // Add colors and calculate percentages
  const processedData = useMemo(() => {
    const total = data.reduce((sum, item) => sum + item.value, 0)
    return data
      .filter((item) => item.value > 0)
      .map((item, i) => ({
        ...item,
        color: item.color || getSeriesColor(i),
        percentage: total > 0 ? item.value / total : 0
      }))
  }, [data])

  const draw = useCallback(
    (canvas: Canvas, ck: CanvasKit, w: number, h: number, typeface: Typeface | null) => {
      const isDark = detectDarkMode()
      const theme = getThemeColors(isDark)

      // Clear background
      canvas.clear(createColor(ck, theme.background))

      if (processedData.length === 0) {
        // Draw "no data" message
        const font = new ck.Font(typeface, 12)
        const textPaint = new ck.Paint()
        textPaint.setColor(createColor(ck, theme.textMuted))
        textPaint.setAntiAlias(true)

        const blob = ck.TextBlob.MakeFromText("No data", font)
        if (blob) {
          canvas.drawTextBlob(blob, w / 2 - 20, h / 2, textPaint)
          blob.delete()
        }
        font.delete()
        textPaint.delete()
        return
      }

      // Calculate pie dimensions
      const legendHeight = showLegend ? 50 : 0
      const centerX = w / 2
      const centerY = (h - legendHeight) / 2
      const radius = Math.min(centerX, centerY) * 0.8
      const innerRadius = donut ? radius * donutRatio : 0

      // Draw slices
      let startAngle = -Math.PI / 2 // Start from top

      processedData.forEach((item) => {
        const sweepAngle = item.percentage * Math.PI * 2

        const slicePaint = new ck.Paint()
        slicePaint.setColor(createColor(ck, item.color))
        slicePaint.setStyle(ck.PaintStyle.Fill)
        slicePaint.setAntiAlias(true)

        // Create arc path
        const path = new ck.Path()

        if (donut) {
          // Outer arc
          path.moveTo(
            centerX + radius * Math.cos(startAngle),
            centerY + radius * Math.sin(startAngle)
          )
          path.arcToOval(
            ck.LTRBRect(
              centerX - radius,
              centerY - radius,
              centerX + radius,
              centerY + radius
            ),
            (startAngle * 180) / Math.PI,
            (sweepAngle * 180) / Math.PI,
            false
          )

          // Line to inner arc
          const endAngle = startAngle + sweepAngle
          path.lineTo(
            centerX + innerRadius * Math.cos(endAngle),
            centerY + innerRadius * Math.sin(endAngle)
          )

          // Inner arc (reverse direction)
          path.arcToOval(
            ck.LTRBRect(
              centerX - innerRadius,
              centerY - innerRadius,
              centerX + innerRadius,
              centerY + innerRadius
            ),
            (endAngle * 180) / Math.PI,
            (-sweepAngle * 180) / Math.PI,
            false
          )

          path.close()
        } else {
          // Simple pie slice
          path.moveTo(centerX, centerY)
          path.lineTo(
            centerX + radius * Math.cos(startAngle),
            centerY + radius * Math.sin(startAngle)
          )
          path.arcToOval(
            ck.LTRBRect(
              centerX - radius,
              centerY - radius,
              centerX + radius,
              centerY + radius
            ),
            (startAngle * 180) / Math.PI,
            (sweepAngle * 180) / Math.PI,
            false
          )
          path.close()
        }

        canvas.drawPath(path, slicePaint)

        // Draw label
        if (showLabels && item.percentage > 0.05) {
          const midAngle = startAngle + sweepAngle / 2
          const labelRadius = donut
            ? (radius + innerRadius) / 2
            : radius * 0.65

          const labelX = centerX + labelRadius * Math.cos(midAngle)
          const labelY = centerY + labelRadius * Math.sin(midAngle)

          const font = new ck.Font(typeface, 11)
          const textPaint = new ck.Paint()
          textPaint.setColor(createColor(ck, [1, 1, 1, 1]))
          textPaint.setAntiAlias(true)

          const label = showPercentages
            ? formatPercent(item.percentage, 0)
            : item.label

          const blob = ck.TextBlob.MakeFromText(label, font)
          if (blob) {
            canvas.drawTextBlob(blob, labelX - 12, labelY + 4, textPaint)
            blob.delete()
          }

          font.delete()
          textPaint.delete()
        }

        path.delete()
        slicePaint.delete()

        startAngle += sweepAngle
      })

      // Draw legend
      if (showLegend) {
        const font = new ck.Font(typeface, 11)

        const textPaint = new ck.Paint()
        textPaint.setColor(createColor(ck, theme.text))
        textPaint.setAntiAlias(true)

        // Calculate total legend width to center it
        const legendItems = processedData.map((item) => {
          const legendText = showPercentages
            ? `${item.label} (${formatPercent(item.percentage, 0)})`
            : item.label
          // Increased padding: dot (12) + gap (8) + text + spacing (20)
          return { ...item, legendText, width: 40 + legendText.length * 7 }
        })

        const totalWidth = legendItems.reduce((sum, item) => sum + item.width, 0)
        let legendX = Math.max(10, (w - totalWidth) / 2)
        const legendY = h - 25

        legendItems.forEach((item) => {
          const dotPaint = new ck.Paint()
          dotPaint.setColor(createColor(ck, item.color))
          dotPaint.setStyle(ck.PaintStyle.Fill)
          dotPaint.setAntiAlias(true)

          canvas.drawCircle(legendX + 6, legendY, 6, dotPaint)

          const blob = ck.TextBlob.MakeFromText(item.legendText, font)
          if (blob) {
            canvas.drawTextBlob(blob, legendX + 16, legendY + 4, textPaint)
            legendX += item.width
            blob.delete()
          }

          dotPaint.delete()
        })

        font.delete()
        textPaint.delete()
      }
    },
    [processedData, donut, donutRatio, showLabels, showLegend, showPercentages]
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
