// =============================================================
// src/lib/petanqueStats.ts
// Helpers d'agrégation Stats Pétanque (LOCAL)
// - Source : petanqueStore.loadPetanqueHistory() (localStorage)
// - Robuste aux champs manquants / versions différentes
// =============================================================

import { loadPetanqueHistory } from "./petanqueStore";

export type TeamId = "A" | "B";

export type PPlayer = {
  id?: string;
  name?: string;
  avatarDataUrl?: string | null;
  role?: string;
};

export type PTeam = {
  id: TeamId;
  name?: string;
  logoDataUrl?: string | null;
  players?: PPlayer[];
};

export type PetanqueRec = {
  id: string;
  kind?: string;
  createdAt?: number;
  updatedAt?: number;
  status?: string;
  payload?: any;
};

export type NormalizedMatch = {
  id: string;
  when: number;
  mode: string;
  teams: Record<TeamId, PTeam>;
  scores: Record<TeamId, number>;
  target: number;
  winner: TeamId | null;
  endsCount: number;
};

export function getPetanqueMatches(): NormalizedMatch[] {
  const raw = (loadPetanqueHistory() as any[]) || [];
  const list = Array.isArray(raw) ? raw : [];

  const norm: NormalizedMatch[] = [];
  for (const r of list) {
    if (!r) continue;
    const payload = (r as any).payload || {};
    const mode = String(payload.mode || (r as any).mode || "petanque");

    const teamsArr = Array.isArray(payload.teams) ? payload.teams : [];
    const teamA: PTeam =
      (teamsArr.find((t: any) => String(t?.id || t?.teamId || "").toUpperCase() === "A") as any) ||
      ({ id: "A", name: "Équipe A", players: [] } as any);
    const teamB: PTeam =
      (teamsArr.find((t: any) => String(t?.id || t?.teamId || "").toUpperCase() === "B") as any) ||
      ({ id: "B", name: "Équipe B", players: [] } as any);

    const scoresObj = payload.scores || payload.score || {};
    const sA = Number((scoresObj as any).A ?? (scoresObj as any).a ?? 0) || 0;
    const sB = Number((scoresObj as any).B ?? (scoresObj as any).b ?? 0) || 0;

    const winnerRaw = payload.winnerTeamId ?? payload.winner ?? null;
    const w = String(winnerRaw || "").toUpperCase();
    const winner: TeamId | null = w === "A" || w === "B" ? (w as TeamId) : sA === sB ? null : sA > sB ? "A" : "B";

    const ends = Array.isArray(payload.ends) ? payload.ends : [];
    const target = Number(payload.target ?? 13) || 13;
    const when = Number((r as any).updatedAt ?? (r as any).createdAt ?? Date.now());
    const id = String((r as any).id || `petanque-${when}-${Math.random().toString(36).slice(2, 8)}`);

    norm.push({
      id,
      when,
      mode,
      teams: { A: teamA, B: teamB },
      scores: { A: sA, B: sB },
      target,
      winner,
      endsCount: ends.length,
    });
  }

  // plus récent en premier
  norm.sort((a, b) => b.when - a.when);
  return norm;
}

export type PlayerAgg = {
  id: string;
  name: string;
  avatarDataUrl?: string | null;
  matches: number;
  wins: number;
  losses: number;
  ties: number;
  pointsFor: number;
  pointsAgainst: number;
  diff: number;
  ends: number;
  lastPlayedAt: number;
};

function safePlayerId(p: any, fallback: string) {
  const id = String(p?.id || "").trim();
  return id || fallback;
}

function safePlayerName(p: any, fallback: string) {
  const n = String(p?.name || "").trim();
  return n || fallback;
}

