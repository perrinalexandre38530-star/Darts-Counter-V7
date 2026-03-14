import type { CastSnapshot } from "./castTypes";

export type CastPayload = {
  title?: string;
  sport?: string;
  player1?: string;
  player2?: string;
  score1?: number | string;
  score2?: number | string;
  meta?: string;
  updatedAt: number;
};

const GLOBAL_KEY = "multisports_cast_payload";
const ROOM_PREFIX = "multisports_cast_payload_room:";
const REGISTRY_KEY = "multisports_cast_room_registry";
const CHANNEL_PREFIX = "multisports-cast-room:";

function getKey(roomId?: string | null) {
  return roomId ? `${ROOM_PREFIX}${roomId}` : GLOBAL_KEY;
}

function readJson<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function writeJson(key: string, value: unknown) {
  localStorage.setItem(key, JSON.stringify(value));
}

export function payloadToSnapshot(payload: Omit<CastPayload, "updatedAt">): CastSnapshot {
  return {
    game: "unknown",
    title: payload.title || "Multisports Scoring",
    status: "live",
    players: [
      {
        id: "left",
        name: payload.player1 || "Joueur 1",
        score: Number(payload.score1 ?? 0) || 0,
        active: false,
      },
      {
        id: "right",
        name: payload.player2 || "Joueur 2",
        score: Number(payload.score2 ?? 0) || 0,
        active: false,
      },
    ],
    meta: payload.meta ? { text: payload.meta } : {},
    updatedAt: Date.now(),
  };
}

export function snapshotToPayload(snapshot: CastSnapshot | null): CastPayload | null {
  if (!snapshot) return null;
  const p1 = snapshot.players?.[0];
  const p2 = snapshot.players?.[1];
  return {
    title: snapshot.title,
    sport: snapshot.game,
    player1: p1?.name || "Joueur 1",
    player2: p2?.name || "Joueur 2",
    score1: p1?.score ?? 0,
    score2: p2?.score ?? 0,
    meta: snapshot.meta?.text || undefined,
    updatedAt: snapshot.updatedAt || Date.now(),
  };
}

export function pushCastPayload(payload: Omit<CastPayload, "updatedAt">, roomId?: string | null) {
  const fullPayload: CastPayload = {
    ...payload,
    updatedAt: Date.now(),
  };
  writeJson(getKey(roomId), fullPayload);
  try {
    const bc = new BroadcastChannel(`${CHANNEL_PREFIX}${roomId || "global"}`);
    bc.postMessage({ type: "payload", payload: fullPayload });
    bc.close();
  } catch {}
  return fullPayload;
}

export function readCastPayload(roomId?: string | null): CastPayload | null {
  return readJson<CastPayload>(getKey(roomId));
}

export function pushCastSnapshot(snapshot: CastSnapshot, roomId?: string | null) {
  writeJson(getKey(roomId), snapshot);
  try {
    const bc = new BroadcastChannel(`${CHANNEL_PREFIX}${roomId || "global"}`);
    bc.postMessage({ type: "snapshot", snapshot });
    bc.close();
  } catch {}
  return snapshot;
}

export function readCastSnapshot(roomId?: string | null): CastSnapshot | null {
  return readJson<CastSnapshot>(getKey(roomId));
}

export function clearCastSnapshot(roomId?: string | null) {
  try {
    localStorage.removeItem(getKey(roomId));
  } catch {}
}

export function subscribeCastPayload(cb: (payload: CastPayload | null) => void, roomId?: string | null) {
  const key = getKey(roomId);
  const channelName = `${CHANNEL_PREFIX}${roomId || "global"}`;

  const onStorage = (e: StorageEvent) => {
    if (e.key !== key) return;
    try {
      cb(e.newValue ? (JSON.parse(e.newValue) as CastPayload) : null);
    } catch {
      cb(null);
    }
  };

  let bc: BroadcastChannel | null = null;
  try {
    bc = new BroadcastChannel(channelName);
    bc.onmessage = (event) => {
      const data = event.data as any;
      if (data?.type === "payload") cb((data.payload as CastPayload) || null);
      else if (data?.type === "snapshot") cb(snapshotToPayload((data.snapshot as CastSnapshot) || null));
    };
  } catch {}

  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener("storage", onStorage);
    try {
      bc?.close();
    } catch {}
  };
}

export function upsertLocalCastRoom(room: { id: string; code: string; createdAt?: number }) {
  const registry = readJson<Record<string, { id: string; code: string; createdAt: number }>>(REGISTRY_KEY) || {};
  registry[String(room.code || "").toUpperCase()] = {
    id: room.id,
    code: String(room.code || "").toUpperCase(),
    createdAt: room.createdAt || Date.now(),
  };
  writeJson(REGISTRY_KEY, registry);
}

export function findLocalCastRoomByCode(code: string): { id: string; code: string; createdAt: number } | null {
  const registry = readJson<Record<string, { id: string; code: string; createdAt: number }>>(REGISTRY_KEY) || {};
  return registry[String(code || "").toUpperCase()] || null;
}

export function removeLocalCastRoom(code?: string | null, roomId?: string | null) {
  const registry = readJson<Record<string, { id: string; code: string; createdAt: number }>>(REGISTRY_KEY) || {};
  const next = { ...registry };
  for (const [k, v] of Object.entries(next)) {
    if ((code && k === String(code).toUpperCase()) || (roomId && v.id === roomId)) {
      delete next[k];
    }
  }
  writeJson(REGISTRY_KEY, next);
}
