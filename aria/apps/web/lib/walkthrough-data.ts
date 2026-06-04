import type { RiskScore } from "@/lib/types";

export type Annotation = {
  label: string;
  severity: RiskScore;
  x_percent: number;
  y_percent: number;
};

export type Viewpoint = {
  id: string;
  label: string;
  image: string;
  navigation: {
    forward?: string;
    back?: string;
    left?: string;
    right?: string;
  };
  annotations: Annotation[];
};

export type BuildingWalkthrough = {
  building_id: string;
  floorplan?: string;
  start_viewpoint: string;
  viewpoints: Record<string, Viewpoint>;
};

// Seeded venue (Hackathon Venue — Miami, FL). Confirmed via Supabase.
const BUILDING_A_ID = "014b39a9-09b8-432b-9b62-363e06383d1f";

// Seeded Innovation Center.
const BUILDING_B_ID = "870d979d-6eaf-4d7f-894a-8ca34e527237";

const BUILDING_A: BuildingWalkthrough = {
  building_id: BUILDING_A_ID,
  start_viewpoint: "hall_start",
  viewpoints: {
    hall_start: {
      id: "hall_start",
      label: "HALL · START",
      image: "/scans/building_a/photos/view_starthall.jpg",
      navigation: { forward: "hall_concourse" },
      annotations: [
        {
          label: "GROUND-LEVEL EGRESS · SURGE ENTRY",
          severity: "SEVERE",
          x_percent: 50,
          y_percent: 86,
        },
        {
          label: "OPEN CEILING · WIND PRESSURE LOAD",
          severity: "MODERATE",
          x_percent: 50,
          y_percent: 14,
        },
        {
          label: "WET-FLOOR HAZARD · ACTIVE",
          severity: "LOW",
          x_percent: 70,
          y_percent: 60,
        },
      ],
    },
    hall_concourse: {
      id: "hall_concourse",
      label: "HALL · CONCOURSE",
      image: "/scans/building_a/photos/view_hallmove3.jpg",
      navigation: { back: "hall_start", forward: "hall_corner" },
      annotations: [
        {
          label: "CONCESSIONS STAND · UTILITY SHUTOFF",
          severity: "MODERATE",
          x_percent: 38,
          y_percent: 48,
        },
        {
          label: "AUDITORIUM EXIT · PRIMARY EVAC",
          severity: "HIGH",
          x_percent: 30,
          y_percent: 18,
        },
        {
          label: "TILE FLOOR · SLIP RISK ON INTRUSION",
          severity: "LOW",
          x_percent: 65,
          y_percent: 78,
        },
      ],
    },
    hall_corner: {
      id: "hall_corner",
      label: "HALL · CLASSROOM CORNER",
      image: "/scans/building_a/photos/view_hallcornerlatin.jpg",
      navigation: { back: "hall_concourse", forward: "exit_outside" },
      annotations: [
        {
          label: "CLASSROOM CLUSTER · LIKELY OCCUPANCY",
          severity: "HIGH",
          x_percent: 45,
          y_percent: 50,
        },
        {
          label: "OVERHEAD FIXTURES · DEBRIS RISK",
          severity: "MODERATE",
          x_percent: 60,
          y_percent: 20,
        },
        {
          label: "STAIRWELL B · SHELTER PATH",
          severity: "LOW",
          x_percent: 18,
          y_percent: 60,
        },
      ],
    },
    exit_outside: {
      id: "exit_outside",
      label: "EXIT · OUTSIDE TRANSITION",
      image: "/scans/building_a/photos/view_outsidehall1.jpg",
      navigation: { back: "hall_corner", forward: "yard_open" },
      annotations: [
        {
          label: "EXTERIOR GLAZING · WIND DEBRIS",
          severity: "SEVERE",
          x_percent: 55,
          y_percent: 35,
        },
        {
          label: "GRADE-LEVEL THRESHOLD · SURGE INTRUSION",
          severity: "HIGH",
          x_percent: 50,
          y_percent: 82,
        },
        {
          label: "STAGING AREA · UPWIND",
          severity: "LOW",
          x_percent: 22,
          y_percent: 72,
        },
      ],
    },
    yard_open: {
      id: "yard_open",
      label: "YARD · OPEN AIR",
      image: "/scans/building_a/photos/view_outsideplay1.jpg",
      navigation: { back: "exit_outside", forward: "court_play" },
      annotations: [
        {
          label: "OPEN YARD · WIND PROJECTILE FIELD",
          severity: "HIGH",
          x_percent: 50,
          y_percent: 40,
        },
        {
          label: "VEGETATION · DOWNED-TREE RISK",
          severity: "MODERATE",
          x_percent: 78,
          y_percent: 55,
        },
        {
          label: "LOW-LYING DRAINAGE · STANDING WATER",
          severity: "HIGH",
          x_percent: 35,
          y_percent: 85,
        },
      ],
    },
    court_play: {
      id: "court_play",
      label: "COURT · OUTDOOR ASSEMBLY",
      image: "/scans/building_a/photos/view_basketball1.jpg",
      navigation: { back: "yard_open" },
      annotations: [
        {
          label: "GOAL STRUCTURE · DETACHMENT AT 110 MPH",
          severity: "SEVERE",
          x_percent: 55,
          y_percent: 30,
        },
        {
          label: "OPEN COURT · EVAC ASSEMBLY POINT",
          severity: "LOW",
          x_percent: 45,
          y_percent: 70,
        },
        {
          label: "PERIMETER FENCE · DEBRIS NETTING",
          severity: "MODERATE",
          x_percent: 80,
          y_percent: 50,
        },
      ],
    },
  },
};

