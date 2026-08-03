// ============================================================
// src/lib/homeModeStats.ts
// Résumés de modes joués pour le carrousel HOME.
// Source unique : parties terminées présentes dans History.
// Tolérant aux anciens formats + payload.stats des modes récents.
// ============================================================

export type HomeModeSlide = {
  id: string;
  title: string;
  rows: Array<{ label: string; value: string }>;
};

type ModeKey =
  | "x01"
  | "cricket"
  | "enculette"
  | "killer"
  | "five_lives"
  | "loterie"
  | "golf"
  | "shanghai"
  | "territories"
  | "darts_firefighter"
  | "darts_poker"
  | "warfare"
  | "battle_royale"
  | "scram"
  | "capital"
  | "batard"
  | "clock"
  | "baseball"
  | "bowling"
  | "bobs_27"
  | "halve_it"
  | "shooter"
  | "prisoner"
  | "attrape_moi"
  | "darts_racer"
  | "president"
  | "count_up"
  | "game_170"
  | "super_bull"
  | "tic_tac_toe"
  | "football"
  | "rugby"
  | "knockout"
  | "happy_mille"
  | "defi"
  | "fun_gages"
  | "simple_rounds"
  | "training"
  | "babyfoot"
  | "pingpong"
  | "petanque"
  | "molkky"
  | "dicegame"
  | "unknown";

type MatchMetrics = {
  score: number;
  darts: number;
  visits: number;
  hits: number;
  misses: number;
  avg: number;
  best: number;
  rate01: number;
  specials: Record<string, number>;
};

type ModeAgg = {
  key: ModeKey;
  idKey: string;
  title: string;
  sessions: number;
  wins: number;
  scoreSum: number;
  scoreCount: number;
  scoreMax: number;
  scoreMinPositive: number;
  darts: number;
  visits: number;
  hits: number;
  misses: number;
  avgSum: number;
  avgCount: number;
  best: number;
  rateSum: number;
  rateCount: number;
  specialsSum: Record<string, number>;
  specialsMax: Record<string, number>;
  specialsMinPositive: Record<string, number>;
};

const DARTS_MODE_KEYS = new Set<ModeKey>([
  "x01", "cricket", "enculette", "killer", "five_lives", "loterie", "golf", "shanghai",
  "territories", "darts_firefighter", "darts_poker", "warfare", "battle_royale", "scram", "capital", "batard",
  "clock", "baseball", "bowling", "bobs_27", "halve_it", "shooter",
  "prisoner", "attrape_moi", "darts_racer", "president", "count_up",
  "game_170", "super_bull", "tic_tac_toe", "football", "rugby", "knockout",
  "happy_mille", "defi", "fun_gages", "simple_rounds", "training",
]);

const MODE_TITLES: Record<ModeKey, string> = {
  x01: "X01 MULTI",
  cricket: "CRICKET",
  enculette: "CRICKET ENCULETTE",
  killer: "KILLER",
  five_lives: "LES 5 VIES",
  loterie: "LOTERIE",
  golf: "GOLF",
  shanghai: "SHANGHAI",
  territories: "TERRITORIES",
  darts_firefighter: "DARTS FIREFIGHTER",
  darts_poker: "DARTS POKER",
  warfare: "WARFARE",
  battle_royale: "BATTLE ROYALE",
  scram: "SCRAM",
  capital: "CAPITAL",
  batard: "BÂTARD",
  clock: "TOUR DE L’HORLOGE",
  baseball: "BASEBALL",
  bowling: "BOWLING",
  bobs_27: "BOB’S 27",
  halve_it: "HALVE-IT",
  shooter: "SHOOTER",
  prisoner: "PRISONER",
  attrape_moi: "ATTRAPE-MOI",
  darts_racer: "DARTS RACER",
  president: "PRÉSIDENT",
  count_up: "COUNT-UP",
  game_170: "170",
  super_bull: "SUPER BULL",
  tic_tac_toe: "TIC-TAC-TOE",
  football: "FOOTBALL DARTS",
  rugby: "RUGBY DARTS",
  knockout: "KNOCKOUT",
  happy_mille: "HAPPY MILLE",
  defi: "DÉFI",
  fun_gages: "FUN GAGES",
  simple_rounds: "SCORE ROUNDS",
  training: "TRAINING",
  babyfoot: "BABY-FOOT",
  pingpong: "PING-PONG",
  petanque: "PÉTANQUE",
  molkky: "MÖLKKY",
  dicegame: "DICE",
  unknown: "AUTRE MODE",
};

