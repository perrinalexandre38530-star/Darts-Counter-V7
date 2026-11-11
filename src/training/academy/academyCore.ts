import type { TrainingDart } from "../lib/trainingDarts";
import type { AcademyPractice } from "./academyLessons";

export type AcademyRun = {
  remaining: number;
  darts: number;
  hit: boolean;
  points: number;
  ended: boolean;
  won: boolean;
  busts: number;
  lastMessage: string;
  lastVisit: string[];
};

export function newAcademyRun(practice: AcademyPractice): AcademyRun {
  return { remaining: practice.start || 0, darts: 0, hit: false, points: 0,
    ended: false, won: false, busts: 0, lastMessage: "", lastVisit: [] };
}

/** A real submitted visit; never assumes the player threw all 3 darts. */
export function applyAcademyVisit(practice: AcademyPractice, state: AcademyRun, visit: TrainingDart[]): AcademyRun {
  if (state.ended || !visit.length) return state;
  const result: AcademyRun = { ...state, lastVisit: [] };
  const startOfVisit = state.remaining;
  const space = Math.max(0, practice.maxDarts - state.darts);
  for (const dart of visit.slice(0, Math.min(3, space))) {
    result.darts += 1;
    result.lastVisit.push(dart.label);
    if (practice.kind === "target") {
      result.points += dart.score;
      if (dart.label === practice.target) {
        result.hit = true;
        result.won = true;
        result.ended = true;
        result.lastMessage = `Bravo ! ${dart.label} est bien la zone visée.`;
        break;
      }
      result.lastMessage = dart.miss ? "Fléchette manquée : vise à nouveau." : `${dart.label} : continue, la bonne zone n'est pas encore touchée.`;
    } else if (practice.kind === "points") {
      result.points += dart.score;
      if (result.points >= (practice.minimum || 0)) {
        result.won = true;
        result.ended = true;
        result.lastMessage = `Objectif de ${practice.minimum} points atteint !`;
        break;
      }
      result.lastMessage = `${result.points} points cumulés : continue.`;
    } else {
      const after = result.remaining - dart.score;
      if (after < 0 || after === 1 || (after === 0 && dart.mult !== 2)) {
        result.busts += 1;
        result.remaining = startOfVisit;
        result.lastMessage = `BUST sur ${dart.label} : la volée est annulée, retour à ${startOfVisit}.`;
        break;
      }
      result.remaining = after;
      if (after === 0) {
        result.won = true;
        result.ended = true;
        result.lastMessage = `Finish validé sur ${dart.label}, en ${result.darts} fléchette${result.darts > 1 ? "s" : ""} !`;
        break;
      }
      result.lastMessage = `Il reste ${after}. Recalcule avant ta prochaine fléchette.`;
    }
  }
  if (!result.ended && result.darts >= practice.maxDarts) {
    result.ended = true;
    result.lastMessage = `Fin du défi en ${result.darts} fléchettes. Tu peux recommencer pour progresser.`;
  }
  return result;
}

export function academyResultScore(quizCorrect: boolean | number, run: AcademyRun, practice: AcademyPractice): number {
  // Theory gives up to 30 / 100 proportionally across all quiz questions.
  // Keep boolean compatibility with V166 callers and tests.
  const theory = Math.round(30 * (typeof quizCorrect === "boolean" ? (quizCorrect ? 1 : 0) : Math.max(0, Math.min(1, quizCorrect))));
  if (run.won) return theory + 70;
  if (practice.kind === "checkout") {
    const ratio = Math.max(0, Math.min(1, ((practice.start || 0) - run.remaining) / Math.max(1, practice.start || 0)));
    return Math.round(theory + ratio * 30);
  }
  return theory;
}
