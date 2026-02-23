// @ts-nocheck
// ============================================
// src/lib/matchInboxCloud.ts
// Inbox CLOUD (Supabase) pour envoi direct vers un ami (compte)
// Principe:
// - table user_directory : map email/handle -> user_id (opt-in)
// - table match_inbox : messages/payload match envoyés à un user_id
//
// ⚠️ IMPORTANT:
// Le client Supabase ne peut pas lire auth.users. Pour retrouver un ami par email,
// il faut une table "user_directory" remplie côté client (opt-in) ou via trigger.
// Un script SQL de référence est fourni: matchInboxCloud.schema.sql
// ============================================

import { supabase } from "./supabaseClient";
import type { MatchSharePacketV1 } from "./matchShare";

export type InboxRowCloud = {
  id: string;
  created_at: string;
  from_user: string;
  to_user: string;
  status: "pending" | "accepted" | "refused";
  kind: string;
  match_id: string;
  packet: MatchSharePacketV1;
  note?: string | null;
};

function normEmail(email: string) {
  return String(email || "").trim().toLowerCase();
}

export async function getMyUserId(): Promise<string | null> {
  try {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data?.user?.id) return null;
    return data.user.id;
  } catch {
    return null;
  }
}

export async function ensureDirectoryEntry(options?: { phone?: string | null; handle?: string | null }) {
  // Opt-in directory row so others can send you matches via email/handle.
  const { data } = await supabase.auth.getUser();
  const user = data?.user;
  if (!user?.id) return { ok: false, error: "no-user" as const };

  const email = normEmail(user.email || "");
  const patch: any = {
    user_id: user.id,
    email_norm: email || null,
    handle_norm: options?.handle ? String(options.handle).trim().toLowerCase() : null,
    phone_norm: options?.phone ? String(options.phone).trim().replace(/\s+/g, "") : null,
    updated_at: new Date().toISOString(),
  };

  // upsert by user_id
  const { error } = await supabase.from("user_directory").upsert(patch, { onConflict: "user_id" });
  if (error) return { ok: false, error: "db" as const, message: error.message };
  return { ok: true as const };
}

export async function resolveUserIdByEmail(email: string): Promise<string | null> {
  const em = normEmail(email);
  if (!em) return null;
  const { data, error } = await supabase
    .from("user_directory")
    .select("user_id")
    .eq("email_norm", em)
    .maybeSingle();

  if (error) return null;
  return data?.user_id || null;
}

export async function sendMatchToEmail(email: string, packet: MatchSharePacketV1, note?: string) {
  const me = await getMyUserId();
  if (!me) return { ok: false as const, error: "no-user" as const };

  const to = await resolveUserIdByEmail(email);
  if (!to) return { ok: false as const, error: "not-found" as const };

  const row: any = {
    from_user: me,
    to_user: to,
    status: "pending",
    kind: packet.kind,
    match_id: packet.matchId,
    packet,
    note: note || null,
  };

  const { error } = await supabase.from("match_inbox").insert(row);
  if (error) return { ok: false as const, error: "db" as const, message: error.message };
  return { ok: true as const };
}

export async function listInboxCloud(status: "pending" | "accepted" | "refused" = "pending") {
  const me = await getMyUserId();
  if (!me) return { ok: false as const, error: "no-user" as const, rows: [] as InboxRowCloud[] };

  const { data, error } = await supabase
    .from("match_inbox")
    .select("*")
    .eq("to_user", me)
    .eq("status", status)
    .order("created_at", { ascending: false });

  if (error) return { ok: false as const, error: "db" as const, message: error.message, rows: [] as InboxRowCloud[] };
  return { ok: true as const, rows: (data || []) as InboxRowCloud[] };
}

export async function setInboxStatusCloud(id: string, status: "accepted" | "refused") {
  const me = await getMyUserId();
  if (!me) return { ok: false as const, error: "no-user" as const };

  const { error } = await supabase
    .from("match_inbox")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("to_user", me);

  if (error) return { ok: false as const, error: "db" as const, message: error.message };
  return { ok: true as const };
}
