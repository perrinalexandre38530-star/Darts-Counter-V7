import { dartsGameRegistry, type DartsGameDef } from "../games/dartsGameRegistry";
import { getAwenaModeConfigDetail } from "./AwenaConfigKnowledge";
import type { AwenaAction, AwenaReply, AwenaRuntimeContext } from "./awena.types";

type MasterEntry = { id: string; sport: string; title: string; aliases: string[]; text: string; route?: string };

function norm(value: string) { return String(value || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[’']/g, " ").replace(/[_/\\-]+/g, " ").replace(/[^a-z0-9+%\s]/g, " ").replace(/\s+/g, " ").trim(); }

const ENTRIES: MasterEntry[] = [
  {
    id: "sports-catalogue", sport: "app", title: "Sports disponibles",
    aliases: ["sports disponibles", "quels sports", "liste des sports", "sports dans application", "sports bientot"],
    text: "## SPORTS DANS MULTISPORTS SCORING\n**Actifs dans le sélecteur actuel** : Fléchettes, Pétanque, Ping-Pong, Baby-Foot, Mölkky, Dice Game et FOOT.\n\n## SPORTS AFFICHÉS COMME À VENIR\nTir à l’arc, Padel, Pickleball, Frisbee, Billard, Badminton, Basket, Cornhole, Rugby, Volley, Tennis et Échecs sont présents dans le sélecteur mais désactivés / annoncés comme bientôt.\n\n> Le Rugby annoncé comme sport complet est distinct du mode Darts Rugby de la section Fléchettes.",
    route: "gameSelect",
  },
  {
    id: "petanque-rules", sport: "petanque", title: "Pétanque — règles de base",
    aliases: ["regles petanque", "comment jouer petanque", "mene petanque", "score 13 petanque"],
    text: "## PÉTANQUE — PRINCIPE\nLa partie est découpée en **mènes**. À la fin d’une mène, seul le camp dont la boule la mieux placée est la plus proche du but marque.\n\n## COMPTAGE\nLe camp gagnant marque autant de points qu’il possède de boules mieux placées que la meilleure boule adverse. La partie standard vise **13 points**.\n\n## MÈNE SUIVANTE\nLe camp qui marque garde normalement l’initiative pour la mène suivante dans le fonctionnement prévu par l’application.",
    route: "petanque_config",
  },
  {
    id: "petanque-formats", sport: "petanque", title: "Pétanque — formats",
    aliases: ["formats petanque", "simple doublette triplette quadrette", "1v1 petanque", "2v2 petanque", "3v3 petanque", "4v4 petanque", "ffa3 petanque"],
    text: "## FORMATS PÉTANQUE\n- **Simple / tête-à-tête** : 2 joueurs, 3 boules chacun.\n- **Match à 3 / FFA3** : 3 joueurs indépendants.\n- **Doublette** : 2 contre 2, généralement 3 boules par joueur.\n- **Triplette** : 3 contre 3, généralement 2 boules par joueur.\n- **Quadrette** : 4 contre 4 ; le code actuel prévoit 2 boules par joueur.\n- **Variantes / Handicap** : compositions déséquilibrées possibles, par exemple 1V2, 2V3 ou 3V4.",
    route: "petanque_config",
  },
  {
    id: "petanque-config", sport: "petanque", title: "Pétanque — configuration",
    aliases: ["configuration petanque", "options petanque", "reglages petanque", "score cible petanque", "mesure petanque"],
    text: "## CONFIGURATION PÉTANQUE\nL’écran gère le mode, les participants / équipes, le **score cible** (13 par défaut), l’ordre de départ, les règles de lancer et les rôles.\n\n## VARIANTES / HANDICAP\nLes tailles de camps peuvent aller de 1 à 4 joueurs. Les options de compensation automatique des boules et d’adaptation automatique du score cible peuvent être activées dans les formats déséquilibrés.\n\n## MESURE\nUne option de mesure peut être autorisée selon la configuration.",
    route: "petanque_config",
  },
  {
    id: "petanque-actions", sport: "petanque", title: "Pétanque — actions et statistiques",
    aliases: ["stats petanque", "pointage bec trou carreau", "tir reussi petanque", "carreau petanque"],
    text: "## ACTIONS ENREGISTRÉES EN PÉTANQUE\nLe Play peut enregistrer notamment : **pointage, bec, trou, tir réussi, carreau**, ainsi que des actions d’assistance / concession lorsque le mode les propose.\n\n## STATS AGRÉGÉES\nL’application peut agréger mènes, points, pointages, becs, tirs, trous, tirs réussis, carreaux et indicateurs d’assistance / concession.",
    route: "petanque_stats_players",
  },
  {
    id: "petanque-leaderboards", sport: "petanque", title: "Pétanque — classements",
    aliases: ["classement petanque", "leaderboard petanque", "win rate petanque", "stats equipe petanque"],
    text: "## CLASSEMENTS PÉTANQUE\nLes classements peuvent exploiter victoires, taux de victoire, matchs, différence de points, points pour / contre et mènes.\n\n## PORTÉES\nDes vues joueurs, équipes / duos et plusieurs périodes sont prévues par le centre Stats.",
    route: "petanque_stats_leaderboards",
  },
  {
    id: "petanque-tournament", sport: "petanque", title: "Pétanque — tournoi",
    aliases: ["tournoi petanque", "round robin petanque", "elimination petanque", "poules petanque"],
    text: "## TOURNOI PÉTANQUE\nLa configuration de tournoi peut partir des formats Simple, Doublette, Triplette, Quadrette, Variantes / Handicap ou FFA3.\n\n## FORMATS DE COMPÉTITION\nLe code prévoit notamment **élimination directe** et **round-robin / toutes rondes**, avec gestion du nombre d’équipes / participants.",
    route: "petanque_tournaments",
  },
  {
    id: "pingpong-formats", sport: "pingpong", title: "Ping-Pong — formats",
    aliases: ["formats ping pong", "1v1 ping pong", "2v2 ping pong", "2v1 ping pong", "tournante ping pong"],
    text: "## FORMATS PING-PONG\nLe menu actuel propose **1V1, 2V2, 2V1, Tournante et Training**.\nLa Tournante utilise une liste de joueurs et nécessite au moins 2 participants.",
    route: "pingpong_menu",
  },
  {
    id: "pingpong-official", sport: "pingpong", title: "Ping-Pong — règles officielles",
    aliases: ["regles ping pong", "11 points ping pong", "deuce ping pong", "service ping pong"],
    text: "## PRÉRÉGLAGE OFFICIEL\nLa référence intégrée à la configuration utilise **11 points**, victoire avec **2 points d’écart**, service toutes les **2 unités**, puis alternance tous les **1 point** à égalité / deuce.\n\n> L’application permet aussi des presets Fun et Custom : la règle réellement jouée dépend donc de la configuration.",
    route: "pingpong_config",
  },
  {
    id: "pingpong-config", sport: "pingpong", title: "Ping-Pong — configuration",
    aliases: ["configuration ping pong", "options ping pong", "sets ping pong", "points par set ping pong", "service winner serves"],
    text: "## CONFIGURATION PING-PONG\n- points par set : valeur configurable, bornée par l’écran ;\n- sets à gagner : configurable ;\n- victoire par 2 points : ON / OFF ;\n- service : toutes les N unités ou variante où le gagnant sert ;\n- fréquence de service : choix proposés 1, 2 ou 5 ;\n- service au deuce : 1 ou 2 ;\n- premier serveur : manuel, A, B ou tirage via premier point ;\n- changement de côté à chaque set et au set décisif selon options.",
    route: "pingpong_config",
  },
  {
    id: "pingpong-history", sport: "pingpong", title: "Ping-Pong — historique",
    aliases: ["historique ping pong", "stats ping pong", "rejouer match ping pong"],
    text: "## HISTORIQUE PING-PONG\nLes parties enregistrent notamment le mode, le vainqueur, les sets et les points des deux camps.\n\n## REJOUER\nLe détail d’un match peut réutiliser le même mode et la même configuration pour relancer une rencontre.",
    route: "pingpong_stats_history",
  },
  {
    id: "molkky-modes", sport: "molkky", title: "Mölkky — modes",
    aliases: ["modes molkky", "classique molkky", "rapide molkky", "personnalise molkky"],
    text: "## MODES MÖLKKY\nLe menu actuel propose **Classique**, **Rapide** et **Personnalisé**.\n- Classique : cible par défaut **50**.\n- Rapide : cible par défaut **30**.\n- Personnalisé : cible réglable.",
    route: "molkky_menu",
  },
  {
    id: "molkky-rules", sport: "molkky", title: "Mölkky — comptage",
    aliases: ["regles molkky", "score molkky", "depassement 50 molkky", "trois miss molkky"],
    text: "## COMPTAGE MÖLKKY\n- une seule quille tombe : score = **numéro de la quille** ;\n- plusieurs quilles tombent : score = **nombre de quilles tombées**.\n\n## FIN / PÉNALITÉS\nLa cible doit être atteinte exactement. Le code permet le **retour à 25** en cas de dépassement et l’**élimination après 3 MISS**, selon les options activées.",
    route: "molkky_config",
  },
  {
    id: "molkky-config", sport: "molkky", title: "Mölkky — configuration",
    aliases: ["configuration molkky", "options molkky", "joueurs molkky", "bots molkky"],
    text: "## CONFIGURATION MÖLKKY\n- **2 à 6 profils locaux** ;\n- pas de BOTS dans la configuration actuelle ;\n- cibles prédéfinies 30, 40, 50, 60 ou 70, plus valeur personnalisée ;\n- retour à 25 après dépassement : ON / OFF ;\n- élimination après 3 MISS : ON / OFF.",
    route: "molkky_config",
  },
  {
    id: "dice-catalogue", sport: "dice", title: "Dés — modes",
    aliases: ["modes des", "dice game", "jeux de des", "dice duel", "dice race", "10000", "yams", "farkle", "421", "poker dice"],
    text: "## JEUX DE DÉS\nLe menu actuel propose **Dice Duel, Dice Race, 10 000, YAM, Farkle, 421 et Poker Dice**.\n\n> Certains écrans signalent encore des mécaniques détaillées comme placeholder / à finaliser. Awena doit le préciser plutôt que présenter ces options comme totalement consolidées.",
    route: "dice_menu",
  },
  {
    id: "dice-duel", sport: "dice", title: "Dice Duel",
    aliases: ["dice duel", "duel des"],
    text: "## DICE DUEL\nConfiguration générique actuelle : **2 joueurs**, **2 dés** par défaut, cible **100**, score par somme des dés, avec nombre de sets configurable.",
    route: "dice_config",
  },
  {
    id: "dice-race", sport: "dice", title: "Dice Race",
    aliases: ["dice race", "course des"],
    text: "## DICE RACE\nConfiguration générique actuelle : **2 joueurs**, **3 dés** par défaut, cible **200**, score par somme des dés, avec nombre de sets configurable.",
    route: "dice_config",
  },
  {
    id: "dice-tenk", sport: "dice", title: "10 000",
    aliases: ["10000 des", "10 000 des", "tenk"],
    text: "## 10 000\nConfiguration générique : **2 joueurs**, **6 dés** par défaut, cible **10 000** et nombre de sets configurable.\nLe menu le présente comme une version simplifiée : ne pas confondre automatiquement toutes ses règles avec un Farkle complet.",
    route: "dice_config",
  },
  {
    id: "dice-yams", sport: "dice", title: "YAM",
    aliases: ["yams", "yam des", "yahtzee"],
    text: "## YAM\n- 2 joueurs ;\n- 5 dés ;\n- jusqu’à **2 relances** par défaut ;\n- grille / scorecard avec catégories ;\n- bonus supérieur prévu ;\n- nombre de rounds / catégories configurable, 13 par défaut ;\n- sets configurables.",
    route: "dice_yams_config",
  },
  {
    id: "dice-farkle", sport: "dice", title: "Farkle",
    aliases: ["farkle", "bank farkle", "bust farkle", "hot dice"],
    text: "## FARKLE\nMode push-your-luck avec combinaisons, **Bank** pour sécuriser les points et **Bust** en cas de tour sans score valide.\n\n## CONFIGURATION ACTUELLE\n2 joueurs, cible 10 000 par défaut, 3 à 6 dés (6 par défaut), sets. Les options démarrage minimum 500 et Hot Dice sont signalées dans le code comme **placeholder**.",
    route: "dice_farkle_config",
  },
  {
    id: "dice-421", sport: "dice", title: "421",
    aliases: ["421 des", "jeu 421"],
    text: "## 421\nLe mode prévoit des combinaisons / annonces et un jeu en rounds et sets.\n\n## ÉTAT ACTUEL\nLa configuration expose rounds, sets et options d’annonce / pénalité, mais le texte d’aide signale encore certaines mécaniques de scoring / annonce comme **à finaliser**.",
    route: "dice_421_config",
  },
  {
    id: "dice-poker", sport: "dice", title: "Poker Dice",
    aliases: ["poker dice", "poker des"],
    text: "## POKER DICE\nMode de combinaisons de poker avec **5 dés**, relances et manches / sets selon la configuration.\n\n## ÉTAT ACTUEL\nLe code indique que certains détails de scoring et l’option de petite suite basse restent à câbler / consolider.",
    route: "dice_poker_config",
  },
  {
    id: "foot-formats", sport: "football", title: "FOOT — formats",
    aliases: ["formats foot", "formats football", "1v1 foot", "2v2 foot", "3v3 foot", "5v5 foot", "7v7 foot", "8v8 foot", "11v11 foot", "penalty foot"],
    text: "## FORMATS FOOT\n- Penalty : duel 1V1, séance de tirs ;\n- 1V1 : 2 × 5 min ;\n- 2V2 : 2 × 7 min ;\n- 3V3 : 2 × 8 min ;\n- 5V5 : 2 × 12 min ;\n- 7V7 : 2 × 20 min ;\n- 8V8 : 2 × 25 min ;\n- 11V11 : 2 × 45 min.\n\n> Les durées sont les valeurs par défaut déclarées dans les formats de l’application et peuvent être reprises / adaptées par la configuration.",
    route: "foot_config",
  },
  {
    id: "foot-penalty", sport: "football", title: "FOOT — Penalty",
    aliases: ["penalty foot", "tirs au but foot", "shootout foot"],
    text: "## PENALTY\nFormat duel 1V1, une période sans durée chronométrée classique, **5 tirs par camp** par défaut.\nLa séance peut aller en mort subite selon le déroulé ; un tir manqué ou arrêté est enregistré comme échec.",
    route: "foot_config",
  },
  {
    id: "foot-config", sport: "football", title: "FOOT — configuration",
    aliases: ["configuration foot", "options football", "mi temps football", "remplacements foot"],
    text: "## CONFIGURATION FOOT\nLa configuration peut utiliser une sélection manuelle ou des équipes sauvegardées. Elle gère le format, le nombre / durée des périodes, la pause, les tirs pour le mode Penalty, les remplacements et la visibilité public / privé.\n\n## COMPOSITIONS\nLes formats équipe peuvent sélectionner plus de joueurs que le nombre de titulaires afin de constituer un banc.",
    route: "foot_config",
  },
  {
    id: "foot-events", sport: "football", title: "FOOT — événements",
    aliases: ["stats foot", "evenements foot", "but pied droit", "carton jaune foot", "tir cadre foot"],
    text: "## ÉVÉNEMENTS FOOT ENREGISTRABLES\nButs (pied droit, pied gauche, tête, penalty, coup franc, contre son camp), faute, jaune, rouge, tir cadré, tir non cadré, poteau, barre, penalty manqué, passe décisive et remplacement font partie des événements prévus par le Play.",
    route: "foot_play",
  },
  {
    id: "foot-tabs", sport: "football", title: "FOOT — écran de match",
    aliases: ["onglets foot", "score fil stats compo class foot"],
    text: "## ÉCRAN DE MATCH FOOT\nLe Play prévoit des vues **SCORE**, **FIL** et **STATS**, avec **COMPO** et **CLASS.** selon le contexte / la configuration. Les statistiques d’équipe incluent notamment score, répartition par période et tirs.",
    route: "foot_play",
  },
  {
    id: "babyfoot-sections", sport: "babyfoot", title: "Baby-foot — sections",
    aliases: ["menu babyfoot", "modes babyfoot", "hub match fun defis training ligue equipes"],
    text: "## BABY-FOOT — UNIVERS\nLe menu actuel est organisé autour de **Hub, Match, Fun, Défis, Training, Ligue et Équipes**. Il existe aussi un module de tournoi en cours de développement.",
    route: "babyfoot_menu",
  },
  {
    id: "babyfoot-match-modes", sport: "babyfoot", title: "Baby-foot — matchs",
    aliases: ["1v1 babyfoot", "2v2 babyfoot", "2v1 babyfoot", "match babyfoot"],
    text: "## MATCHS BABY-FOOT\n- **1V1** : duel classique ;\n- **2V2** : deux équipes de deux avec compositions réelles ;\n- **2V1** : format asymétrique avec options d’équilibrage ;\n- Training : module Beta ;\n- Tournoi : module encore WIP.",
    route: "babyfoot_config",
  },
  {
    id: "babyfoot-score-modes", sport: "babyfoot", title: "Baby-foot — modes de score",
    aliases: ["score mode babyfoot", "target babyfoot", "balls5 babyfoot", "balls10 babyfoot", "balls11 babyfoot", "chrono babyfoot"],
    text: "## MODES DE SCORE BABY-FOOT\nLa configuration propose **Target**, **5 balles**, **10 balles**, **11 balles** et **Chrono**.\nLes modes limités en balles s’arrêtent après le nombre prévu ; le code intègre aussi la règle spécifique de demi / dernière balle selon ce format.",
    route: "babyfoot_config",
  },
  {
    id: "babyfoot-sets", sport: "babyfoot", title: "Baby-foot — sets",
    aliases: ["sets babyfoot", "best of babyfoot", "bo3 babyfoot"],
    text: "## SETS BABY-FOOT\nLes sets peuvent être désactivés ou activés en **Best Of 1 / 3 / 5**. En score cible avec sets, le score de set proposé peut notamment être 5 ou 10.",
    route: "babyfoot_config",
  },
  {
    id: "babyfoot-time", sport: "babyfoot", title: "Baby-foot — chrono et égalité",
    aliases: ["chrono babyfoot", "golden goal babyfoot", "prolongation babyfoot", "match nul babyfoot"],
    text: "## TEMPS / ÉGALITÉ\nLe chrono est optionnel avec durée configurable. Le code prévoit match nul autorisé, **Golden Goal** et prolongation ; Golden Goal et overtime sont traités comme options exclusives dans la configuration.",
    route: "babyfoot_config",
  },
  {
    id: "babyfoot-rules-special", sport: "babyfoot", title: "Baby-foot — règles spéciales",
    aliases: ["demi babyfoot", "pissette babyfoot", "gamelle babyfoot", "peche babyfoot", "rateau babyfoot"],
    text: "## RÈGLES SPÉCIALES BABY-FOOT\nLa configuration possède des traitements dédiés pour **Demi, Pissette, Gamelle, Pêche offensive, Pêche défensive et Râteaux**.\n\n## IMPORTANT\nLeur effet dépend du choix : autorisé, interdit, statistique seulement, bonus / malus ou neutralisation. Il faut donc lire le preset / réglage actif avant d’annoncer un effet précis.",
    route: "babyfoot_config",
  },
  {
    id: "babyfoot-fun", sport: "babyfoot", title: "Baby-foot — modes Fun",
    aliases: ["fun babyfoot", "classic9 babyfoot", "golden goal babyfoot", "handicap 2v1 babyfoot", "sets bo3 babyfoot"],
    text: "## FUN BABY-FOOT\n- **Classic 9** : 1V1, premier à 9 ;\n- **Golden Goal** : 1V1, premier but ;\n- **Handicap 2V1** : cible 10, le camp B démarre avec +2 ;\n- **Sets BO3** : 2V2, premier à 2 sets gagnés, 5 buts par set.",
    route: "babyfoot_menu",
  },
  {
    id: "babyfoot-defis", sport: "babyfoot", title: "Baby-foot — défis",
    aliases: ["defis babyfoot", "glutch3 babyfoot", "endurance babyfoot", "classic9 defi"],
    text: "## DÉFIS BABY-FOOT\n- Classic 9 : 1V1 cible 9, liaison record indiquée comme à venir ;\n- **Glutch 3** : 1V1, premier à 3, limite 90 secondes ;\n- **Endurance** : 2V2, BO5, 3 buts par set.",
    route: "babyfoot_menu",
  },
  {
    id: "babyfoot-training", sport: "babyfoot", title: "Baby-foot — training",
    aliases: ["training babyfoot", "speed5 babyfoot", "team quick7", "challenge 2v1 babyfoot"],
    text: "## TRAINING BABY-FOOT\n- **Speed 5** : vitesse / précision sur 5 cibles ;\n- **Team Quick 7** : coopération sur 7 objectifs ;\n- **Challenge 2V1** : cible 6, indiqué Beta dans le menu.",
    route: "babyfoot_menu",
  },
  {
    id: "babyfoot-league", sport: "babyfoot", title: "Baby-foot — ligue",
    aliases: ["ligue babyfoot", "classement ligue babyfoot", "saison babyfoot"],
    text: "## LIGUE BABY-FOOT\nLe module est indiqué Beta. Il prévoit saison / calendrier ou fonctionnement amical continu. Les classements sont locaux et distinguent notamment SOLO (1V1) et TEAM (2V2 + 2V1 regroupés).",
    route: "babyfoot_league",
  },
  {
    id: "babyfoot-stats", sport: "babyfoot", title: "Baby-foot — statistiques",
    aliases: ["stats babyfoot", "gamelle stats", "pissette stats", "clean sheet babyfoot", "goal diff babyfoot"],
    text: "## STATS BABY-FOOT\nLe Stats Center peut exploiter : matchs, victoires, nuls, buts pour / contre, différence, clean sheets, Demi, bonus Demi, buts avant / défense / gardien / milieu, Gamelle, Pissette valide / refusée, Pêche offensive et défensive.\n\n## DÉCOUPAGE TEMPOREL DU MATCH\nLe code distingue aussi les phases **Entame 0–20 %, Montée 20–40 %, Cœur 40–60 %, Money Time 60–80 %, Finish 80–100 %**.",
    route: "babyfoot_stats_center",
  },
  {
    id: "babyfoot-stats-splits", sport: "babyfoot", title: "Baby-foot — splits statistiques",
    aliases: ["stats solo team babyfoot", "stats 1v1 2v2 2v1 babyfoot"],
    text: "## FILTRES STATS BABY-FOOT\nLes statistiques peuvent être analysées globalement ou par format : **Solo 1V1**, **Team**, **2V2** et **2V1**.",
    route: "babyfoot_stats_center",
  },
];

function routeAction(id: string, label: string, route?: string): AwenaAction[] | undefined { return route ? [{ id: `master-${id}`, label: `Ouvrir ${label}`, kind: "navigate", route }] : undefined; }

function scoreStatic(entry: MasterEntry, q: string, context: AwenaRuntimeContext) {
  let score = 0;
  for (const alias of entry.aliases) { const a = norm(alias); if (!a) continue; if (q === a) score += 18; else if (q.includes(a)) score += Math.max(7, a.split(" ").length * 3); }
  const sport = norm(context.sport || ""); if (sport && norm(entry.sport).includes(sport)) score += 2;
  const route = norm(context.route || ""); if (entry.route && route && route === norm(entry.route)) score += 2;
  return score;
}

function dartsAliases(game: DartsGameDef) { return [game.id, game.label, game.infoTitle, game.variantId || "", game.presetVariantId || ""].map(norm).filter(Boolean); }

function findExplicitDartsGame(q: string) {
  let best: { game: DartsGameDef; score: number } | null = null;
  for (const game of dartsGameRegistry.filter((g) => g.ready)) { let score = 0; for (const alias of dartsAliases(game)) { if (q === alias) score += 20; else if (alias.length >= 3 && q.includes(alias)) score += Math.max(8, alias.split(" ").length * 4); } if (!best || score > best.score) best = { game, score }; }
  return best && best.score >= 8 ? best.game : null;
}

function implementationStatus(game: DartsGameDef) {
  if (game.tab === "mode_not_ready") return "**Concept présent dans le registre**, mais sans écran de configuration / Play dédié dans la version actuelle. Le texte source le marque encore à implémenter.";
  if (/a implementer|à implementer/i.test(game.infoBody)) return "Le mode possède une entrée / route dans l’application, mais son texte de registre indique encore **À implémenter** : certaines mécaniques ne doivent donc pas être présentées comme finalisées.";
  if (/sera consolidee|sera consolidée|sera consolide|sera consolidé|a venir|à venir/i.test(game.infoBody)) return "Le mode est présent, mais le registre signale qu’une partie de ses mécaniques doit encore être **consolidée / complétée**.";
  return "Le mode dispose d’une entrée dédiée dans le registre actuel de l’application.";
}

function answerDartsGame(game: DartsGameDef, q: string): AwenaReply {
  const detail = getAwenaModeConfigDetail(game.id);
  const category = ({ classic: "Classique", variant: "Variante", challenge: "Défi", fun: "Fun", training: "Training" } as Record<string,string>)[game.category] || game.category;
  const participants = game.maxPlayers === 1 ? "Solo" : `jusqu’à ${game.maxPlayers} joueurs`;
  const options = detail?.options?.length ? `\n## CONFIGURATION CONNUE\n${detail.options.map((x) => `- ${x}`).join("\n")}` : "";
  const variants = detail?.variants?.length ? `\n## VARIANTES / CHOIX\n${detail.variants.map((x) => `- ${x}`).join("\n")}` : (game.variantId || game.presetVariantId ? `\n## VARIANTE\n- ${game.variantId || game.presetVariantId}` : "");
  const victory = detail?.victory ? `\n## CONDITION DE VICTOIRE\n${detail.victory}` : "";
  const statusQuestion = /disponible|pret|termine|fini|implemente|jouable|etat|status|statut/.test(q);
  const status = implementationStatus(game);
  const text = `## ${game.label.toUpperCase()}\n${game.infoBody}\n\n## ÉTAT DANS L’APPLICATION\n${status}\n\n## PARTICIPANTS\n- ${participants}\n- ${game.supportsTeams ? "équipes prises en charge" : "pas d’équipes dans le registre actuel"}\n- ${game.supportsBots ? "BOTS IA pris en charge" : "pas de BOTS IA dans le registre actuel"}\n- catégorie : ${category}${options}${variants}${victory}\n\n## HISTORIQUE / STATS\nCe mode est rattaché à la famille statistique **${game.statsKey}** dans le registre. Pour un record précis, je dois partir des parties réellement enregistrées dans l’Historique.`;
  const actions = game.tab !== "mode_not_ready" ? [{ id: `master-darts-${game.id}`, label: `Ouvrir ${game.label}`, kind: "navigate" as const, route: game.tab, modeId: game.id }] : undefined;
  return { text: statusQuestion ? text : text, actions, modeId: game.id, knowledgeTopic: `master:darts:${game.id}` };
}

export function answerAwenaMasterEncyclopedia(question: string, context: AwenaRuntimeContext): AwenaReply | null {
  const q = norm(question); if (!q) return null;
  const game = findExplicitDartsGame(q);
  // Ne pas intercepter les demandes Règles / Configuration / Stats : elles sont
  // traitées plus bas par les moteurs détaillés, History-first et contextuels.
  // Cette couche dynamique sert surtout à présenter un mode et son état réel
  // d'implémentation dans le registre V74.
  const dartsStatusIntent = /(?:disponible|pret|termine|fini|jouable|implemente|etat|status|statut|encore en developpement|a venir)/.test(q);
  const dartsOverviewIntent = /(?:c est quoi|qu est ce|presente|presentation|en quoi consiste|decris|decrit|description|explique ce mode)/.test(q);
  if (game && (dartsStatusIntent || dartsOverviewIntent || q === norm(game.label) || q === norm(game.id))) return answerDartsGame(game, q);

  let best: { entry: MasterEntry; score: number } | null = null;
  for (const entry of ENTRIES) { const score = scoreStatic(entry, q, context); if (!best || score > best.score) best = { entry, score }; }
  if (!best || best.score < 8) return null;
  return { text: best.entry.text, actions: routeAction(best.entry.id, best.entry.title, best.entry.route), knowledgeTopic: `master:${best.entry.id}`, modeId: context.mode || null };
}

export function awenaMasterEncyclopediaCount() { return ENTRIES.length + dartsGameRegistry.filter((game) => game.ready).length; }
export function awenaMasterStaticCount() { return ENTRIES.length; }
export function awenaMasterDartsCount() { return dartsGameRegistry.filter((game) => game.ready).length; }
