// @ts-nocheck
// =============================================================
// PREMIUM PARTY BOT SCOUTING V11
// Dossier adversaire inter-match, local et compact.
// Conserve uniquement des agrégats de gameplay (aucune donnée de compte).
// =============================================================

import type { PremiumBotBrain, PremiumPartyModeKey } from "./premiumPartyBotAI";

const STORAGE_KEY = "dc_premium_party_bot_scouting_v1";
const MAX_ENTRIES = 180;
const MAX_SEEN_MATCHES = 600;

export type PremiumScoutingEntry = {
  mode: PremiumPartyModeKey;
  targetId: string;
  targetName: string;
  matches: number;
  wins: number;
  totalVisits: number;
  totals: Record<string, number>;
  peaks: Record<string, number>;
  lastSeenAt: number;
};

export type PremiumScoutingModel = {
  targetId: string;
  targetName: string;
  patternKey: string;
  label: string;
  icon: string;
  detail: string;
  matches: number;
  confidence: number;
};

export type PremiumScoutingAdaptation = {
  brain: PremiumBotBrain;
  model: PremiumScoutingModel | null;
};

type PremiumScoutingDb = {
  version: 1;
  entries: Record<string, PremiumScoutingEntry>;
  seenMatchIds: string[];
};

function n(v: any) {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
}
function clamp01(v: number) {
  return Math.max(0, Math.min(1, Number(v || 0)));
}
function clampSigned(v: number) {
  return Math.max(-.45, Math.min(.45, Number(v || 0)));
}
function canonicalId(v: any) {
  return String(v ?? "").replace(/^online:/, "").trim();
}
function entryKey(mode: PremiumPartyModeKey, targetId: string) {
  return `${mode}:${canonicalId(targetId)}`;
}
function emptyDb(): PremiumScoutingDb {
  return { version: 1, entries: {}, seenMatchIds: [] };
}
function safeStorage(): Storage | null {
  try {
    if (typeof window === "undefined" || !window.localStorage) return null;
    return window.localStorage;
  } catch {
    return null;
  }
}
export function loadPremiumPartyScoutingDb(): PremiumScoutingDb {
  const ls = safeStorage();
  if (!ls) return emptyDb();
  try {
    const parsed = JSON.parse(ls.getItem(STORAGE_KEY) || "null");
    if (!parsed || typeof parsed !== "object") return emptyDb();
    return {
      version: 1,
      entries: parsed.entries && typeof parsed.entries === "object" ? parsed.entries : {},
      seenMatchIds: Array.isArray(parsed.seenMatchIds) ? parsed.seenMatchIds.map(String).slice(-MAX_SEEN_MATCHES) : [],
    };
  } catch {
    return emptyDb();
  }
}
function saveDb(db: PremiumScoutingDb) {
  const ls = safeStorage();
  if (!ls) return;
  try {
    const entries = Object.values(db.entries || {})
      .sort((a: any, b: any) => Number(b?.lastSeenAt || 0) - Number(a?.lastSeenAt || 0))
      .slice(0, MAX_ENTRIES);
    const compact: PremiumScoutingDb = {
      version: 1,
      entries: Object.fromEntries(entries.map((e: any) => [entryKey(e.mode, e.targetId), e])),
      seenMatchIds: (db.seenMatchIds || []).slice(-MAX_SEEN_MATCHES),
    };
    ls.setItem(STORAGE_KEY, JSON.stringify(compact));
  } catch {}
}
function numericStats(stats: any) {
  const out: Record<string, number> = {};
  if (!stats || typeof stats !== "object") return out;
  for (const [key, raw] of Object.entries(stats)) {
    if (typeof raw === "number" && Number.isFinite(raw)) out[key] = Number(raw);
  }
  return out;
}
function botSet(botIds: any) {
  if (botIds instanceof Set) return new Set([...botIds].map(canonicalId));
  if (Array.isArray(botIds)) return new Set(botIds.map(canonicalId));
  return new Set<string>();
}
function resolveParticipants(state: any, participants?: any[], botIds?: any) {
  const bots = botSet(botIds);
  const source = Array.isArray(participants) && participants.length ? participants : (Array.isArray(state?.players) ? state.players : []);
  return source.map((p: any) => ({
    id: canonicalId(p?.id ?? p?.playerId ?? p?.profileId),
    name: String(p?.name ?? p?.displayName ?? p?.nickname ?? "Joueur"),
    isBot: Boolean(p?.isBot) || bots.has(canonicalId(p?.id ?? p?.playerId ?? p?.profileId)),
  })).filter((p: any) => p.id);
}