export function aggregatePlayers(matches?: NormalizedMatch[]): PlayerAgg[] {
  const list = matches ?? getPetanqueMatches();
  const map = new Map<string, PlayerAgg>();

  const upsert = (pid: string, init: Partial<PlayerAgg>) => {
    const prev = map.get(pid);
    if (prev) {
      map.set(pid, { ...prev, ...init, id: pid } as PlayerAgg);
    } else {
      map.set(pid, {
        id: pid,
        name: init.name || pid,
        avatarDataUrl: init.avatarDataUrl ?? null,
        matches: 0,
        wins: 0,
        losses: 0,
        ties: 0,
        pointsFor: 0,
        pointsAgainst: 0,
        diff: 0,
        ends: 0,
        lastPlayedAt: 0,
        ...(init as any),
      });
    }
  };

  for (const m of list) {
    ("A,B".split(",") as TeamId[]).forEach((tid) => {
      const team = m.teams[tid] || ({ id: tid, players: [] } as any);
      const opp: TeamId = tid === "A" ? "B" : "A";
      const pf = Number(m.scores[tid] ?? 0) || 0;
      const pa = Number(m.scores[opp] ?? 0) || 0;

      const teamPlayers = Array.isArray(team.players) ? team.players : [];
      teamPlayers.forEach((p: any, idx: number) => {
        const pid = safePlayerId(p, `${tid}-${m.id}-${idx}`);
        const name = safePlayerName(p, `Joueur ${idx + 1}`);
        upsert(pid, { name, avatarDataUrl: p?.avatarDataUrl ?? null });

        const agg = map.get(pid)!;
        agg.matches += 1;
        if (m.winner === null) agg.ties += 1;
        else if (m.winner === tid) agg.wins += 1;
        else agg.losses += 1;
        agg.pointsFor += pf;
        agg.pointsAgainst += pa;
        agg.ends += Number(m.endsCount ?? 0) || 0;
        agg.lastPlayedAt = Math.max(agg.lastPlayedAt, m.when);
        agg.diff = agg.pointsFor - agg.pointsAgainst;
        map.set(pid, agg);
      });
    });
  }

  return Array.from(map.values()).sort((a, b) => {
    // tri: winrate desc, puis diff desc, puis matches desc
    const awr = a.matches ? a.wins / a.matches : 0;
    const bwr = b.matches ? b.wins / b.matches : 0;
    if (bwr !== awr) return bwr - awr;
    if (b.diff !== a.diff) return b.diff - a.diff;
    return b.matches - a.matches;
  });
}

export type DuoAgg = {
  key: string; // pid1|pid2
  p1: { id: string; name: string };
  p2: { id: string; name: string };
  matches: number;
  wins: number;
  losses: number;
  ties: number;
  winRate: number;
};

function duoKey(a: string, b: string) {
  return [a, b].sort().join("|");
}

export function aggregateDuos(matches?: NormalizedMatch[]): DuoAgg[] {
  const list = matches ?? getPetanqueMatches();
  const pAgg = aggregatePlayers(list);
  const pMap = new Map(pAgg.map((p) => [p.id, p] as const));

  const map = new Map<string, DuoAgg>();

  for (const m of list) {
    ("A,B".split(",") as TeamId[]).forEach((tid) => {
      const team = m.teams[tid] || ({ id: tid, players: [] } as any);
      const players = Array.isArray(team.players) ? team.players : [];
      const ids = players.map((p: any, idx: number) => safePlayerId(p, `${tid}-${m.id}-${idx}`));

      // duos uniquement (au moins 2 joueurs)
      for (let i = 0; i < ids.length; i++) {
        for (let j = i + 1; j < ids.length; j++) {
          const a = ids[i];
          const b = ids[j];
          const key = duoKey(a, b);
          const prev = map.get(key);
          const base: DuoAgg =
            prev ||
            ({
              key,
              p1: { id: a, name: pMap.get(a)?.name || "Joueur" },
              p2: { id: b, name: pMap.get(b)?.name || "Joueur" },
              matches: 0,
              wins: 0,
              losses: 0,
              ties: 0,
              winRate: 0,
            } as any);

          base.matches += 1;
          if (m.winner === null) base.ties += 1;
          else if (m.winner === tid) base.wins += 1;
          else base.losses += 1;
          base.winRate = base.matches ? base.wins / base.matches : 0;
          map.set(key, base);
        }
      }
    });
  }

  return Array.from(map.values()).sort((a, b) => {
    if (b.matches !== a.matches) return b.matches - a.matches;
    if (b.winRate !== a.winRate) return b.winRate - a.winRate;
    return b.wins - a.wins;
  });
}

