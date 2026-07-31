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
  /** Coordonnées volontairement arrondies côté SQL, jamais la position brute. */
  mapLat?: number | null;
  mapLng?: number | null;
  /** Direction arrondie par secteur de 45° pour le fallback cartographique. */
  bearingDeg?: number | null;
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

export type NearbyEncounter = {
  userId: string;
  displayName: string;
  avatarUrl?: string | null;
  countryCode?: string | null;
  cityLabel?: string | null;
  sports: string[];
  skillLevel?: number | null;
  crossedCount: number;
  closestDistanceKm: number;
  distanceLabel: string;
  firstCrossedAt?: string | null;
  lastCrossedAt?: string | null;
  availableNow?: boolean;
  lookingForGame?: boolean;
};

export type NearbyPlaceKind = "club" | "team" | "tournament" | "venue";

export type NearbyPlace = {
  id: string;
  ownerUserId: string;
  ownerDisplayName?: string | null;
  ownerAvatarUrl?: string | null;
  organizerLabel?: string | null;
  kind: NearbyPlaceKind;
  title: string;
  description?: string | null;
  sport: string;
  areaLabel?: string | null;
  distanceKm: number;
  distanceLabel: string;
  mapLat?: number | null;
  mapLng?: number | null;
  startsAt?: string | null;
  endsAt?: string | null;
  preciseLocation: boolean;
  metadata?: Record<string, any>;
  maxParticipants?: number | null;
  acceptedCount?: number;
  minSkillLevel?: number | null;
  maxSkillLevel?: number | null;
  coverUrl?: string | null;
  myRequestStatus?: string | null;
  myRequestId?: string | null;
  isOwner?: boolean;
  createdAt?: string | null;
};

export type NearbyPlaceRequestType = "join" | "participate" | "challenge" | "contact";

