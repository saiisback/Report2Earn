"use client"; 

import { GradientBackground } from "@/components/gradient-background"
import { Instrument_Serif } from "next/font/google"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Trophy, Star, Target, Zap, Crown, Coins } from "lucide-react"
import InteractiveHoverButton from "@/components/special-button"
import { StatsMarquee } from "@/components/stats-marquee"
import {AppleCardsCarouselDemo} from "@/components/AppleCardsCarouselDemo"
import {AnimatedListDemo} from "@/components/AnimatedListDemo"

const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: ["400"],
  display: "swap",
})

// Mock data for bounty hunters leaderboard
const bountyHunters = [
  { rank: 1, name: "ShadowHunter", bounties: 47, points: 12500, badge: "Legendary", level: 99 },
  { rank: 2, name: "CryptoVigilante", bounties: 42, points: 11200, badge: "Elite", level: 87 },
  { rank: 3, name: "TruthSeeker", bounties: 38, points: 9800, badge: "Master", level: 76 },
  { rank: 4, name: "BlockchainDetective", bounties: 35, points: 8900, badge: "Expert", level: 68 },
  { rank: 5, name: "DeFiHunter", bounties: 31, points: 7600, badge: "Veteran", level: 59 },
]

// Mock data for active bounties
const activeBounties = [
  {
    id: "B001",
    title: "Smart Contract Vulnerability Hunt",
    description: "Find critical vulnerabilities in DeFi protocol contracts",
    reward: "500 ALGO",
    difficulty: "Hard",
    deadline: "3d 12h remaining",
    participants: 89,
    status: "Active",
    category: "Security",
  },
  {
    id: "B002",
    title: "Fake News Detection Algorithm",
    description: "Develop AI model to detect misinformation in social media",
    reward: "300 ALGO",
    difficulty: "Medium",
    deadline: "5d 8h remaining",
    participants: 156,
    status: "Active",
    category: "AI/ML",
  },
  {
    id: "B003",
    title: "Blockchain Transaction Analysis",
    description: "Trace suspicious transactions across multiple chains",
    reward: "200 ALGO",
    difficulty: "Easy",
    deadline: "1d 6h remaining",
    participants: 234,
    status: "Active",
    category: "Forensics",
  },
]

// Mock data for quests
const availableQuests = [
  {
    id: "Q001",
    title: "Daily Verification Quest",
    description: "Verify 10 pieces of content today",
    reward: "50 ALGO",
    xp: 100,
    type: "Daily",
    progress: 0,
    maxProgress: 10,
  },
  {
    id: "Q002",
    title: "Weekly Research Challenge",
    description: "Complete 5 in-depth investigations",
    reward: "150 ALGO",
    xp: 300,
    type: "Weekly",
    progress: 2,
    maxProgress: 5,
  },
  {
    id: "Q003",
    title: "Community Helper",
    description: "Help 20 new members get started",
    reward: "75 ALGO",
    xp: 200,
    type: "Social",
    progress: 8,
    maxProgress: 20,
  },
]

// Mock data for guilds
const topGuilds = [
  {
    name: "Crypto Guardians",
    members: 156,
    totalBounties: 234,
    reputation: "Legendary",
    leader: "ShadowHunter",
  },
  {
    name: "Truth Seekers",
    members: 142,
    totalBounties: 198,
    reputation: "Elite",
    leader: "CryptoVigilante",
  },
  {
    name: "Blockchain Defenders",
    members: 128,
    totalBounties: 176,
    reputation: "Master",
    leader: "TruthSeeker",
  },
]

export default function CommunityPage() {
  return (
    <div className="min-h-screen w-full">
      <main className="relative min-h-screen w-full overflow-x-hidden">
        <GradientBackground />
        <div className="absolute inset-0 -z-10 bg-black/20" />

        {/* Full width content */}
        <div className="px-4 sm:px-8 md:px-12 lg:px-20 py-12 w-full">
          {/* Header Section */}
          <section className="text-center mb-12">
            <h1
              className={`${instrumentSerif.className} text-white text-center text-balance font-normal tracking-tight text-6xl md:text-7xl mb-8`}
            >
              Bounty Hunter Community
            </h1>
            <p className="text-white/90 text-xl mb-12 text-balance max-w-4xl mx-auto">
              Join the elite community of bounty hunters and truth seekers. Hunt down misinformation, earn rewards, and climb the leaderboards.
            </p>
          </section>

          {/* Marquee Section */}
          <div className="w-full mb-12">
            <StatsMarquee />
          </div>

          {/* Active Bounties Section */}
          {/* Active Bounties Section */}
<section className="mb-12 w-full">
  <Card className="bg-white/10 border-white/20 backdrop-blur-sm w-full">
    <CardHeader>
      <div className="flex items-center gap-3">
        <div className="p-2 bg-red-500/20 rounded-lg">
          <Target className="h-5 w-5 text-red-300" />
        </div>
        <CardTitle className="text-white">Active Bounties</CardTitle>
      </div>
    </CardHeader>
    <CardContent>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Left: Horizontally scrollable Apple-style carousel */}
        <div className="relative w-full overflow-hidden">
          <div className="absolute left-0 top-0 h-full w-16 bg-gradient-to-r from-black via-black/70 to-transparent z-10 pointer-events-none" />
          <div className="absolute right-0 top-0 h-full w-16 bg-gradient-to-l from-black via-black/70 to-transparent z-10 pointer-events-none" />

          {/* Replace with your AppleCardsCarouselDemo */}
          <AppleCardsCarouselDemo />
        </div>

        {/* Right: Live feed (vertical scroll) */}
        <div className="relative w-full">
          <AnimatedListDemo className="h-[500px]" />
        </div>

      </div>
    </CardContent>
  </Card>
</section>


          {/* Future Sections: Quests, Guilds, Leaderboard */}
          {/* Add more below as needed */}
        </div>
      </main>
    </div>
  )
}