export type RivalryAgg = {
  key: string; // pidA|pidB (opposition)
  a: { id: string; name: string };
  b: { id: string; name: string };
  matches: number;
  aWins: number;
  bWins: number;
  ties: number;
};

export function aggregateRivalries(matches?: NormalizedMatch[]): RivalryAgg[] {
  const list = matches ?? getPetanqueMatches();
  const pAgg = aggregatePlayers(list);
  const pMap = new Map(pAgg.map((p) => [p.id, p] as const));

  const map = new Map<string, RivalryAgg>();

  for (const m of list) {
    const A = Array.isArray(m.teams.A?.players) ? m.teams.A.players! : [];
    const B = Array.isArray(m.teams.B?.players) ? m.teams.B.players! : [];
    const idsA = A.map((p: any, idx: number) => safePlayerId(p, `A-${m.id}-${idx}`));
    const idsB = B.map((p: any, idx: number) => safePlayerId(p, `B-${m.id}-${idx}`));

    for (const a of idsA) {
      for (const b of idsB) {
        const key = duoKey(a, b); // opposition non orientée
        const prev = map.get(key);
        const base: RivalryAgg =
          prev ||
          ({
            key,
            a: { id: a, name: pMap.get(a)?.name || "Joueur" },
            b: { id: b, name: pMap.get(b)?.name || "Joueur" },
            matches: 0,
            aWins: 0,
            bWins: 0,
            ties: 0,
          } as any);

        base.matches += 1;
        if (m.winner === null) base.ties += 1;
        else if (m.winner === "A") base.aWins += 1;
        else base.bWins += 1;
        map.set(key, base);
      }
    }
  }

  return Array.from(map.values()).sort((x, y) => y.matches - x.matches);
}

export type VsAgg = {
  aId: string;
  aName: string;
  bId: string;
  bName: string;
  matches: number;
  aWins: number;
  bWins: number;
  aWinRate: number; // 0..1
};

// ✅ "Face à face" global (tous joueurs), utilisé par PetanqueStatsPlayersPage
export function aggregateVs(matches?: NormalizedMatch[]): VsAgg[] {
  const list = Array.isArray(matches) ? matches : [];

  // util: nom joueur depuis m.players
  const nameFrom = (m: NormalizedMatch, pid: string) => {
    const p = (m.players || []).find((x: any) => String(x?.id) === String(pid));
    return (p?.name || p?.displayName || p?.label || "Joueur") as string;
  };

  type Item = {
    aId: string;
    aName: string;
    bId: string;
    bName: string;
    matches: number;
    aWins: number;
    bWins: number;
  };

  const map = new Map<string, Item>();

  for (const m of list) {
    const idsA = (m.teamA || []).map((x: any) => String(x?.id || "")).filter(Boolean);
    const idsB = (m.teamB || []).map((x: any) => String(x?.id || "")).filter(Boolean);
    if (!idsA.length || !idsB.length) continue;

    const winnerSide = m.winner === "B" ? "B" : m.winner === "A" ? "A" : null;
    if (!winnerSide) continue;

    // chaque pair A vs B est un "duel" dans ce match
    for (const a of idsA) {
      for (const b of idsB) {
        if (!a || !b || a === b) continue;

        const min = a < b ? a : b;
        const max = a < b ? b : a;
        const key = `${min}|${max}`;

        let it = map.get(key);
        if (!it) {
          it = {
            aId: min,
            aName: nameFrom(m, min),
            bId: max,
            bName: nameFrom(m, max),
            matches: 0,
            aWins: 0,
            bWins: 0,
          };
          map.set(key, it);
        }

        it.matches += 1;

        // gagnants = joueurs du côté winnerSide
        const winners = winnerSide === "A" ? idsA : idsB;
        if (winners.includes(it.aId)) it.aWins += 1;
        else it.bWins += 1;
      }
    }
  }

  return Array.from(map.values())
    .map((x) => ({
      ...x,
      aWinRate: x.matches ? x.aWins / x.matches : 0,
    }))
    .sort((x, y) => y.matches - x.matches);
}

