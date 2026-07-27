import { supabase } from "./supabaseClient";

export type NearbyPlayer = {
  userId: string;
  displayName: string;
  avatarUrl?: string | null;
  countryCode?: string | null;
  cityLabel?: string | null;
  distanceKm: number;
  distanceLabel: string;
  sports: string[];
  skillLevel?: number | null;
  availableNow: boolean;
  lookingForGame: boolean;
  preferredModes: string[];
  updatedAt?: string | null;
};

export type NearbySettings = {
  visible: boolean;
  radiusKm: number;
  sports: string[];
  skillLevel?: number | null;
  availableNow: boolean;
  lookingForGame: boolean;
  preferredModes: string[];
  areaLabel?: string | null;
  updatedAt?: string | null;
  hasLocation: boolean;
};

export type NearbyGameRequest = {
  id: string;
  fromUserId: string;
  toUserId: string;
  fromDisplayName?: string | null;
  toDisplayName?: string | null;
  sport: string;
  modes: string[];
  message?: string | null;
  status: string;
  direction: "incoming" | "outgoing";
  createdAt?: string | null;
  expiresAt?: string | null;
};

function fail(error: any, fallback: string): never {
  throw new Error(String(error?.message || error?.details || error?.hint || fallback));
}

function mapSettings(row: any, fallback?: Partial<NearbySettings>): NearbySettings {
  return {
    visible: !!(row?.visible ?? fallback?.visible),
    radiusKm: Number(row?.radiusKm ?? row?.radius_km ?? fallback?.radiusKm ?? 10),
    sports: Array.isArray(row?.sports) ? row.sports : (fallback?.sports || []),
    skillLevel: row?.skillLevel ?? row?.skill_level ?? fallback?.skillLevel ?? null,
    availableNow: !!(row?.availableNow ?? row?.available_now ?? fallback?.availableNow),
    lookingForGame: !!(row?.lookingForGame ?? row?.looking_for_game ?? fallback?.lookingForGame),
    preferredModes: Array.isArray(row?.preferredModes ?? row?.preferred_modes) ? (row?.preferredModes ?? row?.preferred_modes) : (fallback?.preferredModes || []),
    areaLabel: row?.areaLabel ?? row?.area_label ?? fallback?.areaLabel ?? null,
    updatedAt: row?.updatedAt ?? row?.updated_at ?? fallback?.updatedAt ?? null,
    hasLocation: !!(row?.hasLocation ?? row?.has_location ?? fallback?.hasLocation),
  };
}

export async function loadNearbySettings(): Promise<NearbySettings> {
  const { data, error } = await supabase.rpc("ms_get_nearby_settings");
  if (error) fail(error, "Impossible de lire les réglages de proximité.");
  return mapSettings(Array.isArray(data) ? data[0] : data);
}

export async function saveNearbySettings(input: {
  latitude?: number | null;
  longitude?: number | null;
  visible: boolean;
  radiusKm: number;
  sports: string[];
  skillLevel?: number | null;
  availableNow: boolean;
  lookingForGame: boolean;
  preferredModes?: string[];
  areaLabel?: string | null;
  displayName?: string | null;
  avatarUrl?: string | null;
  countryCode?: string | null;
}): Promise<NearbySettings> {
  const { data, error } = await supabase.rpc("ms_set_nearby_settings", {
    p_latitude: input.latitude ?? null,
    p_longitude: input.longitude ?? null,
    p_visible: !!input.visible,
    p_radius_km: Math.max(1, Math.min(100, Number(input.radiusKm || 10))),
    p_sports: input.sports || [],
    p_skill_level: input.skillLevel ?? null,
    p_available_now: !!input.availableNow,
    p_looking_for_game: !!input.lookingForGame,
    p_preferred_modes: input.preferredModes || [],
    p_area_label: input.areaLabel || null,
    p_display_name: input.displayName || null,
    p_avatar_url: input.avatarUrl || null,
    p_country_code: input.countryCode || null,
  } as any);
  if (error) fail(error, "Impossible d'enregistrer les réglages de proximité.");
  return mapSettings(Array.isArray(data) ? data[0] : data, { ...input, preferredModes: input.preferredModes || [], hasLocation: input.latitude != null && input.longitude != null });
}

