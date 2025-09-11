import { GradientBackground } from "@/components/gradient-background"
import { Instrument_Serif } from "next/font/google"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: ["400"],
  display: "swap",
})

export default function CommunityPage() {
  return (
    <div className="min-h-screen">
      <main className="relative min-h-screen flex items-center justify-center overflow-hidden">
        <GradientBackground />
        <div className="absolute inset-0 -z-10 bg-black/20" />

        <section className="px-6 text-center max-w-5xl">
          <h1
            className={`${instrumentSerif.className} text-white text-center text-balance font-normal tracking-tight text-7xl mb-6`}
          >
            Earn By Fighting Misinformation.
          </h1>
          <p className={`${instrumentSerif.className} text-white/90 text-xl mb-8 text-balance max-w-2xl mx-auto`}>
            Report fake news, help others, and get rewarded.
          </p>
          <Button size="lg" className={`${instrumentSerif.className} bg-white text-black hover:bg-white/90 mb-12`}>
            Join the Movement
          </Button>

          <div className="grid md:grid-cols-2 gap-8 mt-12">
            <Card className="bg-white/10 border-white/20 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className={`${instrumentSerif.className} text-white text-left`}>Why Join?</CardTitle>
              </CardHeader>
              <CardContent className="text-left">
                <ul className={`${instrumentSerif.className} space-y-3 text-white/80`}>
                  <li>• Stop the spread of fake news</li>
                  <li>• Protect brands and institutions from reputational harm</li>
                  <li>• Earn rewards for verified contributions</li>
                </ul>
              </CardContent>
            </Card>

            <Card className="bg-white/10 border-white/20 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className={`${instrumentSerif.className} text-white text-left`}>How People Earn</CardTitle>
              </CardHeader>
              <CardContent className="text-left">
                <div className={`${instrumentSerif.className} space-y-4 text-white/80`}>
                  <div>
                    <strong className="text-white">1. Spot:</strong> Spot misinformation and submit it.
                  </div>
                  <div>
                    <strong className="text-white">2. Validate:</strong> Community + AI verifies the report.
                  </div>
                  <div>
                    <strong className="text-white">3. Reward:</strong> Correct reports receive payouts from
                    enterprise-funded pools.
                  </div>
                  <p className="text-sm italic">Reputation increases future reward multipliers.</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>


      </main>
    </div>
  )
}
