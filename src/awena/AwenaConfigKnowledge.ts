import { dartsGameRegistry } from "../games/dartsGameRegistry";

export type AwenaModeConfigDetail = {
  options: string[];
  victory: string;
  variants?: string[];
  notes?: string[];
};

const DETAILS: Record<string, AwenaModeConfigDetail> = {
  x01: {
    options: [
      "participants en joueurs ou équipes, avec bots IA si souhaité",
      "score de départ 301, 501, 701 ou 901",
      "mode d’entrée Simple, Double ou Master",
      "mode de sortie Simple, Double ou Master",
      "format du match en legs et, lorsqu’il est disponible, en sets",
      "ordre de départ et options audio / voix",
      "comptage classique ou comptage externe lorsqu’un appareil compatible est configuré",
    ],
    victory: "atteindre exactement zéro en respectant le mode de sortie choisi ; une finition invalide provoque un bust et annule la volée concernée",
    variants: ["301", "501", "701", "901", "Simple In", "Double In", "Master In", "Simple Out", "Double Out", "Master Out"],
  },
  cricket: {
    options: [
      "sélection des joueurs",
      "mode de jeu Cricket",
      "mode de score avec points ou sans points selon la variante",
      "ordre de départ",
    ],
    victory: "fermer les cibles du Cricket selon les règles du mode et respecter la condition de score choisie",
    variants: ["Cricket standard", "Cricket sans points", "Enculette / Vache", "Cut-Throat selon le mode sélectionné"],
  },
  killer: {
    options: [
      "sélection des joueurs et des bots IA",
      "attribution des numéros : manuel, aléatoire ou 1er lancer",
      "1 à 6 vies de départ en Killer classique",
      "activation Killer : toucher son numéro ou double sur son numéro",
      "dégâts : -1 par hit ou multiplicateur Simple / Double / Triple",
      "auto-pénalité et multiplicateur d’auto-pénalité",
      "vol de vies (Life Steal)",
      "Blind Killer",
      "BULL dégâts à tous, BULL soins +1/+2/+3 et Rotation BULL",
      "DBULL dégâts à tous, bouclier 1 à 5 tours, désarmement et Rotation DBULL",
      "bonus bouclier au choix du numéro quand l’attribution se fait au 1er lancer",
      "MISS = auto-hit",
      "résurrection OFF / 1 Joueur (1×) / All (1×) / All illimité avec 1 à 6 vies rendues",
    ],
    victory: "être le dernier joueur encore en vie après avoir utilisé son statut Killer pour retirer les vies adverses",
    variants: ["Killer classique", "Killer Progressif", "Life Steal", "BULL dégâts", "BULL soins", "Rotation BULL", "DBULL bouclier", "DBULL désarmement", "Rotation DBULL", "Résurrections"],
    notes: ["Certaines variantes sont incompatibles et sont automatiquement grisées selon les choix actifs."],
  },
  shanghai: {
    options: [
      "participants",
      "nombre de tours",
      "ordre des cibles chronologique ou aléatoire",
      "condition de victoire Shanghai immédiat ou classement aux points",
    ],
    victory: "réaliser la condition Shanghai prévue ou terminer avec le meilleur total de points selon le réglage choisi",
    variants: ["Shanghai ou points", "points uniquement", "ordre chronologique", "ordre aléatoire"],
  },
  battle_royale: {
    options: [
      "au moins deux joueurs et bots IA possibles",
      "système d’élimination",
      "nombre de vies lorsque ce système est utilisé",
      "nombre de fléchettes par tour",
      "voix IA",
    ],
    victory: "survivre : le dernier joueur encore en jeu remporte la partie",
    variants: ["0 point = éliminé", "nombre de ratés = éliminé", "système de vies"],
  },
  warfare: {
    options: [
      "répartition des joueurs dans deux armées",
      "bots IA",
      "disposition des armées",
      "règle de touche Simple / Double ou Double uniquement selon la variante",
      "friendly fire lorsqu’il est activé",
      "variantes Bull",
    ],
    victory: "éliminer tous les soldats de l’armée adverse",
    variants: ["Single + Double", "Double only", "Top / Bottom", "friendly fire", "variantes Bull"],
  },
  five_lives: {
    options: ["joueurs et bots IA", "vies de départ", "ordre de départ", "mode de saisie"],
    victory: "être le dernier joueur encore en vie",
    variants: ["nombre de vies configurable", "keypad ou saisie selon les options proposées"],
  },
  golf: {
    options: ["participants / équipes selon le format proposé", "bots IA", "paramètres du parcours et de la partie affichés dans la configuration"],
    victory: "terminer le parcours avec le meilleur résultat selon le barème Golf du mode",
  },
  scram: {
    options: [
      "mode Joueurs ou Équipes",
      "répartition en deux camps",
      "mode de saisie keypad ou cible interactive",
    ],
    victory: "remporter le duel de camps selon les objectifs offensifs / défensifs du Scram",
    variants: ["Joueurs", "Équipes", "keypad", "cible interactive"],
  },
  halve_it: {
    options: [
      "joueurs ou équipes",
      "bots IA",
      "mode de départ : 0, score fixe ou volée d’ouverture selon les options",
      "séquence de cibles / contrats",
    ],
    victory: "après la dernière cible, le joueur ou l’équipe avec le total le plus élevé gagne",
    variants: ["score de départ configurable", "équipes"],
  },
  bobs_27: {
    options: ["participants / équipes", "bots IA", "score de départ", "parcours des doubles"],
    victory: "obtenir le meilleur résultat sur l’exercice des doubles en partant de 27 points selon les règles Bob’s 27",
    variants: ["solo / multi", "équipes"],
  },
  bowling: {
    options: ["participants", "bots IA", "paramètres proposés pour les 10 frames"],
    victory: "obtenir le meilleur score après 10 frames ; 300 est le score parfait",
  },
  knockout: {
    options: ["participants", "bots IA", "paramètres d’élimination et de score visibles dans la configuration"],
    victory: "rester en jeu jusqu’à la fin de la mécanique d’élimination du mode",
  },
  shooter: {
    options: ["participants", "bots IA", "paramètres de cible / précision proposés par le mode"],
    victory: "obtenir le meilleur résultat selon les objectifs de tir du mode Shooter",
  },
  mario_kart: {
    options: ["participants", "bots IA", "paramètres de course et d’avancement proposés sur l’écran Darts Racer"],
    victory: "être le premier à terminer la course / atteindre l’objectif du Darts Racer",
    variants: ["Darts Racer"],
  },
  baseball: {
    options: ["participants", "bots IA", "paramètres de manches / attaque-défense disponibles dans la configuration"],
    victory: "terminer la partie avec le meilleur score après les manches prévues",
  },
  attrape_moi: {
    options: ["participants / rôles Chasseur et Fuyard", "bots IA", "format de confrontation et rounds disponibles"],
    victory: "le Chasseur doit rattraper le Fuyard ; le Fuyard doit conserver son avance jusqu’à la fin",
    variants: ["Chasseur", "Fuyard", "formats en plusieurs manches selon la configuration"],
  },
  president: {
    options: ["participants", "bots IA", "paramètres de hiérarchie / manches proposés dans la configuration"],
    victory: "respecter l’objectif du mode Président et terminer en tête selon son classement spécifique",
  },
  football: {
    options: ["participants", "variante de football", "paramètres du match proposés dans la configuration"],
    victory: "marquer selon la règle de la variante et finir avec le meilleur score",
    variants: ["Classic : Bull pour prendre la possession puis Double pour marquer", "autres variantes affichées dans la configuration"],
  },
  rugby: {
    options: ["participants", "bots IA lorsqu’ils sont proposés", "paramètres de match et de score disponibles dans la configuration"],
    victory: "terminer avec le meilleur score selon le barème Rugby du mode",
  },
  capital: {
    options: ["participants", "bots IA", "objectifs / tours proposés dans la configuration"],
    victory: "obtenir le meilleur total en respectant les contrats successifs du mode Capital",
  },
  loterie: {
    options: [
      "joueurs ou équipes",
      "bots IA",
      "mode Loterie ou Express",
      "volée stricte de 3 fléchettes ou volée libre lorsqu’elle est proposée",
      "cible / nombre d’essais en Express",
    ],
    victory: "le premier joueur ou la première équipe qui complète entièrement un de ses cartons gagne immédiatement",
    variants: ["Loterie", "Express", "1 essai", "jusqu’à 3 essais"],
  },
  departements: {
    options: [
      "participants / camps",
      "bots IA",
      "mode Conquête ou Forteresses",
      "sélection de cible libre ou par score",
      "durée",
      "condition de victoire",
      "option Bull / Double Bull pour rejouer lorsqu’elle est activée",
    ],
    victory: "remplir la condition de contrôle territorial choisie ; certaines variantes classent aussi les camps par valeur totale des territoires possédés",
    variants: ["Conquête", "Forteresses", "cible libre", "volée directe"],
  },
  darts_firefighter: {
    options: [
      "mission préconfigurée ou personnalisée",
      "joueurs et bots IA",
      "intensité initiale des foyers",
      "zones en alerte au départ",
      "protections initiales",
      "durée maximale en rounds",
      "rythme d’évolution du moteur incendie",
      "nouveaux départs programmés",
      "vent dynamique",
      "réglages de résistance / destruction et puissance d’eau",
    ],
    victory: "réussir l’objectif de mission avant que la condition d’échec ou la limite de rounds soit atteinte",
    variants: ["Express", "Wildfire", "Protection civile", "Inferno", "Custom"],
  },
  darts_poker: {
    options: [
      "joueurs et bots IA",
      "niveau des bots",
      "nombre de manches",
      "nombre de fléchettes par main",
      "visibilité des mains adverses",
      "effets spéciaux Doubles / Triples",
      "Double Bull = Joker",
      "contrat bonus par manche",
      "mode de saisie keypad ou cible interactive",
    ],
    victory: "la meilleure main gagne la manche ; le classement final se joue au total de points puis aux victoires",
    variants: ["contrats ON / OFF", "mains adverses visibles ou masquées", "clavier", "cible interactive"],
  },
  cargo: {
    options: [
      "mission",
      "joueurs et bots IA",
      "niveau des bots",
      "mode équipes / convoi",
      "variante",
      "nombre de tours",
      "nombre de contrats visibles",
      "conservation partielle entre les tours",
      "charge cible",
      "règles Bull / Joker",
    ],
    victory: "compléter les contrats et atteindre l’objectif logistique prévu par la mission avant les adversaires",
    variants: ["charge libre", "capacité exacte", "fragile", "urgence", "convoi", "long trajet", "livraison / bonus selon la variante"],
  },
  ocean_control: {
    options: ["participants / flottes", "ordre de mission", "nombre de manches", "paramètres tactiques proposés"],
    victory: "détruire tous les navires adverses ; la première flotte à remporter le nombre de manches choisi gagne",
    variants: ["Simple = une zone", "Double = deux zones adjacentes", "Triple = ligne de trois zones"],
  },
  prisoner: {
    options: [
      "joueurs ou équipes",
      "bots IA et difficulté",
      "parcours",
      "nombre de fléchettes de départ",
      "pénalité MISS",
      "mode de saisie keypad ou cible",
    ],
    victory: "être le premier à terminer le parcours du cadran ; en équipes, une équipe gagne lorsqu’un de ses membres termine ou que les autres équipes sont éliminées",
    variants: ["Joueurs", "Équipes", "MISS avec ou sans pénalité", "keypad", "cible"],
  },
  tic_tac_toe: {
    options: ["participants", "paramètres de grille / validation proposés par le mode"],
    victory: "réaliser la condition gagnante du morpion avant l’adversaire",
  },
  bastard: {
    options: ["participants", "bots IA", "variante et paramètres spéciaux affichés dans la configuration"],
    victory: "remporter la partie selon les objectifs et pénalités du mode Batard",
  },
  count_up: {
    options: ["participants", "nombre de tours / limite définie dans la configuration"],
    victory: "obtenir le meilleur total à la fin du nombre de tours prévu",
  },
  super_bull: {
    options: ["participants", "paramètres de Bull / Double Bull et objectifs proposés"],
    victory: "obtenir le meilleur résultat en visant les Bulls selon le barème du mode",
  },
  happy_mille: {
    options: ["participants", "objectif et paramètres de score affichés dans la configuration"],
    victory: "atteindre l’objectif du mode Happy Mille avant les adversaires",
  },
  v170: {
    options: ["participants", "paramètres de tentative / rounds proposés"],
    victory: "réussir ou optimiser la finition 170 selon le format du mode",
  },
};

