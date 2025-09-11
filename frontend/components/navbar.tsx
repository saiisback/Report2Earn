"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Instrument_Serif } from "next/font/google"

const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: ["400"],
  display: "swap",
})

export function Navbar() {
  const pathname = usePathname()

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-black/20 backdrop-blur-md border-b border-white/10">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <Link href="/" className={`${instrumentSerif.className} text-white text-2xl font-normal tracking-tight`}>
          R2E
        </Link>

        <div className={`${instrumentSerif.className} flex items-center space-x-8`}>
          <Link
            href="/"
            className={`text-white/90 hover:text-white transition-colors ${
              pathname === "/" ? "text-white font-medium" : ""
            }`}
          >
            Home
          </Link>
          <Link
            href="/verify"
            className={`text-white/90 hover:text-white transition-colors ${
              pathname === "/verify" ? "text-white font-medium" : ""
            }`}
          >
            Verify
          </Link>
          <Link
            href="/community"
            className={`text-white/90 hover:text-white transition-colors ${
              pathname === "/community" ? "text-white font-medium" : ""
            }`}
          >
            Community
          </Link>
        </div>
      </div>
    </nav>
  )
}
