import * as React from "react";
import { supabase } from "../lib/supabaseClient";
import { safeUpper } from "./castUtils";
import type { CastSnapshot } from "./castTypes";
import { findLocalCastRoomByCode, readCastSnapshot } from "./castSync";

type JoinResult = { roomId: string };

async function fetchState(roomId: string): Promise<CastSnapshot | null> {
  const local = readCastSnapshot(roomId);
  if (local) return local;
  if (String(roomId || "").startsWith("local-")) return null;

  const res = await supabase
    .from("cast_room_state")
    .select("payload")
    .eq("room_id", roomId)
    .maybeSingle();
  if (res.error) throw res.error;
  return (res.data?.payload as any) || null;
}

export function useCastClient() {
  const [roomId, setRoomId] = React.useState<string | null>(null);
  const [snapshot, setSnapshot] = React.useState<CastSnapshot | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const joinByCode = React.useCallback(async (code: string): Promise<JoinResult> => {
    setLoading(true);
    setError(null);
    try {
      const c = safeUpper(code);
      if (!c) throw new Error("Code requis");

      const localRoom = findLocalCastRoomByCode(c);
      if (localRoom?.id) {
        setRoomId(localRoom.id);
        const snap = await fetchState(localRoom.id);
        setSnapshot(snap);
        return { roomId: localRoom.id };
      }

      const { data, error } = await supabase.rpc("join_cast_room", { p_code: c });
      if (error) throw error;
      const rid = String(data || "");
      if (!rid) throw new Error("ROOM_NOT_FOUND");
      setRoomId(rid);
      const snap = await fetchState(rid);
      setSnapshot(snap);
      return { roomId: rid };
    } catch (e: any) {
      setError(String(e?.message || e || "Erreur"));
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  const connectRoom = React.useCallback(async (rid: string) => {
    setLoading(true);
    setError(null);
    try {
      setRoomId(rid);
      const snap = await fetchState(rid);
      setSnapshot(snap);
    } catch (e: any) {
      setError(String(e?.message || e || "Erreur"));
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    if (!roomId) return;
    let alive = true;

    const storageKey = `multisports_cast_payload_room:${roomId}`;
    const onStorage = (e: StorageEvent) => {
      if (!alive || e.key !== storageKey) return;
      try {
        setSnapshot(e.newValue ? (JSON.parse(e.newValue) as CastSnapshot) : null);
      } catch {
        setSnapshot(null);
      }
    };
    window.addEventListener("storage", onStorage);

    let bc: BroadcastChannel | null = null;
    try {
      bc = new BroadcastChannel(`multisports-cast-room:${roomId}`);
      bc.onmessage = (event) => {
        if (!alive) return;
        const data = event.data as any;
        if (data?.type === "snapshot") setSnapshot((data.snapshot as CastSnapshot) || null);
      };
    } catch {}

    let channel: any = null;
    if (!String(roomId || "").startsWith("local-")) {
      channel = supabase
        .channel(`cast_room_state:${roomId}`)
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "cast_room_state", filter: `room_id=eq.${roomId}` },
          (payload: any) => {
            if (!alive) return;
            const next = payload?.new?.payload as CastSnapshot | undefined;
            if (next) setSnapshot(next);
          }
        )
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "cast_room_state", filter: `room_id=eq.${roomId}` },
          (payload: any) => {
            if (!alive) return;
            const next = payload?.new?.payload as CastSnapshot | undefined;
            if (next) setSnapshot(next);
          }
        )
        .subscribe();
    }

    return () => {
      alive = false;
      window.removeEventListener("storage", onStorage);
      try {
        bc?.close();
      } catch {}
      if (channel) supabase.removeChannel(channel);
    };
  }, [roomId]);

  return {
    roomId,
    snapshot,
    loading,
    error,
    joinByCode,
    connectRoom,
  };
}
