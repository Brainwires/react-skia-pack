"use client"

import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
  forwardRef,
  type MutableRefObject
} from "react"
import type { CanvasKit, Canvas, Typeface } from "canvaskit-wasm"
import { SkiaInteractiveCanvas, type PointerEventData } from "../skia-interactive-canvas"
import {
  createColor,
  getThemeColors,
  detectDarkMode,
  type ColorTuple
} from "../utils/colors"
import { drawRoundedRect, drawLine } from "../primitives/shapes"
import { drawText, createFont } from "../primitives/text"
import { useAnimation } from "../utils/animation"
import { clamp } from "../utils/geometry"

// ============================================================================
// Types
// ============================================================================

export interface SkiaAudioPlayerProps {
  src: string
  width?: number
  height?: number
  className?: string
  autoPlay?: boolean
  showVisualization?: boolean
  showControls?: boolean
  showTimeline?: boolean
  showVolume?: boolean
  visualizationMode?: "waveform" | "frequency"
  /** Number of frequency bins to display in spectrum analyzer (default: 64) */
  frequencyBins?: number
  accentColor?: ColorTuple
  onError?: (error: string) => void
  onLoadedMetaData?: () => void
  onTimeUpdate?: () => void
  onEnded?: () => void
  onCanPlay?: () => void
  onPlay?: () => void
  onPause?: () => void
}

interface AudioPlayerContextProps {
  isAudioReady: boolean
  isPlaying: boolean
  currentTime: number
  duration: number
  volume: number
  isMuted: boolean
  togglePlay: () => void
  toggleMuted: () => void
  seek: (time: number) => void
  setVolume: (volume: number) => void
  visualizationMode: "waveform" | "frequency"
  toggleVisualizationMode: () => void
}

// ============================================================================
// Context
// ============================================================================

const AudioPlayerContext = createContext<AudioPlayerContextProps | undefined>(undefined)

const useAudioPlayerContext = () => {
  const context = useContext(AudioPlayerContext)
  if (!context) {
    throw new Error("Audio player sub-components must be used within SkiaAudioPlayer")
  }
  return context
}

// ============================================================================
// Helper Functions
// ============================================================================

const formatTime = (time: number): string => {
  const minutes = Math.floor(time / 60)
  const seconds = Math.floor(time % 60)
  return `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`
}

// ============================================================================
// Waveform Visualization Component
// ============================================================================

interface WaveformProps {
  width: number
  height: number
  accentColor: ColorTuple
  analyserRef: React.RefObject<AnalyserNode | null>
  dummyDataRef: React.RefObject<Uint8Array | null>
  frequencyBins: number
}

