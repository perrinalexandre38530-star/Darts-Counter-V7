import { supabase, isSupabaseRestCircuitOpen, supabaseRestRetryAfterMs } from "./supabaseClient";

export type CloudPublicUser = {
  id: string;
  userId?: string;
  nickname?: string;
  displayName?: string;
  avatarUrl?: string | null;
  country?: string | null;
  countryCode?: string | null;
  status?: "online" | "away" | "offline" | string;
  lastSeenAt?: string | null;
  friendshipId?: string;
  createdAt?: string;
};


export type CommunityPulseMember = {
  userId: string;
  displayName?: string;
  avatarUrl?: string | null;
  countryCode?: string | null;
  cityLabel?: string | null;
  status?: "online" | "away" | "offline" | string;
  createdAt?: string | null;
  lastSeenAt?: string | null;
};

export type CommunityPulse = {
  members: number;
  active24h: number;
  active7d: number;
  onlineNow: number;
  new7d: number;
  recentMembers: CommunityPulseMember[];
  activeMembers: CommunityPulseMember[];
  generatedAt?: string | null;
};

export type CloudFriendRequest = {
  id: string;
  status: string;
  message?: string | null;
  direction?: "incoming" | "outgoing";
  createdAt?: string;
  updatedAt?: string;
  respondedAt?: string | null;
  fromUser?: CloudPublicUser;
  toUser?: CloudPublicUser;
};

export type CloudPrivateMessage = {
  id: string;
  threadId?: string;
  text: string;
  status?: string;
  createdAt?: string;
  readAt?: string | null;
  direction?: "incoming" | "outgoing";
  fromUser?: CloudPublicUser;
  toUser?: CloudPublicUser;
  metadata?: any;
  editedAt?: string | null;
};

function rpcError(error: any, fallback: string): never {
  const out: any = new Error(String(error?.message || error?.details || error?.hint || fallback));
  out.code = error?.code || null;
  out.status = error?.status || error?.statusCode || null;
  out.details = error?.details || null;
  out.hint = error?.hint || null;
  throw out;
}

function assertSupabaseDataPlaneAvailable(): void {
  if (!isSupabaseRestCircuitOpen()) return;
  const retryMs = Math.max(1000, supabaseRestRetryAfterMs());
  const error: any = new Error(`Supabase data-plane temporairement suspendue. Nouvel essai dans ${Math.ceil(retryMs / 1000)} s.`);
  error.code = "PGRST002";
  error.status = 503;
  error.mssCircuitOpen = true;
  error.retryAfterMs = retryMs;
  throw error;
}

export type CloudMessageCenterSummary = {
  unreadMessages: number;
  friendRequests: number;
  sharedMatches: number;
  total: number;
  newestLabel: string;
  newestKey: string;
};

function rows(data: any): any[] {
  if (Array.isArray(data)) return data;
  if (data == null) return [];
  return [data];
}

export async function touchPublicProfile(input: { displayName?: string | null; avatarUrl?: string | null; countryCode?: string | null; cityLabel?: string | null } = {}) {
  const { error } = await supabase.rpc("ms_touch_public_profile", {
    p_display_name: input.displayName || null,
    p_avatar_url: input.avatarUrl || null,
    p_country_code: input.countryCode || null,
    p_city_label: input.cityLabel || null,
  } as any);
  if (error) rpcError(error, "Impossible de publier le profil public.");
}

export async function cloudSearchUsers(query: string): Promise<CloudPublicUser[]> {
  const { data, error } = await supabase.rpc("ms_search_players", { p_query: query, p_limit: 25 } as any);
  if (error) rpcError(error, "Recherche de joueurs indisponible.");
  return rows(data).filter(Boolean) as CloudPublicUser[];
}

export async function cloudSendFriendRequest(toUserId: string, message?: string) {
  const { data, error } = await supabase.rpc("ms_send_friend_request", { p_to_user_id: toUserId, p_message: message || null } as any);
  if (error) rpcError(error, "Impossible d'envoyer la demande d'ami.");
  return Array.isArray(data) ? data[0] : data;
}

export async function cloudListFriendRequests(): Promise<CloudFriendRequest[]> {
  assertSupabaseDataPlaneAvailable();
  const { data, error } = await supabase.rpc("ms_list_friend_requests");
  if (error) rpcError(error, "Impossible de charger les demandes d'amis.");
  return rows(data) as CloudFriendRequest[];
}

