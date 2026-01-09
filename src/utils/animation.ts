"use client"

import { useState, useEffect, useRef } from "react"

/**
 * Animation utilities for Skia components
 * Easing functions, tweening, and spring physics
 */

// Easing function type
export type EasingFunction = (t: number) => number

// Standard easing functions
export const easing = {
  // Linear (no easing)
  linear: (t: number): number => t,

  // Quadratic
  easeInQuad: (t: number): number => t * t,
  easeOutQuad: (t: number): number => t * (2 - t),
  easeInOutQuad: (t: number): number =>
    t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,

  // Cubic
  easeInCubic: (t: number): number => t * t * t,
  easeOutCubic: (t: number): number => {
    const t1 = t - 1
    return t1 * t1 * t1 + 1
  },
  easeInOutCubic: (t: number): number =>
    t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1,

  // Quartic
  easeInQuart: (t: number): number => t * t * t * t,
  easeOutQuart: (t: number): number => {
    const t1 = t - 1
    return 1 - t1 * t1 * t1 * t1
  },
  easeInOutQuart: (t: number): number => {
    const t1 = t - 1
    return t < 0.5 ? 8 * t * t * t * t : 1 - 8 * t1 * t1 * t1 * t1
  },

  // Quintic
  easeInQuint: (t: number): number => t * t * t * t * t,
  easeOutQuint: (t: number): number => {
    const t1 = t - 1
    return 1 + t1 * t1 * t1 * t1 * t1
  },
  easeInOutQuint: (t: number): number => {
    const t1 = t - 1
    return t < 0.5 ? 16 * t * t * t * t * t : 1 + 16 * t1 * t1 * t1 * t1 * t1
  },

  // Sinusoidal
  easeInSine: (t: number): number => 1 - Math.cos((t * Math.PI) / 2),
  easeOutSine: (t: number): number => Math.sin((t * Math.PI) / 2),
  easeInOutSine: (t: number): number => -(Math.cos(Math.PI * t) - 1) / 2,

  // Exponential
  easeInExpo: (t: number): number =>
    t === 0 ? 0 : Math.pow(2, 10 * (t - 1)),
  easeOutExpo: (t: number): number =>
    t === 1 ? 1 : 1 - Math.pow(2, -10 * t),
  easeInOutExpo: (t: number): number => {
    if (t === 0) return 0
    if (t === 1) return 1
    if (t < 0.5) return Math.pow(2, 20 * t - 10) / 2
    return (2 - Math.pow(2, -20 * t + 10)) / 2
  },

  // Circular
  easeInCirc: (t: number): number => 1 - Math.sqrt(1 - t * t),
  easeOutCirc: (t: number): number => Math.sqrt(1 - Math.pow(t - 1, 2)),
  easeInOutCirc: (t: number): number =>
    t < 0.5
      ? (1 - Math.sqrt(1 - Math.pow(2 * t, 2))) / 2
      : (Math.sqrt(1 - Math.pow(-2 * t + 2, 2)) + 1) / 2,

  // Back (overshoot)
  easeInBack: (t: number): number => {
    const c1 = 1.70158
    const c3 = c1 + 1
    return c3 * t * t * t - c1 * t * t
  },
  easeOutBack: (t: number): number => {
    const c1 = 1.70158
    const c3 = c1 + 1
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2)
  },
  easeInOutBack: (t: number): number => {
    const c1 = 1.70158
    const c2 = c1 * 1.525
    return t < 0.5
      ? (Math.pow(2 * t, 2) * ((c2 + 1) * 2 * t - c2)) / 2
      : (Math.pow(2 * t - 2, 2) * ((c2 + 1) * (t * 2 - 2) + c2) + 2) / 2
  },

  // Elastic
  easeInElastic: (t: number): number => {
    if (t === 0 || t === 1) return t
    const c4 = (2 * Math.PI) / 3
    return -Math.pow(2, 10 * t - 10) * Math.sin((t * 10 - 10.75) * c4)
  },
  easeOutElastic: (t: number): number => {
    if (t === 0 || t === 1) return t
    const c4 = (2 * Math.PI) / 3
    return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1
  },
  easeInOutElastic: (t: number): number => {
    if (t === 0 || t === 1) return t
    const c5 = (2 * Math.PI) / 4.5
    return t < 0.5
      ? -(Math.pow(2, 20 * t - 10) * Math.sin((20 * t - 11.125) * c5)) / 2
      : (Math.pow(2, -20 * t + 10) * Math.sin((20 * t - 11.125) * c5)) / 2 + 1
  },

  // Bounce
  easeInBounce: (t: number): number => 1 - easing.easeOutBounce(1 - t),
  easeOutBounce: (t: number): number => {
    const n1 = 7.5625
    const d1 = 2.75
    if (t < 1 / d1) {
      return n1 * t * t
    } else if (t < 2 / d1) {
      return n1 * (t -= 1.5 / d1) * t + 0.75
    } else if (t < 2.5 / d1) {
      return n1 * (t -= 2.25 / d1) * t + 0.9375
    } else {
      return n1 * (t -= 2.625 / d1) * t + 0.984375
    }
  },
  easeInOutBounce: (t: number): number =>
    t < 0.5
      ? (1 - easing.easeOutBounce(1 - 2 * t)) / 2
      : (1 + easing.easeOutBounce(2 * t - 1)) / 2
}

