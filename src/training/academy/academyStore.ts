export type AcademyResult = {
  id: string;
  attempts: number;
  best: number;
  latest: number;
  quizCorrect: boolean;
  practiceWon: boolean;
  darts: number;
  busts: number;
  updatedAt: number;
  quizCorrectCount?: number;
  quizQuestionCount?: number;
};
export type AcademyProgress = Record<string, AcademyResult>;
const KEY = "mss.training.awena-academy.v1";

/** Local device training progress, never written into match History V4. */
export function academyStoreKey(profileId: string | null | undefined) {
  return `${KEY}:${encodeURIComponent(profileId || "guest")}`;
}
export function loadAcademyProgress(profileId: string | null | undefined): AcademyProgress {
  try {
    const value = JSON.parse(localStorage.getItem(academyStoreKey(profileId)) || "{}");
    if (!value || typeof value !== "object" || Array.isArray(value)) return {};
    const valid: AcademyProgress = {};
    for (const [id, row] of Object.entries(value)) {
      if (!row || typeof row !== "object") continue;
      const r = row as AcademyResult;
      if (r.id !== id || !Number.isFinite(Number(r.best))) continue;
      valid[id] = { id, attempts: Math.max(0, Number(r.attempts) || 0), best: Math.max(0, Math.min(100, Number(r.best) || 0)),
        latest: Math.max(0, Math.min(100, Number(r.latest) || 0)), quizCorrect: !!r.quizCorrect,
        practiceWon: !!r.practiceWon, darts: Math.max(0, Number(r.darts) || 0),
        busts: Math.max(0, Number(r.busts) || 0), updatedAt: Number(r.updatedAt) || 0,
        quizCorrectCount: Math.max(0, Number(r.quizCorrectCount) || 0),
        quizQuestionCount: Math.max(0, Number(r.quizQuestionCount) || 0) };
    }
    return valid;
  } catch { return {}; }
}
export function saveAcademyAttempt(profileId: string | null | undefined, id: string, input: {score: number; quizCorrect: boolean; practiceWon: boolean; darts: number; busts: number; quizCorrectCount?: number; quizQuestionCount?: number}): AcademyProgress {
  const progress = loadAcademyProgress(profileId);
  const old = progress[id];
  const score = Math.max(0, Math.min(100, Math.round(input.score)));
  progress[id] = { id, attempts: (old?.attempts || 0) + 1, best: Math.max(old?.best || 0, score), latest: score,
    quizCorrect: input.quizCorrect, practiceWon: input.practiceWon, darts: input.darts, busts: input.busts, updatedAt: Date.now(),
    quizCorrectCount: Math.max(0, Number(input.quizCorrectCount) || 0), quizQuestionCount: Math.max(0, Number(input.quizQuestionCount) || 0) };
  try { localStorage.setItem(academyStoreKey(profileId), JSON.stringify(progress)); } catch {}
  return progress;
}


export type AcademyQuizStats = { rounds: number; best: number; latest: number; questions: number; correct: number };
const QUIZ_KEY = "mss.training.awena-academy.quiz.v1";
function quizKey(profileId: string | null | undefined) {
  return `${QUIZ_KEY}:${encodeURIComponent(profileId || "guest")}`;
}
export function loadAcademyQuizStats(profileId: string | null | undefined): AcademyQuizStats {
  try {
    const row = JSON.parse(localStorage.getItem(quizKey(profileId)) || "{}");
    const num = (key: keyof AcademyQuizStats) => Math.max(0, Math.floor(Number(row?.[key]) || 0));
    return { rounds: num("rounds"), best: Math.min(100, num("best")), latest: Math.min(100, num("latest")),
      questions: num("questions"), correct: num("correct") };
  } catch { return { rounds: 0, best: 0, latest: 0, questions: 0, correct: 0 }; }
}
export function saveAcademyQuizRound(profileId: string | null | undefined, correct: number, questions: number): AcademyQuizStats {
  const prev = loadAcademyQuizStats(profileId);
  const total = Math.max(0, Math.floor(Number(questions) || 0));
  if (!total) return prev;
  const earned = Math.max(0, Math.min(total, Math.floor(Number(correct) || 0)));
  const latest = Math.round(100 * earned / total);
  const next = { rounds: prev.rounds + 1, best: Math.max(prev.best, latest), latest,
    correct: prev.correct + earned, questions: prev.questions + total };
  try { localStorage.setItem(quizKey(profileId), JSON.stringify(next)); } catch {}
  return next;
}
