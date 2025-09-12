"use client";

import React from "react";
import { Carousel } from "@/components/ui/apple-cards-carousel";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";

export function BountyCardsCarousel() {
  const cards = bounties.map((bounty, index) => (
    <Card
      key={index}
      className="bg-white/5 border-white/10 backdrop-blur-md min-h-[400px] max-h-[400px] flex flex-col mx-2 min-w-[280px]"
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
    category: "Smart Contracts",
    title: "Build a secure Algorand Escrow Contract",
    content: (
      <BountyContent
        description="Design and deploy a trustless escrow contract on Algorand that releases funds only when conditions are met."
        reward="250 ALGO"
      />
    ),
  },
  {
    category: "Developer Tools",
    title: "Algorand Wallet Integration SDK",
    content: (
      <BountyContent
        description="Create an easy-to-use SDK for integrating Algorand wallet authentication into dApps."
        reward="500 ALGO"
      />
    ),
  },
  {
    category: "DeFi",
    title: "Build a Lending Protocol Prototype",
    content: (
      <BountyContent
        description="Prototype a decentralized lending platform on Algorand with collateralized loans."
        reward="750 ALGO"
      />
    ),
  },
  {
    category: "Mobile Apps",
    title: "iOS App for Algorand Transactions",
    content: (
      <BountyContent
        description="Build a mobile-first wallet app for iOS with Algorand payments and NFT support."
        reward="600 ALGO"
      />
    ),
  },
  {
    category: "Community",
    title: "Algorand Educational Content",
    content: (
      <BountyContent
        description="Produce high-quality tutorials and guides to help onboard new developers into the Algorand ecosystem."
        reward="300 ALGO"
      />
    ),
  },
  {
    category: "Security",
    title: "Audit an Algorand Smart Contract",
    content: (
      <BountyContent
        description="Perform a full audit on an existing Algorand contract and provide detailed vulnerability reports."
        reward="1000 ALGO"
      />
    ),
  },
];
