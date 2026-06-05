#!/usr/bin/env python3
"""Pre-generate Gemini hazard variants for walkthrough photos.

Run once from apps/api/:

    uv run python scripts/generate_variants.py

Writes variant JPEGs into a `variants/` directory next to each source photo:

    apps/web/public/scans/building_a/photos/view_starthall.jpg
    apps/web/public/scans/building_a/photos/variants/view_starthall_surge_1ft.jpg

Idempotent: existing variant files are skipped, so the script can resume.
"""

from __future__ import annotations

import os
import sys
import time
from dataclasses import dataclass
from pathlib import Path

from dotenv import load_dotenv

# apps/api/.env is one level up from this script.
ROOT = Path(__file__).resolve().parent.parent
load_dotenv(ROOT / ".env", override=True)

API_KEY = os.environ.get("GEMINI_API_KEY")
if not API_KEY:
    print("✗ GEMINI_API_KEY not found in apps/api/.env", file=sys.stderr)
    sys.exit(1)

from google import genai  # noqa: E402
from google.genai import types  # noqa: E402
from PIL import Image  # noqa: E402

_client = genai.Client(api_key=API_KEY)

MODEL_ID = "gemini-2.5-flash-image"
WEB_SCANS = (ROOT / ".." / "web" / "public" / "scans").resolve()
BUILDINGS = ["building_a", "building_b", "the_dock"]
PHOTO_SUFFIXES = (".jpg", ".jpeg", ".png")
EXTERIOR_KEYWORDS = ("outside", "exterior", "play", "backofhall", "back_")
COST_PER_IMAGE = 0.04  # USD, approximate
RATE_LIMIT_SECONDS = 1.0

SURGE_PROMPTS: dict[str, str] = {
    "1ft": (
        "Edit this image to show approximately 1 foot of stormwater covering "
        "the floor area only. The water is realistic Miami storm surge — "
        "murky brown-green with subtle blue undertones, slight ripples and "
        "reflections of the room above. Preserve everything above 1 foot "
        "exactly as is. Photorealistic, no stylization."
    ),
    "3ft": (
        "Edit this image to show approximately 3 feet of stormwater covering "
        "the lower portion of the room. The water is murky brown-green with "
        "subtle blue undertones, ripples, and reflections of upper "
        "architecture. Preserve everything above 3 feet exactly as is. "
        "Photorealistic."
    ),
    "6ft": (
        "Edit this image to show approximately 6 feet of stormwater filling "
        "most of the room. Murky brown-green water with subtle blue "
        "undertones, visible debris floating, ripples, and reflections. "
        "Preserve only ceiling and upper walls. Photorealistic."
    ),
    "10ft": (
        "Edit this image to show this room almost entirely submerged in "
        "stormwater, water level approximately 10 feet high. Murky brown-"
        "green water with debris, only the very top of the ceiling visible "
        "above water. Photorealistic, catastrophic flood scene."
    ),
}

WIND_PROMPTS: dict[str, str] = {
    "cat1": (
        "Edit this image to show the aftermath of a Category 1 hurricane "
        "with sustained winds around 80mph. Add some fallen palm fronds and "
        "debris on the ground, slightly darkened overcast sky, light rain "
        "streaks. Preserve building structure intact. Photorealistic."
    ),
    "cat3": (
        "Edit this image to show the aftermath of a Category 3 hurricane "
        "with winds around 120mph. Add fallen trees and significant debris, "
        "broken signage, ripped vegetation, dark stormy sky, heavy rain "
        "streaks. Building structure intact but exterior damage visible. "
        "Photorealistic."
    ),
    "cat5": (
        "Edit this image to show the aftermath of a Category 5 hurricane "
        "with winds 157mph+. Severe damage: snapped trees, scattered debris "
        "everywhere, ripped vegetation, broken windows on building, dark "
        "apocalyptic sky, sheeting rain. Photorealistic, devastating scene."
    ),
}


@dataclass
class Task:
    source: Path
    output: Path
    prompt: str
    label: str  # e.g. "view_starthall surge_3ft"


