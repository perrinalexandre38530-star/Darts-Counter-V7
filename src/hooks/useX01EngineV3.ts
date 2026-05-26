// =============================================================
// src/hooks/useX01EngineV3.ts
// Moteur X01 V3 — VERSION FIXÉE (stats 100% correctes)
// - Stats LIVE correctes (darts, visits, bestVisit, totalScore)
// - PATCH COMPLET HITS/MISS/BUST/SEGMENTS + POWER (60+/100+/140+/180)
// - Agrégat summary.detailedByPlayer pour les matchs X01 multi
// - summary.game.startScore + summary.rankings (pour Historique)
// - Une seule MAJ des stats par VOLÉE
// - Checkout adaptatif V3
// - Status : playing / leg_end / set_end / match_end
// - 🔥 UNDO illimité : efface le dernier hit, remonte joueurs/volées
//   + rebuildFromDarts(allDarts) pour reconstruire un match complet
// =============================================================

import * as React from "react";
import { useDevMode } from "../contexts/DevModeContext";

import type {
  X01ConfigV3,
  X01MatchStateV3,
  X01PlayerId,
  X01DartInputV3,
  X01StatsLiveV3,
} from "../types/x01v3";

import {
  startNewVisitV3,
  applyDartToCurrentPlayerV3,
  isMultiContinueMode, // 👈 helper MULTI "continuer" (FF)
} from "../lib/x01v3/x01LogicV3";

import {
  generateThrowOrderV3,
  getNextPlayerV3,
  checkLegWinV3,
  applyLegWinV3,
  checkSetWinV3,
  applySetWinV3,
  checkMatchWinV3,
} from "../lib/x01v3/x01FlowV3";

import {
  createEmptyLiveStatsV3,
  applyVisitToLiveStatsV3,
} from "../lib/x01v3/x01StatsLiveV3";

import { extAdaptCheckoutSuggestion } from "../lib/x01v3/x01CheckoutV3";
import { History, type SavedMatch, type PlayerLite } from "../lib/history";
import { setX01DevSimEnabled } from "../lib/x01v3/x01DevSim";


function safeTeamPlayers(team: any): string[] {
  const arr = team?.players;
  if (Array.isArray(arr)) return arr.filter(Boolean);
  const legacy = team?.playerIds;
  if (Array.isArray(legacy)) return legacy.filter(Boolean);
  return [];
}

// -------------------------------------------------------------
// Checkout outMode filter (Simple/Double/Master) — SAFE
// -------------------------------------------------------------
// -------------------------------------------------------------
// outMode normalize (legacy: "single" => "simple")
// -------------------------------------------------------------
function normalizeOutMode(input: any): "simple" | "double" | "master" {
  const s = String(input ?? "")
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  if (s === "single" || s === "simple" || s.includes("simple")) return "simple";
  if (s === "master" || s.includes("master")) return "master";
  return "double";
}

function isOutValid(
  last: { mult: 1 | 2 | 3 } | null | undefined,
  outMode: any
) {
  const om = normalizeOutMode(outMode);
  if (!last) return true;
  if (om === "double") return last.mult === 2;
  if (om === "master") return last.mult === 2 || last.mult === 3;
  return true; // simple
}

function filterCheckoutSuggestions(raw: any, outMode: any) {
  if (!Array.isArray(raw)) return raw;
  return raw.filter((combo: any) => {
    if (!Array.isArray(combo) || combo.length === 0) return true;
    const last = combo[combo.length - 1];
    return isOutValid(last, outMode);
  });
}


function setScoresForPlayerOrTeam(cfg: X01ConfigV3, state: X01MatchStateV3, pid: X01PlayerId, newScore: number) {
  // SOLO/MULTI : score individuel
  if (cfg.gameMode !== "teams" || !Array.isArray((cfg as any).teams) || !(cfg as any).teams.length) {
    state.scores[pid] = newScore;
    return;
  }
  // TEAMS : on applique le score à tous les membres de l'équipe du joueur actif (score partagé)
  const teams: any[] = (cfg as any).teams;
  const team = teams.find((t) => safeTeamPlayers(t).includes(pid));
  if (!team) {
    state.scores[pid] = newScore;
    return;
  }
  for (const memberId of safeTeamPlayers(team)) {
    state.scores[memberId as X01PlayerId] = newScore;
  }
}

// -------------------------------------------------------------
// Helpers internes
// -------------------------------------------------------------

function normalizeConfigV3(input: X01ConfigV3): X01ConfigV3 {
  const anyIn: any = input as any;
  // backward-compat: certains écrans ont longtemps stocké `matchMode`
  const legacyMode = anyIn.matchMode;
  let gameMode: X01ConfigV3["gameMode"] = input.gameMode;

  if (!gameMode) {
    if (legacyMode === "teams") gameMode = "teams";
    else if (Array.isArray((input as any).teams) && (input as any).teams.length >= 2) {
      // Si on a des équipes cohérentes, on considère TEAMS.
      gameMode = "teams";
    } else {
      gameMode = "solo";
    }
  }

  // En mode non-teams, on ignore les équipes pour éviter les états incohérents.
  if (gameMode !== "teams") {
    return { ...input, gameMode, teams: undefined } as any;
  }

  return { ...input, gameMode } as any;
}

function createInitialMatchState(config: X01ConfigV3): X01MatchStateV3 {
  const cfg = normalizeConfigV3(config);
  const scores: Record<string, number> = {};
  const legsWon: Record<string, number> = {};
  const setsWon: Record<string, number> = {};

  for (const p of cfg.players) {
    scores[p.id] = cfg.startScore;
    legsWon[p.id] = 0;
    setsWon[p.id] = 0;
  }

// Teams : init legs/sets gagnés par équipe (évite undefined)
const teamLegsWon: Record<string, number> | undefined =
  cfg.gameMode === "teams" && Array.isArray(cfg.teams)
    ? Object.fromEntries(cfg.teams.map((t) => [t.id, 0]))
    : undefined;

const teamSetsWon: Record<string, number> | undefined =
  cfg.gameMode === "teams" && Array.isArray(cfg.teams)
    ? Object.fromEntries(cfg.teams.map((t) => [t.id, 0]))
    : undefined;

  const throwOrder = generateThrowOrderV3(cfg, null, 1);

  const state: X01MatchStateV3 = {
    matchId: crypto.randomUUID(),
    currentSet: 1,
    currentLeg: 1,
    throwOrder,
    activePlayer: throwOrder[0],
    scores,
    legsWon,
    setsWon,
    teamLegsWon,
    teamSetsWon,
    visit: null as any,
    status: "playing",
  };

  (state as any).lastLegWinnerId = null;
  (state as any).lastWinnerId = null;
  (state as any).lastWinningPlayerId = null;
  (state as any).finishOrder = []; // 👈 ordre des joueurs qui ont VRAIMENT fini à 0

  startNewVisitV3(state);
  if (state.visit) {
    state.visit.checkoutSuggestion = (() => {
  const raw = extAdaptCheckoutSuggestion({
score: state.visit.currentScore,
      dartsLeft: state.visit.dartsLeft,
      outMode: cfg.outMode,
  });
  return filterCheckoutSuggestions(raw, cfg.outMode);
})()
  }

  return state;
}

// ===========================================================
// PATCH STATS COMPLETES X01 (hits/miss/bust/segments/power)
// ===========================================================

