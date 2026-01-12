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

export type PetanqueRec = any;

// =============================================================
// Helpers SAFE
// =============================================================

export function safeName(v: any, fallback = "Joueur") {
  const s = String(v ?? "").trim();
  return s || fallback;
}

export function formatPct(x: number) {
  const v = Number.isFinite(x) ? x : 0;
  return `${Math.round(v * 100)}%`;
}

function clampNum(n: any, def = 0) {
  const v = Number(n);
  return Number.isFinite(v) ? v : def;
}

function safePlayerId(p: any, fallback: string) {
  const id = String(p?.id || p?.playerId || "").trim();
  return id || fallback;
}

function safePlayerName(p: any, fallback: string) {
  return safeName(p?.name, fallback);
}

function pickTeamFromPayload(payload: any, side: TeamId): PTeam {
  const teamsArr = Array.isArray(payload?.teams) ? payload.teams : [];

  const fromArr =
    (teamsArr.find((t: any) => String(t?.id || t?.teamId || "").toUpperCase() === side) as any) || null;

  const fallback: PTeam = { id: side, name: side === "A" ? "Équipe A" : "Équipe B", players: [] };

  const team: PTeam = (fromArr || payload?.teams?.[side] || payload?.team?.[side] || fallback) as any;

  return {
    id: side,
    name: safeName(team?.name, fallback.name),
    logoDataUrl: typeof team?.logoDataUrl === "string" ? team.logoDataUrl : null,
    players: Array.isArray(team?.players) ? team.players : [],
  };
}

// =============================================================
// NormalizedMatch (format stable pour UI)
// =============================================================

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

    const payload = (r as any).payload || r || {};
    const mode = String(payload?.mode || (r as any).mode || "petanque");

    const teamA = pickTeamFromPayload(payload, "A");
    const teamB = pickTeamFromPayload(payload, "B");

    // scores (compat)
    const scoresObj = payload?.scores || payload?.score || payload || {};
    const sA = clampNum((scoresObj as any).A ?? (scoresObj as any).a ?? payload?.scoreA ?? payload?.pointsA ?? 0, 0);
    const sB = clampNum((scoresObj as any).B ?? (scoresObj as any).b ?? payload?.scoreB ?? payload?.pointsB ?? 0, 0);

    const winnerRaw = payload?.winnerTeamId ?? payload?.winner ?? null;
    const w = String(winnerRaw || "").toUpperCase();
    const winner: TeamId | null =
      w === "A" || w === "B" ? (w as TeamId) : sA === sB ? null : sA > sB ? "A" : "B";

    const ends = Array.isArray(payload?.ends) ? payload.ends : Array.isArray((r as any).ends) ? (r as any).ends : [];
    const target = clampNum(payload?.target ?? payload?.targetScore ?? (r as any).targetScore ?? 13, 13);

    const when = clampNum((r as any).updatedAt ?? payload?.updatedAt ?? (r as any).createdAt ?? payload?.createdAt ?? Date.now(), Date.now());

    const id = String(
      (r as any).matchId ||
        (r as any).gameId ||
        (r as any).id ||
        payload?.matchId ||
        payload?.gameId ||
        payload?.id ||
        `petanque-${when}-${Math.random().toString(36).slice(2, 8)}`
    );

    norm.push({
      id,
      when,
      mode,
      teams: { A: teamA, B: teamB },
      scores: { A: sA, B: sB },
      target,
      winner,
      endsCount: Array.isArray(ends) ? ends.length : 0,
    });
  }

  norm.sort((a, b) => b.when - a.when);
  return norm;
}

// =============================================================
// Aggregate Players
// =============================================================

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
    (["A", "B"] as TeamId[]).forEach((tid) => {
      const team = m.teams?.[tid] || ({ id: tid, players: [] } as any);
      const opp: TeamId = tid === "A" ? "B" : "A";
      const pf = clampNum(m.scores?.[tid] ?? 0, 0);
      const pa = clampNum(m.scores?.[opp] ?? 0, 0);

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
        agg.ends += clampNum(m.endsCount ?? 0, 0);
        agg.lastPlayedAt = Math.max(agg.lastPlayedAt, clampNum(m.when, 0));
        agg.diff = agg.pointsFor - agg.pointsAgainst;
        map.set(pid, agg);
      });
    });
  }

  return Array.from(map.values()).sort((a, b) => {
    const awr = a.matches ? a.wins / a.matches : 0;
    const bwr = b.matches ? b.wins / b.matches : 0;
    if (bwr !== awr) return bwr - awr;
    if (b.diff !== a.diff) return b.diff - a.diff;
    return b.matches - a.matches;
  });
}