function WaveformVisualization({ width, height, accentColor, analyserRef, dummyDataRef, frequencyBins }: WaveformProps) {
  const { isPlaying, visualizationMode, currentTime, duration, seek } = useAudioPlayerContext()
  const [hoverProgress, setHoverProgress] = useState<number | null>(null)

  const handlePointerDown = useCallback(
    (e: PointerEventData) => {
      if (duration > 0) {
        const progress = clamp(e.x / width, 0, 1)
        seek(progress * duration)
      }
    },
    [width, duration, seek]
  )

  const handlePointerMove = useCallback(
    (e: PointerEventData) => {
      setHoverProgress(clamp(e.x / width, 0, 1))
    },
    [width]
  )

  const handlePointerLeave = useCallback(() => {
    setHoverProgress(null)
  }, [])

  const draw = useCallback(
    (canvas: Canvas, ck: CanvasKit, w: number, h: number, typeface: Typeface | null) => {
      const isDark = detectDarkMode()
      const theme = getThemeColors(isDark)

      // Clear background
      canvas.clear(createColor(ck, theme.surface))

      // Get audio data
      let dataArray: Uint8Array
      const usingRealData = analyserRef.current !== null

      if (usingRealData && analyserRef.current) {
        if (visualizationMode === "waveform") {
          const typedArray = new Uint8Array(analyserRef.current.fftSize)
          analyserRef.current.getByteTimeDomainData(typedArray as Uint8Array<ArrayBuffer>)
          dataArray = typedArray
        } else {
          const typedArray = new Uint8Array(analyserRef.current.frequencyBinCount)
          analyserRef.current.getByteFrequencyData(typedArray as Uint8Array<ArrayBuffer>)
          dataArray = typedArray
        }
      } else {
        dataArray = dummyDataRef.current || new Uint8Array(2048)
        if (isPlaying && dummyDataRef.current) {
          // Animate dummy data
          const first = dummyDataRef.current[0]
          for (let i = 0; i < dummyDataRef.current.length - 1; i++) {
            dummyDataRef.current[i] = dummyDataRef.current[i + 1]
          }
          dummyDataRef.current[dummyDataRef.current.length - 1] = first
        }
      }

      // Draw visualization
      if (visualizationMode === "waveform") {
        // Waveform
        const paint = new ck.Paint()
        paint.setColor(createColor(ck, accentColor))
        paint.setStrokeWidth(2)
        paint.setStyle(ck.PaintStyle.Stroke)
        paint.setAntiAlias(true)

        const path = new ck.Path()
        const sliceWidth = w / dataArray.length
        let x = 0

        for (let i = 0; i < dataArray.length; i++) {
          const v = dataArray[i] / 128.0
          const y = (v * h) / 2

          if (i === 0) {
            path.moveTo(x, y)
          } else {
            path.lineTo(x, y)
          }
          x += sliceWidth
        }

        canvas.drawPath(path, paint)
        path.delete()
        paint.delete()
      } else {
        // Frequency bars - aggregate data into frequencyBins
        const numBars = Math.min(frequencyBins, dataArray.length)
        const barWidth = w / numBars
        const samplesPerBar = Math.floor(dataArray.length / numBars)
        const gap = Math.max(1, barWidth * 0.1) // 10% gap between bars

        for (let i = 0; i < numBars; i++) {
          // Average the samples for this bar
          let sum = 0
          const startIdx = i * samplesPerBar
          const endIdx = Math.min(startIdx + samplesPerBar, dataArray.length)

          for (let j = startIdx; j < endIdx; j++) {
            let value = dataArray[j]
            if (!usingRealData) {
              value = Math.abs(Math.sin(j * 0.1) * 128) + (isPlaying ? Math.random() * 50 : 0)
            }
            sum += value
          }

          const avgValue = sum / (endIdx - startIdx)
          const barHeight = (avgValue / 255) * h

          // Improved color: brighter base with intensity variation
          const intensity = 0.6 + (avgValue / 255) * 0.4 // Range 0.6-1.0
          const barPaint = new ck.Paint()
          barPaint.setColor(
            createColor(ck, [
              Math.min(1, accentColor[0] * intensity + 0.2),
              Math.min(1, accentColor[1] * intensity + 0.2),
              Math.min(1, accentColor[2] * intensity + 0.2),
              1.0
            ])
          )
          barPaint.setAntiAlias(true)

          const x = i * barWidth
          canvas.drawRect(ck.XYWHRect(x, h - barHeight, barWidth - gap, barHeight), barPaint)
          barPaint.delete()
        }
      }

      // Draw progress overlay
      const progress = duration > 0 ? currentTime / duration : 0
      const progressX = w * progress

      const progressPaint = new ck.Paint()
      progressPaint.setColor(createColor(ck, [0, 0, 0, 0.3]))
      canvas.drawRect(ck.XYWHRect(progressX, 0, w - progressX, h), progressPaint)
      progressPaint.delete()

      // Draw progress line
      const linePaint = new ck.Paint()
      linePaint.setColor(createColor(ck, theme.text))
      linePaint.setStrokeWidth(2)
      linePaint.setAntiAlias(true)
      drawLine(canvas, ck, progressX, 0, progressX, h, linePaint)
      linePaint.delete()

      // Draw hover line
      if (hoverProgress !== null) {
        const hoverX = w * hoverProgress
        const hoverPaint = new ck.Paint()
        hoverPaint.setColor(createColor(ck, [1, 1, 1, 0.5]))
        hoverPaint.setStrokeWidth(1)
        hoverPaint.setAntiAlias(true)
        drawLine(canvas, ck, hoverX, 0, hoverX, h, hoverPaint)
        hoverPaint.delete()
      }
    },
    [visualizationMode, isPlaying, currentTime, duration, hoverProgress, accentColor, analyserRef, dummyDataRef, frequencyBins]
  )

  return (
    <SkiaInteractiveCanvas
      width={width}
      height={height}
      onDraw={draw}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      cursor="pointer"
    />
  )
}

// ============================================================================
// Controls Component
// ============================================================================

