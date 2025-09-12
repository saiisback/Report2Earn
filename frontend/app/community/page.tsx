import { GradientBackground } from "@/components/gradient-background"
import { Instrument_Serif } from "next/font/google"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Sword, Trophy, Star, Award, Target, Users, Clock, Zap, Shield, Coins, Crown, Flame } from "lucide-react"
import InteractiveHoverButton from "@/components/special-button"

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
    category: "Security"
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
    category: "AI/ML"
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
    category: "Forensics"
  }
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
    maxProgress: 10
  },
  {
    id: "Q002",
    title: "Weekly Research Challenge",
    description: "Complete 5 in-depth investigations",
    reward: "150 ALGO",
    xp: 300,
    type: "Weekly",
    progress: 2,
    maxProgress: 5
  },
  {
    id: "Q003",
    title: "Community Helper",
    description: "Help 20 new members get started",
    reward: "75 ALGO",
    xp: 200,
    type: "Social",
    progress: 8,
    maxProgress: 20
  }
]

// Mock data for guilds
const topGuilds = [
  {
    name: "Crypto Guardians",
    members: 156,
    totalBounties: 234,
    reputation: "Legendary",
    leader: "ShadowHunter"
  },
  {
    name: "Truth Seekers",
    members: 142,
    totalBounties: 198,
    reputation: "Elite",
    leader: "CryptoVigilante"
  },
  {
    name: "Blockchain Defenders",
    members: 128,
    totalBounties: 176,
    reputation: "Master",
    leader: "TruthSeeker"
  }
]

