/**
 * MSS Académie Awena — tiny adaptive weekly coach. The plan is a local training aid,
 * never a match entry and never a cloud/History V4 write.
 */
import type { AcademyLesson } from "./academyLessons";
import type { AcademyProgress } from "./academyStore";
import { getAcademyReviewInsights, type AcademyReviewJournal } from "./academyRevision";

export type AcademyCoachAction = "review" | "lesson" | "practice" | "quiz";
export type AcademyCoachStep = {
  id: "s1" | "s2" | "s3";
  action: AcademyCoachAction;
  lessonId: string | null;
  title: string;
  detail: string;
  minutes: number;
  completedAt: number | null;
};
export type AcademyCoachPlan = {
  version: 1;
  week: string;
  steps: [AcademyCoachStep, AcademyCoachStep, AcademyCoachStep];
};
const PLAN_KEY = "mss.training.awena-academy.coach.v1";
const MAX_AGE_MS = 1000 * 60 * 60 * 24 * 14;
export const academyCoachKey = (profileId: string | null | undefined) =>
  `${PLAN_KEY}:${encodeURIComponent(profileId || "guest")}`;

/** Local Monday, avoiding UTC shifts around midnight for users in Europe/Paris. */
export function academyCoachWeek(now = new Date()): string {
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (now.getDay() + 6) % 7);
  return [monday.getFullYear(), String(monday.getMonth() + 1).padStart(2, "0"), String(monday.getDate()).padStart(2, "0")].join("-");
}

function chooseLesson(catalogue: readonly AcademyLesson[], progress: AcademyProgress, preferredId?: string | null): AcademyLesson {
  return catalogue.find(item => item.id === preferredId) ||
    catalogue.find(item => !progress[item.id] || progress[item.id]!.best < 80) ||
    catalogue[0]!;
}

export function createAcademyCoachPlan(
  catalogue: readonly AcademyLesson[], progress: AcademyProgress, journal: AcademyReviewJournal,
  finishLessonId: string | null = null, now = new Date(),
): AcademyCoachPlan {
  if (!catalogue.length) throw new Error("Académie Awena : catalogue vide");
  const insights = getAcademyReviewInsights(catalogue, journal, now.getTime());
  const first = chooseLesson(catalogue, progress, insights.focusLessonId);
  const next = catalogue.find(item => item.id === finishLessonId) ||
    catalogue.find(item => item.id !== first.id && item.family === "doubles" && (!progress[item.id] || progress[item.id]!.best < 80)) ||
    catalogue.find(item => item.id !== first.id && (!progress[item.id] || progress[item.id]!.best < 80)) || first;
  const review = insights.due > 0;
  return {
    version: 1,
    week: academyCoachWeek(now),
    steps: [
      { id: "s1", action: review ? "review" : "lesson", lessonId: first.id,
        title: review ? "Corriger mes erreurs" : `Découvrir : ${first.title}`,
        detail: review ? `${insights.due} question${insights.due > 1 ? "s" : ""} à revoir. Awena cible tes erreurs les plus anciennes.`
          : `Awena te propose « ${first.title} » pour consolider tes bases.`,
        minutes: review ? 4 : Math.max(3, first.minutes), completedAt: null },
      { id: "s2", action: "practice", lessonId: next.id,
        title: `À la cible : ${next.title}`,
        detail: next.id === finishLessonId ? "Séance ciblée d’après tes résultats Finish DO." : "Un exercice réel sur la cible pour construire des automatismes.",
        minutes: Math.max(4, next.minutes), completedAt: null },
      { id: "s3", action: "quiz", lessonId: null,
        title: "Défi des 10 questions",
        detail: "Un Quiz express pour vérifier le calcul, les doubles et les finishs.",
        minutes: 4, completedAt: null },
    ],
  };
}

function validPlan(value: unknown, week: string, ids: Set<string>): value is AcademyCoachPlan {
  if (!value || typeof value !== "object") return false;
  const plan = value as Partial<AcademyCoachPlan>;
  if (plan.version !== 1 || plan.week !== week || !Array.isArray(plan.steps) || plan.steps.length !== 3) return false;
  return plan.steps.every((step, index) => {
    if (!step || typeof step !== "object") return false;
    if (step.id !== `s${index + 1}` || !["review", "lesson", "practice", "quiz"].includes(step.action)) return false;
    if (step.action === "quiz" ? step.lessonId !== null : typeof step.lessonId !== "string" || !ids.has(step.lessonId)) return false;
    if (typeof step.title !== "string" || step.title.length > 160 || typeof step.detail !== "string" || step.detail.length > 400) return false;
    if (!Number.isFinite(step.minutes) || step.minutes < 1 || step.minutes > 30) return false;
    return step.completedAt === null || (Number.isSafeInteger(step.completedAt) && step.completedAt > 0 && step.completedAt < Date.now() + MAX_AGE_MS);
  });
}

export function loadOrCreateAcademyCoachPlan(
  profileId: string | null | undefined,
  catalogue: readonly AcademyLesson[], progress: AcademyProgress,
  journal: AcademyReviewJournal, finishLessonId: string | null = null, now = new Date(),
): AcademyCoachPlan {
  const week = academyCoachWeek(now);
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(academyCoachKey(profileId)) || "null");
    if (validPlan(parsed, week, new Set(catalogue.map(item => item.id)))) return parsed;
  } catch { /* Off-line/private storage may be disabled. */ }
  const plan = createAcademyCoachPlan(catalogue, progress, journal, finishLessonId, now);
  try { localStorage.setItem(academyCoachKey(profileId), JSON.stringify(plan)); } catch {}
  return plan;
}

/** Completing a session is triggered only after a quiz round or a dart exercise actually ends. */
export function completeAcademyCoachStep(
  profileId: string | null | undefined, plan: AcademyCoachPlan, index: number, now = Date.now(),
): AcademyCoachPlan {
  if (!Number.isInteger(index) || index < 0 || index >= plan.steps.length) return plan;
  if (plan.week !== academyCoachWeek(new Date(now))) return plan;
  if (plan.steps[index]!.completedAt !== null) return plan;
  const steps = plan.steps.map((step, i) => i === index ? { ...step, completedAt: now } : step) as AcademyCoachPlan["steps"];
  const next: AcademyCoachPlan = { ...plan, steps };
  try { localStorage.setItem(academyCoachKey(profileId), JSON.stringify(next)); } catch {}
  return next;
}

export const academyCoachCompletedCount = (plan: AcademyCoachPlan) => plan.steps.filter(step => step.completedAt !== null).length;
export function academyCoachNextStep(plan: AcademyCoachPlan): number {
  const index = plan.steps.findIndex(step => step.completedAt === null);
  return index < 0 ? plan.steps.length - 1 : index;
}