function ensureExtendedStatsFor(st: X01StatsLiveV3) {
  // hitsBySegment 1..20 + 25
  if (!st.hitsBySegment) {
    st.hitsBySegment = {};
    for (let i = 1; i <= 20; i++) {
      st.hitsBySegment[i] = { S: 0, D: 0, T: 0 };
    }
    st.hitsBySegment[25] = { S: 0, D: 0, T: 0 };
  }

  if (st.hitsSingle == null) st.hitsSingle = 0;
  if (st.hitsDouble == null) st.hitsDouble = 0;
  if (st.hitsTriple == null) st.hitsTriple = 0;
  if (st.miss == null) st.miss = 0;
  if (st.bust == null) st.bust = 0;

  // Bulls
  if ((st as any).bull == null) (st as any).bull = 0;
  if ((st as any).dBull == null) (st as any).dBull = 0;

  // Power scoring (par volée)
  if ((st as any).h60 == null) (st as any).h60 = 0;
  if ((st as any).h100 == null) (st as any).h100 = 0;
  if ((st as any).h140 == null) (st as any).h140 = 0;
  if ((st as any).h180 == null) (st as any).h180 = 0;

  // Checkout
  if ((st as any).bestCheckout == null) (st as any).bestCheckout = 0;

  if (st.totalScore == null) st.totalScore = 0;
  if (st.visits == null) st.visits = 0;

  if (!st.scorePerVisit) st.scorePerVisit = [];
  if (!st.dartsDetail) st.dartsDetail = [];
}

function recordDartOn(st: X01StatsLiveV3, v: number, m: number) {
  // On conserve le détail pour l'UI (dernières fléchettes, overlay, etc.)
  st.dartsDetail!.push({ v, m });

  // MISS : applyVisitToLiveStatsV3 maintient des compteurs legacy (missCount/bustCount).
  // Mais toute la pipeline "Stats par fléchettes" lit st.miss / st.bust via buildAggregatedStats.
  // Donc on incrémente st.miss ici pour que les KPIs et le tableau ne restent pas vides.
  if (v === 0 || m === 0) {
    st.miss = (st.miss || 0) + 1;
    return;
  }

  // Compteurs S / D / T (utilisés par finalizeStatsFor)
  if (m === 1) st.hitsSingle!++;
  if (m === 2) st.hitsDouble!++;
  if (m === 3) st.hitsTriple!++;

  // Bulls (info utile côté UI)
  if (v === 25) {
    (st as any).bull = ((st as any).bull || 0) + 1;
    if (m === 2) (st as any).dBull = ((st as any).dBull || 0) + 1;
  }

  // hitsBySegment (détail S/D/T par segment)
  const bucket =
    st.hitsBySegment![v] ??
    (st.hitsBySegment![v] = { S: 0, D: 0, T: 0 });

  if (m === 1) bucket.S++;
  if (m === 2) bucket.D++;
  if (m === 3) bucket.T++;
}

function recordVisitOn(
  st: X01StatsLiveV3,
  darts: Array<{ v: number; m: number }>,
  wasBust: boolean
) {
  let total = 0;

  for (const d of darts) {
    recordDartOn(st, d.v, d.m);
    total += d.v * d.m;
  }

  // Score de la volée (pour power scoring) : 0 si bust
  const visitScore = wasBust ? 0 : total;

  // Bust KPI (utilisé dans buildAggregatedStats)
  if (wasBust) {
    st.bust = (st.bust || 0) + 1;
  }

  if (visitScore >= 180) {
    (st as any).h180 = ((st as any).h180 || 0) + 1;
  } else if (visitScore >= 140) {
    (st as any).h140 = ((st as any).h140 || 0) + 1;
  } else if (visitScore >= 100) {
    (st as any).h100 = ((st as any).h100 || 0) + 1;
  } else if (visitScore >= 60) {
    (st as any).h60 = ((st as any).h60 || 0) + 1;
  }

  st.scorePerVisit!.push(visitScore);
}


function finalizeStatsFor(st: X01StatsLiveV3) {
  const totalDarts =
    (st.hitsSingle || 0) +
    (st.hitsDouble || 0) +
    (st.hitsTriple || 0) +
    (st.miss || 0);

  st.pctMiss = totalDarts > 0 ? ((st.miss || 0) / totalDarts) * 100 : 0;

  const totalHits =
    (st.hitsSingle || 0) + (st.hitsDouble || 0) + (st.hitsTriple || 0);

  st.pctS =
    totalHits > 0 ? ((st.hitsSingle || 0) / totalHits) * 100 : 0;
  st.pctD =
    totalHits > 0 ? ((st.hitsDouble || 0) / totalHits) * 100 : 0;
  st.pctT =
    totalHits > 0 ? ((st.hitsTriple || 0) / totalHits) * 100 : 0;
}

// ===========================================================
// AGRÉGATION MATCH : summary.detailedByPlayer + rankings
// ===========================================================

function buildAggregatedStats(
  live: Record<X01PlayerId, X01StatsLiveV3> | undefined
) {
  const out: Record<
    X01PlayerId,
    {
      darts: number;
      avg3: number;
      totalScore: number;
      bestVisit: number;
      bestCheckout: number;
      hits: { S: number; D: number; T: number; M: number };
      hitsBySegment: NonNullable<X01StatsLiveV3["hitsBySegment"]>;
      scorePerVisit: number[];

      // Champs étendus exposés dans detailedByPlayer
      miss: number;
      bust: number;
      bull: number;
      dBull: number;
      h60: number;
      h100: number;
      h140: number;
      h180: number;
    }
  > = {} as any;

  if (!live) return out;

  for (const pid of Object.keys(live) as X01PlayerId[]) {
    const st = live[pid];
    if (!st) continue;

    const dartsCount =
      st.dartsThrown ||
      ((st.hitsSingle || 0) +
        (st.hitsDouble || 0) +
        (st.hitsTriple || 0) +
        (st.miss || 0) +
        ((st as any).bull || 0));

    const totalScore = st.totalScore || 0;
    const avg3 = dartsCount > 0 ? (totalScore / dartsCount) * 3 : 0;
    const bestVisit = Math.max(...(st.scorePerVisit || [0]));
    const bestCheckout = (st as any).bestCheckout || 0;

    out[pid] = {
      darts: dartsCount,
      avg3,
      totalScore,
      bestVisit,
      bestCheckout,
      hits: {
        S: st.hitsSingle || 0,
        D: st.hitsDouble || 0,
        T: st.hitsTriple || 0,
        M: st.miss || 0,
      },
      hitsBySegment: st.hitsBySegment || {},
      scorePerVisit: st.scorePerVisit || [],

      // champs étendus
      miss: st.miss || 0,
      bust: st.bust || 0,
      bull: (st as any).bull || 0,
      dBull: (st as any).dBull || 0,
      h60: (st as any).h60 || 0,
      h100: (st as any).h100 || 0,
      h140: (st as any).h140 || 0,
      h180: (st as any).h180 || 0,
    };
  }

  return out;
}

// ===========================================================
// REBUILD MATCH COMPLET DEPUIS L'HISTORIQUE DES DARTS (pour UI)
// ===========================================================

type X01ReplayHistoryDart = {
  v: number;
  m: number;
  p?: X01PlayerId | string | null;
};

function normalizeReplayThrowOrder(
  config: X01ConfigV3,
  darts: X01ReplayHistoryDart[],
  preferredOrder?: X01PlayerId[]
): X01PlayerId[] {
  const validIds = new Set((config.players || []).map((p: any) => String(p.id)));
  const firstReplayOrder: X01PlayerId[] = [];

  const pushUnique = (target: X01PlayerId[], id: any) => {
    const pid = String(id || "").trim();
    if (!pid || !validIds.has(pid) || target.includes(pid as X01PlayerId)) return;
    target.push(pid as X01PlayerId);
  };

  (darts || []).forEach((d: any) => pushUnique(firstReplayOrder, d?.p));

  const preferred = (preferredOrder || []).filter((id: any) => validIds.has(String(id))) as X01PlayerId[];
  const preferredMatchesReplay =
    firstReplayOrder.length > 0 &&
    firstReplayOrder.every((pid, idx) => String(preferred[idx] || "") === String(pid));

  const out: X01PlayerId[] = [];
  const push = (id: any) => pushUnique(out, id);

  // Si l'ordre moteur courant concorde avec les premières volées du replay,
  // on le garde : c'est le meilleur cas pour ANNULER en live.
  // Sinon, on fait confiance à l'ordre réellement observé dans les fléchettes
  // rejouées : c'est le meilleur cas après reprise/import/autosave.
  if (preferredMatchesReplay || !firstReplayOrder.length) {
    preferred.forEach(push);
    firstReplayOrder.forEach(push);
  } else {
    firstReplayOrder.forEach(push);
    preferred.forEach(push);
  }

  // Dernier filet de sécurité : ordre initial généré par la config.
  try {
    generateThrowOrderV3(config, null, 1).forEach(push);
  } catch {}

  (config.players || []).forEach((p: any) => push(p?.id));
  return out;
}

