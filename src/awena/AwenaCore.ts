import { getAdaptiveCheckoutSuggestionV3, type X01OutModeV3 } from "../lib/x01v3/x01CheckoutV3";
import { actionsForAwenaMode, findAwenaMode, findAwenaModeById } from "./AwenaKnowledge";
import type { AwenaReply, AwenaRuntimeContext } from "./awena.types";

function normalize(text: string) {
  return String(text || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function x01OutMode(context: AwenaRuntimeContext): X01OutModeV3 {
  const raw = String(context.outMode || context.extra?.outMode || "double").toLowerCase();
  if (raw === "simple" || raw === "single") return "simple";
  if (raw === "master") return "master";
  return "double";
}

function formatDart(segment: number, multiplier: number) {
  if (segment === 25 && multiplier === 2) return "DBULL";
  if (segment === 25) return "BULL";
  if (multiplier === 3) return `T${segment}`;
  if (multiplier === 2) return `D${segment}`;
  return `S${segment}`;
}

function buildCheckoutReply(context: AwenaRuntimeContext): string | null {
  const remaining = Number(context.remaining);
  if (!Number.isFinite(remaining) || remaining <= 0) return null;
  const dartsLeftRaw = Number(context.dartsLeft ?? context.extra?.dartsLeft ?? 3);
  const dartsLeft = Math.max(1, Math.min(3, Number.isFinite(dartsLeftRaw) ? dartsLeftRaw : 3));
  const outMode = x01OutMode(context);
  const suggestion = getAdaptiveCheckoutSuggestionV3({ score: remaining, dartsLeft, outMode });

  if (!suggestion) {
    if (remaining > 170) {
      return `Il te reste ${remaining}. Ce n'est pas un checkout direct en ${dartsLeft} fléchette${dartsLeft > 1 ? "s" : ""}. L'objectif est donc de scorer tout en préparant une sortie confortable pour la prochaine volée.`;
    }
    return `Il te reste ${remaining}. Je ne trouve pas de sortie valide avec ${dartsLeft} fléchette${dartsLeft > 1 ? "s" : ""} dans le mode de sortie actuel. Joue la sécurité pour laisser un double ou une finition simple au prochain passage.`;
  }

  const route = suggestion.darts.map((dart) => formatDart(dart.segment, dart.multiplier)).join(" → ");
  const player = context.playerName ? `${context.playerName}, ` : "";
  return `${player}il te reste ${remaining}. Avec ${dartsLeft} fléchette${dartsLeft > 1 ? "s" : ""}, tu peux tenter ${route}.`;
}

export function buildAwenaReply(question: string, context: AwenaRuntimeContext): AwenaReply {
  const q = normalize(question);
  const remembered = context.mode || context.route;
  const mode = findAwenaMode(question, remembered);

  if (!q) return { text: "Je suis là. Pose-moi une question sur le mode de jeu, les règles ou ta partie.", modeId: mode?.id || context.mode || null };

  if (/qui es tu|qui est awena|ton role|que peux tu faire/.test(q)) {
    return {
      text: "Je suis Awena, la présentatrice et assistante de MULTISPORTS SCORING. Je peux expliquer les modes, t'indiquer exactement où aller dans l'application, te donner des conseils et maintenant lire le contexte réel de certaines parties comme X01.",
      modeId: mode?.id || context.mode || null,
    };
  }

  if (/ou suis je|quel mode|mode actuel|partie actuelle/.test(q)) {
    if (mode) return { text: `Tu es actuellement dans l'univers ${mode.label}${context.phase ? `, étape ${context.phase}` : ""}.`, modeId: mode.id, actions: actionsForAwenaMode(mode, context.route) };
    return { text: "Je vois l'écran actuel de l'application, mais aucun mode de jeu précis n'est encore actif.", modeId: context.mode || null };
  }

  const asksAppNavigation = /dans l application|dans l appli|dans appli|ou cliquer|ou aller|comment lancer|comment demarrer|comment faire pour y jouer|comment y jouer|ouvrir le mode|lancer le mode/.test(q);
  if (asksAppNavigation) {
    if (mode) return { text: mode.howToPlayInApp, modeId: mode.id, actions: actionsForAwenaMode(mode, context.route) };
    return {
      text: "Dis-moi quel mode tu veux lancer. Je peux te guider dans l'application et ouvrir directement sa configuration pour les modes que je connais déjà.",
      modeId: context.mode || null,
    };
  }

  if (/ouvre|lance|demarre|emmene moi|vas y/.test(q) && mode?.configRoute) {
    return {
      text: `D'accord. Je peux t'emmener directement vers la configuration ${mode.label}.`,
      modeId: mode.id,
      actions: actionsForAwenaMode(mode, context.route),
    };
  }

  if (/regle|regles|comment jouer|explique|objectif|but du jeu/.test(q)) {
    if (mode) return { text: mode.summary, modeId: mode.id, actions: actionsForAwenaMode(mode, context.route) };
    return {
      text: "Dis-moi quel mode tu veux comprendre. Je peux déjà t'expliquer X01, Killer, Darts Firefighter, Darts Poker et Attrape-moi si tu peux.",
      modeId: context.mode || null,
    };
  }

  const rememberedMode = findAwenaModeById(context.mode);
  const activeMode = mode || rememberedMode;

  const asksCheckout = /checkout|sortie|finir|fermer|que viser|quoi viser|me conseille|conseil|strategie|que faire/.test(q);
  if (activeMode?.id === "x01" && asksCheckout && typeof context.remaining === "number") {
    const checkout = buildCheckoutReply(context);
    if (checkout) return { text: checkout, modeId: "x01" };
  }

  if (/score|reste|restant|combien me reste|mon score/.test(q) && typeof context.remaining === "number") {
    const player = context.playerName ? `${context.playerName}, ` : "";
    return { text: `${player}il te reste ${context.remaining} points.`, modeId: activeMode?.id || context.mode || null };
  }

  if (/conseil|astuce|aide|strategie|strategique|que faire/.test(q)) {
    if (activeMode) return { text: activeMode.tip, modeId: activeMode.id, actions: actionsForAwenaMode(activeMode, context.route) };
    return {
      text: "Je peux te conseiller plus précisément lorsque je connais le mode et l'état de la partie. Ouvre un mode ou indique-moi son nom.",
      modeId: context.mode || null,
    };
  }

  if (/voix|parle|audio|son/.test(q)) {
    return {
      text: "Ma voix officielle est Estelle via PocketTTS français. Après l'installation unique de mon pack vocal, mes réponses sont générées localement sur l'appareil, sans service vocal externe.",
      modeId: activeMode?.id || context.mode || null,
    };
  }

  if (activeMode) {
    const live = context.phase === "play" && typeof context.remaining === "number"
      ? ` Je vois aussi la partie en direct${context.playerName ? ` : ${context.playerName}` : ""}, score restant ${context.remaining}.`
      : "";
    return {
      text: `Je garde ${activeMode.label} en mémoire pour cette conversation.${live} Tu peux me demander les règles, comment lancer le mode dans l'application ou un conseil.`,
      modeId: activeMode.id,
      actions: actionsForAwenaMode(activeMode, context.route),
    };
  }

  return {
    text: "Je n'ai pas encore assez de contexte pour répondre proprement à cette question. Ma base locale est enrichie mode par mode afin que je n'invente jamais une règle de MULTISPORTS SCORING.",
    modeId: context.mode || null,
  };
}

export function buildAwenaAnswer(question: string, context: AwenaRuntimeContext): string {
  return buildAwenaReply(question, context).text;
}
