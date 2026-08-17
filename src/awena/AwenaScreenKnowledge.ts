import type { AwenaAction, AwenaReply, AwenaRuntimeContext } from "./awena.types";
import { findAwenaModeById } from "./AwenaKnowledge";

type ScreenCard = {
  id: string;
  match: (route: string) => boolean;
  title: string;
  purpose: string;
  steps: string[];
  route?: string;
  routeLabel?: string;
};

function norm(value: string) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9_\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function action(card: ScreenCard): AwenaAction[] | undefined {
  return card.route && card.routeLabel
    ? [{ id: `screen-${card.id}`, label: card.routeLabel, kind: "navigate", route: card.route }]
    : undefined;
}

const SCREENS: ScreenCard[] = [
  {
    id: "home",
    match: (r) => r === "home",
    title: "Accueil",
    purpose: "L’Accueil donne une vue synthétique du profil actif, des performances récentes et des accès rapides.",
    steps: ["consulter les cartes de synthèse", "ouvrir Jeux pour démarrer une partie", "ouvrir Stats pour analyser l’historique", "ouvrir Profils pour gérer les joueurs"],
  },
  {
    id: "profiles-bots",
    match: (r) => r.includes("profiles_bots"),
    title: "BOTS IA",
    purpose: "Cet écran sert à consulter, créer et gérer les joueurs virtuels.",
    steps: ["choisir un bot existant", "créer un nouveau bot", "régler son identité et son niveau", "vérifier qu’il apparaîtra dans les modes compatibles"],
  },
  {
    id: "profiles",
    match: (r) => r === "profiles" || r.includes("profile"),
    title: "Profils",
    purpose: "Cet écran centralise les joueurs locaux et l’identité du profil utilisé dans l’application.",
    steps: ["sélectionner ou créer un profil", "modifier son identité / avatar", "accéder aux BOTS IA", "consulter les éléments liés au joueur"],
  },
  {
    id: "games",
    match: (r) => r === "games" || r.includes("menu_games") || r.endsWith("_menu"),
    title: "Jeux",
    purpose: "Cet écran sert à choisir un sport puis un mode de jeu.",
    steps: ["choisir la catégorie ou le sport", "ouvrir l’InfoDot si tu veux un résumé rapide", "ouvrir la carte du mode", "configurer la partie avant de démarrer"],
  },
  {
    id: "stats",
    match: (r) => r.includes("stats") || r.includes("history"),
    title: "Stats / Historique",
    purpose: "Cet espace transforme les parties enregistrées en statistiques, classements, records et historiques.",
    steps: ["choisir le mode ou le joueur", "sélectionner la vue statistique", "filtrer la période si l’écran le permet", "ouvrir une partie pour son détail"],
    route: "stats",
    routeLabel: "Ouvrir Stats",
  },
  {
    id: "settings",
    match: (r) => r.includes("settings"),
    title: "Réglages",
    purpose: "Cet écran rassemble les préférences de l’application et plusieurs fonctions de maintenance.",
    steps: ["régler la langue et le thème", "gérer l’audio et Awena", "contrôler les options de stockage / sauvegarde", "vérifier les autres préférences disponibles"],
  },
  {
    id: "storage",
    match: (r) => r.includes("storage_vault") || r.includes("sync_center"),
    title: "Coffre / Synchronisation",
    purpose: "Cet écran sert à sauvegarder, restaurer ou synchroniser les données vers une destination compatible.",
    steps: ["vérifier la destination sélectionnée", "contrôler la date du snapshot", "créer une sauvegarde avant une opération risquée", "restaurer seulement après avoir vérifié la source"],
  },
  {
    id: "online",
    match: (r) => r === "online" || r.includes("friend") || r.includes("online"),
    title: "Online",
    purpose: "Cet espace regroupe les fonctions réseau : amis, salons et rencontres compatibles.",
    steps: ["vérifier la connexion", "gérer les amis / invitations", "créer ou rejoindre un salon lorsque le mode le permet", "lancer la rencontre depuis le flux Online"],
  },
  {
    id: "tournaments",
    match: (r) => r.includes("tournament") || r === "tournaments",
    title: "Compétitions",
    purpose: "Cet espace sert à créer et suivre les compétitions structurées.",
    steps: ["créer ou sélectionner un tournoi", "ajouter les participants / équipes", "composer le tableau", "jouer les matchs et enregistrer les résultats"],
  },
  {
    id: "cast",
    match: (r) => r.includes("cast") || r.includes("viewer") || r.includes("spectator"),
    title: "Écrans / Cast",
    purpose: "Cet écran sert à envoyer une présentation de la partie vers un viewer ou un écran externe compatible.",
    steps: ["créer ou rejoindre la session d’affichage", "ouvrir le viewer", "garder l’appareil principal comme contrôleur", "vérifier que l’écran distant reçoit la session"],
  },
  {
    id: "camera",
    match: (r) => r.includes("camera") || r.includes("calibration"),
    title: "Scoring caméra",
    purpose: "Cet écran prépare la caméra et sa calibration pour interpréter la cible.",
    steps: ["stabiliser la caméra", "cadrer entièrement la cible", "effectuer la calibration", "tester la détection avant une vraie partie"],
  },
];

