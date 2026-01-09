import type { Metadata } from "next"
import { Inter } from "next/font/google"
import { SkiaProvider } from "@brainwires/react-skia-pack"
import "./globals.css"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Skia Components - Next.js Example",
  description: "Next.js example using @brainwires/react-skia-pack"
}

export default function RootLayout({
  children
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <SkiaProvider wasmPath="/wasm/canvaskit/">
          {children}
        </SkiaProvider>
      </body>
    </html>
  )
}
