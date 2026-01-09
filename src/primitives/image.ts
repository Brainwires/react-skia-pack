/**
 * Image loading and rendering utilities for Skia
 * Load images from URLs, render with transforms
 */

import type { CanvasKit, Canvas, Paint, Image as SkiaImage } from "canvaskit-wasm"
import type { Bounds } from "../utils/geometry"

// Image cache to avoid reloading
const imageCache = new Map<string, SkiaImage>()

// Load an image from a URL
export async function loadImage(
  ck: CanvasKit,
  url: string,
  useCache: boolean = true
): Promise<SkiaImage | null> {
  // Check cache first
  if (useCache && imageCache.has(url)) {
    return imageCache.get(url) || null
  }

  try {
    const response = await fetch(url)
    if (!response.ok) {
      console.error(`Failed to load image: ${url}`)
      return null
    }

    const arrayBuffer = await response.arrayBuffer()
    const image = ck.MakeImageFromEncoded(new Uint8Array(arrayBuffer))

    if (image && useCache) {
      imageCache.set(url, image)
    }

    return image
  } catch (error) {
    console.error(`Error loading image: ${url}`, error)
    return null
  }
}

// Load an image from a data URL or base64 string
export function loadImageFromData(
  ck: CanvasKit,
  data: string | ArrayBuffer | Uint8Array
): SkiaImage | null {
  try {
    let bytes: Uint8Array

    if (typeof data === "string") {
      // Handle base64 or data URL
      const base64 = data.includes(",") ? data.split(",")[1] : data
      const binary = atob(base64)
      bytes = new Uint8Array(binary.length)
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i)
      }
    } else if (data instanceof ArrayBuffer) {
      bytes = new Uint8Array(data)
    } else {
      bytes = data
    }

    return ck.MakeImageFromEncoded(bytes)
  } catch (error) {
    console.error("Error loading image from data:", error)
    return null
  }
}

// Draw an image at position
export function drawImage(
  canvas: Canvas,
  _ck: CanvasKit,
  image: SkiaImage,
  x: number,
  y: number,
  paint?: Paint | null
): void {
  canvas.drawImage(image, x, y, paint ?? null)
}

// Draw an image scaled to fit within bounds
export function drawImageFit(
  canvas: Canvas,
  ck: CanvasKit,
  image: SkiaImage,
  bounds: Bounds,
  fit: "contain" | "cover" | "fill" | "none" = "contain",
  paint?: Paint | null
): void {
  const imgWidth = image.width()
  const imgHeight = image.height()
  const { x, y, width, height } = bounds

  let scale = 1
  let offsetX = 0
  let offsetY = 0
  const srcRect = ck.LTRBRect(0, 0, imgWidth, imgHeight)
  let dstRect: Float32Array

  switch (fit) {
    case "contain": {
      // Scale to fit within bounds, maintaining aspect ratio
      scale = Math.min(width / imgWidth, height / imgHeight)
      const scaledWidth = imgWidth * scale
      const scaledHeight = imgHeight * scale
      offsetX = x + (width - scaledWidth) / 2
      offsetY = y + (height - scaledHeight) / 2
      dstRect = ck.LTRBRect(offsetX, offsetY, offsetX + scaledWidth, offsetY + scaledHeight)
      break
    }
    case "cover": {
      // Scale to cover bounds, maintaining aspect ratio (may crop)
      scale = Math.max(width / imgWidth, height / imgHeight)
      const scaledWidth = imgWidth * scale
      const scaledHeight = imgHeight * scale
      offsetX = x + (width - scaledWidth) / 2
      offsetY = y + (height - scaledHeight) / 2
      dstRect = ck.LTRBRect(offsetX, offsetY, offsetX + scaledWidth, offsetY + scaledHeight)
      // Clip to bounds
      canvas.save()
      canvas.clipRect(ck.LTRBRect(x, y, x + width, y + height), ck.ClipOp.Intersect, true)
      canvas.drawImageRectOptions(image, srcRect, dstRect, ck.FilterMode.Linear, ck.MipmapMode.Linear, paint)
      canvas.restore()
      return
    }
    case "fill": {
      // Stretch to fill bounds (may distort)
      dstRect = ck.LTRBRect(x, y, x + width, y + height)
      break
    }
    case "none":
    default: {
      // Draw at original size, centered
      offsetX = x + (width - imgWidth) / 2
      offsetY = y + (height - imgHeight) / 2
      canvas.drawImage(image, offsetX, offsetY, paint ?? null)
      return
    }
  }

  canvas.drawImageRectOptions(image, srcRect, dstRect, ck.FilterMode.Linear, ck.MipmapMode.Linear, paint)
}

// Draw a portion of an image (sprite sheet style)
export function drawImageRect(
  canvas: Canvas,
  ck: CanvasKit,
  image: SkiaImage,
  srcX: number,
  srcY: number,
  srcWidth: number,
  srcHeight: number,
  dstX: number,
  dstY: number,
  dstWidth: number,
  dstHeight: number,
  paint?: Paint | null
): void {
  const srcRect = ck.LTRBRect(srcX, srcY, srcX + srcWidth, srcY + srcHeight)
  const dstRect = ck.LTRBRect(dstX, dstY, dstX + dstWidth, dstY + dstHeight)
  canvas.drawImageRectOptions(image, srcRect, dstRect, ck.FilterMode.Linear, ck.MipmapMode.Linear, paint)
}

