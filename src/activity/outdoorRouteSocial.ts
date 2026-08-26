import { supabase } from "../lib/supabaseClient";
import { outdoorRouteKey } from "./outdoorRouteIdentity";
import type { RunningRouteTemplate } from "./runningRoutes";

export type RouteConditionKind = "good" | "dry" | "wet" | "muddy" | "snow" | "icy" | "blocked";
export type RouteHazardKind = "obstacle" | "works" | "flood" | "danger" | "closure" | "other";
export type RouteOutingPace = "easy" | "steady" | "sporty";

export type RouteReview = {
  id: string;
  userId: string;
  displayName: string;
  avatarUrl?: string | null;
  countryCode?: string | null;
  rating: number;
  difficulty: number;
  text: string;
  updatedAt: string;
};

export type RouteCondition = {
  id: string;
  userId: string;
  displayName: string;
  avatarUrl?: string | null;
  kind: RouteConditionKind;
  note: string;
  createdAt: string;
};

export type RouteHazard = {
  id: string;
  userId: string;
  displayName: string;
  kind: RouteHazardKind;
  severity: number;
  note: string;
  createdAt: string;
};

export type RouteOuting = {
  id: string;
  ownerUserId: string;
  ownerDisplayName: string;
  ownerAvatarUrl?: string | null;
  startsAt: string;
  pace: RouteOutingPace;
  maxPeople: number;
  note: string;
  participants: number;
  joined: boolean;
};

export type RouteCommunityPhoto = {
  id: string;
  userId: string;
  displayName: string;
  avatarUrl?: string | null;
  url: string;
  caption: string;
  createdAt: string;
};

export type RouteSocialFeed = {
  available: boolean;
  summary: { reviewCount: number; ratingAvg: number | null; difficultyAvg: number | null; recentCondition?: RouteConditionKind | null };
  reviews: RouteReview[];
  conditions: RouteCondition[];
  hazards: RouteHazard[];
  outings: RouteOuting[];
  photos: RouteCommunityPhoto[];
};

function looksMissingRpc(error: any) {
  const message = String(error?.message || error?.details || "").toLowerCase();
  return message.includes("pgrst202") || message.includes("could not find the function") || message.includes("does not exist");
}

function cleanString(value: unknown, max = 500) {
  return String(value || "").trim().slice(0, max);
}

function toArray(value: any) { return Array.isArray(value) ? value : []; }

export async function fetchOutdoorRouteSocialFeed(route: RunningRouteTemplate): Promise<RouteSocialFeed> {
  const empty: RouteSocialFeed = { available: true, summary: { reviewCount: 0, ratingAvg: null, difficultyAvg: null, recentCondition: null }, reviews: [], conditions: [], hazards: [], outings: [], photos: [] };
  try {
    const { data, error } = await supabase.rpc("ms_running_route_social_feed", { p_route_key: outdoorRouteKey(route), p_limit: 30 });
    if (error) return { ...empty, available: !looksMissingRpc(error) };
    const raw: any = data && typeof data === "object" ? data : {};
    const summary = raw.summary || {};
    return {
      available: true,
      summary: {
        reviewCount: Number(summary.reviewCount ?? summary.review_count ?? 0),
        ratingAvg: summary.ratingAvg == null && summary.rating_avg == null ? null : Number(summary.ratingAvg ?? summary.rating_avg),
        difficultyAvg: summary.difficultyAvg == null && summary.difficulty_avg == null ? null : Number(summary.difficultyAvg ?? summary.difficulty_avg),
        recentCondition: (summary.recentCondition ?? summary.recent_condition ?? null) as RouteConditionKind | null,
      },
      reviews: toArray(raw.reviews).map((item: any) => ({ id: String(item.id || ""), userId: String(item.userId || item.user_id || ""), displayName: String(item.displayName || item.display_name || "Athlète"), avatarUrl: item.avatarUrl ?? item.avatar_url ?? null, countryCode: item.countryCode ?? item.country_code ?? null, rating: Number(item.rating || 0), difficulty: Number(item.difficulty || 0), text: String(item.text || ""), updatedAt: String(item.updatedAt || item.updated_at || "") })).filter((item: RouteReview) => item.id),
      conditions: toArray(raw.conditions).map((item: any) => ({ id: String(item.id || ""), userId: String(item.userId || item.user_id || ""), displayName: String(item.displayName || item.display_name || "Athlète"), avatarUrl: item.avatarUrl ?? item.avatar_url ?? null, kind: String(item.kind || "good") as RouteConditionKind, note: String(item.note || ""), createdAt: String(item.createdAt || item.created_at || "") })).filter((item: RouteCondition) => item.id),
      hazards: toArray(raw.hazards).map((item: any) => ({ id: String(item.id || ""), userId: String(item.userId || item.user_id || ""), displayName: String(item.displayName || item.display_name || "Athlète"), kind: String(item.kind || "other") as RouteHazardKind, severity: Number(item.severity || 1), note: String(item.note || ""), createdAt: String(item.createdAt || item.created_at || "") })).filter((item: RouteHazard) => item.id),
      outings: toArray(raw.outings).map((item: any) => ({ id: String(item.id || ""), ownerUserId: String(item.ownerUserId || item.owner_user_id || ""), ownerDisplayName: String(item.ownerDisplayName || item.owner_display_name || "Athlète"), ownerAvatarUrl: item.ownerAvatarUrl ?? item.owner_avatar_url ?? null, startsAt: String(item.startsAt || item.starts_at || ""), pace: String(item.pace || "easy") as RouteOutingPace, maxPeople: Number(item.maxPeople || item.max_people || 8), note: String(item.note || ""), participants: Number(item.participants || 0), joined: Boolean(item.joined) })).filter((item: RouteOuting) => item.id),
      photos: toArray(raw.photos).map((item: any) => ({ id: String(item.id || ""), userId: String(item.userId || item.user_id || ""), displayName: String(item.displayName || item.display_name || "Athlète"), avatarUrl: item.avatarUrl ?? item.avatar_url ?? null, url: String(item.url || item.publicUrl || item.public_url || ""), caption: String(item.caption || ""), createdAt: String(item.createdAt || item.created_at || "") })).filter((item: RouteCommunityPhoto) => item.id && item.url),
    };
  } catch { return empty; }
}