interface ControlsProps {
  width: number
  height: number
  accentColor: ColorTuple
}

function ControlsBar({ width, height, accentColor }: ControlsProps) {
  const { isPlaying, togglePlay, currentTime, duration, volume, isMuted, toggleMuted, setVolume } = useAudioPlayerContext()
  const [isDraggingVolume, setIsDraggingVolume] = useState(false)
  const [hoverArea, setHoverArea] = useState<"play" | "mute" | "volume" | null>(null)

  // Animation for play button
  const [playScale] = useAnimation(isPlaying ? 1 : 1, { duration: 150 })

  // Layout constants
  const buttonSize = Math.min(36, height - 8)
  const padding = 8
  const playButtonX = padding
  const timeTextX = padding + buttonSize + 10
  const muteButtonX = width - padding - buttonSize
  const volumeSliderWidth = 80
  const volumeSliderX = muteButtonX - volumeSliderWidth - 10

  const handlePointerDown = useCallback(
    (e: PointerEventData) => {
      // Check play button
      if (e.x >= playButtonX && e.x <= playButtonX + buttonSize && e.y >= (height - buttonSize) / 2 && e.y <= (height + buttonSize) / 2) {
        togglePlay()
        return
      }

      // Check mute button
      if (e.x >= muteButtonX && e.x <= muteButtonX + buttonSize && e.y >= (height - buttonSize) / 2 && e.y <= (height + buttonSize) / 2) {
        toggleMuted()
        return
      }

      // Check volume slider
      if (e.x >= volumeSliderX && e.x <= volumeSliderX + volumeSliderWidth) {
        setIsDraggingVolume(true)
        const newVolume = clamp((e.x - volumeSliderX) / volumeSliderWidth, 0, 1)
        setVolume(newVolume)
      }
    },
    [playButtonX, buttonSize, height, togglePlay, muteButtonX, toggleMuted, volumeSliderX, volumeSliderWidth, setVolume]
  )

  const handlePointerMove = useCallback(
    (e: PointerEventData) => {
      if (isDraggingVolume) {
        const newVolume = clamp((e.x - volumeSliderX) / volumeSliderWidth, 0, 1)
        setVolume(newVolume)
      }

      // Update hover state
      if (e.x >= playButtonX && e.x <= playButtonX + buttonSize) {
        setHoverArea("play")
      } else if (e.x >= muteButtonX && e.x <= muteButtonX + buttonSize) {
        setHoverArea("mute")
      } else if (e.x >= volumeSliderX && e.x <= volumeSliderX + volumeSliderWidth) {
        setHoverArea("volume")
      } else {
        setHoverArea(null)
      }
    },
    [isDraggingVolume, volumeSliderX, volumeSliderWidth, setVolume, playButtonX, buttonSize, muteButtonX]
  )

  const handlePointerUp = useCallback(() => {
    setIsDraggingVolume(false)
  }, [])

  const draw = useCallback(
    (canvas: Canvas, ck: CanvasKit, w: number, h: number, typeface: Typeface | null) => {
      const isDark = detectDarkMode()
      const theme = getThemeColors(isDark)

      // Clear background
      canvas.clear(createColor(ck, theme.background))

      // Draw play/pause button
      const playPaint = new ck.Paint()
      playPaint.setColor(createColor(ck, hoverArea === "play" ? accentColor : theme.surface))
      playPaint.setAntiAlias(true)

      const playCenterX = playButtonX + buttonSize / 2
      const playCenterY = h / 2
      canvas.drawCircle(playCenterX, playCenterY, buttonSize / 2, playPaint)
      playPaint.delete()

      // Draw play/pause icon
      const iconPaint = new ck.Paint()
      iconPaint.setColor(createColor(ck, theme.text))
      iconPaint.setAntiAlias(true)

      if (isPlaying) {
        // Pause icon (two bars)
        const barWidth = 4
        const barHeight = 14
        const gap = 4
        canvas.drawRect(
          ck.XYWHRect(playCenterX - gap - barWidth / 2, playCenterY - barHeight / 2, barWidth, barHeight),
          iconPaint
        )
        canvas.drawRect(
          ck.XYWHRect(playCenterX + gap - barWidth / 2, playCenterY - barHeight / 2, barWidth, barHeight),
          iconPaint
        )
      } else {
        // Play icon (triangle)
        const path = new ck.Path()
        const size = 12
        path.moveTo(playCenterX - size / 3, playCenterY - size / 2)
        path.lineTo(playCenterX + size / 2, playCenterY)
        path.lineTo(playCenterX - size / 3, playCenterY + size / 2)
        path.close()
        canvas.drawPath(path, iconPaint)
        path.delete()
      }
      iconPaint.delete()

      // Draw time
      const timeFont = createFont(ck, typeface, 12)
      const timePaint = new ck.Paint()
      timePaint.setColor(createColor(ck, theme.text))
      timePaint.setAntiAlias(true)

      const timeText = `${formatTime(currentTime)} / ${formatTime(duration)}`
      drawText(canvas, ck, timeText, timeTextX, h / 2 + 4, timeFont, timePaint, "left")
      timeFont.delete()
      timePaint.delete()

      // Draw volume slider track
      const sliderY = h / 2
      const sliderHeight = 4

      const trackPaint = new ck.Paint()
      trackPaint.setColor(createColor(ck, theme.grid))
      trackPaint.setAntiAlias(true)
      drawRoundedRect(canvas, ck, volumeSliderX, sliderY - sliderHeight / 2, volumeSliderWidth, sliderHeight, 2, trackPaint)
      trackPaint.delete()

      // Draw volume slider fill
      const effectiveVolume = isMuted ? 0 : volume
      const fillWidth = volumeSliderWidth * effectiveVolume

      const fillPaint = new ck.Paint()
      fillPaint.setColor(createColor(ck, accentColor))
      fillPaint.setAntiAlias(true)
      if (fillWidth > 0) {
        drawRoundedRect(canvas, ck, volumeSliderX, sliderY - sliderHeight / 2, fillWidth, sliderHeight, 2, fillPaint)
      }
      fillPaint.delete()

      // Draw volume slider thumb
      const thumbX = volumeSliderX + fillWidth
      const thumbPaint = new ck.Paint()
      thumbPaint.setColor(createColor(ck, theme.text))
      thumbPaint.setAntiAlias(true)
      canvas.drawCircle(thumbX, sliderY, 6, thumbPaint)
      thumbPaint.delete()

      // Draw mute button
      const mutePaint = new ck.Paint()
      mutePaint.setColor(createColor(ck, hoverArea === "mute" ? accentColor : theme.surface))
      mutePaint.setAntiAlias(true)

      const muteCenterX = muteButtonX + buttonSize / 2
      canvas.drawCircle(muteCenterX, h / 2, buttonSize / 2, mutePaint)
      mutePaint.delete()

      // Draw speaker icon
      const speakerPaint = new ck.Paint()
      speakerPaint.setColor(createColor(ck, theme.text))
      speakerPaint.setAntiAlias(true)
      speakerPaint.setStrokeWidth(2)
      speakerPaint.setStyle(ck.PaintStyle.Stroke)

      // Speaker body
      const spkPath = new ck.Path()
      spkPath.moveTo(muteCenterX - 6, h / 2 - 4)
      spkPath.lineTo(muteCenterX - 2, h / 2 - 4)
      spkPath.lineTo(muteCenterX + 4, h / 2 - 8)
      spkPath.lineTo(muteCenterX + 4, h / 2 + 8)
      spkPath.lineTo(muteCenterX - 2, h / 2 + 4)
      spkPath.lineTo(muteCenterX - 6, h / 2 + 4)
      spkPath.close()
      canvas.drawPath(spkPath, speakerPaint)
      spkPath.delete()

      if (!isMuted && volume > 0) {
        // Sound waves
        if (volume > 0.3) {
          const wavePath = new ck.Path()
          wavePath.moveTo(muteCenterX + 6, h / 2 - 4)
          wavePath.quadTo(muteCenterX + 10, h / 2, muteCenterX + 6, h / 2 + 4)
          canvas.drawPath(wavePath, speakerPaint)
          wavePath.delete()
        }
        if (volume > 0.6) {
          const wavePath2 = new ck.Path()
          wavePath2.moveTo(muteCenterX + 8, h / 2 - 6)
          wavePath2.quadTo(muteCenterX + 14, h / 2, muteCenterX + 8, h / 2 + 6)
          canvas.drawPath(wavePath2, speakerPaint)
          wavePath2.delete()
        }
      } else {
        // X for muted
        drawLine(canvas, ck, muteCenterX + 6, h / 2 - 5, muteCenterX + 12, h / 2 + 5, speakerPaint)
        drawLine(canvas, ck, muteCenterX + 12, h / 2 - 5, muteCenterX + 6, h / 2 + 5, speakerPaint)
      }

      speakerPaint.delete()
    },
    [isPlaying, currentTime, duration, volume, isMuted, hoverArea, accentColor, playButtonX, buttonSize, timeTextX, volumeSliderX, volumeSliderWidth, muteButtonX]
  )

  return (
    <SkiaInteractiveCanvas
      width={width}
      height={height}
      onDraw={draw}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      cursor="pointer"
    />
  )
}

