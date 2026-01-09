# Vite + React Example

This example demonstrates how to use `@brainwires/react-skia-pack` with Vite and React.

## Features

- ✅ Vite 5
- ✅ React 19
- ✅ TypeScript
- ✅ Hot Module Replacement (HMR)
- ✅ Multiple chart examples

## Installation

```bash
npm install
```

## Development

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

## Build

```bash
npm run build
npm run preview
```

## Key Concepts

### 1. WASM File Serving

WASM files are automatically copied to `public/canvaskit/` during postinstall.

Vite serves files from `public/` automatically.

### 2. Component Usage

```tsx
import { SkiaProvider } from "@brainwires/react-skia-pack"
import { LineChart } from "@brainwires/react-skia-pack/charts"

function App() {
  return (
    <SkiaProvider>
      <LineChart data={...} width={600} height={400} />
    </SkiaProvider>
  )
}
```

## Learn More

- [Vite Documentation](https://vitejs.dev/)
- [@brainwires/react-skia-pack](https://github.com/brainwires/react-skia-pack)
