import type { AwenaReply, AwenaRuntimeContext } from "./awena.types";
import { getAwenaSourceScreensForRoute, awenaSourceRouteCount } from "./AwenaSourceAtlas";

function norm(value: string) {
  return String(value || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[’']/g, " ").replace(/[_/\\.-]+/g, " ").replace(/[^a-z0-9+%\s]/g, " ").replace(/\s+/g, " ").trim();
}
function title(route: string) { return route.replace(/[._-]+/g, " ").replace(/\b\w/g, (m) => m.toUpperCase()); }
function bullets(items: string[]) { return items.map((x) => `- ${x}`).join("\n"); }
function numbered(items: string[]) { return items.map((x, i) => `${i + 1}. ${x}`).join("\n"); }

const GUIDE_INTENT = /tutoriel|guide|pas a pas|pas à pas|comment faire|comment utiliser|comment configurer|comment regler|comment régler|je suis bloque|je suis bloqué|ca ne marche pas|ça ne marche pas|fonctionne pas|prerequis|prérequis|verifier|vérifier|que dois je faire|que dois-je faire|aide moi a faire|aide-moi à faire|procedure|procédure/;

function family(route: string) {
  const r = norm(route);
  if (/auth|account/.test(r)) return "account";
  if (/stats|leaderboard|match detail|history/.test(r)) return "stats";
  if (/tournament|competition/.test(r)) return "competition";
  if (/team edit|compose teams|teams/.test(r)) return "teams";
  if (/config|setup/.test(r)) return "config";
  if (/play|match score|device camera/.test(r)) return "play";
  if (/end|summary|result/.test(r)) return "summary";
  if (/menu|games|game select|home/.test(r)) return "menu";
  if (/viewer|cast|spectator/.test(r)) return "screen";
  if (/sync|storage|vault/.test(r)) return "data";
  if (/profile|avatar|friend|club|message|online/.test(r)) return "social";
  if (/settings/.test(r)) return "settings";
  return "screen";
}

function baseGuide(route: string) {
  switch (family(route)) {
    case "account": return {
      purpose: "Gérer l'accès au compte et à la session utilisateur sans confondre compte en ligne et profils de joueurs locaux.",
      steps: ["Lis le type d'action demandé par l'écran : connexion, création, récupération ou compte.", "Renseigne uniquement les champs requis et vérifie soigneusement l'adresse email.", "Valide l'action puis lis le message de confirmation ou d'erreur avant de recommencer.", "En cas d'échec, vérifie d'abord connexion réseau, email, mot de passe et éventuelle confirmation du compte."],
      checks: ["Un message de succès apparaît ou l'application ouvre l'écran suivant.", "La session/account attendu est visible après validation."],
      trouble: ["Ne crée pas un deuxième compte uniquement parce qu'une connexion échoue.", "Pour un mot de passe oublié, utilise le parcours de récupération plutôt qu'une série d'essais."] };
    case "stats": return {
      purpose: "Lire les statistiques enregistrées sans confondre une valeur brute, un filtre de période et une comparaison entre joueurs.",
      steps: ["Choisis d'abord le joueur, l'équipe ou le mode concerné.", "Vérifie la période et les filtres actifs.", "Commence par les KPI principaux, puis ouvre les graphiques ou le détail des matchs pour expliquer une valeur.", "Compare des volumes comparables : une moyenne ou un win rate doit toujours être lu avec le nombre de parties."],
      checks: ["Les filtres affichés correspondent bien à la question posée.", "Les données proviennent de l'Historique disponible pour ce mode."],
      trouble: ["Si tout est à zéro, vérifie les filtres et l'existence de parties enregistrées.", "Une statistique absente n'est pas forcément un bug : le mode doit enregistrer la donnée nécessaire."] };
    case "competition": return {
      purpose: "Créer, organiser ou reprendre une compétition en conservant participants, format, tableau et résultats cohérents.",
      steps: ["Définis les participants avant le format.", "Choisis le format de compétition et ses paramètres.", "Vérifie le tirage, les équipes et l'ordre des matchs avant de lancer.", "Saisis les résultats dans le match prévu puis reviens au tableau pour contrôler la progression."],
      checks: ["Le nombre de participants correspond au format.", "Le tableau ou calendrier affiche les matchs attendus et les résultats déjà validés."],
      trouble: ["Évite de recréer une compétition si elle existe déjà : cherche d'abord la reprise/liste.", "Si un tableau semble incohérent, vérifie le format et les résultats déjà enregistrés avant toute suppression."] };
    case "teams": return {
      purpose: "Composer ou modifier des équipes sans perdre l'identité des profils locaux.",
      steps: ["Sélectionne les profils qui participeront.", "Répartis-les dans les équipes demandées par l'écran.", "Vérifie qu'un même joueur n'est pas affecté deux fois si le format l'interdit.", "Enregistre puis reviens à la configuration ou à la compétition."],
      checks: ["Chaque équipe possède le nombre de joueurs attendu.", "Les noms/avatars visibles correspondent aux profils sélectionnés."],
      trouble: ["Si un joueur manque, vérifie qu'il existe dans Profils et qu'il n'est pas filtré.", "Si l'équipe ne se retrouve pas ensuite, vérifie que l'enregistrement a bien été validé."] };
    case "config": return {
      purpose: "Préparer la partie en réglant participants, variante et options avant le lancement.",
      steps: ["Choisis les participants ou équipes.", "Règle les options principales du mode : objectif, format, variantes et aides éventuelles.", "Contrôle le récapitulatif et les options qui modifient réellement les règles.", "Lance la partie uniquement lorsque la configuration affichée correspond à ce que tu veux jouer."],
      checks: ["Le bouton de lancement est disponible.", "Les joueurs, équipes et options visibles sont ceux attendus."],
      trouble: ["Si le lancement est bloqué, cherche d'abord un participant ou paramètre obligatoire manquant.", "Si une option revient à sa valeur précédente, vérifie qu'elle a été validée et qu'aucun preset/profil ne la remplace."] };
    case "play": return {
      purpose: "Utiliser l'écran de partie en respectant le joueur actif, le tour courant et les règles du mode.",
      steps: ["Repère toujours le joueur ou l'équipe active avant de saisir une action.", "Entre le score, le tir ou l'événement demandé par le mode.", "Vérifie le résultat affiché avant de passer au tour suivant.", "En cas d'erreur, utilise Annuler/Undo lorsqu'il est disponible plutôt que de compenser avec une fausse saisie."],
      checks: ["Le joueur actif et le score évoluent comme prévu.", "Le journal/timeline éventuel correspond à l'action réellement saisie."],
      trouble: ["Si une saisie est en retard, évite de retaper immédiatement pour ne pas créer un doublon.", "Si le score semble faux, contrôle la dernière action et utilise Undo avant toute autre correction."] };
    case "summary": return {
      purpose: "Contrôler le résultat final, les statistiques de la partie et les actions disponibles après le match.",
      steps: ["Vérifie le gagnant, le classement ou le score final.", "Ouvre les statistiques de partie si tu veux comprendre la performance.", "Contrôle que la partie apparaît dans l'Historique avant de quitter si l'enregistrement est important.", "Choisis ensuite revanche, nouvelle partie, Stats ou retour au menu selon le besoin."],
      checks: ["Le score final et le gagnant correspondent à la dernière action de jeu.", "L'Historique contient la partie lorsqu'elle doit être persistée."],
      trouble: ["Si l'Historique manque, ne supprime pas les données locales ; vérifie d'abord le mode, le profil et le stockage."] };
    case "menu": return {
      purpose: "Choisir un sport, un mode ou une section puis ouvrir sa configuration.",
      steps: ["Repère la catégorie ou le sport recherché.", "Parcours les cartes ou onglets disponibles.", "Ouvre le mode voulu et lis son résumé/règle rapide.", "Passe ensuite à la configuration avant de lancer la partie."],
      checks: ["Le titre de la page suivante correspond au mode choisi."],
      trouble: ["Une carte SOON ou non prête ne peut pas être lancée comme un mode finalisé.", "Si tu ne retrouves pas un mode, utilise Awéna pour le rechercher par son nom."] };
    case "data": return {
      purpose: "Sauvegarder, restaurer ou synchroniser les données sans confondre copie de sécurité et synchronisation entre appareils.",
      steps: ["Identifie d'abord l'objectif : sauvegarder, restaurer, exporter, importer ou synchroniser.", "Choisis la bonne source/destination et vérifie la date ou l'identité du fichier/snapshot.", "Avant une restauration, préfère une inspection ou une sauvegarde de sécurité lorsqu'elle est proposée.", "Après l'opération, contrôle profils, historique et statistiques au lieu de supposer que tout est correct."],
      checks: ["Un message de succès est affiché.", "Les compteurs/profils/historique attendus sont présents après l'opération."],
      trouble: ["N'efface jamais les données locales comme première étape de diagnostic.", "Une synchronisation n'est pas automatiquement une sauvegarde complète."] };
    case "social": return {
      purpose: "Gérer profils, amis, clubs, messages ou fonctions Online en gardant séparées identité locale et identité en ligne.",
      steps: ["Vérifie l'identité ou le profil actuellement sélectionné.", "Utilise la recherche, la liste ou le filtre prévu par l'écran.", "Ouvre la fiche voulue avant d'effectuer une action sensible.", "Contrôle le résultat : statut, invitation, message ou modification enregistrée."],
      checks: ["Le bon profil/ami/club est affiché.", "Le statut de l'action est visible après validation."],
      trouble: ["Si une donnée en ligne manque, vérifie la session et le réseau avant de modifier les profils locaux."] };
    case "settings": return {
      purpose: "Modifier les préférences globales de l'application et comprendre leur portée.",
      steps: ["Ouvre la carte du réglage concerné.", "Modifie une option à la fois pour pouvoir identifier son effet.", "Vérifie si le réglage est global ou lié au profil actif.", "Reviens à l'écran concerné pour confirmer que la préférence est appliquée."],
      checks: ["La valeur choisie reste affichée après navigation/rechargement lorsque le réglage est persistant."],
      trouble: ["Si une préférence revient en arrière, cherche une préférence de profil qui pourrait la resynchroniser."] };
    default: return {
      purpose: "Comprendre l'écran actuel et réaliser l'action principale sans sauter les validations.",
      steps: ["Lis le titre et l'objectif de l'écran.", "Repère les contrôles principaux et les champs obligatoires.", "Effectue l'action une étape à la fois et vérifie le résultat visuel.", "Si quelque chose bloque, donne-moi le message exact ou le bouton concerné."],
      checks: ["L'état visuel de l'écran change conformément à l'action demandée."],
      trouble: ["Évite les clics répétés si l'interface semble lente : attends le retour visuel avant de recommencer."] };
  }
}

function visibleFacts(route: string, context: AwenaRuntimeContext) {
  const entries = getAwenaSourceScreensForRoute(route, context.sport);
  const seen = new Set<string>();
  const facts: string[] = [];
  for (const entry of entries) for (const raw of entry.facts) {
    const fact = String(raw || "").trim();
    const key = norm(fact);
    if (!fact || fact.length < 2 || fact.length > 120 || seen.has(key) || /^[(){}=><.:;,]+/.test(fact)) continue;
    seen.add(key); facts.push(fact);
    if (facts.length >= 12) return facts;
  }
  return facts;
}

export function answerAwenaUniversalGuide(question: string, context: AwenaRuntimeContext, rememberedTopic?: string): AwenaReply | null {
  const q = norm(question);
  const route = String(context.route || "");
  const rememberedRoute = String(rememberedTopic || "").startsWith("universal:") ? String(rememberedTopic).slice("universal:".length) : "";
  const follow = /^(?:et ensuite|ensuite|et apres|et après|plus de details|plus de détails|je suis bloque|je suis bloqué|ca ne marche pas|ça ne marche pas|prerequis|prérequis|comment verifier|comment vérifier)$/i.test(String(question || "").trim());
  const target = route || (follow ? rememberedRoute : "");
  if (!target || (!GUIDE_INTENT.test(q) && !follow)) return null;

  const guide = baseGuide(target);
  const facts = visibleFacts(target, context);
  const problem = /bloque|bloqué|marche pas|fonctionne pas|erreur|probleme|problème/.test(q);
  const prereq = /prerequis|prérequis|avant de commencer|besoin de quoi/.test(q);
  const verify = /verifier|vérifier|comment savoir|c est bon|cest bon/.test(q);
  let text = `## GUIDE CONTEXTUEL · ${title(target).toUpperCase()}\n${guide.purpose}`;
  if (prereq) text += `\n\n## AVANT DE COMMENCER\n- Vérifie que tu es sur le bon écran et avec le bon profil/participant.\n- Prépare les données, appareils ou autorisations nécessaires à l'action que tu veux réaliser.`;
  else if (problem) text += `\n\n## DIAGNOSTIC\n${bullets(guide.trouble)}\n\n> Donne-moi le message exact, le bouton utilisé et ce que tu vois à l'écran : je resterai dans ce contexte.`;
  else if (verify) text += `\n\n## COMMENT VÉRIFIER\n${bullets(guide.checks)}`;
  else text += `\n\n## ÉTAPES CONSEILLÉES\n${numbered(guide.steps)}\n\n## COMMENT VÉRIFIER\n${bullets(guide.checks)}\n\n## SI ÇA BLOQUE\n${bullets(guide.trouble)}`;
  if (facts.length) text += `\n\n## ÉLÉMENTS RÉELLEMENT PRÉSENTS SUR CET ÉCRAN\n${bullets(facts)}\n\n> Je m'appuie ici sur les libellés extraits du code actuel de cet écran ; je n'invente pas un bouton absent.`;
  return { text, knowledgeTopic: `universal:${target}`, modeId: context.mode || null };
}

export function awenaUniversalGuideSourceRouteCount() { return awenaSourceRouteCount(); }
