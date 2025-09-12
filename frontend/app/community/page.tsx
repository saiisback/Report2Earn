"use client";

import { GradientBackground } from "@/components/gradient-background"
import { Instrument_Serif } from "next/font/google"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Target, Coins } from "lucide-react"
import { StatsMarquee } from "@/components/stats-marquee"
import { BountyCardsCarousel } from "@/components/AppleCardsCarouselDemo"
import { AnimatedListDemo } from "@/components/AnimatedListDemo"

const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: ["400"],
  display: "swap",
})

export default function CommunityPage() {
  return (
    <div className="min-h-screen w-full">
      <main className="relative min-h-screen w-full overflow-x-hidden">
        <GradientBackground />
        <div className="absolute inset-0 -z-10 bg-black/20" />

        <div className="px-4 sm:px-8 md:px-12 lg:px-20 py-12 w-full">
          {/* Header */}
          <section className="text-center mb-12">
            <h1
              className={`${instrumentSerif.className} text-white text-center text-balance font-normal tracking-tight text-6xl md:text-7xl mb-8`}
            >
              Bounty Hunter Community
            </h1>
            <p className="text-white/90 text-xl mb-12 text-balance max-w-4xl mx-auto">
              Join the elite community of bounty hunters and truth seekers. Hunt
              down misinformation, earn rewards, and climb the leaderboards.
            </p>
          </section>

          {/* Marquee */}
          <div className="w-full mb-12">
            <StatsMarquee />
          </div>

          {/* Active Bounties + Live Feed */}
          <section className="mb-12 w-full">
            <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-8">
              {/* Bounties Carousel */}
              <Card className="bg-white/5 border-white/10 backdrop-blur-md h-[800px]  overflow-hidden">
                <CardHeader>
                  <CardTitle className="text-white text-lg flex items-center gap-2">
                    <Target className="h-5 w-5 text-red-300" />
                    Active Bounties
                  </CardTitle>
                </CardHeader>
                <CardContent className="h-full">
                  <div className="relative w-full h-full">
                    {/* Gradient fade edges */}
                    <div className="absolute left-0 top-0 h-full w-16  z-10 pointer-events-none" />
                    <div className="absolute right-0 top-0 h-full w-16 z-10 pointer-events-none" />

                    {/* Carousel */}
                    <div className="h-full overflow-x-auto scrollbar-none">
                      <BountyCardsCarousel />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Live Feed */}
              <Card className="bg-white/5 border-white/10 backdrop-blur-md h-[800px] overflow-hidden ">
                <CardHeader>
                  <CardTitle className="text-white text-lg flex items-center gap-2">
                    <Coins className="h-5 w-5 text-yellow-400" />
                    Live Feed
                  </CardTitle>
                </CardHeader>
                <CardContent className="h-full">
                  <AnimatedListDemo className="h-full" />
                </CardContent>
              </Card>
            </div>
          </section>

          {/* Future Sections: Quests, Guilds, Leaderboard */}
          <section className="mb-12">
            {/* You can add quest cards, guild leaderboard here later */}
          </section>
        </div>
      </main>
    </div>
  )
}
