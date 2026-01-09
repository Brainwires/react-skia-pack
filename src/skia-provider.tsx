"use client"

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode
} from "react"

// Types only - we load the actual library dynamically
import type { CanvasKit, Typeface } from "canvaskit-wasm"

// Default CanvasKit path - can be overridden via props
const DEFAULT_CANVASKIT_PATH = "/wasm/canvaskit/"

interface SkiaContextValue {
  canvasKit: CanvasKit | null
  typeface: Typeface | null
  isLoading: boolean
  error: Error | null
}

const SkiaContext = createContext<SkiaContextValue>({
  canvasKit: null,
  typeface: null,
  isLoading: true,
  error: null
})

// Global state to ensure we only load CanvasKit once
let canvasKitInstance: CanvasKit | null = null
let canvasKitPromise: Promise<CanvasKit> | null = null
let typefaceInstance: Typeface | null = null

/**
 * Detect if CanvasKit is already available globally (e.g., from react-native-skia)
 */
function detectExistingCanvasKit(): CanvasKit | null {
  if (typeof window === "undefined") return null

  // Check for global CanvasKit instance (react-native-skia pattern)
  const globalCanvasKit = (window as unknown as { CanvasKit?: CanvasKit }).CanvasKit
  if (globalCanvasKit && typeof globalCanvasKit.MakeSurface === "function") {
    console.log("[Skia] Detected existing CanvasKit instance (possibly from react-native-skia)")
    return globalCanvasKit
  }

  return null
}

async function loadFont(ck: CanvasKit): Promise<Typeface | null> {
  // Use the built-in default typeface - custom font loading is unreliable
  if (typeof ck.Typeface?.GetDefault === "function") {
    const typeface = ck.Typeface.GetDefault()
    if (typeface) {
      console.log("[Skia] Using GetDefault() typeface")
      return typeface
    }
  }

  console.error("[Skia] GetDefault() typeface not available")
  return null
}

async function loadCanvasKit(wasmPath: string = DEFAULT_CANVASKIT_PATH): Promise<CanvasKit> {
  // Return cached instance
  if (canvasKitInstance) {
    return canvasKitInstance
  }

  // Check for existing CanvasKit before loading
  const existing = detectExistingCanvasKit()
  if (existing) {
    canvasKitInstance = existing
    return existing
  }

  // Return existing promise if loading is in progress
  if (canvasKitPromise) {
    return canvasKitPromise
  }

  canvasKitPromise = new Promise((resolve, reject) => {
    // Check if CanvasKitInit is already loaded (from a previous script)
    if (typeof window !== "undefined" && (window as unknown as { CanvasKitInit?: unknown }).CanvasKitInit) {
      const init = (window as unknown as { CanvasKitInit: (config: { locateFile: (file: string) => string }) => Promise<CanvasKit> }).CanvasKitInit
      init({ locateFile: (file: string) => wasmPath + file })
        .then((ck) => {
          canvasKitInstance = ck
          resolve(ck)
        })
        .catch(reject)
      return
    }

    // Load the CanvasKit script from configured path
    const script = document.createElement("script")
    script.src = `${wasmPath}canvaskit.js`
    script.async = true

    script.onload = () => {
      const init = (window as unknown as { CanvasKitInit: (config: { locateFile: (file: string) => string }) => Promise<CanvasKit> }).CanvasKitInit
      if (!init) {
        reject(new Error("CanvasKitInit not found after script load"))
        return
      }

      init({ locateFile: (file: string) => wasmPath + file })
        .then((ck) => {
          canvasKitInstance = ck
          resolve(ck)
        })
        .catch(reject)
    }

    script.onerror = () => {
      reject(new Error(`Failed to load CanvasKit script from ${wasmPath}`))
    }

    document.head.appendChild(script)
  })

  return canvasKitPromise
}

interface SkiaProviderProps {
  children: ReactNode
  /**
   * Optional fallback content to display while CanvasKit is loading
   */
  fallback?: ReactNode
  /**
   * Path to the CanvasKit WASM files (should end with /)
   * @default "/wasm/canvaskit/"
   * @example "/node_modules/@brainwires/react-skia-pack/public/canvaskit/"
   */
  wasmPath?: string
}

export function SkiaProvider({ 
  children, 
  fallback,
  wasmPath = DEFAULT_CANVASKIT_PATH 
}: SkiaProviderProps) {
  const [canvasKit, setCanvasKit] = useState<CanvasKit | null>(null)
  const [typeface, setTypeface] = useState<Typeface | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    let mounted = true

    loadCanvasKit(wasmPath)
      .then(async (ck) => {
        if (mounted) {
          setCanvasKit(ck)

          // Load font if not already loaded
          if (!typefaceInstance) {
            typefaceInstance = await loadFont(ck)
          }
          setTypeface(typefaceInstance)
          setIsLoading(false)
        }
      })
      .catch((err) => {
        if (mounted) {
          console.error("[Skia] Failed to load CanvasKit:", err)
          setError(err instanceof Error ? err : new Error(String(err)))
          setIsLoading(false)
        }
      })

    return () => {
      mounted = false
    }
  }, [wasmPath])

  if (isLoading && fallback) {
    return <>{fallback}</>
  }

  return (
    <SkiaContext.Provider value={{ canvasKit, typeface, isLoading, error }}>
      {children}
    </SkiaContext.Provider>
  )
}

export function useSkia(): SkiaContextValue {
  const context = useContext(SkiaContext)
  if (context === undefined) {
    throw new Error("useSkia must be used within a SkiaProvider")
  }
  return context
}

export function useCanvasKit(): CanvasKit | null {
  const { canvasKit } = useSkia()
  return canvasKit
}

export function useTypeface(): Typeface | null {
  const { typeface } = useSkia()
  return typeface
}
