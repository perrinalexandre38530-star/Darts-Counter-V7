// =============================================================
// src/lib/babyfootLeagueStore.ts
// Baby-Foot — Ligues locales V1
// ✅ Saison calendrier + Championnat infini amical
// ✅ Scopes séparés: SOLO (1v1) / ÉQUIPE (2v2 + 2v1 fusionnés)
// ✅ Local-only: aucune écriture NAS, aucune migration DB
// =============================================================

export type BabyFootLeagueScope = "solo" | "team";
export type BabyFootLeagueKind = "season" | "infinite";
export type BabyFootLeagueFormat = "single" | "double";

export type BabyFootLeagueParticipant = {
  id: string;
  name: string;
  avatarDataUrl?: string | null;
  refId?: string | null;
};

export type BabyFootLeagueFixture = {
  id: string;
  leagueId: string;
  round: number;
  homeId: string;
  awayId: string;
  scoreHome: number | null;
  scoreAway: number | null;
  playedAt: number | null;
  source: "calendar" | "manual";
};

export type BabyFootLeague = {
  id: string;
  name: string;
  kind: BabyFootLeagueKind;
  scope: BabyFootLeagueScope;
  format: BabyFootLeagueFormat;
  createdAt: number;
  updatedAt: number;
  logoDataUrl?: string | null;
  winPts: number;
  drawPts: number;
  lossPts: number;
  participants: BabyFootLeagueParticipant[];
  fixtures: BabyFootLeagueFixture[];

  // ONLINE NAS (additif, optionnel)
  onlineId?: string | null;
  visibility?: "private" | "public";
  shareCode?: string | null;
  ownerUserId?: string | null;
  onlineStatus?: string | null;
  onlineUpdatedAt?: string | null;
  onlineCreatedAt?: string | null;
  online?: {
    id?: string | null;
    visibility?: "private" | "public";
    shareCode?: string | null;
    ownerUserId?: string | null;
    status?: string | null;
    createdAt?: string | null;
    updatedAt?: string | null;
  } | null;
};

export type BabyFootLeagueStandingRow = {
  participant: BabyFootLeagueParticipant;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  diff: number;
  points: number;
  form: Array<"W" | "D" | "L">;
};

const LS_KEY = "babyfoot_league_store_v1";

function uid(prefix = "bfl") {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function safeParse(raw: string | null): BabyFootLeague[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map(normalizeLeague).filter(Boolean) as BabyFootLeague[];
  } catch {
    return [];
  }
}

function normalizeLeague(raw: any): BabyFootLeague | null {
  if (!raw || typeof raw !== "object") return null;
  const now = Date.now();
  const scope: BabyFootLeagueScope = raw.scope === "solo" ? "solo" : "team";
  const kind: BabyFootLeagueKind = raw.kind === "infinite" ? "infinite" : "season";
  const format: BabyFootLeagueFormat = raw.format === "double" ? "double" : "single";
  const participants = Array.isArray(raw.participants)
    ? raw.participants
        .map((p: any) => ({ id: String(p?.id || uid("p")), name: String(p?.name || "Participant").trim() || "Participant", avatarDataUrl: p?.avatarDataUrl ?? p?.logoDataUrl ?? null, refId: p?.refId ? String(p.refId) : null }))
        .filter((p: BabyFootLeagueParticipant) => p.name)
    : [];
  const participantIds = new Set(participants.map((p: BabyFootLeagueParticipant) => p.id));
  const fixtures = Array.isArray(raw.fixtures)
    ? raw.fixtures
        .map((f: any) => ({
          id: String(f?.id || uid("f")),
          leagueId: String(raw.id || ""),
          round: Math.max(1, Number(f?.round || 1)),
          homeId: String(f?.homeId || ""),
          awayId: String(f?.awayId || ""),
          scoreHome: typeof f?.scoreHome === "number" ? f.scoreHome : null,
          scoreAway: typeof f?.scoreAway === "number" ? f.scoreAway : null,
          playedAt: typeof f?.playedAt === "number" ? f.playedAt : null,
          source: f?.source === "manual" ? "manual" : "calendar",
        }))
        .filter((f: BabyFootLeagueFixture) => participantIds.has(f.homeId) && participantIds.has(f.awayId) && f.homeId !== f.awayId)
    : [];

  return {
    id: String(raw.id || uid()),
    name: String(raw.name || "Ligue Baby-Foot").trim() || "Ligue Baby-Foot",
    kind,
    scope,
    format,
    createdAt: Number(raw.createdAt || now),
    updatedAt: Number(raw.updatedAt || now),
    logoDataUrl: raw.logoDataUrl || null,
    winPts: Number.isFinite(Number(raw.winPts)) ? Number(raw.winPts) : 3,
    drawPts: Number.isFinite(Number(raw.drawPts)) ? Number(raw.drawPts) : 1,
    lossPts: Number.isFinite(Number(raw.lossPts)) ? Number(raw.lossPts) : 0,
    participants,
    fixtures,
    onlineId: raw.onlineId || raw.online?.id || null,
    visibility: raw.visibility === "public" || raw.online?.visibility === "public" ? "public" : (raw.visibility === "private" || raw.online?.visibility === "private" ? "private" : undefined),
    shareCode: raw.shareCode || raw.online?.shareCode || null,
    ownerUserId: raw.ownerUserId || raw.online?.ownerUserId || null,
    onlineStatus: raw.onlineStatus || raw.online?.status || null,
    onlineUpdatedAt: raw.onlineUpdatedAt || raw.online?.updatedAt || null,
    onlineCreatedAt: raw.onlineCreatedAt || raw.online?.createdAt || null,
    online: raw.online || (raw.onlineId ? {
      id: raw.onlineId,
      visibility: raw.visibility === "public" ? "public" : "private",
      shareCode: raw.shareCode || null,
      ownerUserId: raw.ownerUserId || null,
      status: raw.onlineStatus || "active",
      createdAt: raw.onlineCreatedAt || null,
      updatedAt: raw.onlineUpdatedAt || null,
    } : null),
  };
}

