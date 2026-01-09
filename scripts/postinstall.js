#!/usr/bin/env node

const fs = require("fs")
const path = require("path")

/**
 * Postinstall script for @brainwires/react-skia-pack
 * 
 * This script conditionally copies CanvasKit WASM files to the public directory.
 * If react-native-skia is detected, WASM copying is skipped (user already has Skia support).
 */

function log(message) {
  console.log(`[@brainwires/react-skia-pack] ${message}`)
}

function checkForReactNativeSkia() {
  try {
    // Check if react-native-skia is installed
    const packageJsonPath = path.join(process.cwd(), "package.json")
    
    if (!fs.existsSync(packageJsonPath)) {
      return false
    }

    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"))
    const deps = {
      ...packageJson.dependencies,
      ...packageJson.devDependencies,
      ...packageJson.peerDependencies
    }

    return !!deps["@shopify/react-native-skia"] || !!deps["react-native-skia"]
  } catch (error) {
    return false
  }
}

function checkForCanvasKitWasm() {
  try {
    // Check if canvaskit-wasm is in node_modules
    const canvasKitPath = path.join(
      __dirname,
      "..",
      "node_modules",
      "canvaskit-wasm"
    )
    return fs.existsSync(canvasKitPath)
  } catch (error) {
    return false
  }
}

function copyWasmFiles() {
  try {
    const sourceDir = path.join(
      __dirname,
      "..",
      "node_modules",
      "canvaskit-wasm",
      "bin",
      "full"
    )

    const targetDir = path.join(__dirname, "..", "public", "canvaskit")

    // Create target directory if it doesn't exist
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true })
    }

    // Copy canvaskit.js
    const canvasKitJs = path.join(sourceDir, "canvaskit.js")
    if (fs.existsSync(canvasKitJs)) {
      fs.copyFileSync(canvasKitJs, path.join(targetDir, "canvaskit.js"))
      log("✓ Copied canvaskit.js")
    } else {
      log("⚠ canvaskit.js not found in canvaskit-wasm package")
    }

    // Copy canvaskit.wasm
    const canvasKitWasm = path.join(sourceDir, "canvaskit.wasm")
    if (fs.existsSync(canvasKitWasm)) {
      fs.copyFileSync(canvasKitWasm, path.join(targetDir, "canvaskit.wasm"))
      log("✓ Copied canvaskit.wasm")
    } else {
      log("⚠ canvaskit.wasm not found in canvaskit-wasm package")
    }

    return true
  } catch (error) {
    log(`⚠ Error copying WASM files: ${error.message}`)
    return false
  }
}

function main() {
  log("Running postinstall script...")

  // Check for react-native-skia
  if (checkForReactNativeSkia()) {
    log("✓ Detected react-native-skia - skipping CanvasKit WASM installation")
    log("  (Using Skia from react-native-skia instead)")
    return
  }

  // Check if canvaskit-wasm is available
  if (!checkForCanvasKitWasm()) {
    log("⚠ canvaskit-wasm not found in dependencies")
    log("  Install it with: npm install canvaskit-wasm")
    log("  Or use react-native-skia for React Native projects")
    return
  }

  // Copy WASM files
  log("Installing CanvasKit WASM files...")
  const success = copyWasmFiles()

  if (success) {
    log("✓ CanvasKit WASM files installed successfully")
    log("")
    log("Next steps:")
    log("  1. Ensure your build tool serves public/ directory")
    log("  2. Or copy public/canvaskit/ to your app's public folder")
    log("  3. Configure SkiaProvider wasmPath if needed")
  } else {
    log("✗ Failed to install WASM files")
  }
}

main()