export type NearbyPlaceRequest = {
  id: string;
  placeId: string;
  placeTitle: string;
  placeKind: NearbyPlaceKind;
  sport: string;
  userId: string;
  userDisplayName?: string | null;
  userAvatarUrl?: string | null;
  ownerUserId: string;
  ownerDisplayName?: string | null;
  requestType: NearbyPlaceRequestType;
  status: "pending" | "accepted" | "rejected" | "cancelled";
  message?: string | null;
  partySize: number;
  direction: "incoming" | "outgoing";
  createdAt?: string | null;
  updatedAt?: string | null;
  respondedAt?: string | null;
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
    mapLat: row?.mapLat == null && row?.map_lat == null ? null : Number(row?.mapLat ?? row?.map_lat),
    mapLng: row?.mapLng == null && row?.map_lng == null ? null : Number(row?.mapLng ?? row?.map_lng),
    bearingDeg: row?.bearingDeg == null && row?.bearing_deg == null ? null : Number(row?.bearingDeg ?? row?.bearing_deg),
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

export async function listNearbyEncounters(limit = 100): Promise<NearbyEncounter[]> {
  const { data, error } = await supabase.rpc("ms_list_nearby_encounters", { p_limit: Math.max(1, Math.min(200, limit)) } as any);
  if (error) fail(error, "Impossible de charger les joueurs croisés.");
  return (Array.isArray(data) ? data : []).map((row: any) => ({
    userId: String(row?.userId ?? row?.user_id ?? ""),
    displayName: String(row?.displayName ?? row?.display_name ?? "Joueur"),
    avatarUrl: row?.avatarUrl ?? row?.avatar_url ?? null,
    countryCode: row?.countryCode ?? row?.country_code ?? null,
    cityLabel: row?.cityLabel ?? row?.city_label ?? null,
    sports: Array.isArray(row?.sports) ? row.sports : [],
    skillLevel: row?.skillLevel ?? row?.skill_level ?? null,
    crossedCount: Number(row?.crossedCount ?? row?.crossed_count ?? 1),
    closestDistanceKm: Number(row?.closestDistanceKm ?? row?.closest_distance_km ?? 50),
    distanceLabel: String(row?.distanceLabel ?? row?.distance_label ?? "Croisé à proximité"),
    firstCrossedAt: row?.firstCrossedAt ?? row?.first_crossed_at ?? null,
    lastCrossedAt: row?.lastCrossedAt ?? row?.last_crossed_at ?? null,
    availableNow: !!(row?.availableNow ?? row?.available_now),
    lookingForGame: !!(row?.lookingForGame ?? row?.looking_for_game),
  })).filter((row: NearbyEncounter) => !!row.userId);
}

export async function clearNearbyEncounters(): Promise<void> {
  const { error } = await supabase.rpc("ms_clear_nearby_encounters");
  if (error) fail(error, "Impossible d'effacer les rencontres récentes.");
}

export async function findNearbyPlaces(input: { radiusKm: number; sport?: string | null; kinds?: NearbyPlaceKind[]; limit?: number }): Promise<NearbyPlace[]> {
  const { data, error } = await supabase.rpc("ms_find_nearby_places", {
    p_radius_km: Math.max(1, Math.min(100, Number(input.radiusKm || 10))),
    p_sport: input.sport || null,
    p_kinds: input.kinds || [],
    p_limit: Math.max(1, Math.min(200, Number(input.limit || 100))),
  } as any);
  if (error) fail(error, "Impossible de charger les clubs et événements proches.");
  return (Array.isArray(data) ? data : []).map((row: any) => ({
    id: String(row?.id || ""),
    ownerUserId: String(row?.ownerUserId ?? row?.owner_user_id ?? ""),
    kind: String(row?.kind || "venue") as NearbyPlaceKind,
    title: String(row?.title || "Lieu local"),
    description: row?.description ?? null,
    sport: String(row?.sport || "generic"),
    areaLabel: row?.areaLabel ?? row?.area_label ?? null,
    distanceKm: Number(row?.distanceKm ?? row?.distance_km ?? 0),
    distanceLabel: String(row?.distanceLabel ?? row?.distance_label ?? "À proximité"),
    mapLat: row?.mapLat == null && row?.map_lat == null ? null : Number(row?.mapLat ?? row?.map_lat),
    mapLng: row?.mapLng == null && row?.map_lng == null ? null : Number(row?.mapLng ?? row?.map_lng),
    startsAt: row?.startsAt ?? row?.starts_at ?? null,
    endsAt: row?.endsAt ?? row?.ends_at ?? null,
    preciseLocation: !!(row?.preciseLocation ?? row?.precise_location),
    metadata: row?.metadata && typeof row.metadata === "object" ? row.metadata : {},
    maxParticipants: row?.maxParticipants == null && row?.max_participants == null ? null : Number(row?.maxParticipants ?? row?.max_participants),
    acceptedCount: Number(row?.acceptedCount ?? row?.accepted_count ?? 0),
    minSkillLevel: row?.minSkillLevel == null && row?.min_skill_level == null ? null : Number(row?.minSkillLevel ?? row?.min_skill_level),
    maxSkillLevel: row?.maxSkillLevel == null && row?.max_skill_level == null ? null : Number(row?.maxSkillLevel ?? row?.max_skill_level),
    coverUrl: row?.coverUrl ?? row?.cover_url ?? null,
    organizerLabel: row?.organizerLabel ?? row?.organizer_label ?? null,
    ownerDisplayName: row?.ownerDisplayName ?? row?.owner_display_name ?? null,
    ownerAvatarUrl: row?.ownerAvatarUrl ?? row?.owner_avatar_url ?? null,
    myRequestStatus: row?.myRequestStatus ?? row?.my_request_status ?? null,
    myRequestId: row?.myRequestId ?? row?.my_request_id ?? null,
    isOwner: !!(row?.isOwner ?? row?.is_owner),
    createdAt: row?.createdAt ?? row?.created_at ?? null,
  })).filter((row: NearbyPlace) => !!row.id);
}

export async function publishNearbyPlace(input: {
  kind: NearbyPlaceKind;
  title: string;
  description?: string | null;
  sport: string;
  latitude: number;
  longitude: number;
  areaLabel?: string | null;
  startsAt?: string | null;
  endsAt?: string | null;
  preciseLocation?: boolean;
  metadata?: Record<string, any>;
  maxParticipants?: number | null;
  minSkillLevel?: number | null;
  maxSkillLevel?: number | null;
  coverUrl?: string | null;
  organizerLabel?: string | null;
}): Promise<NearbyPlace> {
  const args = {
    p_kind: input.kind,
    p_title: input.title,
    p_description: input.description || null,
    p_sport: input.sport,
    p_latitude: input.latitude,
    p_longitude: input.longitude,
    p_area_label: input.areaLabel || null,
    p_starts_at: input.startsAt || null,
    p_ends_at: input.endsAt || null,
    p_precise_location: !!input.preciseLocation,
    p_metadata: input.metadata || {},
    p_max_participants: input.maxParticipants ?? null,
    p_min_skill_level: input.minSkillLevel ?? null,
    p_max_skill_level: input.maxSkillLevel ?? null,
    p_cover_url: input.coverUrl || null,
    p_organizer_label: input.organizerLabel || null,
  } as any;
  let result = await supabase.rpc("ms_publish_nearby_place_v2", args);
  if (result.error && /ms_publish_nearby_place_v2|PGRST202|could not find the function/i.test(String(result.error?.message || result.error))) {
    result = await supabase.rpc("ms_publish_nearby_place", {
      p_kind: input.kind,
      p_title: input.title,
      p_description: input.description || null,
      p_sport: input.sport,
      p_latitude: input.latitude,
      p_longitude: input.longitude,
      p_area_label: input.areaLabel || null,
      p_starts_at: input.startsAt || null,
      p_ends_at: input.endsAt || null,
      p_precise_location: !!input.preciseLocation,
      p_metadata: input.metadata || {},
    } as any);
  }
  if (result.error) fail(result.error, "Impossible de publier ce point local.");
  const row: any = Array.isArray(result.data) ? result.data[0] : result.data;
  return {
    id: String(row?.id || ""), ownerUserId: String(row?.ownerUserId ?? row?.owner_user_id ?? ""),
    ownerDisplayName: row?.ownerDisplayName ?? row?.owner_display_name ?? input.organizerLabel ?? null,
    organizerLabel: row?.organizerLabel ?? row?.organizer_label ?? input.organizerLabel ?? null,
    kind: String(row?.kind || input.kind) as NearbyPlaceKind, title: String(row?.title || input.title), description: row?.description ?? input.description ?? null,
    sport: String(row?.sport || input.sport), areaLabel: row?.areaLabel ?? row?.area_label ?? input.areaLabel ?? null,
    distanceKm: Number(row?.distanceKm ?? 0), distanceLabel: String(row?.distanceLabel || "Publié"),
    mapLat: row?.mapLat == null ? input.latitude : Number(row.mapLat), mapLng: row?.mapLng == null ? input.longitude : Number(row.mapLng),
    startsAt: row?.startsAt ?? input.startsAt ?? null, endsAt: row?.endsAt ?? input.endsAt ?? null,
    preciseLocation: !!(row?.preciseLocation ?? input.preciseLocation), metadata: row?.metadata || input.metadata || {},
    maxParticipants: row?.maxParticipants == null ? input.maxParticipants ?? null : Number(row.maxParticipants),
    acceptedCount: Number(row?.acceptedCount ?? 0),
    minSkillLevel: row?.minSkillLevel == null ? input.minSkillLevel ?? null : Number(row.minSkillLevel),
    maxSkillLevel: row?.maxSkillLevel == null ? input.maxSkillLevel ?? null : Number(row.maxSkillLevel),
    coverUrl: row?.coverUrl ?? input.coverUrl ?? null,
    myRequestStatus: null, myRequestId: null, isOwner: true,
    createdAt: row?.createdAt ?? new Date().toISOString(),
  };
}

function mapPlaceRequest(row: any): NearbyPlaceRequest {
  const direction = String(row?.direction || "incoming") === "outgoing" ? "outgoing" : "incoming";
  const rawStatus = String(row?.status || "pending");
  const status: NearbyPlaceRequest["status"] = ["accepted", "rejected", "cancelled"].includes(rawStatus) ? rawStatus as NearbyPlaceRequest["status"] : "pending";
  const rawType = String(row?.requestType ?? row?.request_type ?? "contact");
  const requestType: NearbyPlaceRequestType = ["join", "participate", "challenge"].includes(rawType) ? rawType as NearbyPlaceRequestType : "contact";
  return {
    id: String(row?.id || ""),
    placeId: String(row?.placeId ?? row?.place_id ?? ""),
    placeTitle: String(row?.placeTitle ?? row?.place_title ?? "Point local"),
    placeKind: String(row?.placeKind ?? row?.place_kind ?? "venue") as NearbyPlaceKind,
    sport: String(row?.sport || "generic"),
    userId: String(row?.userId ?? row?.user_id ?? ""),
    userDisplayName: row?.userDisplayName ?? row?.user_display_name ?? null,
    userAvatarUrl: row?.userAvatarUrl ?? row?.user_avatar_url ?? null,
    ownerUserId: String(row?.ownerUserId ?? row?.owner_user_id ?? ""),
    ownerDisplayName: row?.ownerDisplayName ?? row?.owner_display_name ?? null,
    requestType, status,
    message: row?.message ?? null,
    partySize: Math.max(1, Number(row?.partySize ?? row?.party_size ?? 1)),
    direction,
    createdAt: row?.createdAt ?? row?.created_at ?? null,
    updatedAt: row?.updatedAt ?? row?.updated_at ?? null,
    respondedAt: row?.respondedAt ?? row?.responded_at ?? null,
  };
}

export async function sendNearbyPlaceRequest(input: { placeId: string; requestType: NearbyPlaceRequestType; message?: string | null; partySize?: number }): Promise<NearbyPlaceRequest> {
  const { data, error } = await supabase.rpc("ms_send_nearby_place_request", {
    p_place_id: input.placeId,
    p_request_type: input.requestType,
    p_message: input.message || null,
    p_party_size: Math.max(1, Math.min(50, Number(input.partySize || 1))),
  } as any);
  if (error) fail(error, "Impossible d'envoyer cette demande locale.");
  return mapPlaceRequest(Array.isArray(data) ? data[0] : data);
}

export async function listNearbyPlaceRequests(limit = 100): Promise<NearbyPlaceRequest[]> {
  const { data, error } = await supabase.rpc("ms_list_nearby_place_requests", { p_limit: Math.max(1, Math.min(200, limit)) } as any);
  if (error) fail(error, "Impossible de charger les demandes locales.");
  return (Array.isArray(data) ? data : []).map(mapPlaceRequest).filter((row) => !!row.id);
}

export async function respondNearbyPlaceRequest(id: string, status: "accepted" | "rejected"): Promise<void> {
  const { error } = await supabase.rpc("ms_respond_nearby_place_request", { p_request_id: id, p_status: status } as any);
  if (error) fail(error, "Impossible de répondre à cette demande locale.");
}

export async function cancelNearbyPlaceRequest(id: string): Promise<void> {
  const { error } = await supabase.rpc("ms_cancel_nearby_place_request", { p_request_id: id } as any);
  if (error) fail(error, "Impossible d'annuler cette demande locale.");
}

export async function deleteNearbyPlace(id: string): Promise<void> {
  const { error } = await supabase.rpc("ms_delete_nearby_place", { p_place_id: id } as any);
  if (error) fail(error, "Impossible de supprimer ce point local.");
}
