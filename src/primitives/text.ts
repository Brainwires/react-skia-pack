/**
 * Text rendering utilities for Skia
 * Text measurement, multi-line text, and text styling
 */

import type { CanvasKit, Canvas, Paint, Font, Typeface, TextBlob, Path } from "canvaskit-wasm"
import type { Point } from "../utils/geometry"

// Text alignment options
export type TextAlign = "left" | "center" | "right"
export type TextBaseline = "top" | "middle" | "bottom" | "alphabetic"

// Text style configuration
export interface TextStyle {
  fontSize: number
  color?: Float32Array
  fontWeight?: "normal" | "bold"
  fontStyle?: "normal" | "italic"
}

// Measure text width
export function measureText(
  ck: CanvasKit,
  text: string,
  font: Font
): number {
  // Use getGlyphIDs to get glyph IDs, then getGlyphWidths to get widths
  const glyphIDs = font.getGlyphIDs(text)
  const widths = font.getGlyphWidths(glyphIDs)
  return widths.reduce((sum, w) => sum + w, 0)
}

// Measure text dimensions (width and height)
export function measureTextDimensions(
  ck: CanvasKit,
  text: string,
  font: Font
): { width: number; height: number } {
  const metrics = font.getMetrics()
  const width = measureText(ck, text, font)
  const height = metrics.descent - metrics.ascent

  return { width, height }
}

// Get font metrics
export function getFontMetrics(font: Font): {
  ascent: number
  descent: number
  leading: number
  lineHeight: number
} {
  const metrics = font.getMetrics()
  return {
    ascent: -metrics.ascent, // Skia uses negative ascent
    descent: metrics.descent,
    leading: metrics.leading || 0,
    lineHeight: -metrics.ascent + metrics.descent + (metrics.leading || 0)
  }
}

// Draw text at position with alignment
export function drawText(
  canvas: Canvas,
  ck: CanvasKit,
  text: string,
  x: number,
  y: number,
  font: Font,
  paint: Paint,
  align: TextAlign = "left",
  baseline: TextBaseline = "alphabetic"
): void {
  if (!text) return

  const blob = ck.TextBlob.MakeFromText(text, font)
  if (!blob) return

  // Calculate alignment offset
  let offsetX = 0
  if (align !== "left") {
    const width = measureText(ck, text, font)
    offsetX = align === "center" ? -width / 2 : -width
  }

  // Calculate baseline offset
  let offsetY = 0
  const metrics = getFontMetrics(font)
  switch (baseline) {
    case "top":
      offsetY = metrics.ascent
      break
    case "middle":
      offsetY = (metrics.ascent - metrics.descent) / 2
      break
    case "bottom":
      offsetY = -metrics.descent
      break
    case "alphabetic":
    default:
      offsetY = 0
      break
  }

  canvas.drawTextBlob(blob, x + offsetX, y + offsetY, paint)
  blob.delete()
}

// Draw multi-line text
export function drawMultilineText(
  canvas: Canvas,
  ck: CanvasKit,
  lines: string[],
  x: number,
  y: number,
  font: Font,
  paint: Paint,
  options: {
    align?: TextAlign
    lineHeight?: number
    maxWidth?: number
  } = {}
): void {
  const { align = "left", lineHeight: customLineHeight, maxWidth } = options
  const metrics = getFontMetrics(font)
  const lineHeight = customLineHeight ?? metrics.lineHeight

  let currentY = y

  for (const line of lines) {
    let textToDraw = line

    // Truncate if maxWidth is specified
    if (maxWidth && measureText(ck, line, font) > maxWidth) {
      textToDraw = truncateText(ck, line, font, maxWidth, "...")
    }

    drawText(canvas, ck, textToDraw, x, currentY, font, paint, align, "top")
    currentY += lineHeight
  }
}

// Wrap text to fit within a maximum width
export function wrapText(
  ck: CanvasKit,
  text: string,
  font: Font,
  maxWidth: number
): string[] {
  if (!text || maxWidth <= 0) return []

  const words = text.split(/\s+/)
  const lines: string[] = []
  let currentLine = ""

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word
    const testWidth = measureText(ck, testLine, font)

    if (testWidth > maxWidth && currentLine) {
      lines.push(currentLine)
      currentLine = word
    } else {
      currentLine = testLine
    }
  }

  if (currentLine) {
    lines.push(currentLine)
  }

  return lines
}

// Truncate text with ellipsis
export function truncateText(
  ck: CanvasKit,
  text: string,
  font: Font,
  maxWidth: number,
  ellipsis: string = "..."
): string {
  if (!text) return ""

  const fullWidth = measureText(ck, text, font)
  if (fullWidth <= maxWidth) return text

  const ellipsisWidth = measureText(ck, ellipsis, font)
  const targetWidth = maxWidth - ellipsisWidth

  if (targetWidth <= 0) return ellipsis

  let truncated = text
  while (truncated.length > 0 && measureText(ck, truncated, font) > targetWidth) {
    truncated = truncated.slice(0, -1)
  }

  return truncated + ellipsis
}

