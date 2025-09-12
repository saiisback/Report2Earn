"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Coins, Target, CheckCircle, XCircle, Clock, TrendingUp } from "lucide-react";
import { useState, useEffect } from "react";

interface LiveFeedEvent {
  id: string;
  type: 'bounty_completed' | 'bounty_created' | 'verification' | 'reward_earned' | 'streak_milestone';
  username: string;
  action: string;
  amount?: number;
  timestamp: Date;
  platform?: string;
  isVerified?: boolean;
  streak?: number;
}

const eventTemplates = {
  bounty_completed: [
    "completed a verification bounty",
    "successfully verified misinformation",
    "hunted down a fake news bounty",
    "cracked a complex verification case",
    "exposed a deepfake video",
    "debunked viral misinformation"
  ],
  bounty_created: [
    "posted a new bounty",
    "created a verification challenge",
    "launched a fact-checking mission",
    "started a misinformation hunt"
  ],
  verification: [
    "verified content on {platform}",
    "fact-checked a viral post",
    "validated information accuracy",
    "confirmed content authenticity"
  ],
  reward_earned: [
    "earned {amount} ALGO reward",
    "claimed {amount} tokens",
    "received {amount} ALGO bounty",
    "collected {amount} reward points"
  ],
  streak_milestone: [
    "achieved a {streak}-day streak!",
    "maintained {streak} days of verification",
    "reached {streak} consecutive days",
    "hit {streak} days in a row!"
  ]
};

const platforms = ['Twitter', 'Instagram', 'Reddit', 'YouTube', 'TikTok', 'Facebook', 'LinkedIn'];
const usernames = [
  'TruthHunter_99', 'FactChecker_Pro', 'MisinfoSlayer', 'VerificationMaster',
  'BountySeeker_X', 'TruthDefender', 'FactFinder_AI', 'VerificationVault',
  'BountyBlaster', 'TruthTracker', 'DataDetective', 'InfoInspector',
  'FakeNewsFighter', 'TruthSeeker_42', 'VerificationViking', 'BountyBandit'
];

const geometricAvatars = [
  { shape: 'circle', color: 'bg-blue-500', pattern: 'bg-gradient-to-br from-blue-400 to-blue-600' },
  { shape: 'square', color: 'bg-purple-500', pattern: 'bg-gradient-to-br from-purple-400 to-purple-600' },
  { shape: 'triangle', color: 'bg-green-500', pattern: 'bg-gradient-to-br from-green-400 to-green-600' },
  { shape: 'hexagon', color: 'bg-orange-500', pattern: 'bg-gradient-to-br from-orange-400 to-orange-600' },
  { shape: 'diamond', color: 'bg-pink-500', pattern: 'bg-gradient-to-br from-pink-400 to-pink-600' },
  { shape: 'circle', color: 'bg-cyan-500', pattern: 'bg-gradient-to-br from-cyan-400 to-cyan-600' },
  { shape: 'square', color: 'bg-red-500', pattern: 'bg-gradient-to-br from-red-400 to-red-600' },
  { shape: 'triangle', color: 'bg-yellow-500', pattern: 'bg-gradient-to-br from-yellow-400 to-yellow-600' },
  { shape: 'hexagon', color: 'bg-indigo-500', pattern: 'bg-gradient-to-br from-indigo-400 to-indigo-600' },
  { shape: 'diamond', color: 'bg-teal-500', pattern: 'bg-gradient-to-br from-teal-400 to-teal-600' },
  { shape: 'circle', color: 'bg-rose-500', pattern: 'bg-gradient-to-br from-rose-400 to-rose-600' },
  { shape: 'square', color: 'bg-emerald-500', pattern: 'bg-gradient-to-br from-emerald-400 to-emerald-600' },
  { shape: 'triangle', color: 'bg-violet-500', pattern: 'bg-gradient-to-br from-violet-400 to-violet-600' },
  { shape: 'hexagon', color: 'bg-amber-500', pattern: 'bg-gradient-to-br from-amber-400 to-amber-600' },
  { shape: 'diamond', color: 'bg-sky-500', pattern: 'bg-gradient-to-br from-sky-400 to-sky-600' },
  { shape: 'circle', color: 'bg-lime-500', pattern: 'bg-gradient-to-br from-lime-400 to-lime-600' }
];

const getEventIcon = (type: string) => {
  switch (type) {
    case 'bounty_completed':
      return <CheckCircle className="h-4 w-4 text-green-400" />;
    case 'bounty_created':
      return <Target className="h-4 w-4 text-blue-400" />;
    case 'verification':
      return <CheckCircle className="h-4 w-4 text-yellow-400" />;
    case 'reward_earned':
      return <Coins className="h-4 w-4 text-yellow-500" />;
    case 'streak_milestone':
      return <TrendingUp className="h-4 w-4 text-purple-400" />;
    default:
      return <Clock className="h-4 w-4 text-gray-400" />;
  }
};