function refreshRebuildVisitCheckoutSuggestion(
  config: X01ConfigV3,
  state: X01MatchStateV3
) {
  if (!state.visit) return;
  state.visit.checkoutSuggestion = (() => {
    const raw = extAdaptCheckoutSuggestion({
      score: state.visit!.currentScore,
      dartsLeft: state.visit!.dartsLeft,
      outMode: config.outMode,
    });
    return filterCheckoutSuggestions(raw, config.outMode);
  })();
}

function forceReplayActivePlayer(
  config: X01ConfigV3,
  state: X01MatchStateV3,
  pid: X01PlayerId | string | null | undefined
) {
  const nextPid = String(pid || "").trim() as X01PlayerId;
  if (!nextPid) return;
  if (!config.players?.some((p: any) => String(p?.id) === String(nextPid))) return;
  if (String(state.activePlayer || "") === String(nextPid) && state.visit) return;

  state.activePlayer = nextPid;
  startNewVisitV3(state);
  refreshRebuildVisitCheckoutSuggestion(config, state);
}

function rebuildMatchFromHistory(
  config: X01ConfigV3,
  darts: X01ReplayHistoryDart[],
  opts?: { matchId?: string; throwOrder?: X01PlayerId[] }
): {
  newState: X01MatchStateV3;
  newLiveStats: Record<X01PlayerId, X01StatsLiveV3>;
} {
  let m = createInitialMatchState(config);

  const replayThrowOrder = normalizeReplayThrowOrder(config, darts, opts?.throwOrder);
  if (replayThrowOrder.length) {
    m.throwOrder = replayThrowOrder as any;
    m.activePlayer = replayThrowOrder[0] as any;
    startNewVisitV3(m);
    refreshRebuildVisitCheckoutSuggestion(config, m);
  }

  // on conserve le même matchId pour l'historique
  if (opts?.matchId) {
    (m as any).matchId = opts.matchId;
  }

  const live: Record<X01PlayerId, X01StatsLiveV3> = {} as any;
  for (const p of config.players) {
    live[p.id] = createEmptyLiveStatsV3();
  }

  for (const d of darts) {
    if (m.status !== "playing") break;

    if (!m.visit) startNewVisitV3(m);

    const explicitPlayerId = String((d as any).p || "").trim() as X01PlayerId;
    if (explicitPlayerId) {
      forceReplayActivePlayer(config, m, explicitPlayerId);
    }

    const input: X01DartInputV3 = {
      segment: d.v,
      multiplier: d.m,
      playerId: explicitPlayerId || undefined,
      pid: explicitPlayerId || undefined,
      profileId: explicitPlayerId || undefined,
    } as X01DartInputV3;

    ensureMultiActivePlayerIsPlayable(config, m);

    const result = applyDartToCurrentPlayerV3(config, m, input);
    const visit = m.visit!;
    const pid = m.activePlayer;

    const visitEnded =
      result.bust || visit.dartsLeft === 0 || result.scoreAfter === 0;

    if (!visitEnded) {
      // checkout adaptatif tant que la visite continue
      if (!result.bust && visit.dartsLeft > 0 && result.scoreAfter > 1) {
        visit.checkoutSuggestion = (() => {
  const raw = extAdaptCheckoutSuggestion({
score: visit.currentScore,
          dartsLeft: visit.dartsLeft,
          outMode: config.outMode,
  });
  return filterCheckoutSuggestions(raw, config.outMode);
})()
      } else {
        visit.checkoutSuggestion = null;
      }
      continue;
    }

    // -------- FIN DE VISITE (stats uniques) --------
    const dartsArr = (visit as any).dartsThrown
      ? (visit as any).dartsThrown.map((dd: any) => ({
          v: dd.value,
          m: dd.mult,
        }))
      : (visit.darts || []).map((dd) => ({
          v: dd.segment,
          m: dd.multiplier,
        }));

    const isCheckout = !result.bust && result.scoreAfter === 0;

    const base = live[pid] ?? createEmptyLiveStatsV3();
    const stPlayer: X01StatsLiveV3 = structuredClone(
      base
    ) as X01StatsLiveV3;

    // Stats live "classiques"
    applyVisitToLiveStatsV3(stPlayer, visit as any, result.bust, isCheckout, config.outMode);

    // Patch étendu : hits/miss/bust/segments + power scoring
    ensureExtendedStatsFor(stPlayer);
    // applyVisitToLiveStatsV3 enregistre déjà la volée, les hits, le bust,
    // scorePerVisit et les tranches 60+/100+/140+/180. Ne pas doubler ici.
    finalizeStatsFor(stPlayer);

    live[pid] = stPlayer;
    (m as any).liveStatsByPlayer = live;

    // ======================================================
    // MULTI FFA "continuer le classement" pendant un REBUILD
    // Même règle que le live : uniquement si multiFinishMode === "continue_ranking".
    // Sinon, stop_on_first doit tomber dans le flux classique leg/set/match_end.
    // ======================================================
    const isMultiFFARebuild =
      isMultiContinueMode(config) && (config.players?.length ?? 0) > 2;

    if (isMultiFFARebuild) {
      let finishOrder: X01PlayerId[] =
        ((m as any).finishOrder as X01PlayerId[]) || [];
      if (!Array.isArray(finishOrder)) finishOrder = [];

      if (isCheckout && !finishOrder.includes(pid)) {
        finishOrder.push(pid);
      }

      (m as any).finishOrder = finishOrder;

      const totalPlayers = config.players.length;
      const finishedCount = finishOrder.length;
      const shouldContinueLeg =
        !isCheckout || finishedCount <= totalPlayers - 2;

      if (shouldContinueLeg) {
        const nextId = getNextPlayableMultiPlayer(config, m, pid);
        if (nextId) {
          m.activePlayer = nextId;
        }
        startNewVisitV3(m);
        ensureMultiActivePlayerIsPlayable(config, m);
        if (m.visit) {
          m.visit.checkoutSuggestion = (() => {
            const raw = extAdaptCheckoutSuggestion({
              score: m.visit.currentScore,
              dartsLeft: m.visit.dartsLeft,
              outMode: config.outMode,
            });
            return filterCheckoutSuggestions(raw, config.outMode);
          })();
        }
        m.status = "playing";
        continue;
      }

      // L'avant-dernier joueur vient de finir : on termine immédiatement le match
      // avec le classement FFA réel, sans passer par checkLegWinV3 qui prendrait
      // le premier score à 0 dans l'ordre des joueurs au lieu de l'ordre d'arrivée.
      if (finalizeMultiContinueMatch(config, m)) {
        break;
      }
    }

    // ---------- Fin de leg / set / match ----------
    const legWinner = checkLegWinV3(config, m);
    if (legWinner) {
      // Agrégation des stats live -> summary.detailedByPlayer
      const aggregated = buildAggregatedStats(
        (m as any).liveStatsByPlayer as Record<X01PlayerId, X01StatsLiveV3>
      );

      const bestCheckoutByPlayer: Record<string, number> = {};
      for (const pId of Object.keys(aggregated)) {
        const bc = aggregated[pId].bestCheckout || 0;
        if (bc > 0) bestCheckoutByPlayer[pId] = bc;
      }

      (m as any).summary = {
        ...(m as any).summary,
        detailedByPlayer: aggregated,
        bestCheckoutByPlayer,
      };

      applyLegWinV3(config, m, legWinner);

      if (legWinner.winnerPlayerId) {
        (m as any).lastLegWinnerId = legWinner.winnerPlayerId;
        (m as any).lastWinnerId = legWinner.winnerPlayerId;
        (m as any).lastWinningPlayerId = legWinner.winnerPlayerId;
      }

      const setWinner = checkSetWinV3(config, m);
      if (setWinner) {
        applySetWinV3(config, m, setWinner);

        if (checkMatchWinV3(config, m)) {
          // ========= FIN DE MATCH =========
          const rankings = [...config.players].map((p) => {
            const pid2 = p.id as X01PlayerId;
            const legs = m.legsWon[pid2] ?? 0;
            const sets = m.setsWon[pid2] ?? 0;
            return {
              id: pid2,
              name: p.name,
              legsWon: legs,
              setsWon: sets,
              score: sets || legs || 0,
            };
          });

          rankings.sort((a, b) => {
            if (b.setsWon !== a.setsWon) return b.setsWon - a.setsWon;
            if (b.legsWon !== a.legsWon) return b.legsWon - a.legsWon;
            return 0;
          });

          const summaryAny: any = (m as any).summary || {};

          (m as any).summary = {
            ...summaryAny,
            game: {
              ...(summaryAny.game || {}),
              mode: "x01",
              startScore: config.startScore,
              legsPerSet: config.legsPerSet ?? null,
              setsToWin: config.setsToWin ?? null,
            },
            rankings,
            winnerName:
              summaryAny.winnerName ??
              (m as any).winnerName ??
              (rankings[0]?.name ?? null),
          };

          m.status = "match_end";
          break;
        }

        m.status = "set_end";
      } else {
        m.status = "leg_end";
      }

      // si leg_end / set_end, on arrête de rejouer (comme en live)
      break;
    }

    // Joueur suivant
    m.activePlayer = getNextPlayerV3(m);

    startNewVisitV3(m);
    if (m.visit) {
      m.visit.checkoutSuggestion = (() => {
  const raw = extAdaptCheckoutSuggestion({
score: m.visit.currentScore,
        dartsLeft: m.visit.dartsLeft,
        outMode: config.outMode,
  });
  return filterCheckoutSuggestions(raw, config.outMode);
})()
    }
  }

  return { newState: m, newLiveStats: live };
}

