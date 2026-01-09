import Link from "next/link"

const examples = [
  { href: "/charts/bar", title: "Bar Chart", desc: "Vertical and horizontal bars" },
  { href: "/charts/line", title: "Line Chart", desc: "Time-series data visualization" },
  { href: "/charts/pie", title: "Pie Chart", desc: "Part-to-whole relationships" },
  { href: "/widgets/slider", title: "Slider", desc: "Interactive value selector" },
  { href: "/widgets/knob", title: "Knob", desc: "Rotary control widget" }
]

export default function Home() {
  return (
    <main className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-4">Skia Components</h1>
        <p className="text-gray-600 dark:text-gray-400 mb-8">
          Next.js example using @brainwires/react-skia-pack
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {examples.map((example) => (
            <Link
              key={example.href}
              href={example.href}
              className="block p-6 border rounded-lg hover:border-blue-500 transition-colors"
            >
              <h2 className="text-xl font-semibold mb-2">{example.title}</h2>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                {example.desc}
              </p>
            </Link>
          ))}
        </div>
      </div>
    </main>
  )
}
