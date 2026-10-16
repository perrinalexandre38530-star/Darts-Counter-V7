// @ts-nocheck
import type { GameDart, Player } from "../types-game";

export type PtitHunBotLevel = "easy" | "normal" | "hard";
export type PtitHunJackpotRingMode = "random" | "double" | "triple";
export type PtitHunJackpotRefresh = "visit" | "round";
export type PtitHunMissMode = "multiply" | "add";

export type PtitHunConfigPayload = {
  mode: "ptit_hun";
  selectedIds: string[];
  players: number;
  playersList?: any[];
  botIds?: string[];
  botsEnabled?: boolean;
  botLevel: PtitHunBotLevel;
  randomOrder?: boolean;
  scoreInputMethod?: "keypad" | "dartboard";
  seriesWins?: 1 | 2 | 3;
  sfxEnabled?: boolean;
  awenaEnabled?: boolean;
  coachEnabled?: boolean;
  firstVisitGuide?: boolean;
  rules: {
    rounds: number;
    startScore: number;
    outerSingleFactor: number;
    doubleFactor: number;
    tripleFactor: number;
    bull25Factor: number;
    missMode: PtitHunMissMode;
    missValue: number;
    dbullEnabled: boolean;
    dbullDivider: number;
    zeroAbsoluteEnabled: boolean;
    dbullsForZero: number;
    tripleNulEnabled: boolean;
    shieldEnabled: boolean;
    cleanVisitsForShield: number;
    shieldDivider: number;
    jackpotEnabled: boolean;
    jackpotRingMode: PtitHunJackpotRingMode;
    jackpotZones: number;
    jackpotRefresh: PtitHunJackpotRefresh;
  };
};

export type PtitHunJackpotTarget = { bed: "D" | "T"; number: number; label: string };

export type PtitHunStats = {
  darts: number;
  visits: number;
  innerSingles: number;
  outerSingles: number;
  doubles: number;
  triples: number;
  bulls25: number;
  dbulls: number;
  misses: number;
  tripleNuls: number;
  cleanVisits: number;
  currentCleanStreak: number;
  bestCleanStreak: number;
  shieldUnlocked: number;
  shieldedVisits: number;
  shieldSaved: number;
  zeroAbsolute: number;
  jackpotHits: number;
  jackpotVisits: number;
  petitOneHits: number;
  petitOneTriples: number;
  zeroVisits: number;
  worstVisitDelta: number;
  bestScoreDrop: number;
  lowestScore: number;
  highestScore: number;
  scoreAdded: number;
  scoreRemoved: number;
  missDamage: number;
  outerDamage: number;
  doubleDamage: number;
  tripleDamage: number;
  bull25Damage: number;
  dbullSaved: number;
  jackpotSaved: number;
  tripleNulSaved: number;
  specialMisses: number;
  shieldQualifyingVisits: number;
  innerByNumber: Record<string, number>;
  outerByNumber: Record<string, number>;
  doubleByNumber: Record<string, number>;
  tripleByNumber: Record<string, number>;
};

export type PtitHunVisit = {
  id: string;
  playerId: string;
  turn: number;
  darts: GameDart[];
  before: number;
  rawAfter: number;
  after: number;
  delta: number;
  rawDelta: number;
  cleanVisit: boolean;
  tripleNul: boolean;
  tripleNulNumber?: number;
  petitOnePerfect?: boolean;
  jackpotHit: boolean;
  jackpotTargets: PtitHunJackpotTarget[];
  shieldBefore: boolean;
  shieldUnlockedNow: boolean;
  zeroAbsoluteNow: boolean;
  zeroPenaltyFloor?: boolean;
  dbullsBefore: number;
  dbullsAfter: number;
  dartSteps?: Array<{
    index: number;
    label: string;
    kind: string;
    before: number;
    rawAfter: number;
    after: number;
    delta: number;
    dbullOrdinal?: number;
    dbullDivisor?: number;
    shieldSaved?: number;
    zeroAbsoluteNow?: boolean;
  }>;
  events: string[];
};

export type PtitHunState = {
  sport: "darts";
  mode: "ptit_hun";
  config: PtitHunConfigPayload;
  players: Player[];
  scores: Record<string, number>;
  shieldActive: Record<string, boolean>;
  cleanStreak: Record<string, number>;
  zeroAbsoluteUsed: Record<string, boolean>;
  statsByPlayer: Record<string, PtitHunStats>;
  jackpotTargets: PtitHunJackpotTarget[];
  jackpotCycle: number;
  activePlayerIndex: number;
  turnIndex: number;
  phase: "playing" | "finished";
  winnerId: string | null;
  rankings: Array<{ id: string; rank: number; score: number }>;
  visits: PtitHunVisit[];
  startedAt: number;
  finishedAt?: number;
};

