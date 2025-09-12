"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Medal, Award, Crown, Star } from "lucide-react";
import { useState, useEffect } from "react";

interface LeaderboardEntry {
  id: number;
  username: string;
  score: number;
  bountiesCompleted: number;
  rank: number;
  avatar: string;
  isOnline: boolean;
  streak: number;
}

const mockLeaderboardData: LeaderboardEntry[] = [
  {
    id: 1,
    username: "TruthHunter_99",
    score: 15420,
    bountiesCompleted: 127,
    rank: 1,
    avatar: "👑",
    isOnline: true,
    streak: 15
  },
  {
    id: 2,
    username: "FactChecker_Pro",
    score: 14230,
    bountiesCompleted: 118,
    rank: 2,
    avatar: "🥇",
    isOnline: true,
    streak: 12
  },
  {
    id: 3,
    username: "MisinfoSlayer",
    score: 13890,
    bountiesCompleted: 115,
    rank: 3,
    avatar: "🥈",
    isOnline: false,
    streak: 8
  },
  {
    id: 4,
    username: "VerificationMaster",
    score: 12560,
    bountiesCompleted: 98,
    rank: 4,
    avatar: "🥉",
    isOnline: true,
    streak: 6
  },
  {
    id: 5,
    username: "BountySeeker_X",
    score: 11200,
    bountiesCompleted: 89,
    rank: 5,
    avatar: "⭐",
    isOnline: false,
    streak: 3
  },
  {
    id: 6,
    username: "TruthDefender",
    score: 10850,
    bountiesCompleted: 85,
    rank: 6,
    avatar: "🛡️",
    isOnline: true,
    streak: 7
  },
  {
    id: 7,
    username: "FactFinder_AI",
    score: 9950,
    bountiesCompleted: 78,
    rank: 7,
    avatar: "🤖",
    isOnline: true,
    streak: 4
  },
  {
    id: 8,
    username: "VerificationVault",
    score: 9200,
    bountiesCompleted: 72,
    rank: 8,
    avatar: "🔒",
    isOnline: false,
    streak: 2
  },
  {
    id: 9,
    username: "BountyBlaster",
    score: 8750,
    bountiesCompleted: 68,
    rank: 9,
    avatar: "💥",
    isOnline: true,
    streak: 5
  },
  {
    id: 10,
    username: "TruthTracker",
    score: 8200,
    bountiesCompleted: 64,
    rank: 10,
    avatar: "🎯",
    isOnline: false,
    streak: 1
  }
];

const getRankIcon = (rank: number) => {
  switch (rank) {
    case 1:
      return <Crown className="h-5 w-5 text-yellow-400" />;
    case 2:
      return <Trophy className="h-5 w-5 text-gray-300" />;
    case 3:
      return <Medal className="h-5 w-5 text-amber-600" />;
    default:
      return <Award className="h-4 w-4 text-gray-400" />;
  }
};

const getRankBadgeColor = (rank: number) => {
  switch (rank) {
    case 1:
      return "bg-gradient-to-r from-yellow-400 to-yellow-600 text-black";
    case 2:
      return "bg-gradient-to-r from-gray-300 to-gray-500 text-black";
    case 3:
      return "bg-gradient-to-r from-amber-600 to-amber-800 text-white";
    default:
      return "bg-white/10 text-white";
  }
};

export function Leaderboard() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>(mockLeaderboardData);
  const [isAnimating, setIsAnimating] = useState(false);

  // Simulate live updates every 10-15 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setIsAnimating(true);
      
      // Randomly update scores and online status
      setLeaderboard(prev => 
        prev.map(entry => ({
          ...entry,
          score: entry.score + Math.floor(Math.random() * 50) + 10,
          isOnline: Math.random() > 0.3,
          streak: Math.random() > 0.7 ? entry.streak + 1 : entry.streak
        }))
        .sort((a, b) => b.score - a.score)
        .map((entry, index) => ({ ...entry, rank: index + 1 }))
      );

      setTimeout(() => setIsAnimating(false), 1000);
    }, Math.random() * 5000 + 10000); // 10-15 seconds

    return () => clearInterval(interval);
  }, []);

  return (
    <Card className="bg-white/5 border-white/10 backdrop-blur-md">
      <CardHeader>
        <CardTitle className="text-white text-lg flex items-center gap-2">
          <Trophy className="h-5 w-5 text-yellow-400" />
          Leaderboard
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {leaderboard.map((entry, index) => (
          <div
            key={entry.id}
            className={`flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10 transition-all duration-500 ${
              isAnimating ? 'animate-pulse' : ''
            } ${entry.rank <= 3 ? 'ring-1 ring-yellow-400/30' : ''}`}
          >
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                {getRankIcon(entry.rank)}
                <span className="text-white font-semibold text-sm">
                  #{entry.rank}
                </span>
              </div>
              
              <div className="text-2xl">{entry.avatar}</div>
              
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="text-white font-medium text-sm">
                    {entry.username}
                  </span>
                  {entry.isOnline && (
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                  )}
                </div>
                <div className="flex items-center gap-2 text-xs text-white/70">
                  <span>{entry.bountiesCompleted} bounties</span>
                  {entry.streak > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      <Star className="h-3 w-3 mr-1" />
                      {entry.streak} streak
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            
            <div className="text-right">
              <div className="text-white font-bold text-sm">
                {entry.score.toLocaleString()}
              </div>
              <div className="text-xs text-white/70">points</div>
            </div>
          </div>
        ))}
        
        <div className="pt-4 border-t border-white/10">
          <div className="text-center text-white/70 text-sm">
            Rankings update every 10-15 seconds
          </div>
        </div>
      </CardContent>
    </Card>
  );
}