export default function CommunityPage() {
  return (
    <div className="min-h-screen">
      <main className="relative min-h-screen overflow-hidden">
        <GradientBackground />
        <div className="absolute inset-0 -z-10 bg-black/20" />

        <div className="container mx-auto px-4 py-12">
          {/* Header Section */}
          <section className="text-center mb-20">
            <h1 className={`${instrumentSerif.className} text-white text-center text-balance font-normal tracking-tight text-6xl md:text-7xl mb-8`}>
              Bounty Hunter Community
            </h1>
            <p className="text-white/90 text-xl mb-12 text-balance max-w-3xl mx-auto">
              Join the elite community of bounty hunters and truth seekers. Hunt down misinformation, earn rewards, and climb the leaderboards.
            </p>
            <InteractiveHoverButton className="bg-gradient-to-r from-purple-500 to-pink-500 text-white border-0">
              Join the Hunt
            </InteractiveHoverButton>
          </section>

          {/* Stats Cards */}
          <div className="grid md:grid-cols-4 gap-6 mb-12">
            <Card className="bg-white/10 border-white/20 backdrop-blur-sm">
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-orange-500/20 rounded-full">
                    <Sword className="h-6 w-6 text-orange-300" />
                  </div>
                  <div>
                    <p className="text-sm text-white/60">Active Bounties</p>
                    <h3 className="text-2xl font-bold text-white">47</h3>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/10 border-white/20 backdrop-blur-sm">
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-blue-500/20 rounded-full">
                    <Users className="h-6 w-6 text-blue-300" />
                  </div>
                  <div>
                    <p className="text-sm text-white/60">Active Hunters</p>
                    <h3 className="text-2xl font-bold text-white">1,247</h3>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/10 border-white/20 backdrop-blur-sm">
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-yellow-500/20 rounded-full">
                    <Coins className="h-6 w-6 text-yellow-300" />
                  </div>
                  <div>
                    <p className="text-sm text-white/60">Total Rewards</p>
                    <h3 className="text-2xl font-bold text-white">12,450 ALGO</h3>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/10 border-white/20 backdrop-blur-sm">
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-purple-500/20 rounded-full">
                    <Trophy className="h-6 w-6 text-purple-300" />
                  </div>
                  <div>
                    <p className="text-sm text-white/60">Completed Bounties</p>
                    <h3 className="text-2xl font-bold text-white">2,156</h3>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Active Bounties Section */}
          <section className="mb-12">
            <Card className="bg-white/10 border-white/20 backdrop-blur-sm">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-red-500/20 rounded-lg">
                    <Target className="h-5 w-5 text-red-300" />
                  </div>
                  <CardTitle className="text-white">Active Bounties</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {activeBounties.map((bounty) => (
                    <div key={bounty.id} className="p-6 bg-white/5 rounded-lg border border-white/10">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="text-xl font-semibold text-white mb-2">{bounty.title}</h3>
                          <p className="text-white/80 mb-3">{bounty.description}</p>
                          <div className="flex items-center gap-4 text-sm">
                            <span className="text-yellow-300 flex items-center gap-1">
                              <Coins className="h-4 w-4" />
                              {bounty.reward}
                            </span>
                            <span className={`px-2 py-1 rounded-full text-xs ${
                              bounty.difficulty === 'Hard' ? 'bg-red-500/20 text-red-300' :
                              bounty.difficulty === 'Medium' ? 'bg-yellow-500/20 text-yellow-300' :
                              'bg-green-500/20 text-green-300'
                            }`}>
                              {bounty.difficulty}
                            </span>
                            <span className="text-blue-300">{bounty.category}</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-white/60 text-sm">{bounty.deadline}</p>
                          <p className="text-white/60 text-sm">{bounty.participants} hunters</p>
                        </div>
                      </div>
                      <InteractiveHoverButton className="bg-gradient-to-r from-red-500 to-orange-500 text-white border-0">
                        Accept Bounty
                      </InteractiveHoverButton>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </section>

          {/* Available Quests */}
          <section className="mb-12">
            <Card className="bg-white/10 border-white/20 backdrop-blur-sm">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-yellow-500/20 rounded-lg">
                    <Zap className="h-5 w-5 text-yellow-300" />
                  </div>
                  <CardTitle className="text-white">Available Quests</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-3 gap-6">
                  {availableQuests.map((quest) => (
                    <div key={quest.id} className="p-6 bg-white/5 rounded-lg border border-white/10">
                      <div className="flex items-center gap-2 mb-3">
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          quest.type === 'Daily' ? 'bg-green-500/20 text-green-300' :
                          quest.type === 'Weekly' ? 'bg-blue-500/20 text-blue-300' :
                          'bg-purple-500/20 text-purple-300'
                        }`}>
                          {quest.type}
                        </span>
                        <span className="text-white/60 text-sm">{quest.xp} XP</span>
                      </div>
                      <h3 className="text-lg font-semibold text-white mb-2">{quest.title}</h3>
                      <p className="text-white/80 text-sm mb-4">{quest.description}</p>
                      <div className="mb-4">
                        <div className="flex justify-between text-sm text-white/60 mb-1">
                          <span>Progress</span>
                          <span>{quest.progress}/{quest.maxProgress}</span>
                        </div>
                        <div className="w-full bg-white/10 rounded-full h-2">
                          <div 
                            className="bg-gradient-to-r from-yellow-400 to-orange-400 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${(quest.progress / quest.maxProgress) * 100}%` }}
                          />
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-yellow-300 font-semibold">{quest.reward}</span>
                        <InteractiveHoverButton className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white border-0 text-sm px-4 py-2">
                          Start Quest
                        </InteractiveHoverButton>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </section>

          {/* Top Guilds */}
          <section className="mb-12">
            <Card className="bg-white/10 border-white/20 backdrop-blur-sm">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-yellow-500/20 rounded-lg">
                    <Crown className="h-5 w-5 text-yellow-300" />
                  </div>
                  <CardTitle className="text-white">Top Guilds</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {topGuilds.map((guild, index) => (
                    <div key={index} className="p-4 bg-white/5 rounded-lg flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-full flex items-center justify-center border border-purple-500/30">
                          <Crown className="h-6 w-6 text-purple-300" />
                        </div>
                        <div>
                          <h4 className="text-white font-semibold">{guild.name}</h4>
                          <p className="text-white/60 text-sm">Led by {guild.leader}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-white/60 text-sm">{guild.members} members</p>
                        <p className="text-white/60 text-sm">{guild.totalBounties} bounties</p>
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          guild.reputation === 'Legendary' ? 'bg-purple-500/20 text-purple-300' :
                          guild.reputation === 'Elite' ? 'bg-blue-500/20 text-blue-300' :
                          'bg-green-500/20 text-green-300'
                        }`}>
                          {guild.reputation}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </section>

          {/* Bounty Hunters Leaderboard */}
          <Card className="bg-white/10 border-white/20 backdrop-blur-sm">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-yellow-500/20 rounded-lg">
                  <Trophy className="h-5 w-5 text-yellow-300" />
                </div>
                <CardTitle className="text-white">Top Bounty Hunters</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-white/60 border-b border-white/10">
                      <th className="text-left py-4 px-4">Rank</th>
                      <th className="text-left py-4 px-4">Hunter</th>
                      <th className="text-left py-4 px-4">Level</th>
                      <th className="text-left py-4 px-4">Bounties</th>
                      <th className="text-left py-4 px-4">Points</th>
                      <th className="text-left py-4 px-4">Badge</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bountyHunters.map((hunter) => (
                      <tr key={hunter.rank} className="border-b border-white/5 hover:bg-white/5">
                        <td className="py-4 px-4 text-white">
                          {hunter.rank === 1 && <Crown className="h-4 w-4 text-yellow-300 inline mr-2" />}
                          #{hunter.rank}
                        </td>
                        <td className="py-4 px-4 text-white font-semibold">{hunter.name}</td>
                        <td className="py-4 px-4 text-white">{hunter.level}</td>
                        <td className="py-4 px-4 text-white">{hunter.bounties}</td>
                        <td className="py-4 px-4 text-white">{hunter.points.toLocaleString()}</td>
                        <td className="py-4 px-4">
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm bg-white/10 text-white">
                            <Star className="h-3 w-3" />
                            {hunter.badge}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