// Draw text along a path
export function drawTextOnPath(
  canvas: Canvas,
  ck: CanvasKit,
  text: string,
  path: Path,
  font: Font,
  paint: Paint,
  offset: number = 0
): void {
  // CanvasKit's TextBlob.MakeOnPath draws text along a path

  const blob = ck.TextBlob.MakeOnPath(text, path, font, offset)
  if (blob) {
    canvas.drawTextBlob(blob, 0, 0, paint)
    blob.delete()
  }
}

// Create styled text blob
export function createTextBlob(
  ck: CanvasKit,
  text: string,
  font: Font
): TextBlob | null {
  return ck.TextBlob.MakeFromText(text, font)
}

// Draw text with background
export function drawTextWithBackground(
  canvas: Canvas,
  ck: CanvasKit,
  text: string,
  x: number,
  y: number,
  font: Font,
  textPaint: Paint,
  bgPaint: Paint,
  options: {
    padding?: number | { x: number; y: number }
    borderRadius?: number
    align?: TextAlign
    baseline?: TextBaseline
  } = {}
): void {
  const {
    padding = 4,
    borderRadius = 0,
    align = "left",
    baseline = "alphabetic"
  } = options

  const padX = typeof padding === "number" ? padding : padding.x
  const padY = typeof padding === "number" ? padding : padding.y

  const { width, height } = measureTextDimensions(ck, text, font)
  const metrics = getFontMetrics(font)

  // Calculate text position with alignment
  let textX = x
  if (align === "center") textX = x - width / 2
  else if (align === "right") textX = x - width

  let textY = y
  switch (baseline) {
    case "top":
      textY = y + metrics.ascent
      break
    case "middle":
      textY = y + (metrics.ascent - metrics.descent) / 2
      break
    case "bottom":
      textY = y - metrics.descent
      break
  }

  // Background rectangle
  const bgX = textX - padX
  const bgY = textY - metrics.ascent - padY
  const bgWidth = width + padX * 2
  const bgHeight = height + padY * 2

  if (borderRadius > 0) {
    const rrect = ck.RRectXY(
      ck.LTRBRect(bgX, bgY, bgX + bgWidth, bgY + bgHeight),
      borderRadius,
      borderRadius
    )
    canvas.drawRRect(rrect, bgPaint)
  } else {
    canvas.drawRect(ck.LTRBRect(bgX, bgY, bgX + bgWidth, bgY + bgHeight), bgPaint)
  }

  // Draw text
  const blob = ck.TextBlob.MakeFromText(text, font)
  if (blob) {
    canvas.drawTextBlob(blob, textX, textY, textPaint)
    blob.delete()
  }
}

// Calculate text bounds
export function getTextBounds(
  ck: CanvasKit,
  text: string,
  x: number,
  y: number,
  font: Font,
  align: TextAlign = "left",
  baseline: TextBaseline = "alphabetic"
): { x: number; y: number; width: number; height: number } {
  const { width, height } = measureTextDimensions(ck, text, font)
  const metrics = getFontMetrics(font)

  let textX = x
  if (align === "center") textX = x - width / 2
  else if (align === "right") textX = x - width

  let textY = y
  switch (baseline) {
    case "top":
      break
    case "middle":
      textY = y - height / 2
      break
    case "bottom":
      textY = y - height
      break
    case "alphabetic":
      textY = y - metrics.ascent
      break
  }

  return { x: textX, y: textY, width, height }
}

// Draw rotated text
export function drawRotatedText(
  canvas: Canvas,
  ck: CanvasKit,
  text: string,
  x: number,
  y: number,
  angleDegrees: number,
  font: Font,
  paint: Paint,
  align: TextAlign = "left"
): void {
  canvas.save()
  canvas.rotate(angleDegrees, x, y)
  drawText(canvas, ck, text, x, y, font, paint, align)
  canvas.restore()
}

// Create a font with size
export function createFont(
  ck: CanvasKit,
  typeface: Typeface | null,
  size: number
): Font {
  return new ck.Font(typeface, size)
}

// Draw text with shadow
export function drawTextWithShadow(
  canvas: Canvas,
  ck: CanvasKit,
  text: string,
  x: number,
  y: number,
  font: Font,
  textPaint: Paint,
  shadowPaint: Paint,
  shadowOffset: Point = { x: 1, y: 1 }
): void {
  // Draw shadow first
  const blob = ck.TextBlob.MakeFromText(text, font)
  if (blob) {
    canvas.drawTextBlob(blob, x + shadowOffset.x, y + shadowOffset.y, shadowPaint)
    canvas.drawTextBlob(blob, x, y, textPaint)
    blob.delete()
  }
}
