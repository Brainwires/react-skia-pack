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
import { drawLine } from "../primitives/shapes"
import { drawText, createFont } from "../primitives/text"
import { createLinearScale, scaleValue } from "../utils/scales"

export interface CandlestickData {
  date: string | number
  open: number
  high: number
  low: number
  close: number
  volume?: number
}

export interface CandlestickChartProps {
  data: CandlestickData[]
  width?: number
  height?: number
  className?: string
  showVolume?: boolean
  showGrid?: boolean
  showLabels?: boolean
  upColor?: ColorTuple
  downColor?: ColorTuple
  candleWidth?: number
  padding?: { top?: number; right?: number; bottom?: number; left?: number }
}

export function CandlestickChart({
  data,
  width = 600,
  height = 400,
  className,
  showVolume = true,
  showGrid = true,
  showLabels = true,
  upColor = [0.2, 0.8, 0.4, 1.0],
  downColor = [1.0, 0.3, 0.3, 1.0],
  candleWidth: candleWidthProp,
  padding = {}
}: CandlestickChartProps) {
  const { top = 20, right = 60, bottom = 40, left = 10 } = padding

  // Calculate scales
  const { priceScale, volumeScale, xScale, minPrice, maxPrice } = useMemo(() => {
    if (data.length === 0) {
      return {
        priceScale: createLinearScale([0, 100], [0, height]),
        volumeScale: createLinearScale([0, 100], [0, height]),
        xScale: (i: number) => i,
        minPrice: 0,
        maxPrice: 100
      }
    }

    let minP = Infinity
    let maxP = -Infinity
    let maxV = 0

    data.forEach((d) => {
      if (d.low < minP) minP = d.low
      if (d.high > maxP) maxP = d.high
      if (d.volume && d.volume > maxV) maxV = d.volume
    })

    // Add some padding to price range
    const priceRange = maxP - minP
    minP -= priceRange * 0.05
    maxP += priceRange * 0.05

    const volumeHeight = showVolume ? height * 0.2 : 0
    const priceHeight = height - top - bottom - volumeHeight

    return {
      priceScale: createLinearScale([minP, maxP], [top + priceHeight, top]),
      volumeScale: createLinearScale([0, maxV], [height - bottom, height - bottom - volumeHeight + 10]),
      xScale: (i: number) => left + ((width - left - right) / data.length) * (i + 0.5),
      minPrice: minP,
      maxPrice: maxP
    }
  }, [data, width, height, top, right, bottom, left, showVolume])

  const draw = useCallback(
    (canvas: Canvas, ck: CanvasKit, w: number, h: number, typeface: Typeface | null) => {
      const isDark = detectDarkMode()
      const theme = getThemeColors(isDark)

      // Clear background
      canvas.clear(createColor(ck, theme.background))

      if (data.length === 0) {
        const font = createFont(ck, typeface, 14)
        const paint = new ck.Paint()
        paint.setColor(createColor(ck, theme.textMuted))
        drawText(canvas, ck, "No data", w / 2, h / 2, font, paint, "center")
        font.delete()
        paint.delete()
        return
      }

      const volumeHeight = showVolume ? h * 0.2 : 0
      const priceAreaBottom = h - bottom - volumeHeight

      // Draw grid
      if (showGrid) {
        const gridPaint = new ck.Paint()
        gridPaint.setColor(createColor(ck, theme.grid))
        gridPaint.setStrokeWidth(1)
        gridPaint.setAntiAlias(true)

        // Horizontal grid lines
        const priceRange = maxPrice - minPrice
        const priceStep = priceRange / 5
        for (let i = 0; i <= 5; i++) {
          const price = minPrice + i * priceStep
          const y = scaleValue(priceScale, price)
          drawLine(canvas, ck, left, y, w - right, y, gridPaint)
        }

        // Vertical grid lines (every 5 candles)
        for (let i = 0; i < data.length; i += 5) {
          const x = xScale(i)
          drawLine(canvas, ck, x, top, x, priceAreaBottom, gridPaint)
        }

        gridPaint.delete()
      }

      // Calculate candle width
      const candleSpacing = (w - left - right) / data.length
      const candleW = candleWidthProp || Math.max(1, candleSpacing * 0.7)

      // Draw candles
      data.forEach((d, i) => {
        const x = xScale(i)
        const isUp = d.close >= d.open
        const color = isUp ? upColor : downColor

        const bodyTop = scaleValue(priceScale, Math.max(d.open, d.close))
        const bodyBottom = scaleValue(priceScale, Math.min(d.open, d.close))
        const bodyHeight = Math.max(1, bodyBottom - bodyTop)

        const wickTop = scaleValue(priceScale, d.high)
        const wickBottom = scaleValue(priceScale, d.low)

        // Draw wick
        const wickPaint = new ck.Paint()
        wickPaint.setColor(createColor(ck, color))
        wickPaint.setStrokeWidth(1)
        wickPaint.setAntiAlias(true)
        drawLine(canvas, ck, x, wickTop, x, wickBottom, wickPaint)
        wickPaint.delete()

        // Draw body
        const bodyPaint = new ck.Paint()
        bodyPaint.setColor(createColor(ck, color))
        bodyPaint.setAntiAlias(true)

        if (isUp) {
          // Hollow body for up candles
          bodyPaint.setStyle(ck.PaintStyle.Stroke)
          bodyPaint.setStrokeWidth(1)
        }

        canvas.drawRect(
          ck.XYWHRect(x - candleW / 2, bodyTop, candleW, bodyHeight),
          bodyPaint
        )
        bodyPaint.delete()

        // Draw volume bar
        if (showVolume && d.volume) {
          const volY = scaleValue(volumeScale, d.volume)
          const volHeight = h - bottom - volY

          const volPaint = new ck.Paint()
          volPaint.setColor(createColor(ck, [color[0], color[1], color[2], 0.5]))
          volPaint.setAntiAlias(true)

          canvas.drawRect(
            ck.XYWHRect(x - candleW / 2, volY, candleW, volHeight),
            volPaint
          )
          volPaint.delete()
        }
      })

      // Draw price labels on right side
      if (showLabels) {
        const labelFont = createFont(ck, typeface, 10)
        const labelPaint = new ck.Paint()
        labelPaint.setColor(createColor(ck, theme.text))
        labelPaint.setAntiAlias(true)

        const priceRange = maxPrice - minPrice
        const priceStep = priceRange / 5
        for (let i = 0; i <= 5; i++) {
          const price = minPrice + i * priceStep
          const y = scaleValue(priceScale, price)
          drawText(canvas, ck, price.toFixed(2), w - right + 5, y + 4, labelFont, labelPaint, "left")
        }

        // Draw date labels at bottom
        const dateInterval = Math.max(1, Math.floor(data.length / 6))
        data.forEach((d, i) => {
          if (i % dateInterval === 0 || i === data.length - 1) {
            const x = xScale(i)
            const label = typeof d.date === "string" ? d.date : new Date(d.date).toLocaleDateString()
            const shortLabel = label.length > 6 ? label.slice(0, 6) : label
            drawText(canvas, ck, shortLabel, x, h - bottom + 15, labelFont, labelPaint, "center")
          }
        })

        labelFont.delete()
        labelPaint.delete()
      }

      // Draw separator line between price and volume
      if (showVolume) {
        const separatorPaint = new ck.Paint()
        separatorPaint.setColor(createColor(ck, theme.grid))
        separatorPaint.setStrokeWidth(1)
        drawLine(canvas, ck, left, priceAreaBottom + 5, w - right, priceAreaBottom + 5, separatorPaint)
        separatorPaint.delete()
      }
    },
    [data, priceScale, volumeScale, xScale, minPrice, maxPrice, top, right, bottom, left, showGrid, showVolume, showLabels, upColor, downColor, candleWidthProp]
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