export async function cloudRespondFriendRequest(id: string, status: "accepted" | "rejected") {
  const { data, error } = await supabase.rpc("ms_respond_friend_request", { p_request_id: id, p_status: status } as any);
  if (error) rpcError(error, "Impossible de répondre à la demande d'ami.");
  return Array.isArray(data) ? data[0] : data;
}

export async function cloudListFriends(): Promise<CloudPublicUser[]> {
  assertSupabaseDataPlaneAvailable();
  const { data, error } = await supabase.rpc("ms_list_friends");
  if (error) rpcError(error, "Impossible de charger les amis.");
  return rows(data) as CloudPublicUser[];
}

export async function cloudRemoveFriend(userId: string) {
  const { data, error } = await supabase.rpc("ms_remove_friend", { p_friend_user_id: userId } as any);
  if (error) rpcError(error, "Impossible de retirer cet ami.");
  return data;
}


export async function cloudCommunityHeartbeat(status: "online" | "away" | "offline" = "online") {
  assertSupabaseDataPlaneAvailable();
  // Compatibilité backend : certaines instances Supabase n'ont pas encore reçu
  // la migration ms_community_heartbeat (2026-09-02). ms_update_presence existe
  // depuis la première version ONLINE et met à jour la même table ms_presence.
  // Cela évite un POST 404 toutes les 60 s et garde la présence fonctionnelle.
  const { data, error } = await supabase.rpc("ms_update_presence", { p_status: status } as any);
  if (error) rpcError(error, "Impossible de mettre à jour l'activité communautaire.");
  return data;
}

export async function cloudGetCommunityPulse(recentLimit = 8): Promise<CommunityPulse> {
  assertSupabaseDataPlaneAvailable();
  const { data, error } = await supabase.rpc("ms_get_community_pulse", {
    p_recent_limit: Math.max(1, Math.min(20, Number(recentLimit) || 8)),
  } as any);
  if (error) rpcError(error, "Impossible de charger la communauté.");
  const value: any = Array.isArray(data) ? data[0] : data;
  return {
    members: Number(value?.members || 0),
    active24h: Number(value?.active24h || 0),
    active7d: Number(value?.active7d || 0),
    onlineNow: Number(value?.onlineNow || 0),
    new7d: Number(value?.new7d || 0),
    recentMembers: Array.isArray(value?.recentMembers) ? value.recentMembers : [],
    activeMembers: Array.isArray(value?.activeMembers) ? value.activeMembers : [],
    generatedAt: value?.generatedAt || null,
  };
}

export async function cloudUpdatePresence(status: "online" | "away" | "offline") {
  assertSupabaseDataPlaneAvailable();
  const { data, error } = await supabase.rpc("ms_update_presence", { p_status: status } as any);
  if (error) rpcError(error, "Impossible de mettre à jour la présence.");
  return data;
}

export async function cloudListPrivateMessages(options: number | { limit?: number; compact?: boolean } = {}): Promise<CloudPrivateMessage[]> {
  assertSupabaseDataPlaneAvailable();
  const opts = typeof options === "number" ? { limit: options } : (options || {});
  const limit = Math.max(1, Math.min(250, Number(opts.limit || 120)));
  const compact = opts.compact !== false;

  if (compact) {
    const compactResult = await supabase.rpc("ms_list_private_messages_compact", { p_limit: limit } as any);
    if (!compactResult.error) return rows(compactResult.data) as CloudPrivateMessage[];
    const code = String((compactResult.error as any)?.code || "");
    const message = String((compactResult.error as any)?.message || "");
    if (!(code === "PGRST202" || code === "42883" || /ms_list_private_messages_compact|function .* does not exist/i.test(message))) {
      rpcError(compactResult.error, "Impossible de charger les messages privés.");
    }
  }

  const { data, error } = await supabase.rpc("ms_list_private_messages", { p_limit: limit } as any);
  if (error) rpcError(error, "Impossible de charger les messages privés.");
  return rows(data) as CloudPrivateMessage[];
}

