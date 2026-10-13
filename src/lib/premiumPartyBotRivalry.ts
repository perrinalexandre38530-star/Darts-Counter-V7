// @ts-nocheck
// =============================================================
// PREMIUM PARTY BOT RIVALRY V12
// Rivalité persistante BOT ↔ humain + contre-stratégie.
// =============================================================

import type { PremiumBotBrain, PremiumPartyModeKey } from "./premiumPartyBotAI";

const STORAGE_KEY = "dc_premium_party_bot_rivalry_v1";
const MAX_ENTRIES = 240;
const MAX_SEEN_MATCHES = 700;

export type PremiumRivalryEntry = {
  mode: PremiumPartyModeKey;
  botId: string;
  botName: string;
  humanId: string;
  humanName: string;
  matches: number;
  decisiveMatches: number;
  botWins: number;
  humanWins: number;
  neutralResults: number;
  currentStreakOwner: "bot" | "human" | null;
  currentStreak: number;
  maxBotStreak: number;
  maxHumanStreak: number;
  lastWinner: "bot" | "human" | "other" | null;
  lastPlayedAt: number;
};

export type PremiumRivalryModel = {
  botId: string;
  botName: string;
  targetId: string;
  targetName: string;
  label: string;
  icon: string;
  detail: string;
  record: string;
  matches: number;
  confidence: number;
  tension: number;
  quote: string;
  state: "new" | "revenge" | "dominant" | "balanced" | "streak";
};

export type PremiumRivalryAdaptation = {
  brain: PremiumBotBrain;
  model: PremiumRivalryModel | null;
};

type RivalryDb = {
  version: 1;
  entries: Record<string, PremiumRivalryEntry>;
  seenMatchIds: string[];
};

function n(v: any) { const x = Number(v); return Number.isFinite(x) ? x : 0; }
function clamp01(v: number) { return Math.max(0, Math.min(1, Number(v || 0))); }
function clampSigned(v: number) { return Math.max(-.45, Math.min(.45, Number(v || 0))); }
function canonicalId(v: any) { return String(v ?? "").replace(/^online:/, "").trim(); }
function rivalryKey(mode: PremiumPartyModeKey, botId: string, humanId: string) {
  return `${mode}:${canonicalId(botId)}:${canonicalId(humanId)}`;
}
function emptyDb(): RivalryDb { return { version: 1, entries: {}, seenMatchIds: [] }; }
function safeStorage(): Storage | null {
  try { return typeof window !== "undefined" && window.localStorage ? window.localStorage : null; } catch { return null; }
}
export function loadPremiumPartyRivalryDb(): RivalryDb {
  const ls = safeStorage(); if (!ls) return emptyDb();
  try {
    const parsed = JSON.parse(ls.getItem(STORAGE_KEY) || "null");
    if (!parsed || typeof parsed !== "object") return emptyDb();
    return {
      version: 1,
      entries: parsed.entries && typeof parsed.entries === "object" ? parsed.entries : {},
      seenMatchIds: Array.isArray(parsed.seenMatchIds) ? parsed.seenMatchIds.map(String).slice(-MAX_SEEN_MATCHES) : [],
    };
  } catch { return emptyDb(); }
}
function saveDb(db: RivalryDb) {
  const ls = safeStorage(); if (!ls) return;
  try {
    const entries = Object.values(db.entries || {})
      .sort((a: any, b: any) => n(b?.lastPlayedAt) - n(a?.lastPlayedAt))
      .slice(0, MAX_ENTRIES);
    const compact: RivalryDb = {
      version: 1,
      entries: Object.fromEntries(entries.map((e: any) => [rivalryKey(e.mode, e.botId, e.humanId), e])),
      seenMatchIds: (db.seenMatchIds || []).slice(-MAX_SEEN_MATCHES),
    };
    ls.setItem(STORAGE_KEY, JSON.stringify(compact));
  } catch {}
}
function botSet(value: any) {
  if (value instanceof Set) return new Set([...value].map(canonicalId));
  if (Array.isArray(value)) return new Set(value.map(canonicalId));
  return new Set<string>();
}
function participantsRows(state: any, participants?: any[], botIds?: any) {
  const bots = botSet(botIds);
  const source = Array.isArray(participants) && participants.length ? participants : (Array.isArray(state?.players) ? state.players : []);
  return source.map((p: any) => {
    const id = canonicalId(p?.id ?? p?.playerId ?? p?.profileId);
    return {
      id,
      name: String(p?.name ?? p?.displayName ?? p?.nickname ?? "Joueur"),
      isBot: Boolean(p?.isBot) || bots.has(id),
    };
  }).filter((p: any) => p.id);
}

