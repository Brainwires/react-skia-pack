import { useState, useEffect, useMemo } from "react"
import { SkiaProvider } from "@brainwires/react-skia-pack"
import { LineChart, AreaChart, BarChart, PieChart, GaugeChart } from "@brainwires/react-skia-pack/charts"
import { SkiaSlider, SkiaSwitch } from "@brainwires/react-skia-pack/widgets"
import "./App.css"

// Generate sample data
function generateTimeSeriesData(points: number) {
  const now = Date.now()
  return Array.from({ length: points }, (_, i) => ({
    x: i,
    y: Math.sin(i * 0.3) * 20 + 50 + Math.random() * 10,
    label: new Date(now - (points - i) * 3600000).toLocaleTimeString()
  }))
}

function generateBarData() {
  const regions = ["North", "South", "East", "West", "Central"]
  return regions.map((label) => ({
    label,
    value: Math.floor(Math.random() * 100) + 20
  }))
}

function generatePieData() {
  return [
    { label: "Desktop", value: 45, color: [0.2, 0.6, 1.0, 1.0] as [number, number, number, number] },
    { label: "Mobile", value: 35, color: [0.2, 0.8, 0.4, 1.0] as [number, number, number, number] },
    { label: "Tablet", value: 15, color: [0.9, 0.7, 0.2, 1.0] as [number, number, number, number] },
    { label: "Other", value: 5, color: [0.6, 0.3, 0.9, 1.0] as [number, number, number, number] }
  ]
}

function Dashboard() {
  const [autoUpdate, setAutoUpdate] = useState(true)
  const [updateInterval, setUpdateInterval] = useState(3)
  const [timeSeriesData, setTimeSeriesData] = useState(() => generateTimeSeriesData(20))
  const [barData, setBarData] = useState(generateBarData)
  const [pieData] = useState(generatePieData)

  // Calculate gauge value from latest data
  const gaugeValue = useMemo(() => {
    const latest = timeSeriesData[timeSeriesData.length - 1]?.y || 50
    return Math.min(100, latest)
  }, [timeSeriesData])

  // Auto-update data
  useEffect(() => {
    if (!autoUpdate) return

    const interval = setInterval(() => {
      setTimeSeriesData(generateTimeSeriesData(20))
      setBarData(generateBarData())
    }, updateInterval * 1000)

    return () => clearInterval(interval)
  }, [autoUpdate, updateInterval])

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <h1>Analytics Dashboard</h1>
        <p>Real-time performance metrics</p>
      </header>

      {/* Controls */}
      <div className="controls-panel">
        <div className="control-group">
          <label>Auto Update</label>
          <SkiaSwitch value={autoUpdate} onChange={setAutoUpdate} width={60} height={30} />
        </div>
        <div className="control-group">
          <label>Update Interval: {updateInterval}s</label>
          <SkiaSlider
            value={updateInterval}
            onChange={setUpdateInterval}
            min={1}
            max={10}
            width={200}
            height={40}
            showValue={false}
          />
        </div>
      </div>

      {/* Top Row: Line Chart + Gauge */}
      <div className="dashboard-row">
        <div className="chart-card large">
          <h2>Revenue Trend (24h)</h2>
          <LineChart
            data={timeSeriesData}
            width={650}
            height={250}
            showGrid
            strokeWidth={2}
            showPoints
          />
        </div>
        <div className="chart-card">
          <h2>Target Achievement</h2>
          <GaugeChart value={gaugeValue} min={0} max={100} width={300} height={250} />
          <p className="metric">{gaugeValue.toFixed(1)}%</p>
        </div>
      </div>

      {/* Middle Row: Area Chart + Bar Chart */}
      <div className="dashboard-row">
        <div className="chart-card">
          <h2>Sales Volume</h2>
          <AreaChart
            data={timeSeriesData}
            width={450}
            height={220}
            showGrid
            fillOpacity={0.3}
          />
        </div>
        <div className="chart-card">
          <h2>Regional Performance</h2>
          <BarChart data={barData} width={450} height={220} showGrid showValues />
        </div>
      </div>

      {/* Bottom Row: Pie Chart */}
      <div className="dashboard-row">
        <div className="chart-card">
          <h2>Traffic Sources</h2>
          <PieChart
            data={pieData}
            width={400}
            height={300}
            showLabels
            showPercentages
          />
        </div>
        <div className="chart-card stats">
          <h2>Quick Stats</h2>
          <div className="stat-item">
            <span className="stat-label">Total Users</span>
            <span className="stat-value">12,458</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Active Sessions</span>
            <span className="stat-value">3,721</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Conversion Rate</span>
            <span className="stat-value">8.4%</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Avg. Session</span>
            <span className="stat-value">4m 32s</span>
          </div>
        </div>
      </div>
    </div>
  )
}

function App() {
  return (
    <SkiaProvider wasmPath="/canvaskit/">
      <Dashboard />
    </SkiaProvider>
  )
}

export default App
