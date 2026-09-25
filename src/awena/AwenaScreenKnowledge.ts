import type { AwenaAction, AwenaReply, AwenaRuntimeContext } from "./awena.types";
import { findAwenaModeById } from "./AwenaKnowledge";
import { getAwenaSourceScreensForRoute } from "./AwenaSourceAtlas";

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

function routeTitle(route?: string) {
  const value = String(route || "").replace(/[_-]+/g, " ").trim();
  return value ? value.replace(/\b\w/g, (m) => m.toUpperCase()) : "Écran actuel";
}

function sourceFacts(context: AwenaRuntimeContext, limit = 10) {
  const seen = new Set<string>();
  const facts: string[] = [];
  for (const entry of getAwenaSourceScreensForRoute(context.route, context.sport)) {
    for (const raw of entry.facts || []) {
      const fact = String(raw || "").replace(/\s+/g, " ").trim();
      const key = norm(fact);
      if (!fact || fact.length < 3 || fact.length > 180 || seen.has(key)) continue;
      seen.add(key);
      facts.push(fact);
      if (facts.length >= limit) return facts;
    }
  }
  return facts;
}

function snapshotControls(context: AwenaRuntimeContext) {
  const raw = context.extra?.awenaScreenSnapshot as any;
  return Array.isArray(raw?.controls) ? raw.controls : [];
}

function questionTokens(value: string) {
  return norm(value).split(" ").filter((token) => token.length >= 3 && !["comment","trouver","trouve","page","ecran","écran","ici","bouton","menu","option","reglage","réglage","est","sont","dans","quel","quelle"].includes(token));
}

function visibleMatches(question: string, context: AwenaRuntimeContext) {
  const tokens = questionTokens(question);
  if (!tokens.length) return [] as any[];
  return snapshotControls(context)
    .map((item: any) => {
      const hay = norm(`${item?.label || ""} ${item?.value || ""}`);
      const score = tokens.reduce((sum, token) => sum + (hay.includes(token) ? 1 : 0), 0);
      return { item, score };
    })
    .filter((row: any) => row.score > 0)
    .sort((a: any, b: any) => b.score - a.score)
    .slice(0, 6)
    .map((row: any) => row.item);
}

function factsBlock(facts: string[]) {
  return facts.length ? `\n\n## CE QUI EST PRÉSENT SUR CET ÉCRAN\n${facts.map((fact) => `- ${fact}`).join("\n")}` : "";
}

