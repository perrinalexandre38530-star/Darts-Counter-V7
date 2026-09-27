// =============================================================
// src/games/dartsWave61.ts
// Backlog officiel — VAGUE 61
//
// Ces 61 modes sont branchés sur les moteurs mutualisés Wave61 V3.
// Ils sont jouables en prototype fonctionnel (config, scoring par dart, bots,
// undo, sauvegarde/reprise, fin de partie) puis seront finalisés au cas par cas.
// Les médias lourds restent externalisés pour préserver le budget Android.
// =============================================================

export type DartsWave61Category = "classic" | "variant" | "challenge" | "fun" | "training";

export type DartsWave61Spec = {
  id: string;
  label: string;
  category: DartsWave61Category;
  subCategory: string;
  maxPlayers: number;
  supportsTeams: boolean;
  supportsBots: boolean;
  infoBody: string;
};

export const DARTS_WAVE_61: readonly DartsWave61Spec[] = [
  { id: "tug_rush", label: "TUG RUSH", category: "challenge", subCategory: "duel", maxPlayers: 12, supportsTeams: true, supportsBots: true, infoBody: "Duel façon tir à la corde : chaque réussite déplace une jauge centrale vers ton camp. Les doubles et triples tirent plus fort ; victoire en atteignant l'extrémité adverse." },
  { id: "demineur", label: "DÉMINEUR", category: "fun", subCategory: "reflexion", maxPlayers: 12, supportsTeams: true, supportsBots: true, infoBody: "Une grille liée aux secteurs 1 à 20 cache des mines. Révèle les cases, utilise les indices et évite les explosions pour sécuriser le plateau avant tes adversaires." },
  { id: "heist_180", label: "HEIST 180", category: "fun", subCategory: "strategie", maxPlayers: 12, supportsTeams: true, supportsBots: true, infoBody: "Prépare un casse, ouvre le coffre, accumule le butin puis réussis l'évasion avant que l'alarme ne devienne incontrôlable." },
  { id: "hot_potato", label: "HOT POTATO", category: "fun", subCategory: "party", maxPlayers: 12, supportsTeams: true, supportsBots: true, infoBody: "La patate chaude circule entre les joueurs. Réussis tes objectifs pour la transmettre avant l'explosion du compte à rebours et conserve tes vies." },
  { id: "zombie_siege", label: "ZOMBIE SIEGE", category: "fun", subCategory: "survie", maxPlayers: 12, supportsTeams: true, supportsBots: true, infoBody: "Survivants contre zombies : attaques, défense, contamination et retournement de camp jusqu'à la victoire des survivants ou de la horde." },
  { id: "replicat", label: "REPLICAT", category: "challenge", subCategory: "precision", maxPlayers: 12, supportsTeams: false, supportsBots: true, infoBody: "Reproduis le lancer du joueur précédent. Selon la difficulté, il faut copier le numéro, le multiplicateur ou toute la séquence exacte." },
  { id: "knockback", label: "KNOCKBACK", category: "challenge", subCategory: "elimination", maxPlayers: 12, supportsTeams: false, supportsBots: true, infoBody: "Course au score exact avec collisions : rejoindre exactement le score d'un adversaire déclenche une attaque et le repousse selon la variante choisie." },
  { id: "double_down", label: "DOUBLE DOWN", category: "classic", subCategory: "electronic", maxPlayers: 12, supportsTeams: false, supportsBots: true, infoBody: "Enchaîne des cibles imposées. Si tu rates complètement la cible du round, ton score est divisé par deux. Variantes de parcours prévues." },
  { id: "nine_dart_century", label: "9 DART CENTURY", category: "classic", subCategory: "electronic", maxPlayers: 12, supportsTeams: false, supportsBots: true, infoBody: "Tu disposes de neuf fléchettes pour approcher au mieux l'objectif de 100 sans le dépasser. Des objectifs alternatifs pourront être configurés." },
  { id: "shove_a_penny", label: "SHOVE A PENNY", category: "classic", subCategory: "traditional", maxPlayers: 12, supportsTeams: false, supportsBots: true, infoBody: "Adaptation darts du jeu traditionnel : complète les cases requises, transforme les surplus en opportunités et ferme ton tableau avant les autres." },
  { id: "green_vs_red", label: "GREEN VS RED", category: "classic", subCategory: "electronic", maxPlayers: 12, supportsTeams: true, supportsBots: true, infoBody: "Deux camps suivent des parcours opposés sur les zones rouges et vertes de la cible. Toucher le mauvais camp peut offrir des points à l'adversaire." },
  { id: "hi_score", label: "HI SCORE", category: "classic", subCategory: "electronic", maxPlayers: 12, supportsTeams: true, supportsBots: true, infoBody: "Choisis un nombre de tours, marque le plus de points possible et termine avec le meilleur total. Un mode rapide, lisible et compétitif." },
  { id: "un_deux_trois_soleil", label: "1, 2, 3 SOLEIL", category: "fun", subCategory: "party", maxPlayers: 12, supportsTeams: false, supportsBots: true, infoBody: "Avance pendant les phases autorisées et évite les pénalités lorsque le jeu passe en STOP. Le premier joueur à atteindre l'arrivée gagne." },
  { id: "le_loup", label: "LE LOUP", category: "fun", subCategory: "party", maxPlayers: 12, supportsTeams: false, supportsBots: true, infoBody: "Un joueur devient le loup et poursuit les autres. Les bonnes zones permettent de fuir, rattraper ou transmettre le rôle." },
  { id: "chat_souris", label: "CHAT & SOURIS", category: "fun", subCategory: "arcade", maxPlayers: 12, supportsTeams: true, supportsBots: true, infoBody: "La souris progresse sur un parcours tandis que le chat réduit l'écart. Chaque fléchette peut accélérer la fuite ou déclencher la capture." },
  { id: "eperviers", label: "LES ÉPERVIERS", category: "fun", subCategory: "party", maxPlayers: 12, supportsTeams: false, supportsBots: true, infoBody: "Traverse le terrain de cible en évitant l'Épervier. Les joueurs capturés changent la pression de la manche jusqu'au dernier survivant." },
  { id: "colin_maillard", label: "COLIN-MAILLARD", category: "fun", subCategory: "reflexion", maxPlayers: 12, supportsTeams: true, supportsBots: true, infoBody: "Mode mémoire et déduction : des informations sont masquées ou révélées progressivement et les joueurs doivent retrouver les bonnes zones." },
  { id: "ballon_prisonnier", label: "BALLON PRISONNIER", category: "fun", subCategory: "battle", maxPlayers: 12, supportsTeams: true, supportsBots: true, infoBody: "Attaque les adversaires, esquive, perds des vies et libère les prisonniers grâce à des zones spéciales. Pensé pour joueurs ou équipes." },
  { id: "final_buzzer", label: "FINAL BUZZER", category: "fun", subCategory: "party", maxPlayers: 12, supportsTeams: true, supportsBots: true, infoBody: "Défis chronométrés par équipes avec plusieurs manches et contraintes successives. Le buzzer final transforme chaque seconde en pression." },
  { id: "maze_chase", label: "MAZE CHASE", category: "fun", subCategory: "arcade", maxPlayers: 12, supportsTeams: false, supportsBots: true, infoBody: "Traverse un labyrinthe, collecte des bonus et échappe aux poursuivants. Les secteurs de la cible pilotent déplacements, raccourcis et pouvoirs." },
  { id: "chien_chat", label: "CHIEN & CHAT", category: "fun", subCategory: "arcade", maxPlayers: 12, supportsTeams: true, supportsBots: true, infoBody: "Deux parcours concurrents opposent chiens et chats avec bonus, raccourcis et événements spécifiques. Une course distincte de Chat & Souris." },
  { id: "escape_game", label: "ESCAPE GAME", category: "fun", subCategory: "reflexion", maxPlayers: 12, supportsTeams: true, supportsBots: true, infoBody: "Résous une suite d'énigmes darts : codes, clés, séquences et cadenas à ouvrir avant la fin du temps imparti." },
  { id: "iceberg", label: "ICEBERG", category: "fun", subCategory: "survie", maxPlayers: 12, supportsTeams: true, supportsBots: true, infoBody: "Maintiens ton navire à flot : intégrité, compartiments, réparations et événements maritimes jusqu'à la survie ou l'évacuation finale." },
  { id: "objectif_lune", label: "OBJECTIF LUNE", category: "fun", subCategory: "science", maxPlayers: 12, supportsTeams: true, supportsBots: true, infoBody: "Prépare le carburant, décolle, atteins l'orbite puis réussis l'alunissage. Les multiplicateurs déterminent puissance, précision et consommation." },
  { id: "golden_dart", label: "GOLDEN DART", category: "challenge", subCategory: "precision", maxPlayers: 12, supportsTeams: false, supportsBots: true, infoBody: "Une cible dorée secrète ou mouvante offre un énorme bonus. Les indices s'accumulent jusqu'à ce qu'un joueur trouve la zone parfaite." },
  { id: "roller_coaster", label: "ROLLER COASTER", category: "fun", subCategory: "arcade", maxPlayers: 12, supportsTeams: false, supportsBots: true, infoBody: "Parcours de montagnes russes avec montées, descentes, rails, aiguillages et boosts. Gère ta vitesse jusqu'à l'arrivée." },
  { id: "jackpot", label: "JACKPOT", category: "fun", subCategory: "arcade", maxPlayers: 12, supportsTeams: false, supportsBots: true, infoBody: "Chaque volée génère une combinaison. Aligne valeurs et symboles pour déclencher multiplicateurs, mini-jackpots et jackpot majeur." },
  { id: "hollywood", label: "HOLLYWOOD", category: "fun", subCategory: "arcade", maxPlayers: 12, supportsTeams: true, supportsBots: true, infoBody: "Tourne ton film scène après scène : cascade, précision, box-office et finale. Chaque round propose un objectif cinématographique différent." },
  { id: "saut_a_la_corde", label: "SAUT À LA CORDE", category: "challenge", subCategory: "performance", maxPlayers: 12, supportsTeams: true, supportsBots: true, infoBody: "Construis une série rythmée de réussites. Les multiplicateurs accélèrent le tempo tandis qu'un MISS peut casser le combo." },
  { id: "athletisme", label: "ATHLÉTISME", category: "challenge", subCategory: "performance", maxPlayers: 12, supportsTeams: true, supportsBots: true, infoBody: "Un mini-meeting d'athlétisme adapté aux fléchettes : sprint, haies, sauts, lancers, relais et classement général aux points." },
  { id: "calendrier_maya", label: "CALENDRIER MAYA", category: "fun", subCategory: "mythes", maxPlayers: 12, supportsTeams: false, supportsBots: true, infoBody: "Progresse dans des cycles mayas, complète des séquences et affronte éclipses, temples et événements jusqu'au cycle final." },
  { id: "chute_libre", label: "CHUTE LIBRE", category: "fun", subCategory: "extreme", maxPlayers: 12, supportsTeams: false, supportsBots: true, infoBody: "Perds de l'altitude à chaque lancer, contrôle ta trajectoire et ouvre le parachute dans la bonne fenêtre pour éviter le crash." },
  { id: "tyrolien", label: "LE TYROLIEN", category: "fun", subCategory: "extreme", maxPlayers: 12, supportsTeams: false, supportsBots: true, infoBody: "Course suspendue entre plateformes : progression, boosts et freinages déterminent qui atteint l'autre rive en premier." },
  { id: "mont_blanc", label: "MONT BLANC", category: "fun", subCategory: "extreme", maxPlayers: 12, supportsTeams: true, supportsBots: true, infoBody: "Ascension tactique avec camps, météo, fatigue et choix d'itinéraire. Atteins le sommet avant les autres sans épuiser ton équipe." },
  { id: "everest", label: "EVEREST", category: "fun", subCategory: "extreme", maxPlayers: 12, supportsTeams: true, supportsBots: true, infoBody: "Une ascension extrême : acclimatation, oxygène, météo, camps et zone de la mort jusqu'au sommet." },
  { id: "summit_14", label: "SUMMIT 14", category: "fun", subCategory: "extreme", maxPlayers: 12, supportsTeams: true, supportsBots: true, infoBody: "Campagne d'alpinisme consacrée aux quatorze sommets de plus de 8 000 mètres, avec progression persistante et contraintes propres à chaque montagne." },
  { id: "mafia", label: "MAFIA", category: "fun", subCategory: "strategie", maxPlayers: 16, supportsTeams: true, supportsBots: true, infoBody: "Rôles cachés, phases de nuit et de jour, actions secrètes et accusations. Les performances aux darts influencent les pouvoirs sans révéler immédiatement les camps." },
  { id: "vikings", label: "VIKINGS", category: "fun", subCategory: "histoire", maxPlayers: 12, supportsTeams: true, supportsBots: true, infoBody: "Conquiers des territoires, lance des raids, protège tes villages et fais progresser ton clan nordique jusqu'à la domination." },
  { id: "codebreaker", label: "CODEBREAKER", category: "fun", subCategory: "reflexion", maxPlayers: 12, supportsTeams: false, supportsBots: true, infoBody: "Déduis un code secret composé de zones de la cible. Après chaque tentative, des indices indiquent ce qui est correct et correctement placé." },
  { id: "black_flag", label: "BLACK FLAG", category: "fun", subCategory: "aventure", maxPlayers: 12, supportsTeams: true, supportsBots: true, infoBody: "Explore des îles, accumule du butin, affronte tempêtes et équipages rivaux puis remporte la bataille maritime finale." },
  { id: "pyramides", label: "PYRAMIDES", category: "fun", subCategory: "aventure", maxPlayers: 12, supportsTeams: true, supportsBots: true, infoBody: "Explore une pyramide salle après salle, déjoue les pièges, interprète les symboles et atteins le trésor avant tes rivaux." },
  { id: "menhir_mayhem", label: "MENHIR MAYHEM", category: "fun", subCategory: "histoire", maxPlayers: 12, supportsTeams: true, supportsBots: true, infoBody: "Univers gaulois original : défends ton village, lance des menhirs, repousse les envahisseurs et conquiers la carte." },
  { id: "attila", label: "ATTILA", category: "fun", subCategory: "histoire", maxPlayers: 12, supportsTeams: true, supportsBots: true, infoBody: "Mode de conquête offensif : raids, cités, pression territoriale et progression d'armée jusqu'à la domination de la carte." },
  { id: "poseidon", label: "POSÉIDON", category: "fun", subCategory: "mythes", maxPlayers: 12, supportsTeams: true, supportsBots: true, infoBody: "Maîtrise les mers, déclenche tempêtes et vagues, affronte les créatures marines et impose ton pouvoir sur les océans." },
  { id: "cosmo_knights", label: "COSMO KNIGHTS", category: "fun", subCategory: "mythes", maxPlayers: 12, supportsTeams: true, supportsBots: true, infoBody: "Chevaliers cosmiques originaux, constellations, armures et maisons successives : monte en puissance jusqu'au duel final." },
  { id: "draco_spheres", label: "DRACO SPHERES", category: "fun", subCategory: "mythes", maxPlayers: 12, supportsTeams: true, supportsBots: true, infoBody: "Collecte sept orbes mystiques, charge ton énergie, débloque des transformations et affronte des adversaires de plus en plus puissants." },
  { id: "mythologie", label: "MYTHOLOGIE", category: "fun", subCategory: "mythes", maxPlayers: 12, supportsTeams: true, supportsBots: true, infoBody: "Une campagne inspirée des mythes : divinités, reliques, créatures et épreuves modifient les règles au fil de l'aventure." },
  { id: "jardinier", label: "LE JARDINIER", category: "fun", subCategory: "nature", maxPlayers: 12, supportsTeams: false, supportsBots: true, infoBody: "Sème, arrose, fais pousser, protège et récolte ton jardin. La météo et les parasites peuvent bouleverser la partie." },
  { id: "microscopia", label: "MICROSCOPIA", category: "fun", subCategory: "science", maxPlayers: 12, supportsTeams: true, supportsBots: true, infoBody: "Explore un monde microscopique peuplé de colonies, cellules, insectes et dangers invisibles. Survie, mutation et exploration structurent la progression." },
  { id: "disjoncte", label: "DISJONCTÉ", category: "fun", subCategory: "science", maxPlayers: 12, supportsTeams: true, supportsBots: true, infoBody: "Alimente un circuit géant sans provoquer de surcharge. Fusibles, interrupteurs, courts-circuits et générateurs réagissent à chaque lancer." },
  { id: "jurassic_dart", label: "JURASSIC DART", category: "fun", subCategory: "aventure", maxPlayers: 12, supportsTeams: true, supportsBots: true, infoBody: "Expédition préhistorique originale : explore, collecte fossiles et ADN, sécurise les enclos et survis aux dinosaures jusqu'à l'évasion finale." },

  { id: "face_mystere", label: "FACE MYSTÈRE", category: "fun", subCategory: "reflexion", maxPlayers: 12, supportsTeams: true, supportsBots: true, infoBody: "Notre jeu de déduction : chaque camp possède un personnage secret. Les fléchettes servent à obtenir des indices, éliminer des portraits et tenter l’identification avant les adversaires." },
  { id: "align_4", label: "ALIGN 4", category: "fun", subCategory: "reflexion", maxPlayers: 12, supportsTeams: true, supportsBots: true, infoBody: "Notre adaptation darts du quatre-alignés : les réussites permettent de placer des jetons dans une grille. Aligne quatre jetons horizontalement, verticalement ou en diagonale avant l’adversaire." },
  { id: "spartacus", label: "SPARTACUS", category: "fun", subCategory: "histoire", maxPlayers: 12, supportsTeams: true, supportsBots: true, infoBody: "Combats d’arène inspirés de l’Antiquité : gagne des duels, protège ton gladiateur, déclenche des attaques et progresse jusqu’au combat final." },
  { id: "cheval_de_troie", label: "LE CHEVAL DE TROIE", category: "fun", subCategory: "histoire", maxPlayers: 12, supportsTeams: true, supportsBots: true, infoBody: "Mode siège et infiltration : construis le cheval, franchis les défenses, infiltre la cité puis accomplis les objectifs avant que les défenseurs ne te repoussent." },

  { id: "sniper", label: "SNIPER", category: "challenge", subCategory: "precision", maxPlayers: 12, supportsTeams: true, supportsBots: true, infoBody: "Missions de précision pure : chaque manche assigne une cible ou une zone à atteindre avec le moins d'essais possible. Enchaîne les impacts exacts, protège ton combo et réussis les contrats les plus difficiles." },
  { id: "petit_bac", label: "LE PETIT BAC", category: "fun", subCategory: "party", maxPlayers: 12, supportsTeams: true, supportsBots: true, infoBody: "Adaptation darts du jeu de catégories : les lancers déterminent lettres, thèmes ou contraintes, puis les joueurs doivent compléter un maximum de réponses valides avant la fin du chrono." },
  { id: "luciole", label: "LUCIOLE", category: "challenge", subCategory: "precision", maxPlayers: 12, supportsTeams: true, supportsBots: true, infoBody: "La cible plonge dans l'obscurité et seules certaines zones s'illuminent brièvement. Mémorise les éclats, capture la lumière et maintiens ta chaîne avant que les lucioles ne disparaissent." },
  { id: "sabaudia_dauphine", label: "SABAUDIA & DAUPHINÉ", category: "fun", subCategory: "histoire", maxPlayers: 12, supportsTeams: true, supportsBots: true, infoBody: "Duel alpin de territoires : choisis ton camp, conquiers vallées, cols et forteresses, défends tes positions et fais basculer la carte entre Sabaudia et Dauphiné." },
  { id: "galaxies", label: "GALAXIES", category: "fun", subCategory: "science", maxPlayers: 12, supportsTeams: true, supportsBots: true, infoBody: "Conquête cosmique à grande échelle : explore des systèmes, colonise des planètes, traverse des anomalies et contrôle un maximum de secteurs avant la bataille galactique finale." },
  { id: "apocalypse", label: "APOCALYPSE", category: "fun", subCategory: "survie", maxPlayers: 12, supportsTeams: true, supportsBots: true, infoBody: "Survis à l’effondrement du monde : sécurise des ressources, protège ton refuge, traverse des catastrophes et reste en vie jusqu’au scénario final. Chaque manche peut modifier les zones sûres et les menaces." },
] as const;

if (DARTS_WAVE_61.length !== 61) {
  throw new Error(`[DARTS_WAVE_61] Catalogue invalide : ${DARTS_WAVE_61.length} modes au lieu de 61.`);
}

const WAVE_61_IDS = new Set(DARTS_WAVE_61.map((mode) => mode.id));
if (WAVE_61_IDS.size !== DARTS_WAVE_61.length) {
  throw new Error(`[DARTS_WAVE_61] Catalogue invalide : identifiants dupliqués détectés.`);
}

export default DARTS_WAVE_61;
