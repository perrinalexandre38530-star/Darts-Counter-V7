// @ts-nocheck
// Persistent progression for CASTLE / GOTCHA / HARE & HOUNDS / PENDU / MENTEUR.
// Small local cache only: every finished match also receives the progression snapshot
// in History so the data remains auditable from the match itself.

export type PremiumPartyMode = "castle" | "gotcha" | "hare_hounds" | "pendu" | "menteur";

type BadgeDef = {
  key: string;
  title: string;
  detail: string;
  icon: string;
  test: (ctx: any) => boolean;
};

type RecordDef = {
  key: string;
  label: string;
  icon: string;
  value: (stats: any) => number;
};

export type PremiumPartyProgressUnlock = {
  type: "badge" | "record";
  playerId: string;
  playerName: string;
  key: string;
  label: string;
  detail: string;
  icon: string;
  value?: number;
  previousValue?: number;
};

export type PremiumPartyProgressResult = {
  version: 1;
  mode: PremiumPartyMode;
  matchId: string;
  createdAt: number;
  unlocks: PremiumPartyProgressUnlock[];
  byPlayer: Record<string, any>;
};

const STORAGE_KEY = "mss_premium_party_progress_v1";
const STORE_VERSION = 1;

const MODE_LABELS: Record<PremiumPartyMode, string> = {
  castle: "CASTLE",
  gotcha: "GOTCHA",
  hare_hounds: "HARE & HOUNDS",
  pendu: "PENDU",
  menteur: "MENTEUR",
};

function n(v: any) {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
}

function safeReadStore(): any {
  try {
    if (typeof window === "undefined" || !window.localStorage) return { version: STORE_VERSION, modes: {} };
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    if (!parsed || typeof parsed !== "object") return { version: STORE_VERSION, modes: {} };
    return { version: STORE_VERSION, modes: parsed.modes && typeof parsed.modes === "object" ? parsed.modes : {} };
  } catch {
    return { version: STORE_VERSION, modes: {} };
  }
}

function safeWriteStore(store: any) {
  try {
    if (typeof window === "undefined" || !window.localStorage) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    // Progression is non-blocking: History remains the source of truth for matches.
  }
}

const COMMON_BADGES: BadgeDef[] = [
  { key: "first_win", title: "PREMIÈRE COURONNE", detail: "Première victoire dans ce mode", icon: "🏆", test: ({ won, career }: any) => won && n(career.wins) >= 1 },
  { key: "veteran_10", title: "HABITUÉ DU MODE", detail: "10 parties terminées", icon: "⭐", test: ({ career }: any) => n(career.matches) >= 10 },
  { key: "winner_5", title: "SÉRIEUX CLIENT", detail: "5 victoires cumulées", icon: "👑", test: ({ career }: any) => n(career.wins) >= 5 },
];

const MODE_BADGES: Record<PremiumPartyMode, BadgeDef[]> = {
  castle: [
    { key: "castle_architect", title: "GRAND ARCHITECTE", detail: "10 constructions sur une partie", icon: "🏰", test: ({ stats }: any) => n(stats.builds) >= 10 },
    { key: "castle_siege", title: "BRISE-MURAILLE", detail: "10 dégâts infligés sur une partie", icon: "💥", test: ({ stats }: any) => n(stats.damage) >= 10 },
    { key: "castle_streak", title: "MAÎTRE BÂTISSEUR", detail: "6 touches utiles consécutives", icon: "🧱", test: ({ stats }: any) => n(stats.bestUsefulStreak) >= 6 },
  ],
  gotcha: [
    { key: "gotcha_first", title: "GOTCHA !", detail: "Premier adversaire remis à zéro", icon: "🎯", test: ({ stats }: any) => n(stats.gotchas) >= 1 },
    { key: "gotcha_hunter", title: "CHASSEUR DE SCORES", detail: "2 victimes GOTCHA sur une partie", icon: "⚡", test: ({ stats }: any) => n(stats.victims) >= 2 },
    { key: "gotcha_finisher", title: "FINISHER", detail: "Un finish exact validé", icon: "🏁", test: ({ stats }: any) => n(stats.exactFinishes) >= 1 },
    { key: "gotcha_clean", title: "SANS TREMBLER", detail: "Victoire sans aucun BUST", icon: "🛡️", test: ({ stats, won }: any) => won && n(stats.busts) === 0 },
  ],
  hare_hounds: [
    { key: "hare_capture", title: "CHASSEUR", detail: "Une capture du Lièvre", icon: "🐕", test: ({ stats }: any) => n(stats.catches) >= 1 },
    { key: "hare_escape", title: "INSAISISSABLE", detail: "Une évasion en tant que Lièvre", icon: "🐇", test: ({ stats }: any) => n(stats.escapes) >= 1 },
    { key: "hare_sprint", title: "SPRINTEUR", detail: "3 étapes ou plus sur une volée", icon: "💨", test: ({ stats }: any) => n(stats.bestVisitSteps) >= 3 },
    { key: "hare_streak", title: "PISTE PARFAITE", detail: "6 touches valides consécutives", icon: "🛤️", test: ({ stats }: any) => n(stats.bestHitStreak) >= 6 },
  ],
  pendu: [
    { key: "pendu_master", title: "MAÎTRE DU DÉFI", detail: "3 défis réussis sur une partie", icon: "🎯", test: ({ stats }: any) => n(stats.challengesPassed) >= 3 },
    { key: "pendu_copy", title: "COPIE PARFAITE", detail: "3 reproductions réussies", icon: "🪞", test: ({ stats }: any) => n(stats.copySuccesses) >= 3 },
    { key: "pendu_caller", title: "BOURREAU", detail: "3 défis de meneur réussis", icon: "🪢", test: ({ stats }: any) => n(stats.callerSuccesses) >= 3 },
    { key: "pendu_clean", title: "SANS FAUTE", detail: "Victoire sans erreur", icon: "✨", test: ({ stats, won }: any) => won && n(stats.errorsTaken) === 0 },
  ],
  menteur: [
    { key: "menteur_detective", title: "DÉTECTIVE", detail: "2 appels MENTEUR gagnés", icon: "🕵️", test: ({ stats }: any) => n(stats.successfulCalls) >= 2 },
    { key: "menteur_proof", title: "PREUVE BÉTON", detail: "2 contrats prouvés", icon: "✅", test: ({ stats }: any) => n(stats.contractsProven) >= 2 },
    { key: "menteur_caught", title: "ANTI-BLUFF", detail: "2 mensonges démasqués", icon: "🚨", test: ({ stats }: any) => n(stats.liesCaught) >= 2 },
    { key: "menteur_streak", title: "SANG-FROID", detail: "3 preuves consécutives", icon: "🧊", test: ({ stats }: any) => n(stats.bestProofStreak) >= 3 },
  ],
};

