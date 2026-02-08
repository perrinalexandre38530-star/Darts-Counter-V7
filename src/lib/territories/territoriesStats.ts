// ============================================
// src/lib/territories/territoriesStats.ts
// Historique + stats Territories (localStorage)
//
// Objectif : alimenter
// 1) l'onglet Territories du Centre de statistiques
// 2) le CLASSEMENT (StatsLeaderboards)
// 3) des refresh auto via events
//
// ⚠️ IMPORTANT
// - On reste tolérant : on supporte plusieurs schémas legacy.
// - Les nouvelles propriétés sont optionnelles et n'empêchent pas
//   la lecture des vieilles parties.
// ============================================

export type TerritoriesPlayerRef = {
  id: string; // profileId
  name?: string;
  avatarDataUrl?: string | null;
  teamIndex?: number; // 0..n-1
};

export type TerritoriesMatch = {
  // identifiant unique
  id: string;

  // timestamp (ms)
  ts: number;

  // map
  mapId: string;

  // mode
  mode?: "solo" | "teams";
  victory?: "territories" | "regions" | "time";

  // config / meta
  teams: number;
  teamSize: number;
  objective: number;
  rounds: number;
  durationMs?: number;

  // résultat
  winnerTeam: number; // index team/owner

  // agrégats gameplay par teamIndex
  captured: number[]; // captures
  domination: number[]; // score final (territoires/regions possédés)

  // ✅ nouveaux champs (optionnels)
  darts?: number[];
  steals?: number[];
  lost?: number[];

  // ✅ pour le classement (par profil)
  players?: TerritoriesPlayerRef[];
};

const KEY = "dc_territories_history_v1";

// Permet au Centre de stats (StatsHub) et à l'onglet Territories de se rafraîchir
// automatiquement quand l'historique change.
export function emitTerritoriesUpdated() {
  try {
    if (typeof window !== "undefined") {
      // Event historique global déjà utilisé dans l'app
      window.dispatchEvent(new Event("dc-history-updated"));
      // Event dédié
      window.dispatchEvent(new Event("dc-territories-updated"));
    }
  } catch {}
}

function toNum(v: any, d = 0): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
}

function arrNums(v: any): number[] | undefined {
  if (!Array.isArray(v)) return undefined;
  const out = v.map((x) => toNum(x, 0));
  return out;
}

// Normalisation "legacy" -> TerritoriesMatch moderne
export function normalizeTerritoriesMatch(raw: any): TerritoriesMatch | null {
  if (!raw || typeof raw !== "object") return null;

  const id = String(raw.id || raw._id || "").trim();
  if (!id) return null;

  const ts = toNum(raw.ts ?? raw.when ?? raw.date ?? raw.createdAt ?? raw.updatedAt, 0);
  const mapId = String(raw.mapId || raw.map || raw.map_id || "").trim();
  if (!mapId) return null;

  const teams = Math.max(1, toNum(raw.teams, 1));
  const teamSize = Math.max(1, toNum(raw.teamSize ?? raw.team_size ?? 1, 1));
  const objective = Math.max(0, toNum(raw.objective ?? raw.goal ?? 0, 0));
  const rounds = Math.max(0, toNum(raw.rounds ?? raw.turns ?? 0, 0));
  const winnerTeam = Math.max(0, toNum(raw.winnerTeam ?? raw.winner ?? 0, 0));

  const captured = arrNums(raw.captured) ?? [];
  const domination = arrNums(raw.domination) ?? [];

  const darts = arrNums(raw.darts);
  const steals = arrNums(raw.steals);
  const lost = arrNums(raw.lost);

  const mode = raw.mode === "teams" || raw.mode === "solo" ? raw.mode : undefined;
  const victory =
    raw.victory === "territories" || raw.victory === "regions" || raw.victory === "time"
      ? raw.victory
      : undefined;

  const durationMs = raw.durationMs !== undefined ? Math.max(0, toNum(raw.durationMs, 0)) : undefined;

  const players: TerritoriesPlayerRef[] | undefined = Array.isArray(raw.players)
    ? raw.players
        .map((p: any) => {
          const pid = String(p?.id || p?.profileId || p?.playerId || "").trim();
          if (!pid) return null;
          return {
            id: pid,
            name: p?.name || p?.profileName || p?.displayName,
            avatarDataUrl: p?.avatarDataUrl ?? p?.avatar ?? null,
            teamIndex: p?.teamIndex !== undefined ? toNum(p.teamIndex, 0) : undefined,
          };
        })
        .filter(Boolean)
    : undefined;

  return {
    id,
    ts,
    mapId,
    teams,
    teamSize,
    objective,
    rounds,
    winnerTeam,
    captured,
    domination,
    darts,
    steals,
    lost,
    durationMs,
    mode,
    victory,
    players,
  };
}

export function loadTerritoriesHistory(): TerritoriesMatch[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    const out: TerritoriesMatch[] = [];
    for (const it of arr) {
      const n = normalizeTerritoriesMatch(it);
      if (n) out.push(n);
    }
    return out;
  } catch {
    return [];
  }
}

export function pushTerritoriesHistory(m: TerritoriesMatch) {
  const prev = loadTerritoriesHistory();
  const next = [m, ...prev].slice(0, 250);
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {}

  emitTerritoriesUpdated();
}

export function clearTerritoriesHistory() {
  try {
    localStorage.removeItem(KEY);
  } catch {}

  emitTerritoriesUpdated();
}
