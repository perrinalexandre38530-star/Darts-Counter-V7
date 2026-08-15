import { findAwenaMode } from "./AwenaKnowledge";
import type { AwenaRuntimeContext } from "./awena.types";

function normalize(text: string) {
  return String(text || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function buildAwenaAnswer(question: string, context: AwenaRuntimeContext): string {
  const q = normalize(question);
  const mode = findAwenaMode(question, context.route || context.mode);

  if (!q) return "Je suis là. Pose-moi une question sur le mode de jeu, les règles ou ta partie.";

  if (/qui es tu|qui est awena|ton role|que peux tu faire/.test(q)) {
    return "Je suis Awena, la présentatrice et assistante de MULTISPORTS SCORING. Je peux expliquer les modes, donner des conseils, commenter certaines situations de jeu et, progressivement, utiliser le contexte réel de tes parties et statistiques.";
  }

  if (/regle|regles|comment jouer|explique|objectif|but du jeu/.test(q)) {
    if (mode) return mode.summary;
    return "Dis-moi quel mode tu veux comprendre. Je peux déjà t'expliquer X01, Killer, Darts Firefighter, Darts Poker et Attrape-moi si tu peux.";
  }

  if (/conseil|astuce|aide|strategie|strategique|que faire/.test(q)) {
    if (mode) return mode.tip;
    return "Je peux te conseiller plus précisément lorsque je connais le mode et l'état de la partie. Pour l'instant, ouvre un mode ou indique-moi son nom.";
  }

  if (/voix|parle|audio|son/.test(q)) {
    return "Ma voix est gérée localement par le module Awena Voice. Cette première version utilise le moteur vocal installé sur l'appareil ; l'architecture est déjà prévue pour recevoir ensuite notre propre modèle vocal Awena hors ligne.";
  }

  if (/score|reste|restant/.test(q) && typeof context.remaining === "number") {
    return `Il te reste ${context.remaining} points. Je pourrai bientôt calculer directement le meilleur chemin selon les règles exactes de la partie en cours.`;
  }

  if (mode) {
    return `Je suis bien dans ${mode.label}. Tu peux me demander « explique les règles » ou « donne-moi un conseil » et je te répondrai à partir de ce mode.`;
  }

  return "Je n'ai pas encore assez de contexte pour répondre proprement à cette question. Ma base locale va être enrichie mode par mode afin que je n'invente jamais une règle de MULTISPORTS SCORING.";
}