export function formatPct(x: number) {
  const v = Number.isFinite(x) ? x : 0;
  return `${Math.round(v * 100)}%`;
}


// --------------------------------------------
// Back-compat exports (UI pages)
// --------------------------------------------
export const safeName = safePlayerName;
export function aggregatePetanquePlayers(matches: NormalizedMatch[]) {
  return aggregatePlayers(matches);
}
export function aggregatePetanqueTeams(matches: NormalizedMatch[]) {
  return aggregatePetanqueByTeam(matches);
}
export function computePetanqueDuos(matches: NormalizedMatch[]) {
  return aggregateDuos(matches);
}

export function listPetanquePlayersFromMatches(matches: NormalizedMatch[]) {
  const map = new Map<string, { id: string; name: string; avatarDataUrl?: string }>();
  for (const m of matches || []) {
    for (const t of (m.teams || [])) {
      for (const p of (t.players || [])) {
        const id = String((p as any)?.id || "");
        if (!id) continue;
        if (!map.has(id)) {
          map.set(id, {
            id,
            name: safePlayerName((p as any)?.name, id),
            avatarDataUrl: (p as any)?.avatarDataUrl,
          });
        }
      }
    }
  }
  return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
}

export function aggregatePetanqueByTeam(matches: NormalizedMatch[]) {
  const by = new Map<
    string,
    { name: string; games: number; wins: number; pointsFor: number; pointsAgainst: number; diff: number }
  >();

  for (const m of matches || []) {
    const teams = Array.isArray(m.teams) ? m.teams : [];
    if (teams.length < 2) continue;

    const a = teams[0];
    const b = teams[1];

    const nameA = (a?.name && String(a.name).trim()) || "Équipe A";
    const nameB = (b?.name && String(b.name).trim()) || "Équipe B";

    const scoreA = Number.isFinite(Number(m.scoreA)) ? Number(m.scoreA) : 0;
    const scoreB = Number.isFinite(Number(m.scoreB)) ? Number(m.scoreB) : 0;

    const winA = scoreA > scoreB;
    const winB = scoreB > scoreA;

    const upsert = (name: string) => {
      if (!by.has(name)) by.set(name, { name, games: 0, wins: 0, pointsFor: 0, pointsAgainst: 0, diff: 0 });
      return by.get(name)!;
    };

    const rowA = upsert(nameA);
    rowA.games += 1;
    rowA.wins += winA ? 1 : 0;
    rowA.pointsFor += scoreA;
    rowA.pointsAgainst += scoreB;

    const rowB = upsert(nameB);
    rowB.games += 1;
    rowB.wins += winB ? 1 : 0;
    rowB.pointsFor += scoreB;
    rowB.pointsAgainst += scoreA;
  }

  const out = Array.from(by.values()).map((r) => ({ ...r, diff: r.pointsFor - r.pointsAgainst }));
  out.sort((x, y) => y.wins - x.wins || y.diff - x.diff || y.pointsFor - x.pointsFor || x.name.localeCompare(y.name));
  return out;
}

// --------------------------------------------
// Normalisation record (History -> UI)
// --------------------------------------------

export type NormalizedPetanqueRecord = {
  id: string;
  createdAt: number;
  updatedAt: number;
  finishedAt?: number;
  status: "active" | "finished";
  mode: string;
  targetScore: number;
  scoreA: number;
  scoreB: number;
  endsCount: number;
  teams: Array<{
    id: "A" | "B";
    name: string;
    players: Array<{ id: string; name: string; avatarDataUrl?: string }>;
  }>;
  winnerTeamId: "A" | "B" | null;
  raw: any;
};

