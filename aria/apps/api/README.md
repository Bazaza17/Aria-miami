# @aria/api

FastAPI backend for [Aria](../../README.md). Hosts the agent loop, streams every step to the frontend as SSE, and pre-generates Gemini hazard variants for the walkthrough.

## Stack

- **Python 3.12**, **FastAPI**, **uvicorn[standard]**
- **anthropic** ≥ 0.102 — Claude Sonnet 4.5 with tool use
- **google-genai** — Gemini 2.5 Flash Image, for the offline variant generator
- **httpx** — async HTTP for tool implementations
- **supabase** — Postgres client
- **pydantic** v2 — all structured I/O, including the `PreplanReport` schema
- **python-dotenv** — loads `apps/api/.env`
- Package manager: **uv**

## Folder structure

```
apps/api/
├── aria/
│   ├── main.py               # FastAPI app, CORS, dotenv load, router mount
│   ├── agent/
│   │   ├── prompts.py        # SYSTEM_PROMPT + Pydantic schema for PreplanReport
│   │   ├── loop.py           # Multi-iteration tool-use loop
│   │   └── streaming.py      # SSE event helpers (thinking/reasoning/tool_*/complete/error)
│   ├── tools/
│   │   ├── registry.py       # ToolParam definitions for Anthropic
│   │   └── executors.py      # Async tool implementations (stubs for the demo)
│   └── routes/
│       └── agent.py          # POST /agent/run — StreamingResponse(text/event-stream)
├── scripts/
│   └── generate_variants.py  # Run-once Gemini variant generator
├── dev.sh                    # uv run uvicorn aria.main:app --reload
├── pyproject.toml
└── uv.lock
```

## Agent architecture

The agent is the soul of the product. We didn't weaken it into a hardcoded pipeline — Claude actually decides what to call.

- **System prompt** (`aria/agent/prompts.py`) tells Claude what it is, what to gather (Street View N/E/S/W minimum, a top-down, flood + surge zones, at least one nearby asset query, per-hazard analysis), how to reason out loud between tool calls, and embeds the **strict JSON output schema** inline so Claude can't improvise field names. Without that embedded schema, the model invents `executive_summary` and `hazard_wind` instead of `summary` and `hazards.wind`.
- **Loop** (`aria/agent/loop.py`) is the textbook tool-use pattern: append user message → `client.messages.create(model, tools, messages)` → for each `content` block stream a `reasoning` or `tool_call` event → if `stop_reason === "tool_use"` execute every tool call with `asyncio.gather` and append a `user` message with `tool_result` blocks, otherwise extract the ```json fence and emit `complete`. `MAX_ITERATIONS = 25`, `max_tokens = 8192` (4096 was too tight — Claude truncated mid-JSON).
- **Tools** (`aria/tools/registry.py` + `executors.py`) — 5 tools, all returning either an image content block (Street View, satellite) or structured JSON (flood zone, surge zone, nearby assets). For the hackathon demo, executors return curated stubs for our two demo buildings; replacing them with live FEMA NFHL ArcGIS REST + Miami-Dade Open Data calls is a one-file change.
- **Streaming** (`aria/agent/streaming.py`) emits one SSE block per event. Event types: `thinking` (start of iteration), `reasoning` (Claude's prose), `tool_call`, `tool_result`, `complete`, `error`.

## Caching for demo reliability

Live Anthropic runs take 60–90s — judging-day Wi-Fi is not the right time to
roll those dice. Every successful `/agent/run` is captured event-by-event with
millisecond timing and upserted into Supabase `cached_runs`.

- **POST `/agent/replay/{building_id}`** — looks up the cached events and
  replays them with original cadence. Accepts `?speed=1.5` to fast-forward.
  Returns 404 if no cache exists for that building.
- The frontend hook (`useAgentStream`) defaults to `mode: "auto"` — it tries
  the replay endpoint first and silently falls back to the live `/agent/run`
  on 404. The agent-log header shows a `CACHED / LIVE` toggle and a
  `⏵ CACHED REPLAY` badge when replaying.
- See migration `infra/supabase/migrations/0002_cached_runs.sql` for the
  `cached_runs` table shape.

## Scripts

### `scripts/prewarm_cache.py`

One-shot script that runs the live agent against both demo buildings,
verifies each cache row landed in Supabase, and prints a summary. Run
once before demo day so judging is zero-latency replay:

```bash
cd apps/api
uv run python scripts/prewarm_cache.py    # ~3 min total
```

### `scripts/generate_variants.py`

Pre-generates Gemini photorealistic surge (1/3/6/10 ft) and wind (Cat 1/3/5, exteriors only) variants for every walkthrough photo, written to `apps/web/public/scans/<building>/photos/variants/`.

Idempotent — skips files that already exist. Verbose logging with counter + cost estimate at the end. Run once after capturing new photos:

```bash
cd apps/api
uv run python scripts/generate_variants.py
```

Note: requires Gemini API key on a billing-enabled project — `gemini-2.5-flash-image` is not available on the free tier.

## Environment variables

`apps/api/.env`:

```
ANTHROPIC_API_KEY=sk-ant-api...
GEMINI_API_KEY=AIza...
SUPABASE_URL=https://<project>.supabase.co
SUPABASE_SERVICE_KEY=eyJ...                 # service role for write paths
GOOGLE_MAPS_API_KEY=AIza...                 # Street View / satellite (when live tools are wired)
```

`load_dotenv(override=True)` runs at the top of `aria/main.py` — explicit override because some dev shells export an empty `ANTHROPIC_API_KEY` from another project, and `load_dotenv()` won't replace existing vars by default.

## Dev

```bash
uv sync                                     # install deps (first time)
./dev.sh                                    # uvicorn with --reload on :8000
# or
uv run uvicorn aria.main:app --reload --reload-dir aria --port 8000

# Smoke test the agent endpoint:
curl -N -X POST http://localhost:8000/agent/run \
  -H "Content-Type: application/json" \
  -d '{
    "address": "592 NE 60th St, Miami, FL 33137",
    "scenario_params": { "wind_mph": 130, "surge_ft": 6, "rainfall_in": 4 }
  }'
```

A successful run emits ~30–40 SSE events ending in `event: complete` with the structured `PreplanReport` payload.
