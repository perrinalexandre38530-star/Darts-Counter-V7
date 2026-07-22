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

import { History } from "../history";

export type TerritoriesPlayerRef = {
  id: string; // profileId
  name?: string;
  avatarDataUrl?: string | null;
  teamIndex?: number; // 0..n-1
};

export type TerritoriesOwnerRef = {
  id: string;
  name?: string;
  color?: string;
  teamIndex: number;
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
  gameMode?: "classic" | "fortress";
  maxFortressesPerOwner?: number;
  victory?: "territories" | "regions" | "time" | "majority" | "value" | "conquest";

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
  dominationValue?: number[]; // somme des valeurs des territoires possédés

  // ✅ nouveaux champs (optionnels)
  darts?: number[];
  steals?: number[];
  lost?: number[];
  fortresses?: number[];
  breaches?: number[];

  // ✅ pour le classement (par profil)
  players?: TerritoriesPlayerRef[];

  // ✅ propriétaires/camps réels, utile pour les cartes historiques détaillées
  owners?: TerritoriesOwnerRef[];
  mapName?: string;
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
  const dominationValue = arrNums(raw.dominationValue);

  const darts = arrNums(raw.darts);
  const steals = arrNums(raw.steals);
  const lost = arrNums(raw.lost);
  const fortresses = arrNums(raw.fortresses);
  const breaches = arrNums(raw.breaches);

  const mode = raw.mode === "teams" || raw.mode === "solo" ? raw.mode : undefined;
  const gameMode = raw.gameMode === "fortress" || raw.gameMode === "classic" ? raw.gameMode : undefined;
  const maxFortressesPerOwner = raw.maxFortressesPerOwner !== undefined
    ? Math.max(1, Math.min(10, Math.floor(toNum(raw.maxFortressesPerOwner, 2))))
    : undefined;
  const victory =
    raw.victory === "territories" || raw.victory === "regions" || raw.victory === "time" || raw.victory === "majority" || raw.victory === "value" || raw.victory === "conquest"
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

  const owners: TerritoriesOwnerRef[] | undefined = Array.isArray(raw.owners)
    ? raw.owners
        .map((owner: any, index: number) => {
          const oid = String(owner?.id || owner?.ownerId || `owner-${index}`).trim();
          if (!oid) return null;
          return {
            id: oid,
            name: owner?.name || owner?.label || owner?.teamName,
            color: owner?.color,
            teamIndex: Math.max(0, toNum(owner?.teamIndex, index)),
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
    dominationValue,
    darts,
    steals,
    lost,
    fortresses,
    breaches,
    durationMs,
    mode,
    gameMode,
    maxFortressesPerOwner,
    victory,
    players,
    owners,
    mapName: raw.mapName ? String(raw.mapName) : undefined,
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

  const createdAt = Number(m.ts || Date.now());
  const ownerCount = Math.max(
    1,
    Number(m.teams || 0),
    m.domination?.length || 0,
    m.dominationValue?.length || 0,
    m.captured?.length || 0,
  );
  const owners = Array.from({ length: ownerCount }, (_, index) => {
    const explicit = m.owners?.find((owner) => Number(owner.teamIndex) === index) || m.owners?.[index];
    const members = (m.players || []).filter((player, playerIndex) => Number(player.teamIndex ?? playerIndex) === index);
    const fallbackName = m.mode === "teams"
      ? members.map((member) => member.name || member.id).filter(Boolean).join(" + ") || `Équipe ${index + 1}`
      : members[0]?.name || members[0]?.id || `Joueur ${index + 1}`;
    return {
      id: explicit?.id || `owner-${index}`,
      teamIndex: index,
      name: explicit?.name || fallbackName,
      color: explicit?.color,
      owned: Number(m.domination?.[index] || 0),
      value: Number(m.dominationValue?.[index] || 0),
      captures: Number(m.captured?.[index] || 0),
      darts: Number(m.darts?.[index] || 0),
      steals: Number(m.steals?.[index] || 0),
      lost: Number(m.lost?.[index] || 0),
      fortresses: Number(m.fortresses?.[index] || 0),
      breaches: Number(m.breaches?.[index] || 0),
      winner: index === Number(m.winnerTeam || 0),
      rank: 0,
    };
  });

  const scoreByValue = m.victory === "value";
  const rankings = [...owners]
    .sort((a, b) => {
      if (a.winner !== b.winner) return a.winner ? -1 : 1;
      return scoreByValue
        ? b.value - a.value || b.owned - a.owned || b.captures - a.captures
        : b.owned - a.owned || b.value - a.value || b.captures - a.captures;
    })
    .map((owner, index) => ({
      ...owner,
      rank: index + 1,
      score: scoreByValue ? owner.value : owner.owned,
      points: owner.value,
      territories: owner.owned,
      finalScore: scoreByValue ? owner.value : owner.owned,
    }));

  const winnerOwner = owners[Number(m.winnerTeam || 0)] || rankings[0];
  const winnerPlayer = (m.players || []).find((player) => Number(player.teamIndex ?? 0) === Number(m.winnerTeam || 0));
  const winnerId = m.mode === "solo" && winnerPlayer?.id
    ? String(winnerPlayer.id)
    : String(winnerOwner?.id || `team-${Number(m.winnerTeam || 0)}`);
  const winnerName = String(winnerOwner?.name || winnerPlayer?.name || "").trim();
  const scoreLine = rankings
    .map((row) => `${row.name}: ${row.owned} terr. · ${row.value}`)
    .join(" • ");

  // Mirror in the global IndexedDB history. This record is intentionally rich:
  // HistoryPage can display the full Territories result without depending on the
  // separate stats-center localStorage key.
  try {
    const rec: any = {
      id: String(m.id || `territories-${createdAt}-${Math.random().toString(36).slice(2, 8)}`),
      kind: "territories",
      status: "finished",
      createdAt,
      updatedAt: createdAt,
      finishedAt: createdAt,
      winnerId,
      winnerName,
      players: Array.isArray(m.players)
        ? m.players.map((player: any) => ({
            id: String(player.id),
            name: String(player.name || player.id),
            avatarDataUrl: player.avatarDataUrl ?? null,
            teamIndex: player.teamIndex,
          }))
        : undefined,
      summary: {
        kind: "territories",
        mode: "territories",
        title: "Territories",
        mapId: m.mapId,
        mapName: m.mapName || m.mapId,
        teams: m.teams,
        teamSize: m.teamSize,
        rounds: m.rounds,
        objective: m.objective,
        gameMode: m.gameMode,
        victory: m.victory,
        durationMs: m.durationMs,
        winnerTeam: m.winnerTeam,
        winnerId,
        winnerName,
        scoreLine,
        players: rankings,
        rankings,
        perPlayer: rankings,
      },
      payload: {
        kind: "territories",
        match: m,
        summary: {
          kind: "territories",
          mode: "territories",
          mapId: m.mapId,
          mapName: m.mapName || m.mapId,
          rounds: m.rounds,
          objective: m.objective,
          gameMode: m.gameMode,
          victory: m.victory,
          durationMs: m.durationMs,
          winnerTeam: m.winnerTeam,
          winnerId,
          winnerName,
          scoreLine,
          players: rankings,
          rankings,
          perPlayer: rankings,
        },
        stats: {
          sport: "territories",
          mode: "territories",
          createdAt,
          players: rankings,
          global: {
            mapId: m.mapId,
            mapName: m.mapName || m.mapId,
            teams: m.teams,
            teamSize: m.teamSize,
            rounds: m.rounds,
            objective: m.objective,
            winnerTeam: m.winnerTeam,
            winnerId,
            winnerName,
            captured: m.captured,
            domination: m.domination,
            dominationValue: m.dominationValue,
            darts: m.darts,
            steals: m.steals,
            lost: m.lost,
            fortresses: m.fortresses,
            breaches: m.breaches,
            gameMode: m.gameMode,
            maxFortressesPerOwner: m.maxFortressesPerOwner,
            victory: m.victory,
            durationMs: m.durationMs,
          },
        },
      },
    };

    // Do not notify the global history before IndexedDB has finished writing.
    // Previously, HistoryPage reloaded too early and the new card was missing.
    void Promise.resolve(History.upsert(rec))
      .then(() => emitTerritoriesUpdated())
      .catch(() => emitTerritoriesUpdated());

    // The dedicated Territories stats page reads localStorage and can refresh now.
    try {
      if (typeof window !== "undefined") window.dispatchEvent(new Event("dc-territories-updated"));
    } catch {}
    return;
  } catch {}

  emitTerritoriesUpdated();
}

export function clearTerritoriesHistory() {
  try {
    localStorage.removeItem(KEY);
  } catch {}

  emitTerritoriesUpdated();
}
