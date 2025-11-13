"use client";

import React from "react";
import { Carousel } from "@/components/ui/apple-cards-carousel";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";

export function BountyCardsCarousel() {
  const cards = bounties.map((bounty, index) => (
      <Card
        key={index}
        className="bg-white/5 border-white/10 backdrop-blur-xl min-h-[400px] max-h-[400px] flex flex-col mx-2 min-w-[300px] shadow-2xl hover:shadow-3xl transition-all duration-300 hover:scale-[1.02]"
      >
        <CardHeader className="border-b border-white/10 p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 bg-red-400 rounded-full animate-pulse" />
            <span className="text-xs text-white/70 font-medium uppercase tracking-wide">
              {bounty.category}
            </span>
          </div>
          <CardTitle className="text-lg font-bold text-white leading-tight">
            {bounty.title}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col justify-between h-full p-4">
          {bounty.content}
        </CardContent>
      </Card>
  ));

  return (
    <div className="w-full h-full py-4">
      <Carousel items={cards} />
    </div>
  );
}

const BountyContent = ({
  description,
  reward,
}: {
  description: string;
  reward: string;
}) => {
  return (
    <div className="flex flex-col justify-between h-full">
      <div className="flex-1">
        <p className="text-sm text-white leading-relaxed line-clamp-4 mb-4">
          {description}
        </p>
      </div>
      <div className="mt-auto">
        <div className="bg-gradient-to-r from-yellow-400/10 to-yellow-500/5 border border-yellow-400/20 rounded-lg p-3 text-center backdrop-blur-sm">
          <div className="text-xs text-white font-medium uppercase tracking-wide mb-1">
            Reward
          </div>
          <div className="text-lg font-bold text-white">
            {reward}
          </div>
        </div>
        <button className="w-full mt-3 bg-gradient-to-r from-red-500/80 to-red-600/80 hover:from-red-600/90 hover:to-red-700/90 text-white font-semibold py-2 px-4 rounded-lg transition-all duration-200 hover:shadow-lg hover:scale-[1.02] backdrop-blur-sm border border-red-400/30">
          Accept Bounty
        </button>
      </div>
    </div>
  );
};

const bounties = [
  {
    category: "Misinformation",
    title: "Verify Viral Twitter Post",
    content: (
      <BountyContent
        description="Fact-check a viral tweet claiming celebrity death. Verify authenticity and trace original source."
        reward="50 ALGO"
      />
    ),
  },
  {
    category: "Deepfake",
    title: "Detect AI-Generated Video",
    content: (
      <BountyContent
        description="Analyze suspicious video content on TikTok. Determine if it's AI-generated and identify manipulation techniques."
        reward="75 ALGO"
      />
    ),
  },
  {
    category: "News Verification",
    title: "Verify Breaking News Story",
    content: (
      <BountyContent
        description="Cross-reference breaking news claims with multiple sources. Verify timeline and authenticity of events."
        reward="100 ALGO"
      />
    ),
  },
  {
    category: "Social Media",
    title: "Instagram Post Verification",
    content: (
      <BountyContent
        description="Verify authenticity of viral Instagram post. Check for image manipulation and source credibility."
        reward="40 ALGO"
      />
    ),
  },
  {
    category: "Reddit",
    title: "Debunk Conspiracy Theory",
    content: (
      <BountyContent
        description="Investigate and debunk conspiracy theory post on Reddit. Provide evidence-based counterarguments."
        reward="60 ALGO"
      />
    ),
  },
  {
    category: "YouTube",
    title: "Verify Educational Content",
    content: (
      <BountyContent
        description="Fact-check educational YouTube video. Verify claims, check sources, and assess accuracy of information."
        reward="80 ALGO"
      />
    ),
  },
  {
    category: "Political",
    title: "Verify Political Statement",
    content: (
      <BountyContent
        description="Fact-check political claim from public figure. Verify statistics, quotes, and historical accuracy."
        reward="120 ALGO"
      />
    ),
  },
  {
    category: "Health",
    title: "Medical Misinformation",
    content: (
      <BountyContent
        description="Verify health claims and medical advice. Check against peer-reviewed sources and medical consensus."
        reward="90 ALGO"
      />
    ),
  },
];
