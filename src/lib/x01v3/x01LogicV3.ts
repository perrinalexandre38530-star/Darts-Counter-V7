// =======================================================
// src/lib/x01v3/x01LogicV3.ts
// Logique de base X01 V3 : score, bust, visits, dartsLeft
// - Calcul du score d'une fléchette
// - Application à la visite en cours
// - Gestion bust (simple / double / master-out)
// - Respect du nombre de fléchettes restantes
// - Préparation pour le moteur / UI / stats
// =======================================================

import type {
  X01ConfigV3,
  X01MatchStateV3,
  X01VisitStateV3,
  X01DartV3,
  X01OutMode,
} from "../../types/x01v3";

import {
  getAdaptiveCheckoutSuggestionV3,
  type X01OutModeV3,
} from "./x01CheckoutV3";

// Compat: certains configs ont utilisé `playerIds` au lieu de `players`.
const teamPlayers = (t: any): string[] => {
  if (Array.isArray(t?.players)) return t.players;
  if (Array.isArray(t?.playerIds)) return t.playerIds;
  return [];
};

/* -------------------------------------------------------
   Mode MULTI "Free For All" (sans équipes)
   => utilisé pour le comportement "Continuer" en X01V3
------------------------------------------------------- */
export function isMultiContinueMode(config: X01ConfigV3): boolean {
  // MULTI FFA ne doit continuer APRES le 1er checkout que si l'option
  // explicite de configuration est active.
  // Avant, gameMode === "multi" suffisait : du coup "Terminer la partie"
  // continuait quand même et les joueurs déjà à 0 pouvaient revenir dans le tour.
  return (
    config.gameMode === "multi" &&
    !config.teams &&
    (config as any).multiFinishMode === "continue_ranking"
  );
}

/* -------------------------------------------------------
   Helpers TEAMS : synchroniser le score de toute l'équipe
   - On conserve state.scores[pid] pour l'UI/stats existants
   - En mode teams : tous les joueurs d'une team partagent le même score
------------------------------------------------------- */
function setScoreForActiveV3(config: X01ConfigV3, state: X01MatchStateV3, newScore: number) {
  const pid = state.activePlayer;
  // fallback solo/multi
  if (config.gameMode !== "teams" || !Array.isArray(config.teams) || !config.teams.length) {
    state.scores[pid] = newScore;
    return;
  }

  const team = config.teams.find((t: any) => teamPlayers(t).includes(pid));
  if (!team) {
    state.scores[pid] = newScore;
    return;
  }

  for (const memberId of teamPlayers(team)) {
    state.scores[memberId] = newScore;
  }
}

/* -------------------------------------------------------
   Type d'entrée depuis le Keypad
------------------------------------------------------- */
export interface X01DartInputV3 {
  segment: number | 25; // 1-20, 25 pour bull
  multiplier: 0 | 1 | 2 | 3; // 0=miss, 1=S, 2=D, 3=T
}

/* -------------------------------------------------------
   Résultat d'un lancer
------------------------------------------------------- */
export interface X01DartResultV3 {
  dart: X01DartV3;
  scoreBefore: number;
  scoreAfter: number;
  bust: boolean;
  finishingAttempt: boolean;
}

/* -------------------------------------------------------
   1. Calcul du score d'une fléchette
------------------------------------------------------- */
export function scoreDartV3(input: X01DartInputV3): number {
  const { segment, multiplier } = input;

  if (multiplier === 0) return 0; // MISS

  // Triple bull n'existe pas
  if (segment === 25 && multiplier === 3) return 0;

  // Sécurité : segments valides uniquement
  if (segment < 1 || (segment > 20 && segment !== 25)) {
    return 0;
  }

  // Bull = 25, DBull = 50
  if (segment === 25) {
    return 25 * multiplier;
  }

  return segment * multiplier;
}

/* -------------------------------------------------------
   2. Le dernier dart respecte-t-il le mode de sortie ?
   - simple / single : tout est autorisé
   - double : dernier dart doit être un double
   - master : dernier dart doit être double ou triple
------------------------------------------------------- */
export function isFinishingDartValidV3(
  outMode: X01OutMode,
  dart: X01DartV3
): boolean {
  // On accepte les deux libellés "simple" et "single" pour
  // rester compatible avec la config existante.
  if (outMode === "simple" || outMode === "single") {
    return true;
  }

  if (outMode === "double") {
    // Double : dernier dart doit être un double (D1-D20 ou DBull)
    return dart.multiplier === 2;
  }

  if (outMode === "master") {
    // Master : dernier dart doit être double ou triple
    return dart.multiplier === 2 || dart.multiplier === 3;
  }

  return true;
}

