"use client";

import { GradientBackground } from "@/components/gradient-background"
import { Instrument_Serif } from "next/font/google"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Target, Coins, Trophy } from "lucide-react"
import { StatsMarquee } from "@/components/stats-marquee"
import { BountyCardsCarousel } from "@/components/AppleCardsCarouselDemo"
import { RandomLiveFeed } from "@/components/RandomLiveFeed"
import { Leaderboard } from "@/components/Leaderboard"

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

          {/* Active Bounties + Live Feed test comment*/} 
          <section className="mb-12 w-full">
            <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-8">
              {/* Bounties Carousel */}
              <Card className="bg-white/5 border-white/10 backdrop-blur-md h-[800px]  overflow-hidden">
                <CardHeader>
                  <CardTitle className="text-white text-lg flex items-center gap-2">
                    <Target className="h-5 w-5 text-red-300" />
                    Active Bounty
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
              <RandomLiveFeed />
            </div>
          </section>

          {/* Leaderboard Section */}
          <section className="mb-12">
            <div className="text-center mb-8">
              <h2 className={`${instrumentSerif.className} text-white text-4xl md:text-5xl mb-4`}>
                Top Hunters
              </h2>
              <p className="text-white/80 text-lg max-w-2xl mx-auto">
                See who's leading the pack in the battle against misinformation
              </p>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Top 5 Leaderboard */}
              <div className="space-y-4">
                <h3 className="text-white text-xl font-semibold flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-yellow-400" />
                  Top 5 Hunters
                </h3>
                <Leaderboard />
              </div>
              
              {/* Community Stats */}
              <Card className="bg-white/5 border-white/10 backdrop-blur-md">
                <CardHeader>
                  <CardTitle className="text-white text-lg flex items-center gap-2">
                    <Target className="h-5 w-5 text-red-300" />
                    Community Stats
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-4 bg-white/5 rounded-lg">
                      <div className="text-2xl font-bold text-white">2,847</div>
                      <div className="text-sm text-white/70">Active Hunters</div>
                    </div>
                    <div className="text-center p-4 bg-white/5 rounded-lg">
                      <div className="text-2xl font-bold text-white">15,420</div>
                      <div className="text-sm text-white/70">Bounties Completed</div>
                    </div>
                    <div className="text-center p-4 bg-white/5 rounded-lg">
                      <div className="text-2xl font-bold text-white">₳89,230</div>
                      <div className="text-sm text-white/70">Rewards Distributed</div>
                    </div>
                    <div className="text-center p-4 bg-white/5 rounded-lg">
                      <div className="text-2xl font-bold text-white">98.7%</div>
                      <div className="text-sm text-white/70">Accuracy Rate</div>
                    </div>
                  </div>
                  
                  <div className="pt-4 border-t border-white/10">
                    <div className="text-center text-white/70 text-sm">
                      Last updated: {new Date().toLocaleTimeString()}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </section>
        </div>
      </main>
    </div>
  )
}