function fallbackDetailFromRegistry(modeId: string): AwenaModeConfigDetail | null {
  const game = dartsGameRegistry.find((item) => item.id === modeId);
  if (!game) return null;

  const participants = game.maxPlayers === 1 ? "mode solo" : `jusqu'à ${game.maxPlayers} joueurs`;
  const options = [
    participants,
    game.supportsTeams ? "équipes prises en charge" : "pas d'équipes dans le registre actuel",
    game.supportsBots ? "BOTS IA pris en charge" : "pas de BOTS IA dans le registre actuel",
    `catégorie ${game.category}`,
  ];

  const variants = Array.from(new Set([
    game.variantId,
    game.presetVariantId,
    game.baseGame ? `famille ${game.baseGame}` : undefined,
  ].filter(Boolean) as string[]));

  const sentences = String(game.infoBody || "")
    .split(/(?<=[.!?])\s+/)
    .map((item) => item.trim())
    .filter(Boolean);
  const victory = sentences.find((sentence) => /gagne|victoire|vainqueur|dernier survivant|premier a|premier à|meilleur total/i.test(sentence))
    || game.infoBody
    || `respecter l'objectif du mode ${game.label}`;

  const notes: string[] = [];
  if (game.tab === "mode_not_ready") {
    notes.push("État actuel : concept présent dans le registre mais sans écran de configuration / Play dédié ; la source le marque encore à implémenter.");
  } else if (/a implementer|à implementer/i.test(game.infoBody)) {
    notes.push("État actuel : une entrée / configuration existe, mais le registre indique encore À implémenter pour une partie de la mécanique.");
  } else if (/sera consolidee|sera consolidée|a venir|à venir/i.test(game.infoBody)) {
    notes.push("État actuel : le registre signale encore une mécanique à consolider / compléter.");
  }

  return { options, victory, variants: variants.length ? variants : undefined, notes: notes.length ? notes : undefined };
}

export function getAwenaModeConfigDetail(modeId?: string | null): AwenaModeConfigDetail | null {
  if (!modeId) return null;
  const id = String(modeId);
  return DETAILS[id] || fallbackDetailFromRegistry(id);
}

export function formatAwenaConfiguration(modeLabel: string, base: string, detail: AwenaModeConfigDetail | null) {
  if (!detail) return base;
  const options = detail.options.length ? `Options principales : ${detail.options.join(" ; ")}.` : "";
  const variants = detail.variants?.length ? ` Variantes / choix : ${detail.variants.join(" ; ")}.` : "";
  const notes = detail.notes?.length ? ` ${detail.notes.join(" ")}` : "";
  return `${base} ${options} Condition de victoire : ${detail.victory}.${variants}${notes}`.replace(/\s+/g, " ").trim();
}
