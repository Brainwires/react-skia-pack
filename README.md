# @brainwires/react-skia-pack

> React components for Skia-based charts, widgets, and visualizations using CanvasKit WASM

A comprehensive library of high-performance, GPU-accelerated React components built on Google's Skia graphics engine via CanvasKit. Perfect for data visualization, interactive widgets, and custom graphics.

## Features

- 🎨 **12+ Chart Types** - Line, Bar, Area, Pie, Scatter, Radar, Gauge, Candlestick, Funnel, Heatmap, Treemap, Sparkline
- 🎛️ **Interactive Widgets** - Sliders, Knobs, Switches, Progress bars, Meters, Audio players
- ⚡ **GPU Accelerated** - Hardware-accelerated rendering via Skia/CanvasKit
- 🌳 **Tree-shakeable** - Import only what you need with multiple entry points
- 🎭 **Theme Support** - Built-in light/dark mode detection
- 📱 **Framework Agnostic** - Works with Next.js, Vite, Create React App, and more
- 🔌 **React Native Compatible** - Auto-detects and uses react-native-skia if present

## Installation

### Standard Installation (with CanvasKit WASM)

```bash
npm install @brainwires/react-skia-pack
# or
yarn add @brainwires/react-skia-pack
# or
pnpm add @brainwires/react-skia-pack
```

The postinstall script will automatically copy CanvasKit WASM files to `node_modules/@brainwires/react-skia-pack/public/canvaskit/`.

### React Native Installation (with react-native-skia)

If you're using React Native with `@shopify/react-native-skia`:

```bash
npm install @brainwires/react-skia-pack @shopify/react-native-skia
```

The package will automatically detect react-native-skia and skip WASM installation.

### Manual WASM Installation

If you prefer to manage CanvasKit yourself:

```bash
npm install @brainwires/react-skia-pack --no-optional
npm install canvaskit-wasm  # Install separately if needed
```

## Quick Start

### Basic Usage

```tsx
import { SkiaProvider, BarChart } from "@brainwires/react-skia-pack"

function App() {
  const data = [
    { label: "Jan", value: 65 },
    { label: "Feb", value: 78 },
    { label: "Mar", value: 90 },
    { label: "Apr", value: 81 }
  ]

  return (
    <SkiaProvider>
      <BarChart
        data={data}
        width={600}
        height={400}
        title="Monthly Sales"
      />
    </SkiaProvider>
  )
}
```

### Tree-shaking with Specific Imports

Import only the components you need for smaller bundle sizes:

```tsx
// Import only charts
import { BarChart, LineChart } from "@brainwires/react-skia-pack/charts"

// Import only widgets
import { SkiaSlider, SkiaKnob } from "@brainwires/react-skia-pack/widgets"

// Import only primitives
import { drawCircle, drawRect } from "@brainwires/react-skia-pack/primitives"

// Import only utilities
import { getThemeColors, easeInOut } from "@brainwires/react-skia-pack/utils"
```

### Custom WASM Path

If you need to serve WASM files from a custom location:

```tsx
import { SkiaProvider } from "@brainwires/react-skia-pack"

function App() {
  return (
    <SkiaProvider wasmPath="/static/canvaskit/">
      {/* Your components */}
    </SkiaProvider>
  )
}
```

### With Loading Fallback

```tsx
<SkiaProvider fallback={<div>Loading Skia...</div>}>
  <YourCharts />
</SkiaProvider>
```

## Components

### Charts

All charts support theming, animations, and interactive features.

```tsx
import {
  LineChart,      // Time-series and trend data
  BarChart,       // Categorical comparisons
  AreaChart,      // Volume over time
  PieChart,       // Part-to-whole relationships
  ScatterChart,   // Correlation analysis
  RadarChart,     // Multi-variate comparison
  GaugeChart,     // Single-value metrics
  CandlestickChart, // Financial OHLC data
  FunnelChart,    // Conversion analysis
  HeatmapChart,   // Matrix data visualization
  TreemapChart,   // Hierarchical data
  SparklineChart  // Compact trend indicators
} from "@brainwires/react-skia-pack/charts"
```

**Example: Line Chart**

```tsx
<LineChart
  data={[
    { x: 0, y: 10 },
    { x: 1, y: 25 },
    { x: 2, y: 15 },
    { x: 3, y: 30 }
  ]}
  width={800}
  height={400}
  strokeWidth={2}
  showPoints={true}
  showGrid={true}
  title="Revenue Trend"
  xAxisLabel="Month"
  yAxisLabel="Revenue ($)"
/>
```

### Widgets

Interactive UI controls with smooth animations and haptic feedback.