function _pickTeamBlob(raw: any, side: "A" | "B") {
  let t =
  raw?.teams?.[side] ??
  raw?.teams?.[side === "A" ? 0 : 1] ??
  raw?.team?.[side] ??
  raw?.team?.[side === "A" ? 0 : 1] ??
  raw?.meta?.teams?.[side] ??
  raw?.meta?.teams?.[side === "A" ? 0 : 1] ??
  raw?.cfg?.teams?.[side] ??
  raw?.cfg?.teams?.[side === "A" ? 0 : 1] ??
  null;

if (!t) {
  if (side === "A" && raw?.teamA) t = raw.teamA;
  if (side === "B" && raw?.teamB) t = raw.teamB;
}
  return t;
}

function _normalizePlayers(list: any): Array<{ id: string; name: string; avatarDataUrl?: string }> {
  if (!Array.isArray(list)) return [];
  return list
    .map((p) => {
      if (!p) return null;
      const id = String((p as any).id || (p as any).playerId || "");
      const name = safeName((p as any).name || (p as any).displayName || (p as any).label || "");
      const avatarDataUrl = typeof (p as any).avatarDataUrl === "string" ? (p as any).avatarDataUrl : undefined;
      return { id: id || `p-${Math.random().toString(36).slice(2, 8)}`, name, avatarDataUrl };
    })
    .filter(Boolean) as any;
}

export function normalizePetanqueRecord(raw: any): NormalizedPetanqueRecord | null {
  try {
    if (!raw || typeof raw !== "object") return null;

    const id = String(raw.matchId || raw.gameId || raw.id || "");
    const createdAt = Number.isFinite(Number(raw.createdAt)) ? Number(raw.createdAt) : Date.now();
    const updatedAt = Number.isFinite(Number(raw.updatedAt)) ? Number(raw.updatedAt) : createdAt;
    const finishedAt = Number.isFinite(Number(raw.finishedAt)) ? Number(raw.finishedAt) : undefined;
    const status: "active" | "finished" = raw.status === "finished" || raw.finished === true ? "finished" : "active";

    const mode = typeof raw.mode === "string" && raw.mode ? raw.mode : "simple";
    const targetScore = Number.isFinite(Number(raw.targetScore ?? raw.target)) ? Number(raw.targetScore ?? raw.target) : 13;

    const scoreA = Number.isFinite(Number(raw.scoreA ?? raw.aScore ?? raw.pointsA)) ? Number(raw.scoreA ?? raw.aScore ?? raw.pointsA) : 0;
    const scoreB = Number.isFinite(Number(raw.scoreB ?? raw.bScore ?? raw.pointsB)) ? Number(raw.scoreB ?? raw.bScore ?? raw.pointsB) : 0;

    const endsCount = Array.isArray(raw.ends) ? raw.ends.length : Number.isFinite(Number(raw.endsCount)) ? Number(raw.endsCount) : 0;

    const tA = _pickTeamBlob(raw, "A") || {};
    const tB = _pickTeamBlob(raw, "B") || {};

    const teamAName = safeName((tA as any).name || (tA as any).label || raw?.teams?.A?.name || "Équipe A");
    const teamBName = safeName((tB as any).name || (tB as any).label || raw?.teams?.B?.name || "Équipe B");

    const teamAPlayers = _normalizePlayers((tA as any).players || (tA as any).members || raw?.playersA || []);
    const teamBPlayers = _normalizePlayers((tB as any).players || (tB as any).members || raw?.playersB || []);

    const winnerTeamId: "A" | "B" | null = scoreA === scoreB ? null : scoreA > scoreB ? "A" : "B";

    return {
      id: id || `petanque-${createdAt}-${Math.random().toString(36).slice(2, 8)}`,
      createdAt,
      updatedAt,
      finishedAt,
      status,
      mode,
      targetScore,
      scoreA,
      scoreB,
      endsCount,
      teams: [
        { id: "A", name: teamAName, players: teamAPlayers },
        { id: "B", name: teamBName, players: teamBPlayers },
      ],
      winnerTeamId,
      raw,
    };
  } catch {
    return null;
  }
}
