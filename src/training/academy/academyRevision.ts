/** Awena revision journal: questions, not match history. Never stores darts, avatars, or History V4 data. */
import type { AcademyLesson } from "./academyLessons";
import type { AcademyQuizItem } from "./academyQuizMode";
import { getAcademyQuestions } from "./academyQuizBank";

export type AcademyAnswerOrigin = "lesson" | "express" | "review";
export type AcademyReviewEntry = {
  id: string;
  attempts: number;
  correct: number;
  errors: number;
  streak: number;
  lastCorrect: boolean;
  lastAnsweredAt: number;
  dueAt: number;
  reviewAttempts: number;
  reviewCorrect: number;
};
export type AcademyReviewJournal = Record<string, AcademyReviewEntry>;
export type AcademyReviewInsights = {
  due: number;
  toConsolidate: number;
  mastered: number;
  totalErrors: number;
  reviewed: number;
  nextDueAt: number | null;
  focusLessonId: string | null;
};
const KEY = "mss.training.awena-academy.reviews.v1";
const DAY_MS = 24 * 60 * 60 * 1000;
const WAIT_DAYS = [1, 3, 7];
const MAX_ENTRIES = 250;
const MAX_SAFE_COUNTER = 100000;
const clampInt = (value: unknown, max = MAX_SAFE_COUNTER) => Math.min(max, Math.max(0, Math.floor(Number(value) || 0)));

export function academyRevisionStoreKey(profileId: string | null | undefined): string {
  return `${KEY}:${encodeURIComponent(profileId || "guest")}`;
}

export function loadAcademyReviews(profileId: string | null | undefined): AcademyReviewJournal {
  try {
    const saved: unknown = JSON.parse(localStorage.getItem(academyRevisionStoreKey(profileId)) || "{}");
    if (!saved || typeof saved !== "object" || Array.isArray(saved)) return {};
    const journal: AcademyReviewJournal = {};
    for (const [id, value] of Object.entries(saved).slice(0, MAX_ENTRIES)) {
      if (!/^[a-z0-9-]+:[0-2]$/.test(id) || !value || typeof value !== "object") continue;
      const row = value as Partial<AcademyReviewEntry>;
      const attempts = clampInt(row.attempts);
      const correct = Math.min(attempts, clampInt(row.correct));
      const errors = Math.min(attempts - correct, clampInt(row.errors));
      if (!attempts || !Number.isFinite(Number(row.dueAt))) continue;
      journal[id] = {
        id, attempts, correct, errors, streak: Math.min(3, clampInt(row.streak, 3)),
        lastCorrect: !!row.lastCorrect, lastAnsweredAt: clampInt(row.lastAnsweredAt, Number.MAX_SAFE_INTEGER),
        dueAt: clampInt(row.dueAt, Number.MAX_SAFE_INTEGER),
        reviewAttempts: Math.min(attempts, clampInt(row.reviewAttempts)),
        reviewCorrect: Math.min(correct, clampInt(row.reviewCorrect)),
      };
    }
    return journal;
  } catch { return {}; }
}

/** One first validated answer = one journal event; called only by the validation buttons. */
export function saveAcademyAnswer(
  profileId: string | null | undefined,
  questionId: string,
  isCorrect: boolean,
  origin: AcademyAnswerOrigin,
  now = Date.now(),
): AcademyReviewJournal {
  const journal = loadAcademyReviews(profileId);
  if (!/^[a-z0-9-]+:[0-2]$/.test(questionId)) return journal;
  const previous = journal[questionId];
  const streak = isCorrect ? Math.min(3, (previous?.streak || 0) + 1) : 0;
  const timestamp = Number.isFinite(now) && now >= 0 ? Math.floor(now) : Date.now();
  const next: AcademyReviewEntry = {
    id: questionId,
    attempts: (previous?.attempts || 0) + 1,
    correct: (previous?.correct || 0) + (isCorrect ? 1 : 0),
    errors: (previous?.errors || 0) + (isCorrect ? 0 : 1),
    streak,
    lastCorrect: isCorrect,
    lastAnsweredAt: timestamp,
    // A mistake can be revised immediately. Correct answers space repeats by 1/3/7 days.
    dueAt: isCorrect ? timestamp + WAIT_DAYS[streak - 1]! * DAY_MS : timestamp,
    reviewAttempts: (previous?.reviewAttempts || 0) + (origin === "review" ? 1 : 0),
    reviewCorrect: (previous?.reviewCorrect || 0) + (origin === "review" && isCorrect ? 1 : 0),
  };
  journal[questionId] = next;
  try { localStorage.setItem(academyRevisionStoreKey(profileId), JSON.stringify(journal)); } catch {}
  return journal;
}

/** Select only previously missed, due, not-yet-mastered questions. Interleave lessons to avoid a repetitive session. */
export function makeAcademyReviewRound(
  catalogue: readonly AcademyLesson[],
  journal: AcademyReviewJournal,
  amount = 10,
  now = Date.now(),
): AcademyQuizItem[] {
  const queue: { question: AcademyQuizItem; row: AcademyReviewEntry }[] = [];
  for (const lesson of catalogue) {
    getAcademyQuestions(lesson).forEach((question, index) => {
      const id = `${lesson.id}:${index}`;
      const row = journal[id];
      if (!row || !row.errors || row.streak >= 3 || row.dueAt > now) return;
      queue.push({ question: { ...question, id, lessonId: lesson.id, lessonTitle: lesson.title, level: lesson.level }, row });
    });
  }
  queue.sort((a, b) => a.row.dueAt - b.row.dueAt || b.row.errors - a.row.errors || a.question.id.localeCompare(b.question.id));
  const remaining = [...queue];
  const selected: AcademyQuizItem[] = [];
  const target = Math.max(0, Math.min(20, Math.floor(amount)));
  // First take at most one question from a lesson per pass.
  while (selected.length < target && remaining.length) {
    const seen = new Set<string>();
    let picked = false;
    for (let index = 0; index < remaining.length && selected.length < target;) {
      const item = remaining[index]!;
      if (seen.has(item.question.lessonId)) { index++; continue; }
      seen.add(item.question.lessonId);
      selected.push(item.question);
      remaining.splice(index, 1);
      picked = true;
    }
    if (!picked) break;
  }
  return selected;
}

export function getAcademyReviewInsights(
  catalogue: readonly AcademyLesson[],
  journal: AcademyReviewJournal,
  now = Date.now(),
): AcademyReviewInsights {
  const validIds = new Set(catalogue.flatMap(lesson => getAcademyQuestions(lesson).map((_, index) => `${lesson.id}:${index}`)));
  let due = 0, toConsolidate = 0, mastered = 0, totalErrors = 0, reviewed = 0;
  let nextDueAt: number | null = null;
  const lessonWeights = new Map<string, number>();
  for (const [id, row] of Object.entries(journal)) {
    if (!validIds.has(id)) continue;
    totalErrors += row.errors;
    reviewed += row.reviewAttempts;
    if (!row.errors) continue;
    if (row.streak >= 3) { mastered++; continue; }
    toConsolidate++;
    const lessonId = id.slice(0, id.lastIndexOf(":"));
    lessonWeights.set(lessonId, (lessonWeights.get(lessonId) || 0) + row.errors * 2 - row.streak);
    if (row.dueAt <= now) due++;
    else if (nextDueAt === null || row.dueAt < nextDueAt) nextDueAt = row.dueAt;
  }
  const focusLessonId = [...lessonWeights.entries()].sort((a,b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]?.[0] || null;
  return { due, toConsolidate, mastered, totalErrors, reviewed, nextDueAt, focusLessonId };
}
