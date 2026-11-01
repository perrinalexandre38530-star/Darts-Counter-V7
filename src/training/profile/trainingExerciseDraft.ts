export type TrainingExerciseDraft = {
  exerciseId: string;
  participantId: string | null;
  engine: "standard" | "custom";
  savedAt: number;
  startedAt: number;
  state: any;
  visitHistory?: any[];
  secondsLeft?: number | null;
};

const KEY = "dc_training_exercise_drafts_v1";

function replacer(_key: string, value: any) {
  if (value instanceof Set) return { __trainingSet: Array.from(value) };
  return value;
}

function reviver(_key: string, value: any) {
  if (value && Array.isArray(value.__trainingSet)) return new Set(value.__trainingSet);
  return value;
}

function loadStore(): Record<string, TrainingExerciseDraft> {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw, reviver);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function saveStore(store: Record<string, TrainingExerciseDraft>) {
  try { localStorage.setItem(KEY, JSON.stringify(store, replacer)); } catch {}
}

function draftKey(exerciseId: string, participantId?: string | null) {
  return `${String(participantId || "account")}::${String(exerciseId || "")}`;
}

export function loadTrainingExerciseDraft(exerciseId: string, participantId?: string | null): TrainingExerciseDraft | null {
  if (!exerciseId) return null;
  const draft = loadStore()[draftKey(exerciseId, participantId)] || null;
  if (!draft || draft.exerciseId !== exerciseId) return null;
  return draft;
}

export function saveTrainingExerciseDraft(draft: TrainingExerciseDraft) {
  if (!draft?.exerciseId) return;
  const store = loadStore();
  store[draftKey(draft.exerciseId, draft.participantId)] = { ...draft, savedAt: Date.now() };
  saveStore(store);
}

export function clearTrainingExerciseDraft(exerciseId: string, participantId?: string | null) {
  if (!exerciseId) return;
  const store = loadStore();
  delete store[draftKey(exerciseId, participantId)];
  saveStore(store);
}

export function hasMeaningfulTrainingExerciseDraft(draft: TrainingExerciseDraft | null) {
  if (!draft) return false;
  const s = draft.state || {};
  return Number(s.darts || 0) > 0 || Number(s.round || 0) > 0 || Number(s.index || 0) > 0 || Number(s.points || 0) !== 0;
}

export function getEffectiveDraftSeconds(draft: TrainingExerciseDraft | null) {
  if (!draft || draft.secondsLeft == null) return null;
  const elapsed = Math.max(0, Math.floor((Date.now() - Number(draft.savedAt || Date.now())) / 1000));
  return Math.max(0, Number(draft.secondsLeft) - elapsed);
}
