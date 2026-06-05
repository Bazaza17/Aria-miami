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