function currentCard(route?: string) {
  const r = norm(route || "");
  return SCREENS.find((card) => card.match(r)) || null;
}

export function answerAwenaScreenQuestion(question: string, context: AwenaRuntimeContext): AwenaReply | null {
  const q = norm(question);
  const screenQuestion = /ou suis je|quel ecran|cet ecran|cette page|que puis je faire ici|qu est ce que je fais ici|a quoi sert cet ecran|a quoi sert cette page|que dois je faire maintenant|quoi faire maintenant|et maintenant|comment utiliser cet ecran|comment utiliser cette page/.test(q);
  if (!screenQuestion) return null;

  const mode = findAwenaModeById(context.mode);
  const phase = norm(context.phase || "");

  if (mode && (phase === "config" || String(context.route || "").includes("config"))) {
    return {
      modeId: mode.id,
      text: `## CONFIGURATION — ${mode.label.toUpperCase()}\nTu es sur l’écran de **configuration** de ${mode.label}.\n\n## CE QUE TU DOIS FAIRE\n- choisir les **participants** ;\n- régler les **options / variantes** proposées ;\n- vérifier la **condition de victoire** et le format ;\n- choisir les options de saisie ou aides disponibles ;\n- lancer la partie lorsque tout est prêt.\n\n> Appuie sur **Configuration** dans mon panneau pour que je détaille chaque option connue de ce mode.`,
      actions: [{ id: `screen-config-${mode.id}`, label: "Détailler la configuration", kind: "ask", prompt: `Détaille précisément toutes les options de configuration de ${mode.label}.` }],
    };
  }

  if (mode && (phase === "play" || context.inGame)) {
    return {
      modeId: mode.id,
      text: `## PARTIE EN COURS — ${mode.label.toUpperCase()}\nTu es dans l’écran de **jeu actif**.\n\n## ICI\n- suis le joueur / camp actif ;\n- enregistre les actions ou impacts avec le système de saisie du mode ;\n- utilise **Annuler** si le mode autorise la correction ;\n- consulte-moi pour une règle, un conseil ou l’état de la partie lorsque le contexte est disponible.\n\n> Je ne dois jamais masquer les commandes de jeu : mon bouton reste dans la zone prévue à la place de l’InfoDot.`,
      actions: [{ id: `screen-rules-${mode.id}`, label: "Règles", kind: "ask", prompt: `Explique-moi les règles de ${mode.label}.` }],
    };
  }

  const card = currentCard(context.route);
  if (!card) {
    return {
      text: `## ÉCRAN ACTUEL\nJe vois la route **${context.route || "non identifiée"}**, mais je n’ai pas encore une fiche dédiée pour cette page.\n\n> Dis-moi ce que tu cherches à faire et je tenterai de te guider avec les fonctions connues de l’application.`,
    };
  }

  return {
    knowledgeTopic: `screen:${card.id}`,
    text: `## ${card.title.toUpperCase()}\n${card.purpose}\n\n## CE QUE TU PEUX FAIRE ICI\n${card.steps.map((step) => `- ${step}`).join("\n")}`,
    actions: action(card),
  };
}