```tsx
import {
  SkiaSlider,      // Single-value slider
  SkiaRangeSlider, // Min/max range selector
  SkiaKnob,        // Rotary control
  SkiaSwitch,      // Toggle switch
  SkiaProgress,    // Progress indicator
  SkiaMeter,       // VU meter display
  SkiaAudioPlayer  // Audio waveform player
} from "@brainwires/react-skia-pack/widgets"
```

**Example: Slider Widget**

```tsx
const [volume, setVolume] = useState(50)

<SkiaSlider
  value={volume}
  onChange={setVolume}
  min={0}
  max={100}
  width={300}
  height={60}
  showValue={true}
  label="Volume"
/>
```

### Primitives

Low-level drawing utilities for custom graphics.

```tsx
import {
  drawCircle,
  drawRect,
  drawPath,
  drawText,
  drawImage,
  createLinearGradient,
  createRadialGradient,
  applyBlur,
  applyShadow
} from "@brainwires/react-skia-pack/primitives"
```

**Example: Custom Canvas**

```tsx
import { SkiaCanvas } from "@brainwires/react-skia-pack"
import { drawCircle, drawText } from "@brainwires/react-skia-pack/primitives"

<SkiaCanvas
  width={400}
  height={400}
  draw={(canvas, canvasKit) => {
    const paint = new canvasKit.Paint()
    paint.setColor(canvasKit.Color(255, 0, 0, 1.0))
    
    drawCircle(canvas, canvasKit, 200, 200, 50, paint)
    drawText(canvas, canvasKit, "Hello Skia!", 150, 210)
  }}
/>
```

### Utilities

Helper functions for colors, animations, math, and more.

```tsx
import {
  // Color utilities
  getThemeColors,
  hexToRgba,
  
  // Animation
  easeInOut,
  spring,
  animate,
  
  // Math
  clamp,
  lerp,
  mapRange,
  
  // Geometry
  pointInRect,
  distance,
  
  // Scales
  linearScale,
  logScale
} from "@brainwires/react-skia-pack/utils"
```

## Configuration

### SkiaProvider Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `children` | `ReactNode` | - | Your app components |
| `fallback` | `ReactNode` | `undefined` | Content shown while loading |
| `wasmPath` | `string` | `"/wasm/canvaskit/"` | Path to WASM files |

### Serving WASM Files

#### Next.js

Copy WASM files to your public directory:

```bash
cp -r node_modules/@brainwires/react-skia-pack/public/canvaskit public/wasm/
```

Or configure a custom path:

```tsx
<SkiaProvider wasmPath="/canvaskit/">
```

#### Vite

Add to `vite.config.js`:

```js
export default {
  publicDir: 'public',
  // WASM files in public/ are automatically served
}
```

#### Create React App

Copy to `public/` folder and reference:

```tsx
<SkiaProvider wasmPath="/canvaskit/">
```

## Performance Tips

1. **Use Tree-shaking**: Import specific components instead of entire library
2. **Lazy Load**: Wrap charts in `React.lazy()` for code splitting
3. **Memoize Data**: Use `useMemo` for chart data to avoid re-renders
4. **Canvas Recycling**: Reuse SkiaCanvas instances when possible
5. **Limit Animations**: Reduce animation complexity on low-end devices

## TypeScript

Full TypeScript support with exported types:

```tsx
import type {
  SkiaCanvasProps,
  SkiaInteractiveCanvasProps,
  PointerEventData,
  ChartDataPoint,
  BarChartProps,
  LineChartProps
} from "@brainwires/react-skia-pack"
```

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Any browser with WebAssembly and WebGL support

## React Native Support

Works seamlessly with `@shopify/react-native-skia`. The package automatically detects react-native-skia and uses its CanvasKit instance instead of loading WASM.

## Examples

See the [examples directory](./examples) for complete working demos:

- [Next.js Integration](./examples/nextjs)
- [Vite + React](./examples/vite)
- [Dashboard Demo](./examples/dashboard)
- [Custom Charts](./examples/custom-charts)

## API Reference

Full API documentation available at [https://brainwires.github.io/react-skia-pack](https://brainwires.github.io/react-skia-pack)

## Contributing

Contributions welcome! Please read [CONTRIBUTING.md](./CONTRIBUTING.md) first.

## License

MIT © Brainwires

## Acknowledgments

- Built on [CanvasKit](https://github.com/google/skia/tree/main/modules/canvaskit) by Google
- Inspired by [react-native-skia](https://github.com/Shopify/react-native-skia) by Shopify
- Chart designs influenced by [D3.js](https://d3js.org/) and [Chart.js](https://www.chartjs.org/)
