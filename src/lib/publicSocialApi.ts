import { supabase } from "./supabaseClient";

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
  throw new Error(String(error?.message || error?.details || error?.hint || fallback));
}

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
  // Compatibilité backend : certaines instances Supabase n'ont pas encore reçu
  // la migration ms_community_heartbeat (2026-09-02). ms_update_presence existe
  // depuis la première version ONLINE et met à jour la même table ms_presence.
  // Cela évite un POST 404 toutes les 60 s et garde la présence fonctionnelle.
  const { data, error } = await supabase.rpc("ms_update_presence", { p_status: status } as any);
  if (error) rpcError(error, "Impossible de mettre à jour l'activité communautaire.");
  return data;
}

export async function cloudGetCommunityPulse(recentLimit = 8): Promise<CommunityPulse> {
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
  const { data, error } = await supabase.rpc("ms_update_presence", { p_status: status } as any);
  if (error) rpcError(error, "Impossible de mettre à jour la présence.");
  return data;
}

export async function cloudListPrivateMessages(): Promise<CloudPrivateMessage[]> {
  const { data, error } = await supabase.rpc("ms_list_private_messages", { p_limit: 500 } as any);
  if (error) rpcError(error, "Impossible de charger les messages privés.");
  return rows(data) as CloudPrivateMessage[];
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
