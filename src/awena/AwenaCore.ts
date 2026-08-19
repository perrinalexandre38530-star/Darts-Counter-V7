import { getAdaptiveCheckoutSuggestionV3, type X01OutModeV3 } from "../lib/x01v3/x01CheckoutV3";
import { actionsForAwenaMode, allAwenaModes, awenaModesByCategory, findAwenaMode, findAwenaModeById } from "./AwenaKnowledge";
import { actionForNavigation, actionForSport, actionForSportMode, findAwenaNavigationTopic, findAwenaSport, findAwenaSportMode } from "./AwenaAppKnowledge";
import type { AwenaReply, AwenaRuntimeContext } from "./awena.types";
import { detailedConfigurationText, detailedRulesText } from "./AwenaDetailedKnowledge";
import { answerAwenaGeneralQuestion } from "./AwenaGeneralKnowledge";
import { answerAwenaEncyclopedia } from "./AwenaEncyclopedia";
import { answerAwenaScreenQuestion } from "./AwenaScreenKnowledge";
import { answerAwenaAppAtlas, awenaAtlasCount } from "./AwenaAppAtlas";
import { answerAwenaLiveScreenQuestion, visibleConfigurationAppendix } from "./AwenaLiveScreen";
import { answerAwenaRegisteredHelp, awenaRegisteredHelpCount, getAwenaHelpText } from "./AwenaHelpRegistry";
import { answerAwenaSportsKnowledge, awenaSportsKnowledgeCount } from "./AwenaSportsKnowledge";
import { answerAwenaDeepKnowledge, awenaDeepKnowledgeCount } from "./AwenaDeepKnowledge";
import { answerAwenaRouteAtlas, awenaRouteAtlasCount } from "./AwenaRouteAtlas";
import { answerAwenaAdvancedEncyclopedia, awenaAdvancedEncyclopediaCount } from "./AwenaAdvancedEncyclopedia";
import { answerAwenaMasterEncyclopedia, awenaMasterDartsCount, awenaMasterStaticCount } from "./AwenaMasterEncyclopedia";
import { answerAwenaSourceAtlas, awenaSourceAtlasCount, awenaSourceFactsCount } from "./AwenaSourceAtlas";
import { answerAwenaExpertReference, awenaExpertReferenceCount } from "./AwenaExpertReference";
import { answerAwenaOmniKnowledge, awenaOmniKnowledgeCount } from "./AwenaOmniKnowledge";
import { answerAwenaKnowledgeTool, AWENA_KNOWLEDGE_TOOL_COUNT } from "./AwenaKnowledgeTools";

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
  const rememberedModeId = String(context.extra?.awenaRememberedMode || "");
  const remembered = context.mode || rememberedModeId || context.route;
  const mode = findAwenaMode(question, remembered);
  const sportMode = findAwenaSportMode(question, context.sport);
  const sport = findAwenaSport(question, context.sport);
  const navTopic = findAwenaNavigationTopic(question);

  if (!q) return { text: "Je suis là. Pose-moi une question sur l'application, un sport, un mode, sa configuration, ses règles ou ta partie.", modeId: mode?.id || context.mode || null };

  if (/qui es tu|qui est awena|ton role|que peux tu faire|a quoi sers tu/.test(q)) {
    return {
      text: `## QUI JE SUIS
Je suis **Awena**, la présentatrice et assistante de MULTISPORTS SCORING.

## CE QUE JE CONNAIS
Ma base locale couvre les **${awenaMasterDartsCount()} entrées Fléchettes du registre actuel**, dont les concepts encore en développement sont signalés comme tels, plus **${awenaMasterStaticCount()} dossiers multisports / fonctionnels supplémentaires**, **${awenaAtlasCount()} grands sujets fonctionnels**, **${awenaSportsKnowledgeCount()} fiches multisports détaillées**, **${awenaDeepKnowledgeCount()} sujets approfondis**, **${awenaAdvancedEncyclopediaCount()} fiches encyclopédiques avancées**, **${awenaExpertReferenceCount()} références expertes sport / stratégie / statistiques**, **${awenaOmniKnowledgeCount()} fiches Omni supplémentaires**, **${AWENA_KNOWLEDGE_TOOL_COUNT} outils de calcul local** et un index de **${awenaRouteAtlasCount()} routes réelles**. J’exploite aussi **${awenaSourceAtlasCount()} fiches d’écrans extraites du code et ${awenaSourceFactsCount()} éléments UI / aides**, ainsi que l’aide InfoDot déjà rencontrée dans l’application (${awenaRegisteredHelpCount()} fiche${awenaRegisteredHelpCount() > 1 ? "s" : ""} mémorisée${awenaRegisteredHelpCount() > 1 ? "s" : ""}).

## CE QUE JE PEUX FAIRE
Je peux expliquer, comparer, guider vers un écran, décrire la page actuelle, répondre à des relances courtes et exploiter les statistiques réellement enregistrées.

> Si une règle, une option ou une donnée n'existe pas dans l'application, je dois le dire plutôt que l'inventer.`,
      modeId: mode?.id || context.mode || null,
    };
  }

  // Compréhension de l'écran courant : « que puis-je faire ici ? »,
  // « à quoi sert cette page ? », « et maintenant ? ». Cette couche doit
  // rester prioritaire car elle dépend du contexte réel de navigation.
  const screenReply = answerAwenaScreenQuestion(question, context);
  if (screenReply) return screenReply;

  // Lecture des contrôles réellement visibles : Awena peut répondre à
  // « quelles options vois-tu ici ? » même si cet écran n'a pas encore une fiche
  // dédiée dans son catalogue statique.
  const liveScreenReply = answerAwenaLiveScreenQuestion(question, context);
  if (liveScreenReply) return liveScreenReply;

  // Questions générales et vocabulaire de l'application.
  // Cette couche passe AVANT la configuration du mode actif pour éviter par
  // exemple que « Qu'est-ce qu'un bot ? » soit interprété comme
  // « Est-ce que X01 accepte les bots ? ».
  const rememberedKnowledgeTopic = String(context.extra?.awenaKnowledgeTopic || "");
  const generalReply = answerAwenaGeneralQuestion(question, rememberedKnowledgeTopic);
  if (generalReply) return generalReply;

  // Atlas de toute l'application : compte, sécurité, stockage, sauvegardes,
  // synchronisation, publicité, profils, Online, compétitions, Cast, caméra,
  // maintenance et autres fonctions transversales.
  const atlasReply = answerAwenaAppAtlas(question, rememberedKnowledgeTopic);
  if (atlasReply) return atlasReply;

  // V8.5 : outils déterministes. Ils calculent localement les questions qui
  // ne doivent pas dépendre d'une fiche statique : score d'une volée, AVG3,
  // taux de victoire, Best Of, ratios et probabilités simples aux dés.
  const toolReply = answerAwenaKnowledgeTool(question, context);
  if (toolReply) return toolReply;

  // V8.4 : références expertes. Cette couche répond aux questions précises
  // de culture sportive, technique, stratégie, vocabulaire et statistiques.
  // Elle sépare volontairement les règles officielles de référence des presets
  // réellement configurés dans MULTISPORTS SCORING.
  const expertReply = answerAwenaExpertReference(question, context, rememberedKnowledgeTopic);
  if (expertReply) return expertReply;

  // V8.5 Omni Knowledge : 320 fiches supplémentaires à correspondance stricte.
  // Cette couche complète V8.4 sans remplacer les règles spécifiques aux modes.
  const omniReply = answerAwenaOmniKnowledge(question, context, rememberedKnowledgeTopic);
  if (omniReply) return omniReply;

  // Encyclopédie maître. Elle croise le registre Fléchettes V74
  // (63 entrées actuellement déclarées READY, y compris les concepts encore
  // marqués à implémenter) avec des dossiers précis Pétanque, Ping-Pong,
  // Mölkky, Dés, FOOT et Baby-foot.
  const masterReply = answerAwenaMasterEncyclopedia(question, context);
  if (masterReply) return masterReply;

  // Les autres sports ont leur propre corpus détaillé. Cette couche connaît
  // les modes, formats et options réellement déclarés dans leurs menus/configs.
  const sportsReply = answerAwenaSportsKnowledge(question, context);
  if (sportsReply) return sportsReply;

  // Encyclopédie locale à correspondance pondérée. Elle couvre les paraphrases
  // et formulations moins prévisibles sans envoyer la question vers un service
  // externe. Le sujet retenu est mémorisé pour les relances courtes.
  const encyclopediaReply = answerAwenaEncyclopedia(question, rememberedKnowledgeTopic);
  if (encyclopediaReply) return encyclopediaReply;

  // Encyclopédie avancée : statistiques, Historique, définitions précises X01,
  // centres Stats multisports et méthode de calcul des records.
  const advancedReply = answerAwenaAdvancedEncyclopedia(question, context, rememberedKnowledgeTopic);
  if (advancedReply) return advancedReply;

  // Couche approfondie : stockage, profils, social, caméra, scoring,
  // trainings, autres sports, dépannage et fonctions transversales.
  const deepReply = answerAwenaDeepKnowledge(question, rememberedKnowledgeTopic);
  if (deepReply) return deepReply;

  // Atlas de source : dernier complément structuré avant les intentions de jeu.
  // Il utilise les libellés / aides réellement présents dans les composants de
  // la V74 pour répondre aux questions sur une option, un bouton ou un écran.
  const sourceReply = answerAwenaSourceAtlas(question, context);
  if (sourceReply) return sourceReply;

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

  // "Comment jouer au X01 ?" est volontairement interprété comme une demande
  // pratique : chemin dans l'application + accès direct au mode. Une demande
  // explicite de "règles" reste traitée plus bas comme une explication de règles.
  const asksHowToStartMode =
    /comment (?:faire pour )?(?:jouer|demarrer|demarrer une partie|lancer une partie)(?: au| a| en| sur)?/.test(q) &&
    !/regle|regles|principe|objectif|but du jeu/.test(q);
  if (asksHowToStartMode) {
    if (sportMode) {
      return { text: `${sportMode.howToPlayInApp} Si tu veux, je peux ensuite t'expliquer les règles ou la configuration.`, actions: routeLooksLikeMode(context.route, sportMode.id) ? [] : actionForSportMode(sportMode) };
    }
    if (mode) {
      return {
        text: `## POUR JOUER À ${mode.label.toUpperCase()}\n${mode.howToPlayInApp}\n\n## RÈGLE RAPIDE\n${mode.summary}\n\n> Utilise le ticker ci-dessous pour ouvrir directement la configuration du mode.`,
        modeId: mode.id,
        actions: actionsForAwenaMode(mode, context.route),
      };
    }
  }

  const asksAppNavigation = /dans l application|dans l appli|dans appli|ou cliquer|ou aller|comment lancer|comment demarrer|comment ouvrir|comment faire pour y jouer|comment y jouer|ouvrir le mode|lancer le mode|trouver/.test(q);
  if (asksAppNavigation) {
    if (sportMode) return { text: sportMode.howToPlayInApp, actions: routeLooksLikeMode(context.route, sportMode.id) ? [] : actionForSportMode(sportMode) };
    if (mode) return { text: `## CHEMIN DANS L’APPLICATION\n${mode.howToPlayInApp}`, modeId: mode.id, actions: actionsForAwenaMode(mode, context.route) };
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

  const rememberedMode = findAwenaModeById(context.mode || rememberedModeId);
  const activeMode = mode || rememberedMode;

  // Configuration doit être prioritaire sur les mots génériques comme
  // "explique" ou "condition de victoire". Le bouton Configuration d'Awena
  // utilise volontairement une phrase détaillée qui contient ces termes.
  const asksConfig = /configuration|configurer|parametre|parametres|options|reglages du mode|réglages du mode|combien de joueurs|nombre de joueurs|equipes|equipe|bots|bot ia/.test(q);
  if (asksConfig && activeMode) {
    if (/combien de joueurs|nombre de joueurs|max joueurs|maximum/.test(q)) {
      return { text: `## PARTICIPANTS\n${activeMode.label} accepte ${activeMode.maxPlayers === 1 ? "un joueur en solo" : `jusqu'à ${activeMode.maxPlayers} joueurs`}.`, modeId: activeMode.id };
    }
    if (/equipes|equipe/.test(q) && !/configuration|options|parametre|reglage/.test(q)) {
      return { text: `## ÉQUIPES\n${activeMode.supportsTeams ? `${activeMode.label} prend en charge les équipes.` : `${activeMode.label} est déclaré sans gestion d'équipes dans le registre actuel.`}`, modeId: activeMode.id };
    }
    if (/bots|bot ia|ia/.test(q) && !/configuration|options|parametre|reglage/.test(q)) {
      return { text: `## BOTS IA\n${activeMode.supportsBots ? `${activeMode.label} prend en charge les bots IA.` : `${activeMode.label} est déclaré sans bots IA dans le registre actuel.`}`, modeId: activeMode.id };
    }
    const integratedHelp = getAwenaHelpText(context.route, activeMode.label);
    const visible = visibleConfigurationAppendix(context);
    return {
      text: `${detailedConfigurationText(activeMode)}${integratedHelp ? `\n\n## AIDE INTÉGRÉE À CET ÉCRAN\n${integratedHelp}` : ""}${visible}`,
      modeId: activeMode.id,
      actions: actionsForAwenaMode(activeMode, context.route),
    };
  }

  const asksRules =
    /regle|regles|règle|règles|objectif|but du jeu|principe/.test(q) ||
    (/explique(?: moi)?(?: clairement)?/.test(q) && !asksConfig);
  if (asksRules) {
    if (sportMode) return { text: sportMode.summary, actions: actionForSportMode(sportMode) };
    if (activeMode) {
      const integratedHelp = getAwenaHelpText(context.route, activeMode.label);
      return {
        text: `${detailedRulesText(activeMode)}${integratedHelp ? `\n\n## AIDE INTÉGRÉE À CET ÉCRAN\n${integratedHelp}` : ""}`,
        modeId: activeMode.id,
        actions: actionsForAwenaMode(activeMode, context.route),
      };
    }
    if (sport) return { text: `${sport.description} Demande-moi le nom d'un mode précis pour sa règle détaillée. Modes connus : ${sport.modes.map((item) => item.label).join(", ")}.`, actions: actionForSport(sport) };
    return { text: `Dis-moi le mode que tu veux comprendre. Côté Fléchettes, ma base couvre maintenant les ${allAwenaModes().length} modes déclarés disponibles ; je connais aussi les principaux modes Pétanque, Baby-foot, Ping-pong, Mölkky, Dés et Football.` };
  }

  if (/condition de victoire|comment gagner|qui gagne|quand gagne|victoire/.test(q) && activeMode) {
    return { text: `## CONDITION DE VICTOIRE\n${activeMode.victoryCondition}`, modeId: activeMode.id };
  }

  if (/variante|variantes|quels modes|quelles variantes|choix possibles/.test(q) && activeMode && activeMode.variants.length) {
    return { text: `## VARIANTES / CHOIX\n${activeMode.variants.map((item) => `- ${item}`).join("\n")}`, modeId: activeMode.id };
  }

  if (/historique/.test(q) && activeMode) {
    return { text: `Pour ${activeMode.label}, tu peux consulter l'historique et les statistiques enregistrées depuis Stats. Tu peux aussi me demander directement un top, le meilleur joueur, le pourcentage de victoire ou une période précise.`, modeId: activeMode.id, actions: actionForNavigation(findAwenaNavigationTopic("stats")!) };
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

  if (/voix|parle|audio|son|prononce|prononciation|anglais|francais|espagnol|allemand|langue/.test(q)) {
    return {
      text: `## LANGUE ET VOIX D'AWENA
Je suis liée à la **langue choisie dans l'application**.

## FRANÇAIS
J'utilise ma **voix neuronale locale stable**.

## AUTRES LANGUES
Sur Android, ta question peut être traduite localement vers ma base de connaissances puis ma réponse est retraduite vers la langue choisie. Pour la lecture, j'utilise alors une **voix Android de cette langue** afin d'éviter une prononciation française artificielle.

> Le premier usage d'une langue peut nécessiter le téléchargement de son modèle de traduction. Ensuite, la traduction peut fonctionner localement sur l'appareil.`,
      knowledgeTopic: "atlas:language",
    };
  }

  // Réutilise les aides InfoDot réellement rencontrées. Cette couche est
  // volontairement placée après les règles/configurations structurées afin de
  // compléter les trous sans remplacer les réponses plus précises.
  const registeredHelpReply = answerAwenaRegisteredHelp(question, context.route);
  if (registeredHelpReply) return registeredHelpReply;

  // Dernier filet de navigation : index de toutes les routes déclarées dans App.
  const routeAtlasReply = answerAwenaRouteAtlas(question);
  if (routeAtlasReply) return routeAtlasReply;

  if (navTopic) return { text: navTopic.description, actions: actionForNavigation(navTopic) };
  if (sportMode) return { text: `${sportMode.summary} ${sportMode.howToPlayInApp}`, actions: actionForSportMode(sportMode) };
  if (sport && !activeMode) return { text: `${sport.description} Tu peux me demander les règles d'un mode précis, comment le lancer ou où trouver ses statistiques.`, actions: actionForSport(sport) };

  if (activeMode) {
    const live = context.phase === "play" && typeof context.remaining === "number"
      ? ` Je vois aussi la partie en direct${context.playerName ? ` : ${context.playerName}` : ""}, score restant ${context.remaining}.`
      : "";
    return { text: `Je garde ${activeMode.label} en mémoire pour cette conversation.${live} Tu peux me demander ses règles, sa configuration, ses variantes, sa condition de victoire, comment le lancer, ses records, un top 3, le meilleur ou le plus mauvais joueur, ou un conseil.`, modeId: activeMode.id, actions: actionsForAwenaMode(activeMode, context.route) };
  }

  return {
    text: `## JE N'AI PAS ENCORE CETTE INFORMATION
Je n'ai pas trouvé une réponse suffisamment fiable dans ma base locale.

## TU PEUX ESSAYER
- préciser le **nom du mode** ou de l'écran ;
- me demander **« que puis-je faire sur cet écran ? »** ;
- employer le nom exact d'une option ou d'une statistique ;
- me demander une définition : **« c'est quoi… ? »**.

> Je préfère signaler une limite plutôt que d'inventer une règle ou une donnée.`,
    modeId: context.mode || null,
    actions: [
      { id: "awena-help-capabilities", label: "Ce que tu sais faire", kind: "ask", prompt: "Que peux-tu faire exactement dans l'application ?" },
      { id: "awena-help-screen", label: "Aide sur cet écran", kind: "ask", prompt: "Que puis-je faire sur cet écran ?" },
    ],
  };
}

export function buildAwenaAnswer(question: string, context: AwenaRuntimeContext): string {
  return buildAwenaReply(question, context).text;
}
