import type { ChallengeEntryLike, ChallengeExerciseConfigLike } from './challengeExercises';

export const PERFECT_LINE_STEPS = ['D','G','T','P','25','50'] as const;
export type PerfectLineStep = typeof PERFECT_LINE_STEPS[number];

export function perfectLineSegment(cfg: Pick<ChallengeExerciseConfigLike,'perfectLineSegment'>): number {
  const value = Math.round(Number(cfg.perfectLineSegment) || 20);
  return Math.max(1, Math.min(20, value));
}

export function perfectLineLabels(cfg: Pick<ChallengeExerciseConfigLike,'perfectLineSegment'>): string[] {
  const n = perfectLineSegment(cfg);
  return [`D${n}`,`G${n}`,`T${n}`,`P${n}`,'BULL25','DBULL50'];
}

/** Strict rings: G = grand simple (extérieur du triple), P = petit simple (intérieur du triple). */
export function perfectLineAccepts(entry: ChallengeEntryLike, step: number, target: number): boolean {
  switch (step) {
    case 0: return entry.hit === 'D' && Number(entry.segment) === target;
    case 1: return entry.hit === 'S' && entry.singleZone === 'G' && Number(entry.segment) === target;
    case 2: return entry.hit === 'T' && Number(entry.segment) === target;
    case 3: return entry.hit === 'S' && entry.singleZone === 'P' && Number(entry.segment) === target;
    case 4: return entry.hit === '25';
    case 5: return entry.hit === '50';
    default: return false;
  }
}

/** Stateless reconstruction keeps Undo, History and cross-device resume consistent. */
export function perfectLineProgress(entries: ChallengeEntryLike[], cfg: ChallengeExerciseConfigLike) {
  const sector = perfectLineSegment(cfg);
  let step = 0;
  const successful: boolean[] = Array(entries.length).fill(false);
  const stageAttempts: number[] = Array(6).fill(0);
  const stageCompletedOnDart: number[] = Array(6).fill(0);
  for (let i=0; i<entries.length; i++) {
    if (step>=6) break;
    stageAttempts[step]++;
    if (perfectLineAccepts(entries[i],step,sector)) {
      successful[i] = true;
      stageCompletedOnDart[step] = i+1;
      step++;
    }
  }
  return {step, finished:step===6, darts:entries.length, successful, stageAttempts, stageCompletedOnDart};
}

/** Compute whose turn it is: up to three darts, but a finished player yields immediately. */
export function perfectLineNextParticipant<T extends {id:string}>(log: (ChallengeEntryLike & {pid:string})[], participants:T[], cfg:ChallengeExerciseConfigLike): number {
  if (!participants.length || !log.length) return 0;
  const completed = participants.map(p=>perfectLineProgress(log.filter(e=>e.pid===p.id),cfg).finished);
  if (completed.every(Boolean)) return 0;
  const last = log[log.length-1];
  const lastIndex = participants.findIndex(p=>p.id===last.pid);
  if (lastIndex<0) return 0;
  let run=0;
  for (let i=log.length-1;i>=0 && log[i].pid===last.pid;i--) run++;
  if (!completed[lastIndex] && run%3!==0) return lastIndex;
  for(let delta=1;delta<=participants.length;delta++){
    const index=(lastIndex+delta)%participants.length;
    if(!completed[index])return index;
  }
  return 0;
}
