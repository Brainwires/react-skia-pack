# Examples

Complete working examples demonstrating how to use `@brainwires/react-skia-pack` in different environments and use cases.

## Available Examples

### 1. [Next.js Integration](./nextjs)
Full Next.js 16 application with App Router showing:
- Multiple chart types (Bar, Line, Pie)
- Interactive widgets (Slider, Knob)
- Server Components + Client Components
- Tailwind CSS styling

**Start:**
```bash
cd nextjs
npm install
npm run dev
```

### 2. [Vite + React](./vite)
Lightweight Vite setup demonstrating:
- Fast HMR development
- Multiple chart examples
- Tree-shaken imports
- Minimal configuration

**Start:**
```bash
cd vite
npm install
npm run dev
```

### 3. [Analytics Dashboard](./dashboard)
Complete dashboard application featuring:
- Real-time data updates
- 6+ different chart types
- Interactive controls
- Responsive layout
- Auto-refresh functionality

**Start:**
```bash
cd dashboard
npm install
npm run dev
```

### 4. [Custom Charts](./custom-charts)
Advanced examples using low-level primitives:
- Custom animated wave visualization
- Interactive donut chart with hover effects
- Particle system with network connections
- Direct CanvasKit API usage

**Start:**
```bash
cd custom-charts
npm install
npm run dev
```

## Installation Notes

All examples use the same package:
```bash
npm install @brainwires/react-skia-pack
```

WASM files are automatically copied during `postinstall`.

## Quick Comparison

| Example | Framework | Use Case | Complexity |
|---------|-----------|----------|------------|
| Next.js | Next.js 16 | Full-featured app | ⭐⭐⭐ |
| Vite | Vite 5 + React | Simple integration | ⭐ |
| Dashboard | Vite + React | Real-world app | ⭐⭐⭐⭐ |
| Custom Charts | Vite + React | Advanced usage | ⭐⭐⭐⭐⭐ |

## Common Patterns

### Basic Setup
```tsx
import { SkiaProvider } from "@brainwires/react-skia-pack"

function App() {
  return (
    <SkiaProvider wasmPath="/canvaskit/">
      {/* Your components */}
    </SkiaProvider>
  )
}
```

### Tree-shaking
```tsx
// Import only what you need
import { BarChart } from "@brainwires/react-skia-pack/charts"
import { SkiaSlider } from "@brainwires/react-skia-pack/widgets"
```

### Custom WASM Path
```tsx
<SkiaProvider wasmPath="/my-custom-path/canvaskit/">
```

## Learn More

- [Main Package README](../README.md)
- [API Documentation](https://github.com/brainwires/react-skia-pack)
- [CanvasKit Docs](https://skia.org/docs/user/modules/canvaskit/)