export function commitPremiumPartyRivalry({
  mode, matchId, winnerId, state, participants, botIds,
}: {
  mode: PremiumPartyModeKey;
  matchId: string;
  winnerId?: string | null;
  state: any;
  participants?: any[];
  botIds?: Set<string> | string[];
}) {
  const id = String(matchId || "").trim();
  if (!id) return { committed: false, entries: [] as PremiumRivalryEntry[] };
  const db = loadPremiumPartyRivalryDb();
  if (db.seenMatchIds.includes(id)) return { committed: false, entries: [] as PremiumRivalryEntry[] };

  const rows = participantsRows(state, participants, botIds);
  const bots = rows.filter((p: any) => p.isBot);
  const humans = rows.filter((p: any) => !p.isBot);
  const winner = canonicalId(winnerId);
  const now = Date.now();
  const updated: PremiumRivalryEntry[] = [];

  for (const bot of bots) for (const human of humans) {
    const key = rivalryKey(mode, bot.id, human.id);
    const prev: PremiumRivalryEntry = db.entries[key] || {
      mode, botId: bot.id, botName: bot.name, humanId: human.id, humanName: human.name,
      matches: 0, decisiveMatches: 0, botWins: 0, humanWins: 0, neutralResults: 0,
      currentStreakOwner: null, currentStreak: 0, maxBotStreak: 0, maxHumanStreak: 0,
      lastWinner: null, lastPlayedAt: 0,
    };

    let outcome: "bot" | "human" | "other" = "other";
    if (winner && winner === bot.id) outcome = "bot";
    else if (winner && winner === human.id) outcome = "human";

    let streakOwner = prev.currentStreakOwner;
    let streak = n(prev.currentStreak);
    if (outcome === "bot" || outcome === "human") {
      if (streakOwner === outcome) streak += 1;
      else { streakOwner = outcome; streak = 1; }
    }

    const next: PremiumRivalryEntry = {
      ...prev,
      mode,
      botId: bot.id,
      botName: bot.name || prev.botName,
      humanId: human.id,
      humanName: human.name || prev.humanName,
      matches: n(prev.matches) + 1,
      decisiveMatches: n(prev.decisiveMatches) + (outcome === "other" ? 0 : 1),
      botWins: n(prev.botWins) + (outcome === "bot" ? 1 : 0),
      humanWins: n(prev.humanWins) + (outcome === "human" ? 1 : 0),
      neutralResults: n(prev.neutralResults) + (outcome === "other" ? 1 : 0),
      currentStreakOwner: outcome === "other" ? prev.currentStreakOwner : streakOwner,
      currentStreak: outcome === "other" ? n(prev.currentStreak) : streak,
      maxBotStreak: Math.max(n(prev.maxBotStreak), outcome === "bot" ? streak : 0),
      maxHumanStreak: Math.max(n(prev.maxHumanStreak), outcome === "human" ? streak : 0),
      lastWinner: outcome,
      lastPlayedAt: now,
    };
    db.entries[key] = next;
    updated.push(next);
  }

  db.seenMatchIds = [...db.seenMatchIds.filter((x) => x !== id), id].slice(-MAX_SEEN_MATCHES);
  saveDb(db);
  return { committed: true, entries: updated };
}

export function getPremiumPartyRivalryEntry(mode: PremiumPartyModeKey, botId: string, humanId: string) {
  return loadPremiumPartyRivalryDb().entries[rivalryKey(mode, botId, humanId)] || null;
}

