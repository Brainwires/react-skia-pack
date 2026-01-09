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
import { drawRoundedRect } from "../primitives/shapes"

export interface TreemapNode {
  label: string
  value: number
  color?: ColorTuple
  children?: TreemapNode[]
}

interface LayoutRect {
  x: number
  y: number
  width: number
  height: number
  node: TreemapNode
  color: ColorTuple
}

export interface TreemapChartProps {
  data: TreemapNode[]
  width?: number
  height?: number
  className?: string
  showLabels?: boolean
  showValues?: boolean
  padding?: number
  borderRadius?: number
  formatValue?: (value: number) => string
}

// Squarify treemap layout algorithm
function squarify(
  nodes: TreemapNode[],
  x: number,
  y: number,
  width: number,
  height: number,
  defaultColors: ColorTuple[]
): LayoutRect[] {
  if (nodes.length === 0 || width <= 0 || height <= 0) return []

  const total = nodes.reduce((sum, n) => sum + n.value, 0)
  if (total === 0) return []

  const sortedNodes = [...nodes].sort((a, b) => b.value - a.value)
  const rects: LayoutRect[] = []

  let currentX = x
  let currentY = y
  let remainingWidth = width
  let remainingHeight = height
  let remainingTotal = total

  let row: TreemapNode[] = []
  let rowTotal = 0

  const getWorstAspectRatio = (row: TreemapNode[], rowLength: number, areaTotal: number): number => {
    if (row.length === 0 || areaTotal === 0) return Infinity

    const rowAreaTotal = row.reduce((sum, n) => sum + n.value, 0)
    const rowArea = (rowAreaTotal / remainingTotal) * remainingWidth * remainingHeight
    const rowWidth = rowArea / rowLength

    let worst = 0
    row.forEach((n) => {
      const nodeArea = (n.value / areaTotal) * remainingWidth * remainingHeight
      const nodeHeight = nodeArea / rowWidth
      const aspect = Math.max(rowWidth / nodeHeight, nodeHeight / rowWidth)
      if (aspect > worst) worst = aspect
    })

    return worst
  }

  const layoutRow = (row: TreemapNode[], colorOffset: number) => {
    if (row.length === 0) return

    const rowAreaTotal = row.reduce((sum, n) => sum + n.value, 0)
    const isWider = remainingWidth >= remainingHeight

    if (isWider) {
      // Layout horizontally
      const rowWidth = (rowAreaTotal / remainingTotal) * remainingWidth
      let nodeY = currentY

      row.forEach((n, i) => {
        const nodeHeight = (n.value / rowAreaTotal) * remainingHeight
        rects.push({
          x: currentX,
          y: nodeY,
          width: rowWidth,
          height: nodeHeight,
          node: n,
          color: n.color || defaultColors[(colorOffset + i) % defaultColors.length]
        })
        nodeY += nodeHeight
      })

      currentX += rowWidth
      remainingWidth -= rowWidth
    } else {
      // Layout vertically
      const rowHeight = (rowAreaTotal / remainingTotal) * remainingHeight
      let nodeX = currentX

      row.forEach((n, i) => {
        const nodeWidth = (n.value / rowAreaTotal) * remainingWidth
        rects.push({
          x: nodeX,
          y: currentY,
          width: nodeWidth,
          height: rowHeight,
          node: n,
          color: n.color || defaultColors[(colorOffset + i) % defaultColors.length]
        })
        nodeX += nodeWidth
      })

      currentY += rowHeight
      remainingHeight -= rowHeight
    }

    remainingTotal -= rowAreaTotal
  }

  let colorOffset = 0

  sortedNodes.forEach((node) => {
    const isWider = remainingWidth >= remainingHeight
    const side = isWider ? remainingHeight : remainingWidth

    const newRow = [...row, node]
    const currentWorst = getWorstAspectRatio(row, side, remainingTotal)
    const newWorst = getWorstAspectRatio(newRow, side, remainingTotal)

    if (row.length === 0 || newWorst <= currentWorst) {
      row.push(node)
      rowTotal += node.value
    } else {
      layoutRow(row, colorOffset)
      colorOffset += row.length
      row = [node]
      rowTotal = node.value
    }
  })

  if (row.length > 0) {
    layoutRow(row, colorOffset)
  }

  return rects
}

