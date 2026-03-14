import type { CastSnapshot } from "./castTypes";
import { pushCastSnapshot } from "./castSync";

export const LAST_CAST_KEY = "dc_cast_last_room_v2";

export type ActiveCastRoom = {
  id: string;
  code?: string;
  at?: number;
};

export function getActiveCastRoom(): ActiveCastRoom | null {
  try {
    const raw = localStorage.getItem(LAST_CAST_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ActiveCastRoom;
    if (!parsed?.id) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function setActiveCastRoom(room: ActiveCastRoom | null) {
  try {
    if (!room?.id) {
      localStorage.removeItem(LAST_CAST_KEY);
      return;
    }
    localStorage.setItem(LAST_CAST_KEY, JSON.stringify({ ...room, at: Date.now() }));
  } catch {}
}

export function clearActiveCastRoom() {
  try {
    localStorage.removeItem(LAST_CAST_KEY);
  } catch {}
}

export function pushActiveCastSnapshot(snapshot: CastSnapshot) {
  const room = getActiveCastRoom();
  if (!room?.id) return null;
  return pushCastSnapshot({ ...snapshot, updatedAt: Date.now() }, room.id);
}