// ============================================================================
// Main Component
// ============================================================================

export const SkiaAudioPlayer = forwardRef<HTMLAudioElement, SkiaAudioPlayerProps>(
  (
    {
      src,
      width = 400,
      height = 120,
      className,
      autoPlay = false,
      showVisualization = true,
      showControls = true,
      showTimeline = true,
      showVolume = true,
      visualizationMode: initialVisualizationMode = "waveform",
      frequencyBins = 64,
      accentColor = [0.3, 0.6, 1.0, 1.0],
      onError,
      onLoadedMetaData,
      onTimeUpdate,
      onEnded,
      onCanPlay,
      onPlay,
      onPause
    },
    ref
  ) => {
    const [isPlaying, setIsPlaying] = useState(autoPlay)
    const [currentTime, setCurrentTime] = useState(0)
    const [duration, setDuration] = useState(0)
    const [volume, setVolumeState] = useState(1)
    const [isAudioReady, setIsAudioReady] = useState(false)
    const [isMuted, setIsMuted] = useState(false)
    const [visualizationMode, setVisualizationMode] = useState<"waveform" | "frequency">(initialVisualizationMode)

    const internalAudioRef = useRef<HTMLAudioElement | null>(null)
    const audioContextRef = useRef<AudioContext | null>(null)
    const analyserRef = useRef<AnalyserNode | null>(null)
    const sourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null)
    const prevVolumeRef = useRef(volume)
    const dummyDataRef = useRef<Uint8Array | null>(null)

    // Merge refs
    const mergedAudioRef = useCallback(
      (node: HTMLAudioElement | null) => {
        internalAudioRef.current = node
        if (!ref) return
        if (typeof ref === "function") {
          ref(node)
        } else {
          (ref as MutableRefObject<HTMLAudioElement | null>).current = node
        }
      },
      [ref]
    )

    // Initialize dummy data
    useEffect(() => {
      if (!dummyDataRef.current) {
        const buffer = new ArrayBuffer(2048)
        const dummyData = new Uint8Array(buffer)
        for (let i = 0; i < dummyData.length; i++) {
          dummyData[i] = 128 + Math.sin(i * 0.01) * 20
        }
        dummyDataRef.current = dummyData
      }
    }, [])

    // Initialize audio context
    const tryInitAudioContext = useCallback(() => {
      if (audioContextRef.current) return true

      const audio = internalAudioRef.current
      if (!audio) return false

      try {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)()
        const analyser = audioCtx.createAnalyser()
        analyser.fftSize = 2048

        const sourceNode = audioCtx.createMediaElementSource(audio)
        sourceNode.connect(analyser)
        analyser.connect(audioCtx.destination)

        audioContextRef.current = audioCtx
        analyserRef.current = analyser
        sourceNodeRef.current = sourceNode

        return true
      } catch (error) {
        console.warn("Audio context initialization failed:", error)
        return false
      }
    }, [])

    // Audio event handlers
    useEffect(() => {
      const audio = internalAudioRef.current
      if (!audio) return

      const handleLoadedMetadata = () => {
        setDuration(audio.duration)
        setIsAudioReady(true)
        onLoadedMetaData?.()
      }

      const handleTimeUpdate = () => {
        setCurrentTime(audio.currentTime)
        onTimeUpdate?.()
      }

      const handleEnded = () => {
        setIsPlaying(false)
        setCurrentTime(0)
        onEnded?.()
      }

      const handleError = () => {
        setIsAudioReady(false)
        onError?.("Failed to load audio file.")
      }

      const handleCanPlay = () => {
        setIsAudioReady(true)
        onCanPlay?.()
      }

      const handlePlay = () => {
        setIsPlaying(true)
        tryInitAudioContext()
        onPlay?.()
      }

      const handlePause = () => {
        setIsPlaying(false)
        onPause?.()
      }

      audio.addEventListener("loadedmetadata", handleLoadedMetadata)
      audio.addEventListener("timeupdate", handleTimeUpdate)
      audio.addEventListener("ended", handleEnded)
      audio.addEventListener("error", handleError)
      audio.addEventListener("canplay", handleCanPlay)
      audio.addEventListener("play", handlePlay)
      audio.addEventListener("pause", handlePause)

      return () => {
        audio.removeEventListener("loadedmetadata", handleLoadedMetadata)
        audio.removeEventListener("timeupdate", handleTimeUpdate)
        audio.removeEventListener("ended", handleEnded)
        audio.removeEventListener("error", handleError)
        audio.removeEventListener("canplay", handleCanPlay)
        audio.removeEventListener("play", handlePlay)
        audio.removeEventListener("pause", handlePause)
      }
    }, [onError, onLoadedMetaData, onTimeUpdate, onEnded, onCanPlay, onPlay, onPause, tryInitAudioContext])

    // Reset on src change
    useEffect(() => {
      setIsPlaying(autoPlay)
      setCurrentTime(0)
      setDuration(0)
      setIsAudioReady(false)

      if (internalAudioRef.current) {
        internalAudioRef.current.src = src
        if (autoPlay) {
          internalAudioRef.current.autoplay = true
        }
      }
    }, [src, autoPlay])

    // Context actions
    const togglePlay = useCallback(async () => {
      const audio = internalAudioRef.current
      if (!audio || !isAudioReady) return

      tryInitAudioContext()

      if (audioContextRef.current?.state === "suspended") {
        await audioContextRef.current.resume()
      }

      try {
        if (isPlaying) {
          audio.pause()
        } else {
          await audio.play()
        }
      } catch (error) {
        console.error("Error toggling play:", error)
        onError?.("Failed to play audio.")
      }
    }, [isAudioReady, isPlaying, tryInitAudioContext, onError])

    const toggleMuted = useCallback(() => {
      if (isMuted) {
        setVolumeState(prevVolumeRef.current)
        setIsMuted(false)
      } else {
        prevVolumeRef.current = volume
        setVolumeState(0)
        setIsMuted(true)
      }

      if (internalAudioRef.current) {
        internalAudioRef.current.volume = isMuted ? prevVolumeRef.current : 0
      }
    }, [isMuted, volume])

    const seek = useCallback((time: number) => {
      const audio = internalAudioRef.current
      if (!audio) return
      audio.currentTime = time
      setCurrentTime(time)
    }, [])

    const setVolume = useCallback((newVolume: number) => {
      setVolumeState(newVolume)
      setIsMuted(newVolume === 0)
      if (internalAudioRef.current) {
        internalAudioRef.current.volume = newVolume
      }
    }, [])

    const toggleVisualizationMode = useCallback(() => {
      setVisualizationMode((prev) => (prev === "waveform" ? "frequency" : "waveform"))
    }, [])

    const contextValue: AudioPlayerContextProps = {
      isAudioReady,
      isPlaying,
      currentTime,
      duration,
      volume,
      isMuted,
      togglePlay,
      toggleMuted,
      seek,
      setVolume,
      visualizationMode,
      toggleVisualizationMode
    }

    // Calculate layout
    const controlsHeight = showControls ? 44 : 0
    const waveformHeight = showVisualization ? height - controlsHeight : 0

    return (
      <AudioPlayerContext.Provider value={contextValue}>
        <div
          className={className}
          style={{ width, height, display: "flex", flexDirection: "column", overflow: "hidden", borderRadius: 8 }}
          role="region"
          aria-label="Audio player"
        >
          <audio
            ref={mergedAudioRef}
            src={src}
            preload="metadata"
            crossOrigin="anonymous"
            autoPlay={autoPlay}
            style={{ display: "none" }}
          />

          {showVisualization && (
            <WaveformVisualization
              width={width}
              height={waveformHeight}
              accentColor={accentColor}
              analyserRef={analyserRef}
              dummyDataRef={dummyDataRef}
              frequencyBins={frequencyBins}
            />
          )}

          {showControls && (
            <ControlsBar
              width={width}
              height={controlsHeight}
              accentColor={accentColor}
            />
          )}
        </div>
      </AudioPlayerContext.Provider>
    )
  }
)

SkiaAudioPlayer.displayName = "SkiaAudioPlayer"