export function TreemapChart({
  data,
  width = 400,
  height = 300,
  className,
  showLabels = true,
  showValues = true,
  padding = 2,
  borderRadius = 4,
  formatValue = (v) => v.toLocaleString()
}: TreemapChartProps) {
  // Default colors
  const defaultColors: ColorTuple[] = useMemo(
    () => [
      [0.2, 0.6, 1.0, 1.0], // Blue
      [0.4, 0.8, 0.4, 1.0], // Green
      [1.0, 0.6, 0.2, 1.0], // Orange
      [0.8, 0.3, 0.6, 1.0], // Pink
      [0.6, 0.4, 1.0, 1.0], // Purple
      [0.2, 0.8, 0.8, 1.0], // Cyan
      [1.0, 0.8, 0.2, 1.0], // Yellow
      [1.0, 0.4, 0.4, 1.0] // Red
    ],
    []
  )

  // Calculate layout
  const layout = useMemo(() => {
    return squarify(data, padding, padding, width - padding * 2, height - padding * 2, defaultColors)
  }, [data, width, height, padding, defaultColors])

  const draw = useCallback(
    (canvas: Canvas, ck: CanvasKit, w: number, h: number, typeface: Typeface | null) => {
      const isDark = detectDarkMode()
      const theme = getThemeColors(isDark)

      // Clear background
      canvas.clear(createColor(ck, theme.background))

      if (layout.length === 0) {
        const font = createFont(ck, typeface, 14)
        const paint = new ck.Paint()
        paint.setColor(createColor(ck, theme.textMuted))
        drawText(canvas, ck, "No data", w / 2, h / 2, font, paint, "center")
        font.delete()
        paint.delete()
        return
      }

      // Draw rectangles
      layout.forEach((rect) => {
        // Add padding between rectangles
        const x = rect.x + padding / 2
        const y = rect.y + padding / 2
        const rectWidth = rect.width - padding
        const rectHeight = rect.height - padding

        if (rectWidth <= 0 || rectHeight <= 0) return

        // Draw rectangle
        const paint = new ck.Paint()
        paint.setColor(createColor(ck, rect.color))
        paint.setAntiAlias(true)

        drawRoundedRect(canvas, ck, x, y, rectWidth, rectHeight, borderRadius, paint)
        paint.delete()

        // Draw border
        const borderPaint = new ck.Paint()
        borderPaint.setColor(createColor(ck, theme.background))
        borderPaint.setStyle(ck.PaintStyle.Stroke)
        borderPaint.setStrokeWidth(1)
        borderPaint.setAntiAlias(true)

        drawRoundedRect(canvas, ck, x, y, rectWidth, rectHeight, borderRadius, borderPaint)
        borderPaint.delete()

        // Calculate text color based on background brightness
        const brightness = rect.color[0] * 0.299 + rect.color[1] * 0.587 + rect.color[2] * 0.114
        const textColor: ColorTuple = brightness > 0.5 ? [0, 0, 0, 1] : [1, 1, 1, 1]

        // Draw label and value if there's enough space
        const minLabelWidth = 40
        const minLabelHeight = 20

        if (rectWidth >= minLabelWidth && rectHeight >= minLabelHeight) {
          const fontSize = Math.min(12, rectHeight / 3, rectWidth / 6)
          const font = createFont(ck, typeface, fontSize)
          const textPaint = new ck.Paint()
          textPaint.setColor(createColor(ck, textColor))
          textPaint.setAntiAlias(true)

          const centerX = x + rectWidth / 2
          let textY = y + rectHeight / 2

          if (showLabels && showValues && rectHeight >= minLabelHeight * 2) {
            // Show both label and value
            textY = y + rectHeight / 2 - fontSize / 2

            // Truncate label if needed
            let label = rect.node.label
            const maxChars = Math.floor(rectWidth / (fontSize * 0.6))
            if (label.length > maxChars) {
              label = label.slice(0, maxChars - 2) + ".."
            }

            drawText(canvas, ck, label, centerX, textY, font, textPaint, "center")
            drawText(canvas, ck, formatValue(rect.node.value), centerX, textY + fontSize + 4, font, textPaint, "center")
          } else if (showLabels) {
            // Show only label
            let label = rect.node.label
            const maxChars = Math.floor(rectWidth / (fontSize * 0.6))
            if (label.length > maxChars) {
              label = label.slice(0, maxChars - 2) + ".."
            }
            drawText(canvas, ck, label, centerX, textY + fontSize / 3, font, textPaint, "center")
          } else if (showValues) {
            // Show only value
            drawText(canvas, ck, formatValue(rect.node.value), centerX, textY + fontSize / 3, font, textPaint, "center")
          }

          font.delete()
          textPaint.delete()
        }
      })
    },
    [layout, padding, borderRadius, showLabels, showValues, formatValue]
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
