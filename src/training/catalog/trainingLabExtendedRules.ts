import type { TrainingExerciseFamily } from "./trainingExerciseCatalog";

export type ExtendedRuleKind =
  | "progressive_checkout"
  | "clock_speed"
  | "x01_restricted"
  | "round_score"
  | "bull_stack"
  | "fish170"
  | "hardcore_clock"
  | "cricket_count"
  | "bob27"
  | "half_it"
  | "deadline"
  | "brochette"
  | "switcher"
  | "double_or_nothing"
  | "small_finishes"
  | "streak_sector"
  | "redemption"
  | "around_score"
  | "survival_score"
  | "manual_hits"
  | "pekin"
  | "route_targets"
  | "balanced_bull"
  | "deep_dive"
  | "risk7"
  | "surcharge"
  | "five_elements"
  | "card_missions"
  | "endurance42"
  | "jdc"
  | "atomic"
  | "rainbow"
  | "technique";

export type ExtendedTrainingRule = {
  id: string;
  title: string;
  subtitle: string;
  family: TrainingExerciseFamily;
  difficulty: 1 | 2 | 3 | 4 | 5;
  kind: ExtendedRuleKind;
  durationSec?: number;
  rounds?: number;
  level1Label?: string;
  params?: Record<string, any>;
};

const r = (rule: ExtendedTrainingRule) => rule;

