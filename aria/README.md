# Aria

**Pre-incident world models for first responders.** An AI agent synthesizes building intel — Street View, FEMA flood zones, Miami-Dade surge zones, nearby assets — into a structured size-up that a battalion chief can read in 30 seconds, before the truck arrives.

## Why

When Hurricane Helene hit Florida in 2024, Miami-Dade Fire Rescue ran over 3,000 calls in 72 hours. For most of the buildings they responded to, they had zero pre-incident information — no structural data, no hazard map, nothing. Firefighters size up on the curb in 60 seconds while lives are on the line. Aria gives them that intel before they leave the station.

## What it does

The demo is end-to-end:

1. **Dashboard** — 3D Mapbox of Miami, demo buildings highlighted with a pulsing orange dot, click one.
2. **Building page** — three columns:
   - **Left** · live agent log streaming the tool-use loop (`thinking` → `tool_call` → `tool_result` → `reasoning` → `complete`) over SSE.
   - **Center** · tabbed view: a Three.js render of a USDZ LiDAR scan (captured with a phone), or a click-through walkthrough of real photos of the building with annotations locked to image coordinates.
   - **Right** · structured pre-incident report — headline risk, 30-second size-up, dynamically-generated immediate actions you can "dispatch", building profile, and a per-hazard breakdown (wind / surge / flood).
3. **Run the agent** — Claude Sonnet 4.5 picks tools, evaluates results, sometimes re-fetches with different parameters, and produces a strict-schema JSON report. The agent's `hazards.*.annotations_3d` are then distributed across walkthrough viewpoints.
4. **Drag the scenario slider** — the walkthrough photo crossfades to a photorealistic Gemini-generated variant (1 ft, 3 ft, 6 ft, 10 ft of storm surge; Cat 1/3/5 wind aftermath for exteriors). 170 variants pre-baked offline.

That last part is the wow moment: same room, draggable through a hurricane.

## Stack

- **Frontend** — Next.js 16 (App Router, RSC), TypeScript strict, Tailwind v4, framer-motion, Mapbox GL JS, Three.js + USDZLoader, react-zoom-pan-pinch, lucide-react, Supabase JS. Package manager: pnpm.
- **Backend** — Python 3.12, FastAPI, Anthropic SDK (Claude Sonnet 4.5 with tool use), Google Gen AI SDK (Gemini 2.5 Flash Image), Supabase, python-dotenv. Package manager: uv.
- **Data** — Supabase Postgres (`buildings`, `preplans`, `tool_calls`). FEMA NFHL + Miami-Dade Open Data as live sources for geospatial tools (with demo-address fallbacks).
- **Assets** — Polycam LiDAR USDZ + iPhone photos per building. Hazard variants pre-generated via `apps/api/scripts/generate_variants.py`.

## Screenshots

Demo screenshots and run videos live in [`docs/screenshots/`](docs/screenshots).

## Getting started

```bash
# Clone + install
git clone <this-repo> && cd aria
cd apps/web && pnpm install && cd -    # frontend deps
cd apps/api && uv sync && cd -         # backend deps

# Env (one file per app — see .env.example in each)
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
# Fill in: ANTHROPIC_API_KEY, GEMINI_API_KEY, SUPABASE_*, MAPBOX_TOKEN, GOOGLE_MAPS_API_KEY

# Run both servers (frontend + agent backend) in one terminal
cd apps/web && pnpm dev:all
```

Then open <http://localhost:3000>. Click **Open Dashboard** → click a highlighted building → click **RUN PRE-PLAN AGENT** in the right column. The agent run takes ~60–90 seconds.

## Repo layout

```
aria/
├── apps/
│   ├── api/                    # FastAPI agent backend (Python)
│   │   ├── aria/
│   │   │   ├── agent/          # System prompt, agent loop, SSE event helpers
│   │   │   ├── tools/          # Tool definitions + executors
│   │   │   ├── routes/         # FastAPI routers (POST /agent/run)
│   │   │   └── main.py
│   │   └── scripts/
│   │       └── generate_variants.py  # Pre-generate Gemini surge/wind variants
│   └── web/                    # Next.js frontend (TypeScript)
│       ├── app/                # Routes: /, /dashboard, /building/[id]
│       ├── components/
│       │   ├── agent/          # AgentLog, AgentRunProvider, useAgentStream
│       │   ├── scan/           # BuildingScan (Three.js USDZ)
│       │   ├── walkthrough/    # WalkthroughViewer, ScenarioStrip, variants logic
│       │   └── report/         # PreplanReport, FullscreenReport, actions generator
│       ├── lib/                # Shared types, Supabase clients, design tokens
│       ├── public/scans/       # Photos + USDZ + Gemini variants
│       └── tests/e2e/          # Playwright smoke specs
├── infra/
│   └── supabase/migrations/    # SQL migrations (buildings, preplans, tool_calls)
└── docs/
    ├── ARCHITECTURE1.md        # System architecture
    ├── AGENT_DESIGN.md         # Agent loop spec
    ├── BUILD_PLAN.md           # Hackathon build order
    └── PITCH.md                # 90-second pitch script
```

## Architecture rules

The agent is the soul of the product. It runs a real multi-iteration loop (Claude decides what to call, not us), streams every step to the frontend via SSE, and outputs a strict-schema JSON report. We didn't weaken this into a static pipeline.

Tools are pluggable — each is a JSON-schema entry in `aria/tools/registry.py` plus an async implementation in `executors.py`. The frontend never calls Anthropic directly; everything is proxied through FastAPI so we can stream the live tool-use log.

For deeper detail see [`docs/AGENT_DESIGN.md`](docs/AGENT_DESIGN.md) and [`docs/ARCHITECTURE1.md`](docs/ARCHITECTURE1.md).

## Built by

Lincoln Bazail — solo build for the Young Coders Impact Hackathon, Miami, **May 17 2026**. Strategic AI pair programming via Claude Code; every architectural decision and the agent loop itself were authored, not generated wholesale.

Day-job context: Lincoln works at Detect, a Miami AI company that runs VLM pipelines on drone imagery for utility-infrastructure inspection. Aria applies the same pattern — agent over visual + geospatial data — to building risk for first responders.
