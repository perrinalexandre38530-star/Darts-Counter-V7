// @ts-nocheck
// =============================================================
// MENTEUR — moteur pur PREMIUM
// Enchères, bluff, appel MENTEUR, preuve, vies, BO, stats et BOTS.
// =============================================================

import type { GameDart, Player } from "../types-game";
import type { PremiumBotBrain } from "../premiumPartyBotAI";

export type MenteurBotLevel = "easy" | "normal" | "hard";
export type MenteurCondition = "none" | "double" | "triple" | "bull" | "distinct";
export type MenteurConfigPayload = {
  mode: "menteur";
  selectedIds: string[];
  players: number;
  playersList?: any[];
  botIds?: string[];
  botsEnabled?: boolean;
  botLevel: MenteurBotLevel;
  randomOrder?: boolean;
  scoreInputMethod?: "keypad" | "dartboard";
  seriesWins: 1 | 2 | 3;
  sfxEnabled?: boolean;
  awenaEnabled?: boolean;
  coachEnabled?: boolean;
  rules: { lives: 3 | 5 | 7; contractDeck: "score" | "mixed" | "advanced"; raiseStep: 5 | 10 | 20; bullAllowed: boolean; };
};
export type MenteurPlayerStats = {
  darts: number; visits: number; raises: number; openingBids: number; maxBid: number;
  liarCalls: number; successfulCalls: number; failedCalls: number;
  contractsAttempted: number; contractsProven: number; liesCaught: number;
  livesLost: number; eliminations: number; legsWon: number; bestVisit: number; proofPoints: number;
  singles: number; doubles: number; triples: number; bulls: number; dbulls: number; misses: number;
  currentProofStreak: number; bestProofStreak: number;
};
export type MenteurAction = {
  id: string; kind: "raise" | "call" | "resolution"; playerId: string; leg: number; turn: number;
  bid: number; condition: MenteurCondition; darts?: GameDart[]; score?: number; success?: boolean; events: string[];
};
export type MenteurState = {
  sport: "darts"; mode: "menteur"; config: MenteurConfigPayload; players: Player[];
  lives: Record<string, number>; eliminated: Record<string, boolean>; legWins: Record<string, number>;
  statsByPlayer: Record<string, MenteurPlayerStats>; activePlayerIndex: number; bid: number; condition: MenteurCondition;
  lastBidderId: string | null; challengerId: string | null; challengedId: string | null;
  legIndex: number; turnIndex: number; phase: "auction" | "challenge" | "finished";
  winnerId: string | null; lastLegWinnerId: string | null; visits: MenteurAction[]; startedAt: number; finishedAt?: number;
};

