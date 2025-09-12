"use client";

import { motion } from "framer-motion";

interface Stat {
  label: string;
  value: string;
}

const stats: Stat[] = [
  { label: "Active Bounties", value: "47" },
  { label: "Active Hunters", value: "1,247" },
  { label: "Total Rewards", value: "12,450 ALGO" },
  { label: "Completed Bounties", value: "2,156" },
  { label: "Top Guilds", value: "25" },
];

export function StatsMarquee() {
  const loopedStats = [...stats, ...stats]; // duplicate for seamless loop

  return (
    <div className="relative w-full overflow-hidden bg-white py-4">
      <motion.div
        className="flex whitespace-nowrap"
        animate={{ x: ["0%", "-100%"] }}
        transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
      >
        {loopedStats.map((stat, idx) => (
          <div
            key={idx}
            className="w-1/5 flex-shrink-0 flex items-center justify-center px-6"
          >
            <div>
              <p className="text-sm text-gray-500">{stat.label}</p>
              <p className="text-xl font-semibold text-gray-900">{stat.value}</p>
            </div>
          </div>
        ))}
      </motion.div>
    </div>
  );
}