// =============================================================
// Aggregate Duos (coéquipiers)
// =============================================================

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
    (["A", "B"] as TeamId[]).forEach((tid) => {
      const team = m.teams?.[tid] || ({ id: tid, players: [] } as any);
      const players = Array.isArray(team.players) ? team.players : [];
      const ids = players.map((p: any, idx: number) => safePlayerId(p, `${tid}-${m.id}-${idx}`));

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

// =============================================================
// Rivalries (adversaires)
// =============================================================

export type RivalryAgg = {
  key: string; // pidA|pidB (non orienté)
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
    const A = Array.isArray(m.teams?.A?.players) ? (m.teams.A.players as any[]) : [];
    const B = Array.isArray(m.teams?.B?.players) ? (m.teams.B.players as any[]) : [];

    const idsA = A.map((p: any, idx: number) => safePlayerId(p, `A-${m.id}-${idx}`));
    const idsB = B.map((p: any, idx: number) => safePlayerId(p, `B-${m.id}-${idx}`));

    for (const a of idsA) {
      for (const b of idsB) {
        const key = duoKey(a, b);

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

// =============================================================
// Face à Face (VsAgg) – utilisé par certaines pages UI
// =============================================================

export type VsAgg = {
  aId: string;
  aName: string;
  bId: string;
  bName: string;
  matches: number;
  aWins: number;
  bWins: number;
  aWinRate: number;
};

export function aggregateVs(matches?: NormalizedMatch[]): VsAgg[] {
  const list = Array.isArray(matches) ? matches : getPetanqueMatches();

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
    const A = Array.isArray(m.teams?.A?.players) ? (m.teams.A.players as any[]) : [];
    const B = Array.isArray(m.teams?.B?.players) ? (m.teams.B.players as any[]) : [];

    const idsA = A.map((p: any, idx: number) => ({
      id: safePlayerId(p, `A-${m.id}-${idx}`),
      name: safePlayerName(p, "Joueur"),
    }));
    const idsB = B.map((p: any, idx: number) => ({
      id: safePlayerId(p, `B-${m.id}-${idx}`),
      name: safePlayerName(p, "Joueur"),
    }));

    if (!idsA.length || !idsB.length) continue;

    const winnerSide = m.winner === "A" || m.winner === "B" ? m.winner : null;
    if (!winnerSide) continue;

    const winners = winnerSide === "A" ? idsA.map((x) => x.id) : idsB.map((x) => x.id);

    for (const a of idsA) {
      for (const b of idsB) {
        if (!a.id || !b.id || a.id === b.id) continue;

        const min = a.id < b.id ? a : b;
        const max = a.id < b.id ? b : a;
        const key = `${min.id}|${max.id}`;

        let it = map.get(key);
        if (!it) {
          it = {
            aId: min.id,
            aName: min.name,
            bId: max.id,
            bName: max.name,
            matches: 0,
            aWins: 0,
            bWins: 0,
          };
          map.set(key, it);
        }

        it.matches += 1;
        if (winners.includes(it.aId)) it.aWins += 1;
        else it.bWins += 1;
      }
    }
  }

  return Array.from(map.values())
    .map((x) => ({
      aId: x.aId,
      aName: x.aName,
      bId: x.bId,
      bName: x.bName,
      matches: x.matches,
      aWins: x.aWins,
      bWins: x.bWins,
      aWinRate: x.matches ? x.aWins / x.matches : 0,
    }))
    .sort((x, y) => y.matches - x.matches);
}

// =============================================================
// Teams ranking (par nom d'équipe)
// =============================================================

export function aggregatePetanqueByTeam(matches?: NormalizedMatch[]) {
  const list = Array.isArray(matches) ? matches : getPetanqueMatches();

  const by = new Map<
    string,
    { name: string; games: number; wins: number; ties: number; losses: number; pointsFor: number; pointsAgainst: number; diff: number }
  >();

  const upsert = (name: string) => {
    if (!by.has(name)) {
      by.set(name, { name, games: 0, wins: 0, ties: 0, losses: 0, pointsFor: 0, pointsAgainst: 0, diff: 0 });
    }
    return by.get(name)!;
  };

  for (const m of list) {
    const nameA = safeName(m.teams?.A?.name, "Équipe A");
    const nameB = safeName(m.teams?.B?.name, "Équipe B");

    const scoreA = clampNum(m.scores?.A ?? 0, 0);
    const scoreB = clampNum(m.scores?.B ?? 0, 0);

    const rowA = upsert(nameA);
    const rowB = upsert(nameB);

    rowA.games += 1;
    rowB.games += 1;

    rowA.pointsFor += scoreA;
    rowA.pointsAgainst += scoreB;

    rowB.pointsFor += scoreB;
    rowB.pointsAgainst += scoreA;

    if (m.winner === null) {
      rowA.ties += 1;
      rowB.ties += 1;
    } else if (m.winner === "A") {
      rowA.wins += 1;
      rowB.losses += 1;
    } else {
      rowB.wins += 1;
      rowA.losses += 1;
    }

    rowA.diff = rowA.pointsFor - rowA.pointsAgainst;
    rowB.diff = rowB.pointsFor - rowB.pointsAgainst;
  }

  const out = Array.from(by.values());
  out.sort((x, y) => y.wins - x.wins || y.diff - x.diff || y.pointsFor - x.pointsFor || x.name.localeCompare(y.name));
  return out;
}

// =============================================================
// Record Normalizer (History -> UI)
// =============================================================

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
  return (
    raw?.teams?.[side] ??
    raw?.teams?.[side === "A" ? 0 : 1] ??
    raw?.team?.[side] ??
    raw?.team?.[side === "A" ? 0 : 1] ??
    raw?.meta?.teams?.[side] ??
    raw?.meta?.teams?.[side === "A" ? 0 : 1] ??
    raw?.cfg?.teams?.[side] ??
    raw?.cfg?.teams?.[side === "A" ? 0 : 1] ??
    (side === "A" ? raw?.teamA : raw?.teamB) ??
    null
  );
}

function _normalizePlayers(list: any): Array<{ id: string; name: string; avatarDataUrl?: string }> {
  if (!Array.isArray(list)) return [];
  return list
    .map((p) => {
      if (!p) return null;
      const id = String((p as any).id || (p as any).playerId || "").trim();
      const name = safeName((p as any).name || (p as any).displayName || (p as any).label || "", "Joueur");
      const avatarDataUrl = typeof (p as any).avatarDataUrl === "string" ? (p as any).avatarDataUrl : undefined;
      return { id: id || `p-${Math.random().toString(36).slice(2, 8)}`, name, avatarDataUrl };
    })
    .filter(Boolean) as any;
}

export function normalizePetanqueRecord(raw: any): NormalizedPetanqueRecord | null {
  try {
    if (!raw || typeof raw !== "object") return null;

    const id = String(raw.matchId || raw.gameId || raw.id || "").trim();
    const createdAt = clampNum(raw.createdAt, Date.now());
    const updatedAt = clampNum(raw.updatedAt, createdAt);
    const finishedAt = Number.isFinite(Number(raw.finishedAt)) ? Number(raw.finishedAt) : undefined;

    const status: "active" | "finished" =
      raw.status === "finished" || raw.finished === true ? "finished" : "active";

    const mode = safeName(raw.mode, "simple");
    const targetScore = clampNum(raw.targetScore ?? raw.target ?? 13, 13);

    const scoreA = clampNum(raw.scoreA ?? raw.aScore ?? raw.pointsA ?? 0, 0);
    const scoreB = clampNum(raw.scoreB ?? raw.bScore ?? raw.pointsB ?? 0, 0);

    const endsCount = Array.isArray(raw.ends)
      ? raw.ends.length
      : Number.isFinite(Number(raw.endsCount))
      ? Number(raw.endsCount)
      : 0;

    const tA = _pickTeamBlob(raw, "A") || {};
    const tB = _pickTeamBlob(raw, "B") || {};

    const teamAName = safeName((tA as any).name || (tA as any).label, "Équipe A");
    const teamBName = safeName((tB as any).name || (tB as any).label, "Équipe B");

    const teamAPlayers = _normalizePlayers((tA as any).players || (tA as any).members || raw.playersA || []);
    const teamBPlayers = _normalizePlayers((tB as any).players || (tB as any).members || raw.playersB || []);

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

// =============================================================
// BACK-COMPAT EXPORTS (UI pages historiques)
// =============================================================

// alias exacts attendus par tes pages
export function aggregatePetanquePlayers(matches: NormalizedMatch[]) {
  return aggregatePlayers(matches);
}
export function computePetanqueDuos(matches: NormalizedMatch[]) {
  return aggregateDuos(matches);
}
export function aggregatePetanqueTeams(matches: NormalizedMatch[]) {
  return aggregatePetanqueByTeam(matches);
}
export function listPetanquePlayersFromMatches(matches: NormalizedMatch[]) {
  const map = new Map<string, { id: string; name: string; avatarDataUrl?: string | null }>();

  for (const m of matches || []) {
    (["A", "B"] as TeamId[]).forEach((tid) => {
      const team = m.teams?.[tid];
      const players = Array.isArray(team?.players) ? team!.players! : [];
      players.forEach((p: any, idx: number) => {
        const id = safePlayerId(p, `${tid}-${m.id}-${idx}`);
        if (!id) return;
        if (!map.has(id)) {
          map.set(id, {
            id,
            name: safePlayerName(p, id),
            avatarDataUrl: typeof p?.avatarDataUrl === "string" ? p.avatarDataUrl : null,
          });
        }
      });
    });
  }

  return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
}