// Create a custom spring easing function
export function createSpringEasing(
  tension: number = 170,
  friction: number = 26
): EasingFunction {
  return (t: number): number => {
    const damping = friction / (2 * Math.sqrt(tension))
    const omega = Math.sqrt(tension)
    const omegaD = omega * Math.sqrt(1 - damping * damping)

    if (damping < 1) {
      // Underdamped
      return (
        1 -
        Math.exp(-damping * omega * t) *
          (Math.cos(omegaD * t) + (damping * omega / omegaD) * Math.sin(omegaD * t))
      )
    } else {
      // Critically damped or overdamped
      return 1 - Math.exp(-omega * t) * (1 + omega * t)
    }
  }
}

// Animation configuration
export interface AnimationConfig {
  duration: number
  easing?: EasingFunction
  onUpdate: (value: number) => void
  onComplete?: () => void
}

// Create an animation (returns cancel function)
export function createAnimation(
  from: number,
  to: number,
  config: AnimationConfig
): () => void {
  const { duration, easing: easingFn = easing.easeOutCubic, onUpdate, onComplete } = config
  const startTime = performance.now()
  let animationId: number | null = null

  const tick = (now: number) => {
    const elapsed = now - startTime
    const progress = Math.min(elapsed / duration, 1)
    const easedProgress = easingFn(progress)
    const value = from + (to - from) * easedProgress

    onUpdate(value)

    if (progress < 1) {
      animationId = requestAnimationFrame(tick)
    } else {
      onComplete?.()
    }
  }

  animationId = requestAnimationFrame(tick)

  return () => {
    if (animationId !== null) {
      cancelAnimationFrame(animationId)
    }
  }
}

// React hook for animations
export function useAnimation(
  target: number,
  config: {
    duration?: number
    easing?: EasingFunction
    immediate?: boolean
  } = {}
): [number, boolean] {
  const { duration = 300, easing: easingFn = easing.easeOutCubic, immediate = false } = config
  const [value, setValue] = useState(target)
  const [isAnimating, setIsAnimating] = useState(false)
  const prevTarget = useRef(target)
  const cancelRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    // Cancel any ongoing animation
    cancelRef.current?.()

    if (immediate || prevTarget.current === target) {
      setValue(target)
      prevTarget.current = target
      return
    }

    setIsAnimating(true)

    const cancel = createAnimation(prevTarget.current, target, {
      duration,
      easing: easingFn,
      onUpdate: setValue,
      onComplete: () => setIsAnimating(false)
    })

    cancelRef.current = cancel
    prevTarget.current = target

    return () => {
      cancel()
    }
  }, [target, duration, easingFn, immediate])

  return [value, isAnimating]
}