// -------------------------------------------------------------
// Helper : passer à la manche / au set suivant
// -------------------------------------------------------------


// -------------------------------------------------------------
// MULTI FFA "continuer" : trouver le prochain joueur réellement jouable
// -------------------------------------------------------------
function getNextPlayableMultiPlayer(
  config: X01ConfigV3,
  state: X01MatchStateV3,
  fromPid?: X01PlayerId
): X01PlayerId | null {
  if (!isMultiContinueMode(config) || (config.players?.length ?? 0) <= 2) {
    return null;
  }

  const rawOrder: X01PlayerId[] = Array.isArray(state.throwOrder)
    ? ([...state.throwOrder] as X01PlayerId[])
    : [];

  for (const p of config.players ?? []) {
    const pid = p.id as X01PlayerId;
    if (!rawOrder.includes(pid)) rawOrder.push(pid);
  }

  if (!rawOrder.length) return null;

  const finishOrder: X01PlayerId[] = Array.isArray((state as any).finishOrder)
    ? ([...(state as any).finishOrder] as X01PlayerId[])
    : [];

  const startIdx = fromPid ? rawOrder.indexOf(fromPid) : rawOrder.indexOf(state.activePlayer);
  const baseIdx = startIdx >= 0 ? startIdx : -1;

  for (let i = 1; i <= rawOrder.length; i++) {
    const candidateId = rawOrder[(baseIdx + i + rawOrder.length) % rawOrder.length] as X01PlayerId;
    const candidateScore = state.scores?.[candidateId] ?? 0;
    const candidateFinished = finishOrder.includes(candidateId) || candidateScore <= 0;

    if (!candidateFinished && candidateScore > 0) {
      return candidateId;
    }
  }

  return null;
}

function refreshVisitCheckoutSuggestion(
  config: X01ConfigV3,
  state: X01MatchStateV3
) {
  if (!state.visit) return;
  state.visit.checkoutSuggestion = (() => {
    const raw = extAdaptCheckoutSuggestion({
      score: state.visit!.currentScore,
      dartsLeft: state.visit!.dartsLeft,
      outMode: config.outMode,
    });
    return filterCheckoutSuggestions(raw, config.outMode);
  })();
}

function ensureMultiActivePlayerIsPlayable(
  config: X01ConfigV3,
  state: X01MatchStateV3
): boolean {
  if (!isMultiContinueMode(config) || (config.players?.length ?? 0) <= 2) {
    return false;
  }

  const finishOrder: X01PlayerId[] = Array.isArray((state as any).finishOrder)
    ? ((state as any).finishOrder as X01PlayerId[])
    : [];

  const active = state.activePlayer as X01PlayerId;
  const activeScore = state.scores?.[active] ?? 0;
  const activeAlreadyFinished = finishOrder.includes(active) || activeScore <= 0;

  if (!activeAlreadyFinished) return false;

  const nextPlayable = getNextPlayableMultiPlayer(config, state, active);
  if (!nextPlayable || nextPlayable === active) return false;

  state.activePlayer = nextPlayable;
  startNewVisitV3(state);
  refreshVisitCheckoutSuggestion(config, state);
  state.status = "playing";
  return true;
}


function buildMultiContinueFinalScores(
  config: X01ConfigV3,
  state: X01MatchStateV3
): Record<string, number> {
  const out: Record<string, number> = {};
  const startScore = Number((config as any).startScore ?? 501) || 501;
  for (const p of config.players || []) {
    const pid = String((p as any)?.id || "");
    if (!pid) continue;
    const raw = Number((state.scores as any)?.[pid]);
    out[pid] = Number.isFinite(raw) ? Math.max(0, raw) : startScore;
  }
  return out;
}

function buildMultiContinueRankings(
  config: X01ConfigV3,
  state: X01MatchStateV3
): Array<{
  id: X01PlayerId;
  name: string;
  rank: number;
  position: number;
  finalRank: number;
  legsWon: number;
  setsWon: number;
  score: number;
  remaining: number;
  finalScore: number;
  scoreRemaining: number;
}> {
  const finalScores = buildMultiContinueFinalScores(config, state);
  const validIds = new Set((config.players || []).map((p: any) => String(p?.id || "")).filter(Boolean));
  const finishOrderRaw: X01PlayerId[] = Array.isArray((state as any).finishOrder)
    ? ((state as any).finishOrder as X01PlayerId[])
    : [];

  const orderedIds: X01PlayerId[] = [];
  for (const raw of finishOrderRaw) {
    const pid = String(raw || "") as X01PlayerId;
    if (!pid || !validIds.has(pid) || orderedIds.includes(pid)) continue;
    orderedIds.push(pid);
  }

  const remainingIds = (config.players || [])
    .map((p: any) => String(p?.id || "") as X01PlayerId)
    .filter((pid) => pid && !orderedIds.includes(pid))
    .sort((a, b) => {
      const sa = Number(finalScores[a]);
      const sb = Number(finalScores[b]);
      if (Number.isFinite(sa) && Number.isFinite(sb) && sa !== sb) return sa - sb;
      return 0;
    });

  orderedIds.push(...remainingIds);

  return orderedIds.map((pid, idx) => {
    const player = (config.players || []).find((p: any) => String(p?.id || "") === String(pid));
    const remaining = Math.max(0, Number(finalScores[pid] ?? 0) || 0);
    return {
      id: pid,
      name: String((player as any)?.name || pid),
      rank: idx + 1,
      position: idx + 1,
      finalRank: idx + 1,
      // En mode FFA continuer, le classement est l'ordre d'arrivée.
      // On garde 1 leg / 1 set seulement au premier pour compat score match.
      legsWon: idx === 0 ? 1 : 0,
      setsWon: idx === 0 ? 1 : 0,
      // IMPORTANT: score = score restant final, pas score de classement.
      score: remaining,
      remaining,
      finalScore: remaining,
      scoreRemaining: remaining,
    };
  });
}

