import * as React from "react";
import { supabase } from "../lib/supabaseClient";
import { makeRoomCode } from "./castUtils";
import type { CastRoom, CastSnapshot } from "./castTypes";
import { clearCastSnapshot, pushCastSnapshot, removeLocalCastRoom, upsertLocalCastRoom } from "./castSync";

type CreateRoomResult = {
  room: CastRoom;
  joinUrl: string;
};

function buildJoinUrl(roomId: string) {
  return `${window.location.origin}${window.location.pathname}#/cast/${roomId}`;
}

function createLocalRoom(codeLen = 6): CastRoom {
  const code = makeRoomCode(codeLen);
  return {
    id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    code,
    host_user_id: "local-host",
    status: "open",
    created_at: new Date().toISOString(),
  };
}

export function useCastHost() {
  const [creating, setCreating] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [room, setRoom] = React.useState<CastRoom | null>(null);

  const createRoom = React.useCallback(async (opts?: { codeLen?: number; active_game_id?: string | null }) => {
    setCreating(true);
    setError(null);
    try {
      const { data: session } = await supabase.auth.getSession().catch(() => ({ data: { session: null } } as any));
      const uid = session?.session?.user?.id;

      if (!uid) {
        const localRoom = createLocalRoom(opts?.codeLen ?? 6);
        upsertLocalCastRoom({ id: localRoom.id, code: localRoom.code });
        setRoom(localRoom);
        return { room: localRoom, joinUrl: buildJoinUrl(localRoom.id) } as CreateRoomResult;
      }

      let code = makeRoomCode(opts?.codeLen ?? 6);
      let lastErr: any = null;
      for (let i = 0; i < 4; i++) {
        const ins = await supabase
          .from("cast_rooms")
          .insert({ code, host_user_id: uid, status: "open", active_game_id: opts?.active_game_id ?? null })
          .select("*")
          .single();

        if (!ins.error && ins.data) {
          const r = ins.data as CastRoom;
          const initSnap: CastSnapshot = {
            game: "unknown",
            title: "Multisports Scoring",
            status: "live",
            players: [],
            meta: {},
            updatedAt: Date.now(),
          };

          pushCastSnapshot(initSnap, r.id);

          const up = await supabase.from("cast_room_state").upsert(
            {
              room_id: r.id,
              rev: 1,
              payload: initSnap,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "room_id" }
          );
          if (up.error) throw up.error;

          upsertLocalCastRoom({ id: r.id, code: r.code });
          setRoom(r);
          return { room: r, joinUrl: buildJoinUrl(r.id) } as CreateRoomResult;
        }

        lastErr = ins.error;
        code = makeRoomCode(opts?.codeLen ?? 6);
      }
      throw lastErr || new Error("Impossible de créer la room");
    } catch (e: any) {
      setError(String(e?.message || e || "Erreur"));
      throw e;
    } finally {
      setCreating(false);
    }
  }, []);

  const pushState = React.useCallback(async (roomId: string, snap: CastSnapshot) => {
    setError(null);
    const payload = { ...snap, updatedAt: Date.now() };
    pushCastSnapshot(payload, roomId);

    if (String(roomId || "").startsWith("local-")) return;

    const upd = await supabase
      .from("cast_room_state")
      .update({ payload, updated_at: new Date().toISOString() })
      .eq("room_id", roomId);
    if (upd.error) {
      setError(String(upd.error.message || upd.error));
      throw upd.error;
    }
  }, []);

  const closeRoom = React.useCallback(async (roomId: string) => {
    setError(null);
    clearCastSnapshot(roomId);
    removeLocalCastRoom(room?.code, roomId);

    if (!String(roomId || "").startsWith("local-")) {
      const res = await supabase.from("cast_rooms").update({ status: "closed" }).eq("id", roomId);
      if (res.error) {
        setError(String(res.error.message || res.error));
        throw res.error;
      }
    }

    setRoom(null);
  }, [room?.code]);

  return {
    creating,
    error,
    room,
    createRoom,
    pushState,
    closeRoom,
  };
}
