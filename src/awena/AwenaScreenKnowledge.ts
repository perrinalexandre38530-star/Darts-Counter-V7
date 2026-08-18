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
    id: "game-select",
    match: (r) => r === "gameselect" || r === "game_select",
    title: "Choix du sport",
    purpose: "Cet écran choisit l'univers sportif avant d'ouvrir ses modes de jeu.",
    steps: ["faire défiler les sports disponibles", "ouvrir la carte du sport", "revenir ensuite à Jeux pour choisir un mode", "utiliser les réglages si tu veux changer langue, thème ou préférences"],
  },
  {
    id: "messages",
    match: (r) => r === "messages",
    title: "Messages",
    purpose: "Le centre Messages regroupe les conversations et échanges disponibles dans les fonctions connectées.",
    steps: ["ouvrir une conversation", "consulter les messages non lus", "revenir vers Profils / Online pour gérer les personnes et relations", "vérifier la connexion si rien ne se charge"],
  },
  {
    id: "friends",
    match: (r) => r === "friends" || r.includes("nearby"),
    title: "Amis / joueurs proches",
    purpose: "Cet espace sert à retrouver des joueurs, gérer les relations et accéder aux fonctions sociales compatibles.",
    steps: ["consulter les amis", "traiter les invitations", "chercher un joueur lorsque la fonction est disponible", "ouvrir Online ou Messages pour poursuivre l'interaction"],
  },
  {
    id: "clubs",
    match: (r) => r.includes("club"),
    title: "Clubs",
    purpose: "L'espace Clubs regroupe les fonctions communautaires liées aux clubs et à leurs membres.",
    steps: ["ouvrir ou rechercher un club", "consulter ses informations", "gérer les actions proposées selon tes droits", "utiliser les fonctions Online / compétition associées si elles sont disponibles"],
  },
  {
    id: "avatar",
    match: (r) => r === "avatar" || r.includes("avatar"),
    title: "Avatar",
    purpose: "Cet écran sert à choisir ou créer l'identité visuelle d'un profil.",
    steps: ["choisir l'image ou le style disponible", "prévisualiser le rendu", "enregistrer", "revenir au profil pour vérifier l'avatar"],
  },
  {
    id: "teams",
    match: (r) => r.includes("team") && !r.includes("stats"),
    title: "Équipes",
    purpose: "Cet écran sert à créer, modifier ou sélectionner des équipes pour les sports et modes compatibles.",
    steps: ["choisir les membres", "nommer l'équipe", "ajouter un logo si l'écran le permet", "enregistrer puis sélectionner l'équipe dans une configuration compatible"],
  },
  {
    id: "training",
    match: (r) => r.includes("training"),
    title: "Training",
    purpose: "Le Training regroupe les exercices et modes d'entraînement destinés à mesurer la progression sans forcément reproduire un match classique.",
    steps: ["choisir un exercice", "régler ses paramètres", "effectuer la session", "consulter ensuite les statistiques d'entraînement disponibles"],
  },
  {
    id: "auth-account",
    match: (r) => r.includes("auth") || r.includes("account_start"),
    title: "Compte / connexion",
    purpose: "Cet écran gère l'identification au compte et les opérations d'accès associées.",
    steps: ["choisir connexion ou création de compte", "saisir les informations demandées", "utiliser la récupération si le mot de passe est oublié", "ne jamais partager ton mot de passe dans une conversation"],
  },
  {
    id: "match-detail",
    match: (r) => r.includes("match_detail") || r.includes("match_result"),
    title: "Détail du match",
    purpose: "Cet écran présente les informations enregistrées pour une rencontre ou son résultat.",
    steps: ["lire le score / résultat", "consulter les statistiques disponibles", "identifier les participants", "revenir à l'historique ou au classement pour comparer"],
  },
  {
    id: "summary-end",
    match: (r) => r.endsWith("_end") || r.includes("summary"),
    title: "Fin de partie",
    purpose: "Cet écran résume le résultat de la partie qui vient de se terminer.",
    steps: ["vérifier le classement / vainqueur", "consulter les statistiques de la partie", "ouvrir les détails ou records si disponibles", "rejouer ou revenir au menu"],
  },
  {
    id: "petanque",
    match: (r) => r.includes("petanque"),
    title: "Pétanque",
    purpose: "Cet univers regroupe matchs, équipes, tournois et statistiques de Pétanque.",
    steps: ["choisir un format de jeu", "configurer joueurs / équipes et règles", "jouer les mènes", "consulter ensuite historique, joueurs, équipes ou leaderboards"],
  },
  {
    id: "pingpong",
    match: (r) => r.includes("pingpong"),
    title: "Ping-Pong",
    purpose: "Cet univers regroupe les matchs et entraînements de Ping-Pong.",
    steps: ["choisir 1V1, 2V2, 2V1, Tournante ou Training", "configurer participants, sets et service", "jouer", "consulter l'historique / détail de match"],
  },
  {
    id: "babyfoot",
    match: (r) => r.includes("babyfoot"),
    title: "Baby-foot",
    purpose: "Cet univers regroupe Match, Fun, Défis, Training, Ligue, équipes et statistiques Baby-foot.",
    steps: ["choisir la catégorie", "sélectionner le format", "utiliser la configuration guidée ou complète", "jouer puis consulter les stats / ligue"],
  },
  {
    id: "molkky",
    match: (r) => r.includes("molkky"),
    title: "Mölkky",
    purpose: "Cet univers propose les variantes Classique, Rapide et Personnalisé ainsi que leurs statistiques.",
    steps: ["choisir le mode", "sélectionner 2 à 6 joueurs", "régler la cible et les options", "jouer puis consulter les classements / historiques"],
  },
  {
    id: "dice",
    match: (r) => r.includes("dice"),
    title: "Dés",
    purpose: "Cet univers regroupe les jeux de dés disponibles : courses au score, scorecards et modes de prise de risque.",
    steps: ["choisir le jeu de dés", "configurer joueurs, cible, dés, manches / sets", "jouer selon les combinaisons du mode", "consulter les statistiques disponibles"],
  },
  {
    id: "football",
    match: (r) => r.startsWith("foot") || r.includes("football"),
    title: "Football",
    purpose: "Cet univers propose plusieurs formats de Football et leurs paramètres de match.",
    steps: ["choisir le format", "composer les camps", "régler durée, mi-temps, tirs ou remplacements selon le mode", "démarrer puis enregistrer le match"],
  },
  {
    id: "mode-not-ready",
    match: (r) => r.includes("mode_not_ready"),
    title: "Mode en préparation",
    purpose: "Cette page indique que le mode choisi n'est pas encore déclaré jouable dans la version actuelle.",
    steps: ["revenir à la liste des jeux", "choisir un mode disponible", "ne pas considérer les fonctions affichées ici comme finalisées"],
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
