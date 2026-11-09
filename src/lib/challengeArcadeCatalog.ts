/** Catalogue CHALLENGE — 42 nouveaux concepts + Ligne parfaite + Opposés.
 * Les statuts distinguent la prévisualisation de l'implémentation jouable.
 * N'afficher comme jouables que les défis dont la règle est réellement développée.
 */
export type ArcadeFamily = 'PRÉCISION'|'PARCOURS'|'COMBINAISONS'|'SCORING'|'RISQUE'|'STRATÉGIE'|'MULTIJOUEURS';
export type ArcadeStatus = 'ready'|'preview';
export type ArcadeGoal = 'min'|'max'|'streak';
export type ArcadeChallenge = {id:string;title:string;family:ArcadeFamily;description:string;goal:ArcadeGoal;status:ArcadeStatus};
export const CHALLENGE_ARCADE_CATALOG:readonly ArcadeChallenge[] = [
  {id:"perfect-line",title:"LA LIGNE PARFAITE",family:"PRÉCISION",description:"D, G, T, P sur une ligne choisie, puis BULL et DBULL. Chaque impact valide l'étape; minimum de fléchettes.",goal:"min",status:"ready"},
  {id:"opposites",title:"LES OPPOSÉS",family:"PARCOURS",description:"Viser deux secteurs diamétralement opposés sur la cible, avec deux variantes de difficulté.",goal:"min",status:"ready"},
  {id:"sniper",title:"LE SNIPER",family:"PRÉCISION",description:"Valider une succession de segments exacts en un minimum de fléchettes.",goal:"min",status:"preview"},
  {id:"razor-edge",title:"LE FIL DU RASOIR",family:"PRÉCISION",description:"Seuls les petits simples comptent, jamais les grands simples.",goal:"min",status:"preview"},
  {id:"four-in-row",title:"QUATRE À LA SUITE",family:"PRÉCISION",description:"G, P, T et D du même numéro dans l'ordre.",goal:"min",status:"preview"},
  {id:"lock",title:"LA SERRURE",family:"PRÉCISION",description:"Ouvrir au simple et fermer au double du même numéro.",goal:"min",status:"preview"},
  {id:"triple-precision",title:"TRIPLE PRÉCISION",family:"PRÉCISION",description:"T20, T19 et T18 : trois triples consécutifs.",goal:"max",status:"preview"},
  {id:"forbidden-zone",title:"ZONE INTERDITE",family:"PRÉCISION",description:"Valider le segment imposé en évitant les autres zones du numéro.",goal:"max",status:"preview"},
  {id:"snake",title:"LE SERPENT",family:"PARCOURS",description:"Parcourir les numéros dans l'ordre physique horaire de la cible.",goal:"min",status:"preview"},
  {id:"zigzag",title:"LE ZIGZAG",family:"PARCOURS",description:"Alterner entre les deux moitiés de la cible.",goal:"min",status:"preview"},
  {id:"spiral",title:"LA SPIRALE",family:"PARCOURS",description:"Parcours alternant changement de secteurs et de couronnes.",goal:"min",status:"preview"},
  {id:"compass",title:"LA BOUSSOLE",family:"PARCOURS",description:"Nord 20, Est 6, Sud 3, Ouest 11, puis les deux Bulls.",goal:"min",status:"preview"},
  {id:"ping-pong",title:"LE PING-PONG",family:"PARCOURS",description:"Alterner les deux cibles éloignées sans rompre la série.",goal:"streak",status:"preview"},
  {id:"crazy-wheel",title:"LA ROUE FOLLE",family:"PARCOURS",description:"Avancer de trois secteurs dans l'ordre physique de la cible.",goal:"min",status:"preview"},
  {id:"winning-trio",title:"LE TRIO GAGNANT",family:"COMBINAISONS",description:"Un simple, un double et un triple en une volée.",goal:"max",status:"preview"},
  {id:"double-impact",title:"DOUBLE IMPACT",family:"COMBINAISONS",description:"Réussir deux doubles distincts au cours d'une volée.",goal:"max",status:"preview"},
  {id:"odd-even",title:"PAIR / IMPAIR",family:"COMBINAISONS",description:"Alterner les impacts sur les numéros pairs et impairs.",goal:"streak",status:"preview"},
  {id:"three-kings",title:"LES TROIS ROIS",family:"COMBINAISONS",description:"20, 19 et 18 dans une même volée; triples en expert.",goal:"max",status:"preview"},
  {id:"ascension",title:"ASCENSION",family:"COMBINAISONS",description:"Chaque fléchette réussie doit viser un numéro plus élevé.",goal:"streak",status:"preview"},
  {id:"bull-sandwich",title:"BULL SANDWICH",family:"COMBINAISONS",description:"BULL25, un segment choisi, DBULL50, dans cet ordre.",goal:"min",status:"preview"},
  {id:"exact-count",title:"LE COMPTE JUSTE",family:"SCORING",description:"Atteindre exactement le total annoncé sans dépassement.",goal:"max",status:"preview"},
  {id:"milestones",title:"LES PALIERS",family:"SCORING",description:"Dépasser successivement des scores minimums de volée.",goal:"min",status:"preview"},
  {id:"green-zone",title:"LA ZONE VERTE",family:"SCORING",description:"Réussir un score compris entre deux limites fixées.",goal:"max",status:"preview"},
  {id:"three-sectors",title:"TROIS SECTEURS",family:"SCORING",description:"Trois fléchettes sur trois numéros distincts.",goal:"max",status:"preview"},
  {id:"hundred-streak",title:"CAP SUR 100",family:"SCORING",description:"Multiplier les volées consécutives à 100 points minimum.",goal:"streak",status:"preview"},
  {id:"upper-limit",title:"LA LIMITE HAUTE",family:"SCORING",description:"Maximiser le score sous un plafond à ne jamais dépasser.",goal:"max",status:"preview"},
  {id:"all-or-nothing",title:"TOUT OU RIEN",family:"RISQUE",description:"Trois objectifs dans la même volée : une erreur annule tout.",goal:"max",status:"preview"},
  {id:"no-safety-net",title:"SANS FILET",family:"RISQUE",description:"Une seule erreur termine immédiatement le challenge.",goal:"streak",status:"preview"},
  {id:"three-lives",title:"LES TROIS VIES",family:"RISQUE",description:"Poursuivre la séquence avec trois vies seulement.",goal:"streak",status:"preview"},
  {id:"minefield",title:"LE CHAMP DE MINES",family:"RISQUE",description:"Accumuler les points sans toucher les numéros piégés.",goal:"max",status:"preview"},
  {id:"rescue",title:"LE SAUVETAGE",family:"RISQUE",description:"Réussir à la troisième fléchette après deux échecs.",goal:"max",status:"preview"},
  {id:"armored-streak",title:"LA SÉRIE BLINDÉE",family:"RISQUE",description:"Sécuriser la cagnotte par séries de trois réussites.",goal:"max",status:"preview"},
  {id:"safe",title:"LE COFFRE-FORT",family:"STRATÉGIE",description:"Déverrouiller un code de segments exacts dans l'ordre.",goal:"min",status:"preview"},
  {id:"kings-choice",title:"LE CHOIX DU ROI",family:"STRATÉGIE",description:"Choisir la difficulté de la zone visée avant la volée.",goal:"max",status:"preview"},
  {id:"bounty-hunt",title:"LA CHASSE AUX PRIMES",family:"STRATÉGIE",description:"Récolter les primes de dix cibles, chacune une seule fois.",goal:"max",status:"preview"},
  {id:"contracts",title:"LES CONTRATS",family:"STRATÉGIE",description:"Compléter trois missions de différents types en neuf fléchettes.",goal:"max",status:"preview"},
  {id:"controlled-roulette",title:"LA ROULETTE MAÎTRISÉE",family:"STRATÉGIE",description:"Choisir la zone d'un numéro annoncé avant chaque volée.",goal:"max",status:"preview"},
  {id:"collector",title:"LE COLLECTIONNEUR",family:"STRATÉGIE",description:"Collectionner G, P, D, T, BULL et DBULL.",goal:"min",status:"preview"},
  {id:"architects-duel",title:"LE DUEL DES ARCHITECTES",family:"MULTIJOUEURS",description:"Chaque joueur impose trois segments à son adversaire.",goal:"min",status:"preview"},
  {id:"exact-copy",title:"COPIE CONFORME",family:"MULTIJOUEURS",description:"Reproduire les trois impacts du joueur précédent, dans l'ordre.",goal:"max",status:"preview"},
  {id:"perfect-relay",title:"LE RELAIS PARFAIT",family:"MULTIJOUEURS",description:"Accomplir un parcours partagé entre coéquipiers.",goal:"min",status:"preview"},
  {id:"territory-war",title:"LA GUERRE DES TERRITOIRES",family:"MULTIJOUEURS",description:"Conquérir, voler et protéger les territoires de la cible.",goal:"max",status:"preview"},
  {id:"ghost-challenge",title:"LE DÉFI FANTÔME",family:"MULTIJOUEURS",description:"Affronter son ancien record volée après volée.",goal:"max",status:"preview"},
  {id:"revenge",title:"LA REVANCHE",family:"MULTIJOUEURS",description:"Réussir les cibles précédemment ratées par l'adversaire.",goal:"max",status:"preview"},
];
export const CHALLENGE_ARCADE_FAMILIES:readonly ArcadeFamily[]=['PRÉCISION','PARCOURS','COMBINAISONS','SCORING','RISQUE','STRATÉGIE','MULTIJOUEURS'];
export const getArcadeChallenge=(id:string|undefined|null)=>CHALLENGE_ARCADE_CATALOG.find(item=>item.id===id)||CHALLENGE_ARCADE_CATALOG[0];
export const isArcadeChallengePlayable=(id:string|undefined|null)=>Boolean(CHALLENGE_ARCADE_CATALOG.find(item=>item.id===id&&item.status==='ready'));
