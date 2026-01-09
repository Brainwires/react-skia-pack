# Dashboard Example

A complete analytics dashboard showcasing multiple charts and widgets working together.

## Features

- ✅ Real-time data updates
- ✅ Multiple chart types
- ✅ Interactive widgets
- ✅ Responsive layout
- ✅ Performance metrics
- ✅ TypeScript

## Installation

```bash
npm install
```

## Development

```bash
npm run dev
```

## Dashboard Components

### Sales Overview
- Line chart showing revenue trends
- Area chart for sales volume
- Gauge showing target achievement

### Analytics
- Bar chart for regional performance
- Pie chart for market share
- Heatmap for hourly activity

### Controls
- Sliders for filtering data
- Switches for toggling views
- Knobs for adjusting parameters

## Key Features

### Live Data Simulation

The dashboard simulates real-time data updates:

```tsx
useEffect(() => {
  const interval = setInterval(() => {
    setData(generateNewData())
  }, 3000)
  return () => clearInterval(interval)
}, [])
```

### Performance Optimization

- Tree-shaken imports for minimal bundle size
- Memoized chart data
- Efficient re-rendering

## Learn More

- [@brainwires/react-skia-pack](https://github.com/brainwires/react-skia-pack)
