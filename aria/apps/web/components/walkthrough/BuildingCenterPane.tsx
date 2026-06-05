"use client";

import { useState } from "react";

import { BuildingScan } from "@/components/scan/BuildingScan";
import { ScenarioStrip } from "@/components/walkthrough/ScenarioStrip";
import { ScenarioProvider, useScenario } from "@/components/walkthrough/ScenarioProvider";
import { WalkthroughViewer } from "@/components/walkthrough/WalkthroughViewer";
import { WALKTHROUGHS } from "@/lib/walkthrough-data";

type Tab = "scan" | "walkthrough";

export function BuildingCenterPane({
  buildingId,
  scanUrl,
}: {
  buildingId: string;
  scanUrl?: string | null;
}) {
  return (
    <ScenarioProvider>
      <BuildingCenterPaneInner buildingId={buildingId} scanUrl={scanUrl} />
    </ScenarioProvider>
  );
}

function BuildingCenterPaneInner({
  buildingId,
  scanUrl,
}: {
  buildingId: string;
  scanUrl?: string | null;
}) {
  const [tab, setTab] = useState<Tab>("scan");
  const walk = WALKTHROUGHS[buildingId];
  const viewpointCount = walk ? Object.keys(walk.viewpoints).length : 0;
  const { surge, wind, setSurge, setWind } = useScenario();

  return (
    <div className="flex h-full min-h-0 flex-col bg-[#0a0a0a]">
      <div className="flex items-center gap-6 border-b border-white/[0.08] px-5">
        <TabButton
          label="3D SCAN"
          active={tab === "scan"}
          onClick={() => setTab("scan")}
          indicator={<PulsingDot />}
        />
        <TabButton
          label="WALKTHROUGH"
          active={tab === "walkthrough"}
          onClick={() => setTab("walkthrough")}
          indicator={<CounterBadge n={viewpointCount} />}
        />
      </div>

      <div className="relative min-h-0 flex-1">
        <TabPanel active={tab === "scan"}>
          <BuildingScan buildingId={buildingId} scanUrl={scanUrl} />
        </TabPanel>
        <TabPanel active={tab === "walkthrough"}>
          <WalkthroughViewer buildingId={buildingId} />
        </TabPanel>
      </div>

      <ScenarioStrip
        surge={surge}
        wind={wind}
        onSurgeChange={setSurge}
        onWindChange={setWind}
      />
    </div>
  );
}

function TabButton({
  label,
  active,
  onClick,
  indicator,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  indicator: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        "relative -mb-px flex items-center gap-2 px-1 py-2.5 font-mono text-[11px] tracking-[0.3em] transition-colors " +
        (active
          ? "text-[#ff6b00]"
          : "text-[#ff6b00]/40 hover:text-[#ff6b00]/70")
      }
      aria-pressed={active}
    >
      {active ? indicator : null}
      {label}
      {active && (
        <span className="absolute inset-x-0 bottom-0 h-0.5 bg-[#ff6b00]" />
      )}
    </button>
  );
}

function PulsingDot() {
  return (
    <span className="relative inline-flex h-1.5 w-1.5">
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#ff6b00] opacity-60" />
      <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#ff6b00]" />
    </span>
  );
}

function CounterBadge({ n }: { n: number }) {
  return (
    <span className="rounded-sm bg-[#ff6b00]/15 px-1.5 py-0.5 font-mono text-[9px] tracking-[0.1em] text-[#ff6b00]">
      {String(n).padStart(2, "0")}
    </span>
  );
}

function TabPanel({
  active,
  children,
}: {
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={
        "absolute inset-0 transition-opacity duration-200 ease-out " +
        (active ? "opacity-100" : "pointer-events-none opacity-0")
      }
      aria-hidden={!active}
    >
      {children}
    </div>
  );
}
