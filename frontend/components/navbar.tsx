"use client"

import React, { useState } from "react"
import { IconHome, IconShield, IconUsers } from "@tabler/icons-react"
import { Instrument_Serif } from "next/font/google"
import WalletConnection from "@/components/WalletConnection"
import { motion, useScroll, useMotionValueEvent } from "motion/react"
import Link from "next/link"
import { cn } from "@/lib/utils"

const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: ["400"],
  display: "swap",
})

// Floating Navbar Component
interface FloatingNavProps {
  navItems: {
    name: string;
    link: string;
    icon: React.ReactNode;
  }[];
  className?: string;
}

const FloatingNav = ({ navItems, className, instrumentSerif }: FloatingNavProps & { instrumentSerif: any }) => {
  const { scrollY } = useScroll();
  const [visible, setVisible] = useState(false);

  useMotionValueEvent(scrollY, "change", (current) => {
    // Check if current is not undefined and is a number
    if (typeof current === "number") {
      let direction = current - scrollY.getPrevious()!;

      if (scrollY.get() < 150) {
        setVisible(false);
      } else {
        if (direction < 0) {
          setVisible(true);
        } else {
          setVisible(false);
        }
      }
    }
  });

  return (
    <motion.div
      initial={{
        opacity: 1,
        y: -100,
      }}
      animate={{
        y: visible ? 0 : -100,
        opacity: visible ? 1 : 0,
      }}
      transition={{
        duration: 0.2,
      }}
      className={cn(
        "flex max-w-4xl fixed top-10 inset-x-0 mx-auto border border-white/20 rounded-full bg-white/10 backdrop-blur-md z-[5000] px-8 py-6 items-center justify-between space-x-8",
        className
      )}
    >
      {/* Logo */}
      <div className={`${instrumentSerif.className} text-white text-2xl font-normal tracking-tight`}>
        R2E
      </div>
      
      {/* Navigation Links */}
      <div className="flex items-center space-x-6">
        {navItems.map((navItem: any, idx: number) => (
          <Link
            key={`link-${idx}`}
            href={navItem.link}
            className={cn(
              "relative text-white items-center flex space-x-1 hover:text-white/80"
            )}
          >
            <span className="block sm:hidden">{navItem.icon}</span>
            <span className="hidden sm:block text-sm">{navItem.name}</span>
          </Link>
        ))}
      </div>
      
      {/* Wallet Button */}
      <WalletConnection />
    </motion.div>
  );
};

export function NavbarComponent() {
  const navItems = [
    {
      name: "Home",
      link: "/",
      icon: <IconHome className="h-4 w-4 text-white" />,
    },
    {
      name: "Verify",
      link: "/verify",
      icon: <IconShield className="h-4 w-4 text-white" />,
    },
    {
      name: "Community",
      link: "/community",
      icon: <IconUsers className="h-4 w-4 text-white" />,
    },
  ];

  return (
    <div className="relative w-full">
      <FloatingNav 
        navItems={navItems} 
        className="bg-white/10 backdrop-blur-md border border-white/20"
        instrumentSerif={instrumentSerif}
      />
    </div>
  );
}
