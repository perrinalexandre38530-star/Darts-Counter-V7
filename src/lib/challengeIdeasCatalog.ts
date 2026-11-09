/**
 * 44 concepts CHALLENGE approuvés le 09/11/2026.
 *
 * Important : ces entrées sont des fiches de catalogue, PAS des exercices jouables.
 * Ne rendre un concept sélectionnable qu'après branchement du moteur, saisie des
 * segments exacts, statistiques, tests et compatibilité Historique/ONLINE.
 * Ne pas mélanger ce registre avec les modes actifs de challengeExercises.ts.
 */
export type ChallengeIdeaCategory = 'precision'|'parcours'|'combinaisons'|'score'|'risque'|'strategie'|'duel';
export type ChallengeIdeaStatus = 'planned';
export type ChallengeIdea = Readonly<{
  id: string;
  category: ChallengeIdeaCategory;
  title: string;
  rule: string;
  ranking: string;
  status: ChallengeIdeaStatus;
}>;
export const CHALLENGE_IDEA_CATEGORIES: ReadonlyArray<Readonly<{id:ChallengeIdeaCategory;label:string;icon:string}>> = [
  {
    "id": "precision",
    "label": "PRÉCISION",
    "icon": "🎯"
  },
  {
    "id": "parcours",
    "label": "PARCOURS",
    "icon": "🧭"
  },
  {
    "id": "combinaisons",
    "label": "COMBINAISONS",
    "icon": "🎲"
  },
  {
    "id": "score",
    "label": "SCORING",
    "icon": "📈"
  },
  {
    "id": "risque",
    "label": "RISQUE",
    "icon": "🔥"
  },
  {
    "id": "strategie",
    "label": "STRATÉGIE",
    "icon": "♟️"
  },
  {
    "id": "duel",
    "label": "DUELS & ÉQUIPES",
    "icon": "⚔️"
  }
];
const rows: ReadonlyArray<readonly [string,ChallengeIdeaCategory,string,string,string]> = [
  [
    "opposes",
    "precision",
    "LES OPPOSÉS",
    "Toucher un segment puis son opposé diamétral sur deux fléchettes consécutives ; mêmes types de couronne",
    "Points fixes par touche selon la couronne et bonus égal à une touche valide du même type"
  ],
  [
    "sniper",
    "precision",
    "LE SNIPER",
    "Atteindre les segments exacts annoncés successivement ; la cible change après chaque validation",
    "Moins de fléchettes pour terminer la série"
  ],
  [
    "fil-rasoir",
    "precision",
    "LE FIL DU RASOIR",
    "Valider une succession de petits simples imposés ; grands simples refusés",
    "Moins de fléchettes pour 5, 10 ou 20 objectifs"
  ],
  [
    "quatre-suite",
    "precision",
    "QUATRE À LA SUITE",
    "Valider successivement G20, P20, T20 et D20 ; numéro personnalisable",
    "Moins de fléchettes pour réussir les quatre couronnes"
  ],
  [
    "serrure",
    "precision",
    "LA SERRURE",
    "Ouvrir un numéro en simple puis le fermer sur son double ; retour au simple après trois doubles manqués",
    "Nombre de serrures ouvertes et fléchettes utilisées"
  ],
  [
    "triple-precision",
    "precision",
    "TRIPLE PRÉCISION",
    "Toucher trois triples distincts annoncés, dans le bon ordre et idéalement en une volée",
    "Combinaisons parfaites et taux de validation"
  ],
  [
    "zone-interdite",
    "precision",
    "ZONE INTERDITE",
    "Atteindre la couronne exacte d'un numéro ; les autres couronnes du même numéro coûtent une vie",
    "Objectifs validés avant élimination"
  ],
  [
    "ligne-parfaite",
    "parcours",
    "LA LIGNE PARFAITE",
    "Valider D20 puis G20, T20, P20, BULL25 et DBULL50 ; répéter chaque cible jusqu'à sa réussite",
    "Moins de fléchettes pour achever les six étapes"
  ],
  [
    "serpent",
    "parcours",
    "LE SERPENT",
    "Faire le tour des vingt numéros dans leur ordre physique horaire sur la cible",
    "Moins de fléchettes pour terminer un tour complet"
  ],
  [
    "zigzag",
    "parcours",
    "LE ZIGZAG",
    "Alterner des objectifs entre deux côtés éloignés de la cible selon un parcours préétabli",
    "Temps non pris en compte ; moins de fléchettes"
  ],
  [
    "spirale",
    "parcours",
    "LA SPIRALE",
    "Enchaîner un parcours combinant numéros et couronnes G, P, D ou T",
    "Moins de fléchettes pour atteindre la dernière étape"
  ],
  [
    "boussole",
    "parcours",
    "LA BOUSSOLE",
    "Valider 20, 6, 3, 11 puis BULL ou DBULL ; variante experte avec couronnes imposées",
    "Moins de fléchettes pour terminer la boussole"
  ],
  [
    "ping-pong",
    "parcours",
    "LE PING-PONG",
    "Alterner deux numéros imposés à chaque réussite sans rester sur la même cible",
    "Plus longue série d'alternances réussies"
  ],
  [
    "roue-folle",
    "parcours",
    "LA ROUE FOLLE",
    "Après chaque réussite, avancer de N secteurs physiques autour de la cible",
    "Nombre d'étapes validées et efficacité"
  ],
  [
    "trio-gagnant",
    "combinaisons",
    "LE TRIO GAGNANT",
    "Toucher un simple, un double puis un triple avec trois fléchettes",
    "Combinaisons parfaites et bonus pour trois numéros distincts"
  ],
  [
    "double-impact",
    "combinaisons",
    "DOUBLE IMPACT",
    "Toucher au moins deux doubles différents dans une volée ; troisième double distinct bonifié",
    "Nombre de doubles distincts réussis"
  ],
  [
    "pair-impair",
    "combinaisons",
    "PAIR / IMPAIR",
    "Alterner strictement numéros pairs et impairs à chaque fléchette",
    "Plus longue série consécutive"
  ],
  [
    "trois-rois",
    "combinaisons",
    "LES TROIS ROIS",
    "Toucher 20, 19 et 18 dans une volée ; variante experte T20, T19, T18",
    "Volées complètes et taux de réussite"
  ],
  [
    "ascension",
    "combinaisons",
    "ASCENSION",
    "Chaque fléchette valide touche un numéro strictement supérieur au précédent",
    "Plus longue série ascendante"
  ],
  [
    "bull-sandwich",
    "combinaisons",
    "BULL SANDWICH",
    "Valider BULL25, un segment imposé, puis DBULL50 dans cet ordre",
    "Volées parfaites et nombre de tentatives"
  ],
  [
    "compte-juste",
    "score",
    "LE COMPTE JUSTE",
    "Atteindre exactement un total annoncé en 3 ou 6 fléchettes sans dépasser",
    "Paliers exacts réussis en moins de fléchettes"
  ],
  [
    "paliers",
    "score",
    "LES PALIERS",
    "Atteindre des scores minimums croissants volée après volée ; répéter un palier après échec",
    "Plus haut palier atteint"
  ],
  [
    "zone-verte",
    "score",
    "LA ZONE VERTE",
    "Atteindre une fourchette de points par volée ; dépasser la borne haute annule le score",
    "Nombre de volées dans la fourchette"
  ],
  [
    "trois-secteurs",
    "score",
    "TROIS SECTEURS",
    "Obtenir le meilleur score sur trois numéros tous différents dans une volée",
    "Points valides cumulés"
  ],
  [
    "cap-100",
    "score",
    "CAP SUR 100",
    "Enchaîner autant de volées à au moins 100 points que possible",
    "Plus longue série et meilleure moyenne"
  ],
  [
    "limite-haute",
    "score",
    "LA LIMITE HAUTE",
    "Faire le maximum de points sans dépasser un plafond fixé par volée",
    "Points valides sous le plafond"
  ],
  [
    "tout-ou-rien",
    "risque",
    "TOUT OU RIEN",
    "Trois cibles sont imposées : une seule erreur annule les points de la volée",
    "Points des volées intégralement réussies"
  ],
  [
    "sans-filet",
    "risque",
    "SANS FILET",
    "Enchaîner des cibles imposées jusqu'à la première fléchette ratée",
    "Plus longue série parfaite"
  ],
  [
    "trois-vies",
    "risque",
    "LES TROIS VIES",
    "Valider des cibles successives avec une réserve de 1, 3 ou 5 vies",
    "Objectifs validés avant épuisement des vies"
  ],
  [
    "champ-mines",
    "risque",
    "LE CHAMP DE MINES",
    "Des secteurs valent des points, d'autres retirent une vie ou des points ; disposition variable",
    "Score net avant élimination"
  ],
  [
    "sauvetage",
    "risque",
    "LE SAUVETAGE",
    "Réussir un objectif avec la troisième fléchette après deux échecs",
    "Nombre de sauvetages réussis"
  ],
  [
    "serie-blindee",
    "risque",
    "LA SÉRIE BLINDÉE",
    "Accumuler une cagnotte à chaque réussite ; sécuriser les points toutes les trois réussites",
    "Plus grosse cagnotte sécurisée"
  ],
  [
    "coffre-fort",
    "strategie",
    "LE COFFRE-FORT",
    "Ouvrir un code de quatre à six segments exacts dans l'ordre",
    "Moins de fléchettes pour ouvrir le coffre"
  ],
  [
    "choix-roi",
    "strategie",
    "LE CHOIX DU ROI",
    "Avant chaque volée choisir G, P, D ou T ; les récompenses progressent avec le risque",
    "Points cumulés selon le risque choisi"
  ],
  [
    "chasse-primes",
    "strategie",
    "LA CHASSE AUX PRIMES",
    "Toucher une fois chacun des dix secteurs primés en quinze fléchettes",
    "Total des primes remportées"
  ],
  [
    "contrats",
    "strategie",
    "LES CONTRATS",
    "Réussir trois missions distinctes dans l'ordre choisi en neuf fléchettes",
    "Contrats validés et fléchettes restantes"
  ],
  [
    "roulette-maitrisee",
    "strategie",
    "LA ROULETTE MAÎTRISÉE",
    "Le numéro est tiré au sort ; le joueur choisit sa couronne avant la volée",
    "Points accumulés selon couronne annoncée"
  ],
  [
    "collectionneur",
    "strategie",
    "LE COLLECTIONNEUR",
    "Réunir au moins un G, P, D, T, BULL25 et DBULL50",
    "Moins de fléchettes pour compléter la collection"
  ],
  [
    "duel-architectes",
    "duel",
    "LE DUEL DES ARCHITECTES",
    "Chaque joueur impose trois cibles exactes à son adversaire puis inverse les rôles",
    "Moins de fléchettes pour valider les défis adverses"
  ],
  [
    "copie-conforme",
    "duel",
    "COPIE CONFORME",
    "Reproduire exactement la volée de l'adversaire, segments et ordre compris",
    "Plus grand nombre de reproductions parfaites"
  ],
  [
    "relais-parfait",
    "duel",
    "LE RELAIS PARFAIT",
    "Chaque membre d'équipe valide une étape d'un parcours collectif",
    "Moins de fléchettes pour l'équipe"
  ],
  [
    "guerre-territoires",
    "duel",
    "LA GUERRE DES TERRITOIRES",
    "Conquérir des numéros en simple, voler en double, protéger en triple",
    "Plus grand nombre de territoires à la fin"
  ],
  [
    "defi-fantome",
    "duel",
    "LE DÉFI FANTÔME",
    "Affronter sa meilleure partie enregistrée sur une configuration identique",
    "Victoire sur sa performance précédente"
  ],
  [
    "revanche",
    "duel",
    "LA REVANCHE",
    "Réussir des cibles ratées par son adversaire pour obtenir un bonus",
    "Points remportés sur les revanches"
  ]
];
export const CHALLENGE_IDEAS: ReadonlyArray<ChallengeIdea> = rows.map(([id,category,title,rule,ranking]) => ({
  id, category, title, rule, ranking, status: 'planned'
}));
export const CHALLENGE_APPROVED_IDEA_COUNT = 44;
