# Custom Charts Example

Advanced examples showing how to create custom visualizations using the low-level Skia primitives.

## Features

- ✅ Custom chart implementations
- ✅ Interactive animations
- ✅ Advanced path drawing
- ✅ Gradient effects
- ✅ Hit testing and interactions

## Installation

```bash
npm install
```

## Development

```bash
npm run dev
```

## Examples Included

### 1. Custom Donut Chart
Advanced donut chart with:
- Exploded slices on hover
- Animated transitions
- Custom tooltips

### 2. Animated Wave Chart
Real-time waveform with:
- Sine wave generation
- Smooth animations
- Particle effects

### 3. Custom Network Graph
Node-link diagram showing:
- Force-directed layout
- Interactive dragging
- Connection highlighting

## Using Primitives

The package provides low-level drawing primitives:

```tsx
import { SkiaCanvas } from "@brainwires/react-skia-pack"
import { drawCircle, drawPath, createLinearGradient } from "@brainwires/react-skia-pack/primitives"

<SkiaCanvas
  width={400}
  height={400}
  draw={(canvas, canvasKit) => {
    // Create paint
    const paint = new canvasKit.Paint()
    
    // Draw shapes
    drawCircle(canvas, canvasKit, 200, 200, 50, paint)
    
    // Apply gradients
    const gradient = createLinearGradient(
      canvasKit,
      0, 0, 400, 400,
      [[0.2, 0.6, 1.0, 1.0], [0.6, 0.3, 0.9, 1.0]]
    )
    paint.setShader(gradient)
  }}
/>
```

## Advanced Features

### Animation

Use the animation utilities:

```tsx
import { animate, easeInOut } from "@brainwires/react-skia-pack/utils"

const [value, setValue] = useState(0)

animate({
  from: 0,
  to: 100,
  duration: 1000,
  easing: easeInOut,
  onUpdate: setValue
})
```

### Interaction

Handle pointer events:

```tsx
import { SkiaInteractiveCanvas } from "@brainwires/react-skia-pack"

<SkiaInteractiveCanvas
  onPointerDown={(e) => console.log(e.x, e.y)}
  onPointerMove={(e) => console.log("dragging", e)}
/>
```

## Learn More

- [@brainwires/react-skia-pack](https://github.com/brainwires/react-skia-pack)
- [CanvasKit Documentation](https://skia.org/docs/user/modules/canvaskit/)