const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v));
const uid = (p = "hunv") => `${p}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
const clampInt = (value: any, min: number, max: number, fallback: number) => {
  const n = Math.round(Number(value));
  return Number.isFinite(n) ? Math.max(min, Math.min(max, n)) : fallback;
};

const blankStats = (startScore = 20): PtitHunStats => ({
  darts: 0, visits: 0, innerSingles: 0, outerSingles: 0, doubles: 0, triples: 0,
  bulls25: 0, dbulls: 0, misses: 0, tripleNuls: 0, cleanVisits: 0,
  currentCleanStreak: 0, bestCleanStreak: 0, shieldUnlocked: 0, shieldedVisits: 0,
  shieldSaved: 0, zeroAbsolute: 0, jackpotHits: 0, jackpotVisits: 0, petitOneHits: 0,
  petitOneTriples: 0, zeroVisits: 0, worstVisitDelta: 0, bestScoreDrop: 0, lowestScore: startScore,
  highestScore: startScore, scoreAdded: 0, scoreRemoved: 0, missDamage: 0, outerDamage: 0,
  doubleDamage: 0, tripleDamage: 0, bull25Damage: 0, dbullSaved: 0, jackpotSaved: 0,
  tripleNulSaved: 0, specialMisses: 0, shieldQualifyingVisits: 0,
  innerByNumber: {}, outerByNumber: {}, doubleByNumber: {}, tripleByNumber: {},
});

export function normalizePtitHunConfig(raw: any): PtitHunConfigPayload {
  const r = raw?.rules || {};
  const ids = Array.isArray(raw?.selectedIds) ? raw.selectedIds.map(String) : [];
  const rounds = [3, 5, 7, 10, 15, 20, 30].includes(Number(r?.rounds)) ? Number(r.rounds) : 10;
  const missMode: PtitHunMissMode = r?.missMode === "add" ? "add" : "multiply";
  const jackpotRingMode: PtitHunJackpotRingMode = r?.jackpotRingMode === "double" || r?.jackpotRingMode === "triple" ? r.jackpotRingMode : "random";
  const jackpotRefresh: PtitHunJackpotRefresh = r?.jackpotRefresh === "round" ? "round" : "visit";
  return {
    mode: "ptit_hun",
    selectedIds: ids,
    players: Math.max(1, Number(raw?.players || ids.length || 1)),
    playersList: Array.isArray(raw?.playersList) ? raw.playersList : [],
    botIds: Array.isArray(raw?.botIds) ? raw.botIds.map(String) : [],
    botsEnabled: Boolean(raw?.botsEnabled),
    botLevel: raw?.botLevel === "easy" || raw?.botLevel === "hard" ? raw.botLevel : "normal",
    randomOrder: raw?.randomOrder !== false,
    scoreInputMethod: raw?.scoreInputMethod === "dartboard" ? "dartboard" : "keypad",
    seriesWins: 1,
    sfxEnabled: raw?.sfxEnabled !== false,
    awenaEnabled: raw?.awenaEnabled !== false,
    coachEnabled: raw?.coachEnabled !== false,
    firstVisitGuide: raw?.firstVisitGuide !== false,
    rules: {
      rounds,
      startScore: clampInt(r?.startScore, 1, 500, 20),
      outerSingleFactor: clampInt(r?.outerSingleFactor, 2, 50, 10),
      doubleFactor: clampInt(r?.doubleFactor, 2, 6, 2),
      tripleFactor: clampInt(r?.tripleFactor, 2, 8, 3),
      bull25Factor: clampInt(r?.bull25Factor, 2, 10, 4),
      missMode,
      missValue: missMode === "add" ? clampInt(r?.missValue, 10, 500, 50) : clampInt(r?.missValue ?? r?.missFactor, 2, 10, 5),
      dbullEnabled: r?.dbullEnabled !== false,
      dbullDivider: clampInt(r?.dbullDivider, 2, 5, 2),
      zeroAbsoluteEnabled: r?.zeroAbsoluteEnabled !== false,
      dbullsForZero: clampInt(r?.dbullsForZero, 2, 6, 3),
      tripleNulEnabled: r?.tripleNulEnabled !== false,
      shieldEnabled: r?.shieldEnabled !== false,
      cleanVisitsForShield: clampInt(r?.cleanVisitsForShield, 2, 6, 3),
      shieldDivider: clampInt(r?.shieldDivider, 2, 5, 2),
      jackpotEnabled: r?.jackpotEnabled !== false,
      jackpotRingMode,
      jackpotZones: clampInt(r?.jackpotZones, 1, 2, 1),
      jackpotRefresh,
    },
  };
}

export function isPtitHunInnerSingle(d: any): boolean {
  return Boolean(d && d.bed === "S" && String(d.ring || "") === "inner_single" && Number(d.number) >= 1 && Number(d.number) <= 20);
}
export function isPtitHunOuterSingle(d: any): boolean {
  return Boolean(d && d.bed === "S" && String(d.ring || "") === "outer_single" && Number(d.number) >= 1 && Number(d.number) <= 20);
}
export function ptitHunDartLabel(d: any): string {
  if (!d) return "MISS";
  if (d.bed === "MISS") {
    const ring = String(d?.ring || "");
    if (ring.startsWith("ptit_special|")) {
      const parts = ring.split("|");
      return parts.slice(2).join("|") || "ZONE";
    }
    return "MISS";
  }
  if (d.bed === "IB") return "DBULL";
  if (d.bed === "OB") return "BULL25";
  if (d.bed === "D") return `D${d.number}`;
  if (d.bed === "T") return `T${d.number}`;
  if (isPtitHunInnerSingle(d)) return `PETIT ${d.number}`;
  if (isPtitHunOuterSingle(d)) return `GROS ${d.number}`;
  return `S${d.number}`;
}

function allInner(darts: GameDart[]) { return darts.length === 3 && darts.every(isPtitHunInnerSingle); }
function tripleNul(darts: GameDart[]) { return allInner(darts) && new Set(darts.map((d: any) => Number(d.number))).size === 1; }

function makeJackpotTarget(mode: PtitHunJackpotRingMode): PtitHunJackpotTarget {
  const bed: "D" | "T" = mode === "double" ? "D" : mode === "triple" ? "T" : (Math.random() < .5 ? "D" : "T");
  const number = 1 + Math.floor(Math.random() * 20);
  return { bed, number, label: `${bed}${number}` };
}

export function generatePtitHunJackpots(rules: PtitHunConfigPayload["rules"]): PtitHunJackpotTarget[] {
  if (!rules.jackpotEnabled) return [];
  const count = Math.max(1, Math.min(2, Number(rules.jackpotZones || 1)));
  const out: PtitHunJackpotTarget[] = [];
  let guard = 0;
  while (out.length < count && guard < 100) {
    guard += 1;
    const t = makeJackpotTarget(rules.jackpotRingMode);
    if (!out.some((x) => x.bed === t.bed && x.number === t.number)) out.push(t);
  }
  return out;
}

export function ptitHunDartHitsJackpot(d: any, targets: PtitHunJackpotTarget[]) {
  return Boolean(d && (targets || []).some((t) => d.bed === t.bed && Number(d.number) === Number(t.number)));
}

export function rankPtitHunPlayers(state: PtitHunState) {
  const rows = (state.players || []).map((p: any, index: number) => {
    const st = state.statsByPlayer?.[p.id] || blankStats(state.config.rules.startScore);
    return {
      id: String(p.id), score: Number(state.scores?.[p.id] ?? state.config.rules.startScore),
      tripleNuls: Number(st.tripleNuls || 0), jackpotVisits: Number(st.jackpotVisits || 0), dbulls: Number(st.dbulls || 0),
      cleanVisits: Number(st.cleanVisits || 0), misses: Number(st.misses || 0), innerSingles: Number(st.innerSingles || 0), order: index,
    };
  });
  rows.sort((a, b) => a.score - b.score || b.tripleNuls - a.tripleNuls || b.jackpotVisits - a.jackpotVisits || b.dbulls - a.dbulls || b.cleanVisits - a.cleanVisits || a.misses - b.misses || b.innerSingles - a.innerSingles || a.order - b.order);
  return rows.map((row, index) => ({ id: row.id, rank: index + 1, score: row.score }));
}

export function createPtitHunState(players: Player[], raw: any): PtitHunState {
  const config = normalizePtitHunConfig(raw);
  const ps = (players || []).map((p: any, i: number) => ({ ...p, id: String(p?.id || `p${i + 1}`), name: String(p?.name || `Joueur ${i + 1}`) }));
  const start = config.rules.startScore;
  return {
    sport: "darts", mode: "ptit_hun", config, players: ps,
    scores: Object.fromEntries(ps.map((p) => [p.id, start])),
    shieldActive: Object.fromEntries(ps.map((p) => [p.id, false])),
    cleanStreak: Object.fromEntries(ps.map((p) => [p.id, 0])),
    zeroAbsoluteUsed: Object.fromEntries(ps.map((p) => [p.id, false])),
    statsByPlayer: Object.fromEntries(ps.map((p) => [p.id, blankStats(start)])),
    jackpotTargets: generatePtitHunJackpots(config.rules), jackpotCycle: 0,
    activePlayerIndex: 0, turnIndex: 0, phase: "playing", winnerId: null, rankings: [], visits: [], startedAt: Date.now(),
  };
}

export function clonePtitHunState(raw: PtitHunState): PtitHunState {
  const s: any = clone(raw);
  const start = Number(s?.config?.rules?.startScore || 20);
  for (const p of s.players || []) s.statsByPlayer[p.id] = { ...blankStats(start), ...(s.statsByPlayer?.[p.id] || {}) };
  s.shieldActive = s.shieldActive || Object.fromEntries((s.players || []).map((p: any) => [p.id, false]));
  s.cleanStreak = s.cleanStreak || Object.fromEntries((s.players || []).map((p: any) => [p.id, 0]));
  s.zeroAbsoluteUsed = s.zeroAbsoluteUsed || Object.fromEntries((s.players || []).map((p: any) => [p.id, false]));
  s.rankings = Array.isArray(s.rankings) ? s.rankings : [];
  s.jackpotTargets = Array.isArray(s.jackpotTargets) ? s.jackpotTargets : generatePtitHunJackpots(s.config.rules);
  s.jackpotCycle = Number(s.jackpotCycle || 0);
  return s;
}

function ptitHunPenaltyBase(score: number, rules: PtitHunConfigPayload["rules"]) {
  // Le MISS multiplicatif reste une sanction appliquée au total courant.
  // À 0, on repart du score de départ pour éviter un MISS gratuit.
  return score > 0 ? score : Math.max(1, Number(rules.startScore || 20));
}

export function ptitHunDbullDivisor(rules: PtitHunConfigPayload["rules"], cumulativeDbullOrdinal = 1) {
  const base = Math.max(2, Number(rules.dbullDivider || 2));
  const ordinal = Math.max(1, Math.round(Number(cumulativeDbullOrdinal || 1)));
  // Progression officielle : 1er DBULL ÷base, 2e ÷base² (donc ÷4 par défaut),
  // puis ÷base^n tant que ZÉRO ABSOLU n'a pas pris le relais.
  return Math.pow(base, ordinal);
}

function isDangerPenaltyKind(kind: string) {
  return kind === "outer" || kind === "double" || kind === "triple" || kind === "bull25" || kind === "miss";
}

export function scorePtitHunDart(
  score: number,
  d: any,
  rules: PtitHunConfigPayload["rules"],
  context: { dbullOrdinal?: number; forceZeroAbsolute?: boolean } = {},
) {
  const before = Math.max(0, Math.round(Number(score || 0)));
  let after = before;
  let kind = "inner";
  let baseValue = 0;
  let factor = 1;

  if (!d || d.bed === "MISS") {
    kind = "miss";
    factor = rules.missMode === "multiply" ? Number(rules.missValue || 5) : 1;
    after = rules.missMode === "add"
      ? before + Number(rules.missValue || 0)
      : ptitHunPenaltyBase(before, rules) * factor;
  } else if (d.bed === "IB") {
    kind = "dbull";
    baseValue = 50;
    if (context.forceZeroAbsolute) {
      factor = 0;
      after = 0;
    } else if (rules.dbullEnabled) {
      factor = ptitHunDbullDivisor(rules, context.dbullOrdinal || 1);
      after = Math.ceil(before / factor);
    } else {
      factor = 1;
      after = before + 50;
    }
  } else if (d.bed === "OB") {
    kind = "bull25";
    baseValue = 25;
    factor = Number(rules.bull25Factor || 4);
    after = before + baseValue * factor;
  } else if (d.bed === "D") {
    kind = "double";
    // "Valeur réelle du Double × facteur" : D5 vaut 10, puis ×2 => +20 par défaut.
    baseValue = Number(d.number || 0) * 2;
    factor = Number(rules.doubleFactor || 2);
    after = before + baseValue * factor;
  } else if (d.bed === "T") {
    kind = "triple";
    // "Valeur réelle du Triple × facteur" : T5 vaut 15, puis ×3 => +45 par défaut.
    baseValue = Number(d.number || 0) * 3;
    factor = Number(rules.tripleFactor || 3);
    after = before + baseValue * factor;
  } else if (isPtitHunOuterSingle(d)) {
    kind = "outer";
    baseValue = Number(d.number || 0);
    factor = Number(rules.outerSingleFactor || 10);
    after = before + baseValue * factor;
  } else {
    kind = "inner";
    baseValue = Number(d.number || 0);
    after = before + baseValue;
  }

  after = Math.max(0, Math.round(after));
  return { before, after, delta: after - before, kind, baseValue, factor };
}

export function playPtitHunVisit(input: PtitHunState, dartsRaw: GameDart[]): PtitHunState {
  const s = clonePtitHunState(input);
  if (s.phase !== "playing" || !s.players.length) return s;
  const p: any = s.players[s.activePlayerIndex];
  if (!p) return s;

  const darts = (dartsRaw || []).slice(0, 3);
  if (darts.length !== 3) return s;

  const rules = s.config.rules;
  const st = s.statsByPlayer[p.id] || (s.statsByPlayer[p.id] = blankStats(rules.startScore));
  const before = Number(s.scores[p.id] ?? rules.startScore);
  const shieldBefore = Boolean(s.shieldActive[p.id]);
  const dbullsBefore = Number(st.dbulls || 0);
  const activeJackpots = clone(s.jackpotTargets || []);
  const isTripleNul = Boolean(rules.tripleNulEnabled && tripleNul(darts));
  // Une volée qualifie le Bouclier uniquement si les 3 fléchettes sont dans LE MÊME petit simple.
  const shieldQualifyingVisit = isTripleNul;
  const jackpotDarts = rules.jackpotEnabled ? darts.filter((d: any) => ptitHunDartHitsJackpot(d, activeJackpots)) : [];
  const jackpotHit = jackpotDarts.length > 0;
  const events: string[] = [];
  const dartSteps: PtitHunVisit["dartSteps"] = [];
  let zeroPenaltyFloor = false;
  let zeroAbsoluteNow = false;
  let zeroAbsoluteStepIndex = -1;
  let running = before;
  let rawRunning = before;
  let transientPeak = before;
  let transientLow = before;
  let visitShieldSaved = 0;
  let visitAdded = 0;
  let visitRemoved = 0;

  const bump = (bucket: Record<string, number> | undefined, n: number) => {
    if (!bucket || !Number.isFinite(n) || n < 1 || n > 20) return;
    const k = String(Math.round(n));
    bucket[k] = Number(bucket[k] || 0) + 1;
  };

  st.visits += 1;

  // Le score évolue à chaque impact, dans l'ordre exact de la volée.
  for (let index = 0; index < darts.length; index += 1) {
    const d: any = darts[index];
    st.darts += 1;

    if (!d || d.bed === "MISS") {
      st.misses += 1;
      if (String(d?.ring || "").startsWith("ptit_special|")) st.specialMisses += 1;
    } else if (d.bed === "IB") {
      st.dbulls += 1;
    } else if (d.bed === "OB") {
      st.bulls25 += 1;
    } else if (d.bed === "D") {
      st.doubles += 1;
      bump(st.doubleByNumber, Number(d.number));
    } else if (d.bed === "T") {
      st.triples += 1;
      bump(st.tripleByNumber, Number(d.number));
    } else if (isPtitHunInnerSingle(d)) {
      st.innerSingles += 1;
      bump(st.innerByNumber, Number(d.number));
      if (Number(d.number) === 1) st.petitOneHits += 1;
    } else if (isPtitHunOuterSingle(d)) {
      st.outerSingles += 1;
      bump(st.outerByNumber, Number(d.number));
    }

    const beforeDart = running;
    const dbullOrdinal = d?.bed === "IB" ? Number(st.dbulls || 0) : undefined;
    const reachesZeroAbsolute = Boolean(
      d?.bed === "IB" &&
      rules.zeroAbsoluteEnabled &&
      !s.zeroAbsoluteUsed[p.id] &&
      Number(st.dbulls || 0) >= Number(rules.dbullsForZero || 3)
    );

    const dangerousMultiplier = (!d || d.bed === "MISS") && rules.missMode === "multiply";
    if (beforeDart === 0 && dangerousMultiplier) zeroPenaltyFloor = true;

    const scored = scorePtitHunDart(beforeDart, d, rules, {
      dbullOrdinal,
      forceZeroAbsolute: reachesZeroAbsolute,
    });
    rawRunning = scored.after;
    let afterDart = rawRunning;
    let shieldSavedThisDart = 0;

    // Le Bouclier agit impact par impact sur les pénalités positives, jamais sur les bonus DBULL.
    if (shieldBefore && rules.shieldEnabled && isDangerPenaltyKind(scored.kind) && scored.delta > 0) {
      const reducedDamage = Math.ceil(scored.delta / Number(rules.shieldDivider || 2));
      afterDart = beforeDart + reducedDamage;
      shieldSavedThisDart = Math.max(0, scored.delta - reducedDamage);
      visitShieldSaved += shieldSavedThisDart;
      st.shieldSaved += shieldSavedThisDart;
    }

    running = Math.max(0, Math.round(afterDart));
    transientPeak = Math.max(transientPeak, running);
    transientLow = Math.min(transientLow, running);

    const effectiveDelta = running - beforeDart;
    if (effectiveDelta > 0) {
      visitAdded += effectiveDelta;
      st.scoreAdded += effectiveDelta;
      if (scored.kind === "miss") st.missDamage += effectiveDelta;
      else if (scored.kind === "outer") st.outerDamage += effectiveDelta;
      else if (scored.kind === "double") st.doubleDamage += effectiveDelta;
      else if (scored.kind === "triple") st.tripleDamage += effectiveDelta;
      else if (scored.kind === "bull25") st.bull25Damage += effectiveDelta;
    } else if (effectiveDelta < 0) {
      const removed = Math.abs(effectiveDelta);
      visitRemoved += removed;
      st.scoreRemoved += removed;
      if (scored.kind === "dbull") st.dbullSaved += removed;
    }

    if (reachesZeroAbsolute) {
      zeroAbsoluteNow = true;
      zeroAbsoluteStepIndex = index;
      s.zeroAbsoluteUsed[p.id] = true;
      st.zeroAbsolute += 1;
      events.push(`ZÉRO ABSOLU · ${rules.dbullsForZero}e DBULL cumulé · score remis à 0 immédiatement`);
    } else if (d?.bed === "IB" && rules.dbullEnabled) {
      const divisor = ptitHunDbullDivisor(rules, dbullOrdinal || 1);
      events.push(`${dbullOrdinal}e DBULL · score courant ÷${divisor}`);
    }

    dartSteps.push({
      index,
      label: ptitHunDartLabel(d),
      kind: scored.kind,
      before: beforeDart,
      rawAfter: scored.after,
      after: running,
      delta: running - beforeDart,
      dbullOrdinal,
      dbullDivisor: d?.bed === "IB" && rules.dbullEnabled && !reachesZeroAbsolute ? ptitHunDbullDivisor(rules, dbullOrdinal || 1) : undefined,
      shieldSaved: shieldSavedThisDart || undefined,
      zeroAbsoluteNow: reachesZeroAbsolute || undefined,
    });
  }

  // Jackpot et Triple Nul annulent la volée entière : retour au score du début de volée.
  // ZÉRO ABSOLU reste prioritaire s'il a été déclenché durant cette même volée.
  let rawAfter = running;
  let after = running;
  if (jackpotHit && !zeroAbsoluteNow) {
    st.jackpotHits += jackpotDarts.length;
    st.jackpotVisits += 1;
    const saved = Math.max(0, running - before);
    st.jackpotSaved += saved;
    rawAfter = before;
    after = before;
    const labels = [...new Set(jackpotDarts.map((d: any) => `${d.bed}${d.number}`))].join(" + ");
    events.push(`JACKPOT ${labels} · volée annulée · retour à ${before}`);
  } else if (isTripleNul && !zeroAbsoluteNow) {
    st.tripleNuls += 1;
    const tripleNulNumber = Number((darts[0] as any)?.number || 0);
    if (tripleNulNumber === 1) st.petitOneTriples += 1;
    const saved = Math.max(0, running - before);
    st.tripleNulSaved += saved;
    rawAfter = before;
    after = before;
    events.push(tripleNulNumber === 1
      ? `P’TIT 1 PARFAIT · 3 petits 1 · volée annulée`
      : `TRIPLE NUL · 3 petits ${tripleNulNumber} · volée annulée`);
  } else {
    if (jackpotHit) {
      // Un Jackpot touché dans une volée contenant le DBULL de ZÉRO ABSOLU reste comptabilisé,
      // mais le bonus global ZÉRO ABSOLU garde la priorité.
      st.jackpotHits += jackpotDarts.length;
      st.jackpotVisits += 1;
      events.push(`JACKPOT touché · ZÉRO ABSOLU prioritaire`);
    }
    if (isTripleNul) {
      st.tripleNuls += 1;
      const tripleNulNumber = Number((darts[0] as any)?.number || 0);
      if (tripleNulNumber === 1) st.petitOneTriples += 1;
    }
  }

  if (zeroPenaltyFloor) events.push(`À 0, MISS multiplicatif relancé depuis le capital ${rules.startScore}`);
  if (visitShieldSaved > 0) {
    st.shieldedVisits += 1;
    events.push(`BOUCLIER · ${visitShieldSaved} point${visitShieldSaved > 1 ? "s" : ""} sauvé${visitShieldSaved > 1 ? "s" : ""}`);
  }

  let shieldUnlockedNow = false;
  if (rules.shieldEnabled && !s.shieldActive[p.id]) {
    if (shieldQualifyingVisit) {
      st.cleanVisits += 1;
      st.shieldQualifyingVisits += 1;
      st.currentCleanStreak += 1;
      st.bestCleanStreak = Math.max(st.bestCleanStreak, st.currentCleanStreak);
      s.cleanStreak[p.id] = st.currentCleanStreak;
      if (st.currentCleanStreak >= Number(rules.cleanVisitsForShield || 3)) {
        s.shieldActive[p.id] = true;
        st.shieldUnlocked = 1;
        shieldUnlockedNow = true;
        events.push(`BOUCLIER DU HUN débloqué · ${st.currentCleanStreak} TRIPLE NUL consécutifs · pénalités ÷${rules.shieldDivider}`);
      } else {
        events.push(`Série Bouclier ${st.currentCleanStreak}/${rules.cleanVisitsForShield} · TRIPLE NUL consécutifs`);
      }
    } else {
      st.currentCleanStreak = 0;
      s.cleanStreak[p.id] = 0;
    }
  } else if (rules.shieldEnabled && shieldQualifyingVisit) {
    st.cleanVisits += 1;
    st.shieldQualifyingVisits += 1;
  }

  after = Math.max(0, Math.round(after));
  st.lowestScore = Math.min(Number(st.lowestScore ?? before), after, transientLow);
  st.highestScore = Math.max(Number(st.highestScore ?? before), after, transientPeak);
  s.scores[p.id] = after;
  const finalDelta = after - before;

  if ((jackpotHit || isTripleNul) && !zeroAbsoluteNow) st.zeroVisits += 1;
  if (zeroAbsoluteNow && after === 0) st.zeroVisits += 1;
  st.worstVisitDelta = Math.max(Number(st.worstVisitDelta || 0), finalDelta, Math.max(0, transientPeak - before));
  st.bestScoreDrop = Math.max(Number(st.bestScoreDrop || 0), Math.max(0, before - after), visitRemoved);

  const tripleNulNumber = isTripleNul ? Number((darts[0] as any)?.number || 0) : undefined;
  if (!jackpotHit && !isTripleNul && !events.some((e) => e.startsWith("BOUCLIER ·"))) {
    events.push(`${before} → ${after} (${after >= before ? "+" : ""}${after - before})`);
  }

  s.visits.push({
    id: uid(), playerId: p.id, turn: st.visits, darts, before, rawAfter, after,
    delta: finalDelta, rawDelta: rawAfter - before,
    cleanVisit: shieldQualifyingVisit,
    tripleNul: isTripleNul,
    tripleNulNumber,
    petitOnePerfect: tripleNulNumber === 1,
    jackpotHit,
    jackpotTargets: activeJackpots,
    shieldBefore,
    shieldUnlockedNow,
    zeroAbsoluteNow,
    zeroPenaltyFloor,
    dbullsBefore,
    dbullsAfter: Number(st.dbulls || 0),
    dartSteps,
    events,
  });

  s.turnIndex += 1;

  const complete = (s.players || []).every((pl: any) => Number(s.statsByPlayer?.[pl.id]?.visits || 0) >= rules.rounds);
  if (complete) {
    s.rankings = rankPtitHunPlayers(s);
    s.winnerId = s.rankings[0]?.id || null;
    s.phase = "finished";
    s.finishedAt = Date.now();
    return s;
  }

  const nextIndex = (s.activePlayerIndex + 1) % s.players.length;
  const completedRound = nextIndex === 0;
  s.activePlayerIndex = nextIndex;
  if (rules.jackpotEnabled && (rules.jackpotRefresh === "visit" || (rules.jackpotRefresh === "round" && completedRound))) {
    s.jackpotTargets = generatePtitHunJackpots(rules);
    s.jackpotCycle += 1;
  }
  return s;
}

function inner(n = 1): GameDart { return { bed: "S", number: Math.max(1, Math.min(20, n)), ring: "inner_single" } as any; }
function outer(n = 1): GameDart { return { bed: "S", number: Math.max(1, Math.min(20, n)), ring: "outer_single" } as any; }
function dbull(): GameDart { return { bed: "IB", ring: "dbull" } as any; }
function miss(): GameDart { return { bed: "MISS" } as any; }

export function pickPtitHunBotDarts(input: PtitHunState, level: PtitHunBotLevel = "normal"): GameDart[] {
  const s = clonePtitHunState(input);
  const p: any = s.players[s.activePlayerIndex];
  if (!p) return [];
  const rules = s.config.rules;
  const st = s.statsByPlayer[p.id] || blankStats(rules.startScore);
  const score = Number(s.scores[p.id] || 0);
  const dbulls = Number(st.dbulls || 0);
  const shieldActive = Boolean(s.shieldActive?.[p.id]);
  const cleanStreak = Number(s.cleanStreak?.[p.id] || 0);
  const out: GameDart[] = [];

  const fallback = (): GameDart => {
    const r = Math.random();
    if (level === "hard") {
      if (r < .74) return inner(Math.random() < .78 ? 1 : 1 + Math.floor(Math.random() * 5));
      if (r < .84) return dbull();
      if (r < .90) return outer(1 + Math.floor(Math.random() * 5));
      if (r < .95) return { bed: "D", number: 1 + Math.floor(Math.random() * 20) } as any;
      if (r < .985) return { bed: "T", number: 1 + Math.floor(Math.random() * 20) } as any;
      return miss();
    }
    if (level === "normal") {
      if (r < .60) return inner(1 + Math.floor(Math.random() * 8));
      if (r < .68) return dbull();
      if (r < .80) return outer(1 + Math.floor(Math.random() * 12));
      if (r < .88) return { bed: "D", number: 1 + Math.floor(Math.random() * 20) } as any;
      if (r < .95) return { bed: "T", number: 1 + Math.floor(Math.random() * 20) } as any;
      return miss();
    }
    if (r < .42) return inner(1 + Math.floor(Math.random() * 20));
    if (r < .47) return dbull();
    if (r < .70) return outer(1 + Math.floor(Math.random() * 20));
    if (r < .82) return { bed: "D", number: 1 + Math.floor(Math.random() * 20) } as any;
    if (r < .92) return { bed: "T", number: 1 + Math.floor(Math.random() * 20) } as any;
    return miss();
  };

  const clusterAttempt = (number: number, perDartAccuracy: number): GameDart[] =>
    [0, 1, 2].map(() => Math.random() < perDartAccuracy ? inner(number) : fallback());

  // IA tactique : quand le Bouclier est à une seule volée, les bots moyens/difficiles
  // tentent réellement un TRIPLE NUL au lieu de lancer trois fléchettes indépendantes.
  const oneShieldVisitAway = Boolean(
    rules.shieldEnabled &&
    !shieldActive &&
    cleanStreak === Math.max(0, Number(rules.cleanVisitsForShield || 3) - 1)
  );
  if (oneShieldVisitAway && level !== "easy") {
    const commitChance = level === "hard" ? .82 : .48;
    if (Math.random() < commitChance) {
      const target = level === "hard" || Math.random() < .55 ? 1 : 1 + Math.floor(Math.random() * 6);
      return clusterAttempt(target, level === "hard" ? .92 : .76);
    }
  }

  // IA tactique : si le prochain DBULL déclenche ZÉRO ABSOLU, le centre devient
  // la priorité lorsque le score est suffisamment élevé pour que le risque vaille le coup.
  const nextDbullTriggersZero = Boolean(
    rules.dbullEnabled &&
    rules.zeroAbsoluteEnabled &&
    !s.zeroAbsoluteUsed?.[p.id] &&
    dbulls + 1 >= Number(rules.dbullsForZero || 3)
  );
  if (nextDbullTriggersZero && score >= (level === "hard" ? 36 : 70) && level !== "easy") {
    const attemptChance = level === "hard" ? .84 : .42;
    if (Math.random() < attemptChance) {
      out.push(Math.random() < (level === "hard" ? .82 : .58) ? dbull() : inner(1));
      while (out.length < 3) out.push(inner(level === "hard" ? 1 : 1 + Math.floor(Math.random() * 5)));
      return out;
    }
  }

  // IA tactique Jackpot : le bot peut décider de sacrifier la précision classique
  // pour chercher une annulation complète de la volée, mais sans le faire à chaque tour.
  if (rules.jackpotEnabled && s.jackpotTargets.length && level !== "easy") {
    const jackpotTry = level === "hard" ? (score >= 45 ? .34 : .22) : (score >= 70 ? .18 : .10);
    if (Math.random() < jackpotTry) {
      const target = s.jackpotTargets[Math.floor(Math.random() * s.jackpotTargets.length)];
      const accuracy = level === "hard" ? .72 : .48;
      out.push(Math.random() < accuracy ? ({ bed: target.bed, number: target.number } as any) : fallback());
      while (out.length < 3) out.push(inner(level === "hard" ? 1 : 1 + Math.floor(Math.random() * 6)));
      return out;
    }
  }

  // Si une série Bouclier est déjà lancée, un bot difficile essaie parfois de la conserver
  // avec trois petits simples identiques plutôt que de casser la série inutilement.
  if (rules.shieldEnabled && !shieldActive && cleanStreak > 0 && level === "hard" && Math.random() < .44) {
    return clusterAttempt(Math.random() < .72 ? 1 : 1 + Math.floor(Math.random() * 5), .88);
  }

  // Stratégie générale : les chances restent dépendantes du niveau, mais le bot
  // tient compte du score courant, du DBULL progressif et des zones Jackpot.
  const innerChance = level === "hard" ? .78 : level === "easy" ? .42 : .60;
  const dbullChance = level === "hard"
    ? (score >= 120 ? .18 : score >= 70 ? .11 : .055)
    : level === "normal"
      ? (score >= 120 ? .09 : .045)
      : .02;
  const jackpotChance = rules.jackpotEnabled ? (level === "hard" ? .14 : level === "normal" ? .07 : .025) : 0;

  for (let i = 0; i < 3; i += 1) {
    const r = Math.random();
    if (r < jackpotChance && s.jackpotTargets.length) {
      const t = s.jackpotTargets[Math.floor(Math.random() * s.jackpotTargets.length)];
      out.push({ bed: t.bed, number: t.number } as any);
      continue;
    }
    if (r < jackpotChance + dbullChance && rules.dbullEnabled) {
      out.push(dbull());
      continue;
    }
    if (r < jackpotChance + dbullChance + innerChance) {
      const n = level === "hard"
        ? (Math.random() < .76 ? 1 : 1 + Math.floor(Math.random() * 5))
        : level === "normal"
          ? 1 + Math.floor(Math.random() * 8)
          : 1 + Math.floor(Math.random() * 20);
      out.push(inner(n));
      continue;
    }
    out.push(fallback());
  }
  return out.slice(0, 3);
}
