# Next.js Example

This example demonstrates how to use `@brainwires/react-skia-pack` in a Next.js application.

## Features

- ✅ App Router (Next.js 15+)
- ✅ Server Components + Client Components
- ✅ Multiple chart and widget demos
- ✅ Interactive controls
- ✅ TypeScript
- ✅ Tailwind CSS

## Installation

```bash
npm install
```

## Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Project Structure

```
app/
├── page.tsx              # Home page with demo links
├── layout.tsx            # Root layout with SkiaProvider
├── charts/
│   ├── bar/page.tsx     # Bar chart demo
│   ├── line/page.tsx    # Line chart demo
│   └── pie/page.tsx     # Pie chart demo
└── widgets/
    ├── slider/page.tsx  # Slider widget demo
    └── knob/page.tsx    # Knob widget demo
```

## Key Concepts

### 1. Setup SkiaProvider

The `SkiaProvider` wraps your app to load CanvasKit WASM:

```tsx
// app/layout.tsx
import { SkiaProvider } from "@brainwires/react-skia-pack"

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <SkiaProvider>{children}</SkiaProvider>
      </body>
    </html>
  )
}
```

### 2. Use Client Components

All Skia components must run in the browser:

```tsx
"use client"

import { BarChart } from "@brainwires/react-skia-pack/charts"

export default function ChartPage() {
  return <BarChart data={...} width={600} height={400} />
}
```

### 3. WASM File Serving

Copy WASM files to your public directory:

```bash
cp -r node_modules/@brainwires/react-skia-pack/public/canvaskit public/wasm/
```

Or configure a custom path:

```tsx
<SkiaProvider wasmPath="/canvaskit/">
```

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [@brainwires/react-skia-pack](https://github.com/brainwires/react-skia-pack)
