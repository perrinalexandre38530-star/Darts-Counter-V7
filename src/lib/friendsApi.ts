import { apiDelete, apiGet, apiPost, apiPut } from "./apiClient";

export type OnlineFriendUser = {
  id: string;
  userId?: string;
  nickname?: string;
  displayName?: string;
  avatarUrl?: string | null;
  avatarAssetId?: string | null;
  country?: string | null;
  countryCode?: string | null;
  status?: "online" | "away" | "offline" | string;
  lastSeenAt?: string | null;
  friendshipId?: string;
  createdAt?: string;
};

export type FriendRequest = {
  id: string;
  status: "pending" | "accepted" | "rejected" | string;
  message?: string | null;
  direction?: "incoming" | "outgoing";
  createdAt?: string;
  updatedAt?: string;
  respondedAt?: string | null;
  fromUser?: OnlineFriendUser;
  toUser?: OnlineFriendUser;
};

export type SharedOnlineItem = {
  id: string;
  type: "stats" | "match" | "score" | "snapshot" | string;
  title?: string | null;
  sport?: string | null;
  matchId?: string | null;
  payload?: any;
  createdAt?: string;
  readAt?: string | null;
  direction?: "incoming" | "outgoing";
  ownerUser?: OnlineFriendUser;
  targetUserId?: string;
};

function qs(value: string) {
  return encodeURIComponent(String(value || "").trim());
}

export async function searchUsers(query: string): Promise<OnlineFriendUser[]> {
  const res = await apiGet(`/online/users/search?q=${qs(query)}`);
  return Array.isArray(res?.users) ? res.users : [];
}

export async function sendFriendRequest(toUserId: string, message?: string) {
  const res = await apiPost("/online/friend-requests", { toUserId, message });
  return res?.request ?? res;
}

export async function listFriendRequests(): Promise<FriendRequest[]> {
  const res = await apiGet("/online/friend-requests");
  return Array.isArray(res?.requests) ? res.requests : [];
}

export async function respondFriendRequest(
  requestId: string,
  status: "accepted" | "rejected"
) {
  const res = await apiPost(`/online/friend-requests/${qs(requestId)}/respond`, { status });
  return res?.request ?? res;
}

export async function listFriends(): Promise<OnlineFriendUser[]> {
  const res = await apiGet("/online/friends");
  return Array.isArray(res?.friends) ? res.friends : [];
}

export async function removeFriend(userId: string) {
  return apiDelete(`/online/friends/${qs(userId)}`);
}

export async function updatePresence(status: "online" | "away" | "offline") {
  return apiPut("/online/presence", { status });
}

export async function shareWithFriend(input: {
  targetUserId: string;
  type: "stats" | "match" | "score" | "snapshot";
  title?: string;
  sport?: string;
  matchId?: string;
  payload?: any;
}) {
  const res = await apiPost("/online/share", input);
  return res?.item ?? res;
}

export async function listSharedItems(): Promise<SharedOnlineItem[]> {
  const res = await apiGet("/online/shared");
  return Array.isArray(res?.items) ? res.items : [];
}

export async function markSharedItemRead(id: string) {
  const res = await apiPut(`/online/shared/${qs(id)}/read`, {});
  return res?.item ?? res;
}

export type SharedMatchItem = {
  id: string;
  type?: string;
  title?: string | null;
  sport?: string | null;
  matchId?: string | null;
  status?: "pending" | "accepted" | "refused" | "imported" | string;
  message?: string | null;
  payload?: any;
  createdAt?: string;
  readAt?: string | null;
  acceptedAt?: string | null;
  refusedAt?: string | null;
  importedAt?: string | null;
  direction?: "incoming" | "outgoing";
  ownerUser?: OnlineFriendUser & { email?: string | null };
  targetUser?: OnlineFriendUser & { email?: string | null };
};

export async function shareMatchToFriend(input: {
  targetUserId: string;
  title?: string;
  sport?: string;
  matchId?: string;
  message?: string;
  payload: any;
}) {
  const res = await apiPost("/online/share-match", input);
  return res?.item ?? res;
}