async function rpcWrite(name: string, args: Record<string, unknown>) {
  try {
    const { data, error } = await supabase.rpc(name, args as any);
    if (error) return { ok: false as const, reason: looksMissingRpc(error) ? "backend-not-installed" as const : "error" as const, message: String(error.message || "") };
    return { ok: true as const, data };
  } catch (error: any) { return { ok: false as const, reason: "offline" as const, message: String(error?.message || "") }; }
}

export function submitOutdoorRouteReview(route: RunningRouteTemplate, input: { rating: number; difficulty: number; text?: string }) {
  return rpcWrite("ms_upsert_running_route_review", { p_route_key: outdoorRouteKey(route), p_rating: Math.max(1, Math.min(5, Math.round(input.rating))), p_difficulty: Math.max(1, Math.min(5, Math.round(input.difficulty))), p_text: cleanString(input.text, 600) });
}

export function postOutdoorRouteCondition(route: RunningRouteTemplate, kind: RouteConditionKind, note = "") {
  return rpcWrite("ms_post_running_route_condition", { p_route_key: outdoorRouteKey(route), p_kind: kind, p_note: cleanString(note, 300) });
}

export function postOutdoorRouteHazard(route: RunningRouteTemplate, kind: RouteHazardKind, severity: number, note = "") {
  return rpcWrite("ms_post_running_route_hazard", { p_route_key: outdoorRouteKey(route), p_kind: kind, p_severity: Math.max(1, Math.min(3, Math.round(severity))), p_note: cleanString(note, 400) });
}

export function createOutdoorRouteOuting(route: RunningRouteTemplate, input: { startsAt: string; pace: RouteOutingPace; maxPeople: number; note?: string }) {
  return rpcWrite("ms_create_running_route_outing", { p_route_key: outdoorRouteKey(route), p_starts_at: new Date(input.startsAt).toISOString(), p_pace: input.pace, p_max_people: Math.max(2, Math.min(30, Math.round(input.maxPeople))), p_note: cleanString(input.note, 400) });
}

export function joinOutdoorRouteOuting(outingId: string, join = true) {
  return rpcWrite("ms_join_running_route_outing", { p_outing_id: outingId, p_join: join });
}

export async function uploadOutdoorRouteCommunityPhoto(route: RunningRouteTemplate, file: File, caption = "") {
  if (!file || !String(file.type || "").startsWith("image/")) return { ok: false as const, reason: "invalid-file" as const };
  if (file.size > 10 * 1024 * 1024) return { ok: false as const, reason: "too-large" as const };
  try {
    const { data: userData, error: userError } = await supabase.auth.getUser();
    const userId = userData?.user?.id;
    if (userError || !userId) return { ok: false as const, reason: "auth-required" as const };
    const ext = String(file.name || "photo.jpg").split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
    const routeKey = outdoorRouteKey(route).replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 90);
    const path = `${userId}/${routeKey}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error: uploadError } = await supabase.storage.from("route-community").upload(path, file, { upsert: false, contentType: file.type || "image/jpeg", cacheControl: "86400" });
    if (uploadError) return { ok: false as const, reason: String(uploadError.message || "").toLowerCase().includes("bucket") ? "backend-not-installed" as const : "upload-error" as const };
    const { data: urlData } = supabase.storage.from("route-community").getPublicUrl(path);
    const publicUrl = String(urlData?.publicUrl || "");
    if (!publicUrl) return { ok: false as const, reason: "url-error" as const };
    const result = await rpcWrite("ms_publish_running_route_photo", { p_route_key: outdoorRouteKey(route), p_storage_path: path, p_public_url: publicUrl, p_caption: cleanString(caption, 300) });
    return result.ok ? { ok: true as const, publicUrl } : result;
  } catch { return { ok: false as const, reason: "offline" as const }; }
}
