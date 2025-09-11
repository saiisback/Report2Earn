import { GradientBackground } from "@/components/gradient-background"
import { Instrument_Serif } from "next/font/google"
import { Button } from "@/components/ui/button"
import Link from "next/link"

const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: ["400"],
  display: "swap",
})

export default function Page() {
  return (
    <div className="min-h-screen">
      <main className="relative min-h-screen flex items-center justify-center overflow-hidden">
        <GradientBackground />
        <div className="absolute inset-0 -z-10 bg-black/20" />

        <section className="px-6 text-center max-w-4xl">
          <h1
            className={`${instrumentSerif.className} text-white text-center text-balance font-normal tracking-tight text-7xl mb-6`}
          >
            Verify Truth. Earn Algo.
          </h1>
          <p className={`${instrumentSerif.className} text-white/90 text-xl mb-8 text-balance max-w-2xl mx-auto`}>
            R2E rewards people for reporting misinformation.
          </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              asChild
              size="lg"
              className={`${instrumentSerif.className} border border-white text-white font-semibold  bg-transparent transition`}
            >
              <Link href="/verify">Verify Now</Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className={`${instrumentSerif.className} border-white text-white font-semibold   bg-transparent transition`}
            >
              <Link href="/community">Join the Community</Link>
            </Button>
            </div>
        </section>
      </main>

      <section className="relative py-20 px-6 bg-black text-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className={`${instrumentSerif.className} text-white text-5xl mb-8 font-normal tracking-tight`}>
            How to Earn
          </h2>
          <p className={`${instrumentSerif.className} text-white/80 text-xl mb-12 max-w-2xl mx-auto`}>
            Join our community of truth-seekers and earn rewards for helping combat misinformation. Simply spot
            suspicious content, submit it for verification, and get rewarded when your reports are validated.
          </p>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className={`${instrumentSerif.className} text-3xl font-normal mb-4 text-white`}>1. Spot</div>
              <p className={`${instrumentSerif.className} text-white/70`}>Find suspicious content on social media</p>
            </div>
            <div className="text-center">
              <div className={`${instrumentSerif.className} text-3xl font-normal mb-4 text-white`}>2. Report</div>
              <p className={`${instrumentSerif.className} text-white/70`}>Submit it through our verification system</p>
            </div>
            <div className="text-center">
              <div className={`${instrumentSerif.className} text-3xl font-normal mb-4 text-white`}>3. Earn</div>
              <p className={`${instrumentSerif.className} text-white/70`}>Get rewarded for accurate reports</p>
            </div>
          </div>
        </div>
      </section>

      <section className="relative py-20 px-6 bg-black">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className={`${instrumentSerif.className} text-white text-5xl mb-8 font-normal tracking-tight`}>
            About Us
          </h2>
          <p className={`${instrumentSerif.className} text-white/80 text-xl leading-relaxed max-w-3xl mx-auto`}>
            R2E is building a decentralized platform that empowers communities to fight misinformation together. Our
            mission is to create a world where truth prevails through collective verification and transparent rewards.
            We believe that by incentivizing accurate reporting and community-driven fact-checking, we can build a more
            trustworthy information ecosystem for everyone.
          </p>
        </div>
      </section>
    </div>
  )
}
