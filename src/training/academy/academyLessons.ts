/** Original MSS Academy content. No third-party finish tables or teaching text. */
export type AcademyPractice = {
  kind: "target" | "checkout" | "points";
  target?: string;
  start?: number;
  minimum?: number;
  maxDarts: number;
};
export type AcademyQuizQuestion = {
  question: string;
  answers: [string, string, string];
  correct: number;
  explanation: string;
};
export type AcademyLesson = {
  id: string;
  level: 1 | 2 | 3 | 4;
  minutes: number;
  family: "scoring" | "doubles" | "checkout" | "precision";
  title: string;
  intro: string;
  insight: string;
  question: string;
  answers: [string, string, string];
  correct: number;
  explanation: string;
  /** Extra questions after the introductory check, to deepen each lesson. */
  questions?: AcademyQuizQuestion[];
  mission: string;
  practice: AcademyPractice;
};

/** All learning text and routes below were written for MSS; not transcribed from the reference PDF. */
export const MSS_ACADEMY_LESSONS: AcademyLesson[] = [
  {
    id: "reading-board", level: 1, minutes: 3, family: "precision", title: "La cible sous la loupe",
    intro: "Une zone étroite peut changer radicalement la valeur d'une fléchette. Apprends d'abord à reconnaître les anneaux avant de chercher la vitesse.",
    insight: "Sur un secteur, le simple donne sa valeur, l'anneau double la multiplie par deux et l'anneau triple par trois. Le centre vaut 25 ou 50.",
    question: "Combien vaut une fléchette plantée dans le double 20 ?",
    answers: ["20 points", "40 points", "60 points"], correct: 1,
    explanation: "D20 vaut 2 fois 20, donc 40 points.",
    mission: "Vise S20. Saisis chaque vraie fléchette ; tu as jusqu'à six essais.",
    practice: {kind: "target", target: "S20", maxDarts: 6},
  },
  {
    id: "mental-score", level: 1, minutes: 3, family: "scoring", title: "Le calcul en une seconde",
    intro: "Le bon réflexe n'est pas de mémoriser toutes les combinaisons, mais de décomposer très vite ce que tu viens de toucher.",
    insight: "Un triple 18, c'est trois groupes de 18 : 18 + 18 + 18. Entraîne-toi à annoncer le total avant l'écran.",
    question: "Quelle valeur correspond à T18 ?",
    answers: ["36", "54", "58"], correct: 1,
    explanation: "18 multiplié par 3 donne 54 points.",
    mission: "Trouve T18 sur la cible. Tu peux tenter jusqu'à neuf fléchettes.",
    practice: {kind: "target", target: "T18", maxDarts: 9},
  },
  {
    id: "double-door", level: 1, minutes: 4, family: "doubles", title: "La dernière porte",
    intro: "En Double Out, le dernier geste compte plus que la beauté de la volée : il faut arriver exactement à zéro grâce à un double.",
    insight: "S'il reste 32, le double 16 termine la manche. Une touche simple 16 ne suffit pas : elle laisse encore 16 points.",
    question: "Tu as 32 restants. Quelle fléchette gagne immédiatement en Double Out ?",
    answers: ["S16", "D8", "D16"], correct: 2,
    explanation: "D16 vaut 32 et termine exactement à zéro.",
    mission: "Travaille le double 16 sur la cible pendant neuf fléchettes maximum.",
    practice: {kind: "target", target: "D16", maxDarts: 9},
  },
  {
    id: "two-move-finish", level: 2, minutes: 4, family: "checkout", title: "Deux gestes pour gagner",
    intro: "Une fin de manche devient plus simple lorsque tu pars du dernier double et remontes le calcul jusqu'au score restant.",
    insight: "À 46, si tu choisis D16 comme dernière fléchette, il te faut enlever 14 points auparavant. D'autres chemins sont aussi possibles.",
    question: "À 46, quelle combinaison termine en deux fléchettes ?",
    answers: ["S14 puis D16", "S16 puis D16", "D16 puis S14"], correct: 0,
    explanation: "14 + 32 = 46. Il faut conserver le double pour la dernière fléchette.",
    mission: "À toi : finis 46 en Double Out. Tu disposes de six fléchettes, en deux volées maximum.",
    practice: {kind: "checkout", start: 46, maxDarts: 6},
  },
  {
    id: "change-the-plan", level: 2, minutes: 4, family: "checkout", title: "Le plan B intelligent",
    intro: "Une fléchette imprécise ne condamne pas ton finish. Le bon joueur recalcule tout de suite au lieu de s'acharner sur son premier plan.",
    insight: "À 58, S18 puis D20 est une option. Si tu touches S4, il reste 54 : un nouveau parcours est nécessaire.",
    question: "Tu passes de 58 à 54 après une touche S4. Quel est ton nouveau restant ?",
    answers: ["54", "40", "62"], correct: 0,
    explanation: "58 moins 4 font 54. Regarde le score réel, pas la fléchette que tu avais prévue.",
    mission: "Départ 58. Réajuste ta stratégie après chaque toucher réel ; neuf fléchettes au maximum.",
    practice: {kind: "checkout", start: 58, maxDarts: 9},
  },
  {
    id: "bust-alarm", level: 2, minutes: 4, family: "checkout", title: "Le piège du BUST",
    intro: "Il ne suffit pas de soustraire. Certaines touches annulent la volée : dépassement, restant de 1 ou zéro atteint sans double.",
    insight: "En Double Out, 24 moins T8 fait zéro mais ne gagne pas : le triple n'est pas un double. Le score revient au début de la volée.",
    question: "Tu as 24 restants et tu touches T8. Que se passe-t-il ?",
    answers: ["Tu gagnes", "BUST : retour au score de début de volée", "Il reste 1"], correct: 1,
    explanation: "Tu as atteint zéro sans double. La volée est invalidée : c'est un BUST.",
    mission: "Termine 24 sans BUST. Six fléchettes maximum.",
    practice: {kind: "checkout", start: 24, maxDarts: 6},
  },
  {
    id: "route-choice", level: 3, minutes: 5, family: "checkout", title: "Plusieurs routes, un zéro",
    intro: "Il n'existe pas qu'une bonne fléchette de placement. Choisis ton trajet selon les segments que tu maîtrises vraiment.",
    insight: "Pour 70, par exemple, T18 puis D8 fait exactement 70. Un autre trajet peut mieux convenir à ton niveau.",
    question: "Quelle combinaison vaut exactement 70, avec un double final ?",
    answers: ["T18 + D8", "T20 + D10", "S20 + D20"], correct: 0,
    explanation: "54 + 16 = 70. Les deux autres propositions valent respectivement 80 et 60.",
    mission: "Cherche ta propre route pour finir 70. Neuf fléchettes au maximum.",
    practice: {kind: "checkout", start: 70, maxDarts: 9},
  },
  {
    id: "pressure", level: 3, minutes: 5, family: "checkout", title: "La fléchette décisive",
    intro: "Quand ton rival est proche de zéro, tu peux tenter un chemin plus ambitieux. Mais garde toujours la possibilité de finir.",
    insight: "Pour 87, T17 puis D18 termine en deux fléchettes. Si le premier lancer rate, la suite dépend du point réellement inscrit.",
    question: "À 87, tu marques 51. Combien reste-t-il ?",
    answers: ["26", "36", "46"], correct: 1,
    explanation: "87 moins 51 = 36. D18 peut alors terminer la manche.",
    mission: "Imagine que ton rival peut gagner au prochain tour : tente le finish 87.",
    practice: {kind: "checkout", start: 87, maxDarts: 9},
  },
  {
    id: "repeatable-double", level: 3, minutes: 4, family: "doubles", title: "Ton double de confiance",
    intro: "Chaque joueur finit par connaître les zones où son geste est le plus régulier. La confiance se construit avec des lancers notés, pas avec une impression.",
    insight: "Teste un double précis, note chaque tentative et recommence. Tu peux ensuite comparer les performances entre plusieurs séances.",
    question: "Que faut-il privilégier pour mesurer une progression sur les doubles ?",
    answers: ["Un seul lancer réussi", "Des séries d'essais enregistrés", "Changer de cible à chaque fléchette"], correct: 1,
    explanation: "La répétition mesurée donne une information plus fiable qu'un exploit isolé.",
    mission: "Entraîne ton D20 avec neuf fléchettes. Les touches et échecs sont comptabilisés.",
    practice: {kind: "target", target: "D20", maxDarts: 9},
  },
  {
    id: "final-exam", level: 4, minutes: 5, family: "checkout", title: "Le laboratoire du 101",
    intro: "Dernier défi de ce parcours : observer, décider et recalculer sans aide lorsque plusieurs touches sont nécessaires.",
    insight: "À 101, T19 puis S12 puis D16 donne 57 + 12 + 32. Mais le bon trajet reste celui qui s'adapte à tes fléchettes réelles.",
    question: "À 101, T19 est réussi. Combien reste-t-il ?",
    answers: ["44", "42", "46"], correct: 0,
    explanation: "101 − 57 = 44. S12 puis D16 est alors une sortie possible.",
    mission: "Départ 101, Double Out. Réalise ta sortie en neuf fléchettes maximum.",
    practice: {kind: "checkout", start: 101, maxDarts: 9},
  },
];
