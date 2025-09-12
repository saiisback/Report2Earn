"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { AnimatedList } from "@/components/magicui/animated-list";

interface Item {
  name: string;
  description: string;
  icon: string;
  color: string;
  time: string;
  pfp: string;
}

// sample user pool
const users = [
  "Alice", "Bob", "Charlie", "Diana", "Ethan",
  "Fatima", "George", "Hiro", "Isha", "Jay",
];

// sample bounty pool
const bounties = [
  "Smart Contract Escrow",
  "Algorand Wallet SDK",
  "DeFi Lending Protocol",
  "iOS Wallet App",
  "Algorand Tutorials",
  "Smart Contract Audit",
];

const randomAmount = () => (Math.floor(Math.random() * 50) + 1) + " ALGO";

// generate a random profile picture URL
const randomPFP = (seed: number) => `https://i.pravatar.cc/150?img=${seed + 1}`;

const Notification = ({ name, description, icon, color, time, pfp }: Item) => {
  return (
    <figure
      className={cn(
        "relative mx-auto min-h-fit w-full max-w-[400px] cursor-pointer overflow-hidden rounded-2xl p-4",
        "transition-all duration-200 ease-in-out hover:scale-[103%]",
        "bg-white [box-shadow:0_0_0_1px_rgba(0,0,0,.03),0_2px_4px_rgba(0,0,0,.05),0_12px_24px_rgba(0,0,0,.05)]",
        "transform-gpu dark:bg-transparent dark:backdrop-blur-md dark:[border:1px_solid_rgba(255,255,255,.1)] dark:[box-shadow:0_-20px_80px_-20px_#ffffff1f_inset]",
      )}
    >
      <div className="flex flex-row items-center gap-3">
        <img
          src={pfp}
          alt={name}
          className="w-10 h-10 rounded-full object-cover"
        />
        <div className="flex flex-col overflow-hidden">
          <figcaption className="flex flex-row items-center whitespace-pre text-lg font-medium dark:text-white">
            <span className="text-sm sm:text-lg">{name}</span>
            <span className="mx-1">·</span>
            <span className="text-xs text-gray-500">{time}</span>
          </figcaption>
          <p className="text-sm font-normal dark:text-white/60">{description}</p>
        </div>
      </div>
    </figure>
  );
};

export function AnimatedListDemo({ className }: { className?: string }) {
  const [feed, setFeed] = useState<Item[]>([]);

  // function to generate a random notification
  const generateNotification = (): Item => {
    const userIdx = Math.floor(Math.random() * users.length);
    const user = users[userIdx];
    const bounty = bounties[Math.floor(Math.random() * bounties.length)];
    return {
      name: user,
      description: `just won ${randomAmount()} from **${bounty}**!`,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      icon: "🏆",
      color: "#00C9A7",
      pfp: randomPFP(userIdx),
    };
  };

  useEffect(() => {
    // seed with initial feed
    setFeed([generateNotification(), generateNotification(), generateNotification()]);

    // push new notification every 5s
    const interval = setInterval(() => {
      setFeed((prev) => [generateNotification(), ...prev].slice(0, 20)); // max 20 items
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div
      className={cn(
        "relative flex h-[500px] w-full flex-col overflow-hidden p-2",
        className,
      )}
    >
      <AnimatedList>
        {feed.map((item, idx) => (
          <Notification {...item} key={idx} />
        ))}
      </AnimatedList>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/4 "></div>
    </div>
  );
}
