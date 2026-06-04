import { getServerSupabase, type Building } from "@/lib/supabase";

import { MapDashboard } from "./MapDashboard";
import type { PreplanRow, ToolCallRow } from "./AgentActivity";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = getServerSupabase();

  const [buildingsRes, preplansRes, toolCallsRes, preplanCountRes, toolCallCountRes] =
    await Promise.all([
      supabase.from("buildings").select("*").order("created_at", { ascending: true }),
      supabase
        .from("preplans")
        .select("id, created_at, scenario_params, building:buildings(address)")
        .order("created_at", { ascending: false })
        .limit(5),
      supabase
        .from("tool_calls")
        .select("id, tool_name, created_at")
        .order("created_at", { ascending: false })
        .limit(20),
      supabase.from("preplans").select("id", { count: "exact", head: true }),
      supabase.from("tool_calls").select("id", { count: "exact", head: true }),
    ]);

  const buildings: Building[] = buildingsRes.data ?? [];
  const preplans = (preplansRes.data ?? []) as unknown as PreplanRow[];
  const toolCalls = (toolCallsRes.data ?? []) as ToolCallRow[];

  // Primary venue (Building A) gets the prominent pulse; other demo buildings
  // get a smaller marker. Order by created_at ensures the seeded venue is first.
  const demoBuildings = buildings.filter((b) => b.is_demo);

  return (
    <MapDashboard
      buildings={demoBuildings}
      preplans={preplans}
      toolCalls={toolCalls}
      counts={{
        preplans: preplanCountRes.count ?? 0,
        toolCalls: toolCallCountRes.count ?? 0,
      }}
      mapboxToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? ""}
    />
  );
}
