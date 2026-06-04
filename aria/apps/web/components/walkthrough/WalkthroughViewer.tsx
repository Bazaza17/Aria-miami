"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  TransformComponent,
  TransformWrapper,
  type ReactZoomPanPinchRef,
} from "react-zoom-pan-pinch";

import { useAgentRun } from "@/components/agent/AgentRunProvider";
import type { PreplanReport, RiskScore } from "@/lib/types";
import {
  WALKTHROUGHS,
  type Annotation,
  type Viewpoint,
} from "@/lib/walkthrough-data";

import { ScenarioStrip } from "./ScenarioStrip";
import {
  allVariantsFor,
  resolveVariant,
  type SurgeValue,
  type WindValue,
} from "./variants";

type Dir = "forward" | "back" | "left" | "right";

const ARROW_GLYPH: Record<Dir, string> = {
  forward: "↑",
  back: "↓",
  left: "←",
  right: "→",
};

const KEY_TO_DIR: Record<string, Dir> = {
  ArrowUp: "forward",
  ArrowDown: "back",
  ArrowLeft: "left",
  ArrowRight: "right",
};

export function WalkthroughViewer({ buildingId }: { buildingId: string }) {
  const walkthrough = WALKTHROUGHS[buildingId];

  if (!walkthrough) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-[#0a0a0a]">
        <div className="font-mono text-[11px] tracking-[0.3em] text-white/40">
          NO WALKTHROUGH DATA · BUILDING NOT YET INDEXED
        </div>
      </div>
    );
  }

  return <Viewer walkthrough={walkthrough} />;
}

