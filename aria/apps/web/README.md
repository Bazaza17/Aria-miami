# @aria/web

Frontend for [Aria](../../README.md) — the dashboard, building page, agent log, walkthrough viewer with scenario slider, 3D scan viewer, and pre-incident report panel.

## Stack

- **Next.js 16** (App Router, React Server Components, Turbopack)
- **TypeScript strict**, no `any`
- **Tailwind CSS v4** (CSS-first config, no `tailwind.config.ts`)
- **framer-motion** for the cinematic landing fade-in
- **Mapbox GL JS** for the 3D dashboard
- **Three.js** + `USDZLoader` + `OrbitControls` for in-browser USDZ rendering
- **react-zoom-pan-pinch** for the walkthrough viewer
- **lucide-react** for icons
- **@supabase/supabase-js** for buildings / preplans / tool_calls

The frontend never calls Anthropic or Gemini directly. All agent traffic flows through the FastAPI backend so the live tool-use log can stream as SSE.

## Folder structure

```
apps/web/
├── app/
│   ├── page.tsx                      # / — cinematic landing
│   ├── dashboard/                    # /dashboard — 3D Mapbox + activity panel
│   ├── building/[id]/                # /building/:id — three-column workbench
│   ├── globals.css                   # design tokens + slider styles + fade keyframes
│   └── layout.tsx
├── components/
│   ├── agent/
│   │   ├── useAgentStream.ts         # POST /agent/run, parse SSE off the body stream
│   │   ├── AgentRunProvider.tsx      # Context: events, report, running, elapsedMs, run()
│   │   ├── AgentLog.tsx              # Cinematic terminal renderer
│   │   └── AgentLogPane.tsx          # Thin pane wrapper
│   ├── scan/
│   │   └── BuildingScan.tsx          # Three.js USDZ viewer + metadata overlay
│   ├── walkthrough/
│   │   ├── BuildingCenterPane.tsx    # Tabs: 3D SCAN ↔ WALKTHROUGH (crossfade)
│   │   ├── WalkthroughViewer.tsx     # Photo nav, pan/zoom, annotations, variant crossfade
│   │   ├── ScenarioStrip.tsx         # Surge + wind sliders, risk badges, scenario label
│   │   └── variants.ts               # Variant URL math + severity + scenario labels
│   └── report/
│       ├── PreplanReport.tsx         # Right-column panel + actions + fullscreen toggle
│       ├── FullscreenReport.tsx      # "Give this to the chief" overlay
│       └── actions.ts                # Generate immediate-action cards from agent output
├── lib/
│   ├── types.ts                      # Shared types — mirrors the Pydantic schema
│   ├── supabase.ts                   # Server + browser Supabase client helpers
│   ├── walkthrough-data.ts           # Hardcoded viewpoint sequences per building
│   ├── time.ts                       # formatRelative()
│   └── design.ts                     # Color tokens
├── public/scans/
│   ├── building_a/{scan.usdz, photos/, photos/variants/}
│   └── building_b/{scan.usdz, photos/, photos/variants/}
├── tests/e2e/                        # Playwright specs
├── types/model-viewer.d.ts           # JSX declaration (kept for future use)
└── playwright.config.ts
```

## Key components

- **`MapDashboard`** — Mapbox GL on the `/dashboard` route. Dark v11 style at pitch 60°, custom `building-extrusion` fill-extrusion layer (the style's built-in `building` layer is `type: fill`, we hide it and add our own), pulsing-circle GeoJSON source for the primary venue, plus smaller dots for other demo buildings. Click handler proximity-matches the click against `buildings`, opens a popover with `VIEW BUILDING` routing.
- **`BuildingCenterPane`** — owns the `tab: "scan" | "walkthrough"` state; renders both children layered with opacity-driven crossfade so state survives tab toggles.
- **`WalkthroughViewer`** — two-layer A/B crossfade architecture handles viewpoint changes AND variant changes uniformly. Annotations are children of the `TransformComponent` so they pan/zoom with the image. Annotation set comes from the agent's `hazards.*.annotations_3d` once available, with fallback to hardcoded placeholders.
- **`BuildingScan`** — Three.js scene with `USDZLoader`, `OrbitControls`, auto-rotate until first interaction. Camera distance derived from the model's bounding box for a tight cinematic 3/4 framing. Real vertex count is computed from the loaded geometry and shown in the metadata overlay.
- **`AgentLog`** — reads SSE events from `useAgentStream` via `AgentRunProvider` context. Reasoning events run through `stripReportBlock()` to drop the final ` ```json ``` ` dump (the report panel renders that as structured cards). Footer collapses to `✓ AGENT COMPLETE · N TOOLS · N ITERATIONS · Xs` on completion.
- **`PreplanReport`** — `HEADLINE RISK` hero text → `IMMEDIATE ACTIONS` (generated from agent output, sortable by severity, click-to-dispatch with timestamp) → `BUILDING PROFILE` → three hazard cards. `Maximize2` icon opens a fullscreen modal with dramatic typography for the "give this to the chief" view.

## Environment variables

`.env.local` (see `.env.example`):

```
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
NEXT_PUBLIC_MAPBOX_TOKEN=pk....
```

Backend keys (Anthropic, Gemini, Supabase service role) live in `apps/api/.env`. The frontend never sees them.

## Dev

```bash
pnpm install            # first time only
pnpm dev                # frontend only on :3000
pnpm dev:all            # frontend + backend (concurrently)
pnpm build              # production build
pnpm exec playwright test   # e2e
```

## Notes

- **React strict mode is intentionally disabled** in `next.config.ts` because Mapbox GL's tile worker conflicts with strict mode's double-effect-invocation under React 19, leaving the remounted instance without tiles. Re-enable when mapbox-gl ships a fix.
- **Three.js imports are top-level**, not lazy. Turbopack 16 chokes on dynamic chunks under `three/examples/jsm/*` when its dev cache goes stale. The tradeoff is ~150 KB extra in the initial `/building/[id]` bundle.
