// @ts-nocheck
// ============================================
// src/lib/matchInboxCloud.ts
// Inbox CLOUD NAS pour envoi direct à un ami (compte NAS)
// Remplace l'ancien flux email/Supabase par /online/shared-matches.
// ============================================

import type { MatchSharePacketV1 } from "./matchShare";
import {
  listSharedMatches,
  shareMatchToFriend,
  acceptSharedMatch,
  importSharedMatch,
  refuseSharedMatch,
  type SharedMatchItem,
} from "./friendsApi";

export type InboxRowCloud = {
  id: string;
  created_at: string;
  updated_at?: string;
  from_user: string;
  to_user: string;
  status: "pending" | "accepted" | "refused" | "imported" | string;
  kind: string;
  match_id: string;
  packet: MatchSharePacketV1;
  note?: string | null;
  ownerUser?: any;
  targetUser?: any;
  raw?: SharedMatchItem;
};

function safePacketFromPayload(item: SharedMatchItem): MatchSharePacketV1 | null {
  const payload = item?.payload;
  if (payload?.version === 1 && payload?.app === "multisports-scoring") return payload as MatchSharePacketV1;
  if (payload?.packet?.version === 1 && payload?.packet?.app === "multisports-scoring") return payload.packet as MatchSharePacketV1;
  if (payload?.payload?.version === 1 && payload?.payload?.app === "multisports-scoring") return payload.payload as MatchSharePacketV1;
  return null;
}

function mapSharedMatchToInboxRow(item: SharedMatchItem): InboxRowCloud | null {
  const packet = safePacketFromPayload(item);
  if (!packet) return null;
  return {
    id: String(item.id || ""),
    created_at: String(item.createdAt || new Date().toISOString()),
    updated_at: String(item.importedAt || item.acceptedAt || item.refusedAt || item.readAt || item.createdAt || ""),
    from_user: String(item.ownerUser?.id || item.ownerUser?.userId || ""),
    to_user: String(item.targetUser?.id || item.targetUser?.userId || ""),
    status: item.status || "pending",
    kind: packet.kind || item.sport || "match",
    match_id: packet.matchId || item.matchId || "",
    packet,
    note: item.message || null,
    ownerUser: item.ownerUser || null,
    targetUser: item.targetUser || null,
    raw: item,
  };
}

export async function ensureDirectoryEntry() {
  // NAS friends: plus besoin d'annuaire email opt-in.
  return { ok: true as const, skipped: true as const };
}

export async function sendMatchToFriendUserId(
  targetUserId: string,
  packet: MatchSharePacketV1,
  note?: string
) {
  if (!targetUserId) return { ok: false as const, error: "missing-target" as const };
  try {
    await shareMatchToFriend({
      targetUserId,
      title: packet?.summary?.title || packet?.kind || "Partie partagée",
      sport: packet?.kind || "darts",
      matchId: packet?.matchId || "",
      message: note || "",
      payload: packet,
    });
    return { ok: true as const };
  } catch (error: any) {
    return { ok: false as const, error: "db" as const, message: error?.message || String(error) };
  }
}

// Compat legacy conservée pour ne pas casser les anciens appels.
export async function sendMatchToEmail(email: string, packet: MatchSharePacketV1, note?: string) {
  return {
    ok: false as const,
    error: "friends-only" as const,
    message: "Le partage direct se fait désormais via la liste d'amis, pas par email libre.",
  };
}

export async function listInboxCloud(status: "pending" | "accepted" | "refused" | "imported" = "pending") {
  try {
    const rows = (await listSharedMatches())
      .filter((item) => item.direction !== "outgoing")
      .filter((item) => String(item.status || "pending") === status)
      .map(mapSharedMatchToInboxRow)
      .filter(Boolean) as InboxRowCloud[];
    return { ok: true as const, rows };
  } catch (error: any) {
    return { ok: false as const, error: "db" as const, message: error?.message || String(error), rows: [] as InboxRowCloud[] };
  }
}

export async function setInboxStatusCloud(id: string, status: "accepted" | "refused" | "imported") {
  try {
    if (status === "refused") await refuseSharedMatch(id);
    else if (status === "imported") await importSharedMatch(id);
    else await acceptSharedMatch(id);
    return { ok: true as const };
  } catch (error: any) {
    return { ok: false as const, error: "db" as const, message: error?.message || String(error) };
  }
}
