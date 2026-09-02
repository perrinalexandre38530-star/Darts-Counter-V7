import { looksMissingRunningRpc as looksMissingRpc } from "./runningShared";
import { supabase } from "../lib/supabaseClient";
import type { ActivityRecord } from "./activityTypes";
import { outdoorRouteKey } from "./outdoorRouteIdentity";
import type { RunningRouteTemplate } from "./runningRoutes";

export type OutdoorRouteLeaderboardRow = {
  rank: number;
  userId: string;
  displayName: string;
  avatarUrl?: string | null;
  countryCode?: string | null;
  elapsedMs: number;
  movingMs: number;
  paceSecPerKm: number | null;
  distanceM: number;
  elevationGainM: number;
  startedAt: string;
  attempts: number;
};

export async function syncOutdoorRouteAttempt(route: RunningRouteTemplate, activity: ActivityRecord) {
  if (!route || !activity || !activity.id) return { ok: false, reason: "invalid" as const };
  try {
    const { error } = await supabase.rpc("ms_upsert_running_route_attempt", {
      p_route_key: outdoorRouteKey(route),
      p_route_name: String(route.name || "Parcours").slice(0, 160),
      p_route_source: String(route.source || "activity"),
      p_sport: String(activity.sport || route.sport || "running"),
      p_activity_id: String(activity.id),
      p_elapsed_ms: Math.max(1, Math.round(Number(activity.elapsedMs || 0))),
      p_moving_ms: Math.max(1, Math.round(Number(activity.movingMs || activity.elapsedMs || 0))),
      p_distance_m: Math.max(0, Number(activity.distanceM || 0)),
      p_pace_sec_per_km: activity.avgPaceSecPerKm == null ? null : Number(activity.avgPaceSecPerKm),
      p_elevation_gain_m: Math.max(0, Number(activity.elevationGainM || 0)),
      p_started_at: new Date(activity.startedAt || Date.now()).toISOString(),
      p_verification: String(activity.verification || "declared"),
    });
    if (error) return { ok: false, reason: looksMissingRpc(error) ? "backend-not-installed" as const : "error" as const };
    return { ok: true as const };
  } catch { return { ok: false, reason: "offline" as const }; }
}

export async function fetchOutdoorRouteLeaderboard(route: RunningRouteTemplate, limit = 20): Promise<{ rows: OutdoorRouteLeaderboardRow[]; available: boolean }> {
  try {
    const { data, error } = await supabase.rpc("ms_running_route_leaderboard", { p_route_key: outdoorRouteKey(route), p_limit: Math.max(3, Math.min(50, limit)) });
    if (error) return { rows: [], available: !looksMissingRpc(error) };
    const raw = Array.isArray(data) ? data : data ? [data] : [];
    const rows = raw.map((item: any, index: number): OutdoorRouteLeaderboardRow => ({
      rank: Number(item?.rank || index + 1), userId: String(item?.userId || item?.user_id || ""), displayName: String(item?.displayName || item?.display_name || "Athlète"),
      avatarUrl: item?.avatarUrl ?? item?.avatar_url ?? null, countryCode: item?.countryCode ?? item?.country_code ?? null,
      elapsedMs: Number(item?.elapsedMs || item?.elapsed_ms || 0), movingMs: Number(item?.movingMs || item?.moving_ms || item?.elapsedMs || 0),
      paceSecPerKm: item?.paceSecPerKm == null && item?.pace_sec_per_km == null ? null : Number(item?.paceSecPerKm ?? item?.pace_sec_per_km),
      distanceM: Number(item?.distanceM || item?.distance_m || 0), elevationGainM: Number(item?.elevationGainM || item?.elevation_gain_m || 0),
      startedAt: String(item?.startedAt || item?.started_at || ""), attempts: Number(item?.attempts || 1),
    })).filter((row: OutdoorRouteLeaderboardRow) => row.userId && row.elapsedMs > 0);
    return { rows, available: true };
  } catch { return { rows: [], available: true }; }
}
