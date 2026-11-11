/** Extra, fully original checks for the 10 V166 lessons. V166 progress IDs remain unchanged. */
import type { AcademyLesson, AcademyQuizQuestion } from "./academyLessons";

const extras: Record<string, AcademyQuizQuestion[]> = {
  "reading-board": [
    {question:"Combien vaut T12 ?",answers:["24","36","48"],correct:1,explanation:"T12 = 3 × 12 = 36."},
    {question:"Sur une cible classique, quelle touche vaut 50 ?",answers:["BULL","DBULL","D20"],correct:1,explanation:"DBULL rapporte 50. BULL vaut 25 et D20 vaut 40."},
  ],
  "mental-score": [
    {question:"Combien vaut un double 17 ?",answers:["17","34","51"],correct:1,explanation:"D17 = 2 × 17 = 34."},
    {question:"Combien rapportent T18 puis S18 ?",answers:["54","72","108"],correct:1,explanation:"54 + 18 = 72."},
  ],
  "double-door": [
    {question:"À 40 restants, quel double termine ?",answers:["D10","D20","D16"],correct:1,explanation:"D20 = 40."},
    {question:"En Double Out, atteindre zéro avec un triple signifie…",answers:["Une victoire","Un BUST","Un bonus"],correct:1,explanation:"En Double Out, le dernier lancer doit être un double."},
  ],
  "two-move-finish": [
    {question:"À 46, S6 puis quel double permet de gagner ?",answers:["D20","D16","D18"],correct:0,explanation:"46 − 6 = 40, donc D20."},
    {question:"À 46, S14 laisse…",answers:["30","32","34"],correct:1,explanation:"46 − 14 = 32."},
  ],
  "change-the-plan": [
    {question:"Depuis 58, T14 laisse combien ?",answers:["16","18","20"],correct:0,explanation:"58 − 42 = 16, donc D8 possible."},
    {question:"À 54, S14 te laisse quel double gagnant ?",answers:["D16","D20","D12"],correct:1,explanation:"54 − 14 = 40, soit D20."},
  ],
  "bust-alarm": [
    {question:"À 20 restants, T20 provoque…",answers:["Un finish","Un BUST","Un restant de 0 valide"],correct:1,explanation:"60 points dépassent les 20 restants : BUST."},
    {question:"À 16 restants, S15 laisse 1. En Double Out, c'est…",answers:["Un BUST","Un double 1","Une victoire"],correct:0,explanation:"Un restant de 1 est impossible à terminer avec un double : BUST."},
  ],
  "route-choice": [
    {question:"À 70, S20 laisse quel restant ?",answers:["40","50","60"],correct:1,explanation:"70 − 20 = 50."},
    {question:"Quelle combinaison finit 70 avec double final ?",answers:["S20 + D20","T18 + D8","T20 + D10"],correct:1,explanation:"T18 + D8 = 54 + 16 = 70 ; les autres valent 60 et 80."},
  ],
  "pressure": [
    {question:"À 87, après S17, combien reste-t-il ?",answers:["60","70","77"],correct:1,explanation:"87 − 17 = 70."},
    {question:"À 87, T17 puis quel double termine ?",answers:["D16","D18","D20"],correct:1,explanation:"87 − 51 = 36, soit D18."},
  ],
  "repeatable-double": [
    {question:"Trois doubles réussis en neuf essais donnent environ…",answers:["25 %","33 %","50 %"],correct:1,explanation:"3/9 = 1/3 ≈ 33 %."},
    {question:"Pour comparer D20 aujourd'hui et demain, mieux vaut…",answers:["Compter toutes les tentatives","Compter seulement la première réussite","Changer de double"],correct:0,explanation:"Le nombre total de tentatives et de touches permet de mesurer le taux de réussite."},
  ],
  "final-exam": [
    {question:"À 101, S20 laisse…",answers:["71","81","91"],correct:1,explanation:"101 − 20 = 81."},
    {question:"Après T19 puis S12 depuis 101, il reste…",answers:["24","32","44"],correct:1,explanation:"101 − 57 − 12 = 32, soit D16."},
  ],
};

export function getAcademyQuestions(lesson: AcademyLesson): AcademyQuizQuestion[] {
  const original = { question: lesson.question, answers: lesson.answers, correct: lesson.correct, explanation: lesson.explanation };
  return [original, ...(lesson.questions ?? extras[lesson.id] ?? [])];
}
