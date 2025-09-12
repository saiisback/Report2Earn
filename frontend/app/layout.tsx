import type React from "react"
import type { Metadata } from "next"
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"
import { Analytics } from "@vercel/analytics/next"
import { Instrument_Serif } from "next/font/google"
import { Suspense } from "react"
import "./globals.css"
import { NavbarComponent } from "@/components/navbar"
import { WalletProvider } from "@/contexts/WalletContext"

const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-instrument-serif",
  weight: "400",
})

export const metadata: Metadata = {
  title: "R2E — Verify, Report, Earn",
  description:
    "R2E is a decentralized platform that rewards people for reporting and verifying misinformation on social media.",
  generator: "v0.app",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${instrumentSerif.variable} antialiased`}>
      <body className={`${instrumentSerif.variable} antialiased`}>
        <WalletProvider>
          <NavbarComponent />
          <Suspense fallback={null}>{children}</Suspense>
          <Analytics />
        </WalletProvider>
      </body>
    </html>
  )
}
