"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";

function Globe() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;

    const resize = () => {
      const dpr = devicePixelRatio;
      canvas.width = canvas.offsetWidth * dpr;
      canvas.height = canvas.offsetHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    const W = () => canvas.offsetWidth;
    const H = () => canvas.offsetHeight;

    const cities: [number, number, string][] = [
      [25.77, -80.19, "MIAMI"],
      [40.71, -74.01, "NEW YORK"],
      [29.76, -95.37, "HOUSTON"],
      [34.05, -118.24, "LOS ANGELES"],
      [41.85, -87.65, "CHICAGO"],
      [29.95, -90.07, "NEW ORLEANS"],
      [27.95, -82.46, "TAMPA"],
      [32.79, -79.94, "CHARLESTON"],
    ];

    const arcs = cities.slice(1).map((_, i) => ({
      progress: 0,
      delay: i * 500,
    }));

    let angle = 0;
    let startTime = 0;

    function toXY(lat: number, lng: number, rotDeg: number, r: number, cx: number, cy: number) {
      const phi = (90 - lat) * (Math.PI / 180);
      const theta = (lng + 180 + rotDeg) * (Math.PI / 180);
      const x = r * Math.sin(phi) * Math.cos(theta);
      const y = r * Math.cos(phi);
      const z = r * Math.sin(phi) * Math.sin(theta);
      return { x: cx + x, y: cy - y, z };
    }

    function draw(t: number) {
      if (!startTime) startTime = t;
      const elapsed = t - startTime;
      ctx.clearRect(0, 0, W(), H());

      const cx = W() / 2;
      const cy = H() / 2 + H() * 0.02;
      const r = Math.min(W(), H()) * 0.36;

      angle += 0.12;

      for (let lat = -80; lat <= 80; lat += 10) {
        for (let lng = -180; lng <= 180; lng += 10) {
          const { x, y, z } = toXY(lat, lng, angle, r, cx, cy);
          if (z < 0) continue;
          const depth = z / r;
          const opacity = 0.07 + depth * 0.18;
          const size = 0.6 + depth * 0.9;
          ctx.beginPath();
          ctx.arc(x, y, size, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(180,180,180,${opacity})`;
          ctx.fill();
        }
      }

      ctx.beginPath();
      let eqStarted = false;
      for (let lng = -180; lng <= 180; lng += 3) {
        const { x, y, z } = toXY(0, lng, angle, r, cx, cy);
        if (z < 0) { eqStarted = false; continue; }
        if (!eqStarted) { ctx.moveTo(x, y); eqStarted = true; }
        else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = "rgba(255,107,0,0.08)";
      ctx.lineWidth = 0.8;
      ctx.stroke();

      const miami = cities[0];
      cities.slice(1).forEach(([lat, lng], i) => {
        const arc = arcs[i];
        if (elapsed < arc.delay) return;
        arc.progress = Math.min(1, arc.progress + 0.007);

        const steps = 50;
        const drawn = Math.floor(arc.progress * steps);
        ctx.beginPath();
        let pathStarted = false;
        for (let s = 0; s <= drawn; s++) {
          const frac = s / steps;
          const iLat = miami[0] + (lat - miami[0]) * frac;
          const iLng = miami[1] + (lng - miami[1]) * frac;
          const arcLift = Math.sin(frac * Math.PI) * r * 0.15;
          const { x, y, z } = toXY(iLat, iLng, angle, r, cx, cy);
          if (z < 0) { pathStarted = false; continue; }
          const adjY = y - arcLift * (z / r);
          if (!pathStarted) { ctx.moveTo(x, adjY); pathStarted = true; }
          else ctx.lineTo(x, adjY);
        }
        ctx.strokeStyle = `rgba(255,107,0,${0.15 + arc.progress * 0.35})`;
        ctx.lineWidth = 0.9;
        ctx.stroke();

        if (arc.progress > 0.98) {
          const { x, y, z } = toXY(lat, lng, angle, r, cx, cy);
          if (z > 0) {
            ctx.beginPath();
            ctx.arc(x, y, 2, 0, Math.PI * 2);
            ctx.fillStyle = "rgba(255,107,0,0.8)";
            ctx.fill();
          }
        }
      });

      const { x: mx, y: my, z: mz } = toXY(miami[0], miami[1], angle, r, cx, cy);
      if (mz > 0) {
        const pulse = (Math.sin(t * 0.003) + 1) / 2;
        ctx.beginPath();
        ctx.arc(mx, my, 5 + pulse * 9, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(255,107,0,${0.35 - pulse * 0.28})`;
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(mx, my, 3.5, 0, Math.PI * 2);
        ctx.fillStyle = "#ff6b00";
        ctx.fill();
        ctx.font = `bold ${Math.round(r * 0.038)}px monospace`;
        ctx.fillStyle = "rgba(255,107,0,0.85)";
        ctx.fillText("MIAMI", mx + 9, my - 5);
      }

      rafRef.current = requestAnimationFrame(draw);
    }

    rafRef.current = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return <canvas ref={canvasRef} className="h-full w-full block" />;
}

function SectionLabel({ children, center }: { children: React.ReactNode; center?: boolean }) {
  return (
    <div className={`mb-5 flex items-center gap-3 font-mono text-xs tracking-[0.3em] text-[#ff6b00] ${center ? "justify-center" : ""}`}>
      <span className="h-px w-6 bg-[#ff6b00]" />
      {children}
      {center && <span className="h-px w-6 bg-[#ff6b00]" />}
    </div>
  );
}

function StatCard({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-sm border border-white/[0.07] bg-white/[0.02] p-6">
      <div className="mb-1 font-mono text-3xl font-semibold text-[#ff6b00]">{value}</div>
      <div className="text-sm leading-relaxed text-white/50">{label}</div>
    </div>
  );
}

function Step({ n, title, body }: { n: string; title: string; body: string }) {
  return (
    <div className="flex gap-5">
      <div className="w-5 shrink-0 pt-0.5 font-mono text-xs text-[#ff6b00]/40">{n}</div>
      <div>
        <div className="mb-1 text-sm font-medium text-white">{title}</div>
        <div className="text-sm leading-relaxed text-white/50">{body}</div>
      </div>
    </div>
  );
}

export default function LandingPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ container: containerRef });
  const globeOpacity = useTransform(scrollYProgress, [0, 0.15], [1, 0]);
  const globeScale = useTransform(scrollYProgress, [0, 0.15], [1, 0.94]);

  return (
    <div
      ref={containerRef}
      className="h-screen overflow-y-scroll bg-black text-white"
      style={{ scrollSnapType: "y proximity" }}
    >
      {/* HERO */}
      <section className="relative flex min-h-screen flex-col" style={{ scrollSnapAlign: "start" }}>
        <motion.div style={{ opacity: globeOpacity, scale: globeScale }} className="absolute inset-0 pointer-events-none">
          <Globe />
        </motion.div>
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-black to-transparent" />

        <div className="relative z-10 flex items-center justify-between px-8 pt-7">
          <span className="font-mono text-xs tracking-[0.3em] text-white/40">ARIA</span>
          <span className="font-mono text-xs tracking-[0.2em] text-white/25">PRE-INCIDENT INTELLIGENCE</span>
        </div>

        <div className="relative z-10 mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center px-8 md:px-16">
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <SectionLabel>BUILT FOR FIRST RESPONDERS</SectionLabel>
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.1 }}
            className="max-w-4xl text-balance text-5xl font-medium leading-[1.05] tracking-tight md:text-7xl"
          >
            Know the building{" "}
            <span className="text-white/40">before the truck arrives.</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.25 }}
            className="mt-7 max-w-xl text-lg leading-relaxed text-white/55"
          >
            Aria runs an AI agent against every building — Street View, FEMA flood zones, surge maps,
            nearby assets — and produces a 30-second size-up a battalion chief can act on.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.4 }}
            className="mt-10 flex items-center gap-6"
          >
            <Link href="/dashboard" className="group inline-flex items-center gap-3 rounded-sm bg-[#ff6b00] px-6 py-3 text-sm font-medium tracking-wide text-black transition-colors hover:bg-[#ff7f1f]">
              Open Dashboard
              <span aria-hidden className="transition-transform group-hover:translate-x-0.5">→</span>
            </Link>
            <button
              onClick={() => containerRef.current?.scrollBy({ top: window.innerHeight, behavior: "smooth" })}
              className="font-mono text-xs tracking-[0.2em] text-white/30 transition-colors hover:text-white/60"
            >
              LEARN MORE ↓
            </button>
          </motion.div>
        </div>

        <div className="relative z-10 flex justify-center pb-8">
          <motion.div
            animate={{ y: [0, 6, 0] }} transition={{ repeat: Infinity, duration: 2.2, ease: "easeInOut" }}
            className="font-mono text-[10px] tracking-[0.3em] text-white/20"
          >
            SCROLL
          </motion.div>
        </div>
      </section>

      {/* PROBLEM */}
      <section className="flex min-h-screen items-center px-8 py-24 md:px-16" style={{ scrollSnapAlign: "start" }}>
        <div className="mx-auto grid w-full max-w-5xl items-center gap-16 md:grid-cols-2">
          <div>
            <SectionLabel>THE PROBLEM</SectionLabel>
            <h2 className="mb-7 text-4xl font-medium leading-[1.1] tracking-tight md:text-5xl">
              Firefighters size up on the curb.
            </h2>
            <p className="mb-6 leading-relaxed text-white/50">
              When Hurricane Helene hit Florida in 2024, Miami-Dade Fire Rescue ran over{" "}
              <span className="text-white/80">3,000 calls in 72 hours</span>. For most buildings they
              responded to, they had zero pre-incident information — no structural data, no flood risk, nothing.
            </p>
            <p className="leading-relaxed text-white/50">
              Crews get <span className="text-white/80">60 seconds</span> to size up an unfamiliar structure
              while lives are on the line. That's the problem Aria solves — before the tone drops.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <StatCard value="3,000+" label="calls in 72 hrs during Hurricane Helene" />
            <StatCard value="~0" label="buildings with pre-incident plans in Miami-Dade" />
            <StatCard value="60s" label="average on-scene size-up window" />
            <StatCard value="30s" label="Aria's size-up, ready before dispatch" />
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="flex min-h-screen items-center px-8 py-24 md:px-16" style={{ scrollSnapAlign: "start" }}>
        <div className="mx-auto grid w-full max-w-5xl items-center gap-16 md:grid-cols-2">
          <div className="space-y-8">
            <Step n="01" title="Scan the building" body="Capture a LiDAR scan and photos with a phone. Polycam exports a USDZ mesh and walkthrough in minutes." />
            <div className="h-px bg-white/[0.06]" />
            <Step n="02" title="Agent synthesizes the intel" body="Claude runs a multi-step tool-use loop — Street View, FEMA flood zones, NOAA surge data, nearby infrastructure — and produces a structured report." />
            <div className="h-px bg-white/[0.06]" />
            <Step n="03" title="Chief gets the size-up" body="Headline risk, immediate actions, and a scenario slider showing the building under Cat 1, 3, or 5 conditions — photorealistically." />
            <div className="h-px bg-white/[0.06]" />
            <Step n="04" title="Cache it. Always ready." body="Reports are stored and replayed instantly. No live API call at dispatch — demo-reliable, field-reliable." />
          </div>
          <div>
            <SectionLabel>HOW IT WORKS</SectionLabel>
            <h2 className="mb-7 text-4xl font-medium leading-[1.1] tracking-tight md:text-5xl">
              Scan once.{" "}
              <span className="text-white/40">Pre-plan every call.</span>
            </h2>
            <p className="leading-relaxed text-white/50">
              The same pattern used for AI-driven drone inspection — agent over visual + geospatial
              data — applied to building risk for the people who run toward the fire.
            </p>
            <Link href="/dashboard" className="group mt-8 inline-flex items-center gap-2 font-mono text-sm tracking-[0.15em] text-[#ff6b00] transition-colors hover:text-[#ff7f1f]">
              SEE THE DEMO →
            </Link>
          </div>
        </div>
      </section>

      {/* MARKET + USE CASE */}
      <section className="flex min-h-screen items-center px-8 py-24 md:px-16" style={{ scrollSnapAlign: "start" }}>
        <div className="mx-auto w-full max-w-5xl">
          <SectionLabel>MARKET + USE CASE</SectionLabel>
          <h2 className="mb-4 max-w-2xl text-4xl font-medium leading-[1.1] tracking-tight md:text-5xl">
            Every building in every city.
          </h2>
          <p className="mb-14 max-w-xl leading-relaxed text-white/50">
            Miami-Dade is the wedge. The architecture scales to any city, any building type, any risk profile.
          </p>
          <div className="mb-14 grid gap-6 md:grid-cols-3">
            <StatCard value="30,000+" label="fire departments in the United States" />
            <StatCard value="130M+" label="buildings in the US addressable by this system" />
            <StatCard value="700k+" label="structures in Miami-Dade County alone" />
          </div>
          <div className="grid gap-8 border-t border-white/[0.06] pt-12 md:grid-cols-3">
            <div>
              <div className="mb-3 font-mono text-xs tracking-[0.25em] text-[#ff6b00]">FIRE &amp; RESCUE</div>
              <p className="text-sm leading-relaxed text-white/50">
                Battalion chiefs get a structured size-up before the truck leaves the station.
                Immediate actions are pre-generated and dispatchable from the app.
              </p>
            </div>
            <div>
              <div className="mb-3 font-mono text-xs tracking-[0.25em] text-[#ff6b00]">EMERGENCY MANAGEMENT</div>
              <p className="text-sm leading-relaxed text-white/50">
                Pre-plan entire neighborhoods before hurricane season. Drag the scenario slider to
                see exactly what 6 ft of surge looks like inside a specific building.
              </p>
            </div>
            <div>
              <div className="mb-3 font-mono text-xs tracking-[0.25em] text-[#ff6b00]">BEYOND FIRE</div>
              <p className="text-sm leading-relaxed text-white/50">
                Insurance underwriting, CRE due diligence, urban search &amp; rescue. Aria is a
                structured-intel agent platform — fire response is the wedge.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="flex min-h-[60vh] items-center justify-center px-8 text-center" style={{ scrollSnapAlign: "start" }}>
        <div>
          <SectionLabel center>DEMO LIVE NOW</SectionLabel>
          <h2 className="mx-auto mb-8 max-w-2xl text-5xl font-medium leading-[1.05] tracking-tight md:text-6xl">
            See it run on a real building.
          </h2>
          <Link href="/dashboard" className="group inline-flex items-center gap-3 rounded-sm bg-[#ff6b00] px-8 py-4 text-sm font-medium tracking-wide text-black transition-colors hover:bg-[#ff7f1f]">
            Open Dashboard
            <span aria-hidden className="transition-transform group-hover:translate-x-0.5">→</span>
          </Link>
          <p className="mt-6 font-mono text-xs tracking-[0.2em] text-white/25">
            400 NW 26TH ST · MIAMI, FL · LIVE AGENT REPLAY
          </p>
        </div>
      </section>
    </div>
  );
}