function finite(value: any): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function normalizeToken(value: any): string {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function normalizeName(value: any): string {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");
}

function collectTag(record: any): string {
  const payload = record?.payload ?? {};
  const nested = payload?.payload ?? {};
  const summary = record?.summary ?? payload?.summary ?? nested?.summary ?? record?.resume?.summary ?? {};
  const values = [
    record?.kind, record?.mode, record?.variant, record?.sport, record?.game,
    record?.game?.mode, record?.game?.game, record?.game?.variant,
    record?.stats?.mode, record?.stats?.sport,
    record?.resume?.kind, record?.resume?.mode, record?.resume?.gameMode,
    payload?.kind, payload?.mode, payload?.gameMode, payload?.gameId, payload?.variant, payload?.sport, payload?.game,
    payload?.stats?.mode, payload?.stats?.sport, payload?.config?.mode, payload?.config?.variant,
    nested?.kind, nested?.mode, nested?.gameMode, nested?.variant, nested?.sport,
    summary?.kind, summary?.mode, summary?.gameMode, summary?.variant, summary?.sport,
    summary?.game?.mode, summary?.game?.game,
  ];
  return values.map(normalizeToken).filter(Boolean).join("|");
}

export function detectHomeMode(record: any): ModeKey {
  const tag = collectTag(record);
  if (!tag) return "unknown";

  if (/\bx01\b|x01v3|_301_|_501_|_701_|_901_/.test(`_${tag}_`)) return "x01";
  if (tag.includes("enculette") || tag.includes("vache")) return "enculette";
  if (tag.includes("cricket") || tag.includes("cut_throat")) return "cricket";
  if (tag.includes("killer")) return "killer";
  if (tag.includes("five_lives") || tag.includes("five_life") || tag.includes("5_vies") || tag.includes("cinq_vies")) return "five_lives";
  if (tag.includes("loterie") || tag.includes("lottery")) return "loterie";
  if (tag.includes("golf")) return "golf";
  if (tag.includes("shanghai")) return "shanghai";
  if (tag.includes("darts_firefighter") || tag.includes("darts firefighter") || tag.includes("firefighter")) return "darts_firefighter";
  if (tag.includes("darts_poker") || tag.includes("darts poker") || tag.includes("dartspoker")) return "darts_poker";
  if (tag.includes("territor") || tag.includes("departement")) return "territories";
  if (tag.includes("warfare")) return "warfare";
  if (tag.includes("battle_royale") || (tag.includes("battle") && tag.includes("royale"))) return "battle_royale";
  if (tag.includes("scram")) return "scram";
  if (tag.includes("capital")) return "capital";
  if (tag.includes("batard") || tag.includes("bastard")) return "batard";
  if (tag.includes("tour_de_l_horloge") || tag.includes("clock") || tag.includes("horloge")) return "clock";
  if (tag.includes("baseball")) return "baseball";
  if (tag.includes("bowling")) return "bowling";
  if (tag.includes("bobs_27") || tag.includes("bobs27") || tag.includes("bob_27")) return "bobs_27";
  if (tag.includes("halve_it") || tag.includes("halveit")) return "halve_it";
  if (tag.includes("shooter")) return "shooter";
  if (tag.includes("prisoner")) return "prisoner";
  if (tag.includes("attrape_moi") || tag.includes("catch_me")) return "attrape_moi";
  if (tag.includes("darts_racer") || tag.includes("dartsracer") || tag.includes("racer")) return "darts_racer";
  if (tag.includes("president")) return "president";
  if (tag.includes("count_up") || tag.includes("countup")) return "count_up";
  if (tag.includes("game_170") || tag.includes("mode_170") || tag.includes("jeu_170") || tag.includes("v170")) return "game_170";
  if (tag.includes("super_bull") || tag.includes("superbull")) return "super_bull";
  if (tag.includes("tic_tac_toe") || tag.includes("tictactoe") || tag.includes("morpion")) return "tic_tac_toe";
  if (tag.includes("football")) return "football";
  if (tag.includes("rugby")) return "rugby";
  if (tag.includes("knockout") || tag.includes("knock_out")) return "knockout";
  if (tag.includes("happy_mille") || tag.includes("happymille")) return "happy_mille";
  if (tag.includes("fun_gages") || tag.includes("gages") || tag.split("|").includes("fun")) return "fun_gages";
  if (tag.includes("defi") || tag.includes("challenge")) return "defi";
  if (tag.includes("simple_rounds") || tag.includes("score_rounds") || tag.includes("darts_score_rounds")) return "simple_rounds";
  if (tag.includes("training")) return "training";
  if (tag.includes("babyfoot") || tag.includes("baby_foot")) return "babyfoot";
  if (tag.includes("pingpong") || tag.includes("ping_pong")) return "pingpong";
  if (tag.includes("petanque")) return "petanque";
  if (tag.includes("molkky")) return "molkky";
  if (tag.includes("dice") || tag.includes("yams") || tag.includes("farkle") || tag.includes("421")) return "dicegame";

  return "unknown";
}

const GENERIC_MODE_TOKENS = new Set([
  "darts", "dart", "finished", "in_progress", "multisports_scoring",
  "mode_darts", "darts_mode", "game", "match", "unknown",
]);

function rawModeCandidates(record: any): any[] {
  const payload = record?.payload ?? {};
  const nested = payload?.payload ?? {};
  const summary = record?.summary ?? payload?.summary ?? nested?.summary ?? {};
  return [
    record?.kind, record?.mode, record?.gameMode, record?.game?.mode, record?.game?.game,
    payload?.kind, payload?.mode, payload?.gameMode, payload?.gameId, payload?.game?.mode,
    nested?.kind, nested?.mode, nested?.gameMode, nested?.gameId,
    summary?.kind, summary?.mode, summary?.gameMode,
  ];
}

function rawModeToken(record: any): string {
  for (const value of rawModeCandidates(record)) {
    const token = normalizeToken(value);
    if (token && !GENERIC_MODE_TOKENS.has(token)) return token;
  }
  return "";
}

function rawModeTitle(record: any, fallbackToken: string): string {
  const payload = record?.payload ?? {};
  const summary = record?.summary ?? payload?.summary ?? {};
  const explicit = [
    summary?.title, payload?.title, record?.title, record?.game?.label, payload?.game?.label,
  ].find((value) => {
    const text = String(value ?? "").trim();
    return text && normalizeToken(text) !== "mode_darts";
  });
  const source = String(explicit ?? fallbackToken ?? "AUTRE MODE")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return source.toLocaleUpperCase("fr-FR");
}

function recordSportToken(record: any): string {
  const payload = record?.payload ?? {};
  const nested = payload?.payload ?? {};
  return normalizeToken(
    record?.sport ?? payload?.sport ?? nested?.sport ?? record?.stats?.sport ??
    payload?.stats?.sport ?? record?.summary?.sport ?? payload?.summary?.sport ?? ""
  );
}

function recordMatchesSport(record: any, mode: ModeKey, requestedSport?: string | null): boolean {
  if (mode !== "unknown") return modeMatchesSport(mode, requestedSport);
  const requested = normalizeToken(requestedSport || "darts");
  if (!requested || requested === "all") return true;
  const actual = recordSportToken(record);
  if (!actual) return requested === "darts"; // anciens historiques Darts sans champ sport
  if (requested === "dice" || requested === "dicegame") return actual === "dice" || actual === "dicegame";
  return actual === requested;
}

function modeMatchesSport(mode: ModeKey, requestedSport?: string | null): boolean {
  const sport = normalizeToken(requestedSport || "darts");
  if (!sport || sport === "all") return true;
  if (sport === "darts") return DARTS_MODE_KEYS.has(mode);
  if (sport === "dice" || sport === "dicegame") return mode === "dicegame";
  if (sport === "babyfoot") return mode === "babyfoot";
  if (sport === "pingpong") return mode === "pingpong";
  if (sport === "petanque") return mode === "petanque";
  if (sport === "molkky") return mode === "molkky";
  return true;
}

function arraysFromRecord(record: any): any[][] {
  const payload = record?.payload ?? {};
  const nested = payload?.payload ?? {};
  const summary = record?.summary ?? payload?.summary ?? nested?.summary ?? {};
  return [
    record?.players,
    record?.stats?.players,
    summary?.players,
    summary?.perPlayer,
    summary?.rankings,
    payload?.players,
    payload?.finalPlayers,
    payload?.stats?.players,
    payload?.statsIndex?.players,
    payload?.summary?.players,
    payload?.summary?.perPlayer,
    payload?.summary?.rankings,
    nested?.players,
    nested?.stats?.players,
    record?.resume?.players,
    record?.resume?.summary?.players,
    record?.resume?.summary?.perPlayer,
  ].filter(Array.isArray) as any[][];
}

function playerIds(player: any): string[] {
  return [
    player?.id, player?.playerId, player?.profileId, player?.sourceId,
    player?.sourcePlayerId, player?.sourceProfileId, player?.memberId,
  ].map((v) => String(v ?? "").trim()).filter(Boolean);
}

function findPlayerRow(record: any, profileId: string, profileName?: string): any | null {
  const pid = String(profileId || "").trim();
  const wantedName = normalizeName(profileName);
  let exact: any | null = null;
  let byName: any | null = null;

  // Plusieurs formats stockent l'identité dans `players` et les vraies stats
  // dans `summary.perPlayer` / `payload.stats.players`. On fusionne donc toutes
  // les lignes correspondantes au lieu de retourner la première ligne pauvre.
  for (const arr of arraysFromRecord(record)) {
    for (const row of arr) {
      if (!row || typeof row !== "object") continue;
      if (pid && playerIds(row).includes(pid)) {
        exact = { ...(exact || {}), ...row };
        continue;
      }
      if (wantedName) {
        const rowName = normalizeName(row?.name ?? row?.displayName ?? row?.nickname ?? row?.surname);
        if (rowName && rowName === wantedName) byName = { ...(byName || {}), ...row };
      }
    }
  }
  return exact || byName;
}

function mapPlayerDetail(record: any, profileId: string, row: any): any {
  const payload = record?.payload ?? {};
  const summary = record?.summary ?? payload?.summary ?? {};
  const aliases = new Set<string>([profileId, ...playerIds(row)].map((v) => String(v || "")).filter(Boolean));
  const maps = [
    summary?.detailedByPlayer,
    summary?.perPlayerMap,
    summary?.playerStats,
    payload?.playerStats,
    payload?.state?.statsByPlayerById,
    payload?.statsByPlayer,
    record?.playerStats,
  ];
  for (const map of maps) {
    if (!map || typeof map !== "object" || Array.isArray(map)) continue;
    for (const key of aliases) {
      if (map[key] && typeof map[key] === "object") return map[key];
    }
  }
  return null;
}

function firstFinite(...values: any[]): number {
  for (const value of values) {
    if (value === undefined || value === null || value === "") continue;
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return 0;
}

function rate01(value: any): number {
  const n = finite(value);
  if (n <= 0) return 0;
  return n > 1 ? Math.min(1, n / 100) : Math.min(1, n);
}

function readSpecial(row: any, detail: any, ...keys: string[]): number {
  for (const key of keys) {
    const path = key.split(".");
    for (const root of [row, detail]) {
      let value = root;
      for (const part of path) value = value?.[part];
      if (value !== undefined && value !== null && value !== "") {
        const n = Number(value);
        if (Number.isFinite(n)) return n;
      }
    }
  }
  return 0;
}

function extractMetrics(record: any, row: any, detail: any): MatchMetrics {
  const merged = { ...(detail || {}), ...(row || {}) } as any;
  const dartsObject = merged?.darts && typeof merged.darts === "object" ? merged.darts : {};
  const special = merged?.special && typeof merged.special === "object" ? merged.special : {};
  const averages = merged?.averages && typeof merged.averages === "object" ? merged.averages : {};

  const darts = firstFinite(
    merged?.dartsThrown, merged?.totalDarts, dartsObject?.thrown,
    typeof merged?.darts === "number" ? merged.darts : undefined,
    merged?.stats?.dartsThrown, merged?.stats?.darts,
  );
  const visits = firstFinite(
    merged?.visits, merged?.totalVisits, merged?.rounds, merged?.turns,
    merged?.rolls, merged?.framesPlayed, merged?.holesPlayed,
  );
  const hits = firstFinite(
    merged?.hitsTotal, merged?.totalHits, merged?.hitCount, merged?.validHits,
    merged?.targetHits, merged?.successfulDarts, merged?.progressHits,
    dartsObject?.hits, typeof merged?.hits === "number" ? merged.hits : undefined,
  );
  const misses = firstFinite(
    merged?.misses, merged?.miss, merged?.dartMisses, merged?.emptyVisits,
    merged?.gutters, dartsObject?.misses,
  );
  const score = firstFinite(
    merged?.score, merged?.totalScore, merged?.points, merged?.total,
    merged?.finalScore, merged?.runs, merged?.pins, merged?.netDistance,
    merged?.cellsRevealed, merged?.marks, merged?.progress, merged?.handsWon,
  );
  const avg = firstFinite(
    merged?.avg3D, merged?.avg3d, merged?.avg3, averages?.avg3d,
    merged?.avgVisit, merged?.averageVolley, merged?.averageDartScore,
    merged?.average, merged?.avgScore, merged?.pointsPerRound, merged?.mpr,
    darts > 0 && score > 0 ? (score / darts) * 3 : 0,
  );
  const best = firstFinite(
    merged?.bestVisit, merged?.bestScore, merged?.maxVolley, merged?.highGame,
    merged?.maxScore, merged?.bestTotal, merged?.bestMargin,
    merged?.maxCellsInVisit, merged?.bestHandScore, special?.bestVisit,
  );
  const directRate = firstFinite(
    merged?.hitRate, merged?.accuracy, merged?.successRate,
    merged?.doubleAccuracy, merged?.dartOnBoardRate, merged?.expressTargetHitRate,
  );
  const computedRate = darts > 0 ? hits / darts : visits > 0 ? hits / visits : 0;

  const specials: Record<string, number> = {
    cellsRevealed: readSpecial(merged, detail, "cellsRevealed", "contributionCells", "points"),
    cardsCompleted: readSpecial(merged, detail, "cardsCompleted"),
    bestStreak: readSpecial(merged, detail, "bestStreak"),
    totalVolleyScore: readSpecial(merged, detail, "totalVolleyScore"),
    livesLeft: readSpecial(merged, detail, "livesLeft", "lives"),
    successfulVisits: readSpecial(merged, detail, "successfulVisits"),
    total: readSpecial(merged, detail, "total", "score", "totalScore"),
    p1: readSpecial(merged, detail, "p1", "special.p1"),
    p2: readSpecial(merged, detail, "p2", "special.p2"),
    p3: readSpecial(merged, detail, "p3", "special.p3"),
    strikes: readSpecial(merged, detail, "strikes"),
    spares: readSpecial(merged, detail, "spares"),
    runs: readSpecial(merged, detail, "runs"),
    halves: readSpecial(merged, detail, "halvingEvents", "halves"),
    perfectVisits: readSpecial(merged, detail, "perfectVisits"),
    pointsWon: readSpecial(merged, detail, "pointsWon", "points"),
    marks: readSpecial(merged, detail, "marks", "marksTotal", "special.marksTotal"),
    captures: readSpecial(merged, detail, "captures"),
    escapes: readSpecial(merged, detail, "escapes"),
    prisoners: readSpecial(merged, detail, "prisonersCreated"),
    distance: readSpecial(merged, detail, "netDistance", "distance", "baseDistance"),
    boosts: readSpecial(merged, detail, "boosts", "specialBoosts"),
    attacks: readSpecial(merged, detail, "attacksLanded", "attacks"),
    kills: readSpecial(merged, detail, "kills"),
    handsPlayed: readSpecial(merged, detail, "handsPlayed"),
    handsWon: readSpecial(merged, detail, "handsWon"),
    cardsCollected: readSpecial(merged, detail, "cardsCollected"),
    choicesUsed: readSpecial(merged, detail, "choicesUsed"),
    exchangesUsed: readSpecial(merged, detail, "exchangesUsed"),
    jokers: readSpecial(merged, detail, "jokers"),
    pairs: readSpecial(merged, detail, "pairs"),
    twoPairs: readSpecial(merged, detail, "twoPairs"),
    threeOfAKinds: readSpecial(merged, detail, "threeOfAKinds"),
    straights: readSpecial(merged, detail, "straights"),
    flushes: readSpecial(merged, detail, "flushes"),
    fullHouses: readSpecial(merged, detail, "fullHouses"),
    fourOfAKinds: readSpecial(merged, detail, "fourOfAKinds"),
    straightFlushes: readSpecial(merged, detail, "straightFlushes"),
    royalFlushes: readSpecial(merged, detail, "royalFlushes"),
    fireReduced: readSpecial(merged, detail, "fireReduced", "totalFireReduced"),
    firesExtinguished: readSpecial(merged, detail, "firesExtinguished", "totalExtinguished"),
    propagationBlocked: readSpecial(merged, detail, "propagationBlocked"),
    protectionsPlaced: readSpecial(merged, detail, "protectionsPlaced"),
    waterApplied: readSpecial(merged, detail, "waterApplied"),
    canadairs: readSpecial(merged, detail, "canadairs", "dbulls"),
    zonesDestroyed: readSpecial(merged, detail, "zonesDestroyed", "totalDestroyed"),
    holes: firstFinite(
      record?.game?.holes,
      record?.payload?.stats?.global?.holes,
      record?.payload?.config?.holes,
      record?.summary?.holes,
    ),
  };

  return {
    score,
    darts,
    visits,
    hits,
    misses,
    avg,
    best,
    rate01: rate01(directRate || computedRate),
    specials,
  };
}

function isWinner(record: any, row: any, profileId: string): boolean {
  if (!row) return false;
  if (row?.win === true || row?.winner === true || row?.isWinner === true) return true;
  if ([row?.rank, row?.place, row?.position, row?.pos].some((v) => Number(v) === 1)) return true;
  const pid = String(profileId || "");
  const aliases = new Set<string>([pid, ...playerIds(row)].filter(Boolean));
  const winnerIds = [
    record?.winnerId,
    record?.summary?.winnerId,
    record?.payload?.winnerId,
    record?.payload?.summary?.winnerId,
    ...(Array.isArray(record?.winnerIds) ? record.winnerIds : []),
    ...(Array.isArray(record?.summary?.winnerIds) ? record.summary.winnerIds : []),
    ...(Array.isArray(record?.payload?.winnerIds) ? record.payload.winnerIds : []),
  ].map((v) => String(v ?? "")).filter(Boolean);
  return winnerIds.some((id) => aliases.has(id));
}

function makeAgg(key: ModeKey, title?: string, idKey?: string): ModeAgg {
  return {
    key,
    idKey: idKey || key,
    title: title || MODE_TITLES[key] || MODE_TITLES.unknown,
    sessions: 0,
    wins: 0,
    scoreSum: 0,
    scoreCount: 0,
    scoreMax: 0,
    scoreMinPositive: Infinity,
    darts: 0,
    visits: 0,
    hits: 0,
    misses: 0,
    avgSum: 0,
    avgCount: 0,
    best: 0,
    rateSum: 0,
    rateCount: 0,
    specialsSum: {},
    specialsMax: {},
    specialsMinPositive: {},
  };
}

function addSpecials(agg: ModeAgg, specials: Record<string, number>) {
  for (const [key, raw] of Object.entries(specials)) {
    const value = finite(raw);
    agg.specialsSum[key] = (agg.specialsSum[key] || 0) + value;
    agg.specialsMax[key] = Math.max(agg.specialsMax[key] || 0, value);
    if (value > 0) {
      const prev = agg.specialsMinPositive[key];
      agg.specialsMinPositive[key] = prev && prev > 0 ? Math.min(prev, value) : value;
    }
  }
}

function formatNumber(value: number, decimals = 0): string {
  const n = Number.isFinite(value) ? value : 0;
  if (decimals <= 0) return String(Math.round(n));
  const rounded = Number(n.toFixed(decimals));
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(decimals);
}

function formatPct(value01: number): string {
  return `${Math.round(Math.max(0, Math.min(1, value01)) * 100)}%`;
}

function row(label: string, value: string | number): { label: string; value: string } {
  return { label, value: String(value) };
}

function bestMetric(agg: ModeAgg): number {
  return agg.best > 0 ? agg.best : agg.scoreMax;
}

function standardRows(agg: ModeAgg): HomeModeSlide["rows"] {
  const winRate = agg.sessions > 0 ? agg.wins / agg.sessions : 0;
  const avgScore = agg.scoreCount > 0 ? agg.scoreSum / agg.scoreCount : 0;
  return [
    row("sessions", agg.sessions),
    row("victoires", agg.wins),
    row("win%", formatPct(winRate)),
    row("score moy.", formatNumber(avgScore, 1)),
    row("meilleur", formatNumber(bestMetric(agg), 0)),
    row("hits", formatNumber(agg.hits, 0)),
  ];
}

function rowsForMode(agg: ModeAgg): HomeModeSlide["rows"] {
  const winRate = agg.sessions > 0 ? agg.wins / agg.sessions : 0;
  const avgScore = agg.scoreCount > 0 ? agg.scoreSum / agg.scoreCount : 0;
  const avgMetric = agg.avgCount > 0 ? agg.avgSum / agg.avgCount : (agg.darts > 0 ? (agg.scoreSum / agg.darts) * 3 : 0);
  const hitRate = agg.rateCount > 0
    ? agg.rateSum / agg.rateCount
    : agg.darts > 0
      ? agg.hits / agg.darts
      : agg.visits > 0
        ? agg.hits / agg.visits
        : 0;
  const s = agg.specialsSum;
  const mx = agg.specialsMax;

  switch (agg.key) {
    case "five_lives":
      return [
        row("sessions", agg.sessions),
        row("win%", formatPct(winRate)),
        row("AVG3D", formatNumber(avgMetric, 2)),
        row("best visit", formatNumber(bestMetric(agg), 0)),
        row("hits", formatNumber(agg.hits, 0)),
        row("hit%", formatPct(hitRate)),
      ];
    case "loterie":
      return [
        row("sessions", agg.sessions),
        row("win%", formatPct(winRate)),
        row("cases", formatNumber(s.cellsRevealed || agg.scoreSum, 0)),
        row("hit%", formatPct(hitRate)),
        row("avg volée", formatNumber(avgMetric, 1)),
        row("best série", formatNumber(mx.bestStreak, 0)),
      ];
    case "golf": {
      const bestScore = agg.scoreMinPositive !== Infinity ? agg.scoreMinPositive : 0;
      return [
        row("sessions", agg.sessions),
        row("win%", formatPct(winRate)),
        row("meilleur score", formatNumber(bestScore, 0)),
        row("score moyen", formatNumber(avgScore, 1)),
        row("darts", formatNumber(agg.darts, 0)),
        row("trous", formatNumber(s.holes, 0)),
      ];
    }
    case "bowling":
      return [
        row("sessions", agg.sessions),
        row("win%", formatPct(winRate)),
        row("meilleur score", formatNumber(bestMetric(agg), 0)),
        row("score moyen", formatNumber(avgScore, 1)),
        row("strikes", formatNumber(s.strikes, 0)),
        row("spares", formatNumber(s.spares, 0)),
      ];
    case "baseball":
      return [
        row("sessions", agg.sessions),
        row("win%", formatPct(winRate)),
        row("runs", formatNumber(s.runs || agg.scoreSum, 0)),
        row("hits", formatNumber(agg.hits, 0)),
        row("runs/match", formatNumber(agg.sessions ? (s.runs || agg.scoreSum) / agg.sessions : 0, 1)),
        row("best", formatNumber(bestMetric(agg), 0)),
      ];
    case "bobs_27":
      return [
        row("sessions", agg.sessions),
        row("win%", formatPct(winRate)),
        row("score moyen", formatNumber(avgScore, 1)),
        row("best score", formatNumber(bestMetric(agg), 0)),
        row("doubles", formatNumber(agg.hits, 0)),
        row("précision", formatPct(hitRate)),
      ];
    case "halve_it":
      return [
        row("sessions", agg.sessions),
        row("win%", formatPct(winRate)),
        row("score moyen", formatNumber(avgScore, 1)),
        row("best score", formatNumber(bestMetric(agg), 0)),
        row("hits", formatNumber(agg.hits, 0)),
        row("divisions", formatNumber(s.halves, 0)),
      ];
    case "shooter":
      return [
        row("sessions", agg.sessions),
        row("win%", formatPct(winRate)),
        row("points", formatNumber(s.pointsWon || agg.scoreSum, 0)),
        row("marks", formatNumber(s.marks || agg.hits, 0)),
        row("hit%", formatPct(hitRate)),
        row("perfect", formatNumber(s.perfectVisits, 0)),
      ];
    case "prisoner":
      return [
        row("sessions", agg.sessions),
        row("win%", formatPct(winRate)),
        row("progression", formatNumber(agg.hits || agg.scoreSum, 0)),
        row("captures", formatNumber(s.captures, 0)),
        row("prisonniers", formatNumber(s.prisoners, 0)),
        row("hit%", formatPct(hitRate)),
      ];
    case "attrape_moi":
      return [
        row("sessions", agg.sessions),
        row("win%", formatPct(winRate)),
        row("points", formatNumber(agg.scoreSum, 0)),
        row("captures", formatNumber(s.captures, 0)),
        row("évasions", formatNumber(s.escapes, 0)),
        row("best visit", formatNumber(bestMetric(agg), 0)),
      ];
    case "darts_poker":
      return [
        row("parties", agg.sessions),
        row("win%", formatPct(winRate)),
        row("mains gagnées", formatNumber(s.handsWon || agg.scoreSum, 0)),
        row("meilleure main", formatNumber(bestMetric(agg), 0)),
        row("cartes", formatNumber(s.cardsCollected, 0)),
        row("pouvoirs", formatNumber((s.choicesUsed || 0) + (s.exchangesUsed || 0) + (s.jokers || 0), 0)),
      ];
    case "darts_firefighter":
      return [
        row("missions", agg.sessions),
        row("victoires", agg.wins),
        row("feu réduit", formatNumber(s.fireReduced, 0)),
        row("extinctions", formatNumber(s.firesExtinguished, 0)),
        row("blocages", formatNumber(s.propagationBlocked, 0)),
        row("Canadairs", formatNumber(s.canadairs, 0)),
      ];
    case "darts_racer":
      return [
        row("sessions", agg.sessions),
        row("win%", formatPct(winRate)),
        row("distance", formatNumber(s.distance || agg.scoreSum, 0)),
        row("boosts", formatNumber(s.boosts, 0)),
        row("attaques", formatNumber(s.attacks, 0)),
        row("hit%", formatPct(hitRate)),
      ];
    case "shanghai":
    case "capital":
    case "count_up":
    case "game_170":
    case "super_bull":
    case "happy_mille":
    case "simple_rounds":
      return [
        row("sessions", agg.sessions),
        row("win%", formatPct(winRate)),
        row("score moyen", formatNumber(avgScore, 1)),
        row("best score", formatNumber(bestMetric(agg), 0)),
        row("hits", formatNumber(agg.hits, 0)),
        row("hit%", formatPct(hitRate)),
      ];
    case "enculette":
    case "territories":
    case "warfare":
    case "battle_royale":
    case "scram":
    case "batard":
    case "president":
    case "tic_tac_toe":
    case "football":
    case "rugby":
    case "knockout":
    case "defi":
    case "fun_gages":
    case "clock":
    case "training":
    case "babyfoot":
    case "pingpong":
    case "petanque":
    case "molkky":
    case "dicegame":
    default:
      return standardRows(agg);
  }
}

export function buildHomeModeSlides(
  matches: any[],
  profileId: string,
  profileName?: string,
  requestedSport: string = "darts",
  excludedModes: ModeKey[] = ["x01", "cricket", "killer"],
): HomeModeSlide[] {
  const excluded = new Set<ModeKey>(excludedModes);
  const byMode = new Map<string, ModeAgg>();

  for (const record of Array.isArray(matches) ? matches : []) {
    const mode = detectHomeMode(record);
    if (excluded.has(mode) || !recordMatchesSport(record, mode, requestedSport)) continue;

    const player = findPlayerRow(record, profileId, profileName);
    if (!player) continue;

    const unknownToken = mode === "unknown" ? rawModeToken(record) : "";
    if (mode === "unknown" && !unknownToken) continue;
    const bucketKey = mode === "unknown" ? `unknown:${unknownToken}` : mode;
    const modeTitle = mode === "unknown" ? rawModeTitle(record, unknownToken) : MODE_TITLES[mode];

    const detail = mapPlayerDetail(record, profileId, player);
    const metrics = extractMetrics(record, player, detail);
    const agg = byMode.get(bucketKey) || makeAgg(mode, modeTitle, mode === "unknown" ? `custom-${unknownToken}` : mode);

    agg.sessions += 1;
    if (isWinner(record, player, profileId)) agg.wins += 1;

    if (metrics.score || metrics.score === 0) {
      agg.scoreSum += metrics.score;
      agg.scoreCount += 1;
      agg.scoreMax = Math.max(agg.scoreMax, metrics.score);
      if (metrics.score > 0) agg.scoreMinPositive = Math.min(agg.scoreMinPositive, metrics.score);
    }
    agg.darts += metrics.darts;
    agg.visits += metrics.visits;
    agg.hits += metrics.hits;
    agg.misses += metrics.misses;
    if (metrics.avg > 0) {
      agg.avgSum += metrics.avg;
      agg.avgCount += 1;
    }
    agg.best = Math.max(agg.best, metrics.best);
    if (metrics.rate01 > 0) {
      agg.rateSum += metrics.rate01;
      agg.rateCount += 1;
    }
    addSpecials(agg, metrics.specials);
    byMode.set(bucketKey, agg);
  }

  return [...byMode.values()]
    .filter((agg) => agg.sessions > 0)
    .sort((a, b) => b.sessions - a.sessions || a.title.localeCompare(b.title, "fr"))
    .map((agg) => ({
      id: `mode-${agg.idKey}`,
      title: agg.title,
      rows: rowsForMode(agg),
    }));
}
