import { useState, useEffect, useRef } from "react"
import { SkiaProvider, SkiaCanvas, SkiaInteractiveCanvas } from "@brainwires/react-skia-pack"
import { drawCircle, drawRect, drawPath, createLinearGradient } from "@brainwires/react-skia-pack/primitives"
import { hexToRgba } from "@brainwires/react-skia-pack/utils"
import type { CanvasKit, Canvas, Paint } from "canvaskit-wasm"
import "./App.css"

// Custom Animated Wave Chart
function WaveChart({ width, height }: { width: number; height: number }) {
  const [phase, setPhase] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setPhase((p) => (p + 0.05) % (Math.PI * 2))
    }, 16)
    return () => clearInterval(interval)
  }, [])

  const draw = (canvas: Canvas, canvasKit: CanvasKit) => {
    const paint = new canvasKit.Paint()
    
    // Background gradient
    const gradient = createLinearGradient(
      canvasKit,
      0, 0, 0, height,
      [
        [0.1, 0.1, 0.2, 1.0],
        [0.05, 0.05, 0.1, 1.0]
      ]
    )
    paint.setShader(gradient)
    drawRect(canvas, canvasKit, 0, 0, width, height, paint)
    paint.setShader(null)

    // Draw wave
    const path = new canvasKit.Path()
    const points = 100
    const amplitude = 60
    const centerY = height / 2

    for (let i = 0; i <= points; i++) {
      const x = (i / points) * width
      const t = (i / points) * Math.PI * 4 + phase
      const y = centerY + Math.sin(t) * amplitude

      if (i === 0) {
        path.moveTo(x, y)
      } else {
        path.lineTo(x, y)
      }
    }

    paint.setStyle(canvasKit.PaintStyle.Stroke)
    paint.setStrokeWidth(3)
    paint.setColor(canvasKit.Color(100, 200, 255, 1.0))
    canvas.drawPath(path, paint)

    // Add glow effect
    paint.setStrokeWidth(6)
    paint.setColor(canvasKit.Color(100, 200, 255, 0.3))
    canvas.drawPath(path, paint)

    path.delete()
    paint.delete()
  }

  return <SkiaCanvas width={width} height={height} draw={draw} />
}

// Custom Interactive Donut Chart
function InteractiveDonut({ width, height }: { width: number; height: number }) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)

  const data = [
    { value: 30, color: [0.2, 0.6, 1.0, 1.0], label: "A" },
    { value: 25, color: [0.2, 0.8, 0.4, 1.0], label: "B" },
    { value: 20, color: [0.9, 0.7, 0.2, 1.0], label: "C" },
    { value: 25, color: [0.9, 0.2, 0.3, 1.0], label: "D" }
  ] as const

  const total = data.reduce((sum, d) => sum + d.value, 0)

  const draw = (canvas: Canvas, canvasKit: CanvasKit) => {
    const centerX = width / 2
    const centerY = height / 2
    const outerRadius = Math.min(width, height) / 2 - 20
    const innerRadius = outerRadius * 0.6

    let startAngle = -90

    data.forEach((item, index) => {
      const sweepAngle = (item.value / total) * 360
      const isHovered = hoveredIndex === index
      const radius = isHovered ? outerRadius + 10 : outerRadius

      const paint = new canvasKit.Paint()
      paint.setStyle(canvasKit.PaintStyle.Fill)
      paint.setAntiAlias(true)
      paint.setColor(canvasKit.Color(...item.color.map((c, i) => i === 3 ? c : c * 255)))

      // Draw arc
      const path = new canvasKit.Path()
      path.addArc(
        canvasKit.LTRBRect(
          centerX - radius,
          centerY - radius,
          centerX + radius,
          centerY + radius
        ),
        startAngle,
        sweepAngle
      )
      
      const innerAngle = startAngle + sweepAngle
      path.lineTo(
        centerX + Math.cos((innerAngle * Math.PI) / 180) * innerRadius,
        centerY + Math.sin((innerAngle * Math.PI) / 180) * innerRadius
      )

      path.addArc(
        canvasKit.LTRBRect(
          centerX - innerRadius,
          centerY - innerRadius,
          centerX + innerRadius,
          centerY + innerRadius
        ),
        startAngle + sweepAngle,
        -sweepAngle
      )
      path.close()

      canvas.drawPath(path, paint)

      path.delete()
      paint.delete()

      startAngle += sweepAngle
    })
  }

  const handlePointerMove = (e: { x: number; y: number }) => {
    const centerX = width / 2
    const centerY = height / 2
    const dx = e.x - centerX
    const dy = e.y - centerY
    const distance = Math.sqrt(dx * dx + dy * dy)
    const angle = (Math.atan2(dy, dx) * 180) / Math.PI + 90

    const outerRadius = Math.min(width, height) / 2 - 20
    const innerRadius = outerRadius * 0.6

    if (distance >= innerRadius && distance <= outerRadius + 10) {
      let startAngle = 0
      for (let i = 0; i < data.length; i++) {
        const sweepAngle = (data[i].value / total) * 360
        const normalizedAngle = ((angle + 360) % 360)
        
        if (normalizedAngle >= startAngle && normalizedAngle < startAngle + sweepAngle) {
          setHoveredIndex(i)
          return
        }
        startAngle += sweepAngle
      }
    }
    setHoveredIndex(null)
  }

  return (
    <SkiaInteractiveCanvas
      width={width}
      height={height}
      draw={draw}
      onPointerMove={handlePointerMove}
      onPointerLeave={() => setHoveredIndex(null)}
    />
  )
}

