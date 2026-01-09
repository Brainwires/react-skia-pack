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

export interface BarChartDataItem {
  label: string
  value: number
  color?: ColorTuple
}

export interface BarChartProps {
  data: BarChartDataItem[]
  width?: number
  height?: number
  className?: string
  horizontal?: boolean
  showGrid?: boolean
  showValues?: boolean
  barPadding?: number
  formatValue?: (value: number) => string
}

const DEFAULT_PADDING = { top: 20, right: 50, bottom: 70, left: 60 }
const HORIZONTAL_PADDING = { top: 20, right: 70, bottom: 40, left: 180 }

export function BarChart({
  data,
  width = 400,
  height = 300,
  className,
  horizontal = false,
  showGrid = true,
  showValues = true,
  barPadding = 0.2,
  formatValue = formatAxisValue
}: BarChartProps) {
  // Add colors to data
  const processedData = useMemo(() => {
    return data.map((item, i) => ({
      ...item,
      color: item.color || getSeriesColor(i)
    }))
  }, [data])

  // Calculate value domain
  const valueDomain = useMemo(() => {
    const values = processedData.map((d) => d.value)
    const [min, max] = calculateDomain(values, 0.1)
    // Always start from 0 for bar charts
    return [Math.min(0, min), max] as [number, number]
  }, [processedData])

  const draw = useCallback(
    (canvas: Canvas, ck: CanvasKit, w: number, h: number, typeface: Typeface | null) => {
      const isDark = detectDarkMode()
      const theme = getThemeColors(isDark)

      // Clear background
      canvas.clear(createColor(ck, theme.background))

      const PADDING = horizontal ? HORIZONTAL_PADDING : DEFAULT_PADDING
      const chartWidth = w - PADDING.left - PADDING.right
      const chartHeight = h - PADDING.top - PADDING.bottom

      if (processedData.length === 0) {
        // Draw empty state message
        const textPaint = new ck.Paint()
        textPaint.setColor(createColor(ck, theme.textMuted))
        textPaint.setAntiAlias(true)

        const font = new ck.Font(typeface, 14)
        const message = "No data available"
        const blob = ck.TextBlob.MakeFromText(message, font)
        if (blob) {
          // Center the text
          canvas.drawTextBlob(blob, w / 2 - 45, h / 2, textPaint)
          blob.delete()
        }

        textPaint.delete()
        font.delete()
        return
      }

      // Calculate bar dimensions
      const barCount = processedData.length
      const totalBarSpace = horizontal ? chartHeight : chartWidth
      const barThickness =
        (totalBarSpace / barCount) * (1 - barPadding)
      const barGap = (totalBarSpace / barCount) * barPadding

      // Create scales
      const valueScale = createLinearScale(
        valueDomain,
        horizontal
          ? [PADDING.left, PADDING.left + chartWidth]
          : [PADDING.top + chartHeight, PADDING.top]
      )

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
        const ticks = calculateTicks(valueDomain[0], valueDomain[1], 5)
        ticks.forEach((tick) => {
          const pos = scaleValue(valueScale, tick)
          const path = new ck.Path()
          if (horizontal) {
            path.moveTo(pos, PADDING.top)
            path.lineTo(pos, PADDING.top + chartHeight)
          } else {
            path.moveTo(PADDING.left, pos)
            path.lineTo(PADDING.left + chartWidth, pos)
          }
          canvas.drawPath(path, gridPaint)
          path.delete()
        })
      }

      // Draw axis
      const axisPath = new ck.Path()
      if (horizontal) {
        axisPath.moveTo(PADDING.left, PADDING.top + chartHeight)
        axisPath.lineTo(PADDING.left + chartWidth, PADDING.top + chartHeight)
      } else {
        axisPath.moveTo(PADDING.left, PADDING.top)
        axisPath.lineTo(PADDING.left, PADDING.top + chartHeight)
      }
      canvas.drawPath(axisPath, axisPaint)
      axisPath.delete()

      // Draw value axis labels
      const valueTicks = calculateTicks(valueDomain[0], valueDomain[1], 5)
      const font = new ck.Font(typeface, 12)
      valueTicks.forEach((tick) => {
        const pos = scaleValue(valueScale, tick)
        const label = formatValue(tick)
        const blob = ck.TextBlob.MakeFromText(label, font)
        if (blob) {
          if (horizontal) {
            canvas.drawTextBlob(blob, pos - 10, h - 10, textPaint)
          } else {
            canvas.drawTextBlob(blob, 5, pos + 3, textPaint)
          }
          blob.delete()
        }
      })

      // Draw bars and category labels
      const zeroPos = scaleValue(valueScale, 0)

      processedData.forEach((item, i) => {
        const barPaint = new ck.Paint()
        barPaint.setColor(createColor(ck, item.color))
        barPaint.setStyle(ck.PaintStyle.Fill)
        barPaint.setAntiAlias(true)

        const valuePos = scaleValue(valueScale, item.value)
        const barStart = (barGap / 2) + i * (barThickness + barGap)

        let rect: Float32Array
        if (horizontal) {
          const y = PADDING.top + barStart
          const left = Math.min(zeroPos, valuePos)
          const right = Math.max(zeroPos, valuePos)
          rect = ck.LTRBRect(left, y, right, y + barThickness)
        } else {
          const x = PADDING.left + barStart
          const top = Math.min(zeroPos, valuePos)
          const bottom = Math.max(zeroPos, valuePos)
          rect = ck.LTRBRect(x, top, x + barThickness, bottom)
        }

        canvas.drawRect(rect, barPaint)

        // Draw category label
        const labelBlob = ck.TextBlob.MakeFromText(item.label, font)
        if (labelBlob) {
          if (horizontal) {
            // Draw label to the left of the bar, with padding for readability
            canvas.drawTextBlob(
              labelBlob,
              5,
              PADDING.top + barStart + barThickness / 2 + 5,
              textPaint
            )
          } else {
            // Rotate label for vertical bars
            canvas.save()
            const labelX = PADDING.left + barStart + barThickness / 2
            const labelY = h - 8
            canvas.rotate(-45, labelX, labelY)
            canvas.drawTextBlob(labelBlob, labelX, labelY, textPaint)
            canvas.restore()
          }
          labelBlob.delete()
        }

        // Draw value on bar
        if (showValues) {
          const valueLabel = formatValue(item.value)
          const valueBlob = ck.TextBlob.MakeFromText(valueLabel, font)
          if (valueBlob) {
            const valuePaint = new ck.Paint()
            valuePaint.setColor(createColor(ck, theme.text))
            valuePaint.setAntiAlias(true)

            if (horizontal) {
              // Draw value at end of bar or inside if bar is long enough
              const barWidth = Math.abs(valuePos - zeroPos)
              if (barWidth > 50) {
                // Draw inside bar at the end
                canvas.drawTextBlob(
                  valueBlob,
                  valuePos - 40,
                  PADDING.top + barStart + barThickness / 2 + 5,
                  valuePaint
                )
              } else {
                // Draw outside bar to the right
                canvas.drawTextBlob(
                  valueBlob,
                  valuePos + 8,
                  PADDING.top + barStart + barThickness / 2 + 5,
                  valuePaint
                )
              }
            } else {
              canvas.drawTextBlob(
                valueBlob,
                PADDING.left + barStart + barThickness / 2 - 12,
                valuePos - 8,
                valuePaint
              )
            }
            valuePaint.delete()
            valueBlob.delete()
          }
        }

        barPaint.delete()
      })

      // Cleanup
      gridPaint.delete()
      axisPaint.delete()
      textPaint.delete()
      font.delete()
    },
    [processedData, valueDomain, horizontal, showGrid, showValues, barPadding, formatValue]
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