export function loadBabyFootLeagues(): BabyFootLeague[] {
  if (typeof window === "undefined") return [];
  return safeParse(window.localStorage.getItem(LS_KEY));
}

export function saveBabyFootLeagues(leagues: BabyFootLeague[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(LS_KEY, JSON.stringify(leagues.map(normalizeLeague).filter(Boolean)));
}

export function upsertBabyFootLeague(league: BabyFootLeague) {
  const leagues = loadBabyFootLeagues();
  const normalized = normalizeLeague({ ...league, updatedAt: Date.now() });
  if (!normalized) return;
  const idx = leagues.findIndex((l) => l.id === normalized.id);
  if (idx >= 0) leagues[idx] = normalized;
  else leagues.unshift(normalized);
  saveBabyFootLeagues(leagues);
}

export function deleteBabyFootLeague(leagueId: string) {
  saveBabyFootLeagues(loadBabyFootLeagues().filter((l) => l.id !== leagueId));
}

export function createBabyFootLeague(input: {
  name: string;
  kind: BabyFootLeagueKind;
  scope: BabyFootLeagueScope;
  format?: BabyFootLeagueFormat;
  participants: Array<string | { id?: string; name: string; avatarDataUrl?: string | null; logoDataUrl?: string | null; refId?: string | null }>;
  logoDataUrl?: string | null;
  winPts?: number;
  drawPts?: number;
  lossPts?: number;
}): BabyFootLeague {
  const leagueId = uid();
  const now = Date.now();
  const participants = input.participants
    .map((raw) => {
      if (typeof raw === "string") {
        const name = raw.trim();
        return name ? { id: uid("p"), name, avatarDataUrl: null, refId: null } : null;
      }
      const name = String(raw?.name || "").trim();
      if (!name) return null;
      return {
        id: String(raw?.id || uid("p")),
        name,
        avatarDataUrl: raw?.avatarDataUrl ?? raw?.logoDataUrl ?? null,
        refId: raw?.refId ? String(raw.refId) : null,
      };
    })
    .filter(Boolean) as BabyFootLeagueParticipant[];
  const league: BabyFootLeague = {
    id: leagueId,
    name: input.name.trim() || "Ligue Baby-Foot",
    kind: input.kind,
    scope: input.scope,
    format: input.format || "single",
    createdAt: now,
    updatedAt: now,
    logoDataUrl: input.logoDataUrl || null,
    winPts: Number.isFinite(input.winPts) ? Number(input.winPts) : 3,
    drawPts: Number.isFinite(input.drawPts) ? Number(input.drawPts) : 1,
    lossPts: Number.isFinite(input.lossPts) ? Number(input.lossPts) : 0,
    participants,
    fixtures: [],
  };
  if (league.kind === "season") league.fixtures = generateRoundRobinFixtures(league);
  upsertBabyFootLeague(league);
  return league;
}

export function generateRoundRobinFixtures(league: BabyFootLeague): BabyFootLeagueFixture[] {
  const players = [...league.participants];
  if (players.length < 2) return [];
  if (players.length % 2 === 1) players.push({ id: "__bye__", name: "Repos" });
  const n = players.length;
  const rounds = n - 1;
  const half = n / 2;
  let rotation = [...players];
  const fixtures: BabyFootLeagueFixture[] = [];

  for (let round = 1; round <= rounds; round++) {
    for (let i = 0; i < half; i++) {
      const a = rotation[i];
      const b = rotation[n - 1 - i];
      if (a.id !== "__bye__" && b.id !== "__bye__") {
        const flip = round % 2 === 0;
        fixtures.push({
          id: uid("f"),
          leagueId: league.id,
          round,
          homeId: flip ? b.id : a.id,
          awayId: flip ? a.id : b.id,
          scoreHome: null,
          scoreAway: null,
          playedAt: null,
          source: "calendar",
        });
      }
    }
    rotation = [rotation[0], rotation[n - 1], ...rotation.slice(1, n - 1)];
  }

  if (league.format === "double") {
    const secondLeg = fixtures.map((f) => ({
      ...f,
      id: uid("f"),
      round: f.round + rounds,
      homeId: f.awayId,
      awayId: f.homeId,
      scoreHome: null,
      scoreAway: null,
      playedAt: null,
    }));
    return [...fixtures, ...secondLeg];
  }
  return fixtures;
}

export function setBabyFootFixtureScore(leagueId: string, fixtureId: string, scoreHome: number, scoreAway: number) {
  const leagues = loadBabyFootLeagues();
  const league = leagues.find((l) => l.id === leagueId);
  if (!league) return;
  const fixture = league.fixtures.find((f) => f.id === fixtureId);
  if (!fixture) return;
  fixture.scoreHome = Math.max(0, Math.floor(Number(scoreHome) || 0));
  fixture.scoreAway = Math.max(0, Math.floor(Number(scoreAway) || 0));
  fixture.playedAt = Date.now();
  league.updatedAt = Date.now();
  saveBabyFootLeagues(leagues);
}

export function addBabyFootLeagueManualMatch(
  leagueId: string,
  homeId: string,
  awayId: string,
  scoreHome: number,
  scoreAway: number,
  options?: { playedAt?: number | null; source?: "manual" | "calendar" }
) {
  const leagues = loadBabyFootLeagues();
  const league = leagues.find((l) => l.id === leagueId);
  if (!league || homeId === awayId) return;
  const ids = new Set(league.participants.map((p) => p.id));
  if (!ids.has(homeId) || !ids.has(awayId)) return;
  const safeHome = Math.max(0, Math.floor(Number(scoreHome) || 0));
  const safeAway = Math.max(0, Math.floor(Number(scoreAway) || 0));
  const playedAt = typeof options?.playedAt === "number" && Number.isFinite(options.playedAt) ? options.playedAt : Date.now();

  const alreadyExists = league.fixtures.some((f) =>
    f.source === "manual" &&
    f.homeId === homeId &&
    f.awayId === awayId &&
    f.scoreHome === safeHome &&
    f.scoreAway === safeAway &&
    Math.abs(Number(f.playedAt || 0) - playedAt) < 2000
  );
  if (alreadyExists) return;

  const maxRound = league.fixtures.reduce((m, f) => Math.max(m, f.round), 0);
  league.fixtures.unshift({
    id: uid("f"),
    leagueId: league.id,
    round: Math.max(1, maxRound + 1),
    homeId,
    awayId,
    scoreHome: safeHome,
    scoreAway: safeAway,
    playedAt,
    source: "manual",
  });
  league.updatedAt = Date.now();
  saveBabyFootLeagues(leagues);
}

export function computeBabyFootLeagueStandings(league: BabyFootLeague): BabyFootLeagueStandingRow[] {
  const rows = new Map<string, BabyFootLeagueStandingRow>();
  league.participants.forEach((p) => rows.set(p.id, {
    participant: p,
    played: 0,
    wins: 0,
    draws: 0,
    losses: 0,
    goalsFor: 0,
    goalsAgainst: 0,
    diff: 0,
    points: 0,
    form: [],
  }));

  const playedFixtures = league.fixtures
    .filter((f) => typeof f.scoreHome === "number" && typeof f.scoreAway === "number")
    .sort((a, b) => (a.playedAt || 0) - (b.playedAt || 0));

  for (const f of playedFixtures) {
    const home = rows.get(f.homeId);
    const away = rows.get(f.awayId);
    if (!home || !away || f.scoreHome == null || f.scoreAway == null) continue;
    const hs = f.scoreHome;
    const as = f.scoreAway;
    home.played += 1;
    away.played += 1;
    home.goalsFor += hs;
    home.goalsAgainst += as;
    away.goalsFor += as;
    away.goalsAgainst += hs;
    if (hs > as) {
      home.wins += 1; home.points += league.winPts; home.form.push("W");
      away.losses += 1; away.points += league.lossPts; away.form.push("L");
    } else if (hs < as) {
      away.wins += 1; away.points += league.winPts; away.form.push("W");
      home.losses += 1; home.points += league.lossPts; home.form.push("L");
    } else {
      home.draws += 1; away.draws += 1;
      home.points += league.drawPts; away.points += league.drawPts;
      home.form.push("D"); away.form.push("D");
    }
  }

  return Array.from(rows.values())
    .map((r) => ({ ...r, diff: r.goalsFor - r.goalsAgainst, form: r.form.slice(-5).reverse() }))
    .sort((a, b) => b.points - a.points || b.diff - a.diff || b.goalsFor - a.goalsFor || a.participant.name.localeCompare(b.participant.name));
}

export function scopeLabel(scope: BabyFootLeagueScope) {
  return scope === "solo" ? "SOLO 1v1" : "ÉQUIPE 2v2 / 2v1";
}

export function kindLabel(kind: BabyFootLeagueKind) {
  return kind === "infinite" ? "Championnat infini amical" : "Saison calendrier";
}
