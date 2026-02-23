// @ts-nocheck
// ============================================
// src/lib/matchInboxCloud.ts
// Inbox CLOUD (Supabase) pour envoi direct vers un ami (compte)
// ============================================

import { supabase } from "./supabaseClient";
import type { MatchSharePacketV1 } from "./matchShare";

export type InboxRowCloud = {
  id: string;
  created_at: string;
  updated_at?: string;
  from_user: string;
  to_user: string;
  status: "pending" | "accepted" | "refused";
  kind: string;
  match_id: string;
  packet: MatchSharePacketV1;
  note?: string | null;
};

// --------------------------------------------------
// Utils
// --------------------------------------------------

function normEmail(email: string) {
  return String(email || "").trim().toLowerCase();
}

// Force strict JSON-safe object (remove Date, undefined, etc.)
function safeJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

// --------------------------------------------------
// Auth helpers
// --------------------------------------------------

export async function getMyUserId(): Promise<string | null> {
  try {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data?.user?.id) return null;
    return data.user.id;
  } catch {
    return null;
  }
}

// --------------------------------------------------
// Directory (opt-in)
// --------------------------------------------------

export async function ensureDirectoryEntry(options?: {
  phone?: string | null;
  handle?: string | null;
}) {
  const { data } = await supabase.auth.getUser();
  const user = data?.user;
  if (!user?.id) return { ok: false, error: "no-user" as const };

  const email = normEmail(user.email || "");

  const patch: any = {
    user_id: user.id,
    email_norm: email || null,
    handle_norm: options?.handle
      ? String(options.handle).trim().toLowerCase()
      : null,
    phone_norm: options?.phone
      ? String(options.phone).trim().replace(/\s+/g, "")
      : null,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from("user_directory")
    .upsert(patch, { onConflict: "user_id" });

  if (error)
    return { ok: false, error: "db" as const, message: error.message };

  return { ok: true as const };
}

export async function resolveUserIdByEmail(
  email: string
): Promise<string | null> {
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

// --------------------------------------------------
// Send match
// --------------------------------------------------

export async function sendMatchToEmail(
  email: string,
  packet: MatchSharePacketV1,
  note?: string
) {
  const me = await getMyUserId();
  if (!me) return { ok: false as const, error: "no-user" as const };

  const to = await resolveUserIdByEmail(email);
  if (!to) return { ok: false as const, error: "not-found" as const };

  const safePacket = safeJson(packet);

  const row: any = {
    from_user: me,
    to_user: to,
    status: "pending",
    kind: safePacket.kind,
    match_id: safePacket.matchId,
    packet: safePacket,
    note: note || null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from("match_inbox")
    .insert([row]);

  if (error)
    return { ok: false as const, error: "db" as const, message: error.message };

  return { ok: true as const };
}

// --------------------------------------------------
// Inbox listing
// --------------------------------------------------

export async function listInboxCloud(
  status: "pending" | "accepted" | "refused" = "pending"
) {
  const me = await getMyUserId();
  if (!me)
    return {
      ok: false as const,
      error: "no-user" as const,
      rows: [] as InboxRowCloud[],
    };

  const { data, error } = await supabase
    .from("match_inbox")
    .select("*")
    .eq("to_user", me)
    .eq("status", status)
    .order("created_at", { ascending: false });

  if (error)
    return {
      ok: false as const,
      error: "db" as const,
      message: error.message,
      rows: [] as InboxRowCloud[],
    };

  return { ok: true as const, rows: (data || []) as InboxRowCloud[] };
}

// --------------------------------------------------
// Update status
// --------------------------------------------------

export async function setInboxStatusCloud(
  id: string,
  status: "accepted" | "refused"
) {
  const me = await getMyUserId();
  if (!me) return { ok: false as const, error: "no-user" as const };

  const { error } = await supabase
    .from("match_inbox")
    .update({
      status,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("to_user", me);

  if (error)
    return { ok: false as const, error: "db" as const, message: error.message };

  return { ok: true as const };
}