export function commitPremiumPartyScouting({
  mode,
  matchId,
  winnerId,
  state,
  participants,
  botIds,
}: {
  mode: PremiumPartyModeKey;
  matchId: string;
  winnerId?: string | null;
  state: any;
  participants?: any[];
  botIds?: Set<string> | string[];
}) {
  const id = String(matchId || "").trim();
  if (!id) return { committed: false, entries: [] as PremiumScoutingEntry[] };

  const db = loadPremiumPartyScoutingDb();
  if (db.seenMatchIds.includes(id)) return { committed: false, entries: [] as PremiumScoutingEntry[] };

  const rows = resolveParticipants(state, participants, botIds).filter((p: any) => !p.isBot);
  const now = Date.now();
  const winner = canonicalId(winnerId);
  const updated: PremiumScoutingEntry[] = [];

  for (const p of rows) {
    const key = entryKey(mode, p.id);
    const prev: PremiumScoutingEntry = db.entries[key] || {
      mode,
      targetId: p.id,
      targetName: p.name,
      matches: 0,
      wins: 0,
      totalVisits: 0,
      totals: {},
      peaks: {},
      lastSeenAt: 0,
    };
    const st = state?.statsByPlayer?.[p.id]
      || state?.statsByPlayer?.[`online:${p.id}`]
      || state?.statsByPlayer?.[String((participants || []).find((x: any) => canonicalId(x?.id) === p.id)?.id || "")]
      || {};
    const nums = numericStats(st);
    const totals = { ...(prev.totals || {}) };
    const peaks = { ...(prev.peaks || {}) };
    for (const [metric, value] of Object.entries(nums)) {
      totals[metric] = n(totals[metric]) + n(value);
      peaks[metric] = Math.max(n(peaks[metric]), n(value));
    }
    const next: PremiumScoutingEntry = {
      ...prev,
      mode,
      targetId: p.id,
      targetName: p.name || prev.targetName,
      matches: n(prev.matches) + 1,
      wins: n(prev.wins) + (winner && winner === p.id ? 1 : 0),
      totalVisits: n(prev.totalVisits) + n(st?.visits),
      totals,
      peaks,
      lastSeenAt: now,
    };
    db.entries[key] = next;
    updated.push(next);
  }

  db.seenMatchIds = [...db.seenMatchIds.filter((x) => x !== id), id].slice(-MAX_SEEN_MATCHES);
  saveDb(db);
  return { committed: true, entries: updated };
}

export function getPremiumPartyScoutingEntry(mode: PremiumPartyModeKey, targetId: string) {
  const db = loadPremiumPartyScoutingDb();
  return db.entries[entryKey(mode, targetId)] || null;
}

function currentHumanIds(state: any, player: any, botIds: any) {
  const bots = botSet(botIds);
  const me = canonicalId(player?.id);
  return (Array.isArray(state?.players) ? state.players : [])
    .map((p: any) => ({ id: canonicalId(p?.id), name: String(p?.name || "Joueur") }))
    .filter((p: any) => p.id && p.id !== me && !bots.has(p.id));
}
function scoutingConfidence(matches: number) {
  if (matches <= 0) return 0;
  return Math.min(98, 30 + matches * 9);
}
function strength(matches: number) {
  if (matches <= 0) return 0;
  return Math.min(.78, .16 + Math.log2(matches + 1) * .14);
}
function perMatch(entry: PremiumScoutingEntry, metric: string) {
  return n(entry?.totals?.[metric]) / Math.max(1, n(entry?.matches));
}
function rate(entry: PremiumScoutingEntry, numerator: string, denominator: string) {
  const den = n(entry?.totals?.[denominator]);
  return den > 0 ? n(entry?.totals?.[numerator]) / den : 0;
}
function apply(
  brain: PremiumBotBrain,
  weight: number,
  adjust: Partial<Record<"precision"|"risk"|"aggression"|"patience"|"composure"|"attackBias"|"gotchaBias"|"bluffBias"|"callBias", number>>,
) {
  const next: any = { ...brain };
  for (const [key, delta] of Object.entries(adjust)) {
    const raw = n(next[key]) + n(delta) * weight;
    next[key] = ["attackBias","gotchaBias","bluffBias","callBias"].includes(key) ? clampSigned(raw) : clamp01(raw);
  }
  next.confidence = Math.max(1, Math.min(99, Math.round(n(next.precision) * 100)));
  return next as PremiumBotBrain;
}

