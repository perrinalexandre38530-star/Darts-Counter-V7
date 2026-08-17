import { getAdaptiveCheckoutSuggestionV3, type X01OutModeV3 } from "../lib/x01v3/x01CheckoutV3";
import { actionsForAwenaMode, allAwenaModes, awenaModesByCategory, findAwenaMode, findAwenaModeById } from "./AwenaKnowledge";
import { actionForNavigation, actionForSport, actionForSportMode, findAwenaNavigationTopic, findAwenaSport, findAwenaSportMode } from "./AwenaAppKnowledge";
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

function listDartsModesText() {
  const groups = awenaModesByCategory();
  const order = ["Classiques", "Variantes", "Défis", "Fun", "Training"];
  return order
    .filter((category) => groups[category]?.length)
    .map((category) => `${category} : ${groups[category].map((mode) => mode.label).join(", ")}`)
    .join(". ");
}

function routeLooksLikeMode(route: string | undefined, modeId: string) {
  const r = normalize(route || "").replace(/-/g, " ");
  const id = normalize(modeId).replace(/-/g, " ");
  return !!r && !!id && r.includes(id);
}

export function buildAwenaReply(question: string, context: AwenaRuntimeContext): AwenaReply {
  const q = normalize(question);
  const remembered = context.mode || context.route;
  const mode = findAwenaMode(question, remembered);
  const sportMode = findAwenaSportMode(question, context.sport);
  const sport = findAwenaSport(question, context.sport);
  const navTopic = findAwenaNavigationTopic(question);

  if (!q) return { text: "Je suis là. Pose-moi une question sur l'application, un sport, un mode, sa configuration, ses règles ou ta partie.", modeId: mode?.id || context.mode || null };

  if (/qui es tu|qui est awena|ton role|que peux tu faire|a quoi sers tu/.test(q)) {
    return {
      text: `Je suis Awena, la présentatrice et assistante de MULTISPORTS SCORING. Ma base locale connaît maintenant ${allAwenaModes().length} modes Fléchettes déclarés disponibles, les principaux modes des autres sports, la navigation générale, les configurations de participants et le contexte live du X01. Je peux expliquer, guider, ouvrir des écrans et donner des conseils sans inventer une règle absente de l'application.`,
      modeId: mode?.id || context.mode || null,
    };
  }

  if (/quels jeux|quels modes|liste des jeux|liste des modes|modes disponibles|jeux disponibles/.test(q)) {
    if (sport && sport.id !== "darts") {
      return { text: `${sport.description} Modes connus : ${sport.modes.map((item) => item.label).join(", ")}.`, actions: actionForSport(sport) };
    }
    return { text: `Pour les Fléchettes, je connais les modes actuellement déclarés disponibles dans le registre de l'application. ${listDartsModesText()}`, modeId: context.mode || null };
  }

  if (/ou suis je|quel mode|mode actuel|partie actuelle|quel ecran/.test(q)) {
    if (mode) return { text: `Tu es actuellement dans l'univers ${mode.label}${context.phase ? `, étape ${context.phase}` : ""}.`, modeId: mode.id, actions: actionsForAwenaMode(mode, context.route) };
    if (sport) return { text: `Tu es dans l'univers ${sport.label}${context.route ? `, écran ${context.route}` : ""}.`, actions: actionForSport(sport) };
    return { text: `Je vois l'écran actuel${context.route ? ` : ${context.route}` : ""}, mais aucun mode de jeu précis n'est actif.`, modeId: context.mode || null };
  }

  const asksAppNavigation = /dans l application|dans l appli|dans appli|ou cliquer|ou aller|comment lancer|comment demarrer|comment ouvrir|comment faire pour y jouer|comment y jouer|ouvrir le mode|lancer le mode|trouver/.test(q);
  if (asksAppNavigation) {
    if (sportMode) return { text: sportMode.howToPlayInApp, actions: routeLooksLikeMode(context.route, sportMode.id) ? [] : actionForSportMode(sportMode) };
    if (mode) return { text: mode.howToPlayInApp, modeId: mode.id, actions: actionsForAwenaMode(mode, context.route) };
    if (sport) return { text: `${sport.description} Pour y accéder, ouvre Jeux puis ${sport.label}.`, actions: actionForSport(sport) };
    if (navTopic) return { text: `${navTopic.description} Tu peux l'ouvrir depuis la barre de navigation.`, actions: actionForNavigation(navTopic) };
    return { text: "Dis-moi le nom de l'écran, du sport ou du mode que tu cherches. Je connais notamment Accueil, Messages, Profils, Jeux, Compétitions, Online, Stats, Réglages et Écrans, ainsi que les menus des sports disponibles." };
  }

  if (/ouvre|lance|demarre|emmene moi|vas y/.test(q)) {
    if (sportMode) return { text: `D'accord. Je peux t'emmener vers ${sportMode.label}.`, actions: actionForSportMode(sportMode) };
    if (mode?.configRoute) return { text: `D'accord. Je peux t'emmener vers ${mode.label}.`, modeId: mode.id, actions: actionsForAwenaMode(mode, context.route) };
    if (navTopic) return { text: `D'accord. J'ouvre ${navTopic.label}.`, actions: actionForNavigation(navTopic) };
    if (sport) return { text: `D'accord. J'ouvre le menu ${sport.label}.`, actions: actionForSport(sport) };
  }

  const asksRules = /regle|regles|comment jouer|explique|objectif|but du jeu|principe/.test(q);
  if (asksRules) {
    if (sportMode) return { text: sportMode.summary, actions: actionForSportMode(sportMode) };
    if (mode) return { text: mode.summary, modeId: mode.id, actions: actionsForAwenaMode(mode, context.route) };
    if (sport) return { text: `${sport.description} Demande-moi le nom d'un mode précis pour sa règle détaillée. Modes connus : ${sport.modes.map((item) => item.label).join(", ")}.`, actions: actionForSport(sport) };
    return { text: `Dis-moi le mode que tu veux comprendre. Côté Fléchettes, ma base couvre maintenant les ${allAwenaModes().length} modes déclarés disponibles ; je connais aussi les principaux modes Pétanque, Baby-foot, Ping-pong, Mölkky, Dés et Football.` };
  }

  const rememberedMode = findAwenaModeById(context.mode);
  const activeMode = mode || rememberedMode;

  if (/configuration|configurer|parametre|parametres|options|reglages du mode|combien de joueurs|nombre de joueurs|equipes|equipe|bots|bot ia/.test(q) && activeMode) {
    if (/combien de joueurs|nombre de joueurs|max joueurs|maximum/.test(q)) {
      return { text: `${activeMode.label} accepte ${activeMode.maxPlayers === 1 ? "un joueur en solo" : `jusqu'à ${activeMode.maxPlayers} joueurs`}.`, modeId: activeMode.id };
    }
    if (/equipes|equipe/.test(q)) {
      return { text: activeMode.supportsTeams ? `${activeMode.label} prend en charge les équipes.` : `${activeMode.label} est déclaré sans gestion d'équipes dans le registre actuel.`, modeId: activeMode.id };
    }
    if (/bots|bot ia|ia/.test(q)) {
      return { text: activeMode.supportsBots ? `${activeMode.label} prend en charge les bots IA.` : `${activeMode.label} est déclaré sans bots IA dans le registre actuel.`, modeId: activeMode.id };
    }
    return { text: `${activeMode.configuration} ${activeMode.howToPlayInApp}`, modeId: activeMode.id, actions: actionsForAwenaMode(activeMode, context.route) };
  }

  if (/stats|statistiques|record|records|historique/.test(q) && activeMode) {
    return { text: `${activeMode.label} possède la clé statistique ${activeMode.statsKey || "du mode"}. Pour consulter les données enregistrées, ouvre Stats depuis la barre principale puis le bloc correspondant au sport ou au mode.`, modeId: activeMode.id, actions: actionForNavigation(findAwenaNavigationTopic("stats")!) };
  }

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
    if (sportMode) return { text: `Pour ${sportMode.label}, commence par respecter l'objectif du mode et adapte la prise de risque à l'état de la partie. ${sportMode.summary}` };
    return { text: "Je peux te conseiller plus précisément dès que je connais le mode et l'état de la partie. Indique-moi son nom ou ouvre-le." };
  }

  if (/voix|parle|audio|son|prononce|prononciation|anglais|francais/.test(q)) {
    return { text: "Ma voix stable actuelle est un modèle français local. Pour les titres et termes anglais de l'application, j'utilise un dictionnaire de prononciation dédié afin de les faire sonner correctement sans changer de voix au milieu d'une phrase." };
  }

  if (navTopic) return { text: navTopic.description, actions: actionForNavigation(navTopic) };
  if (sportMode) return { text: `${sportMode.summary} ${sportMode.howToPlayInApp}`, actions: actionForSportMode(sportMode) };
  if (sport && !activeMode) return { text: `${sport.description} Tu peux me demander les règles d'un mode précis, comment le lancer ou où trouver ses statistiques.`, actions: actionForSport(sport) };

  if (activeMode) {
    const live = context.phase === "play" && typeof context.remaining === "number"
      ? ` Je vois aussi la partie en direct${context.playerName ? ` : ${context.playerName}` : ""}, score restant ${context.remaining}.`
      : "";
    return { text: `Je garde ${activeMode.label} en mémoire pour cette conversation.${live} Tu peux me demander ses règles, sa configuration, le nombre de joueurs, les équipes, les bots, comment le lancer, ses statistiques ou un conseil.`, modeId: activeMode.id, actions: actionsForAwenaMode(activeMode, context.route) };
  }

  return {
    text: "Je n'ai pas trouvé cette information dans ma base locale. Reformule avec le nom exact d'un écran, d'un sport ou d'un mode ; je préfère te dire que je ne sais pas plutôt que d'inventer une règle.",
    modeId: context.mode || null,
  };
}

export function buildAwenaAnswer(question: string, context: AwenaRuntimeContext): string {
  return buildAwenaReply(question, context).text;
}