const getEventColor = (type: string) => {
  switch (type) {
    case 'bounty_completed':
      return 'border-green-400/30 bg-green-400/10';
    case 'bounty_created':
      return 'border-blue-400/30 bg-blue-400/10';
    case 'verification':
      return 'border-yellow-400/30 bg-yellow-400/10';
    case 'reward_earned':
      return 'border-yellow-500/30 bg-yellow-500/10';
    case 'streak_milestone':
      return 'border-purple-400/30 bg-purple-400/10';
    default:
      return 'border-white/20 bg-white/5';
  }
};

const getGeometricAvatar = (username: string) => {
  const index = usernames.indexOf(username);
  const avatar = geometricAvatars[index % geometricAvatars.length];
  
  const getShapeClass = (shape: string) => {
    switch (shape) {
      case 'circle':
        return 'rounded-full';
      case 'square':
        return 'rounded-lg';
      case 'triangle':
        return 'transform rotate-45 rounded-sm';
      case 'hexagon':
        return 'rounded-lg transform rotate-12';
      case 'diamond':
        return 'transform rotate-45 rounded-sm';
      default:
        return 'rounded-full';
    }
  };

  return (
    <div className={`w-8 h-8 ${avatar.pattern} ${getShapeClass(avatar.shape)} flex items-center justify-center`}>
      <div className="w-4 h-4 bg-white/20 rounded-full"></div>
    </div>
  );
};

export function RandomLiveFeed() {
  const [events, setEvents] = useState<LiveFeedEvent[]>([]);

  const generateRandomEvent = (): LiveFeedEvent => {
    const types = Object.keys(eventTemplates) as Array<keyof typeof eventTemplates>;
    const type = types[Math.floor(Math.random() * types.length)];
    const templates = eventTemplates[type];
    const template = templates[Math.floor(Math.random() * templates.length)];
    const username = usernames[Math.floor(Math.random() * usernames.length)];
    
    let action = template;
    let amount: number | undefined;
    let platform: string | undefined;
    let streak: number | undefined;

    // Replace placeholders
    if (action.includes('{amount}')) {
      amount = Math.floor(Math.random() * 500) + 10;
      action = action.replace('{amount}', amount.toString());
    }
    if (action.includes('{platform}')) {
      platform = platforms[Math.floor(Math.random() * platforms.length)];
      action = action.replace('{platform}', platform);
    }
    if (action.includes('{streak}')) {
      streak = Math.floor(Math.random() * 30) + 5;
      action = action.replace('{streak}', streak.toString());
    }

    return {
      id: Math.random().toString(36).substr(2, 9),
      type,
      username,
      action,
      amount,
      platform,
      timestamp: new Date(),
      isVerified: Math.random() > 0.3,
      streak
    };
  };

  useEffect(() => {
    // Generate initial events
    const initialEvents = Array.from({ length: 8 }, generateRandomEvent);
    setEvents(initialEvents);

    // Add new events every 2-8 seconds
    const interval = setInterval(() => {
      const newEvent = generateRandomEvent();
      setEvents(prev => [newEvent, ...prev.slice(0, 19)]); // Keep last 20 events
    }, Math.random() * 6000 + 2000); // 2-8 seconds

    return () => clearInterval(interval);
  }, []);

  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const seconds = Math.floor(diff / 1000);
    
    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    return `${Math.floor(seconds / 3600)}h ago`;
  };

  return (
    <Card className="bg-white/5 border-white/10 backdrop-blur-md h-[800px] overflow-hidden">
      <CardHeader>
        <CardTitle className="text-white text-lg flex items-center gap-2">
          <Coins className="h-5 w-5 text-yellow-400" />
          Live Feed
          <div className="ml-auto flex items-center gap-1">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            <span className="text-xs text-white/70">LIVE</span>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="h-full overflow-y-auto scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent">
        <div className="space-y-3">
          {events.map((event, index) => (
            <div
              key={event.id}
              className={`p-3 rounded-lg border transition-all duration-300 ${
                index === 0 ? 'animate-pulse' : ''
              } ${getEventColor(event.type)}`}
            >
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-0.5">
                  {getGeometricAvatar(event.username)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-white font-medium text-sm truncate">
                      {event.username}
                    </span>
                    {event.isVerified && (
                      <Badge variant="secondary" className="text-xs">
                        Verified
                      </Badge>
                    )}
                    {event.streak && event.streak > 5 && (
                      <Badge variant="outline" className="text-xs">
                        {event.streak} streak
                      </Badge>
                    )}
                  </div>
                  
                  <p className="text-white/90 text-sm mb-1">
                    {event.action}
                  </p>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs text-white/70">
                      <span>{formatTime(event.timestamp)}</span>
                      {event.platform && (
                        <>
                          <span>•</span>
                          <span>{event.platform}</span>
                        </>
                      )}
                    </div>
                    
                    {event.amount && (
                      <div className="text-yellow-400 font-semibold text-sm">
                        +{event.amount} ALGO
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        <div className="mt-4 pt-4 border-t border-white/10">
          <div className="text-center text-white/70 text-xs">
            Events appear every 2-8 seconds
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
