"use client";

import React from "react";
import { Carousel } from "@/components/ui/apple-cards-carousel";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";

export function BountyCardsCarousel() {
  const cards = bounties.map((bounty, index) => (
    <Card
      key={index}
      className="border-white/10 backdrop-blur-md min-h-[400px] max-h-[400px] flex flex-col mx-2 min-w-[280px]"
    >
      <CardHeader>
        <CardTitle className="text-sm md:text-base text-white font-semibold">
          {bounty.title}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col justify-between h-full">
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
    <div className="flex flex-col justify-between h-full p-2 md:p-3">
      <p className="text-xs md:text-sm text-neutral-200 line-clamp-3">{description}</p>
      <div className="text-sm md:text-base font-semibold text-center text-white mt-2">
        Reward: {reward}
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
