"""POST /agent/run — streams the agent loop as Server-Sent Events.

Adds caching: every successful run is buffered with per-event timing and
upserted into Supabase `cached_runs`. POST /agent/replay/{building_id}
re-emits those events with the original cadence — non-negotiable for
demo reliability, since the live agent run is ~60–90s of Anthropic latency.
"""

from __future__ import annotations

import asyncio
import json
import os
import re
import time
from collections.abc import AsyncIterator
from typing import Any

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from supabase import Client, create_client

from aria.agent.loop import run_agent
from aria.agent.prompts import ScenarioParams

router = APIRouter(prefix="/agent", tags=["agent"])

_SSE_HEADERS = {
    "Cache-Control": "no-cache",
    "X-Accel-Buffering": "no",
}

_SSE_PATTERN = re.compile(r"^event:\s*(\S+)\s*\ndata:\s*(.+?)\s*$", re.DOTALL)


def _get_supabase() -> Client | None:
    """Lazy-construct a Supabase client. Cache is optional; if the env isn't
    configured we silently skip persistence rather than break the live run."""
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        return None
    return create_client(url, key)


def _parse_sse_chunk(chunk: str) -> tuple[str | None, dict[str, Any] | None]:
    m = _SSE_PATTERN.match(chunk.strip())
    if not m:
        return None, None
    try:
        return m.group(1), json.loads(m.group(2))
    except json.JSONDecodeError:
        return m.group(1), None


class AgentRunRequest(BaseModel):
    address: str
    scenario_params: ScenarioParams
    building_id: str | None = None  # optional — required for cache write


@router.post("/run")
async def run(req: AgentRunRequest) -> StreamingResponse:
    """Live agent run. Captures events for cache if `building_id` provided."""
    return StreamingResponse(
        _captured_stream(req),
        media_type="text/event-stream",
        headers=_SSE_HEADERS,
    )


async def _captured_stream(req: AgentRunRequest) -> AsyncIterator[str]:
    started = time.monotonic()
    buffer: list[dict[str, Any]] = []
    success = False
    tool_call_count = 0
    iteration_count = 0

    async for sse_chunk in run_agent(req.address, req.scenario_params):
        event_type, payload = _parse_sse_chunk(sse_chunk)
        if event_type is not None:
            ms = int((time.monotonic() - started) * 1000)
            buffer.append(
                {
                    "event_type": event_type,
                    "payload": payload,
                    "ms_since_start": ms,
                }
            )
            if event_type == "tool_call":
                tool_call_count += 1
            elif event_type == "thinking":
                iteration_count += 1
            elif event_type == "complete":
                success = True
        yield sse_chunk

    if not success or not req.building_id:
        return

    sb = _get_supabase()
    if not sb:
        return
    total_ms = int((time.monotonic() - started) * 1000)
    try:
        sb.table("cached_runs").upsert(
            {
                "building_id": req.building_id,
                "events": buffer,
                "total_duration_ms": total_ms,
                "tool_call_count": tool_call_count,
                "iteration_count": iteration_count,
            },
            on_conflict="building_id",
        ).execute()
    except Exception as e:  # noqa: BLE001 — never break the response over caching
        print(f"[cache] write failed: {type(e).__name__}: {e}")


@router.post("/replay/{building_id}")
async def replay(building_id: str, speed: float = 1.0) -> StreamingResponse:
    """Replay a cached run with original timing (scaled by `speed`)."""
    sb = _get_supabase()
    if not sb:
        raise HTTPException(503, "Cache backend not configured")

    try:
        res = (
            sb.table("cached_runs")
            .select("events")
            .eq("building_id", building_id)
            .maybe_single()
            .execute()
        )
    except Exception as e:  # noqa: BLE001
        raise HTTPException(500, f"Cache lookup failed: {e}") from e

    if not res or not res.data:
        raise HTTPException(
            404, "no cache for this building, run live first"
        )

    events = res.data.get("events") or []
    if not events:
        raise HTTPException(404, "cache row found but empty")

    return StreamingResponse(
        _replay_stream(events, max(0.1, speed)),
        media_type="text/event-stream",
        headers=_SSE_HEADERS,
    )


async def _replay_stream(
    events: list[dict[str, Any]],
    speed: float,
) -> AsyncIterator[str]:
    last_ms = 0
    for ev in events:
        ms = int(ev.get("ms_since_start", last_ms))
        delay_ms = max(0, ms - last_ms) / speed
        if delay_ms > 0:
            await asyncio.sleep(delay_ms / 1000)
        last_ms = ms
        event_type = ev.get("event_type") or "message"
        payload = ev.get("payload") or {}
        yield f"event: {event_type}\ndata: {json.dumps(payload, default=str)}\n\n"