function finalizeMultiContinueMatch(
  config: X01ConfigV3,
  state: X01MatchStateV3
): boolean {
  if (!isMultiContinueMode(config) || (config.players?.length ?? 0) <= 2) return false;

  const finishOrder: X01PlayerId[] = Array.isArray((state as any).finishOrder)
    ? ([...(state as any).finishOrder] as X01PlayerId[])
    : [];
  if (!finishOrder.length) return false;

  const rankings = buildMultiContinueRankings(config, state);
  const winnerId = rankings[0]?.id ?? finishOrder[0] ?? null;
  const winnerName = rankings[0]?.name ?? null;
  const finalScores = buildMultiContinueFinalScores(config, state);

  const aggregated = buildAggregatedStats(
    (state as any).liveStatsByPlayer as Record<X01PlayerId, X01StatsLiveV3>
  );
  const bestCheckoutByPlayer: Record<string, number> = {};
  for (const pId of Object.keys(aggregated)) {
    const bc = aggregated[pId as X01PlayerId]?.bestCheckout || 0;
    if (bc > 0) bestCheckoutByPlayer[pId] = bc;
  }

  state.legsWon = state.legsWon || ({} as any);
  state.setsWon = state.setsWon || ({} as any);
  if (winnerId) {
    for (const p of config.players || []) {
      const pid = String((p as any)?.id || "") as X01PlayerId;
      if (!pid) continue;
      state.legsWon[pid] = pid === winnerId ? 1 : 0;
      state.setsWon[pid] = pid === winnerId ? 1 : 0;
    }
  }

  const summaryAny: any = (state as any).summary || {};
  (state as any).summary = {
    ...summaryAny,
    detailedByPlayer: Object.keys(aggregated).length ? aggregated : summaryAny.detailedByPlayer,
    bestCheckoutByPlayer: Object.keys(bestCheckoutByPlayer).length ? bestCheckoutByPlayer : summaryAny.bestCheckoutByPlayer,
    game: {
      ...(summaryAny.game || {}),
      mode: "x01",
      startScore: config.startScore,
      legsPerSet: config.legsPerSet ?? null,
      setsToWin: config.setsToWin ?? null,
      multiFinishMode: (config as any).multiFinishMode ?? null,
    },
    rankings,
    winnerId,
    winnerName,
    finalScores,
    remainingScores: finalScores,
    scores: finalScores,
    finishOrder: [...finishOrder],
    finished: true,
  };

  (state as any).lastLegWinnerId = winnerId;
  (state as any).lastWinnerId = winnerId;
  (state as any).lastWinningPlayerId = winnerId;
  (state as any).winnerId = winnerId;
  state.status = "match_end";
  return true;
}

