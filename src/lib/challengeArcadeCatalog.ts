/** Catalogue extensible CHALLENGE : 42 concepts + Perfect Line + Opposés.
 * Les 44 modes sont pris en charge par le moteur commun ; la validation CI vérifie chaque règle.
 */
export type ArcadeFamily='PRÉCISION'|'PARCOURS'|'COMBINAISONS'|'SCORING'|'RISQUE'|'STRATÉGIE'|'MULTIJOUEURS';
export type ArcadeStatus='ready'|'preview';
export type ArcadeGoal='min'|'max'|'streak';
export type ArcadeChallenge={id:string;title:string;family:ArcadeFamily;description:string;goal:ArcadeGoal;status:ArcadeStatus};
export const CHALLENGE_ARCADE_CATALOG: readonly ArcadeChallenge[]=[
 {id:'perfect-line',title:'LA LIGNE PARFAITE',family:'PRÉCISION',description:'D, G, T et P d’une ligne au choix, puis BULL et DBULL. Chaque impact exact valide une étape.',goal:'min',status:'ready'},
 {id:'opposites',title:'LES OPPOSÉS',family:'PARCOURS',description:'Atteindre des secteurs opposés sur la cible, en simples, doubles ou triples.',goal:'min',status:'ready'},
 {id:'sniper',title:'LE SNIPER',family:'PRÉCISION',description:'Valider une succession de segments exacts en un minimum de fléchettes.',goal:'min',status:'ready'},
 {id:'razor-edge',title:'LE FIL DU RASOIR',family:'PRÉCISION',description:'Seuls les petits simples comptent, jamais les grands simples.',goal:'min',status:'ready'},
 {id:'four-in-row',title:'QUATRE À LA SUITE',family:'PRÉCISION',description:'G, P, T et D du même numéro, dans cet ordre.',goal:'min',status:'ready'},
 {id:'lock',title:'LA SERRURE',family:'PRÉCISION',description:'Ouvrir au simple et fermer au double du même numéro.',goal:'min',status:'ready'},
 {id:'triple-precision',title:'TRIPLE PRÉCISION',family:'PRÉCISION',description:'Réussir trois triples différents dans la même volée.',goal:'max',status:'ready'},
 {id:'forbidden-zone',title:'ZONE INTERDITE',family:'PRÉCISION',description:'Toucher un segment exact en évitant les zones interdites du même numéro.',goal:'max',status:'ready'},
 {id:'snake',title:'LE SERPENT',family:'PARCOURS',description:'Parcourir les numéros dans l’ordre physique horaire de la cible.',goal:'min',status:'ready'},
 {id:'zigzag',title:'LE ZIGZAG',family:'PARCOURS',description:'Alterner entre les deux moitiés opposées de la cible.',goal:'min',status:'ready'},
 {id:'spiral',title:'LA SPIRALE',family:'PARCOURS',description:'Alterner les secteurs et les couronnes le long d’une spirale.',goal:'min',status:'ready'},
 {id:'compass',title:'LA BOUSSOLE',family:'PARCOURS',description:'Nord 20, Est 6, Sud 3, Ouest 11, puis Bull.',goal:'min',status:'ready'},
 {id:'ping-pong',title:'LE PING-PONG',family:'PARCOURS',description:'Alterner deux cibles éloignées sans erreur.',goal:'streak',status:'ready'},
 {id:'crazy-wheel',title:'LA ROUE FOLLE',family:'PARCOURS',description:'Avancer de plusieurs secteurs dans l’ordre réel du cadran.',goal:'min',status:'ready'},
 {id:'winning-trio',title:'LE TRIO GAGNANT',family:'COMBINAISONS',description:'Un simple, un double et un triple dans la même volée.',goal:'max',status:'ready'},
 {id:'double-impact',title:'DOUBLE IMPACT',family:'COMBINAISONS',description:'Réussir deux doubles distincts pendant une volée.',goal:'max',status:'ready'},
 {id:'odd-even',title:'PAIR / IMPAIR',family:'COMBINAISONS',description:'Alterner numéros pairs et impairs.',goal:'streak',status:'ready'},
 {id:'three-kings',title:'LES TROIS ROIS',family:'COMBINAISONS',description:'20, 19, 18 dans une même volée ; variante triples en expert.',goal:'max',status:'ready'},
 {id:'ascension',title:'ASCENSION',family:'COMBINAISONS',description:'Chaque fléchette doit viser un numéro supérieur au précédent.',goal:'streak',status:'ready'},
 {id:'bull-sandwich',title:'BULL SANDWICH',family:'COMBINAISONS',description:'Bull 25, segment intermédiaire et DBull 50, dans cet ordre.',goal:'min',status:'ready'},
 {id:'exact-count',title:'LE COMPTE JUSTE',family:'SCORING',description:'Atteindre exactement un total annoncé, sans dépassement.',goal:'max',status:'ready'},
 {id:'milestones',title:'LES PALIERS',family:'SCORING',description:'Réussir des paliers croissants de score par volée.',goal:'min',status:'ready'},
 {id:'green-zone',title:'LA ZONE VERTE',family:'SCORING',description:'Obtenir un score dans une fourchette définie.',goal:'max',status:'ready'},
 {id:'three-sectors',title:'TROIS SECTEURS',family:'SCORING',description:'Trois fléchettes sur trois numéros différents.',goal:'max',status:'ready'},
 {id:'hundred-streak',title:'CAP SUR 100',family:'SCORING',description:'Enchaîner un maximum de volées à 100 points ou plus.',goal:'streak',status:'ready'},
 {id:'upper-limit',title:'LA LIMITE HAUTE',family:'SCORING',description:'Marquer le maximum sans dépasser un plafond.',goal:'max',status:'ready'},
 {id:'all-or-nothing',title:'TOUT OU RIEN',family:'RISQUE',description:'Trois objectifs en une volée ; la moindre erreur annule les points.',goal:'max',status:'ready'},
 {id:'no-safety-net',title:'SANS FILET',family:'RISQUE',description:'Une erreur termine le challenge.',goal:'streak',status:'ready'},
 {id:'three-lives',title:'LES TROIS VIES',family:'RISQUE',description:'Un parcours de cibles aléatoires avec trois vies.',goal:'streak',status:'ready'},
 {id:'minefield',title:'LE CHAMP DE MINES',family:'RISQUE',description:'Viser des secteurs récompensés tout en évitant les numéros piégés.',goal:'max',status:'ready'},
 {id:'rescue',title:'LE SAUVETAGE',family:'RISQUE',description:'Réussir un objectif à la troisième fléchette.',goal:'max',status:'ready'},
 {id:'armored-streak',title:'LA SÉRIE BLINDÉE',family:'RISQUE',description:'Accumuler une cagnotte et la sécuriser par séries de trois.',goal:'max',status:'ready'},
 {id:'safe',title:'LE COFFRE-FORT',family:'STRATÉGIE',description:'Déverrouiller un code de segments exacts.',goal:'min',status:'ready'},
 {id:'kings-choice',title:'LE CHOIX DU ROI',family:'STRATÉGIE',description:'Choisir la difficulté de la zone visée avant la volée.',goal:'max',status:'ready'},
 {id:'bounty-hunt',title:'LA CHASSE AUX PRIMES',family:'STRATÉGIE',description:'Récolter les primes de dix cibles en un nombre limité de tirs.',goal:'max',status:'ready'},
 {id:'contracts',title:'LES CONTRATS',family:'STRATÉGIE',description:'Réussir trois missions variées en neuf fléchettes.',goal:'max',status:'ready'},
 {id:'controlled-roulette',title:'LA ROULETTE MAÎTRISÉE',family:'STRATÉGIE',description:'Choisir à l’avance la couronne d’un numéro tiré au sort.',goal:'max',status:'ready'},
 {id:'collector',title:'LE COLLECTIONNEUR',family:'STRATÉGIE',description:'Réunir G, P, D, T, Bull 25 et DBull 50.',goal:'min',status:'ready'},
 {id:'architects-duel',title:'LE DUEL DES ARCHITECTES',family:'MULTIJOUEURS',description:'Choisir trois cibles exactes que son adversaire doit réaliser.',goal:'min',status:'ready'},
 {id:'exact-copy',title:'COPIE CONFORME',family:'MULTIJOUEURS',description:'Reproduire les trois impacts du joueur précédent dans l’ordre.',goal:'max',status:'ready'},
 {id:'perfect-relay',title:'LE RELAIS PARFAIT',family:'MULTIJOUEURS',description:'Compléter un parcours partagé entre équipiers.',goal:'min',status:'ready'},
 {id:'territory-war',title:'LA GUERRE DES TERRITOIRES',family:'MULTIJOUEURS',description:'Conquérir, voler et protéger les secteurs de la cible.',goal:'max',status:'ready'},
 {id:'ghost-challenge',title:'LE DÉFI FANTÔME',family:'MULTIJOUEURS',description:'Affronter sa meilleure performance passée volée par volée.',goal:'max',status:'ready'},
 {id:'revenge',title:'LA REVANCHE',family:'MULTIJOUEURS',description:'Transformer les cibles ratées de l’adversaire en opportunités.',goal:'max',status:'ready'},
];
export const CHALLENGE_ARCADE_FAMILIES:readonly ArcadeFamily[]=['PRÉCISION','PARCOURS','COMBINAISONS','SCORING','RISQUE','STRATÉGIE','MULTIJOUEURS'];
export const getArcadeChallenge=(id:string|null|undefined):ArcadeChallenge=>CHALLENGE_ARCADE_CATALOG.find(item=>item.id===id)??CHALLENGE_ARCADE_CATALOG[0]!;
export const isArcadeChallengePlayable=(id:string|null|undefined)=>CHALLENGE_ARCADE_CATALOG.some(item=>item.id===id&&item.status==='ready');
