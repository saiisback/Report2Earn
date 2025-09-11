import { GradientBackground } from "@/components/gradient-background"
import { Instrument_Serif } from "next/font/google"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: ["400"],
  display: "swap",
})

export default function VerifyPage() {
  return (
    <div className="min-h-screen">
      <main className="relative min-h-screen flex items-center justify-center overflow-hidden">
        <GradientBackground />
        <div className="absolute inset-0 -z-10 bg-black/20" />

        <section className="px-6 text-center max-w-4xl">
          <h1
            className={`${instrumentSerif.className} text-white text-center text-balance font-normal tracking-tight text-7xl mb-6`}
          >
            Check Before You Share.
          </h1>
          <p className="text-white/90 text-xl mb-8 text-balance max-w-2xl mx-auto">
            Paste a link or screenshot. AI + community verify it.
          </p>
          <Button size="lg" className="bg-white text-black hover:bg-white/90 mb-12">
            Start Verifying
          </Button>

          <div className="grid md:grid-cols-3 gap-6 mt-12">
            <Card className="bg-white/10 border-white/20 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-white">1. Submit</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-white/80">
                  Add the content you want checked (link, screenshot, or post).
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="bg-white/10 border-white/20 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-white">2. Verify</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-white/80">
                  AI cross-checks sources, then the community validates.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="bg-white/10 border-white/20 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-white">3. Trust</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-white/80">
                  Result is stored immutably on-chain for public reference.
                </CardDescription>
              </CardContent>
            </Card>
          </div>
        </section>


      </main>
    </div>
  )
}