const BUILDING_B: BuildingWalkthrough = {
  building_id: BUILDING_B_ID,
  start_viewpoint: "exterior_approach",
  viewpoints: {
    exterior_approach: {
      id: "exterior_approach",
      label: "EXTERIOR · APPROACH",
      image: "/scans/building_b/photos/view_outsidestart.jpg",
      navigation: { forward: "entry_door_a" },
      annotations: [
        {
          label: "PRIMARY FACADE · WIND LOAD AXIS",
          severity: "HIGH",
          x_percent: 50,
          y_percent: 40,
        },
        {
          label: "GRADE-LEVEL ENTRY · SURGE EXPOSURE",
          severity: "SEVERE",
          x_percent: 50,
          y_percent: 80,
        },
      ],
    },
    entry_door_a: {
      id: "entry_door_a",
      label: "ENTRY · MAIN DOOR",
      image: "/scans/building_b/photos/view_door1.JPG",
      navigation: { back: "exterior_approach", forward: "entry_door_b" },
      annotations: [
        {
          label: "GLASS DOOR · IMPACT NOT RATED",
          severity: "SEVERE",
          x_percent: 50,
          y_percent: 45,
        },
        {
          label: "VESTIBULE · STAGING ZONE",
          severity: "LOW",
          x_percent: 35,
          y_percent: 75,
        },
      ],
    },
    entry_door_b: {
      id: "entry_door_b",
      label: "ENTRY · SIDE DOOR",
      image: "/scans/building_b/photos/view_door2.JPG",
      navigation: { back: "entry_door_a", forward: "interior_main" },
      annotations: [
        {
          label: "SECONDARY EGRESS · UNOBSTRUCTED",
          severity: "LOW",
          x_percent: 50,
          y_percent: 50,
        },
        {
          label: "THRESHOLD SEAL · WATER INTRUSION RISK",
          severity: "MODERATE",
          x_percent: 50,
          y_percent: 80,
        },
      ],
    },
    interior_main: {
      id: "interior_main",
      label: "INTERIOR · MAIN ROOM",
      image: "/scans/building_b/photos/view_inside1.JPG",
      navigation: { back: "entry_door_b", forward: "interior_open" },
      annotations: [
        {
          label: "CEILING SPAN · COLLAPSE AT 130 MPH",
          severity: "HIGH",
          x_percent: 50,
          y_percent: 20,
        },
        {
          label: "INTERIOR OCCUPANCY · 40–60 PERSONS",
          severity: "MODERATE",
          x_percent: 50,
          y_percent: 55,
        },
        {
          label: "FLOOR ELEV · 1.2 FT ABOVE GRADE",
          severity: "HIGH",
          x_percent: 30,
          y_percent: 85,
        },
      ],
    },
    interior_open: {
      id: "interior_open",
      label: "INTERIOR · OPEN FLOOR",
      image:
        "/scans/building_b/photos/view_inside2removetablesandpeoplewithai.JPG",
      navigation: { back: "interior_main", forward: "interior_rear" },
      annotations: [
        {
          label: "CLEAR FLOOR · USABLE EVAC PATH",
          severity: "LOW",
          x_percent: 50,
          y_percent: 60,
        },
        {
          label: "OVERHEAD HVAC · UNANCHORED LOAD",
          severity: "MODERATE",
          x_percent: 65,
          y_percent: 20,
        },
      ],
    },
    interior_rear: {
      id: "interior_rear",
      label: "INTERIOR · REAR",
      image: "/scans/building_b/photos/view_restofroom.JPG",
      navigation: { back: "interior_open", forward: "interior_workstation" },
      annotations: [
        {
          label: "REAR WALL · LATERAL LOAD CRITICAL",
          severity: "HIGH",
          x_percent: 50,
          y_percent: 40,
        },
        {
          label: "EQUIPMENT ROW · NON-FIXED INVENTORY",
          severity: "MODERATE",
          x_percent: 70,
          y_percent: 65,
        },
      ],
    },
    interior_workstation: {
      id: "interior_workstation",
      label: "INTERIOR · WORKSTATION",
      image: "/scans/building_b/photos/view_table2.JPG",
      navigation: { back: "interior_rear" },
      annotations: [
        {
          label: "WORK SURFACE · IMPROVISED SHELTER",
          severity: "LOW",
          x_percent: 50,
          y_percent: 60,
        },
        {
          label: "POWER STRIP · ELECTRICAL SHUTOFF",
          severity: "MODERATE",
          x_percent: 70,
          y_percent: 75,
        },
      ],
    },
  },
};

export const WALKTHROUGHS: Record<string, BuildingWalkthrough> = {
  [BUILDING_A_ID]: BUILDING_A,
  [BUILDING_B_ID]: BUILDING_B,
};