def is_exterior(filename: str) -> bool:
    lower = filename.lower()
    return any(kw in lower for kw in EXTERIOR_KEYWORDS)


def plan_tasks() -> list[Task]:
    tasks: list[Task] = []
    for building in BUILDINGS:
        photos_dir = WEB_SCANS / building / "photos"
        if not photos_dir.is_dir():
            print(f"  ⚠ skipping {photos_dir} (not found)")
            continue
        photos = sorted(
            p for p in photos_dir.iterdir() if p.suffix.lower() in PHOTO_SUFFIXES
        )
        variants_dir = photos_dir / "variants"
        for photo in photos:
            base = photo.stem
            for depth, prompt in SURGE_PROMPTS.items():
                tasks.append(
                    Task(
                        source=photo,
                        output=variants_dir / f"{base}_surge_{depth}.jpg",
                        prompt=prompt,
                        label=f"{base} surge_{depth}",
                    )
                )
            if is_exterior(photo.name):
                for cat, prompt in WIND_PROMPTS.items():
                    tasks.append(
                        Task(
                            source=photo,
                            output=variants_dir / f"{base}_wind_{cat}.jpg",
                            prompt=prompt,
                            label=f"{base} wind_{cat}",
                        )
                    )
    return tasks


def generate_variant(task: Task) -> tuple[bool, str]:
    """Call Gemini and write the variant. Returns (ok, message)."""
    try:
        img = Image.open(task.source)
        # Many phone JPEGs carry EXIF orientation; bake it in so Gemini sees
        # the image right-side-up.
        try:
            from PIL import ImageOps

            img = ImageOps.exif_transpose(img)
        except Exception:
            pass

        response = _client.models.generate_content(
            model=MODEL_ID,
            contents=[task.prompt, img],
            config=types.GenerateContentConfig(
                response_modalities=["TEXT", "IMAGE"],
            ),
        )

        candidates = getattr(response, "candidates", None) or []
        if not candidates:
            return False, "no candidates returned"

        for part in candidates[0].content.parts:
            inline = getattr(part, "inline_data", None)
            if inline is not None and getattr(inline, "data", None):
                task.output.parent.mkdir(parents=True, exist_ok=True)
                with open(task.output, "wb") as f:
                    f.write(inline.data)
                return True, "saved"

        # No image in response — likely safety filter or text-only fallback
        text_part = next(
            (
                getattr(p, "text", None)
                for p in candidates[0].content.parts
                if getattr(p, "text", None)
            ),
            None,
        )
        snippet = f": {text_part[:120]}" if text_part else ""
        return False, f"no image in response{snippet}"

    except Exception as e:  # noqa: BLE001 — capture all upstream errors
        return False, f"{type(e).__name__}: {e}"


def main() -> None:
    print(f"Scanning {WEB_SCANS} ...")
    tasks = plan_tasks()
    total = len(tasks)
    if total == 0:
        print("No photos found.")
        return

    skipped = 0
    generated = 0
    failed: list[tuple[str, str]] = []

    print(f"Planned {total} variants from {len(BUILDINGS)} buildings.")
    print()

    for i, task in enumerate(tasks, 1):
        prefix = f"[{i:>3}/{total}]"
        if task.output.exists():
            print(f"{prefix} {task.label} · ⏭  exists")
            skipped += 1
            continue

        print(f"{prefix} Generating {task.label}...", end=" ", flush=True)
        ok, msg = generate_variant(task)
        if ok:
            print("✓ saved")
            generated += 1
        else:
            print(f"✗ failed: {msg}")
            failed.append((task.label, msg))
        # Be polite to the API regardless of outcome.
        time.sleep(RATE_LIMIT_SECONDS)

    print()
    print("=" * 56)
    print(f"Generated: {generated}")
    print(f"Skipped (already existed): {skipped}")
    print(f"Failed: {len(failed)}")
    if failed:
        print("Failures:")
        for label, msg in failed:
            print(f"  - {label}: {msg}")
    print(f"Estimated cost: ${generated * COST_PER_IMAGE:.2f}")


if __name__ == "__main__":
    main()
