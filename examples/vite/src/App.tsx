import { useState } from "react"
import { SkiaProvider } from "@brainwires/react-skia-pack"
import { LineChart } from "@brainwires/react-skia-pack/charts"
import { PieChart } from "@brainwires/react-skia-pack/charts"
import { SkiaSlider } from "@brainwires/react-skia-pack/widgets"

const lineData = Array.from({ length: 10 }, (_, i) => ({
  x: i,
  y: Math.sin(i * 0.5) * 50 + 50
}))

const pieData = [
  { label: "React", value: 45, color: [0.2, 0.6, 1.0, 1.0] as [number, number, number, number] },
  { label: "Vue", value: 30, color: [0.2, 0.8, 0.4, 1.0] as [number, number, number, number] },
  { label: "Angular", value: 15, color: [0.9, 0.2, 0.3, 1.0] as [number, number, number, number] },
  { label: "Other", value: 10, color: [0.6, 0.3, 0.9, 1.0] as [number, number, number, number] }
]

function App() {
  const [sliderValue, setSliderValue] = useState(50)

  return (
    <SkiaProvider wasmPath="/canvaskit/">
      <div>
        <h1>Vite + React + Skia</h1>

        <div className="card">
          <h2>Line Chart</h2>
          <div style={{ display: "flex", justifyContent: "center", margin: "20px 0" }}>
            <LineChart
              data={lineData}
              width={500}
              height={300}
              showGrid
              strokeWidth={2}
            />
          </div>
        </div>

        <div className="card">
          <h2>Pie Chart</h2>
          <div style={{ display: "flex", justifyContent: "center", margin: "20px 0" }}>
            <PieChart
              data={pieData}
              width={350}
              height={350}
              showLabels
              showPercentages
            />
          </div>
        </div>

        <div className="card">
          <h2>Interactive Slider</h2>
          <div style={{ display: "flex", justifyContent: "center", margin: "20px 0" }}>
            <SkiaSlider
              value={sliderValue}
              onChange={setSliderValue}
              min={0}
              max={100}
              width={300}
              height={50}
              showValue
            />
          </div>
          <p>Value: {sliderValue}</p>
        </div>
      </div>
    </SkiaProvider>
  )
}

export default App