export function answerAwenaScreenQuestion(question: string, context: AwenaRuntimeContext): AwenaReply | null {
  const q = norm(question);
  const locateQuestion = /ou est|ou sont|ou se trouve|ou trouver|je cherche|trouve moi|trouver le|trouver la|quel bouton|quelle touche|dans quel menu|comment acceder|comment accéder|comment ouvrir/.test(q);
  const genericGuide = /^(guide moi|guide-moi|guide moi ici|guide-moi ici|aide moi ici|aide-moi ici|montre moi quoi faire|je fais quoi ici)$/i.test(q);
  const screenQuestion = genericGuide || /ou suis je|quel ecran|cet ecran|cette page|que puis je faire ici|qu est ce que je fais ici|a quoi sert cet ecran|a quoi sert cette page|que dois je faire maintenant|quoi faire maintenant|et maintenant|comment utiliser cet ecran|comment utiliser cette page|comment ca marche ici|comment fonctionne ici|comment fonctionne cette page|explique cette page|explique cet ecran/.test(q);

  if (locateQuestion) {
    const hits = visibleMatches(question, context);
    if (hits.length) {
      return {
        modeId: context.mode || null,
        knowledgeTopic: `screen:${context.route || "current"}:locate`,
        text: `## JE L'AI REPÉRÉ SUR CET ÉCRAN\n${hits.map((item: any) => `- **${item.label || "Élément"}**${item.value ? ` — valeur actuelle : **${item.value}**` : ""}${item.disabled ? " — indisponible actuellement" : ""}`).join("\n")}\n\n> Je m'appuie sur les contrôles réellement visibles. Si ce n'est pas l'élément que tu cherches, donne-moi son nom exact et je chercherai dans les autres pages de l'application.`,
      };
    }
    // L'élément n'est pas visible ici : laisse l'Atlas de navigation chercher
    // dans toute l'application au lieu d'inventer un emplacement local.
    return null;
  }

  if (!screenQuestion) return null;

  const mode = findAwenaModeById(context.mode);
  const phase = norm(context.phase || "");
  const facts = sourceFacts(context);

  if (mode && (phase === "config" || String(context.route || "").includes("config"))) {
    return {
      modeId: mode.id,
      knowledgeTopic: `screen:${context.route || mode.id}:guide`,
      text: `## CONFIGURATION — ${mode.label.toUpperCase()}\nTu es sur l'écran de **configuration** de ${mode.label}.\n\n## COMMENT T'Y REPÉRER\n- commence par le **type de partie** et les participants ;\n- règle ensuite les variantes / options du mode ;\n- vérifie le format, l'ordre de jeu et la méthode de saisie ;\n- termine par le résumé avant de lancer.\n\nJe peux aussi répondre à **« où est telle option ? »** : si elle est visible, je te donne son libellé exact ; sinon je cherche l'écran correspondant dans l'application.${factsBlock(facts)}\n\n> Demande-moi **« guide-moi étape par étape »**, **« où est … ? »** ou **« explique cette option »** et je reste sur cette page.`,
      actions: [
        { id: `screen-config-${mode.id}`, label: "Détailler la configuration", kind: "ask", prompt: `Détaille précisément toutes les options de configuration de ${mode.label}.` },
        { id: `screen-guide-${mode.id}`, label: "Me guider ici", kind: "ask", prompt: "Guide-moi étape par étape sur cette page." },
      ],
    };
  }

  if (mode && (phase === "play" || context.inGame)) {
    const cradosSpecific = mode.id === "crados" ? `\n\n## SUR CRADOS EN PARTICULIER\n- le **nom** et le **gros score** indiquent le camp actif et son niveau de crasse ;\n- la **jauge CRADOS** montre la progression vers la limite d'élimination ;\n- le **mini-radar** ouvre la carte des zones ;\n- la première ligne de KPI résume crasse / zones / vols / darts ;\n- le **bandeau joueurs** ouvre l'ordre complet ;\n- la seconde ligne de KPI résume couches / lavées / tours / manches ;\n- le bouton journal ouvre les dernières actions ;\n- le keypad sert à saisir Simple / Double / Triple / Bull puis **VALIDER**.` : "";
    return {
      modeId: mode.id,
      knowledgeTopic: `screen:${context.route || mode.id}:guide`,
      text: `## PARTIE EN COURS — ${mode.label.toUpperCase()}\nTu es dans l'écran de **jeu actif**.\n\n## COMMENT LIRE LA PAGE\n- repère d'abord le joueur / camp actif ;\n- lis les indicateurs de score ou d'état propres au mode ;\n- saisis l'action avec les commandes de jeu ;\n- utilise Annuler / Undo seulement pour corriger une vraie erreur ;\n- ouvre les blocs secondaires pour les statistiques, le journal ou la carte lorsque le mode en possède.${cradosSpecific}${factsBlock(facts)}\n\n> Tu peux me demander **« où est … ? »**, **« comment fonctionne ce bloc ? »** ou **« guide-moi sur cette page »**.`,
      actions: [
        { id: `screen-guide-${mode.id}`, label: "Me guider ici", kind: "ask", prompt: "Guide-moi sur cette page et explique les blocs visibles." },
        { id: `screen-rules-${mode.id}`, label: "Règles", kind: "ask", prompt: `Explique-moi les règles de ${mode.label}.` },
      ],
    };
  }

  const card = currentCard(context.route);
  if (!card) {
    const title = routeTitle(context.screenLabel || context.route);
    return {
      knowledgeTopic: `screen:${context.route || "current"}:guide`,
      text: `## ${title.toUpperCase()}\nJe n'ai pas besoin d'une fiche manuelle dédiée pour te guider ici : j'utilise la **route active**, les **contrôles réellement visibles** et les libellés extraits de cette version de l'application.${factsBlock(facts)}\n\n## COMMENT JE PEUX T'AIDER ICI\n- **« guide-moi »** : je te donne l'ordre logique des actions ;\n- **« où est … ? »** : je cherche d'abord sur cet écran puis dans l'Atlas complet ;\n- **« comment fonctionne … ? »** : je croise l'élément visible avec ma base de connaissances ;\n- **« ça ne marche pas »** : je reste sur cette page pour le diagnostic.`,
    };
  }

  return {
    knowledgeTopic: `screen:${card.id}`,
    text: `## ${card.title.toUpperCase()}\n${card.purpose}\n\n## CE QUE TU PEUX FAIRE ICI\n${card.steps.map((step) => `- ${step}`).join("\n")}${factsBlock(facts)}\n\n> Demande-moi **« guide-moi »**, **« où se trouve … ? »** ou **« comment fonctionne … ? »** : je garde le contexte de cette page.`,
    actions: action(card),
  };
}