const MODE_RECORDS: Record<PremiumPartyMode, RecordDef[]> = {
  castle: [
    { key: "bestImpactVisit", label: "Best impact", icon: "⚔️", value: (s) => n(s.bestImpactVisit) },
    { key: "bestBuildVisit", label: "Best construction", icon: "🧱", value: (s) => n(s.bestBuildVisit) },
    { key: "bestDamageVisit", label: "Best attaque", icon: "💥", value: (s) => n(s.bestDamageVisit) },
    { key: "bestUsefulStreak", label: "Série utile", icon: "🔥", value: (s) => n(s.bestUsefulStreak) },
    { key: "matchDamage", label: "Dégâts sur un match", icon: "🗡️", value: (s) => n(s.damage) },
    { key: "matchBuilds", label: "Constructions sur un match", icon: "🏰", value: (s) => n(s.builds) },
  ],
  gotcha: [
    { key: "bestVisit", label: "Best volée", icon: "🎯", value: (s) => n(s.bestVisit) },
    { key: "bestGotchaVisit", label: "Best GOTCHA", icon: "⚡", value: (s) => n(s.bestGotchaVisit) },
    { key: "highestScore", label: "Score max atteint", icon: "📈", value: (s) => n(s.highestScore) },
    { key: "matchGotchas", label: "GOTCHA sur un match", icon: "🎯", value: (s) => n(s.gotchas) },
    { key: "matchVictims", label: "Victimes sur un match", icon: "💣", value: (s) => n(s.victims) },
    { key: "matchFinishes", label: "Finishes sur un match", icon: "🏁", value: (s) => n(s.exactFinishes) },
  ],
  hare_hounds: [
    { key: "bestVisitSteps", label: "Étapes sur une volée", icon: "💨", value: (s) => n(s.bestVisitSteps) },
    { key: "bestHitStreak", label: "Série de touches", icon: "🔥", value: (s) => n(s.bestHitStreak) },
    { key: "matchSteps", label: "Étapes sur un match", icon: "🛤️", value: (s) => n(s.steps) },
    { key: "matchCatches", label: "Captures sur un match", icon: "🐕", value: (s) => n(s.catches) },
    { key: "matchEscapes", label: "Évasions sur un match", icon: "🐇", value: (s) => n(s.escapes) },
  ],
  pendu: [
    { key: "bestVisit", label: "Best volée", icon: "🎯", value: (s) => n(s.bestVisit) },
    { key: "bestSuccessStreak", label: "Série de réussites", icon: "🔥", value: (s) => n(s.bestSuccessStreak) },
    { key: "matchChallenges", label: "Défis réussis", icon: "✅", value: (s) => n(s.challengesPassed) },
    { key: "matchCaller", label: "Réussites meneur", icon: "🪢", value: (s) => n(s.callerSuccesses) },
    { key: "matchCopies", label: "Copies réussies", icon: "🪞", value: (s) => n(s.copySuccesses) },
  ],
  menteur: [
    { key: "bestVisit", label: "Best preuve", icon: "🎯", value: (s) => n(s.bestVisit) },
    { key: "maxBid", label: "Enchère max", icon: "📣", value: (s) => n(s.maxBid) },
    { key: "bestProofStreak", label: "Série de preuves", icon: "🔥", value: (s) => n(s.bestProofStreak) },
    { key: "matchCalls", label: "Calls gagnés", icon: "🕵️", value: (s) => n(s.successfulCalls) },
    { key: "matchProofs", label: "Contrats prouvés", icon: "✅", value: (s) => n(s.contractsProven) },
    { key: "matchCaught", label: "Mensonges démasqués", icon: "🚨", value: (s) => n(s.liesCaught) },
  ],
};

