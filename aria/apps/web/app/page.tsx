"use client";

import Link from "next/link";
import { motion } from "framer-motion";

export default function LandingPage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-black text-white">
      <div className="absolute left-6 top-6 font-mono text-xs tracking-[0.2em] text-white/40">
        ARIA / V0.1
      </div>
      <div className="absolute right-6 top-6 font-mono text-xs tracking-[0.2em] text-white/40">
        MIAMI, FL
      </div>

      <div className="mx-auto flex min-h-screen max-w-5xl flex-col items-start justify-center px-8 md:px-16">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="mb-6 flex items-center gap-3 font-mono text-xs tracking-[0.3em] text-[#ff6b00]"
        >
          <span className="h-px w-8 bg-[#ff6b00]" />
          PRE-INCIDENT INTELLIGENCE
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: "easeOut", delay: 0.1 }}
          className="max-w-4xl text-balance text-5xl font-medium leading-[1.05] tracking-tight md:text-7xl"
        >
          Pre-incident world models{" "}
          <span className="text-white/50">for first responders.</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: "easeOut", delay: 0.25 }}
          className="mt-8 max-w-2xl text-lg leading-relaxed text-white/60 md:text-xl"
        >
          Aria runs an agent against every building in Miami and produces the
          size-up a battalion chief needs before the truck arrives — wind,
          surge, and flood, grounded in real data.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: "easeOut", delay: 0.4 }}
          className="mt-12 flex items-center gap-6"
        >
          <Link
            href="/dashboard"
            className="group inline-flex items-center gap-3 rounded-md bg-[#ff6b00] px-6 py-3 text-sm font-medium tracking-wide text-black transition-colors hover:bg-[#ff7f1f]"
          >
            Open Dashboard
            <span aria-hidden className="transition-transform group-hover:translate-x-0.5">
              →
            </span>
          </Link>
          <span className="font-mono text-xs tracking-[0.2em] text-white/30">
            DEMO READY
          </span>
        </motion.div>
      </div>

      <div className="absolute bottom-6 left-6 font-mono text-xs tracking-[0.2em] text-white/30">
        BUILT FOR MIAMI-DADE FIRE RESCUE
      </div>
      <div className="absolute bottom-6 right-6 font-mono text-xs tracking-[0.2em] text-white/30">
        HURRICANE · SURGE · FLOOD
      </div>
    </main>
  );
}