// Custom Particle System
function ParticleSystem({ width, height }: { width: number; height: number }) {
  const particlesRef = useRef<Array<{ x: number; y: number; vx: number; vy: number; size: number }>>([])

  useEffect(() => {
    // Initialize particles
    particlesRef.current = Array.from({ length: 50 }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 2,
      vy: (Math.random() - 0.5) * 2,
      size: Math.random() * 3 + 1
    }))

    const interval = setInterval(() => {
      particlesRef.current.forEach((p) => {
        p.x += p.vx
        p.y += p.vy

        if (p.x < 0 || p.x > width) p.vx *= -1
        if (p.y < 0 || p.y > height) p.vy *= -1
      })
    }, 16)

    return () => clearInterval(interval)
  }, [width, height])

  const draw = (canvas: Canvas, canvasKit: CanvasKit) => {
    const paint = new canvasKit.Paint()
    paint.setStyle(canvasKit.PaintStyle.Fill)
    paint.setAntiAlias(true)

    // Draw background
    paint.setColor(canvasKit.Color(10, 10, 20, 1.0))
    drawRect(canvas, canvasKit, 0, 0, width, height, paint)

    // Draw particles
    particlesRef.current.forEach((particle) => {
      paint.setColor(canvasKit.Color(100, 200, 255, 0.8))
      drawCircle(canvas, canvasKit, particle.x, particle.y, particle.size, paint)
    })

    // Draw connections
    paint.setStyle(canvasKit.PaintStyle.Stroke)
    paint.setStrokeWidth(1)
    
    for (let i = 0; i < particlesRef.current.length; i++) {
      for (let j = i + 1; j < particlesRef.current.length; j++) {
        const p1 = particlesRef.current[i]
        const p2 = particlesRef.current[j]
        const dx = p1.x - p2.x
        const dy = p1.y - p2.y
        const dist = Math.sqrt(dx * dx + dy * dy)

        if (dist < 100) {
          const alpha = (1 - dist / 100) * 0.3
          paint.setColor(canvasKit.Color(100, 200, 255, alpha))
          
          const path = new canvasKit.Path()
          path.moveTo(p1.x, p1.y)
          path.lineTo(p2.x, p2.y)
          canvas.drawPath(path, paint)
          path.delete()
        }
      }
    }

    paint.delete()
  }

  return <SkiaCanvas width={width} height={height} draw={draw} />
}

function App() {
  return (
    <SkiaProvider wasmPath="/canvaskit/">
      <div className="app">
        <h1>Custom Skia Visualizations</h1>
        
        <div className="examples-grid">
          <div className="example-card">
            <h2>Animated Wave</h2>
            <WaveChart width={500} height={200} />
          </div>

          <div className="example-card">
            <h2>Interactive Donut (Hover Me!)</h2>
            <InteractiveDonut width={350} height={350} />
          </div>

          <div className="example-card">
            <h2>Particle Network</h2>
            <ParticleSystem width={500} height={300} />
          </div>
        </div>
      </div>
    </SkiaProvider>
  )
}

export default App
