import { canRequestPaidAds, getVerifiedAdFreeState, loadMonetizationPrefs, subscribeVerifiedEntitlements } from "./prefs";
import { showInterstitialAd } from "./provider";

const RUNTIME_KEY = "dc_monetization_runtime_v1";

type PendingAd = {
  matchId: string;
  mode?: string;
  at: number;
  seenResults: boolean;
};

type RuntimeState = {
  completedMatches: number;
  lastInterstitialAt: number;
  recentMatchIds: string[];
  pending: PendingAd | null;
};

const DEFAULT_RUNTIME: RuntimeState = {
  completedMatches: 0,
  lastInterstitialAt: 0,
  recentMatchIds: [],
  pending: null,
};

let interstitialInFlight: Promise<void> | null = null;
let entitlementGuardInstalled = false;

function installEntitlementGuard(): void {
  if (entitlementGuardInstalled || typeof window === "undefined") return;
  entitlementGuardInstalled = true;
  subscribeVerifiedEntitlements(() => {
    if (!getVerifiedAdFreeState().active) return;
    const state = loadRuntime();
    if (state.pending) {
      state.pending = null;
      saveRuntime(state);
    }
  });
}

function loadRuntime(): RuntimeState {
  if (typeof window === "undefined") return { ...DEFAULT_RUNTIME };
  try {
    const raw = window.localStorage.getItem(RUNTIME_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    return {
      ...DEFAULT_RUNTIME,
      ...(parsed && typeof parsed === "object" ? parsed : {}),
      recentMatchIds: Array.isArray(parsed?.recentMatchIds) ? parsed.recentMatchIds.map(String).slice(-30) : [],
      pending: parsed?.pending && typeof parsed.pending === "object" ? parsed.pending : null,
    };
  } catch {
    return { ...DEFAULT_RUNTIME };
  }
}

function saveRuntime(state: RuntimeState) {
  if (typeof window === "undefined") return;
  try { window.localStorage.setItem(RUNTIME_KEY, JSON.stringify(state)); } catch {}
}

const RESULT_TABS = new Set([
  "x01_end", "killer_summary", "shanghai_end", "darts_mode_summary", "babyfoot_end",
  "statsDetail", "petanque_stats_history", "babyfoot_stats_history", "pingpong_stats_history",
  "molkky_stats_history", "history",
]);

const GAMEPLAY_TABS = new Set([
  "x01", "x01_play_v3", "cricket", "killer_play", "shanghai_play", "warfare_play",
  "battle_royale_play", "five_lives_play", "training_x01_play", "training_clock",
  "halve_it_play", "count_up_play", "prisoner_play", "super_bull_play", "shooter_play",
  "darts_racer_play", "loterie_play", "tic_tac_toe_play", "knockout_play", "bobs_27_play",
  "bowling_play", "scram_play", "golf_play", "baseball_play", "attrape_moi_play",
  "president_play", "game_170_play", "football_play", "batard_play", "capital_play",
  "happy_mille_play", "rugby_play", "departements_play", "enculette_play", "tournament_match_play",
  "petanque_play", "babyfoot_play", "pingpong_play", "molkky_play", "dice_play", "foot_play",
]);

function isResultRoute(tab: string, params?: any): boolean {
  if (RESULT_TABS.has(tab)) return true;
  if (tab === "statsHub" && String(params?.tab || "").toLowerCase() === "history") return true;
  if (tab.endsWith("_stats_history")) return true;
  return false;
}

function dueNow(_state: RuntimeState): boolean {
  const prefs = loadMonetizationPrefs();
  if (!canRequestPaidAds(prefs) || !prefs.endGameVideoEnabled || prefs.endGameAdTiming === "off") return false;
  if (getVerifiedAdFreeState().active) return false;

  // Politique FREE retenue : chaque partie réellement terminée et sauvegardée
  // crée une tentative d'interstitiel. Aucun modulo et aucun délai minimum.
  return true;
}

async function showAndConsume(reason: string): Promise<void> {
  if (interstitialInFlight) return interstitialInFlight;
  interstitialInFlight = (async () => {
    const result = await showInterstitialAd(reason);
    const state = loadRuntime();
    state.pending = null;
    if (result.status === "shown") state.lastInterstitialAt = Date.now();
    saveRuntime(state);
  })().finally(() => {
    interstitialInFlight = null;
  });
  return interstitialInFlight;
}

/** Appelé uniquement lorsqu'une partie terminée est réellement persistée. */
export function markCompletedMatchForAds(matchId: string, mode?: string): void {
  installEntitlementGuard();
  const id = String(matchId || "").trim();
  if (!id) return;

  const state = loadRuntime();
  if (state.recentMatchIds.includes(id)) return;
  state.recentMatchIds = [...state.recentMatchIds.slice(-29), id];
  state.completedMatches += 1;
  state.pending = null;

  if (dueNow(state)) {
    state.pending = { matchId: id, mode: mode ? String(mode) : undefined, at: Date.now(), seenResults: false };
  }
  saveRuntime(state);

  const prefs = loadMonetizationPrefs();
  // "Avant résultats" : on couvre immédiatement l'écran avec l'interstitiel.
  // Le résultat peut se préparer derrière, mais aucune navigation n'est bloquée.
  if (state.pending && prefs.endGameAdTiming === "before_results") {
    void showAndConsume("end_game_before_results");
  }
}

export function interceptMonetizedNavigation(args: {
  fromTab: string;
  fromParams?: any;
  toTab: string;
  toParams?: any;
  navigate: () => void;
}): boolean {
  installEntitlementGuard();
  const prefs = loadMonetizationPrefs();
  if (prefs.endGameAdTiming !== "after_results" || !prefs.endGameVideoEnabled || !canRequestPaidAds(prefs)) return false;
  if (getVerifiedAdFreeState().active) return false;

  const state = loadRuntime();
  const pending = state.pending;
  if (!pending) return false;

  const fromResult = isResultRoute(String(args.fromTab || ""), args.fromParams);
  const toResult = isResultRoute(String(args.toTab || ""), args.toParams);

  // La navigation vers le résumé/historique doit rester instantanée.
  if (toResult) {
    pending.seenResults = true;
    state.pending = pending;
    saveRuntime(state);
    return false;
  }

  const fromGameplay = GAMEPLAY_TABS.has(String(args.fromTab || ""));

  // Si le mode garde son tableau final directement dans l'écran Play, la première sortie
  // après la persistance du match est précisément le moment "après résultats".
  if (fromResult || pending.seenResults || (fromGameplay && !toResult)) {
    void (async () => {
      await showAndConsume("end_game_after_results");
      args.navigate();
    })();
    return true;
  }

  return false;
}

export async function previewEndGameInterstitial(): Promise<void> {
  await showInterstitialAd("settings_preview", true);
}

export function getMonetizationRuntimeSnapshot() {
  return loadRuntime();
}
