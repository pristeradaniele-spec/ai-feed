import type { Metadata, Viewport } from "next"
import SwRegister from "./sw-register"
import "./globals.css"

export const metadata: Metadata = {
  title: "AI Feed",
  description: "Le ultime novità nel mondo AI, sempre con te",
  manifest: "/manifest.json",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "AI Feed" },
}

export const viewport: Viewport = {
  themeColor: "#0f172a",
  width: "device-width",
  initialScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it">
      <head>
        <link rel="apple-touch-icon" href="/icon-192.png" />
      </head>
      <body className="bg-slate-950 text-slate-100 min-h-screen">
        <SwRegister />
        {children}
      </body>
    </html>
  )
}