function goToNextLeg(
  prev: X01MatchStateV3,
  config: X01ConfigV3
): X01MatchStateV3 {
  const next: any = { ...prev };

  const startScore = (config as any).startScore ?? 501;
  const legsPerSet = (config as any).legsPerSet ?? 1;
  const setsToWin = (config as any).setsToWin ?? 1;

  const playerIds: X01PlayerId[] = (config.players ?? []).map(
    (p: any) => p.id as X01PlayerId
  );

  // --- reset des scores pour tous les joueurs ---
  const newScores: Record<X01PlayerId, number> = {} as any;
  for (const pid of playerIds) {
    newScores[pid] = startScore;
  }
  next.scores = newScores;

  // --- reset visite / statut ---
  next.visit = null;
  next.status = "playing";
  next.finishOrder = []; // reset ordre d'arrivée pour la nouvelle manche

  const curLeg = (prev as any).currentLeg ?? 1;
  const curSet = (prev as any).currentSet ?? 1;

  if (prev.status === "set_end") {
    // 👉 nouveau set
    const nextSet = Math.min(curSet + 1, setsToWin);
    next.currentSet = nextSet;
    next.currentLeg = 1;

    // les sets sont déjà incrémentés par le moteur à la fin du set
    // ici on remet simplement les legs de ce nouveau set à 0
    const legsWonPrev = ((prev as any).legsWon ?? {}) as Record<
      string,
      number
    >;
    const legsWonNew: Record<string, number> = {};
    for (const pid of playerIds) {
      legsWonNew[pid] =
        legsWonPrev[pid] && nextSet === curSet + 1 ? 0 : legsWonPrev[pid] ?? 0;
    }
    next.legsWon = legsWonNew;
  } else {
    // 👉 manche suivante dans le même set
    const nextLeg = Math.min(curLeg + 1, legsPerSet);
    next.currentSet = curSet;
    next.currentLeg = nextLeg;
  }

  // -------------------------------------------------------------
  // ✅ SERVICE / ORDRE DE DÉPART (legs)
  // Alterné strict: starter dépend UNIQUEMENT de l'index de leg (set/leg),
  // jamais du vainqueur ni de l'ordre temporaire en cours de visite.
  // -------------------------------------------------------------
  try {
    const rawMode = (config as any).serveMode;
    const mode = String(rawMode ?? "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
    const isAlternate =
      mode === "alternate" || mode === "alterne" || mode.includes("altern");
    const isRandom =
      mode === "random" || mode === "aleatoire" || mode.includes("random") || mode.includes("alea");

    const baseOrder: X01PlayerId[] =
      Array.isArray((prev as any)._baseThrowOrder) && (prev as any)._baseThrowOrder.length
        ? ((prev as any)._baseThrowOrder as X01PlayerId[])
        : (Array.isArray(prev.throwOrder) && prev.throwOrder.length
            ? (prev.throwOrder as X01PlayerId[])
            : playerIds);

    const n = baseOrder.length || 1;

    // index global du prochain départ (0-based)
    const nextSetIdx = (next.currentSet ?? 1) - 1;
    const nextLegIdx = (next.currentLeg ?? 1) - 1;
    const globalLegIndex = nextSetIdx * legsPerSet + nextLegIdx;

    if (isAlternate || isRandom) {
      const starterOffset = ((globalLegIndex % n) + n) % n;
      next.throwOrder = baseOrder
        .slice(starterOffset)
        .concat(baseOrder.slice(0, starterOffset));
      next.activePlayer = next.throwOrder[0];
      (next as any)._baseThrowOrder = baseOrder;
    } else {
      // fallback: on garde l'ordre existant mais on repart du 1er joueur de l'ordre
      const order = Array.isArray(prev.throwOrder) ? prev.throwOrder : playerIds;
      next.throwOrder = order as any;
      next.activePlayer = (order && order.length ? order[0] : (prev as any).activePlayer) as any;
      (next as any)._baseThrowOrder = baseOrder;
    }
  } catch {
    // ignore
  }

  // Recrée une visite propre (currentScore cohérent avec next.scores)
  startNewVisitV3(next as any);
  if ((next as any).visit) {
    (next as any).visit.checkoutSuggestion = (() => {
  const raw = extAdaptCheckoutSuggestion({
score: (next as any).visit.currentScore,
      dartsLeft: (next as any).visit.dartsLeft,
      outMode: (config as any).outMode,
  });
  return filterCheckoutSuggestions(raw, (config as any).outMode);
})()
  }



  // ✅ FIX CRASH: il manquait le return → setState(undefined)
  return next as X01MatchStateV3;
}

// -------------------------------------------------------------
// Helper pur : appliquer 1 dart sur (state, liveStats)
// -------------------------------------------------------------

function applyDartWithFlow(
  config: X01ConfigV3,
  prevState: X01MatchStateV3,
  prevLiveStats: Record<X01PlayerId, X01StatsLiveV3>,
  input: X01DartInputV3
): {
  state: X01MatchStateV3;
  liveStats: Record<X01PlayerId, X01StatsLiveV3>;
} {
  const m: X01MatchStateV3 = structuredClone(prevState);
  const liveMap: Record<X01PlayerId, X01StatsLiveV3> =
    structuredClone(prevLiveStats);

  if (m.status !== "playing") {
    return { state: m, liveStats: liveMap };
  }

  if (!m.visit) startNewVisitV3(m);

  // Sécurité MULTI FFA : si un joueur déjà fini revient actif
  // (cas observé après rotation/bust/rebuild), on le saute AVANT
  // d'accepter une nouvelle fléchette.
  ensureMultiActivePlayerIsPlayable(config, m);

  const result = applyDartToCurrentPlayerV3(config, m, input);
  const visit = m.visit!;
  const pid = m.activePlayer;

  const visitEnded =
    result.bust || visit.dartsLeft === 0 || result.scoreAfter === 0;

  if (!visitEnded) {
    // Checkout adaptatif tant que la visite continue
    if (!result.bust && visit.dartsLeft > 0 && result.scoreAfter > 1) {
      visit.checkoutSuggestion = (() => {
  const raw = extAdaptCheckoutSuggestion({
score: visit.currentScore,
        dartsLeft: visit.dartsLeft,
        outMode: config.outMode,
  });
  return filterCheckoutSuggestions(raw, config.outMode);
})()
    } else {
      visit.checkoutSuggestion = null;
    }
    return { state: m, liveStats: liveMap };
  }

  // -------- FIN DE VISITE (stats uniques) --------
  const darts = (visit as any).dartsThrown
    ? (visit as any).dartsThrown.map((d: any) => ({
        v: d.value,
        m: d.mult,
      }))
    : (visit.darts || []).map((d) => ({
        v: d.segment,
        m: d.multiplier,
      }));

  const isCheckout = !result.bust && result.scoreAfter === 0;

  const base = liveMap[pid] ?? createEmptyLiveStatsV3();
  const st: X01StatsLiveV3 = structuredClone(base) as X01StatsLiveV3;

  // Stats live "classiques"
  applyVisitToLiveStatsV3(st, visit as any, result.bust, isCheckout, config.outMode);

  // Patch étendu : hits/miss/bust/segments + power scoring
  ensureExtendedStatsFor(st);
  // applyVisitToLiveStatsV3 enregistre déjà la volée, les hits, le bust,
  // scorePerVisit et les tranches 60+/100+/140+/180. Ne pas doubler ici.
  finalizeStatsFor(st);

  liveMap[pid] = st;
  (m as any).liveStatsByPlayer = liveMap;

  
  // -------------------------------------------------------------
  // 🔥 FIX CRITIQUE BUST (vital en TEAMS)
  // - applyDartToCurrentPlayerV3 fait déjà le rollback, MAIS certains flows/UI
  //   pouvaient repartir avec un score partiel / sans rotation.
  // => On impose ici un rollback autoritaire + rotation + nouvelle visite.
  // -------------------------------------------------------------
  if (result.bust) {
    // 1) rollback autoritaire du score (solo + teams)
    setScoresForPlayerOrTeam(config, m, pid, visit.startingScore);

    // 2) joueur suivant (FIN DE TOUR HARD)
    if (isMultiContinueMode(config) && (config.players?.length ?? 0) > 2) {
      const nextPlayable = getNextPlayableMultiPlayer(config, m, pid);
      m.activePlayer = nextPlayable ?? getNextPlayerV3(m);
    } else {
      m.activePlayer = getNextPlayerV3(m);
    }

    // 3) nouvelle visite propre (évite toute incohérence visit.currentScore vs state.scores)
    startNewVisitV3(m);
    ensureMultiActivePlayerIsPlayable(config, m);
    if (m.visit) {
      m.visit.checkoutSuggestion = (() => {
  const raw = extAdaptCheckoutSuggestion({
score: m.visit.currentScore,
        dartsLeft: m.visit.dartsLeft,
        outMode: config.outMode,
  });
  return filterCheckoutSuggestions(raw, config.outMode);
})()
    }

    m.status = "playing";
    return { state: m, liveStats: liveMap };
  }

// ======================================================
  // 🔥 MODE MULTI "CONTINUER" (Free For All, sans équipes)
  // - On continue tant qu'il reste au moins 2 joueurs non finis
  // - Le dernier garde ses points, ne finit jamais, pas de checkout
  // ======================================================
  const isMultiFFA =
    isMultiContinueMode(config) && (config.players?.length ?? 0) > 2;

  if (isMultiFFA) {
    let finishOrder: X01PlayerId[] =
      ((m as any).finishOrder as X01PlayerId[]) || [];
    if (!Array.isArray(finishOrder)) finishOrder = [];

    // Si le joueur vient de FINIR (scoreAfter = 0 et pas bust),
    // on l'ajoute à l'ordre d'arrivée (sans doublons)
    if (isCheckout && !finishOrder.includes(pid)) {
      finishOrder.push(pid);
    }

    (m as any).finishOrder = finishOrder;

    const totalPlayers = config.players.length;
    const finishedCount = finishOrder.length;

    // Cas 1 : ce n'est PAS un checkout OU il reste >= 2 joueurs non finis
    // => on continue la manche, en sautant les joueurs déjà dans finishOrder
    const shouldContinueLeg =
      !isCheckout || finishedCount <= totalPlayers - 2;

    if (shouldContinueLeg) {
      const nextId = getNextPlayableMultiPlayer(config, m, pid);

      if (nextId) {
        m.activePlayer = nextId;
      }

      startNewVisitV3(m);
      ensureMultiActivePlayerIsPlayable(config, m);
      if (m.visit) {
        m.visit.checkoutSuggestion = (() => {
  const raw = extAdaptCheckoutSuggestion({
score: m.visit.currentScore,
          dartsLeft: m.visit.dartsLeft,
          outMode: config.outMode,
  });
  return filterCheckoutSuggestions(raw, config.outMode);
})()
      }

      m.status = "playing";
      return { state: m, liveStats: liveMap };
    }

    // Cas 2 : on vient de faire finir l'AVANT-DERNIER joueur :
    // - isCheckout === true
    // - finishedCount === totalPlayers - 1
    // => le dernier garde ses points restants et on termine le match maintenant.
    // CRITIQUE : ne pas passer par checkLegWinV3, car plusieurs joueurs sont à 0
    // et checkLegWinV3 choisirait le premier 0 dans l'ordre interne, pas l'ordre d'arrivée.
    if (finalizeMultiContinueMatch(config, m)) {
      return { state: m, liveStats: liveMap };
    }
  }

  // ---------- Fin de leg / set / match ----------
  const legWinner = checkLegWinV3(config, m);
  if (legWinner) {
    // Agrégation des stats live -> summary.detailedByPlayer
    const aggregated = buildAggregatedStats(
      (m as any).liveStatsByPlayer as Record<X01PlayerId, X01StatsLiveV3>
    );

    const bestCheckoutByPlayer: Record<string, number> = {};
    for (const pid2 of Object.keys(aggregated)) {
      const bc = aggregated[pid2].bestCheckout || 0;
      if (bc > 0) bestCheckoutByPlayer[pid2] = bc;
    }

    (m as any).summary = {
      ...(m as any).summary,
      detailedByPlayer: aggregated,
      bestCheckoutByPlayer,
    };

    applyLegWinV3(config, m, legWinner);

    if (legWinner.winnerPlayerId) {
      (m as any).lastLegWinnerId = legWinner.winnerPlayerId;
      (m as any).lastWinnerId = legWinner.winnerPlayerId;
      (m as any).lastWinningPlayerId = legWinner.winnerPlayerId;
    }

    const setWinner = checkSetWinV3(config, m);
    if (setWinner) {
      applySetWinV3(config, m, setWinner);

      if (checkMatchWinV3(config, m)) {
        // ========= FIN DE MATCH =========

        const isMultiFFAForRank =
          isMultiContinueMode(config) &&
          (config.players?.length ?? 0) > 2 &&
          Array.isArray((m as any).finishOrder) &&
          ((m as any).finishOrder as X01PlayerId[]).length > 0;

        let rankings: Array<{
          id: X01PlayerId;
          name: string;
          legsWon: number;
          setsWon: number;
          score: number;
        }>;

        if (isMultiFFAForRank) {
          // Classement basé sur l'ordre d'arrivée
          const finishOrder = (m as any)
            .finishOrder as X01PlayerId[];

          const orderedIds: X01PlayerId[] = [...finishOrder];

          // On ajoute le / les joueurs qui n'ont JAMAIS fini (dernier / derniers)
          for (const p of config.players) {
            const pid3 = p.id as X01PlayerId;
            if (!orderedIds.includes(pid3)) {
              orderedIds.push(pid3);
            }
          }

          rankings = orderedIds.map((pid3) => {
            const player = config.players.find(
              (p) => p.id === pid3
            );
            const legs = m.legsWon[pid3] ?? 0;
            const sets = m.setsWon[pid3] ?? 0;
            return {
              id: pid3,
              name: player?.name || pid3,
              legsWon: legs,
              setsWon: sets,
              score: sets || legs || 0,
            };
          });
        } else {
          // Classement classique sets/legs
          rankings = [...config.players].map((p) => {
            const pid3 = p.id as X01PlayerId;
            const legs = m.legsWon[pid3] ?? 0;
            const sets = m.setsWon[pid3] ?? 0;
            return {
              id: pid3,
              name: p.name,
              legsWon: legs,
              setsWon: sets,
              score: sets || legs || 0,
            };
          });

          rankings.sort((a, b) => {
            if (b.setsWon !== a.setsWon) return b.setsWon - a.setsWon;
            if (b.legsWon !== a.legsWon) return b.legsWon - a.legsWon;
            return 0;
          });
        }

        const summaryAny: any = (m as any).summary || {};

        (m as any).summary = {
          ...summaryAny,
          game: {
            ...(summaryAny.game || {}),
            mode: "x01",
            startScore: config.startScore,
            legsPerSet: config.legsPerSet ?? null,
            setsToWin: config.setsToWin ?? null,
          },
          rankings,
          winnerName:
            summaryAny.winnerName ??
            (m as any).winnerName ??
            (rankings[0]?.name ?? null),
        };

        m.status = "match_end";
        return { state: m, liveStats: liveMap };
      }

      m.status = "set_end";
      return { state: m, liveStats: liveMap };
    }

    m.status = "leg_end";
    return { state: m, liveStats: liveMap };
  }

  // Joueur suivant (modes classiques OU cas "avant-dernier déjà géré plus haut")
  m.activePlayer = getNextPlayerV3(m);

  startNewVisitV3(m);
  if (m.visit) {
    m.visit.checkoutSuggestion = (() => {
  const raw = extAdaptCheckoutSuggestion({
score: m.visit.currentScore,
      dartsLeft: m.visit.dartsLeft,
      outMode: config.outMode,
  });
  return filterCheckoutSuggestions(raw, config.outMode);
})()
  }

  return { state: m, liveStats: liveMap };
}

// -------------------------------------------------------------
// Hook principal
// -------------------------------------------------------------

export function useX01EngineV3({
  config,
  initialState,
  initialLiveStats,
  historyId,
}: {
  config: X01ConfigV3;
  initialState?: X01MatchStateV3;
  initialLiveStats?: Record<X01PlayerId, X01StatsLiveV3>;
  historyId?: string;
}) {
  const [state, setState] = React.useState<X01MatchStateV3>(() =>
    initialState ? structuredClone(initialState) : createInitialMatchState(config)
  );

  // -----------------------------------------------------------
  // DEV SIM (console) — uniquement si DevMode activé
  // - gated par import.meta.env.DEV dans setX01DevSimEnabled
  // - expose window.__x01Sim.help() / bustTeams33() / bustSolo33()
  // -----------------------------------------------------------
  const dev = useDevMode();
  React.useEffect(() => {
    setX01DevSimEnabled(!!dev.enabled, {
      createInitialMatchState,
      applyDartWithFlow,
      createEmptyLiveStatsV3,
    });
  }, [dev.enabled]);

  // -----------------------------------------------------------
  // ✅ stateRef: évite les doubles appels StrictMode sur setState(updater)
  // On calcule nextState/nextLive UNE seule fois et on commit via setState(nextState).
  // -----------------------------------------------------------
  const stateRef = React.useRef<X01MatchStateV3>(state);
  React.useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const initialLive = React.useMemo(() => {
    if (initialLiveStats) {
      return structuredClone(initialLiveStats);
    }
    const out: Record<X01PlayerId, X01StatsLiveV3> = {};
    for (const p of config.players) {
      out[p.id] = createEmptyLiveStatsV3();
    }
    return out;
  }, [config, initialLiveStats]);

  const [liveStatsByPlayer, setLiveStatsByPlayer] =
    React.useState<Record<X01PlayerId, X01StatsLiveV3>>(initialLive);

  // Ref pour toujours lire la version courante dans les callbacks
  const liveStatsByPlayerRef =
    React.useRef<Record<X01PlayerId, X01StatsLiveV3>>(initialLive);

  React.useEffect(() => {
    liveStatsByPlayerRef.current = liveStatsByPlayer;
  }, [liveStatsByPlayer]);

  // Historique interne de tous les darts saisis (pour rebuildFromDarts).
  // IMPORTANT : on conserve aussi le playerId. Sinon un rebuild après ANNULER
  // réapplique les fléchettes selon un ordre généré et peut attribuer les anciennes
  // volées au mauvais joueur quand le départ était random/alterné.
  const dartsHistoryRef = React.useRef<X01ReplayHistoryDart[]>([]);

  // ===========================================================
  // ✅ AVG3 / mini-stats par LEG uniquement (delta snapshot)
  // - liveStatsByPlayer = cumul match
  // - liveLegStatsByPlayer = delta depuis début de la leg courante
  // ===========================================================
  const legBaseRef = React.useRef<Record<string, any>>({});
  const [liveLegStatsByPlayer, setLiveLegStatsByPlayer] =
    React.useState<Record<X01PlayerId, any>>(structuredClone(initialLive) as any);

  function getTotalDarts(st: any): number {
    if (!st) return 0;
    if (typeof st.dartsThrown === "number") return st.dartsThrown;
    if (typeof st.darts === "number") return st.darts;
    return (
      (st.hitsSingle || 0) +
      (st.hitsDouble || 0) +
      (st.hitsTriple || 0) +
      (st.miss || 0)
    );
  }

  function getTotalVisits(st: any): number {
    if (!st) return 0;
    if (typeof st.visits === "number") return st.visits;
    if (Array.isArray(st.scorePerVisit)) return st.scorePerVisit.length;
    return 0;
  }

  function getTotalScore(st: any): number {
    if (!st) return 0;
    return typeof st.totalScore === "number" ? st.totalScore : 0;
  }

  function snapshotLegBaseFromTotals(totals: Record<string, any>) {
    legBaseRef.current = Object.fromEntries(
      Object.entries(totals || {}).map(([pid, t]: any) => [
        pid,
        {
          darts: getTotalDarts(t),
          visits: getTotalVisits(t),
          totalScore: getTotalScore(t),
          spvLen: (t?.scorePerVisit ?? []).length,
        },
      ])
    );
  }

  function computeLegStats(totals: Record<string, any>) {
    const out: any = {};
    for (const pid of Object.keys(totals || {})) {
      const t = (totals as any)[pid];
      const b = (legBaseRef.current as any)[pid] || {
        darts: 0,
        visits: 0,
        totalScore: 0,
        spvLen: 0,
      };

      const darts = Math.max(0, getTotalDarts(t) - (b.darts ?? 0));
      const visits = Math.max(0, getTotalVisits(t) - (b.visits ?? 0));
      const points = Math.max(0, getTotalScore(t) - (b.totalScore ?? 0));

      out[pid] = {
        ...t,
        dartsThrown: darts,
        visits,
        totalScore: points,
        avg3: visits > 0 ? points / visits : 0, // par volée
        bestVisit: Math.max(0, ...(t?.scorePerVisit ?? []).slice(b.spvLen)),
      };
    }
    return out;
  }

  // Snapshot initial (début match)
  React.useEffect(() => {
    snapshotLegBaseFromTotals(liveStatsByPlayerRef.current as any);
    setLiveLegStatsByPlayer(
      computeLegStats(liveStatsByPlayerRef.current as any)
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  // -----------------------------------------------------------
  // rebuildFromDarts : reconstruit le match depuis une liste
  // de X01DartInputV3 (pour l'UI qui garde son propre historique)
  // -----------------------------------------------------------

  const rebuildFromDarts = React.useCallback(
    (allDarts: X01DartInputV3[]) => {
      // UNDO fiable : on reconstruit l'état complet depuis l'historique UI
      // puis on synchronise IMMÉDIATEMENT les refs moteur. Sans ça, le rendu
      // React peut afficher le bon état, mais le prochain dart repart encore
      // de l'ancien stateRef => scores/joueur actif incohérents après ANNULER.
      const dartsVM: X01ReplayHistoryDart[] = allDarts.map((d: any) => ({
        v: Number(d.segment ?? d.v ?? 0),
        m: Number(d.multiplier ?? d.mult ?? d.m ?? 1),
        p: (d.playerId ?? d.pid ?? d.profileId ?? d.p ?? null) as any,
      }));

      const previousThrowOrder = Array.isArray(stateRef.current?.throwOrder)
        ? ([...(stateRef.current.throwOrder as any)] as X01PlayerId[])
        : undefined;

      dartsHistoryRef.current = dartsVM.slice();

      const { newState, newLiveStats } = rebuildMatchFromHistory(
        config,
        dartsVM,
        { matchId: stateRef.current.matchId, throwOrder: previousThrowOrder }
      );

      stateRef.current = newState;
      liveStatsByPlayerRef.current = newLiveStats;

      setState(newState);
      setLiveStatsByPlayer(newLiveStats);
      setLiveLegStatsByPlayer(computeLegStats(newLiveStats as any));

      return { state: newState, liveStatsByPlayer: newLiveStats };
    },
    [config]
  );

  // -----------------------------------------------------------
  // throwDart : appliqué à CHAQUE fléchette
  // -> setState fonctionnel pour ne jamais utiliser un state figé
  // -----------------------------------------------------------

  const throwDart = React.useCallback(
    (input: X01DartInputV3) => {
      const prevState = stateRef.current;
      const prevLive = liveStatsByPlayerRef.current;

      // Historique brut {v,m,p}. Le playerId est indispensable pour que
      // ANNULER/rebuild n'intervertisse jamais les volées entre joueurs.
      const historyPlayerId = String(
        (input as any)?.playerId ||
          (input as any)?.pid ||
          (input as any)?.profileId ||
          prevState?.activePlayer ||
          ""
      ).trim();
      dartsHistoryRef.current.push({
        v: input.segment,
        m: input.multiplier,
        p: historyPlayerId || null,
      });

      // Calcule UNE seule fois (évite double-exec StrictMode)
      const { state: nextState, liveStats: nextLive } = applyDartWithFlow(
        config,
        prevState,
        prevLive,
        input
      );

      // Commit refs d'abord (pour enchaîner plusieurs darts rapidement)
      stateRef.current = nextState;
      liveStatsByPlayerRef.current = nextLive;

      // Puis commit React state
      setLiveStatsByPlayer(nextLive);
      setLiveLegStatsByPlayer(computeLegStats(nextLive as any));
      setState(nextState);
    },
    [config]
  );

  // -----------------------------------------------------------
  // UNDO illimité : efface le dernier dart, remonte volées/joueurs
  // -----------------------------------------------------------

  const undoLastDart = React.useCallback(() => {
    // UNDO = retirer exactement la dernière fléchette commitée, puis reconstruire
    // tout l'état moteur depuis l'historique restant.
    if (dartsHistoryRef.current.length === 0) return null;

    dartsHistoryRef.current.pop();

    const previousThrowOrder = Array.isArray(stateRef.current?.throwOrder)
      ? ([...(stateRef.current.throwOrder as any)] as X01PlayerId[])
      : undefined;

    const { newState, newLiveStats } = rebuildMatchFromHistory(
      config,
      dartsHistoryRef.current.slice(),
      { matchId: stateRef.current.matchId, throwOrder: previousThrowOrder }
    );

    // Sync refs + React state (évite état "fantôme" au prochain tir)
    stateRef.current = newState;
    liveStatsByPlayerRef.current = newLiveStats;

    setLiveStatsByPlayer(newLiveStats);
    setLiveLegStatsByPlayer(computeLegStats(newLiveStats as any));
    setState(newState);

    // Important pour l'UI : X01PlayV3 peut se resynchroniser immédiatement
    // sur CE nouvel état au lieu d'attendre un rendu React avec un state stale.
    return { state: newState, liveStatsByPlayer: newLiveStats };
  }, [config]);

  // -----------------------------------------------------------
  // startNextLeg
  // -----------------------------------------------------------

  const startNextLeg = React.useCallback(() => {
    // ✅ snapshot début de leg (pour avg/mini-stats leg-only)
    snapshotLegBaseFromTotals(liveStatsByPlayerRef.current as any);

    // nouvelle manche = reset de la manche + reset UNDO / historique
    setState((prev) => goToNextLeg(prev, config));
    setLiveStatsByPlayer((prev) => {
      const clone = structuredClone(prev);
      liveStatsByPlayerRef.current = clone;
      // ✅ la leg repart à 0 après snapshot
      setLiveLegStatsByPlayer(computeLegStats(clone as any));
      return clone;
    });
    dartsHistoryRef.current = [];
  }, [config]);

  // -----------------------------------------------------------
  // Autosave → History (in_progress / finished)
  // -----------------------------------------------------------

  React.useEffect(() => {
    try {
      // on ne logge que les matchs X01 locaux
      const playersLite: PlayerLite[] = config.players.map((p: any) => ({
        id: p.id,
        name: p.name,
        avatarDataUrl: p.avatarDataUrl ?? null,
        // ✅ important pour StatsHub (liaison avec profils)
        profileId: (p as any).profileId ?? null,
      }) as any);


      const summary: any = (state as any).summary || {};
      const finished = state.status === "match_end";
      summary.finished = finished;

      const rec: SavedMatch = {
        id: historyId || state.matchId,
        kind: "x01",
        status: finished ? "finished" : "in_progress",
        players: playersLite,
        winnerId: (state as any).lastWinnerId ?? null,
        game: {
          mode: "x01",
          startScore: config.startScore,
        },
        summary,
        // payload complet pour reprise : config + state + stats live
        payload: {
          config,
          state,
          liveStatsByPlayer,
        },
      };

      // on ne bloque pas le rendu, pas d'await
      History.upsert(rec);
    } catch (e) {
      console.warn("[useX01EngineV3] autosave history error:", e);
    }
    // config est constant sur la durée du hook
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, liveStatsByPlayer]);

  // -----------------------------------------------------------
  // Exposition
  // -----------------------------------------------------------

  const getCurrentEngineState = React.useCallback(() => stateRef.current, []);

  return {
    state,
    liveStatsByPlayer,
    liveLegStatsByPlayer,
    activePlayerId: state.activePlayer,
    scores: state.scores,
    status: state.status,
    throwDart,
    undoLastDart,     // 👉 à brancher sur la touche ANNULER du keypad
    rebuildFromDarts, // 👉 si tu veux reconstruire depuis un historique externe
    getCurrentEngineState, // ✅ sync UI depuis la ref moteur fraîche (pas le state React stale)
    startNextLeg,
  };
}