export const EXTENDED_TRAINING_RULES: ExtendedTrainingRule[] = [
  r({ id:"lab_501_switch", title:"501 Switch", subtitle:"Commence par des cibles imposées avant de libérer le scoring à 170.", family:"regularity", difficulty:4, kind:"x01_restricted", level1Label:"moins de 63 fléchettes", params:{variant:"switch"} }),
  r({ id:"lab_rope", title:"La corde", subtitle:"Travail de ligne verticale et de précision pendant 10 minutes.", family:"precision", difficulty:2, kind:"manual_hits", durationSec:600, level1Label:"plus de 5 touches", params:{hitLabel:"CORDE TOUCHÉE", missLabel:"HORS CORDE"} }),
  r({ id:"lab_finish_61_80", title:"Finish 61–80", subtitle:"Monte de 61 à 80 en fermant chaque score en trois fléchettes.", family:"checkout", difficulty:3, kind:"progressive_checkout", durationSec:600, level1Label:"plus de 1 finish", params:{start:61,end:80} }),
  r({ id:"lab_clock_speed", title:"Horloge Speed", subtitle:"Avance plus vite selon le multiplicateur touché.", family:"precision", difficulty:3, kind:"clock_speed", level1Label:"moins de 100 fléchettes" }),
  r({ id:"lab_finish_41_60", title:"Finish 41–60", subtitle:"Monte de 41 à 60 en fermant chaque score en trois fléchettes.", family:"checkout", difficulty:2, kind:"progressive_checkout", durationSec:600, level1Label:"plus de 1 finish", params:{start:41,end:60} }),
  r({ id:"lab_rings", title:"Les anneaux", subtitle:"Compte tes fléchettes qui traversent une zone d'entraînement réduite.", family:"precision", difficulty:2, kind:"manual_hits", durationSec:600, level1Label:"plus de 5 touches", params:{hitLabel:"DANS L’ANNEAU",missLabel:"HORS ANNEAU"} }),
  r({ id:"lab_121", title:"Le 121", subtitle:"Monte ton refuge checkout pendant 10 minutes.", family:"checkout", difficulty:5, kind:"progressive_checkout", durationSec:600, level1Label:"plus de 122", params:{start:121,end:170,refuge:true} }),
  r({ id:"lab_checkout50", title:"Défi Checkout 50", subtitle:"Finis 50 en trois fléchettes avec une première fléchette orientée Bull.", family:"checkout", difficulty:2, kind:"round_score", durationSec:300, level1Label:"plus de 1 finish", params:{mode:"checkout50"} }),
  r({ id:"lab_501_premium", title:"501 Premium", subtitle:"Seuls les secteurs 20, 19 et 18 comptent jusqu'à 170 restant.", family:"scoring", difficulty:4, kind:"x01_restricted", level1Label:"moins de 50 fléchettes", params:{variant:"premium"} }),
  r({ id:"lab_clock_simple", title:"Horloge Simple", subtitle:"Parcours 1 à 20 : une touche suffit pour avancer.", family:"precision", difficulty:1, kind:"clock_speed", level1Label:"moins de 115 fléchettes", params:{simpleClock:true} }),
  r({ id:"lab_99_20", title:"99 flèches au 20", subtitle:"33 volées sur le 20, avec valeur selon simple/double/triple.", family:"scoring", difficulty:2, kind:"round_score", rounds:33, level1Label:"plus de 30 points", params:{target:20,multPoints:true} }),
  r({ id:"lab_fish170", title:"Fish the Finish", subtitle:"Essaie de fermer 170 en 15 fléchettes, puis recommence.", family:"regularity", difficulty:5, kind:"fish170", durationSec:300, level1Label:"moins de 16 fléchettes" }),
  r({ id:"lab_bull_stack", title:"Bull Stack", subtitle:"Construis une série Bull sans laisser une volée vide remettre le compteur à zéro.", family:"bull", difficulty:3, kind:"bull_stack", durationSec:600, level1Label:"plus de 75 points" }),
  r({ id:"lab_count_up", title:"Count Up", subtitle:"Huit volées : fais simplement le plus gros total possible.", family:"scoring", difficulty:1, kind:"round_score", rounds:8, level1Label:"plus de 250 points", params:{freeScore:true} }),
  r({ id:"lab_clock_doubles", title:"Horloge des doubles", subtitle:"D1 à D20 : avance uniquement quand le double demandé tombe.", family:"doubles", difficulty:4, kind:"clock_speed", level1Label:"moins de 310 fléchettes", params:{doubles:true} }),
  r({ id:"lab_clock_hardcore", title:"Horloge Hardcore", subtitle:"Trois fléchettes par simple : 3/3 avance, 2/3 reste, 0–1/3 recule.", family:"precision", difficulty:5, kind:"hardcore_clock", durationSec:300, level1Label:"plus de 1 secteur" }),
  r({ id:"lab_touchettes", title:"Touchettes", subtitle:"Marque si tes fléchettes restent physiquement connectées.", family:"precision", difficulty:2, kind:"manual_hits", durationSec:300, level1Label:"plus de 1 point", params:{manualScores:[0,1,3],manualLabels:["Aucun contact","2 connectées","3 connectées"]} }),
  r({ id:"lab_cricket_count", title:"Cricket Count Up", subtitle:"Sept tours de 20 à 15 puis Bull, avec valeur selon le multiplicateur.", family:"scoring", difficulty:3, kind:"cricket_count", rounds:7, level1Label:"plus de 4 points" }),
  r({ id:"lab_pekin", title:"Pékin Express", subtitle:"Valide 20 à 15 puis Bull avec les combinaisons imposées et garde les fléchettes restantes.", family:"regularity", difficulty:4, kind:"pekin", level1Label:"plus de 5 points" }),
  r({ id:"lab_bob27", title:"BOB 27", subtitle:"Parcours D1 à D20 en partant de 27 points.", family:"doubles", difficulty:4, kind:"bob27", level1Label:"meilleur score possible" }),
  r({ id:"lab_12works", title:"Les 12 travaux", subtitle:"Douze manches mêlant ciblage, scoring et finish.", family:"regularity", difficulty:5, kind:"route_targets", rounds:12, level1Label:"plus de 500 points", params:{variant:"12works"} }),
  r({ id:"lab_routourne", title:"La Routourne", subtitle:"Vingt volées, chacune avec deux doubles et Bull à combiner.", family:"regularity", difficulty:4, kind:"route_targets", rounds:20, level1Label:"plus de 20 points", params:{variant:"routourne"} }),
  r({ id:"lab_balance_bull", title:"Balance Bull", subtitle:"Alterne scoring sur 20→15 et Bull, puis repars dans l'autre sens.", family:"bull", difficulty:4, kind:"balanced_bull", rounds:11, level1Label:"plus de 1 point" }),
  r({ id:"lab_half_it", title:"Half It", subtitle:"Ne rate pas la cible du tour sous peine de voir ton score divisé par deux.", family:"scoring", difficulty:3, kind:"half_it", rounds:9, level1Label:"plus de 20 points" }),
  r({ id:"lab_deep_dive", title:"Deep Dive", subtitle:"Ferme les secteurs 15 à 20 avec exactement trois marques et gère les pénalités.", family:"precision", difficulty:4, kind:"deep_dive", rounds:6, level1Label:"score positif" }),
  r({ id:"lab_deadline", title:"Deadline", subtitle:"Suis un trajet aller-retour de zones imposées avec le moins de fléchettes possible.", family:"regularity", difficulty:4, kind:"deadline", level1Label:"moins de 200 fléchettes" }),
  r({ id:"lab_brochette_v", title:"Brochette² Verticale", subtitle:"Bull, T20 et D20 : le nombre de zones touchées est mis au carré.", family:"precision", difficulty:3, kind:"brochette", rounds:8, level1Label:"plus de 8 points", params:{targets:["BULL","T20","D20"]} }),
  r({ id:"lab_brochette_h", title:"Brochette² Horizontale", subtitle:"Bull, D11 et D6 : le nombre de zones touchées est mis au carré.", family:"precision", difficulty:3, kind:"brochette", rounds:8, level1Label:"plus de 8 points", params:{targets:["BULL","D11","D6"]} }),
  r({ id:"lab_risk7", title:"7 à risques", subtitle:"Verrouille jusqu'à sept secteurs et améliore-les avant la fin des 7 minutes.", family:"regularity", difficulty:5, kind:"risk7", durationSec:420, level1Label:"plus de 200 points" }),
  r({ id:"lab_switcher", title:"The Switcher", subtitle:"Huit tours de triples majeurs avec ordre imposé.", family:"regularity", difficulty:4, kind:"switcher", rounds:8, level1Label:"plus de 100 points" }),
  r({ id:"lab_double_or_nothing", title:"Double ou Rien", subtitle:"Dix finishes : réussir débloque une volée bonus de scoring.", family:"doubles", difficulty:4, kind:"double_or_nothing", rounds:10, level1Label:"plus de 100 points" }),
  r({ id:"lab_small_tough", title:"Petits Finishes", subtitle:"3, 7 et 13 à répéter trois fois chacun, avec bonus selon le résultat.", family:"checkout", difficulty:2, kind:"small_finishes", rounds:9, level1Label:"plus de 90 points" }),
  r({ id:"lab_barrage", title:"Barrage", subtitle:"Choisis 19 ou 20 et marque uniquement dans ce segment pendant huit volées.", family:"regularity", difficulty:3, kind:"round_score", rounds:8, level1Label:"plus de 240 points", params:{chooseSegment:true} }),
  r({ id:"lab_surcharge", title:"Surcharge", subtitle:"Huit volées avec cases qui explosent et bonus de regroupement par secteur.", family:"scoring", difficulty:4, kind:"surcharge", rounds:8, level1Label:"plus de 100 points" }),
  r({ id:"lab_5elements", title:"Les 5 éléments", subtitle:"Répare quatre piliers puis stabilise le noyau avec des contraintes de précision.", family:"regularity", difficulty:4, kind:"five_elements", level1Label:"moins de 99 fléchettes" }),
  r({ id:"lab_cards", title:"Le jeu de cartes", subtitle:"32 missions successives avec un capital de vies à préserver.", family:"regularity", difficulty:5, kind:"card_missions", rounds:32, level1Label:"plus de 4 cartes" }),
  r({ id:"lab_19_streak", title:"19 à la suite", subtitle:"Pendant 5 minutes, seule ta meilleure série consécutive dans le 19 compte.", family:"scoring", difficulty:3, kind:"streak_sector", durationSec:300, level1Label:"plus de 3 points", params:{sector:19} }),
  r({ id:"lab_20_streak", title:"20 à la suite", subtitle:"Pendant 5 minutes, seule ta meilleure série consécutive dans le 20 compte.", family:"scoring", difficulty:3, kind:"streak_sector", durationSec:300, level1Label:"plus de 3 points", params:{sector:20} }),
  r({ id:"lab_ship", title:"Navire en vue", subtitle:"Quinze volées : un score d'au moins 65 évite le tir adverse.", family:"precision", difficulty:2, kind:"survival_score", rounds:15, level1Label:"plus de 1 tir évité", params:{threshold:65} }),
  r({ id:"lab_endurance42", title:"Endurance 42", subtitle:"Une séance longue de 42 étapes mêlant secteurs, doubles, petits segments, finishes et Bull.", family:"regularity", difficulty:5, kind:"endurance42", rounds:42, level1Label:"terminer les 42 étapes" }),
  r({ id:"lab_jdc", title:"Tour complet", subtitle:"Trois phases pour parcourir secteurs, doubles puis scoring final.", family:"regularity", difficulty:5, kind:"jdc", level1Label:"plus de 69 points" }),
  r({ id:"lab_redemption", title:"Redemption", subtitle:"Sur douze volées, ton pire score peut être effacé par deux égalisations du meilleur.", family:"checkout", difficulty:4, kind:"redemption", rounds:12, level1Label:"plus de 20 points" }),
  r({ id:"lab_1to20", title:"Le 1 à 20", subtitle:"Une volée par secteur de 1 à 20 puis Bull, score selon multiplicateur.", family:"precision", difficulty:2, kind:"around_score", rounds:21, level1Label:"plus de 20 points" }),
  r({ id:"lab_atomic", title:"Atomic", subtitle:"Refroidis les secteurs avant qu'ils n'entrent en fusion. Trois fusions et la partie s'arrête.", family:"scoring", difficulty:5, kind:"atomic", level1Label:"plus de 14 tours" }),
  r({ id:"lab_rainbow", title:"Rainbow Road", subtitle:"Six routes de doubles, trois cycles et bonus de routes complètes.", family:"regularity", difficulty:5, kind:"rainbow", rounds:18, level1Label:"plus de 1 point" }),
  r({ id:"tech_feet", title:"Posture — position des pieds", subtitle:"Trouve une stance stable, confortable et reproductible.", family:"regularity", difficulty:1, kind:"technique", durationSec:300, params:{focus:"Teste une position stable puis répète exactement la même installation avant chaque volée."} }),
  r({ id:"tech_elbow", title:"Alignement — placement du coude", subtitle:"Stabilise la ligne épaule-coude-cible.", family:"precision", difficulty:2, kind:"technique", durationSec:300, params:{focus:"Observe la position du coude avant le lancer et cherche à limiter les déplacements latéraux."} }),
  r({ id:"tech_rear_foot", title:"Posture — pied arrière", subtitle:"Travaille l'équilibre et la répétabilité de l'appui arrière.", family:"regularity", difficulty:1, kind:"technique", durationSec:300, params:{focus:"Teste plusieurs placements du pied arrière puis conserve celui qui donne le plus de stabilité sans tension."} }),
  r({ id:"tech_release", title:"Geste — lâcher", subtitle:"Libère la fléchette sans action parasite des doigts.", family:"precision", difficulty:3, kind:"technique", durationSec:300, params:{focus:"Concentre-toi sur une ouverture naturelle des doigts : la fléchette doit partir sans geste de poussée final."} }),
  r({ id:"tech_extension", title:"Geste — extension du bras", subtitle:"Laisse l'avant-bras produire une trajectoire fluide.", family:"regularity", difficulty:2, kind:"technique", durationSec:300, params:{focus:"Cherche une extension souple et régulière vers la cible, sans accélération brutale."} }),
  r({ id:"tech_follow", title:"Geste — suivi", subtitle:"Utilise la position finale comme indicateur de répétabilité.", family:"regularity", difficulty:2, kind:"technique", durationSec:300, params:{focus:"Après chaque lancer, garde brièvement la position finale et vérifie qu'elle se répète naturellement."} }),
  r({ id:"tech_pullback", title:"Geste — armement", subtitle:"Installe un recul d'avant-bras constant avant l'accélération.", family:"regularity", difficulty:3, kind:"technique", durationSec:300, params:{focus:"Travaille un armement de même amplitude et de même rythme à chaque fléchette."} }),
  r({ id:"tech_rhythm", title:"Trouver son rythme", subtitle:"Rends les intervalles de ta routine plus réguliers.", family:"regularity", difficulty:2, kind:"technique", durationSec:300, params:{focus:"Garde le même tempo entre installation, visée et lancer. Ni précipitation, ni attente excessive."} }),
  r({ id:"tech_routine", title:"Construire sa routine", subtitle:"Crée une séquence simple que tu peux répéter sous pression.", family:"regularity", difficulty:2, kind:"technique", durationSec:300, params:{focus:"Choisis 3 ou 4 repères fixes avant chaque volée et répète-les sans en ajouter."} }),
  r({ id:"tech_gaze", title:"Le regard", subtitle:"Fixe précisément la zone visée et laisse le corps s'organiser autour de cette cible.", family:"precision", difficulty:2, kind:"technique", durationSec:300, params:{focus:"Choisis un point de visée précis et garde le regard dessus jusqu'à la fin du geste."} }),
];

export const EXTENDED_RULE_BY_ID = Object.fromEntries(EXTENDED_TRAINING_RULES.map((rule) => [rule.id, rule])) as Record<string, ExtendedTrainingRule>;
