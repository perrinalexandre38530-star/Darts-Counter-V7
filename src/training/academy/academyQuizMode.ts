import type { AcademyLesson, AcademyQuizQuestion } from "./academyLessons";
import { getAcademyQuestions } from "./academyQuizBank";

export type AcademyQuizItem = AcademyQuizQuestion & { id: string; lessonId: string; lessonTitle: string; level: number };

/** Balanced across 4 levels. The offset changes question selection after each round. */
export function makeAcademyQuizRound(catalogue: AcademyLesson[], amount = 10, offset = 0): AcademyQuizItem[] {
  const groups = [1, 2, 3, 4].map(level => catalogue.filter(item => item.level === level));
  const used = new Set<string>();
  const selected: AcademyQuizItem[] = [];
  const shift = Math.max(0, Math.floor(offset));
  const desired = Math.min(Math.max(0, Math.floor(amount)), catalogue.length);
  let pass = 0;
  while (selected.length < desired && pass <= catalogue.length) {
    let grew = false;
    for (let g = 0; g < groups.length && selected.length < desired; g++) {
      const bucket = groups[(g + shift) % groups.length]!;
      if (!bucket.length) continue;
      const index = (shift + pass) % bucket.length;
      const lesson = bucket[index]!;
      if (used.has(lesson.id)) continue;
      const questions = getAcademyQuestions(lesson);
      if (!questions.length) continue;
      const quizIndex = (shift + pass + g) % questions.length;
      selected.push({ ...questions[quizIndex]!, id: `${lesson.id}:${quizIndex}`,
        lessonId: lesson.id, lessonTitle: lesson.title, level: lesson.level });
      used.add(lesson.id);
      grew = true;
    }
    pass++;
    if (!grew && pass > catalogue.length) break;
  }
  return selected;
}

/** A stable snapshot: a first response is the only one that counts toward the round score. */
export function quizCorrectCount(questions: readonly AcademyQuizQuestion[], answers: readonly number[]) {
  return questions.reduce((score, question, index) => score + (answers[index] === question.correct ? 1 : 0), 0);
}
