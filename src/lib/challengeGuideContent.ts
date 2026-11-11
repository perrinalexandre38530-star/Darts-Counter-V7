/** Règles détaillées réutilisées par les fiches CHALLENGE et la base d’Awena. */
import { DOUBLES_8_TARGETS, objectiveLabel, type ChallengeObjectiveToken, type ChallengeScoreMode } from './challengeExercises';
import {arcadeRuleDetails,arcadeRuleDescription,type ArcadePlayConfig} from './challengeArcadeEngine';
import type {UnifiedChallengeMode} from './challengeUnifiedCatalog';
const targetText=(target:string)=>target==='any-double'?'DOUBLES':target==='any-triple'?'TRIPLES':['bull','bull25','bull50'].includes(target)?'BULL':target;
export type ChallengeGuideStep={eyebrow:string;title:string;text:string;bullets?:string[]};
export type ChallengeGuideData={intro:string;badges:string[];steps:ChallengeGuideStep[];footer:string};
const ruleBadge=(rule:string,target:string)=>target==='bull'?'BULL':rule==='all'?'SIMPLE + DOUBLE + TRIPLE':rule==='single'?'SIMPLES UNIQUEMENT':rule==='double'?'DOUBLES UNIQUEMENT':rule==='triple'?'TRIPLES UNIQUEMENT':'RÈGLE SPÉCIALE';
const joinTokens=(values:ChallengeObjectiveToken[])=>values.map(value=>objectiveLabel(value)).join(' · ');
export function buildChallengeGuide(choice:UnifiedChallengeMode,ctx:{target:string;rule:string;visits:number;clockIncludeBull:boolean;clockScoreMode:ChallengeScoreMode;halfItStartScore:number;sequenceObjectives:ChallengeObjectiveToken[];sequenceScoreMode:ChallengeScoreMode;groupingMin:number;groupingMax:number;groupingHits:2|3;doublesBonusTarget:number;doublesTargets:number[];doublesTargetMode:'official'|'custom';arcadeConfig:ArcadePlayConfig}):ChallengeGuideData{
 if(choice.exerciseType==='classic') return {
  intro:'Accumule le plus de points possible sur une cible unique pendant toute la partie.',
  badges:[`CIBLE · ${targetText(ctx.target)}`,`OBJECTIF · ${ruleBadge(ctx.rule,ctx.target)}`,`${ctx.visits} TOURS`],
  steps:[
   {eyebrow:'ÉTAPE 1',title:'Choisis une cible fixe',text:`Toute la partie se joue sur ${targetText(ctx.target)}. Chaque tour comprend jusqu’à 3 fléchettes.`},
   {eyebrow:'ÉTAPE 2',title:'Vise uniquement les touches autorisées',text:'Les impacts valides dépendent de la règle sélectionnée.',bullets:[ruleBadge(ctx.rule,ctx.target),'Les autres touches ne rapportent rien sur ce défi.']},
   {eyebrow:'ÉTAPE 3',title:'Cumule les points pendant toute la manche',text:'Le score s’additionne tour après tour avec le barème propre à Cible fixe (S=1, D=2, T=3), indépendamment du numéro visé.',bullets:['Simple = 1 point','Double = 2 points','Triple = 3 points','Bull 25 = 1 pt · DBull 50 = 2 pts']},
   {eyebrow:'ÉTAPE 4',title:'Bats le meilleur total',text:`À la fin des ${ctx.visits} tours, le meilleur score remporte le défi et devient la référence à battre.`},
  ],
  footer:'Record visé : le plus grand total de points sur la cible choisie.',
 };
 if(choice.exerciseType==='clock') return {
  intro:'Parcours progressif : un numéro différent à chaque volée, avec Bull final en option.',
  badges:[ctx.clockIncludeBull?'1 → 20 + BULL':'1 → 20',ctx.clockScoreMode==='real'?'POINTS RÉELS':'BARÈME CHALLENGE',`${ctx.visits} TOURS MAX`],
  steps:[
   {eyebrow:'ÉTAPE 1',title:'Commence au 1 puis avance numéro par numéro',text:'Chaque nouvelle volée change automatiquement de cible, dans l’ordre 1 à 20.'},
   {eyebrow:'ÉTAPE 2',title:'Joue une volée sur le numéro en cours',text:'Tu disposes de trois fléchettes sur le numéro annoncé. Au tour suivant, la cible avance même si tu n’as rien touché.'},
   {eyebrow:'ÉTAPE 3',title:'Le comptage dépend du mode choisi',text:'Tu peux jouer soit en points réels, soit avec le barème Challenge.',bullets:[ctx.clockScoreMode==='real'?'Points réels : la touche conserve sa vraie valeur.':'Barème Challenge : S=1, D=2, T=3.','Bull final inclus : '+(ctx.clockIncludeBull?'oui':'non')]},
   {eyebrow:'ÉTAPE 4',title:'Va le plus loin possible',text:'À la fin du parcours, les points cumulés sur les objectifs valides permettent de départager les joueurs.'},
  ],
  footer:'Objectif : progresser le plus loin possible dans l’horloge, puis améliorer le score de passage.',
 };
 if(choice.exerciseType==='half-it') return {
  intro:'Enchaîne des objectifs successifs : chaque échec divise ton score total par deux.',
  badges:[`DÉPART · ${ctx.halfItStartScore} PTS`,'15 · 16 · D · 17 · 18 · T · 19 · 20 · BULL',`${ctx.visits} TOURS`],
  steps:[
   {eyebrow:'ÉTAPE 1',title:'Un objectif différent à chaque volée',text:'Le parcours officiel suit 15, 16, Double, 17, 18, Triple, 19, 20 puis Bull.'},
   {eyebrow:'ÉTAPE 2',title:'Marque tout ce que tu peux sur l’objectif',text:'Pendant la volée, seules les fléchettes conformes à l’objectif du tour rapportent des points.'},
   {eyebrow:'ÉTAPE 3',title:'Attention à la sanction',text:'Si aucune fléchette ne valide l’objectif du tour, ton score cumulé est immédiatement divisé par deux.'},
   {eyebrow:'ÉTAPE 4',title:'Monte le total final',text:'Le meilleur résultat après l’ensemble des volées devient le record du défi.'},
  ],
  footer:'Défi de scoring : prendre des risques sans subir trop de divisions par deux.',
 };
 if(choice.exerciseType==='sequence') return {
  intro:'Construis ton propre enchaînement de cibles et réussis-le le plus proprement possible.',
  badges:[`${Math.max(1,ctx.sequenceObjectives.length)} OBJECTIFS`,ctx.sequenceScoreMode==='real'?'POINTS RÉELS':'BARÈME CHALLENGE',ctx.visits+' TOURS MAX'],
  steps:[
   {eyebrow:'ÉTAPE 1',title:'Prépare ta séquence',text:'Le défi suit exactement la liste des objectifs définie dans la configuration.',bullets:[joinTokens(ctx.sequenceObjectives.slice(0,8))+(ctx.sequenceObjectives.length>8?' · …':'')]},
   {eyebrow:'ÉTAPE 2',title:'Valide un objectif après l’autre',text:'Tu restes sur la même cible tant qu’elle n’est pas validée. Une réussite fait avancer la séquence.'},
   {eyebrow:'ÉTAPE 3',title:'Le scoring suit le mode choisi',text:'Les touches conservées peuvent utiliser les points réels ou le barème simplifié du Challenge.',bullets:[ctx.sequenceScoreMode==='real'?'Réel : la valeur exacte du segment est retenue.':'Challenge : S=1, D=2, T=3.']},
   {eyebrow:'ÉTAPE 4',title:'Termine la suite le plus vite possible',text:'La performance se juge sur la progression, puis sur l’efficacité pour compléter toute la séquence.'},
  ],
  footer:'Objectif : maîtriser un enchaînement personnalisé et battre tes meilleures progressions.',
 };
 if(choice.exerciseType==='grouping') return {
  intro:'Fais tomber au moins deux ou trois fléchettes dans le même secteur autorisé pour que la volée compte.',
  badges:[`SECTEURS · ${Math.min(ctx.groupingMin,ctx.groupingMax)} À ${Math.max(ctx.groupingMin,ctx.groupingMax)}`,`SEUIL · ${ctx.groupingHits} TOUCHES`,`${ctx.visits} TOURS`],
  steps:[
   {eyebrow:'ÉTAPE 1',title:'Choisis les bons secteurs',text:`Seuls les numéros compris entre ${Math.min(ctx.groupingMin,ctx.groupingMax)} et ${Math.max(ctx.groupingMin,ctx.groupingMax)} sont acceptés.`},
   {eyebrow:'ÉTAPE 2',title:'Regroupe tes fléchettes',text:`La volée ne marque que si au moins ${ctx.groupingHits} fléchettes atterrissent sur le même numéro autorisé.`},
   {eyebrow:'ÉTAPE 3',title:'Seules les touches regroupées comptent',text:'Quand le regroupement est validé, seules les fléchettes du secteur qualifié sont retenues avec leur vraie valeur.'},
   {eyebrow:'ÉTAPE 4',title:'Empile les meilleures volées',text:'Le total cumulé sur toutes les volées donne le classement final.'},
  ],
  footer:'Défi d’adresse : précision dans la zone et concentration sur un même numéro.',
 };
 if(choice.exerciseType==='jdc') return {
  intro:'Le JDC Challenge mélange scoring, doubles et finish dans une structure officielle de 19 volées.',
  badges:['3 PHASES','19 VOLÉES','SHANGHAI +100'],
  steps:[
   {eyebrow:'ÉTAPE 1',title:'Phase 1 · 10 à 15',text:'Une volée par secteur de 10 à 15. Les points réels des simples, doubles et triples sont conservés.'},
   {eyebrow:'ÉTAPE 2',title:'Phase 2 · Tour des doubles',text:'Parcours D1 à D20 puis Bull rouge, avec une seule fléchette par double annoncé.'},
   {eyebrow:'ÉTAPE 3',title:'Phase 3 · 15 à 20',text:'Retour aux secteurs 15 à 20, toujours en points réels, avec bonus Shanghai possible sur chaque secteur.'},
   {eyebrow:'ÉTAPE 4',title:'Additionne tout le parcours',text:'Le total des trois phases donne ton score final et ton classement.'},
  ],
  footer:'Défi complet : adresse, régularité et finish dans un seul format.',
 };
 if(choice.exerciseType==='doubles8'){
  const doubles=ctx.doublesTargets.length?ctx.doublesTargets:[...DOUBLES_8_TARGETS];
  return {
   intro:'Un parcours de doubles à réussir avec neuf fléchettes par cible, puis une volée bonus.',
   badges:[ctx.doublesTargetMode==='custom'?'PARCOURS PERSONNALISÉ':'PARCOURS OFFICIEL',doubles.map(n=>`D${n}`).join(' · '),`BONUS · D${ctx.doublesBonusTarget}`],
   steps:[
    {eyebrow:'ÉTAPE 1',title:'Suis le parcours de doubles',text:'Les doubles définis en configuration doivent être validés dans l’ordre prévu.'},
    {eyebrow:'ÉTAPE 2',title:'Neuf fléchettes par cible',text:'Tu disposes de trois volées maximum pour fermer chaque double avant de passer au suivant.'},
    {eyebrow:'ÉTAPE 3',title:'Active la volée bonus',text:`Une fois le parcours terminé, la dernière volée sert à marquer sur D${ctx.doublesBonusTarget} pour améliorer ton résultat.`},
    {eyebrow:'ÉTAPE 4',title:'Le record récompense la réussite propre',text:'Le classement combine la progression dans les doubles et l’efficacité pour les fermer rapidement.'},
   ],
   footer:'Défi idéal pour le travail de doubles et la gestion de la pression.',
  };
 }
 const rule=arcadeRuleDetails(ctx.arcadeConfig);
 const badges=[`${rule.kind==='path'||rule.kind==='team'?'PARCOURS':'DÉFI'} · ${rule.roundUnit}`];
 if(rule.usesLine)badges.push(`DÉPART · ${ctx.arcadeConfig.catalogLine}`);
 if(rule.usesRounds)badges.push(`${ctx.arcadeConfig.catalogRounds} ${rule.roundUnit}`);
 if(rule.usesVariant)badges.push(`MODE · ${ctx.arcadeConfig.catalogVariant==='doubles'?'DOUBLES':ctx.arcadeConfig.catalogVariant==='triples'?'TRIPLES':'CLASSIQUE'}`);
 if(rule.usesTarget)badges.push(`CIBLE · ${ctx.arcadeConfig.catalogTarget||100} PTS`);
 if(rule.usesRange)badges.push(`ZONE · ${ctx.arcadeConfig.catalogMin||60}-${ctx.arcadeConfig.catalogMax||80} PTS`);
 if(rule.usesLives)badges.push(`VIES · ${ctx.arcadeConfig.catalogLives||3}`);
 const recordText=rule.kind==='path'||rule.kind==='team'
  ?'Le record se joue au minimum de fléchettes : moins tu en consommes, plus ta performance est forte.'
  :rule.kind==='streak'
   ?'Le record mesure la meilleure série ou la meilleure survie : reste régulier le plus longtemps possible.'
   :'Le record récompense le score total ou la meilleure efficacité sur les volées du défi.';
 const flowText=rule.kind==='path'||rule.kind==='team'
  ?'Chaque réussite fait progresser l’objectif en cours. Une erreur consomme une fléchette mais ne supprime pas la progression déjà acquise.'
  :rule.kind==='streak'
   ?'Le défi se joue en série : le rythme, la survie ou les vies restantes deviennent décisifs pour tenir la performance.'
   :'Chaque volée est évaluée selon la règle du défi, puis cumulée pour former le score final.';
 return {
  intro:arcadeRuleDescription(ctx.arcadeConfig),
  badges,
  steps:[
   {eyebrow:'ÉTAPE 1',title:'Comprends le but du défi',text:choice.description,bullets:[arcadeRuleDescription(ctx.arcadeConfig)]},
   {eyebrow:'ÉTAPE 2',title:'Lance le défi avec les réglages actifs',text:'La configuration affichée ci-dessus détermine le numéro de départ, le nombre d’objectifs, la difficulté et les éventuelles contraintes spéciales.',bullets:badges},
   {eyebrow:'ÉTAPE 3',title:'Joue selon la règle du mode',text:flowText},
   {eyebrow:'ÉTAPE 4',title:'Bats la référence du challenge',text:recordText},
  ],
  footer:'Astuce : ouvre la fiche des records pour comparer tes dernières performances avec le meilleur résultat déjà enregistré.',
 };
}

