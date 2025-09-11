import { GradientBackground } from "@/components/gradient-background"
import { Instrument_Serif } from "next/font/google"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Shield, Trophy, Star, Award, TrendingUp, Users, Newspaper, Handshake } from "lucide-react"
import { Button } from "@/components/ui/button"

const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: ["400"],
  display: "swap",
})

// Mock data for the leaderboard
const leaderboardData = [
  { rank: 1, name: "Alice", reports: 156, points: 4850, badge: "Elite" },
  { rank: 2, name: "Bob", reports: 142, points: 4200, badge: "Expert" },
  { rank: 3, name: "Charlie", reports: 128, points: 3800, badge: "Pro" },
  { rank: 4, name: "David", reports: 115, points: 3400, badge: "Veteran" },
  { rank: 5, name: "Eve", reports: 98, points: 2900, badge: "Rising Star" },
]

// Mock data for weekly challenge
const weeklyChallenge = {
  title: "Is This AI-Generated?",
  description: "Analyze this viral video claiming to show AI-generated crowds. Real or fake?",
  deadline: "2d 14h remaining",
  participants: 234,
}

// Mock data for community polls
const activePolls = [
  {
    question: "Is this trending Twitter post about quantum computing misleading?",
    votes: 156,
    endTime: "12h remaining",
  },
  {
    question: "Does this viral health advice have scientific backing?",
    votes: 89,
    endTime: "1d remaining",
  }
]

// Mock data for weekly digest
const weeklyDigest = {
  date: "September 8-14, 2025",
  highlights: [
    "Debunked: Viral AI-generated crowd video",
    "Misleading quantum computing claims",
    "False health advice trending on social media",
  ]
}

// Mock data for partnerships
const partnerships = [
  {
    name: "FactCheck Institute",
    type: "Research Partner",
    description: "Leading fact-checking organization",
  },
  {
    name: "Tech University",
    type: "Academic Partner",
    description: "AI research collaboration",
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
              Community Leaderboard
            </h1>
            <p className="text-white/90 text-xl mb-12 text-balance max-w-3xl mx-auto">
              Meet our top contributors in the fight against misinformation. Every verified report counts towards a better informed world.
            </p>
          </section>

          {/* Stats Cards */}
          <div className="grid md:grid-cols-3 gap-6 mb-12">
            <Card className="bg-white/10 border-white/20 backdrop-blur-sm">
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  
                  <div>
                    <p className="text-sm text-white/60">Total Reports</p>
                    <h3 className="text-2xl font-bold text-white">2,456</h3>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/10 border-white/20 backdrop-blur-sm">
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  
                  <div>
                    <p className="text-sm text-white/60">Active Members</p>
                    <h3 className="text-2xl font-bold text-white">892</h3>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/10 border-white/20 backdrop-blur-sm">
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div>
                    <p className="text-sm text-white/60">Points Awarded</p>
                    <h3 className="text-2xl font-bold text-white">156,789</h3>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Weekly Challenge Section */}
          <section className="mb-12">
            <Card className="bg-white/10 border-white/20 backdrop-blur-sm">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <TrendingUp className="h-6 w-6 text-purple-400" />
                  <CardTitle className="text-white">Weekly Challenge</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <h3 className="text-xl font-semibold text-white">{weeklyChallenge.title}</h3>
                  <p className="text-white/80">{weeklyChallenge.description}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-purple-400">{weeklyChallenge.deadline}</span>
                    <span className="text-white/60">{weeklyChallenge.participants} participants</span>
                  </div>
                  <Button className="bg-purple-500/20 text-purple-300 hover:bg-purple-500/30">
                    Join Challenge
                  </Button>
                </div>
              </CardContent>
            </Card>
          </section>

          {/* Community Polls */}
          <section className="mb-12">
            <Card className="bg-white/10 border-white/20 backdrop-blur-sm">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <Users className="h-6 w-6 text-blue-400" />
                  <CardTitle className="text-white">Active Polls</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {activePolls.map((poll, index) => (
                    <div key={index} className="p-4 bg-white/5 rounded-lg">
                      <h4 className="text-white mb-2">{poll.question}</h4>
                      <div className="flex justify-between text-sm">
                        <span className="text-blue-400">{poll.votes} votes</span>
                        <span className="text-white/60">{poll.endTime}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </section>

          {/* Weekly Digest */}
          <section className="mb-12">
            <Card className="bg-white/10 border-white/20 backdrop-blur-sm">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <Newspaper className="h-6 w-6 text-green-400" />
                  <CardTitle className="text-white">Weekly Fake News Digest</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <p className="text-white/60">{weeklyDigest.date}</p>
                  <ul className="space-y-2">
                    {weeklyDigest.highlights.map((item, index) => (
                      <li key={index} className="text-white flex items-start gap-2">
                        <span className="text-green-400">•</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            </Card>
          </section>

          {/* Partnerships */}
          <section className="mb-12">
            <Card className="bg-white/10 border-white/20 backdrop-blur-sm">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <Handshake className="h-6 w-6 text-yellow-400" />
                  <CardTitle className="text-white">Our Partners</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-4">
                  {partnerships.map((partner, index) => (
                    <div key={index} className="p-4 bg-white/5 rounded-lg">
                      <h4 className="text-white font-semibold mb-1">{partner.name}</h4>
                      <p className="text-yellow-400 text-sm mb-2">{partner.type}</p>
                      <p className="text-white/60 text-sm">{partner.description}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </section>

          {/* Leaderboard Table */}
          <Card className="bg-white/10 border-white/20 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-white">Top Contributors</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-white/60 border-b border-white/10">
                      <th className="text-left py-4 px-4">Rank</th>
                      <th className="text-left py-4 px-4">Name</th>
                      <th className="text-left py-4 px-4">Reports</th>
                      <th className="text-left py-4 px-4">Points</th>
                      <th className="text-left py-4 px-4">Badge</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaderboardData.map((user) => (
                      <tr key={user.rank} className="border-b border-white/5 hover:bg-white/5">
                        <td className="py-4 px-4 text-white">#{user.rank}</td>
                        <td className="py-4 px-4 text-white">{user.name}</td>
                        <td className="py-4 px-4 text-white">{user.reports}</td>
                        <td className="py-4 px-4 text-white">{user.points.toLocaleString()}</td>
                        <td className="py-4 px-4">
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm bg-white/10 text-white">
                            <Star className="h-3 w-3" />
                            {user.badge}
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