function rivalryConfidence(matches: number) {
  if (matches <= 0) return 0;
  return Math.min(99, 28 + matches * 10);
}
function rivalryTension(entry: PremiumRivalryEntry) {
  const decisive = Math.max(1, n(entry.decisiveMatches));
  const diff = Math.abs(n(entry.botWins) - n(entry.humanWins)) / decisive;
  const closeness = 1 - Math.min(1, diff);
  const streakHeat = Math.min(1, n(entry.currentStreak) / 4);
  return Math.round(Math.min(1, closeness * .62 + streakHeat * .38) * 100);
}
function quoteFor(state: PremiumRivalryModel["state"], target: string, botLead: number, streak: number) {
  if (state === "new") return `Premier vrai duel contre ${target}. Je collecte des repères.`;
  if (state === "revenge") return `${target} mène cette rivalité. Je resserre mon jeu.`;
  if (state === "dominant") return `J'ai l'avantage sur ${target}. Je garde la pression.`;
  if (state === "streak") return `${streak} de suite dans cette rivalité. La série compte.`;
  return `Rivalité serrée avec ${target}. Chaque décision peut faire basculer le duel.`;
}
function modelFrom(entry: PremiumRivalryEntry): PremiumRivalryModel {
  const botWins = n(entry.botWins), humanWins = n(entry.humanWins), matches = n(entry.matches);
  const lead = botWins - humanWins;
  const streak = n(entry.currentStreak);
  let state: PremiumRivalryModel["state"] = "balanced";
  let label = "RIVALITÉ ÉQUILIBRÉE", icon = "⚖️";
  if (matches <= 1) { state = "new"; label = "NOUVEAU RIVAL"; icon = "👀"; }
  else if (entry.currentStreakOwner === "human" && streak >= 2) { state = "revenge"; label = "REVANCHE"; icon = "🔥"; }
  else if (entry.currentStreakOwner === "bot" && streak >= 3) { state = "streak"; label = "SÉRIE DU BOT"; icon = "⚡"; }
  else if (lead >= 2) { state = "dominant"; label = "BOT EN TÊTE"; icon = "👑"; }
  else if (lead <= -2) { state = "revenge"; label = "RIVAL À RATTRAPER"; icon = "🎯"; }

  const record = `${botWins}-${humanWins}`;
  const detail = `${entry.botName} ${record} ${entry.humanName}` + (streak > 1 ? ` · série ${entry.currentStreakOwner === "bot" ? "BOT" : "HUMAIN"} x${streak}` : "");
  const model: PremiumRivalryModel = {
    botId: entry.botId,
    botName: entry.botName,
    targetId: entry.humanId,
    targetName: entry.humanName,
    label, icon, detail, record, matches,
    confidence: rivalryConfidence(matches),
    tension: rivalryTension(entry),
    quote: "",
    state,
  };
  model.quote = quoteFor(state, entry.humanName, lead, streak);
  return model;
}
function currentHumanIds(state: any, player: any, botIds: any) {
  const bots = botSet(botIds), me = canonicalId(player?.id);
  return (Array.isArray(state?.players) ? state.players : [])
    .map((p: any) => ({ id: canonicalId(p?.id), name: String(p?.name || "Joueur") }))
    .filter((p: any) => p.id && p.id !== me && !bots.has(p.id));
}
function chooseRival(mode: PremiumPartyModeKey, botId: string, humans: any[]) {
  const db = loadPremiumPartyRivalryDb();
  const entries = humans.map((h: any) => db.entries[rivalryKey(mode, botId, h.id)]).filter(Boolean);
  return entries.sort((a: any, b: any) => {
    const aThreat = n(a.humanWins) - n(a.botWins) + n(a.currentStreak) * (a.currentStreakOwner === "human" ? .7 : .15) + n(a.matches) * .04;
    const bThreat = n(b.humanWins) - n(b.botWins) + n(b.currentStreak) * (b.currentStreakOwner === "human" ? .7 : .15) + n(b.matches) * .04;
    return bThreat - aThreat;
  })[0] || null;
}
function apply(brain: PremiumBotBrain, model: PremiumRivalryModel): PremiumBotBrain {
  const next: any = { ...brain };
  const weight = Math.min(.72, .10 + model.matches * .07);
  let adjust: any = {};
  if (model.state === "revenge") adjust = { composure:.08, precision:.035, aggression:.06, risk:-.055, patience:.045 };
  else if (model.state === "dominant") adjust = { confidence:.02, risk:.055, aggression:.035, patience:-.025 };
  else if (model.state === "streak") adjust = { composure:.04, aggression:.055, risk:.025 };
  else if (model.state === "balanced") adjust = { composure:.045, precision:.02, patience:.03 };
  else adjust = { patience:.02, composure:.015 };

  for (const [key, delta] of Object.entries(adjust)) {
    if (key === "confidence") continue;
    const raw = n(next[key]) + n(delta) * weight;
    next[key] = ["attackBias","gotchaBias","bluffBias","callBias"].includes(key) ? clampSigned(raw) : clamp01(raw);
  }
  next.confidence = Math.max(1, Math.min(99, Math.round(n(next.precision) * 100)));
  return next as PremiumBotBrain;
}

export function adaptPremiumBotBrainFromRivalry(
  mode: PremiumPartyModeKey,
  state: any,
  player: any,
  brain: PremiumBotBrain,
  botIds?: Set<string> | string[],
): PremiumRivalryAdaptation {
  const botId = canonicalId(player?.id);
  if (!botId) return { brain: { ...brain }, model: null };
  const humans = currentHumanIds(state, player, botIds);
  if (!humans.length) return { brain: { ...brain }, model: null };
  const entry = chooseRival(mode, botId, humans);
  if (!entry) return { brain: { ...brain }, model: null };
  const model = modelFrom(entry);
  return { brain: apply(brain, model), model };
}
