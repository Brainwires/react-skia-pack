/**
 * Utility for capturing Skia canvas elements as PNG images.
 * Used to generate static preview images for the charts/widgets navigation hubs.
 */

import type { RefObject } from "react"

/**
 * Downloads the first canvas element found in a container as a PNG image.
 * Uses a container ref approach since our chart/widget components don't expose canvas IDs.
 *
 * @param containerRef - React ref to the container element containing the canvas
 * @param filename - Name for the downloaded file (without extension)
 */
export function downloadCanvasAsImage(
  containerRef: RefObject<HTMLElement | null>,
  filename: string
): void {
  if (!containerRef.current) {
    console.warn("[downloadCanvasAsImage] Container ref is null")
    return
  }

  const canvas = containerRef.current.querySelector(
    "canvas"
  ) as HTMLCanvasElement
  if (!canvas) {
    console.warn("[downloadCanvasAsImage] No canvas found in container")
    return
  }

  try {
    const dataUrl = canvas.toDataURL("image/png")
    const link = document.createElement("a")
    link.download = `${filename}.png`
    link.href = dataUrl
    link.click()
  } catch (error) {
    console.error("[downloadCanvasAsImage] Failed to capture canvas:", error)
  }
}