export async function cloudGetMessageCenterSummary(): Promise<CloudMessageCenterSummary> {
  assertSupabaseDataPlaneAvailable();
  const { data, error } = await supabase.rpc("ms_message_center_summary", {} as any);
  if (!error) {
    const value: any = Array.isArray(data) ? data[0] : data;
    return {
      unreadMessages: Math.max(0, Number(value?.unreadMessages ?? value?.unread_messages ?? 0) || 0),
      friendRequests: Math.max(0, Number(value?.friendRequests ?? value?.friend_requests ?? 0) || 0),
      sharedMatches: Math.max(0, Number(value?.sharedMatches ?? value?.shared_matches ?? 0) || 0),
      total: Math.max(0, Number(value?.total || 0) || 0),
      newestLabel: String(value?.newestLabel ?? value?.newest_label ?? ""),
      newestKey: String(value?.newestKey ?? value?.newest_key ?? ""),
    };
  }

  const code = String((error as any)?.code || "");
  const message = String((error as any)?.message || "");
  if (!(code === "PGRST202" || code === "42883" || /ms_message_center_summary|function .* does not exist/i.test(message))) {
    rpcError(error, "Impossible de charger le résumé de messagerie.");
  }

  // Compatibilité avec un backend qui n'a pas encore reçu la migration V135 :
  // lecture bornée et compacte, jamais 500 messages x plusieurs appels.
  const [messages, requests] = await Promise.all([
    cloudListPrivateMessages({ limit: 60, compact: true }).catch(() => [] as CloudPrivateMessage[]),
    cloudListFriendRequests().catch(() => [] as CloudFriendRequest[]),
  ]);
  const incomingUnread = messages.filter((m: any) => m?.direction !== "outgoing" && !m?.readAt);
  const sharedMatches = incomingUnread.filter((m: any) => m?.metadata?.type === "mss-shared-match-v1").length;
  const unreadMessages = incomingUnread.length - sharedMatches;
  const friendRequests = requests.filter((r: any) => r?.direction !== "outgoing" && String(r?.status || "pending") === "pending").length;
  const newest = incomingUnread.slice().sort((a: any, b: any) => Date.parse(String(b?.createdAt || "")) - Date.parse(String(a?.createdAt || "")))[0];
  const total = unreadMessages + sharedMatches + friendRequests;
  return {
    unreadMessages, friendRequests, sharedMatches, total,
    newestLabel: newest ? (newest?.metadata?.type === "mss-shared-match-v1" ? "Nouvelle partie partagée" : "Nouveau message") : (friendRequests ? "Nouvelle demande d’ami" : ""),
    newestKey: newest?.id ? `msg:${newest.id}` : (friendRequests ? `friend:${requests.find((r: any) => r?.direction !== "outgoing" && String(r?.status || "pending") === "pending")?.id || friendRequests}` : ""),
  };
}

export async function cloudSendPrivateMessage(toUserId: string, text: string, metadata?: any) {
  const { data, error } = await supabase.rpc("ms_send_private_message", { p_to_user_id: toUserId, p_text: text, p_metadata: metadata || {} } as any);
  if (error) rpcError(error, "Impossible d'envoyer le message.");
  return Array.isArray(data) ? data[0] : data;
}

export async function cloudEditPrivateMessage(id: string, text: string) {
  const { data, error } = await supabase.rpc("ms_edit_private_message", { p_message_id: id, p_text: text } as any);
  if (error) rpcError(error, "Impossible de modifier le message.");
  return Array.isArray(data) ? data[0] : data;
}

export async function cloudMarkPrivateMessageRead(id: string) {
  const { data, error } = await supabase.rpc("ms_mark_private_message_read", { p_message_id: id } as any);
  if (error) rpcError(error, "Impossible de marquer le message comme lu.");
  return data;
}

export async function cloudMarkPrivateThreadRead(friendUserId: string) {
  const { data, error } = await supabase.rpc("ms_mark_private_thread_read", { p_friend_user_id: friendUserId } as any);
  if (error) rpcError(error, "Impossible de marquer la conversation comme lue.");
  return data;
}

export async function cloudDeletePrivateMessage(id: string) {
  const { data, error } = await supabase.rpc("ms_delete_private_message", { p_message_id: id } as any);
  if (error) rpcError(error, "Impossible de supprimer le message.");
  return data;
}