function Viewer({
  walkthrough,
}: {
  walkthrough: NonNullable<ReturnType<typeof getWalkthrough>>;
}) {
  const viewpoints = walkthrough.viewpoints;
  const viewpointList = useMemo(() => Object.values(viewpoints), [viewpoints]);
  const [currentId, setCurrentId] = useState(walkthrough.start_viewpoint);
  const [isPanning, setIsPanning] = useState(false);
  const transformRef = useRef<ReactZoomPanPinchRef | null>(null);

  // Scenario state lives at the viewer level so it persists across viewpoints.
  const [surge, setSurge] = useState<SurgeValue>(0);
  const [wind, setWind] = useState<WindValue>(0);
  // URLs that 404'd at runtime; resolveVariant falls back to the original.
  const [failedSet, setFailedSet] = useState<ReadonlySet<string>>(new Set());

  // Pull the agent's hazard anchors (annotations_3d) from context and spread
  // them across viewpoints. Fall back to the hardcoded placeholders before the
  // agent has run.
  const { report } = useAgentRun();
  const agentAnnotations = useMemo(
    () =>
      report
        ? distributeAgentAnnotations(
            report,
            viewpointList.map((v) => v.id),
          )
        : null,
    [report, viewpointList],
  );

  const current = viewpoints[currentId] ?? viewpointList[0];
  const index = viewpointList.findIndex((v) => v.id === current.id);
  const annotationsToShow =
    agentAnnotations?.[current.id] ?? current.annotations;

  const desiredSrc = useMemo(
    () => resolveVariant(current.image, surge, wind, failedSet),
    [current.image, surge, wind, failedSet],
  );

  // Two crossfade layers — one currently visible ("front") and one fading
  // out ("back"). Whenever the desired src changes (viewpoint OR scenario),
  // we load it into the back layer, then flip which is on top.
  const [front, setFront] = useState<"a" | "b">("a");
  const [srcA, setSrcA] = useState<string>(desiredSrc);
  const [srcB, setSrcB] = useState<string>("");

  useEffect(() => {
    if (desiredSrc === (front === "a" ? srcA : srcB)) return;
    if (front === "a") setSrcB(desiredSrc);
    else setSrcA(desiredSrc);
    setFront(front === "a" ? "b" : "a");
    // We intentionally only depend on desiredSrc — toggling front itself
    // would re-fire the effect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [desiredSrc]);

  const onImgError = (url: string) => {
    setFailedSet((prev) => {
      if (prev.has(url)) return prev;
      const next = new Set(prev);
      next.add(url);
      return next;
    });
  };

  // Preload every variant we might want to show for this building so slider
  // drags swap instantly. Browser caches the responses; missing/known-bad
  // URLs (e.g. view_hallmove5_surge_1ft) are filtered out by allVariantsFor.
  useEffect(() => {
    const urls = new Set<string>();
    for (const vp of viewpointList) {
      urls.add(vp.image);
      for (const u of allVariantsFor(vp.image)) urls.add(u);
    }
    urls.forEach((u) => {
      const img = new Image();
      img.src = u;
    });
  }, [viewpointList]);

  const navigate = useCallback(
    (dir: Dir) => {
      const destId = current.navigation[dir];
      if (destId && viewpoints[destId]) {
        // Drop zoom/pan instantly so the next viewpoint starts at its default
        // framing — the crossfade still plays from there.
        transformRef.current?.resetTransform(0);
        setCurrentId(destId);
      }
    },
    [current, viewpoints],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const dir = KEY_TO_DIR[e.key];
      if (!dir) return;
      e.preventDefault();
      navigate(dir);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [navigate]);

  return (
    <div className="flex h-full w-full flex-col bg-black ring-1 ring-white/[0.06]">
      <div className="relative min-h-0 flex-1 overflow-hidden">
        <TransformWrapper
          ref={transformRef}
          initialScale={1}
          minScale={1}
          maxScale={3}
          wheel={{ step: 0.2 }}
          doubleClick={{ step: 0.7 }}
          panning={{ velocityDisabled: true }}
          limitToBounds
          onPanningStart={() => setIsPanning(true)}
          onPanningStop={() => setIsPanning(false)}
        >
          <TransformComponent
            wrapperStyle={{
              width: "100%",
              height: "100%",
              cursor: isPanning ? "grabbing" : "grab",
            }}
            contentStyle={{ width: "100%", height: "100%" }}
          >
            <div className="relative h-full w-full">
              {/* Two layered images crossfade between viewpoints AND between
                  variants of the same viewpoint. ~250ms transition. */}
              {srcA && (
                <img
                  key={`a-${srcA}`}
                  src={srcA}
                  alt={current.label}
                  loading="eager"
                  decoding="async"
                  onError={() => onImgError(srcA)}
                  className={
                    "absolute inset-0 h-full w-full select-none object-cover transition-opacity duration-[250ms] ease-out " +
                    (front === "a" ? "opacity-100" : "opacity-0")
                  }
                  draggable={false}
                />
              )}
              {srcB && (
                <img
                  key={`b-${srcB}`}
                  src={srcB}
                  alt={current.label}
                  loading="eager"
                  decoding="async"
                  onError={() => onImgError(srcB)}
                  className={
                    "absolute inset-0 h-full w-full select-none object-cover transition-opacity duration-[250ms] ease-out " +
                    (front === "b" ? "opacity-100" : "opacity-0")
                  }
                  draggable={false}
                />
              )}

              {/* Annotations are inside the transform so they pan/zoom with
                  the image at their percent-of-image positions, and remain
                  visible across variant swaps. */}
              {annotationsToShow.map((a, i) => (
                <AnnotationMarker key={`${current.id}-${i}`} a={a} />
              ))}
            </div>
          </TransformComponent>
        </TransformWrapper>

      {/* Subtle vignette — keeps annotations readable over busy photos */}
      <div
        className="pointer-events-none absolute inset-0 z-[5]"
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(0,0,0,0) 50%, rgba(0,0,0,0.30) 100%)",
        }}
      />

      {/* Top-left label */}
      <div className="pointer-events-none absolute left-4 top-4 z-20 inline-flex items-center gap-2 rounded-md border border-white/[0.08] bg-black/85 px-3 py-1.5 font-mono text-[11px] tracking-[0.3em] text-white/90 backdrop-blur-md shadow-[0_4px_18px_-4px_rgba(0,0,0,0.7)]">
        <span className="h-1 w-1 bg-[#ff6b00]" />
        {current.label}
      </div>

      {/* Bottom-right counter */}
      <div className="pointer-events-none absolute bottom-4 right-4 z-20 rounded-md border border-white/[0.08] bg-black/85 px-3 py-1.5 font-mono text-[10px] tracking-[0.25em] text-white/65 backdrop-blur-md">
        VIEWPOINT {String(index + 1).padStart(2, "0")} / {String(viewpointList.length).padStart(2, "0")}
      </div>

      {/* Navigation arrows */}
      {(["forward", "back", "left", "right"] as const).map((dir) => {
        const destId = current.navigation[dir];
        const dest = destId ? viewpoints[destId] : undefined;
        if (!dest) return null;
        return (
          <NavArrow
            key={dir}
            dir={dir}
            dest={dest}
            onClick={() => navigate(dir)}
          />
        );
      })}
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

function getWalkthrough(id: string) {
  return WALKTHROUGHS[id];
}

// ---------- Annotation marker ----------

// Six preset positions cycled through when the agent's hazard anchors are
// distributed across viewpoints. Positions are chosen so labels generally
// don't overlap the top/bottom UI chrome.
const ANNOTATION_POSITIONS: Array<{ x: number; y: number }> = [
  { x: 30, y: 28 },
  { x: 70, y: 25 },
  { x: 50, y: 52 },
  { x: 75, y: 62 },
  { x: 30, y: 65 },
  { x: 55, y: 80 },
];

function distributeAgentAnnotations(
  report: PreplanReport,
  viewpointIds: string[],
): Record<string, Annotation[]> {
  const out: Record<string, Annotation[]> = {};
  viewpointIds.forEach((id) => {
    out[id] = [];
  });
  const all = [
    ...report.hazards.wind.annotations_3d,
    ...report.hazards.surge.annotations_3d,
    ...report.hazards.flood.annotations_3d,
  ];
  all.forEach((a, i) => {
    const vpId = viewpointIds[i % viewpointIds.length];
    const bucket = out[vpId];
    const pos = ANNOTATION_POSITIONS[bucket.length % ANNOTATION_POSITIONS.length];
    bucket.push({
      label: a.label.toUpperCase(),
      severity: a.severity,
      x_percent: pos.x,
      y_percent: pos.y,
    });
  });
  return out;
}

const SEV_DOT: Record<RiskScore, string> = {
  LOW: "bg-white/70 ring-white/30",
  MODERATE: "bg-amber-400 ring-amber-400/40",
  HIGH: "bg-[#ff6b00] ring-[#ff6b00]/40",
  SEVERE: "bg-red-500 ring-red-500/50",
};

const SEV_TEXT: Record<RiskScore, string> = {
  LOW: "text-white/70 border-white/[0.08]",
  MODERATE: "text-amber-200 border-amber-400/30",
  HIGH: "text-[#ffb27a] border-[#ff6b00]/40",
  SEVERE: "text-red-300 border-red-500/40",
};

function AnnotationMarker({ a }: { a: Annotation }) {
  const isSevere = a.severity === "SEVERE";
  const label = a.label.length > 36 ? a.label.slice(0, 35) + "…" : a.label;
  return (
    <div
      className="absolute z-10 flex items-center gap-1.5"
      style={{
        left: `${a.x_percent}%`,
        top: `${a.y_percent}%`,
        transform: "translate(-50%, -50%)",
      }}
    >
      <span
        className={
          "inline-block h-1.5 w-1.5 rotate-45 ring-1 " +
          SEV_DOT[a.severity] +
          (isSevere ? " animate-pulse" : "")
        }
      />
      <span
        className={
          "max-w-[280px] truncate rounded-sm border bg-black/85 px-1.5 py-0.5 font-mono text-[10px] tracking-[0.12em] backdrop-blur-sm " +
          SEV_TEXT[a.severity]
        }
        title={a.label}
      >
        {label}
      </span>
    </div>
  );
}

// ---------- Navigation arrow ----------

const ARROW_POS: Record<Dir, string> = {
  forward: "top-4 left-1/2 -translate-x-1/2 flex-row",
  back: "bottom-4 left-1/2 -translate-x-1/2 flex-row-reverse",
  left: "left-4 top-1/2 -translate-y-1/2 flex-col-reverse",
  right: "right-4 top-1/2 -translate-y-1/2 flex-col",
};

function NavArrow({
  dir,
  dest,
  onClick,
}: {
  dir: Dir;
  dest: Viewpoint;
  onClick: () => void;
}) {
  const isVertical = dir === "left" || dir === "right";
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Navigate ${dir} to ${dest.label}`}
      className={
        "group/nav absolute z-20 flex items-center gap-1.5 rounded-md border border-white/[0.08] bg-black/45 px-2 py-1.5 backdrop-blur-sm transition-all hover:border-[#ff6b00]/60 hover:bg-black/85 hover:shadow-[0_0_22px_-4px_rgba(255,107,0,0.7)] " +
        ARROW_POS[dir]
      }
    >
      <span className="font-mono text-sm leading-none text-white/65 group-hover/nav:text-[#ff6b00]">
        {ARROW_GLYPH[dir]}
      </span>
      <span
        className={
          "font-mono text-[9px] tracking-[0.25em] text-white/50 group-hover/nav:text-white " +
          (isVertical ? "[writing-mode:vertical-rl] rotate-180" : "")
        }
      >
        {dest.label}
      </span>
    </button>
  );
}