export async function findNearbyPlayers(input: { radiusKm: number; sport?: string | null; availableOnly?: boolean; lookingOnly?: boolean }): Promise<NearbyPlayer[]> {
  const { data, error } = await supabase.rpc("ms_find_nearby_players", {
    p_radius_km: Math.max(1, Math.min(100, Number(input.radiusKm || 10))),
    p_sport: input.sport || null,
    p_available_only: !!input.availableOnly,
    p_looking_only: !!input.lookingOnly,
    p_limit: 100,
  } as any);
  if (error) fail(error, "Recherche de joueurs à proximité indisponible.");
  return (Array.isArray(data) ? data : []).map((row: any) => ({
    userId: String(row?.userId ?? row?.user_id ?? ""),
    displayName: String(row?.displayName ?? row?.display_name ?? "Joueur"),
    avatarUrl: row?.avatarUrl ?? row?.avatar_url ?? null,
    countryCode: row?.countryCode ?? row?.country_code ?? null,
    cityLabel: row?.cityLabel ?? row?.city_label ?? null,
    distanceKm: Number(row?.distanceKm ?? row?.distance_km ?? 0),
    distanceLabel: String(row?.distanceLabel ?? row?.distance_label ?? "À proximité"),
    sports: Array.isArray(row?.sports) ? row.sports : [],
    skillLevel: row?.skillLevel ?? row?.skill_level ?? null,
    availableNow: !!(row?.availableNow ?? row?.available_now),
    lookingForGame: !!(row?.lookingForGame ?? row?.looking_for_game),
    preferredModes: Array.isArray(row?.preferredModes ?? row?.preferred_modes) ? (row?.preferredModes ?? row?.preferred_modes) : [],
    updatedAt: row?.updatedAt ?? row?.updated_at ?? null,
  })).filter((row: NearbyPlayer) => !!row.userId);
}

export async function sendNearbyGameRequest(input: { toUserId: string; sport: string; modes?: string[]; message?: string | null }) {
  const { data, error } = await supabase.rpc("ms_send_nearby_game_request", { p_to_user_id: input.toUserId, p_sport: input.sport, p_modes: input.modes || [], p_message: input.message || null } as any);
  if (error) fail(error, "Impossible d'envoyer la proposition de partie.");
  return Array.isArray(data) ? data[0] : data;
}

export async function listNearbyGameRequests(): Promise<NearbyGameRequest[]> {
  const { data, error } = await supabase.rpc("ms_list_nearby_game_requests");
  if (error) fail(error, "Impossible de charger les propositions de partie.");
  return (Array.isArray(data) ? data : []).map((row: any) => ({
    id: String(row?.id || ""), fromUserId: String(row?.fromUserId ?? row?.from_user_id ?? ""), toUserId: String(row?.toUserId ?? row?.to_user_id ?? ""),
    fromDisplayName: row?.fromDisplayName ?? row?.from_display_name ?? null, toDisplayName: row?.toDisplayName ?? row?.to_display_name ?? null,
    sport: String(row?.sport || "generic"), modes: Array.isArray(row?.modes) ? row.modes : [], message: row?.message ?? null,
    status: String(row?.status || "pending"), direction: String(row?.direction || "incoming") === "outgoing" ? "outgoing" : "incoming",
    createdAt: row?.createdAt ?? row?.created_at ?? null, expiresAt: row?.expiresAt ?? row?.expires_at ?? null,
  }));
}

export async function respondNearbyGameRequest(id: string, status: "accepted" | "rejected" | "cancelled") {
  const { data, error } = await supabase.rpc("ms_respond_nearby_game_request", { p_request_id: id, p_status: status } as any);
  if (error) fail(error, "Impossible de répondre à la proposition.");
  return data;
}
