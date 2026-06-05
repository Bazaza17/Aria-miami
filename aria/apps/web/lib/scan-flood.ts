import type { MeshSize } from "./scan-coords";

/** Matches SURGE_STOPS in walkthrough/variants.ts */
export type SurgeFeet = 0 | 1 | 3 | 6 | 10;

const BUILDING_A_ID = "014b39a9-09b8-432b-9b62-363e06383d1f";
const BUILDING_B_ID = "870d979d-6eaf-4d7f-894a-8ca34e527237";

/**
 * Normalized Y (0 = mesh bottom, 1 = mesh top) of the water surface per surge
 * stop. Calibrated to grade-level thresholds in walkthrough annotations.
 */
const WATER_NY: Record<string, Record<SurgeFeet, number | null>> = {
  [BUILDING_A_ID]: {
    0: null,
    1: 0.1,
    3: 0.14,
    6: 0.22,
    10: 0.32,
  },
  [BUILDING_B_ID]: {
    0: null,
    1: 0.09,
    3: 0.13,
    6: 0.2,
    10: 0.3,
  },
};

export function waterSurfaceNy(
  buildingId: string,
  surgeFt: SurgeFeet,
): number | null {
  const profile = WATER_NY[buildingId];
  if (!profile) return null;
  return profile[surgeFt] ?? null;
}

export function waterWorldY(ny: number, meshSize: MeshSize): number {
  return (ny - 0.5) * meshSize.y;
}

export function hasFloodProfile(buildingId: string): boolean {
  return buildingId in WATER_NY;
}
