export type AwenaModeLike = {
  id: string;
  label: string;
  summary: string;
  configuration: string;
  victoryCondition: string;
  variants: string[];
  maxPlayers: number;
  supportsTeams: boolean;
  supportsBots: boolean;
  howToPlayInApp: string;
};

type Section = { title: string; body?: string; bullets?: string[]; note?: string };

type ModeDeepDetail = {
  rules?: Section[];
  configuration?: Section[];
};

const DEEP: Record<string, ModeDeepDetail> = {
  x01: {
    rules: [
      { title: "OBJECTIF", body: "Chaque joueur part du score choisi — 301, 501, 701 ou 901 — et soustrait le total de chaque volée. Il faut atteindre **exactement 0**." },
      { title: "ENTRÉE — IN", bullets: [
        "**Simple In** : la partie commence sur n’importe quelle touche valide.",
        "**Double In** : les points ne commencent à descendre qu’après un double.",
        "**Master In** : l’entrée est validée par un double ou un triple.",
      ] },
      { title: "SORTIE — OUT", bullets: [
        "**Simple Out** : n’importe quelle touche peut terminer la partie si elle amène exactement à 0.",
        "**Double Out** : la dernière fléchette doit être un double.",
        "**Master Out** : la dernière fléchette doit être un double ou un triple.",
      ] },
      { title: "BUST", body: "Si une volée rend la sortie invalide — par exemple score négatif ou finition interdite par le mode Out — la volée est annulée et le score revient à sa valeur du début de volée." },
      { title: "MATCH", body: "Les manches et les sets définissent la longueur du match. Selon la configuration, l’ordre de départ peut être défini ou aléatoire." },
    ],
    configuration: [
      { title: "SCORE DE DÉPART", bullets: ["301", "501", "701", "901"] },
      { title: "ENTRÉE / SORTIE", bullets: ["Simple In, Double In ou Master In.", "Simple Out, Double Out ou Master Out."] },
      { title: "PARTICIPANTS", body: "Choix des joueurs, des équipes lorsque le format l’autorise, et des bots IA. Les dartsets associés aux profils peuvent être utilisés." },
      { title: "FORMAT DU MATCH", body: "Réglage des manches et des sets selon les choix proposés à l’écran. Le format détermine combien de manches ou de sets sont nécessaires pour gagner." },
      { title: "ORDRE / AUDIO / SAISIE", body: "L’écran permet aussi de régler l’ordre de départ, les options de voix/annonces et le mode de comptage ou de saisie disponible." },
      { title: "CONDITION DE VICTOIRE", body: "Atteindre exactement 0 en respectant le mode de sortie sélectionné." },
    ],
  },

  attrape_moi: {
    rules: [
      { title: "OBJECTIF", body: "Le **Fuyard** commence avec une avance. Il doit rester devant jusqu’à la fin de la poursuite. Le **Chasseur** doit atteindre ou dépasser son score avant la limite." },
      { title: "FUYARD", body: "Il joue en premier à chaque round. Il gagne la manche par **ÉVASION** s’il atteint l’écart configuré, ou s’il n’est pas rattrapé à la fin du nombre maximum de rounds." },
      { title: "CHASSEUR", body: "Il joue après le Fuyard. Dès que son score cumulé atteint ou dépasse celui du Fuyard, la manche s’arrête immédiatement : **CAPTURE**." },
      { title: "ALTERNANCE", body: "Après chaque manche, les rôles s’inversent automatiquement : chaque camp devient successivement Fuyard puis Chasseur." },
      { title: "ÉQUIPES", body: "En équipes, tous les joueurs du camp Fuyard jouent d’abord leur volée, puis tous les joueurs du camp Chasseur. Le score est cumulé par camp, tout en conservant les statistiques individuelles." },
      { title: "FORMAT", body: "Les manches et les sets peuvent être configurés en **Best Of** ou **First To**." },
    ],
    configuration: [
      { title: "MODE DE CONFIGURATION", bullets: [
        "**Guidée** : configuration étape par étape : Participants, Poursuite, Format, Saisie, Résumé.",
        "**Complète** : tous les réglages sont visibles sur une seule page.",
      ] },
      { title: "PARTICIPANTS", bullets: [
        "**Joueurs** : exactement 2 joueurs ; les rôles Fuyard / Chasseur s’inversent après chaque manche.",
        "**Équipes** : 2 camps ; équipes manuelles, sauvegardées ou générées selon les choix disponibles.",
        "**Bots IA** : activables ; difficulté **Facile / Normal / Difficile**.",
      ] },
      { title: "POURSUITE", bullets: [
        "**Avance du Fuyard** : 50, 100, 150, 200, 250, 300, 400 ou 500 points.",
        "**Score d’évasion** : écart qui donne une évasion immédiate ; les choix vont jusqu’à 1000 points et doivent rester supérieurs à l’avance initiale.",
        "**Rounds max / manche** : 3, 5, 7, 10, 12, 15 ou 20 rounds.",
        "**Premier Fuyard** : 1er camp sélectionné, 2e camp sélectionné ou tirage aléatoire.",
      ], note: "Départ : Fuyard avec l’avance choisie, Chasseur à 0. Capture à 0 d’écart. Évasion immédiate lorsque l’écart configuré est atteint." },
      { title: "FORMAT DES MANCHES", bullets: [
        "**Best Of** : 1, 3, 5, 7, 9, 11, 13 ou 15 manches.",
        "**First To** : 1, 3, 5, 7, 9, 10, 11, 13, 15, 16, 17 ou 18 manches à gagner.",
      ] },
      { title: "FORMAT DES SETS", bullets: [
        "**Best Of** ou **First To**.",
        "Valeurs proposées : 1, 3, 5, 7, 9, 11 ou 13.",
      ] },
      { title: "SAISIE", bullets: [
        "**Keypad X01**.",
        "**Cible interactive**.",
        "Les impacts Simple, Double, Triple, Bull, Double Bull et Miss sont conservés pour l’historique et les statistiques Fuyard / Chasseur.",
      ] },
      { title: "CONDITION DE VICTOIRE", body: "Une manche est gagnée par **CAPTURE** pour le Chasseur ou par **ÉVASION** pour le Fuyard. Le format de manches et de sets choisi détermine ensuite le vainqueur du match." },
    ],
  },

  killer: {
    rules: [
      { title: "OBJECTIF", body: "Chaque joueur possède un numéro. Il doit d’abord remplir la condition d’activation pour devenir **Killer**, puis utiliser les touches autorisées pour retirer des vies aux adversaires." },
      { title: "MISE EN PLACE", bullets: [
        "Chaque joueur reçoit un numéro de 1 à 20 : choix manuel, tirage aléatoire ou 1er lancer selon le réglage.",
        "Les vies de départ sont communes à tous les joueurs dans la configuration classique.",
      ] },
      { title: "DEVENIR KILLER", bullets: [
        "Toucher son numéro en simple, ou exiger un double sur son numéro selon la règle choisie.",
        "Une fois Killer, toucher le numéro d’un adversaire vivant lui retire des vies.",
      ] },
      { title: "DÉGÂTS", bullets: [
        "**-1 par hit** : chaque touche valide retire 1 vie.",
        "**Multiplicateur Simple / Double / Triple** : retire respectivement 1, 2 ou 3 vies.",
      ] },
      { title: "VARIANTES SPÉCIALES", bullets: [
        "Auto-pénalité sur son propre numéro.",
        "Vol de vies.",
        "Blind Killer.",
        "Fonctions Bull : dégâts à tous, soin et rotation selon les options activées.",
        "Fonctions Double Bull : dégâts à tous, bouclier, désarmement et rotation selon les options activées.",
        "Résurrection et protection temporaire lorsqu’elles sont activées.",
      ] },
      { title: "ÉLIMINATION", body: "Dans Killer classique, un joueur à 0 vie est éliminé. Le dernier joueur vivant gagne." },
      { title: "KILLER PROGRESSIF", body: "Tous commencent à 0 cœur. Sur son propre numéro : simple = +1, double = +2, triple = +3, jusqu’à 5. À 5 cœurs le statut Killer est actif. Sous 5 il est perdu. À 0 cœur le joueur reste vivant ; l’élimination arrive seulement sous 0." },
    ],
    configuration: [
      { title: "PARTICIPANTS / BOTS", bullets: ["Au moins 2 joueurs.", "Bots IA activables.", "Ordre de départ configurable."] },
      { title: "ATTRIBUTION DES NUMÉROS", bullets: ["Choix manuel.", "Numéros aléatoires.", "1er lancer = choisir son numéro."] },
      { title: "VIES DE DÉPART", body: "Nombre de vies identique pour tous les joueurs ; les valeurs proposées par l’écran vont de 1 à 6." },
      { title: "DEVENIR KILLER", bullets: ["Toucher son numéro — simple.", "Double sur son numéro."] },
      { title: "DÉGÂTS", bullets: ["-1 par hit.", "Multiplicateur Simple / Double / Triple."] },
      { title: "BULL / DOUBLE BULL", body: "Les fonctions spéciales peuvent être activées séparément et certaines sont exclusives pour éviter des règles contradictoires. L’écran propose notamment dégâts, soins, bouclier, désarmement et rotations." },
      { title: "RÉSURRECTION", body: "Peut être désactivée, limitée à un joueur, appliquée à tous une fois, ou rendue illimitée selon la configuration. Le nombre de vies rendu au ressuscité est réglable." },
      { title: "CONDITION DE VICTOIRE", body: "Être le dernier joueur encore vivant." },
    ],
  },

  cricket: {
    rules: [
      { title: "CIBLES", body: "Le Cricket se joue sur les secteurs 15, 16, 17, 18, 19, 20 et Bull. Une cible est fermée lorsqu’elle atteint le nombre de marques demandé." },
      { title: "MARQUES", body: "Simple = 1 marque, Double = 2 marques, Triple = 3 marques." },
      { title: "VICTOIRE", body: "Selon la variante, il faut fermer toutes les cibles et respecter la condition de score choisie. Les variantes sans points ou Cut-Throat modifient la façon dont les points sont comptés." },
    ],
  },

  shanghai: {
    rules: [
      { title: "PRINCIPE", body: "La cible change à chaque manche, généralement 1 puis 2 puis 3, jusqu’à la limite configurée. Seules les touches du numéro du round comptent." },
      { title: "SHANGHAI", body: "Un Shanghai consiste à réaliser **Simple + Double + Triple** du numéro actif dans la même volée de 3 fléchettes." },
      { title: "VICTOIRE", body: "Selon la configuration, un Shanghai peut donner une victoire immédiate ; sinon le classement final se fait au total de points." },
    ],
  },

  five_lives: {
    rules: [
      { title: "PRINCIPE", body: "Chaque joueur commence avec un nombre de vies défini. À son tour, il doit réaliser **strictement plus** que le score total de la volée précédente." },
      { title: "ÉCHEC", body: "Si le joueur n’y parvient pas, il perd une vie. À 0 vie il est éliminé." },
      { title: "VICTOIRE", body: "Le dernier joueur qui possède encore des vies gagne." },
    ],
  },

  scram: {
    configuration: [
      { title: "BOTS IA", body: "Difficulté : **Facile / Normal / Difficile**." },
      { title: "RÈGLES", bullets: ["Bull inclus ou non.", "Choix du premier bloqueur.", "Cap de rounds par phase."] },
      { title: "SAISIE", bullets: ["Keypad compact.", "Cible interactive."] },
    ],
  },

  shooter: {
    configuration: [
      { title: "PARCOURS", bullets: ["Séquence classique 20 → 15.", "Tour 1 → 20.", "PRO : pairs 20 → 2.", "Ordre aléatoire.", "Nombre de cibles configurable."] },
      { title: "ZONE VALIDE", bullets: ["Segment complet Simple / Double / Triple.", "Simple uniquement.", "Double uniquement.", "Triple uniquement."] },
      { title: "VALIDATION", bullets: ["Nombre de marks pour valider.", "Option terminer par Bull.", "Limite de rounds ou illimitée.", "Gestion de l’échec 0/3 et de sa pénalité."] },
      { title: "SAISIE", bullets: ["Keypad X01.", "Cible interactive."] },
    ],
  },

  mario_kart: {
    configuration: [
      { title: "CIRCUIT", bullets: ["30 cases · Court.", "40 cases · Standard.", "50 cases · Long.", "60 cases · Endurance.", "Nombre de tours configurable."] },
      { title: "STYLE DE COURSE", bullets: ["Sprint · pur pilotage.", "Arcade · équilibré.", "Chaos · effets renforcés."] },
      { title: "ARCADE", bullets: ["Cases spéciales.", "Collisions.", "Ordre aléatoire.", "Limite de rounds ou illimitée."] },
      { title: "SAISIE", bullets: ["Keypad X01.", "Cible interactive."] },
    ],
  },

  ocean_control: {
    configuration: [
      { title: "ORGANISATION", bullets: ["Joueurs ou équipes.", "Difficulté Recrue / Capitaine / Amiral.", "Niveau des bots Facile / Normal / Difficile."] },
      { title: "PLACEMENT", bullets: ["Automatique ou manuel.", "Numéros de grille dans l’ordre 1–20 ou aléatoires."] },
      { title: "FORMAT", bullets: ["1 manche.", "Best Of 3.", "Best Of 5."] },
      { title: "RÈGLES SPÉCIALES", bullets: ["Sonar au Bull.", "Frappe Double Bull.", "Gestion d’un tir déjà effectué."] },
      { title: "SAISIE", bullets: ["Keypad.", "Cible tactile."] },
    ],
  },

  cargo: {
    configuration: [
      { title: "PARTICIPANTS / IA", bullets: ["Individuel ou Équipes / Convoi.", "Niveau des bots : Apprenti / Routier / Expert logistique."] },
      { title: "PARTIE", bullets: ["Variante.", "Nombre de tours.", "Contrats visibles ou masqués.", "Ordre aléatoire."] },
      { title: "RÈGLE DE SÉRIE", bullets: ["Segment exact Simple / Double / Triple ou même numéro.", "Série minimale et série maximale.", "Conserver ou non la série entre les tours."] },
      { title: "ERREURS / MISS", bullets: ["Sécuriser.", "Valider partiellement.", "Perdre la charge.", "Refuser la palette.", "Pénalité.", "Décharger."] },
      { title: "CAMION", bullets: ["Capacité du camion.", "Charge cible.", "Comportement en cas de surcharge.", "Palettes fragiles.", "Contrats urgents."] },
      { title: "BULL", bullets: ["Bull : 25 kg ou Joker selon le réglage.", "Double Bull : 50 kg, validation de palette ou protection selon le réglage."] },
      { title: "SAISIE", bullets: ["Clavier.", "Cible interactive."] },
    ],
  },

  bobs_27: {
    configuration: [
      { title: "PARCOURS", bullets: ["Score de départ.", "Premier double.", "Dernier double.", "Option terminer par Double Bull."] },
      { title: "SOUS 0", bullets: ["Élimination — classique.", "Continuer en négatif."] },
      { title: "AUTRES OPTIONS", bullets: ["Ordre aléatoire.", "Bots IA et difficulté Facile / Normal / Difficile.", "Keypad X01 ou cible interactive."] },
    ],
  },

  golf: {
    configuration: [
      { title: "PARTICIPANTS", bullets: ["Mode équipes activable.", "Nombre d’équipes.", "Bots IA et difficulté Easy / Normal / Hard."] },
      { title: "PARCOURS", bullets: ["9 ou 18 trous.", "Ordre chronologique ou aléatoire.", "Ordre de départ."] },
      { title: "SCORING", bullets: ["Strokes ou Points.", "Pénalité en cas de Miss.", "Affichage de la grille des trous."] },
    ],
  },

  president: {
    configuration: [
      { title: "FORMAT", bullets: ["Nombre de manches.", "Cartes par joueur.", "Copies des cartes 1 à 20.", "Ordre de départ aléatoire."] },
      { title: "MODE", bullets: ["Président classique.", "Président Chaos."] },
      { title: "EFFETS SPÉCIAUX", bullets: ["Bull = Joker simple.", "Double Bull = Coup d’État.", "Triple 20 = Révolution."] },
      { title: "SAISIE / IA", bullets: ["Keypad X01 ou cible interactive.", "Difficulté IA Facile / Normal / Difficile."] },
    ],
  },

  darts_poker: {
    configuration: [
      { title: "FORMAT", bullets: ["Nombre de manches.", "Fléchettes par main.", "Ordre aléatoire."] },
      { title: "VISIBILITÉ / BONUS", bullets: ["Mains adverses visibles ou masquées.", "Doubles / Triples spéciaux.", "Double Bull = Joker.", "Contrat bonus par manche."] },
      { title: "BOTS / SAISIE", bullets: ["Niveau Débutant / Joueur / Shark.", "Clavier ou cible interactive."] },
    ],
  },

  baseball: {
    configuration: [
      { title: "FORMAT DU MATCH", bullets: ["Nombre de manches.", "Manches supplémentaires.", "Maximum supplémentaire.", "Règle de la 7e manche."] },
      { title: "RÈGLES", bullets: ["Ordre de passage aléatoire.", "Miss = fin du tour selon l’option.", "Règle Bull / Double Bull et valeur du Bull."] },
      { title: "VARIANTE", bullets: ["Cibles aléatoires — Baseball.", "Attaque / Défense — cible par manche."] },
      { title: "IA / SAISIE", bullets: ["Facile / Normal / Difficile.", "Keypad ou cible interactive."] },
    ],
  },

  bowling: {
    configuration: [
      { title: "FORMAT", bullets: ["Best Of 1 — 1 partie.", "Best Of 3 — 2 victoires.", "Best Of 5 — 3 victoires."] },
      { title: "CONVERSION DARTS → QUILLES", bullets: ["Niveau Facile — plus de quilles.", "Normal — équilibré.", "Difficile — exigeant.", "Bull / Double Bull = Strike selon l’option.", "Double = Spare au 2e lancer selon l’option."] },
      { title: "AUTRES OPTIONS", bullets: ["Ordre aléatoire.", "Bots IA Facile / Normal / Difficile.", "Keypad X01 ou cible interactive."] },
    ],
  },

  halve_it: {
    configuration: [
      { title: "PARCOURS", bullets: ["Classique · 7 cibles.", "Étendu · 9 cibles.", "Débutant · numéros + Bull.", "Expert · 12 cibles."] },
      { title: "DÉPART", bullets: ["0 point — classique simple.", "Capital fixe.", "Volée libre initiale."] },
      { title: "DIVISION", bullets: ["Arrondi inférieur — standard.", "Arrondi supérieur."] },
      { title: "AUTRES OPTIONS", bullets: ["Ordre aléatoire.", "Bots IA Facile / Normal / Difficile.", "Keypad X01 ou cible interactive."] },
    ],
  },

  prisoner: {
    configuration: [
      { title: "PARCOURS", bullets: ["Sens du dartboard — classique.", "Numérique 1 → 20.", "Fléchettes de départ configurables."] },
      { title: "PRISONNIERS / ÉLIMINATION", bullets: ["Miss hors cible = fléchette perdue 1 tour selon l’option.", "Élimination lorsqu’aucune fléchette n’est jouable selon l’option.", "Ordre joueurs aléatoire."] },
      { title: "IA / SAISIE", bullets: ["Facile / Normal / Difficile.", "Keypad X01 + intérieur/extérieur.", "Cible interactive précise."] },
    ],
  },

  loterie: {
    configuration: [
      { title: "CARTONS", bullets: ["Cartons par participant.", "Cases par carton.", "Carton personnel ou commun à tous."] },
      { title: "MODE / VOLÉE", bullets: ["Loterie ou Express.", "Volée 3 darts ou Libre.", "Simple / Double / Triple selon le réglage."] },
      { title: "EXPRESS", bullets: ["1 fléchette.", "Jusqu’à 3 essais.", "Un échec peut consommer un essai ou passer immédiatement le tour selon la règle."] },
      { title: "AFFICHAGE", bullets: ["Numéros restants masqués ou affichés."] },
    ],
  },

  capital: {
    configuration: [
      { title: "BOTS IA", bullets: ["Auto-play activable.", "Vitesse Très rapide / Rapide / Lent / Très lent.", "Prise de risque Prudente / Normale / Agressive.", "Comportement Easy / Hard / Safe / Aggressive."] },
      { title: "PARTIE", bullets: ["Ordre de départ aléatoire ou ordre de sélection.", "Départ Officiel — 15 contrats — ou Custom."] },
      { title: "VICTOIRE / RÈGLES", bullets: ["Meilleur score — Officiel.", "Score cible.", "Meilleur total — dernier contrat."] },
      { title: "TEMPS / SAISIE", bullets: ["Chrono Off ou 15 / 20 / 30 / 45 / 60 secondes.", "Keypad ou cible."] },
    ],
  },

  darts_firefighter: {
    configuration: [
      { title: "MISSION", bullets: ["Choix du scénario et de la difficulté : Recrue, Pompier, Commandant, Inferno ou profils proposés.", "Mission préconfigurée ou personnalisée selon l’écran."] },
      { title: "BRIGADE", body: "Composition des joueurs / équipes / bots selon le scénario et les options disponibles." },
      { title: "CARTE ET INCENDIE", bullets: ["Choix de la carte et des zones.", "Situation initiale.", "Front groupé ou zones proches critiques selon le réglage.", "Rythme de propagation et risque."] },
      { title: "VENT", bullets: ["Direction aléatoire ou réglée.", "Intensité Brise / Normal / Fort.", "Changement après joueur ou après round selon l’option."] },
      { title: "BULL / CANADAIR", bullets: ["Déclenchement selon zone choisie ou priorité auto.", "Puissance 1, 2 ou 3 unités selon le réglage."] },
      { title: "VOLÉE / SAISIE", bullets: ["1 · Éclair, 2 · Tactique, 3 · Standard selon le format proposé.", "Clavier ou cible interactive."] },
    ],
  },
};

