import { defineConfig } from "tsup"

export default defineConfig({
  entry: {
    index: "src/index.ts",
    "charts/index": "src/charts/index.ts",
    "widgets/index": "src/widgets/index.ts",
    "primitives/index": "src/primitives/index.ts",
    "utils/index": "src/utils/index.ts"
  },
  format: ["cjs", "esm"],
  dts: true,
  sourcemap: true,
  clean: true,
  splitting: true,
  treeshake: true,
  external: ["react", "react-dom", "canvaskit-wasm"],
  esbuildOptions(options) {
    options.banner = {
      js: '"use client";'
    }
  }
})