export async function listSharedMatches(): Promise<SharedMatchItem[]> {
  const res = await apiGet("/online/shared-matches");
  return Array.isArray(res?.items) ? res.items : [];
}

export async function countPendingSharedMatches(): Promise<number> {
  const res = await apiGet("/online/shared-matches/count");
  return Number(res?.pending || 0);
}

export async function markSharedMatchRead(id: string) {
  const res = await apiPut(`/online/shared-matches/${qs(id)}/read`, {});
  return res?.item ?? res;
}

export async function acceptSharedMatch(id: string) {
  return apiPost(`/online/shared-matches/${qs(id)}/accept`, {});
}

export async function importSharedMatch(id: string) {
  return apiPost(`/online/shared-matches/${qs(id)}/import`, {});
}

export async function refuseSharedMatch(id: string) {
  const res = await apiPost(`/online/shared-matches/${qs(id)}/refuse`, {});
  return res?.item ?? res;
}

export type ProfileFriendLink = {
  id: string;
  status: "pending" | "accepted" | "refused" | "cancelled" | string;
  localProfileId: string;
  localProfileName?: string | null;
  localProfileAvatarUrl?: string | null;
  statsMeta?: any;
  createdAt?: string;
  updatedAt?: string;
  acceptedAt?: string | null;
  refusedAt?: string | null;
  cancelledAt?: string | null;
  direction?: "incoming" | "outgoing";
  requesterUser?: OnlineFriendUser & { email?: string | null };
  targetUser?: OnlineFriendUser & { email?: string | null };
  statsShared?: boolean;
};

export async function listProfileFriendLinks(): Promise<ProfileFriendLink[]> {
  const res = await apiGet("/online/profile-links");
  return Array.isArray(res?.links) ? res.links : [];
}

export async function countPendingProfileFriendLinks(): Promise<number> {
  const res = await apiGet("/online/profile-links/count");
  return Number(res?.pending || 0);
}

export async function requestProfileFriendLink(input: {
  targetUserId: string;
  localProfileId: string;
  localProfileName?: string;
  localProfileAvatarUrl?: string | null;
  statsMeta?: any;
}) {
  const res = await apiPost("/online/profile-links", input);
  return res?.link ?? res;
}

export async function respondProfileFriendLink(id: string, status: "accepted" | "refused") {
  const res = await apiPost(`/online/profile-links/${qs(id)}/respond`, { status });
  return res?.link ?? res;
}

export async function deleteProfileFriendLink(id: string) {
  const res = await apiDelete(`/online/profile-links/${qs(id)}`);
  return res?.link ?? res;
}


export type PrivateMessageItem = {
  id: string;
  threadId?: string;
  text: string;
  status?: "sent" | "read" | string;
  createdAt?: string;
  readAt?: string | null;
  direction?: "incoming" | "outgoing";
  fromUser?: OnlineFriendUser & { email?: string | null };
  toUser?: OnlineFriendUser & { email?: string | null };
};

export async function listPrivateMessages(): Promise<PrivateMessageItem[]> {
  const res = await apiGet("/online/private-messages");
  return Array.isArray(res?.messages) ? res.messages : [];
}

export async function sendPrivateMessage(toUserId: string, text: string) {
  const res = await apiPost("/online/private-messages", { toUserId, text });
  return res?.message ?? res;
}

export async function markPrivateMessageRead(id: string) {
  // Backend accepte PUT + POST : on garde PUT pour compat avec le frontend existant.
  const res = await apiPut(`/online/private-messages/${qs(id)}/read`, {});
  return res?.message ?? res;
}

export async function markPrivateThreadRead(friendUserId: string) {
  const res = await apiPost(`/online/private-messages/thread/${qs(friendUserId)}/read`, {});
  return res?.messages ?? res?.items ?? res;
}

export async function deletePrivateMessage(id: string) {
  const res = await apiDelete(`/online/private-messages/${qs(id)}`);
  return res?.message ?? res;
}