function clone<T>(v: T): T { return JSON.parse(JSON.stringify(v)); }
function id(prefix = "menteur") { return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`; }
function blankStats(): MenteurPlayerStats {
  return {
    darts: 0, visits: 0, raises: 0, openingBids: 0, maxBid: 0,
    liarCalls: 0, successfulCalls: 0, failedCalls: 0,
    contractsAttempted: 0, contractsProven: 0, liesCaught: 0,
    livesLost: 0, eliminations: 0, legsWon: 0, bestVisit: 0, proofPoints: 0,
    singles: 0, doubles: 0, triples: 0, bulls: 0, dbulls: 0, misses: 0,
    currentProofStreak: 0, bestProofStreak: 0,
  };
}
function hydratedStats(raw: any): MenteurPlayerStats { return { ...blankStats(), ...(raw || {}) }; }
function scoreDart(d: GameDart) {
  if (!d || d.bed === "MISS") return 0;
  if (d.bed === "IB") return 50;
  if (d.bed === "OB") return 25;
  return Number(d.number || 0) * (d.bed === "T" ? 3 : d.bed === "D" ? 2 : 1);
}
export function scoreMenteurVisit(ds: GameDart[]) { return (ds || []).slice(0, 3).reduce((s, d) => s + scoreDart(d), 0); }
function aliveIds(s: MenteurState) { return s.players.filter((p) => !s.eliminated[p.id]).map((p) => p.id); }
function nextAliveIndex(s: MenteurState, from: number) {
  for (let k = 1; k <= s.players.length; k++) {
    const i = (from + k) % s.players.length; const p = s.players[i];
    if (p && !s.eliminated[p.id]) return i;
  }
  return from;
}
function countDarts(stats: MenteurPlayerStats, darts: GameDart[]) {
  for (const d of darts || []) {
    if (!d || d.bed === "MISS") stats.misses += 1;
    else if (d.bed === "IB") stats.dbulls += 1;
    else if (d.bed === "OB") stats.bulls += 1;
    else if (d.bed === "T") stats.triples += 1;
    else if (d.bed === "D") stats.doubles += 1;
    else stats.singles += 1;
  }
}

export function normalizeMenteurConfig(raw: any): MenteurConfigPayload {
  const r = raw?.rules || {}, ids = Array.isArray(raw?.selectedIds) ? raw.selectedIds.map(String) : [];
  return {
    mode: "menteur", selectedIds: ids, players: Math.max(2, Number(raw?.players || ids.length || 2)),
    playersList: Array.isArray(raw?.playersList) ? raw.playersList : [],
    botIds: Array.isArray(raw?.botIds) ? raw.botIds.map(String) : [], botsEnabled: Boolean(raw?.botsEnabled),
    botLevel: raw?.botLevel === "easy" || raw?.botLevel === "hard" ? raw.botLevel : "normal",
    randomOrder: raw?.randomOrder !== false, scoreInputMethod: raw?.scoreInputMethod === "dartboard" ? "dartboard" : "keypad",
    seriesWins: raw?.seriesWins === 2 || raw?.seriesWins === 3 ? raw.seriesWins : 1,
    sfxEnabled: raw?.sfxEnabled !== false, awenaEnabled: raw?.awenaEnabled !== false, coachEnabled: raw?.coachEnabled !== false,
    rules: {
      lives: r?.lives === 3 || r?.lives === 7 ? r.lives : 5,
      contractDeck: ["mixed", "advanced"].includes(r?.contractDeck) ? r.contractDeck : "score",
      raiseStep: r?.raiseStep === 10 || r?.raiseStep === 20 ? r.raiseStep : 5,
      bullAllowed: r?.bullAllowed !== false,
    },
  };
}
export function randomMenteurCondition(configOrRules: any): MenteurCondition {
  const r = configOrRules?.rules || configOrRules || {};
  if (r.contractDeck === "score") return "none";
  const pool: MenteurCondition[] = r.contractDeck === "advanced"
    ? ["none", "double", "triple", "distinct", ...(r.bullAllowed !== false ? ["bull"] : [])]
    : ["none", "double", "triple"];
  return pool[Math.floor(Math.random() * pool.length)] || "none";
}
export function menteurConditionLabel(c: MenteurCondition) {
  return c === "double" ? "+ 1 DOUBLE" : c === "triple" ? "+ 1 TRIPLE" : c === "bull" ? "+ 1 BULL" : c === "distinct" ? "+ 3 NUMÉROS DIFFÉRENTS" : "SCORE LIBRE";
}
function hydrateState(s: MenteurState): MenteurState {
  s.config = normalizeMenteurConfig(s.config || {});
  s.lives = Object.fromEntries((s.players || []).map((p: any) => [p.id, Math.max(0, Number(s.lives?.[p.id] ?? s.config.rules.lives))]));
  s.eliminated = Object.fromEntries((s.players || []).map((p: any) => [p.id, Boolean(s.eliminated?.[p.id])]));
  s.legWins = Object.fromEntries((s.players || []).map((p: any) => [p.id, Number(s.legWins?.[p.id] || 0)]));
  s.statsByPlayer = Object.fromEntries((s.players || []).map((p: any) => [p.id, hydratedStats(s.statsByPlayer?.[p.id])]));
  s.visits = Array.isArray(s.visits) ? s.visits : [];
  s.condition = s.condition || randomMenteurCondition(s.config);
  return s;
}
function resetAuction(s: MenteurState, opener: number) {
  s.activePlayerIndex = opener; s.bid = 0; s.condition = randomMenteurCondition(s.config);
  s.lastBidderId = null; s.challengerId = null; s.challengedId = null; s.phase = "auction"; return s;
}
function resetLeg(s: MenteurState, starter: number) {
  s.legIndex += 1; s.turnIndex = 0;
  s.lives = Object.fromEntries(s.players.map((p) => [p.id, s.config.rules.lives]));
  s.eliminated = Object.fromEntries(s.players.map((p) => [p.id, false]));
  resetAuction(s, starter);
}
function winLeg(s: MenteurState, winnerId: string) {
  s.lastLegWinnerId = winnerId; s.legWins[winnerId] = Number(s.legWins[winnerId] || 0) + 1; s.statsByPlayer[winnerId].legsWon += 1;
  if (s.legWins[winnerId] >= s.config.seriesWins) { s.phase = "finished"; s.winnerId = winnerId; s.finishedAt = Date.now(); return s; }
  const wi = Math.max(0, s.players.findIndex((p) => p.id === winnerId)); resetLeg(s, (wi + 1) % s.players.length); return s;
}

export function createMenteurState(players: Player[], rawConfig: any): MenteurState {
  const c = normalizeMenteurConfig(rawConfig), ps = (players || []).map((p, i) => ({ id: String(p?.id || `p${i + 1}`), name: String(p?.name || `Joueur ${i + 1}`) }));
  return {
    sport: "darts", mode: "menteur", config: c, players: ps,
    lives: Object.fromEntries(ps.map((p) => [p.id, c.rules.lives])), eliminated: Object.fromEntries(ps.map((p) => [p.id, false])),
    legWins: Object.fromEntries(ps.map((p) => [p.id, 0])), statsByPlayer: Object.fromEntries(ps.map((p) => [p.id, blankStats()])),
    activePlayerIndex: 0, bid: 0, condition: randomMenteurCondition(c), lastBidderId: null, challengerId: null, challengedId: null,
    legIndex: 0, turnIndex: 0, phase: "auction", winnerId: null, lastLegWinnerId: null, visits: [], startedAt: Date.now(),
  };
}
export function cloneMenteurState(s: MenteurState): MenteurState { return hydrateState(clone(s)); }

export function raiseMenteurBidTo(input: MenteurState, target: number): MenteurState {
  const s = cloneMenteurState(input); if (s.phase !== "auction") return s;
  const p = s.players[s.activePlayerIndex]; if (!p) return s;
  const opening = s.lastBidderId == null;
  const step = s.config.rules.raiseStep, min = opening ? 30 : Math.min(180, s.bid + step);
  const next = Math.min(180, Math.max(min, Number(target || min)));
  s.bid = next; s.lastBidderId = p.id; s.challengerId = null; s.challengedId = null;
  const stats = s.statsByPlayer[p.id] || (s.statsByPlayer[p.id] = blankStats());
  stats.raises += 1; if (opening) stats.openingBids += 1; stats.maxBid = Math.max(stats.maxBid, next);
  s.visits.push({ id: id("menteur-raise"), kind: "raise", playerId: p.id, leg: s.legIndex + 1, turn: s.turnIndex + 1, bid: s.bid, condition: s.condition, events: [`${p.name} annonce ${next} points`] });
  s.turnIndex += 1; s.activePlayerIndex = nextAliveIndex(s, s.activePlayerIndex); return s;
}
export function raiseMenteurBid(input: MenteurState, amount: number): MenteurState {
  const step = input?.config?.rules?.raiseStep || 5, inc = Math.max(step, Number(amount || step));
  const target = input?.lastBidderId == null ? Math.max(30, inc) : Number(input?.bid || 0) + inc;
  return raiseMenteurBidTo(input, target);
}
export function callMenteur(input: MenteurState): MenteurState {
  const s = cloneMenteurState(input); if (s.phase !== "auction" || !s.lastBidderId) return s;
  const challenger = s.players[s.activePlayerIndex], challenged = s.players.find((p) => p.id === s.lastBidderId); if (!challenger || !challenged) return s;
  s.challengerId = challenger.id; s.challengedId = challenged.id; s.phase = "challenge";
  s.activePlayerIndex = Math.max(0, s.players.findIndex((p) => p.id === challenged.id));
  s.statsByPlayer[challenger.id].liarCalls += 1;
  s.visits.push({ id: id("menteur-call"), kind: "call", playerId: challenger.id, leg: s.legIndex + 1, turn: s.turnIndex + 1, bid: s.bid, condition: s.condition, events: [`${challenger.name} crie MENTEUR ! ${challenged.name} doit prouver ${s.bid}`] });
  s.turnIndex += 1; return s;
}
export function isMenteurConditionSatisfied(condition: MenteurCondition, ds: GameDart[]) {
  if (condition === "double") return ds.some((d) => d?.bed === "D" || d?.bed === "IB");
  if (condition === "triple") return ds.some((d) => d?.bed === "T");
  if (condition === "bull") return ds.some((d) => d?.bed === "OB" || d?.bed === "IB");
  if (condition === "distinct") return new Set(ds.filter((d) => d?.bed !== "MISS").map((d) => d?.bed === "OB" || d?.bed === "IB" ? 25 : Number(d?.number || 0)).filter(Boolean)).size >= 3;
  return true;
}
export function isMenteurContractSatisfied(s: MenteurState, ds: GameDart[]) { return scoreMenteurVisit(ds) >= s.bid && isMenteurConditionSatisfied(s.condition, ds); }

export function playMenteurVisit(input: MenteurState, dartsRaw: GameDart[]): MenteurState {
  const s = cloneMenteurState(input); if (s.phase !== "challenge" || !s.challengedId || !s.challengerId) return s;
  const ds = (dartsRaw || []).slice(0, 3), challenged = s.players.find((p) => p.id === s.challengedId), challenger = s.players.find((p) => p.id === s.challengerId);
  if (!challenged || !challenger) return s;
  const score = scoreMenteurVisit(ds), ok = isMenteurContractSatisfied(s, ds), loser = ok ? challenger : challenged;
  const proofStats = s.statsByPlayer[challenged.id] || (s.statsByPlayer[challenged.id] = blankStats());
  const callerStats = s.statsByPlayer[challenger.id] || (s.statsByPlayer[challenger.id] = blankStats());
  proofStats.visits += 1; proofStats.darts += ds.length; proofStats.contractsAttempted += 1; proofStats.bestVisit = Math.max(proofStats.bestVisit, score); proofStats.proofPoints += score; countDarts(proofStats, ds);
  if (ok) {
    proofStats.contractsProven += 1; proofStats.currentProofStreak += 1; proofStats.bestProofStreak = Math.max(proofStats.bestProofStreak, proofStats.currentProofStreak);
    callerStats.failedCalls += 1;
  } else {
    proofStats.currentProofStreak = 0; callerStats.liesCaught += 1; callerStats.successfulCalls += 1;
  }
  s.lives[loser.id] = Math.max(0, Number(s.lives[loser.id] || 0) - 1); s.statsByPlayer[loser.id].livesLost += 1;
  const events = [ok ? `${challenged.name} PROUVE son annonce : ${score} pts` : `${challenged.name} est pris en flagrant mensonge : ${score} pts`, `${loser.name} perd 1 vie`];
  if (s.lives[loser.id] <= 0) { s.eliminated[loser.id] = true; s.statsByPlayer[loser.id].eliminations += 1; events.push(`${loser.name} est éliminé`); }
  s.visits.push({ id: id("menteur-resolution"), kind: "resolution", playerId: challenged.id, leg: s.legIndex + 1, turn: s.turnIndex + 1, bid: s.bid, condition: s.condition, darts: ds, score, success: ok, events });
  s.turnIndex += 1;
  const alive = aliveIds(s); if (alive.length === 1) return winLeg(s, alive[0]);
  const loserIdx = Math.max(0, s.players.findIndex((p) => p.id === loser.id));
  return resetAuction(s, s.eliminated[loser.id] ? nextAliveIndex(s, loserIdx) : loserIdx);
}

function skill(level: MenteurBotLevel, brain?: PremiumBotBrain) {
  const base = level === "hard" ? .81 : level === "easy" ? .38 : .61;
  return Math.max(.18, Math.min(.97, Number(brain?.precision ?? base)));
}
function randomDart(brain?: PremiumBotBrain): GameDart {
  const n = 1 + Math.floor(Math.random() * 20), r = Math.random(), risk = Number(brain?.risk ?? .5);
  const dCut = .74 - (risk - .5) * .07, tCut = .91 - (risk - .5) * .14;
  return { bed: r < dCut ? "S" : r < tCut ? "D" : "T", number: n } as GameDart;
}
export function pickMenteurBotAction(s: MenteurState, level: MenteurBotLevel = "normal", brain?: PremiumBotBrain): { type: "raise"; amount: number } | { type: "liar" } {
  const step = s.config.rules.raiseStep;
  const me = s.players[s.activePlayerIndex];
  const myLives = Number(s.lives?.[me?.id] || s.config.rules.lives), maxLives = Math.max(1, Number(s.config.rules.lives));
  const danger = 1 - myLives / maxLives;
  const risk = Number(brain?.risk ?? .5), bluff = Number(brain?.bluffBias || 0), call = Number(brain?.callBias || 0);

  if (!s.lastBidderId) {
    const baseMult = level === "hard" ? 8 : level === "easy" ? 5 : 6;
    const personaMult = brain?.key === "trickster" ? 2 : brain?.key === "aggressive" ? 1 : brain?.key === "steady" ? -1 : 0;
    return { type: "raise", amount: Math.max(30, step * Math.max(3, baseMult + personaMult)) };
  }

  const base = level === "hard" ? 119 : level === "easy" ? 68 : 94;
  const conditionPenalty = s.condition === "none" ? 0 : s.condition === "distinct" ? 18 : s.condition === "bull" ? 16 : 10;
  // callBias fait appeler plus tôt ; bluffBias pousse au contraire à continuer l'escalade.
  const threshold = base - conditionPenalty - danger * (8 + Number(brain?.composure || .5) * 10) - call * 30 + bluff * 24 + (Math.random() - .5) * 20;
  if (s.bid >= threshold || s.bid >= 175) return { type: "liar" };

  const r = Math.random();
  const highRaise = Math.max(.08, Math.min(.42, .15 + (risk - .5) * .25 + bluff * .20));
  const midRaise = Math.max(.25, Math.min(.70, .48 + (risk - .5) * .16));
  const mult = r < highRaise ? 3 : r < midRaise ? 2 : 1;
  return { type: "raise", amount: step * mult };
}
export function pickMenteurBotDarts(s: MenteurState, level: MenteurBotLevel = "normal", brain?: PremiumBotBrain): GameDart[] {
  const challenged = s.players.find((p) => p.id === s.challengedId);
  const lives = Number(s.lives?.[challenged?.id] || s.config.rules.lives), danger = 1 - lives / Math.max(1, s.config.rules.lives);
  const pressure = danger * (.06 + Number(brain?.composure || .5) * .09);
  const ok = Math.random() < Math.min(.97, skill(level, brain) + pressure);
  if (!ok) return [randomDart(brain), { bed: "MISS" }, randomDart(brain)];

  if (s.condition === "double") {
    return Number(brain?.risk || .5) < .42
      ? [{ bed: "D", number: 20 }, { bed: "D", number: 20 }, { bed: "T", number: 20 }]
      : [{ bed: "D", number: 20 }, { bed: "T", number: 20 }, { bed: "T", number: 20 }];
  }
  if (s.condition === "triple") return [{ bed: "T", number: 20 }, { bed: "T", number: 20 }, { bed: "T", number: 20 }];
  if (s.condition === "bull") return [{ bed: "IB" }, { bed: "T", number: 20 }, { bed: "T", number: 20 }];
  if (s.condition === "distinct") return [{ bed: "T", number: 20 }, { bed: "T", number: 19 }, { bed: "T", number: 18 }];
  return Number(brain?.risk || .5) > .72
    ? [{ bed: "T", number: 20 }, { bed: "T", number: 20 }, { bed: "T", number: 20 }]
    : [{ bed: "T", number: 20 }, { bed: "T", number: 19 }, { bed: "T", number: 18 }];
}
