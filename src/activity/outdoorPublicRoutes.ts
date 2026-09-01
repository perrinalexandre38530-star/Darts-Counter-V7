import { supabase } from "../lib/supabaseClient";
import type { ActivityRecord, GeoPoint } from "./activityTypes";
import { routeTemplateFromActivity, type RunningRouteTemplate } from "./runningRoutes";
import type { OutdoorPerformanceSport } from "./outdoorPerformance";

function cleanRoute(points: GeoPoint[]) {
  if (points.length <= 520) return points;
  const step = Math.ceil(points.length / 520);
  return points.filter((_, index) => index === 0 || index === points.length - 1 || index % step === 0);
}

export async function publishOutdoorActivityRoute(activity: ActivityRecord, description = "") {
  if (!activity || activity.indoor || !Array.isArray(activity.route) || activity.route.length < 2) return { ok: false as const, reason: "no-route" as const };
  try {
    const route = routeTemplateFromActivity(activity, activity.title);
    const { data, error } = await supabase.rpc("ms_publish_running_public_route", {
      p_source_activity_id: activity.id,
      p_title: String(activity.title || route.name).slice(0, 120),
      p_description: String(description || activity.notes || "").slice(0, 600),
      p_sport: activity.sport,
      p_route: cleanRoute(route.route),
      p_distance_m: Math.round(route.distanceM || 0),
      p_elevation_gain_m: Math.round(route.elevationGainM || 0),
    } as any);
    if (error) return { ok: false as const, reason: String(error.message || "publish-error") };
    const row = Array.isArray(data) ? data[0] : data;
    const id = String(row?.id || row?.publicId || row?.public_id || data || "");
    return id ? { ok: true as const, id } : { ok: false as const, reason: "missing-id" as const };
  } catch {
    return { ok: false as const, reason: "offline" as const };
  }
}

export async function unpublishOutdoorActivityRoute(activityId: string) {
  try {
    const { error } = await supabase.rpc("ms_unpublish_running_public_route", { p_source_activity_id: activityId } as any);
    return error ? { ok: false as const, reason: String(error.message || "unpublish-error") } : { ok: true as const };
  } catch {
    return { ok: false as const, reason: "offline" as const };
  }
}

function num(value: any, fallback = 0) { const result = Number(value); return Number.isFinite(result) ? result : fallback; }
function mapPoint(value: any, index: number): GeoPoint | null {
  const lat = num(value?.lat, NaN), lon = num(value?.lon ?? value?.lng, NaN);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  return { lat, lon, timestamp: num(value?.timestamp, Date.now() + index), altitude: Number.isFinite(Number(value?.altitude)) ? Number(value.altitude) : undefined, elapsedMs: Number.isFinite(Number(value?.elapsedMs)) ? Number(value.elapsedMs) : undefined };
}

export async function fetchNearbyCommunityRoutes(center: { lat: number; lon: number }, sport: OutdoorPerformanceSport, radiusKm = 20): Promise<{ routes: RunningRouteTemplate[]; available: boolean }> {
  try {
    const { data, error } = await supabase.rpc("ms_find_running_public_routes", {
      p_latitude: center.lat,
      p_longitude: center.lon,
      p_radius_km: Math.max(1, Math.min(100, radiusKm)),
      p_sport: sport,
      p_limit: 30,
    } as any);
    if (error) {
      const message = String(error.message || "").toLowerCase();
      const missing = message.includes("ms_find_running_public_routes") || message.includes("pgrst202") || message.includes("could not find the function");
      return { routes: [], available: !missing };
    }
    const rows = Array.isArray(data) ? data : [];
    const routes = rows.map((raw: any): RunningRouteTemplate | null => {
      const row = raw?.route ? raw : (raw?.value || raw);
      const points = (Array.isArray(row?.route) ? row.route : []).map(mapPoint).filter(Boolean) as GeoPoint[];
      if (points.length < 2) return null;
      const publicId = String(row?.id ?? row?.publicId ?? row?.public_id ?? "");
      if (!publicId) return null;
      const ownerDisplayName = String(row?.ownerDisplayName ?? row?.owner_display_name ?? "Athlète");
      return {
        id: `community:${publicId}`,
        externalId: `community:${publicId}`,
        name: String(row?.title || `Parcours de ${ownerDisplayName}`),
        route: points,
        distanceM: num(row?.distanceM ?? row?.distance_m),
        elevationGainM: num(row?.elevationGainM ?? row?.elevation_gain_m),
        referenceElapsedMs: 0,
        createdAt: new Date(row?.createdAt ?? row?.created_at ?? Date.now()).getTime(),
        source: "community",
        sport: String(row?.sport || sport) as any,
        community: {
          publicId,
          ownerUserId: String(row?.ownerUserId ?? row?.owner_user_id ?? "") || undefined,
          ownerDisplayName,
          ownerAvatarUrl: row?.ownerAvatarUrl ?? row?.owner_avatar_url ?? null,
          description: String(row?.description || "") || undefined,
          distanceFromCenterM: num(row?.distanceMFromCenter ?? row?.distance_from_center_m, 0),
          publishedAt: new Date(row?.createdAt ?? row?.created_at ?? Date.now()).getTime(),
        },
      };
    }).filter(Boolean) as RunningRouteTemplate[];
    return { routes, available: true };
  } catch {
    return { routes: [], available: false };
  }
}
