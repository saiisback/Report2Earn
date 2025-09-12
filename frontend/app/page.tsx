'use client';

import { GradientBackground } from "@/components/gradient-background"
import { Instrument_Serif } from "next/font/google"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { motion } from "framer-motion"
import { NetworkStatus } from "@/components/NetworkStatus"

const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: ["400"],
  display: "swap",
})

export default function Page() {
  return (
    <div className="min-h-screen">
      {/* Network Status */}
      <div className="absolute top-4 right-4 z-50">
        <NetworkStatus />
      </div>
      
      <main className="relative min-h-screen flex items-center justify-center overflow-hidden">
        <GradientBackground />
        <div className="absolute inset-0 -z-10 bg-black/20" />

        <motion.section 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="px-6 text-center max-w-4xl"
        >
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className={`${instrumentSerif.className} text-white text-center text-balance font-normal tracking-tight text-7xl mb-6`}
          >
            Verify Truth. Earn Algo.
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className={`${instrumentSerif.className} text-white/90 text-xl mb-8 text-balance max-w-2xl mx-auto`}
          >
            R2E rewards people for reporting misinformation.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button
                asChild
                size="lg"
                className={`${instrumentSerif.className} border border-white text-white font-semibold bg-transparent hover:bg-white/10 transition-all duration-300`}
              >
                <Link href="/verify">Verify Now</Link>
              </Button>
            </motion.div>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button
                asChild
                variant="outline"
                size="lg"
                className={`${instrumentSerif.className} border-white text-white font-semibold bg-transparent hover:bg-white/10 transition-all duration-300`}
              >
                <Link href="/community">Join the Community</Link>
              </Button>
            </motion.div>
          </motion.div>
        </motion.section>
      </main>

      <section className="relative py-20 px-6 bg-black text-white">
        <motion.div 
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="max-w-4xl mx-auto text-center"
        >
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className={`${instrumentSerif.className} text-white text-5xl mb-8 font-normal tracking-tight`}
          >
            How to Earn
          </motion.h2>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className={`${instrumentSerif.className} text-white/80 text-xl mb-12 max-w-2xl mx-auto`}
          >
            Join our community of truth-seekers and earn rewards for helping combat misinformation. Simply spot
            suspicious content, submit it for verification, and get rewarded when your reports are validated.
          </motion.p>
          <div className="grid md:grid-cols-3 gap-8">
            {['Spot', 'Report', 'Earn'].map((step, index) => (
              <motion.div
                key={step}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.4 + index * 0.2 }}
                className="text-center"
              >
                <div className={`${instrumentSerif.className} text-3xl font-normal mb-4 text-white`}>
                  {`${index + 1}. ${step}`}
                </div>
                <p className={`${instrumentSerif.className} text-white/70`}>
                  {step === 'Spot' && 'Find suspicious content on social media'}
                  {step === 'Report' && 'Submit it through our verification system'}
                  {step === 'Earn' && 'Get rewarded for accurate reports'}
                </p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      <section className="relative py-20 px-6 bg-black">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="max-w-4xl mx-auto text-center"
        >
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className={`${instrumentSerif.className} text-white text-5xl mb-8 font-normal tracking-tight`}
          >
            About Us
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className={`${instrumentSerif.className} text-white/80 text-xl leading-relaxed max-w-3xl mx-auto`}
          >
            R2E is building a decentralized platform that empowers communities to fight misinformation together. Our
            mission is to create a world where truth prevails through collective verification and transparent rewards.
            We believe that by incentivizing accurate reporting and community-driven fact-checking, we can build a more
            trustworthy information ecosystem for everyone.
          </motion.p>
        </motion.div>
      </section>
    </div>
  )
}
