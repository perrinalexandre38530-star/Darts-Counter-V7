
import { supabase } from "../lib/supabaseClient";
import type { CastSnapshot, CastRoom } from "./castTypes";
import { clearCastSnapshot, pushCastSnapshot } from "./castSync";
import { makeRoomCode } from "./castUtils";

const DIRECT_ENABLED_KEY = "multisports_direct_cast_enabled";
const DIRECT_ROOM_ID_KEY = "multisports_direct_cast_room_id";
const DIRECT_ROOM_CODE_KEY = "multisports_direct_cast_room_code";

function emitDirectStatus() {
  try {
    window.dispatchEvent(new CustomEvent("multisports-direct-cast-status"));
  } catch {}
}

export function isDirectCastEnabled() {
  try {
    return window.localStorage.getItem(DIRECT_ENABLED_KEY) === "1";
  } catch {
    return false;
  }
}

export function setDirectCastEnabled(enabled: boolean) {
  try {
    if (enabled) window.localStorage.setItem(DIRECT_ENABLED_KEY, "1");
    else window.localStorage.removeItem(DIRECT_ENABLED_KEY);
  } catch {}
  emitDirectStatus();
}

export function getDirectCastRoomId() {
  try {
    return String(window.localStorage.getItem(DIRECT_ROOM_ID_KEY) || "").trim();
  } catch {
    return "";
  }
}

export function getDirectCastRoomCode() {
  try {
    return String(window.localStorage.getItem(DIRECT_ROOM_CODE_KEY) || "").trim().toUpperCase();
  } catch {
    return "";
  }
}

function saveDirectRoom(room: Pick<CastRoom, "id" | "code">) {
  try {
    window.localStorage.setItem(DIRECT_ROOM_ID_KEY, String(room.id || ""));
    window.localStorage.setItem(DIRECT_ROOM_CODE_KEY, String(room.code || "").toUpperCase());
  } catch {}
  emitDirectStatus();
}

function clearDirectRoom() {
  try {
    window.localStorage.removeItem(DIRECT_ROOM_ID_KEY);
    window.localStorage.removeItem(DIRECT_ROOM_CODE_KEY);
  } catch {}
  emitDirectStatus();
}

async function getAuthUserId(): Promise<string | null> {
  try {
    const { data } = await supabase.auth.getSession();
    const existing = data?.session?.user?.id || null;
    if (existing) return existing;
  } catch {}

  try {
    const anon = await supabase.auth.signInAnonymously();
    return anon.data?.user?.id || anon.data?.session?.user?.id || null;
  } catch {
    return null;
  }
}

export async function ensureDirectCastRoom(): Promise<{ ok: true; roomId: string; code: string } | { ok: false; reason: string }> {
  const existingId = getDirectCastRoomId();
  const existingCode = getDirectCastRoomCode();
  if (existingId && existingCode) {
    return { ok: true, roomId: existingId, code: existingCode };
  }

  const uid = await getAuthUserId();
  if (!uid) return { ok: false, reason: "auth_required" };

  let lastErr: any = null;
  for (let i = 0; i < 4; i++) {
    const code = makeRoomCode(6);
    const ins = await supabase
      .from("cast_rooms")
      .insert({ code, host_user_id: uid, status: "open", active_game_id: "x01" })
      .select("*")
      .single();

    if (!ins.error && ins.data) {
      const room = ins.data as CastRoom;
      saveDirectRoom({ id: room.id, code: room.code });
      return { ok: true, roomId: room.id, code: room.code };
    }
    lastErr = ins.error;
  }

  return { ok: false, reason: String(lastErr?.message || lastErr || "room_create_failed") };
}

export async function sendDirectCastSnapshot(snapshot: CastSnapshot | null): Promise<boolean> {
  if (!snapshot || !isDirectCastEnabled()) return false;

  const room = await ensureDirectCastRoom();
  if (!room.ok) return false;

  const payload = { ...snapshot, updatedAt: Number(snapshot.updatedAt || Date.now()) };

  try {
    pushCastSnapshot(payload, room.roomId);
  } catch {}

  try {
    const up = await supabase.from("cast_room_state").upsert(
      {
        room_id: room.roomId,
        rev: payload.updatedAt,
        payload,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "room_id" }
    );
    if (up.error) throw up.error;
  } catch {
    return false;
  }

  try {
    await supabase
      .from("cast_rooms")
      .update({ status: payload.status === "finished" ? "open" : "live", active_game_id: payload.game || "x01" })
      .eq("id", room.roomId);
  } catch {}

  emitDirectStatus();
  return true;
}

export async function stopDirectCast() {
  setDirectCastEnabled(false);
  const roomId = getDirectCastRoomId();
  if (roomId) {
    const waitingPayload: CastSnapshot = {
      game: "unknown",
      title: "Multisports Scoring",
      status: "live",
      players: [],
      meta: {},
      updatedAt: Date.now(),
    };

    try {
      clearCastSnapshot(roomId);
      pushCastSnapshot(waitingPayload, roomId);
    } catch {}

    try {
      await supabase.from("cast_room_state").upsert(
        {
          room_id: roomId,
          rev: waitingPayload.updatedAt,
          payload: waitingPayload,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "room_id" }
      );
    } catch {}

    try {
      await supabase.from("cast_rooms").update({ status: "open" }).eq("id", roomId);
    } catch {}
  }
  emitDirectStatus();
}

export function getDirectCastState() {
  return {
    enabled: isDirectCastEnabled(),
    roomId: getDirectCastRoomId(),
    code: getDirectCastRoomCode(),
  };
}

export function subscribeDirectCastStatus(cb: () => void) {
  const refresh = () => cb();
  window.addEventListener("multisports-direct-cast-status", refresh);
  window.addEventListener("storage", refresh);
  return () => {
    window.removeEventListener("multisports-direct-cast-status", refresh);
    window.removeEventListener("storage", refresh);
  };
}