function classify(mode: PremiumPartyModeKey, e: PremiumScoutingEntry) {
  const matches = Math.max(1, n(e.matches));

  if (mode === "castle") {
    const builds = perMatch(e, "builds") || perMatch(e, "buildHits");
    const damage = perMatch(e, "damage") || perMatch(e, "attackHits");
    if (damage >= Math.max(1.4, builds * .72)) return { key:"attacker", label:"AGRESSEUR CONNU", icon:"⚔️", detail:`Sur ${matches} match(s) : ${damage.toFixed(1)} dégâts/match contre ${builds.toFixed(1)} construction(s).`, adjust:{ composure:.06, risk:-.04, attackBias:.05 } };
    if (builds >= Math.max(2.2, damage * 1.45)) return { key:"builder", label:"BÂTISSEUR CONNU", icon:"🧱", detail:`Sur ${matches} match(s) : ${builds.toFixed(1)} construction(s)/match.`, adjust:{ attackBias:.20, aggression:.08 } };
    return { key:"balanced", label:"POLYVALENT CONNU", icon:"⚖️", detail:`${matches} match(s) déjà observé(s) en CASTLE.`, adjust:{ composure:.025, attackBias:.04 } };
  }

  if (mode === "gotcha") {
    const gotchas = perMatch(e, "gotchas"), busts = perMatch(e, "busts");
    const finish = perMatch(e, "exactFinishes");
    if (gotchas >= .75) return { key:"trapper", label:"PIÉGEUR CONNU", icon:"🪤", detail:`${gotchas.toFixed(1)} GOTCHA/match sur ${matches} match(s).`, adjust:{ composure:.06, precision:.025, gotchaBias:.08, risk:-.04 } };
    if (busts >= 1.3) return { key:"bust_prone", label:"RISQUE ÉLEVÉ CONNU", icon:"💥", detail:`${busts.toFixed(1)} BUST/match : l'IA attend ses erreurs.`, adjust:{ patience:.08, risk:-.05 } };
    if (finish >= .7) return { key:"finisher", label:"FINISHEUR CONNU", icon:"🎯", detail:`${finish.toFixed(1)} finish exact/match.`, adjust:{ gotchaBias:.18, aggression:.07 } };
    return { key:"scorer", label:"SCORER CONNU", icon:"📈", detail:`${matches} match(s) déjà analysé(s) en GOTCHA.`, adjust:{ gotchaBias:.07, precision:.012 } };
  }

  if (mode === "hare_hounds") {
    const acc = rate(e, "validHits", "darts");
    const closers = perMatch(e, "catches") + perMatch(e, "escapes");
    if (acc >= .72 && n(e.totals?.darts) >= 12) return { key:"sprinter", label:"SPRINTER CONNU", icon:"⚡", detail:`${Math.round(acc*100)}% de touches valides sur ${matches} match(s).`, adjust:{ precision:.035, aggression:.07, risk:.04, composure:.04 } };
    if (acc > 0 && acc <= .46 && n(e.totals?.darts) >= 12) return { key:"erratic", label:"IRRÉGULIER CONNU", icon:"🌪️", detail:`${Math.round(acc*100)}% de touches : jouer propre suffit souvent.`, adjust:{ patience:.07, risk:-.07 } };
    if (closers >= .8) return { key:"closer", label:"FINISHEUR CONNU", icon:"🏁", detail:`${closers.toFixed(1)} capture/évasion par match.`, adjust:{ composure:.055, precision:.025 } };
    return { key:"steady_runner", label:"COUREUR CONNU", icon:"🏃", detail:`${matches} match(s) déjà analysé(s).`, adjust:{ precision:.012, patience:.02 } };
  }

  if (mode === "pendu") {
    const success = rate(e, "challengesPassed", "visits");
    const errors = perMatch(e, "errorsTaken");
    const caller = perMatch(e, "callerSuccesses");
    if (success >= .68 && n(e.totalVisits) >= 8) return { key:"strong_copy", label:"COPIEUR SOLIDE CONNU", icon:"🪞", detail:`${Math.round(success*100)}% de défis réussis historiquement.`, adjust:{ precision:.035, risk:.055, aggression:.045, composure:.04 } };
    if (errors >= 3.2) return { key:"fragile", label:"FRAGILE SOUS PRESSION", icon:"🧨", detail:`${errors.toFixed(1)} erreur(s)/match en moyenne.`, adjust:{ patience:.065, risk:-.035 } };
    if (caller >= .9) return { key:"strong_caller", label:"MENEUR FORT CONNU", icon:"📣", detail:`${caller.toFixed(1)} réussite(s) meneur/match.`, adjust:{ composure:.06, precision:.03 } };
    return { key:"average_copy", label:"COPIE CONNUE", icon:"📋", detail:`${matches} match(s) déjà observé(s) en PENDU.`, adjust:{ precision:.012 } };
  }

  const calls = n(e.totals?.liarCalls);
  const successful = n(e.totals?.successfulCalls);
  const callSuccess = calls > 0 ? successful / calls : 0;
  const raises = perMatch(e, "raises");
  const maxBid = n(e.peaks?.maxBid);
  const proofRate = rate(e, "contractsProven", "contractsAttempted");
  if (calls >= 4 && callSuccess >= .60) return { key:"bluff_detector", label:"DÉTECTEUR DE BLUFF CONNU", icon:"🕵️", detail:`${Math.round(callSuccess*100)}% d'appels MENTEUR gagnants sur ${matches} match(s).`, adjust:{ bluffBias:-.22, risk:-.08, patience:.08, composure:.06 } };
  if (maxBid >= 140 || raises >= 4.4) return { key:"raiser", label:"SURENCHÉRISSEUR CONNU", icon:"📢", detail:`Enchère record ${maxBid || "—"} · ${raises.toFixed(1)} hausse(s)/match.`, adjust:{ callBias:.20, patience:.055, bluffBias:-.04 } };
  if (proofRate >= .65 && n(e.totals?.contractsAttempted) >= 4) return { key:"prover", label:"PREUVE SOLIDE CONNUE", icon:"🛡️", detail:`${Math.round(proofRate*100)}% de contrats prouvés.`, adjust:{ callBias:-.12, precision:.025, patience:.045 } };
  return { key:"balanced_bluff", label:"BLUFFEUR CONNU", icon:"🎭", detail:`${matches} match(s) déjà analysé(s) en MENTEUR.`, adjust:{ callBias:.035, patience:.02 } };
}

