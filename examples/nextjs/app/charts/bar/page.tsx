"use client"

import { useState } from "react"
import { BarChart } from "@brainwires/react-skia-pack/charts"
import Link from "next/link"

const sampleData = [
  { label: "Jan", value: 65 },
  { label: "Feb", value: 78 },
  { label: "Mar", value: 90 },
  { label: "Apr", value: 81 },
  { label: "May", value: 95 },
  { label: "Jun", value: 88 }
]

export default function BarChartPage() {
  const [horizontal, setHorizontal] = useState(false)
  const [showGrid, setShowGrid] = useState(true)
  const [showValues, setShowValues] = useState(true)

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        <Link href="/" className="text-blue-500 hover:underline mb-4 inline-block">
          ← Back
        </Link>

        <h1 className="text-3xl font-bold mb-6">Bar Chart Example</h1>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Chart Preview */}
          <div className="border rounded-lg p-6">
            <h2 className="text-lg font-semibold mb-4">Preview</h2>
            <div className="flex justify-center">
              <BarChart
                data={sampleData}
                width={350}
                height={300}
                horizontal={horizontal}
                showGrid={showGrid}
                showValues={showValues}
              />
            </div>
          </div>

          {/* Controls */}
          <div className="space-y-4">
            <div className="border rounded-lg p-6">
              <h2 className="text-lg font-semibold mb-4">Options</h2>

              <div className="space-y-3">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={horizontal}
                    onChange={(e) => setHorizontal(e.target.checked)}
                  />
                  <span>Horizontal orientation</span>
                </label>

                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={showGrid}
                    onChange={(e) => setShowGrid(e.target.checked)}
                  />
                  <span>Show grid</span>
                </label>

                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={showValues}
                    onChange={(e) => setShowValues(e.target.checked)}
                  />
                  <span>Show values</span>
                </label>
              </div>
            </div>

            <div className="border rounded-lg p-6">
              <h2 className="text-lg font-semibold mb-4">Code</h2>
              <pre className="text-xs bg-gray-100 dark:bg-gray-800 p-4 rounded overflow-x-auto">
{`import { BarChart } from "@brainwires/react-skia-pack/charts"

<BarChart
  data={[
    { label: "Jan", value: 65 },
    { label: "Feb", value: 78 },
    { label: "Mar", value: 90 }
  ]}
  width={350}
  height={300}
  horizontal={${horizontal}}
  showGrid={${showGrid}}
  showValues={${showValues}}
/>`}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
