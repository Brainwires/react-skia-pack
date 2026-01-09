/**
 * Skia Primitives
 * Basic drawing utilities for shapes, text, images, gradients, and effects
 */

// Shapes
export {
  drawRoundedRect,
  drawRoundedRectComplex,
  drawCircle,
  drawEllipse,
  drawPolygon,
  drawPolygonFromPoints,
  drawStar,
  drawArc,
  drawArcRing,
  drawLine,
  drawLines,
  drawPolyline,
  drawSmoothCurve,
  drawRing,
  drawCapsule,
  drawCross,
  createRoundedRectPath,
  createCirclePath,
  createPolygonPath
} from "./shapes"

// Gradients
export {
  createLinearGradient,
  createRadialGradient,
  createTwoPointRadialGradient,
  createSweepGradient,
  createVerticalGradient,
  createHorizontalGradient,
  createDiagonalGradient,
  createFadeGradient,
  createColorScaleGradient,
  createEvenGradient,
  GradientBuilder,
  gradientBuilder,
  type GradientStop
} from "./gradients"

// Effects
export {
  createBlurFilter,
  createDropShadow,
  createDropShadowOnly,
  createInnerShadow,
  createGlow,
  createColorMatrixFilter,
  colorMatrices,
  applyBlurMask,
  createBlurMaskFilter,
  composeFilters,
  createDilateFilter,
  createErodeFilter,
  createOffsetFilter,
  createShadowFromConfig,
  createMultipleShadows,
  shadowPresets,
  type ShadowConfig
} from "./effects"

// Text
export {
  measureText,
  measureTextDimensions,
  getFontMetrics,
  drawText,
  drawMultilineText,
  wrapText,
  truncateText,
  drawTextOnPath,
  createTextBlob,
  drawTextWithBackground,
  getTextBounds,
  drawRotatedText,
  createFont,
  drawTextWithShadow,
  type TextAlign,
  type TextBaseline,
  type TextStyle
} from "./text"

// Path utilities
export {
  createPath,
  moveTo,
  lineTo,
  quadTo,
  cubicTo,
  closePath,
  pathFromPoints,
  smoothPathFromPoints,
  roundedPolygonPath,
  wavePath,
  zigzagPath,
  spiralPath,
  heartPath,
  arrowPath,
  roundedRectPath,
  getPathBounds,
  pointInPath,
  combinePaths,
  transformPath,
  dashPath
} from "./path-utils"

// Image utilities
export {
  loadImage,
  loadImageFromData,
  drawImage,
  drawImageFit,
  drawImageRect,
  drawImageRotated,
  drawImageScaled,
  drawCircularImage,
  drawRoundedImage,
  drawTiledImage,
  clearImageCache,
  removeFromCache,
  getImageDimensions,
  createImageShader
} from "./image"