function renderSections(sections: Section[]) {
  return sections.map((section) => {
    const lines: string[] = [`## ${section.title}`];
    if (section.body) lines.push(section.body);
    if (section.bullets?.length) lines.push(...section.bullets.map((item) => `- ${item}`));
    if (section.note) lines.push(`> ${section.note}`);
    return lines.join("\n");
  }).join("\n\n");
}

export function detailedRulesText(mode: AwenaModeLike) {
  const deep = DEEP[mode.id]?.rules;
  if (deep?.length) return renderSections(deep);

  const sections: Section[] = [
    { title: "PRINCIPE", body: mode.summary },
    { title: "CONDITION DE VICTOIRE", body: mode.victoryCondition },
  ];
  if (mode.variants?.length) sections.push({ title: "VARIANTES / CHOIX", bullets: mode.variants });
  return renderSections(sections);
}

export function detailedConfigurationText(mode: AwenaModeLike) {
  const deep = DEEP[mode.id]?.configuration;
  const participantLine = mode.maxPlayers === 1
    ? "Solo."
    : `Jusqu’à ${mode.maxPlayers} joueurs.${mode.supportsTeams ? " Équipes prises en charge." : " Pas d’équipes dans le registre actuel."}${mode.supportsBots ? " Bots IA pris en charge." : " Pas de bots IA dans le registre actuel."}`;

  const sections: Section[] = [
    { title: `CONFIGURATION — ${mode.label.toUpperCase()}`, body: participantLine },
    ...(deep?.length ? deep : [{ title: "OPTIONS DISPONIBLES", body: mode.configuration }]),
    { title: "CONDITION DE VICTOIRE", body: mode.victoryCondition },
  ];
  if (mode.variants?.length && !deep?.some((s) => /variante/i.test(s.title))) {
    sections.push({ title: "VARIANTES / CHOIX", bullets: mode.variants });
  }
  sections.push({ title: "DANS L’APPLICATION", body: mode.howToPlayInApp });
  return renderSections(sections);
}