/* -------------------------------------------------------
   3. Initialiser une nouvelle visite pour le joueur actif
   - 3 fléchettes
   - startingScore = score courant du joueur
------------------------------------------------------- */
export function startNewVisitV3(
  state: X01MatchStateV3
): X01VisitStateV3 {
  const currentScore = state.scores[state.activePlayer];

  const visit: X01VisitStateV3 = {
    dartsLeft: 3,
    startingScore: currentScore,
    currentScore,
    darts: [],
    checkoutSuggestion: null, // sera mis à jour au fil des fléchettes
  };

  state.visit = visit;
  return visit;
}

/* -------------------------------------------------------
   4. Appliquer une fléchette à la visite en cours
   - met à jour visit.currentScore
   - décrémente dartsLeft
   - gère bust
   - NE gère PAS legs/sets/match (flow séparé)
------------------------------------------------------- */
export function applyDartToCurrentPlayerV3(
  config: X01ConfigV3,
  state: X01MatchStateV3,
  input: X01DartInputV3
): X01DartResultV3 {
  // 🔒 Sécurisation de la visite courante :
  // - si aucune visite
  // - ou si plus de fléchettes restantes
  // - ou si le score courant ne correspond pas au joueur actif
  //   (changement de joueur, nouvelle manche, etc.)
  // => on démarre une nouvelle visite propre.
  if (
    !state.visit ||
    state.visit.dartsLeft <= 0 ||
    state.visit.currentScore !== state.scores[state.activePlayer]
  ) {
    startNewVisitV3(state);
  }

  const visit = state.visit!;
  const scoreBefore = visit.currentScore;

  // Construction du dart complet
  const dart: X01DartV3 = {
    segment: input.segment,
    multiplier: input.multiplier,
    score: scoreDartV3(input),
  };

  // Nouveau score temporaire
  let scoreAfter = scoreBefore - dart.score;
  let bust = false;
  let finishingAttempt = false;

  // Règles de bust
  if (scoreAfter < 0) {
    // Score négatif = bust
    bust = true;
  } else if (scoreAfter === 0) {
    // Tentative de finish
    finishingAttempt = true;

    // Vérifier le mode de sortie (simple / double / master)
    const validFinish = isFinishingDartValidV3(config.outMode, dart);

    if (!validFinish) {
      // Sortie invalide → bust
      bust = true;
    }
  } else if (
    scoreAfter === 1 &&
    config.outMode !== "simple" &&
    config.outMode !== "single"
  ) {
    // Double-out / Master-out : score de 1 = impossible → bust
    bust = true;
  }

  if (bust) {
    // On ajoute quand même le dart à l'historique de la volée
    visit.darts.push(dart);

    // BUST → score du joueur revient à startingScore
    visit.currentScore = visit.startingScore;

    // Mise à jour du score global du joueur actif
    setScoreForActiveV3(config, state, visit.startingScore);

    // La visite est terminée
    visit.dartsLeft = 0;

    // Pas de checkout après un bust
    visit.checkoutSuggestion = null;

    return {
      dart,
      scoreBefore,
      scoreAfter: visit.startingScore,
      bust: true,
      finishingAttempt,
    };
  }

  // Pas bust → on applique le nouveau score
  visit.currentScore = scoreAfter;
  setScoreForActiveV3(config, state, scoreAfter);

  // On enregistre le dart
  visit.darts.push(dart);

  // Une fléchette de moins
  visit.dartsLeft = (visit.dartsLeft - 1) as 0 | 1 | 2 | 3;

  // 🔁 Recalcule la suggestion de checkout après CE dart
  // - seulement si encore des fléchettes disponibles
  // - seulement si un finish raisonnable est possible
  if (visit.dartsLeft > 0 && scoreAfter > 1 && scoreAfter <= 170) {
    visit.checkoutSuggestion = getAdaptiveCheckoutSuggestionV3({
      score: scoreAfter,
      dartsLeft: visit.dartsLeft,
      outMode: (config.outMode as X01OutModeV3) ?? "double",
    });
  } else {
    // soit plus de fléchettes, soit pas de finish possible
    visit.checkoutSuggestion = null;
  }

  const result: X01DartResultV3 = {
    dart,
    scoreBefore,
    scoreAfter,
    bust: false,
    finishingAttempt,
  };

  return result;
}
