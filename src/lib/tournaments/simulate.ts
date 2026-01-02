// @ts-nocheck
// ============================================
// src/lib/tournaments/simulate.ts
// Simulateur tournoi (LOCAL)
// - simulateMatchById : force un résultat (winner au hasard si non fourni)
// - simulateNextPlayable : simule 1 match jouable (pending + 2 joueurs)
// - simulateAllUntilDone : simule tout le tournoi jusqu’à terminé
//
// Dépendances : engine.ts exports getPlayableMatches, submitResult
// ============================================

import type { Tournament, TournamentMatch } from "./types";
import { getPlayableMatches, submitResult } from "./engine";

function rndInt(max: number) {
  return (Math.random() * max) | 0;
}

function pickWinnerId(m: TournamentMatch) {
  const a = String(m.aPlayerId || "");
  const b = String(m.bPlayerId || "");
  if (!a || !b) return "";
  return rndInt(2) === 0 ? a : b;
}

export function simulateMatchById(opts: {
  tournament: Tournament;
  matches: TournamentMatch[];
  matchId: string;
  winnerId?: string | null; // optionnel
  historyMatchId?: string | null; // optionnel (si tu veux lier à History)
}) {
  const ms = Array.isArray(opts.matches) ? opts.matches : [];
  const m = ms.find((x) => String(x.id) === String(opts.matchId));
  if (!m) return { tournament: opts.tournament, matches: opts.matches, did: false };

  const forced = String(opts.winnerId || "").trim();
  const winnerId = forced || pickWinnerId(m);
  if (!winnerId) return { tournament: opts.tournament, matches: opts.matches, did: false };

  const next = submitResult({
    tournament: opts.tournament,
    matches: opts.matches,
    matchId: String(opts.matchId),
    winnerId,
    historyMatchId: opts.historyMatchId ?? null,
  });

  return { ...next, did: true, winnerId };
}

export function simulateNextPlayable(opts: {
  tournament: Tournament;
  matches: TournamentMatch[];
  historyMatchId?: string | null;
}) {
  const playable = getPlayableMatches(opts.tournament, opts.matches);
  if (!playable.length) return { tournament: opts.tournament, matches: opts.matches, did: false };

  // petit hasard : on prend un match jouable random
  const m = playable[rndInt(playable.length)];
  return simulateMatchById({
    tournament: opts.tournament,
    matches: opts.matches,
    matchId: String(m.id),
    historyMatchId: opts.historyMatchId ?? null,
  });
}

export function simulateAllUntilDone(opts: {
  tournament: Tournament;
  matches: TournamentMatch[];
  maxSteps?: number; // sécurité
  historyMatchIdFactory?: ((m: TournamentMatch, step: number) => string | null) | null;
}) {
  let t = opts.tournament;
  let ms = opts.matches;

  const limit = Math.max(10, Number(opts.maxSteps || 5000));
  for (let step = 0; step < limit; step++) {
    const playable = getPlayableMatches(t, ms);
    if (!playable.length) break;

    const m = playable[rndInt(playable.length)];
    const historyMatchId =
      typeof opts.historyMatchIdFactory === "function" ? opts.historyMatchIdFactory(m, step) : null;

    const res = simulateMatchById({
      tournament: t,
      matches: ms,
      matchId: String(m.id),
      historyMatchId,
    });

    t = res.tournament;
    ms = res.matches;

    // si terminé → stop
    if (String(t.status) === "finished") break;
  }

  return { tournament: t, matches: ms };
}