// Spring physics hook
export function useSpring(
  target: number,
  config: {
    tension?: number
    friction?: number
    mass?: number
    precision?: number
  } = {}
): number {
  const { tension = 170, friction = 26, mass = 1, precision = 0.01 } = config

  const [value, setValue] = useState(target)
  const valueRef = useRef(target)
  const velocityRef = useRef(0)
  const animationRef = useRef<number | null>(null)
  const targetRef = useRef(target)

  // Update target ref when target changes and start animation
  useEffect(() => {
    targetRef.current = target

    // Start animation if target changed and not already animating
    if (animationRef.current === null && valueRef.current !== target) {
      let lastTime = performance.now()

      const tick = (now: number) => {
        const dt = Math.min((now - lastTime) / 1000, 0.064) // Cap at ~16fps minimum
        lastTime = now

        const currentValue = valueRef.current
        const displacement = currentValue - targetRef.current
        const springForce = -tension * displacement
        const dampingForce = -friction * velocityRef.current
        const acceleration = (springForce + dampingForce) / mass

        velocityRef.current += acceleration * dt
        const newValue = currentValue + velocityRef.current * dt

        // Check if we should stop
        if (
          Math.abs(velocityRef.current) < precision &&
          Math.abs(newValue - targetRef.current) < precision
        ) {
          valueRef.current = targetRef.current
          setValue(targetRef.current)
          velocityRef.current = 0
          animationRef.current = null
          return
        }

        valueRef.current = newValue
        setValue(newValue)
        animationRef.current = requestAnimationFrame(tick)
      }

      animationRef.current = requestAnimationFrame(tick)
    }

    return () => {
      if (animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current)
        animationRef.current = null
      }
    }
  }, [target, tension, friction, mass, precision])

  return value
}

// Stagger utility for animating multiple items
export function stagger(
  count: number,
  config: {
    delayPerItem?: number
    totalDuration?: number
    from?: "start" | "end" | "center"
  } = {}
): number[] {
  const { delayPerItem = 50, from = "start" } = config

  const delays: number[] = []

  for (let i = 0; i < count; i++) {
    let index: number
    switch (from) {
      case "end":
        index = count - 1 - i
        break
      case "center":
        index = Math.abs(i - Math.floor(count / 2))
        break
      default:
        index = i
    }
    delays.push(index * delayPerItem)
  }

  return delays
}

// Interpolate between multiple values
export function interpolateMultiple(
  t: number,
  values: number[],
  easingFn: EasingFunction = easing.linear
): number {
  if (values.length === 0) return 0
  if (values.length === 1) return values[0]

  const easedT = easingFn(t)
  const segments = values.length - 1
  const segment = Math.floor(easedT * segments)
  const segmentT = (easedT * segments) % 1

  const from = values[Math.min(segment, segments)]
  const to = values[Math.min(segment + 1, segments)]

  return from + (to - from) * segmentT
}

// Keyframe animation helper
export interface Keyframe<T> {
  offset: number // 0-1
  value: T
  easing?: EasingFunction
}

export function interpolateKeyframes<T extends number | Record<string, number>>(
  t: number,
  keyframes: Keyframe<T>[]
): T {
  if (keyframes.length === 0) {
    throw new Error("At least one keyframe is required")
  }
  if (keyframes.length === 1) return keyframes[0].value

  // Sort by offset
  const sorted = [...keyframes].sort((a, b) => a.offset - b.offset)

  // Find surrounding keyframes
  let fromIdx = 0
  let toIdx = 1

  for (let i = 0; i < sorted.length - 1; i++) {
    if (t >= sorted[i].offset && t <= sorted[i + 1].offset) {
      fromIdx = i
      toIdx = i + 1
      break
    }
    if (t > sorted[i + 1].offset) {
      fromIdx = i + 1
      toIdx = i + 1
    }
  }

  const from = sorted[fromIdx]
  const to = sorted[toIdx]

  if (from.offset === to.offset) {
    return to.value
  }

  const segmentT = (t - from.offset) / (to.offset - from.offset)
  const easedT = (to.easing || easing.linear)(segmentT)

  if (typeof from.value === "number" && typeof to.value === "number") {
    return (from.value + (to.value - from.value) * easedT) as T
  }

  // Object interpolation
  const result: Record<string, number> = {}
  const fromObj = from.value as Record<string, number>
  const toObj = to.value as Record<string, number>

  for (const key of Object.keys(fromObj)) {
    result[key] = fromObj[key] + (toObj[key] - fromObj[key]) * easedT
  }

  return result as T
}

// Hook for running continuous animations
export function useAnimationLoop(
  callback: (deltaTime: number, elapsed: number) => void,
  enabled: boolean = true
): void {
  const callbackRef = useRef(callback)
  callbackRef.current = callback

  useEffect(() => {
    if (!enabled) return

    let animationId: number
    let startTime: number | null = null
    let lastTime: number | null = null

    const tick = (now: number) => {
      if (startTime === null) startTime = now
      if (lastTime === null) lastTime = now

      const deltaTime = now - lastTime
      const elapsed = now - startTime

      callbackRef.current(deltaTime, elapsed)

      lastTime = now
      animationId = requestAnimationFrame(tick)
    }

    animationId = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(animationId)
    }
  }, [enabled])
}
