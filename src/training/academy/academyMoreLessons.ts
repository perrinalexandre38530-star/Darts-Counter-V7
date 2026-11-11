/** MSS-exclusive lessons: original teaching text and self-contained answer-checked quizzes. */
import type { AcademyLesson, AcademyPractice, AcademyQuizQuestion } from "./academyLessons";

type QuizRow = readonly [string, string, string, string, number, string];
type Entry = {
  id: string; level: 1 | 2 | 3 | 4; minutes: number;
  family: AcademyLesson["family"]; title: string; intro: string; insight: string;
  mission: string; practice: AcademyPractice;
  quiz: readonly [QuizRow, QuizRow, QuizRow];
};
const q = ([question, a, b, c, correct, explanation]: QuizRow): AcademyQuizQuestion => ({
  question, answers: [a, b, c], correct, explanation,
});
const target = (target: string, maxDarts = 9): AcademyPractice => ({ kind: "target", target, maxDarts });
const checkout = (start: number, maxDarts = 9): AcademyPractice => ({ kind: "checkout", start, maxDarts });
const points = (minimum: number, maxDarts = 9): AcademyPractice => ({ kind: "points", minimum, maxDarts });

const entries: Entry[] = [
  {
    id:"bull-compass",level:1,minutes:3,family:"precision",title:"Le cœur de la cible",
    intro:"Le centre comporte deux valeurs. Reconnais-les avant de jouer les sorties qui utilisent le bull.",
    insight:"La couronne extérieure du centre rapporte 25, la zone centrale intérieure rapporte 50. Ce sont deux touches distinctes.",
    mission:"Trouve BULL25 en neuf fléchettes maximum.",practice:target("BULL"),quiz:[
      ["Combien rapporte la couronne extérieure du centre ?","25","40","50",0,"La couronne extérieure du centre vaut 25."],
      ["Combien rapporte le centre intérieur ?","20","50","60",1,"Le centre intérieur, appelé DBULL, vaut 50."],
      ["Deux touches BULL25 valent ensemble…","50","75","100",0,"25 + 25 = 50."],
    ],
  },
  {
    id:"miss-counts",level:1,minutes:3,family:"scoring",title:"Le zéro compte aussi",
    intro:"Une fléchette hors cible ne marque rien, mais elle fait partie des fléchettes lancées.",
    insight:"Enregistre MISS au lieu d'inventer une touche. Ton pourcentage de réussite et ta moyenne seront plus fiables.",
    mission:"Marque au moins 40 points cumulés en neuf fléchettes, en notant aussi les MISS.",practice:points(40),quiz:[
      ["Un MISS rapporte combien de points ?","0","1","5",0,"MISS correspond à zéro point."],
      ["Tu lances S20, MISS, S5. Quel total ?","25","45","20",0,"20 + 0 + 5 = 25."],
      ["Pour compter exactement les fléchettes jouées, tu dois…","Noter seulement les touches","Compter aussi les MISS","Ignorer la dernière volée",1,"Les fléchettes manquées restent des fléchettes jouées."],
    ],
  },
  {
    id:"ring-reflex",level:1,minutes:4,family:"precision",title:"Simple, double, triple : le réflexe",
    intro:"À valeur de secteur identique, l'anneau change le score. Entraîne ton regard à repérer immédiatement la zone.",
    insight:"S19 = 19, D19 = 38 et T19 = 57. La lettre de la touche fait partie du score.",
    mission:"Trouve D19 sur la cible.",practice:target("D19"),quiz:[
      ["Que vaut D19 ?","19","38","57",1,"Un double 19 vaut 2 × 19 = 38."],
      ["Que vaut T19 ?","38","57","60",1,"Un triple 19 vaut 3 × 19 = 57."],
      ["Une volée S19, D19, T19 rapporte…","95","114","133",1,"19 + 38 + 57 = 114."],
    ],
  },
  {
    id:"treble-twenty",level:1,minutes:4,family:"scoring",title:"L'aimant des 60 points",
    intro:"Savoir viser le triple 20 est une compétence, mais savoir calculer chaque touche est tout aussi important.",
    insight:"Un T20 vaut 60. Trois T20 font 180 ; mais trois simples 20 ne valent que 60.",
    mission:"Touche T20 en neuf fléchettes.",practice:target("T20"),quiz:[
      ["Un T20 rapporte…","20","40","60",2,"Le triple 20 vaut 60."],
      ["S20 + T20 + S20 = ?","80","100","120",1,"20 + 60 + 20 = 100."],
      ["Trois T20 en une volée font…","140","160","180",2,"3 × 60 = 180."],
    ],
  },
  {
    id:"neighbor-trap",level:1,minutes:3,family:"precision",title:"Quand la fléchette glisse",
    intro:"Un bon entraînement observe ce qui se passe réellement, y compris lorsqu'une fléchette finit dans un secteur voisin.",
    insight:"Sur une cible classique, le 20 est encadré par les secteurs 1 et 5. Ce sont des touches à compter correctement, sans les confondre avec S20.",
    mission:"Touche S5 en neuf fléchettes, en repérant sa position près du 20.",practice:target("S5"),quiz:[
      ["Sur une cible standard, quels secteurs bordent le 20 ?","1 et 5","18 et 4","19 et 7",0,"Les voisins immédiats du 20 sont 1 et 5."],
      ["Tu vises S20 et tu touches S1. Combien marques-tu ?","20","1","0",1,"La touche réelle S1 rapporte un point."],
      ["S5 + S1 + S20 donne…","24","25","26",2,"5 + 1 + 20 = 26."],
    ],
  },
  {
    id:"quick-sum",level:1,minutes:4,family:"scoring",title:"Trois fléchettes, un total",
    intro:"Travaille le calcul de volée : chaque fléchette doit être ajoutée une seule fois, même si les multiplicateurs changent.",
    insight:"Décompose les touches : T17 = 51, D12 = 24, S9 = 9. Tu peux additionner 51 + 24 puis + 9.",
    mission:"Atteins 80 points cumulés en neuf fléchettes.",practice:points(80),quiz:[
      ["T17 + D12 + S9 donne…","75","84","93",1,"51 + 24 + 9 = 84."],
      ["D20 + T15 vaut…","70","85","95",1,"40 + 45 = 85."],
      ["T16 + S18 + S7 donne…","73","83","93",0,"48 + 18 + 7 = 73."],
    ],
  },
  {
    id:"double-eight",level:2,minutes:4,family:"doubles",title:"Le double 8, ton filet",
    intro:"Les doubles peuvent se suivre lorsque tu ajustes ton score après une touche simple.",
    insight:"Avec 16 restants, D8 gagne. Si tu touches S8, il reste 8 et D4 devient une sortie.",
    mission:"Entraîne le double 8 sur neuf fléchettes.",practice:target("D8"),quiz:[
      ["À 16 restants, quel double gagne directement ?","D4","D8","D16",1,"D8 rapporte exactement 16."],
      ["À 16, tu touches S8. Quel double peut ensuite finir ?","D4","D6","D8",0,"Il reste 8, soit D4."],
      ["À 8, tu touches S4. Combien reste-t-il ?","2","4","6",1,"8 − 4 = 4, soit D2 possible."],
    ],
  },
  {
    id:"double-one",level:2,minutes:3,family:"doubles",title:"La dernière marche : D1",
    intro:"Même un tout petit restant peut exiger beaucoup de précision en Double Out.",
    insight:"Le plus petit score terminable en Double Out est 2 : D1. Un restant de 1 provoque un BUST.",
    mission:"Trouve D1 sur la cible, neuf essais maximum.",practice:target("D1"),quiz:[
      ["Quel double termine un restant de 2 ?","D1","D2","S2",0,"D1 vaut deux points."],
      ["À 2 restants, tu touches S1. En Double Out, c'est…","Un finish","Un BUST","Un restant jouable de 1",1,"Un restant de 1 ne peut pas se terminer sur un double."],
      ["En Double Out, le plus petit score directement terminable est…","1","2","3",1,"Le double 1 rapporte 2 points."],
    ],
  },
  {
    id:"even-odd",level:2,minutes:4,family:"checkout",title:"Pair ou impair ?",
    intro:"Un double rapporte toujours une valeur paire. C'est utile pour choisir une fléchette de placement.",
    insight:"Avec un score impair, une simple impaire peut conduire à un restant pair avant le double final.",
    mission:"Réalise un finish à partir de 35 en neuf fléchettes.",practice:checkout(35),quiz:[
      ["Pour finir 35 avec S3 d'abord, quel double vient ensuite ?","D16","D17","D18",0,"35 − 3 = 32, donc D16."],
      ["À 27, tu touches S11. Quel double termine ?","D6","D8","D9",1,"27 − 11 = 16, soit D8."],
      ["La valeur d'un double de secteur 1 à 20 est toujours…","Paire","Impaire","Identique au secteur",0,"Deux fois un entier est pair."],
    ],
  },
  {
    id:"forty-choice",level:2,minutes:4,family:"checkout",title:"Les 40 points de la victoire",
    intro:"Avec 40 restants, tu es sur un double direct. Mais si le premier tir tombe dans le simple, ne perds pas le fil.",
    insight:"D20 termine 40. Si S20 est touché, le restant devient 20 et D10 devient la sortie.",
    mission:"Termine un départ de 40 en six fléchettes.",practice:checkout(40,6),quiz:[
      ["À 40, quelle fléchette gagne immédiatement ?","D20","D10","S20",0,"D20 rapporte 40."],
      ["À 40, tu touches S20. Quel double devient gagnant ?","D20","D10","D5",1,"Il reste 20, soit D10."],
      ["À 20, tu touches S10. Quel double devient gagnant ?","D10","D5","D2",1,"Il reste 10, soit D5."],
    ],
  },
  {
    id:"fifty-choice",level:2,minutes:4,family:"checkout",title:"Le dilemme des 50",
    intro:"Cinquante points peuvent se terminer d'un seul coup au centre, ou par une préparation selon le nombre de fléchettes.",
    insight:"DBULL vaut 50 et compte comme un double en Double Out. Avec deux fléchettes, S10 puis D20 fonctionne aussi.",
    mission:"Trouve un finish à partir de 50 en neuf fléchettes.",practice:checkout(50),quiz:[
      ["À 50, quelle touche seule gagne en Double Out ?","BULL25","DBULL50","T20",1,"DBULL est un double de 50 points."],
      ["À 50, S10 puis… termine ?","D15","D20","D25",1,"50 − 10 = 40, soit D20."],
      ["À 50, si tu touches BULL25, combien reste-t-il ?","20","25","30",1,"50 − 25 = 25 : il faut encore organiser une sortie."],
    ],
  },
  {
    id:"thirty-two-save",level:2,minutes:4,family:"checkout",title:"Le couloir du 32",
    intro:"Commencer avec un double précis te donne une stratégie de secours quand le tir finit dans le simple correspondant.",
    insight:"À 32, D16 gagne. Si S16 est touché, il reste 16 et tu peux tenter D8.",
    mission:"Finis 32 en six fléchettes.",practice:checkout(32,6),quiz:[
      ["À 32, quel double gagne ?","D8","D12","D16",2,"Le double 16 vaut 32."],
      ["À 32, tu touches S16. Quel double gagne ensuite ?","D8","D10","D16",0,"Il reste 16, soit D8."],
      ["Après S16 puis S8 depuis 32, il reste…","4","8","12",1,"32 − 16 − 8 = 8."],
    ],
  },
  {
    id:"sixty-two",level:2,minutes:4,family:"checkout",title:"La sortie du 62",
    intro:"À 62, cherche une combinaison claire, et reste capable de modifier ta route si la première touche n'est pas celle prévue.",
    insight:"T10 puis D16 donne 30 + 32 = 62. Ce n'est pas la seule solution ; vérifie toujours les valeurs.",
    mission:"Réalise un finish 62 en neuf fléchettes.",practice:checkout(62),quiz:[
      ["Quelle combinaison fait 62 avec double final ?","T10 + D16","T12 + D16","S20 + D16",0,"30 + 32 = 62."],
      ["À 62, tu touches S10. Quel score reste-t-il ?","42","52","32",1,"62 − 10 = 52."],
      ["À 52, S20 puis quel double peut gagner ?","D12","D16","D20",1,"52 − 20 = 32, donc D16."],
    ],
  },
  {
    id:"sixty-four",level:2,minutes:4,family:"checkout",title:"64 : le bon placement",
    intro:"Certains nombres se terminent par un triple suivi d'un double. Le calcul doit guider le choix.",
    insight:"T16 vaut 48. Ajouter D8, qui vaut 16, permet un finish de 64.",
    mission:"Tente un finish 64 en neuf fléchettes.",practice:checkout(64),quiz:[
      ["Quelle combinaison réalise 64 en deux fléchettes ?","T16 + D8","T18 + D8","T20 + D8",0,"48 + 16 = 64."],
      ["Après T16 depuis 64, il reste…","8","16","24",1,"64 − 48 = 16."],
      ["À 64, tu marques S16. Il reste…","48","40","32",0,"64 − 16 = 48."],
    ],
  },
  {
    id:"seventy-two",level:2,minutes:4,family:"checkout",title:"72 : assembler sans hésiter",
    intro:"La force d'un finish vient d'un calcul compris, pas seulement d'un trajet mémorisé.",
    insight:"Avec T16 et D12, tu cumules 48 + 24 = 72. Essaie ensuite de recalculer après une touche différente.",
    mission:"Finis 72 en neuf fléchettes.",practice:checkout(72),quiz:[
      ["Quelle route vaut 72 avec un double final ?","T16 + D12","T16 + D8","T18 + D12",0,"48 + 24 = 72."],
      ["Depuis 72, tu fais S16. Quel restant ?","56","48","54",0,"72 − 16 = 56."],
      ["À 56, S16 puis quel double peut terminer ?","D16","D18","D20",2,"56 − 16 = 40, donc D20."],
    ],
  },
  {
    id:"eighty",level:2,minutes:4,family:"checkout",title:"80 : deux fléchettes précises",
    intro:"Avec 80 points, plusieurs combinaisons sont possibles. Choisis une route, puis calcule à chaque étape.",
    insight:"T20 puis D10 = 60 + 20. T16 puis D16 = 48 + 32. Les deux routes sont valables.",
    mission:"Tente de sortir 80 en neuf fléchettes.",practice:checkout(80),quiz:[
      ["Quelle route termine 80 ?","T20 + D10","T20 + D20","T16 + D8",0,"60 + 20 = 80."],
      ["À 80, après T16, il reste…","24","32","40",1,"80 − 48 = 32."],
      ["À 80, tu touches S20. Il reste…","50","60","70",1,"80 − 20 = 60."],
    ],
  },
  {
    id:"ninety",level:3,minutes:5,family:"checkout",title:"90 : prendre une décision",
    intro:"Un finish à 90 peut se jouer en deux fléchettes si ton premier triple est réussi.",
    insight:"T18 puis D18 vaut 54 + 36 = 90. Garde la tête froide et calcule le restant réel.",
    mission:"Tente un finish 90 en neuf fléchettes.",practice:checkout(90),quiz:[
      ["Quel duo termine 90 ?","T18 + D18","T18 + D16","T20 + D18",0,"54 + 36 = 90."],
      ["À 90, après S18, combien reste-t-il ?","72","70","54",0,"90 − 18 = 72."],
      ["À 72, après T16, quel double finit ?","D8","D12","D16",1,"72 − 48 = 24, soit D12."],
    ],
  },
  {
    id:"ninety-six",level:3,minutes:5,family:"checkout",title:"96 : viser juste, calculer vite",
    intro:"Plus le score est élevé, plus le premier triple peut accélérer le finish. Ne te fie jamais au seul nombre affiché.",
    insight:"T20 puis D18 donne 60 + 36 = 96. Après S20, il reste 76 : prépare une nouvelle route.",
    mission:"Cherche un finish 96 en neuf fléchettes.",practice:checkout(96),quiz:[
      ["Quelle paire réalise 96 ?","T20 + D18","T18 + D18","T20 + D16",0,"60 + 36 = 96."],
      ["Depuis 96, tu touches S20. Combien reste-t-il ?","66","76","86",1,"96 − 20 = 76."],
      ["À 76, T20 laisse quel restant ?","16","20","36",0,"76 − 60 = 16, donc D8 devient possible."],
    ],
  },
  {
    id:"hundred",level:3,minutes:5,family:"checkout",title:"100 : le compte rond",
    intro:"Cent points peuvent se finir avec un triple et un double. Mais tu dois être prêt à prolonger la route en cas de simple.",
    insight:"T20 puis D20 = 60 + 40 = 100. À l'entraînement, répète aussi le plan de secours.",
    mission:"Tente de sortir 100 en neuf fléchettes.",practice:checkout(100),quiz:[
      ["Quelle route fait 100 en Double Out ?","T20 + D20","T20 + D16","T19 + D20",0,"60 + 40 = 100."],
      ["À 100, après S20, quel restant ?","60","80","90",1,"100 − 20 = 80."],
      ["À 80, après T20, il reste…","20","40","60",0,"80 − 60 = 20, soit D10."],
    ],
  },
  {
    id:"hundred-ten",level:3,minutes:5,family:"checkout",title:"110 : le centre en finale",
    intro:"Certaines sorties combinent un triple et le double bull. C'est une autre façon de penser la dernière fléchette.",
    insight:"T20 suivi de DBULL donne 60 + 50 = 110. DBULL est bien un double valable en Double Out.",
    mission:"Tente un finish 110 en neuf fléchettes.",practice:checkout(110),quiz:[
      ["Quelle route finit 110 en deux fléchettes ?","T20 + DBULL","T20 + BULL25","T18 + DBULL",0,"60 + 50 = 110."],
      ["Après T20 depuis 110, il reste…","40","50","60",1,"110 − 60 = 50."],
      ["Si tu touches S20 depuis 110, il reste…","80","90","100",1,"110 − 20 = 90."],
    ],
  },
  {
    id:"hundred-twenty",level:3,minutes:5,family:"checkout",title:"120 : trois gestes propres",
    intro:"Avec trois fléchettes, tu peux répartir 120 points en deux triples et un double final.",
    insight:"T20 + S20 + D20 donne 60 + 20 + 40 = 120. Après chaque toucher, regarde le score qui reste.",
    mission:"Tente de finir 120 en neuf fléchettes.",practice:checkout(120),quiz:[
      ["Quel trio termine 120 en Double Out ?","T20 + S20 + D20","T20 + S20 + D10","T20 + T20 + D20",0,"60 + 20 + 40 = 120."],
      ["Depuis 120, T20 laisse…","60","80","100",0,"120 − 60 = 60."],
      ["Après T20 puis S20 depuis 120, il reste…","20","40","60",1,"120 − 60 − 20 = 40."],
    ],
  },
  {
    id:"hundred-thirty",level:3,minutes:5,family:"checkout",title:"130 : trois lancers, un finish",
    intro:"Avec des triples bien choisis, 130 est un finish réalisable en trois fléchettes.",
    insight:"T20 + T20 + D5 = 60 + 60 + 10. Sur un raté, recalcule plutôt que jouer mécaniquement.",
    mission:"Tente de terminer 130 en neuf fléchettes.",practice:checkout(130),quiz:[
      ["Quel trio permet de terminer 130 ?","T20 + T20 + D5","T20 + T20 + D10","T20 + T19 + D5",0,"60 + 60 + 10 = 130."],
      ["Après deux T20 depuis 130, il reste…","10","20","30",0,"130 − 120 = 10."],
      ["Depuis 130, un seul S20 te laisse…","100","110","120",1,"130 − 20 = 110."],
    ],
  },
  {
    id:"bull-pressure",level:3,minutes:5,family:"checkout",title:"Le bull sous pression",
    intro:"Lorsque le temps ou le nombre de fléchettes manque, le centre intérieur peut devenir une option de finish.",
    insight:"À 110, T20 puis DBULL est possible ; à 50, DBULL gagne immédiatement. Mais ne confonds jamais 25 et 50.",
    mission:"Finis 50, avec DBULL ou une autre combinaison de doubles.",practice:checkout(50,6),quiz:[
      ["À 50, le BULL25 termine-t-il en Double Out ?","Oui, car il est central","Non, il reste 25","Oui, si c'est la dernière fléchette",1,"BULL25 vaut seulement 25 ; DBULL vaut 50."],
      ["À 110, après T20, quel finish immédiat est possible ?","DBULL","D20","BULL25",0,"Il reste 50 ; DBULL le termine."],
      ["Deux DBULL50 cumulés donnent…","50","75","100",2,"50 + 50 = 100."],
    ],
  },
  {
    id:"double-out-single-out",level:3,minutes:5,family:"checkout",title:"SO, DO : deux règles différentes",
    intro:"Tu dois connaître le type de sortie de ta partie pour décider si le dernier lancer est gagnant.",
    insight:"En Single Out, toute touche peut terminer exactement à zéro. En Double Out, la dernière touche doit être un double.",
    mission:"Mise en pratique Double Out : termine 20.",practice:checkout(20,6),quiz:[
      ["À 20, S20 gagne en Single Out ?","Oui","Non","Seulement après deux triples",0,"En Single Out, S20 finit exactement à zéro."],
      ["À 20, S20 gagne en Double Out ?","Oui","Non","Seulement au bull",1,"En Double Out, zéro sans double est un BUST."],
      ["À 20, quel double gagne en Double Out ?","D5","D10","D20",1,"D10 = 20."],
    ],
  },
  {
    id:"impossible-checkouts",level:4,minutes:5,family:"checkout",title:"La carte des impossibles",
    intro:"Ne gaspille pas une volée entière sur un objectif mathématiquement impossible avec trois fléchettes. Apprends à préparer la suivante.",
    insight:"170 est le maximum possible en trois fléchettes et Double Out. Mais certains scores inférieurs, comme 169, sont aussi impossibles à finir en trois.",
    mission:"Entraîne la préparation de 169 sur neuf fléchettes, sans te précipiter.",practice:checkout(169,9),quiz:[
      ["Quel est le finish maximal avec trois fléchettes en Double Out ?","167","170","180",1,"T20 + T20 + DBULL = 170."],
      ["169 est-il terminable en trois fléchettes en Double Out ?","Oui","Non","Seulement en trois doubles",1,"169 est un bogey number : il n'existe pas de sortie Double Out en trois fléchettes."],
      ["Sur un 169 non terminable immédiatement, le bon objectif est de…","Préparer un prochain restant jouable","Ignorer les points de la volée","Inscrire 170 comme restant",0,"Préparer la volée suivante garde une chance de gagner."],
    ],
  },
  {
    id:"big-170",level:4,minutes:6,family:"checkout",title:"170 : le sommet",
    intro:"Tu arrives au finish maximal possible en Double Out avec trois fléchettes. Chaque touche doit être parfaitement calculée.",
    insight:"60 + 60 + 50 = 170 : T20, T20 et DBULL. Le double bull doit être la dernière touche.",
    mission:"Tente le 170 avec trois fléchettes par volée, neuf fléchettes maximum.",practice:checkout(170),quiz:[
      ["Quel est le chemin du 170 en trois fléchettes ?","T20 + T20 + DBULL","T20 + T20 + BULL25","T20 + T20 + D20",0,"60 + 60 + 50 = 170."],
      ["Après T20 puis T20 depuis 170, il reste…","40","50","60",1,"170 − 120 = 50."],
      ["Après T20 puis S20 depuis 170, il reste…","70","80","90",2,"170 − 60 − 20 = 90."],
    ],
  },
  {
    id:"high-134",level:4,minutes:5,family:"checkout",title:"134 : le calcul des triples",
    intro:"Le finish expert devient plus lisible quand tu sépares d'abord les deux gros coups puis le double final.",
    insight:"T20 + T14 + D16 donne 60 + 42 + 32 = 134. Chaque fléchette conditionne la suite.",
    mission:"Tente un finish 134 en neuf fléchettes.",practice:checkout(134),quiz:[
      ["Quel trio donne un finish 134 ?","T20 + T14 + D16","T20 + T14 + D20","T20 + T18 + D16",0,"60 + 42 + 32 = 134."],
      ["Depuis 134, après T20 puis T14, le restant est…","24","32","42",1,"134 − 60 − 42 = 32."],
      ["Depuis 134, après T20 seul, il reste…","64","74","84",1,"134 − 60 = 74."],
    ],
  },
  {
    id:"precision-series",level:4,minutes:5,family:"precision",title:"Neuf fléchettes, une cible",
    intro:"Un entraînement répétable mesure la précision réelle. Une seule réussite ne suffit pas à expliquer une progression.",
    insight:"Choisis un segment, note chaque réussite ou échec et garde une série comparable d'une séance à l'autre.",
    mission:"Travaille le T19 en neuf fléchettes, sans changer de cible.",practice:target("T19"),quiz:[
      ["Sur neuf fléchettes, trois T19 correspondent à quel taux de réussite ?","1/3","1/2","2/3",0,"3 réussites sur 9 = 1/3."],
      ["La façon fiable de comparer deux séances est…","De conserver la même zone et un nombre d'essais comparable","D'ignorer les fléchettes ratées","De changer de cible à chaque essai",0,"Une série de conditions comparables montre la régularité."],
      ["Six réussites sur neuf essais correspondent à…","33,3 %","66,7 %","90 %",1,"6/9 ≈ 66,7 %."],
    ],
  },
  {
    id:"finish-24",level:2,minutes:4,family:"doubles",title:"24 : le double ou le détour",
    intro:"Avec 24 restants, la sortie directe est D12. Si tu n'es pas à l'aise, étudie la façon dont un simple modifie le restant.",
    insight:"D12 rapporte 24. Si tu fais S12, il reste 12 : D6 devient une nouvelle possibilité.",
    mission:"Tente de terminer 24 en six fléchettes.",practice:checkout(24,6),quiz:[
      ["À 24, quel double gagne immédiatement ?","D6","D12","D16",1,"D12 vaut 24 points."],
      ["À 24, S12 laisse quel double gagnant ?","D6","D8","D12",0,"24 − 12 = 12, soit D6."],
      ["Depuis 24, S4 puis D10 font…","20","24","28",1,"4 + 20 = 24 et le dernier lancer est un double."],
    ],
  },
  {
    id:"calm-recovery",level:4,minutes:5,family:"checkout",title:"Garder la tête froide",
    intro:"Quand le finish se dérobe, une bonne décision consiste à réévaluer sans gaspiller la fléchette suivante.",
    insight:"Depuis 78, si tu touches S18, il reste 60. Un nouveau plan peut alors viser S20 puis D20.",
    mission:"Tente un finish de 78 en neuf fléchettes et adapte ta route après chaque touche.",practice:checkout(78),quiz:[
      ["À 78, tu touches S18. Quel restant ?","50","60","70",1,"78 − 18 = 60."],
      ["À 60 restants, quelle route peut terminer en deux fléchettes ?","S20 + D20","S20 + D10","D20 + S20",0,"20 + 40 = 60, avec un double final."],
      ["À 78, tu fais T18. Quel double termine ensuite ?","D8","D12","D18",1,"78 − 54 = 24, soit D12."],
    ],
  },
];

export const MSS_ACADEMY_MORE_LESSONS: AcademyLesson[] = entries.map((item) => {
  const [first, ...rest] = item.quiz.map(q);
  return { id: item.id, level: item.level, minutes: item.minutes, family: item.family,
    title: item.title, intro: item.intro, insight: item.insight, mission: item.mission, practice: item.practice,
    question: first!.question, answers: first!.answers, correct: first!.correct, explanation: first!.explanation,
    questions: rest };
});
