import type { RiskScore } from "@/lib/types";

export const SURGE_STOPS: ReadonlyArray<{ value: 0 | 1 | 3 | 6 | 10; label: string }> = [
  { value: 0, label: "DRY" },
  { value: 1, label: "1FT" },
  { value: 3, label: "3FT" },
  { value: 6, label: "6FT" },
  { value: 10, label: "10FT" },
];

export const WIND_STOPS: ReadonlyArray<{ value: 0 | 1 | 3 | 5; label: string }> = [
  { value: 0, label: "CALM" },
  { value: 1, label: "CAT 1" },
  { value: 3, label: "CAT 3" },
  { value: 5, label: "CAT 5" },
];

export type SurgeValue = (typeof SURGE_STOPS)[number]["value"];
export type WindValue = (typeof WIND_STOPS)[number]["value"];

const EXTERIOR_KEYWORDS = ["outside", "exterior", "play", "backofhall"];

// Same severity scale (0-5) for surge and wind so we can compare them.
const SURGE_SEV: Record<SurgeValue, number> = { 0: 0, 1: 2, 3: 3, 6: 4, 10: 5 };
const WIND_SEV: Record<WindValue, number> = { 0: 0, 1: 2, 3: 3, 5: 4 };

// Variants known not to exist on disk. Listed here so we render the original
// photo immediately and never trigger a 404 in DevTools.
export const MISSING_VARIANTS: ReadonlySet<string> = new Set([
  "/scans/building_a/photos/variants/view_hallmove5_surge_1ft.jpg",
]);

export function isExteriorPhoto(url: string): boolean {
  const lower = url.toLowerCase();
  return EXTERIOR_KEYWORDS.some((k) => lower.includes(k));
}

export function resolveVariant(
  originalUrl: string,
  surge: SurgeValue,
  wind: WindValue,
  failed: ReadonlySet<string> = new Set(),
): string {
  const surgeSev = SURGE_SEV[surge];
  const windSev = WIND_SEV[wind];
  if (surgeSev === 0 && windSev === 0) return originalUrl;

  const exterior = isExteriorPhoto(originalUrl);
  // Wind only applies to exteriors. On exteriors with both, the worse
  // scenario wins.
  const useWind =
    exterior && windSev > 0 && (surgeSev === 0 || windSev > surgeSev);

  let candidate: string;
  if (useWind) {
    candidate = surgePath(originalUrl, surge, wind, "wind");
  } else if (surgeSev > 0) {
    candidate = surgePath(originalUrl, surge, wind, "surge");
  } else {
    return originalUrl;
  }

  if (MISSING_VARIANTS.has(candidate) || failed.has(candidate)) {
    return originalUrl;
  }
  return candidate;
}

function surgePath(
  originalUrl: string,
  surge: SurgeValue,
  wind: WindValue,
  scenario: "surge" | "wind",
): string {
  const slash = originalUrl.lastIndexOf("/");
  const dir = originalUrl.slice(0, slash);
  const filename = originalUrl.slice(slash + 1);
  const dot = filename.lastIndexOf(".");
  const stem = filename.slice(0, dot);
  const suffix =
    scenario === "surge" ? `_surge_${surge}ft.jpg` : `_wind_cat${wind}.jpg`;
  return `${dir}/variants/${stem}${suffix}`;
}

export function allVariantsFor(originalUrl: string): string[] {
  const urls: string[] = [];
  for (const s of SURGE_STOPS) {
    if (s.value === 0) continue;
    const u = surgePath(originalUrl, s.value, 0, "surge");
    if (!MISSING_VARIANTS.has(u)) urls.push(u);
  }
  if (isExteriorPhoto(originalUrl)) {
    for (const w of WIND_STOPS) {
      if (w.value === 0) continue;
      urls.push(surgePath(originalUrl, 0, w.value, "wind"));
    }
  }
  return urls;
}

export function surgeRisk(surge: SurgeValue): RiskScore {
  if (surge === 0) return "LOW";
  if (surge === 1) return "MODERATE";
  if (surge === 10) return "SEVERE";
  return "HIGH";
}

export function windRisk(wind: WindValue): RiskScore {
  if (wind === 0) return "LOW";
  if (wind === 1) return "MODERATE";
  if (wind === 5) return "SEVERE";
  return "HIGH";
}

export function scenarioLabel(surge: SurgeValue, wind: WindValue): string {
  if (surge === 0 && wind === 0) return "BASELINE — CLEAR CONDITIONS";
  if (surge >= 10) return "CATASTROPHIC FLOODING — RED TAG ZONE";
  if (surge >= 6 && wind >= 5) return "EXTREME EVENT — CATEGORY 5 HURRICANE";
  if (surge >= 6) return "MAJOR SURGE — STORM CONDITIONS";
  if (surge >= 3 && wind >= 5) return "MAJOR SURGE — CATEGORY 5 HURRICANE";
  if (surge >= 3 && wind >= 3) return "MAJOR SURGE — CATEGORY 3 HURRICANE";
  if (surge >= 3) return "MODERATE SURGE — STORM CONDITIONS";
  if (surge >= 1 && wind >= 3) return "MINOR FLOODING — CATEGORY 3 HURRICANE";
  if (surge >= 1 && wind >= 1) return "MINOR FLOODING — TROPICAL STORM";
  if (surge >= 1) return "MINOR FLOODING — STORM CONDITIONS";
  if (wind >= 5) return "SEVERE WIND — CATEGORY 5 HURRICANE";
  if (wind >= 3) return "MAJOR WIND — CATEGORY 3 HURRICANE";
  if (wind >= 1) return "MINOR WIND — TROPICAL STORM";
  return "BASELINE — CLEAR CONDITIONS";
}