// Draw an image with rotation
export function drawImageRotated(
  canvas: Canvas,
  ck: CanvasKit,
  image: SkiaImage,
  x: number,
  y: number,
  angleDegrees: number,
  anchorX: number = 0.5,
  anchorY: number = 0.5,
  paint?: Paint | null
): void {
  const width = image.width()
  const height = image.height()
  const centerX = x + width * anchorX
  const centerY = y + height * anchorY

  canvas.save()
  canvas.rotate(angleDegrees, centerX, centerY)
  canvas.drawImage(image, x, y, paint ?? null)
  canvas.restore()
}

// Draw an image with scale
export function drawImageScaled(
  canvas: Canvas,
  ck: CanvasKit,
  image: SkiaImage,
  x: number,
  y: number,
  scaleX: number,
  scaleY: number = scaleX,
  paint?: Paint | null
): void {
  const width = image.width()
  const height = image.height()
  const srcRect = ck.LTRBRect(0, 0, width, height)
  const dstRect = ck.LTRBRect(x, y, x + width * scaleX, y + height * scaleY)
  canvas.drawImageRectOptions(image, srcRect, dstRect, ck.FilterMode.Linear, ck.MipmapMode.Linear, paint)
}

// Draw a circular image (avatar style)
export function drawCircularImage(
  canvas: Canvas,
  ck: CanvasKit,
  image: SkiaImage,
  cx: number,
  cy: number,
  radius: number,
  paint?: Paint | null
): void {
  canvas.save()

  // Create circular clip
  const clipPath = new ck.Path()
  clipPath.addCircle(cx, cy, radius, false)
  canvas.clipPath(clipPath, ck.ClipOp.Intersect, true)

  // Draw image centered and scaled to cover the circle
  const imgWidth = image.width()
  const imgHeight = image.height()
  const scale = Math.max(radius * 2 / imgWidth, radius * 2 / imgHeight)
  const scaledWidth = imgWidth * scale
  const scaledHeight = imgHeight * scale
  const offsetX = cx - scaledWidth / 2
  const offsetY = cy - scaledHeight / 2

  const srcRect = ck.LTRBRect(0, 0, imgWidth, imgHeight)
  const dstRect = ck.LTRBRect(offsetX, offsetY, offsetX + scaledWidth, offsetY + scaledHeight)
  canvas.drawImageRectOptions(image, srcRect, dstRect, ck.FilterMode.Linear, ck.MipmapMode.Linear, paint)

  canvas.restore()
  clipPath.delete()
}

// Draw a rounded rectangle image
export function drawRoundedImage(
  canvas: Canvas,
  ck: CanvasKit,
  image: SkiaImage,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
  paint?: Paint | null
): void {
  canvas.save()

  // Create rounded rect clip
  const rrect = ck.RRectXY(
    ck.LTRBRect(x, y, x + width, y + height),
    radius,
    radius
  )
  canvas.clipRRect(rrect, ck.ClipOp.Intersect, true)

  // Draw image scaled to cover
  drawImageFit(canvas, ck, image, { x, y, width, height }, "cover", paint)

  canvas.restore()
}

// Create a tiled pattern from an image
export function drawTiledImage(
  canvas: Canvas,
  ck: CanvasKit,
  image: SkiaImage,
  x: number,
  y: number,
  width: number,
  height: number,
  paint?: Paint | null
): void {
  const imgWidth = image.width()
  const imgHeight = image.height()

  canvas.save()
  canvas.clipRect(ck.LTRBRect(x, y, x + width, y + height), ck.ClipOp.Intersect, true)

  for (let tx = x; tx < x + width; tx += imgWidth) {
    for (let ty = y; ty < y + height; ty += imgHeight) {
      canvas.drawImage(image, tx, ty, paint ?? null)
    }
  }

  canvas.restore()
}

// Clear image cache
export function clearImageCache(): void {
  for (const image of imageCache.values()) {
    image.delete()
  }
  imageCache.clear()
}

// Remove a specific image from cache
export function removeFromCache(url: string): void {
  const image = imageCache.get(url)
  if (image) {
    image.delete()
    imageCache.delete(url)
  }
}

// Get image dimensions
export function getImageDimensions(image: SkiaImage): { width: number; height: number } {
  return {
    width: image.width(),
    height: image.height()
  }
}

// Create an image shader for patterns
export function createImageShader(
  ck: CanvasKit,
  image: SkiaImage,
  tileMode: "clamp" | "repeat" | "mirror" | "decal" = "repeat"
): ReturnType<SkiaImage["makeShaderOptions"]> {
  const modes = {
    clamp: ck.TileMode.Clamp,
    repeat: ck.TileMode.Repeat,
    mirror: ck.TileMode.Mirror,
    decal: ck.TileMode.Decal
  }

  return image.makeShaderOptions(
    modes[tileMode],
    modes[tileMode],
    ck.FilterMode.Linear,
    ck.MipmapMode.Linear
  )
}