export function adaptPremiumBotBrainFromScouting(
  mode: PremiumPartyModeKey,
  state: any,
  player: any,
  baseBrain: PremiumBotBrain,
  botIds?: Set<string> | string[],
): PremiumScoutingAdaptation {
  const opponents = currentHumanIds(state, player, botIds);
  if (!opponents.length) return { brain: { ...baseBrain }, model: null };

  const db = loadPremiumPartyScoutingDb();
  const candidates = opponents
    .map((p: any) => ({ p, entry: db.entries[entryKey(mode, p.id)] as PremiumScoutingEntry | undefined }))
    .filter((x: any) => x.entry && n(x.entry.matches) > 0)
    .sort((a: any, b: any) => (n(b.entry.matches) - n(a.entry.matches)) || (n(b.entry.lastSeenAt) - n(a.entry.lastSeenAt)));

  const hit = candidates[0];
  if (!hit) return { brain: { ...baseBrain }, model: null };

  const pattern: any = classify(mode, hit.entry);
  const weight = strength(n(hit.entry.matches));
  const brain = apply(baseBrain, weight, pattern.adjust || {});
  return {
    brain,
    model: {
      targetId: canonicalId(hit.p.id),
      targetName: hit.p.name || hit.entry.targetName,
      patternKey: pattern.key,
      label: pattern.label,
      icon: pattern.icon,
      detail: pattern.detail,
      matches: n(hit.entry.matches),
      confidence: scoutingConfidence(n(hit.entry.matches)),
    },
  };
}

export function clearPremiumPartyScouting() {
  const ls = safeStorage();
  if (!ls) return false;
  try {
    ls.removeItem(STORAGE_KEY);
    return true;
  } catch {
    return false;
  }
}
