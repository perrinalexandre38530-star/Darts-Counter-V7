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
  if (!d || d.bed === "MISS") return "MISS";
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
  // ZÉRO ABSOLU doit rester une récompense, pas rendre les futurs multiplicateurs gratuits.
  // À 0, une zone dangereuse repart donc du capital de départ comme base de sanction.
  return score > 0 ? score : Math.max(1, Number(rules.startScore || 20));
}

function applyDart(score: number, d: any, rules: PtitHunConfigPayload["rules"]) {
  if (!d || d.bed === "MISS") return rules.missMode === "add" ? score + rules.missValue : ptitHunPenaltyBase(score, rules) * rules.missValue;
  if (d.bed === "IB") return rules.dbullEnabled ? Math.ceil(score / rules.dbullDivider) : score + 50;
  if (d.bed === "OB") return ptitHunPenaltyBase(score, rules) * rules.bull25Factor;
  if (d.bed === "D") return ptitHunPenaltyBase(score, rules) * rules.doubleFactor;
  if (d.bed === "T") return ptitHunPenaltyBase(score, rules) * rules.tripleFactor;
  if (isPtitHunOuterSingle(d)) return score + Number(d.number || 0) * rules.outerSingleFactor;
  return score + Number(d.number || 0);
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
  const isClean = allInner(darts);
  const isTripleNul = rules.tripleNulEnabled && tripleNul(darts);
  const jackpotDarts = rules.jackpotEnabled ? darts.filter((d: any) => ptitHunDartHitsJackpot(d, activeJackpots)) : [];
  const jackpotHit = jackpotDarts.length > 0;
  const events: string[] = [];
  let zeroPenaltyFloor = false;

  st.visits += 1;
  for (const d of darts as any[]) {
    st.darts += 1;
    if (!d || d.bed === "MISS") st.misses += 1;
    else if (d.bed === "IB") st.dbulls += 1;
    else if (d.bed === "OB") st.bulls25 += 1;
    else if (d.bed === "D") st.doubles += 1;
    else if (d.bed === "T") st.triples += 1;
    else if (isPtitHunInnerSingle(d)) { st.innerSingles += 1; if (Number(d.number) === 1) st.petitOneHits += 1; }
    else if (isPtitHunOuterSingle(d)) st.outerSingles += 1;
  }

  let rawAfter = before;
  if (jackpotHit) {
    st.jackpotHits += jackpotDarts.length;
    st.jackpotVisits += 1;
    rawAfter = before;
    const labels = [...new Set(jackpotDarts.map((d: any) => `${d.bed}${d.number}`))].join(" + ");
    events.push(`JACKPOT ${labels} · volée à 0`);
  } else if (isTripleNul) {
    st.tripleNuls += 1;
    const tripleNulNumber = Number((darts[0] as any)?.number || 0);
    if (tripleNulNumber === 1) st.petitOneTriples += 1;
    rawAfter = before;
    events.push(tripleNulNumber === 1 ? `P’TIT 1 PARFAIT · 3 petits 1 · volée à 0` : `TRIPLE NUL · 3 petits ${tripleNulNumber} · volée à 0`);
  } else {
    for (const d of darts) {
      const beforeDart = rawAfter;
      const dangerousMultiplier = (!d || (d as any).bed === "MISS") ? rules.missMode === "multiply" : ["D", "T", "OB"].includes(String((d as any)?.bed || ""));
      if (beforeDart === 0 && dangerousMultiplier) zeroPenaltyFloor = true;
      rawAfter = Math.max(0, Math.round(applyDart(rawAfter, d, rules)));
    }
    if (zeroPenaltyFloor) events.push(`À 0, pénalité relancée depuis le capital ${rules.startScore}`);
  }

  const zeroAbsoluteNow = rules.zeroAbsoluteEnabled && !s.zeroAbsoluteUsed[p.id] && dbullsBefore < rules.dbullsForZero && Number(st.dbulls || 0) >= rules.dbullsForZero;
  if (zeroAbsoluteNow) {
    rawAfter = 0;
    s.zeroAbsoluteUsed[p.id] = true;
    st.zeroAbsolute += 1;
    events.push(`ZÉRO ABSOLU · ${rules.dbullsForZero}e DBULL de la partie · score remis à 0`);
  }

  let after = rawAfter;
  if (rules.shieldEnabled && shieldBefore && !zeroAbsoluteNow && rawAfter > before) {
    const damage = rawAfter - before;
    const reducedDamage = Math.ceil(damage / rules.shieldDivider);
    after = before + reducedDamage;
    st.shieldedVisits += 1;
    st.shieldSaved += Math.max(0, damage - reducedDamage);
    events.push(`BOUCLIER · pénalité ${damage} → ${reducedDamage}`);
  }

  let shieldUnlockedNow = false;
  if (rules.shieldEnabled && !s.shieldActive[p.id]) {
    if (isClean) {
      st.cleanVisits += 1;
      st.currentCleanStreak += 1;
      st.bestCleanStreak = Math.max(st.bestCleanStreak, st.currentCleanStreak);
      s.cleanStreak[p.id] = st.currentCleanStreak;
      if (st.currentCleanStreak >= rules.cleanVisitsForShield) {
        s.shieldActive[p.id] = true;
        st.shieldUnlocked = 1;
        shieldUnlockedNow = true;
        events.push(`BOUCLIER DU HUN débloqué · prochaines pénalités ÷${rules.shieldDivider}`);
      } else events.push(`Volée propre ${st.currentCleanStreak}/${rules.cleanVisitsForShield}`);
    } else {
      st.currentCleanStreak = 0;
      s.cleanStreak[p.id] = 0;
    }
  } else if (rules.shieldEnabled && isClean) st.cleanVisits += 1;

  if (!jackpotHit && !isTripleNul && !zeroAbsoluteNow && !events.some((e) => e.startsWith("BOUCLIER ·"))) events.push(`${before} → ${after} (${after >= before ? "+" : ""}${after - before})`);
  st.lowestScore = Math.min(Number(st.lowestScore ?? before), after);
  s.scores[p.id] = Math.max(0, Math.round(after));
  const finalDelta = s.scores[p.id] - before;
  if (jackpotHit || isTripleNul) st.zeroVisits += 1;
  st.worstVisitDelta = Math.max(Number(st.worstVisitDelta || 0), finalDelta);
  st.bestScoreDrop = Math.max(Number(st.bestScoreDrop || 0), Math.max(0, -finalDelta));
  const tripleNulNumber = isTripleNul ? Number((darts[0] as any)?.number || 0) : undefined;

  s.visits.push({
    id: uid(), playerId: p.id, turn: st.visits, darts, before, rawAfter, after: s.scores[p.id], delta: finalDelta,
    rawDelta: rawAfter - before, cleanVisit: isClean, tripleNul: isTripleNul, tripleNulNumber, petitOnePerfect: tripleNulNumber === 1, jackpotHit, jackpotTargets: activeJackpots,
    shieldBefore, shieldUnlockedNow, zeroAbsoluteNow, zeroPenaltyFloor, dbullsBefore, dbullsAfter: Number(st.dbulls || 0), events,
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
  const st = s.statsByPlayer[p.id] || blankStats(s.config.rules.startScore);
  const score = Number(s.scores[p.id] || 0);
  const out: GameDart[] = [];
  const innerChance = level === "hard" ? .79 : level === "easy" ? .42 : .62;
  const dbullChance = level === "hard" ? (Number(st.dbulls || 0) === s.config.rules.dbullsForZero - 1 ? .24 : score >= 80 ? .12 : .06) : level === "easy" ? .025 : .055;
  const jackpotChance = s.config.rules.jackpotEnabled ? (level === "hard" ? .18 : level === "normal" ? .09 : .035) : 0;
  for (let i = 0; i < 3; i += 1) {
    const r = Math.random();
    if (r < jackpotChance && s.jackpotTargets.length) {
      const t = s.jackpotTargets[Math.floor(Math.random() * s.jackpotTargets.length)];
      out.push({ bed: t.bed, number: t.number } as any); continue;
    }
    if (r < jackpotChance + dbullChance && s.config.rules.dbullEnabled) { out.push(dbull()); continue; }
    if (r < jackpotChance + dbullChance + innerChance) {
      const n = level === "hard" ? (Math.random() < .72 ? 1 : 1 + Math.floor(Math.random() * 5)) : level === "normal" ? 1 + Math.floor(Math.random() * 8) : 1 + Math.floor(Math.random() * 20);
      out.push(inner(n)); continue;
    }
    if (r > .96) { out.push(miss()); continue; }
    if (r > .84) { out.push({ bed: "T", number: 1 + Math.floor(Math.random() * 20) } as any); continue; }
    if (r > .73) { out.push({ bed: "D", number: 1 + Math.floor(Math.random() * 20) } as any); continue; }
    out.push(outer(level === "hard" ? 1 + Math.floor(Math.random() * 5) : 1 + Math.floor(Math.random() * 20)));
  }
  return out.slice(0, 3);
}