function freshCareer(name = "Joueur") {
  return { name, matches: 0, wins: 0, badges: {}, records: {}, processedMatchIds: [], updatedAt: 0 };
}

export function commitPremiumPartyProgress(input: {
  mode: PremiumPartyMode;
  matchId: string;
  winnerId?: string | null;
  participants: Array<{ id: string; name?: string; stats?: any; isBot?: boolean }>;
}): PremiumPartyProgressResult {
  const now = Date.now();
  const store = safeReadStore();
  const modeKey = String(input.mode) as PremiumPartyMode;
  const modeStore = store.modes[modeKey] && typeof store.modes[modeKey] === "object" ? store.modes[modeKey] : { players: {} };
  modeStore.players = modeStore.players && typeof modeStore.players === "object" ? modeStore.players : {};
  const unlocks: PremiumPartyProgressUnlock[] = [];
  const byPlayer: Record<string, any> = {};

  for (const participant of input.participants || []) {
    if (!participant?.id || participant?.isBot) continue;
    const id = String(participant.id);
    const name = String(participant.name || "Joueur");
    const stats = participant.stats || {};
    const current = { ...freshCareer(name), ...(modeStore.players[id] || {}) };
    current.badges = current.badges && typeof current.badges === "object" ? current.badges : {};
    current.records = current.records && typeof current.records === "object" ? current.records : {};
    current.processedMatchIds = Array.isArray(current.processedMatchIds) ? current.processedMatchIds.map(String) : [];
    const alreadyProcessed = current.processedMatchIds.includes(String(input.matchId));
    const won = String(input.winnerId || "") === id;

    if (!alreadyProcessed) {
      current.matches = n(current.matches) + 1;
      current.wins = n(current.wins) + (won ? 1 : 0);
      current.processedMatchIds = [...current.processedMatchIds.slice(-39), String(input.matchId)];
    }

    const badgeDefs = [...COMMON_BADGES, ...(MODE_BADGES[modeKey] || [])];
    for (const def of badgeDefs) {
      if (current.badges[def.key]) continue;
      let ok = false;
      try { ok = Boolean(def.test({ stats, won, career: current, mode: modeKey })); } catch {}
      if (!ok) continue;
      current.badges[def.key] = { key: def.key, title: def.title, detail: def.detail, icon: def.icon, unlockedAt: now, matchId: String(input.matchId) };
      unlocks.push({ type: "badge", playerId: id, playerName: name, key: def.key, label: def.title, detail: def.detail, icon: def.icon });
    }

    if (!alreadyProcessed) {
      for (const def of MODE_RECORDS[modeKey] || []) {
        const value = Math.max(0, n(def.value(stats)));
        if (value <= 0) continue;
        const previous = current.records[def.key];
        const previousValue = n(previous?.value);
        if (value <= previousValue) continue;
        current.records[def.key] = { key: def.key, label: def.label, icon: def.icon, value, previousValue, updatedAt: now, matchId: String(input.matchId) };
        unlocks.push({ type: "record", playerId: id, playerName: name, key: def.key, label: def.label, detail: previousValue > 0 ? `${previousValue} → ${value}` : `Nouveau record : ${value}`, icon: def.icon, value, previousValue });
      }
    }

    current.name = name;
    current.updatedAt = now;
    modeStore.players[id] = current;
    byPlayer[id] = {
      matches: n(current.matches),
      wins: n(current.wins),
      badges: Object.values(current.badges || {}),
      records: Object.values(current.records || {}).sort((a: any, b: any) => n(b.updatedAt) - n(a.updatedAt)),
    };
  }

  store.modes[modeKey] = modeStore;
  store.updatedAt = now;
  safeWriteStore(store);

  return { version: 1, mode: modeKey, matchId: String(input.matchId), createdAt: now, unlocks, byPlayer };
}

export function readPremiumPartyProgress(mode: PremiumPartyMode, playerId: string) {
  const store = safeReadStore();
  const row = store?.modes?.[mode]?.players?.[String(playerId)];
  return row ? { ...row, mode, modeLabel: MODE_LABELS[mode] } : null;
}

export function premiumPartyModeLabel(mode: PremiumPartyMode) {
  return MODE_LABELS[mode] || String(mode).toUpperCase();
}
