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

const KEY = "dc_training_exercise_drafts_v2";
const LEGACY_KEY = "dc_training_exercise_drafts_v1";
const MAX_DRAFT_AGE_MS = 14 * 24 * 60 * 60 * 1000;
const UPDATE_EVENT = "dc-training-exercise-draft-updated";

function replacer(_key: string, value: any) {
  if (value instanceof Set) return { __trainingSet: Array.from(value) };
  return value;
}

function reviver(_key: string, value: any) {
  if (value && Array.isArray(value.__trainingSet)) return new Set(value.__trainingSet);
  return value;
}

function normalizeDraft(value: any): TrainingExerciseDraft | null {
  if (!value || typeof value !== "object") return null;
  const exerciseId = String(value.exerciseId || "").trim();
  if (!exerciseId) return null;
  const engine = value.engine === "custom" ? "custom" : "standard";
  const savedAt = Number(value.savedAt || 0);
  const startedAt = Number(value.startedAt || savedAt || Date.now());
  if (!Number.isFinite(savedAt) || savedAt <= 0 || !Number.isFinite(startedAt) || startedAt <= 0) return null;
  return {
    exerciseId,
    participantId: value.participantId == null || value.participantId === "" ? null : String(value.participantId),
    engine,
    savedAt,
    startedAt,
    state: value.state && typeof value.state === "object" ? value.state : {},
    visitHistory: Array.isArray(value.visitHistory) ? value.visitHistory : [],
    secondsLeft: value.secondsLeft == null ? null : Math.max(0, Number(value.secondsLeft) || 0),
  };
}

function emitDraftUpdate() {
  try { window.dispatchEvent(new Event(UPDATE_EVENT)); } catch {}
}

function parseStore(raw: string | null): Record<string, TrainingExerciseDraft> {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw, reviver);
    if (!parsed || typeof parsed !== "object") return {};
    const next: Record<string, TrainingExerciseDraft> = {};
    Object.entries(parsed).forEach(([key, value]) => {
      const draft = normalizeDraft(value);
      if (draft) next[key] = draft;
    });
    return next;
  } catch {
    return {};
  }
}

function loadStore(): Record<string, TrainingExerciseDraft> {
  try {
    const current = parseStore(localStorage.getItem(KEY));
    if (Object.keys(current).length) return current;
    const legacy = parseStore(localStorage.getItem(LEGACY_KEY));
    if (Object.keys(legacy).length) {
      localStorage.setItem(KEY, JSON.stringify(legacy, replacer));
      localStorage.removeItem(LEGACY_KEY);
      return legacy;
    }
  } catch {}
  return {};
}

function saveStore(store: Record<string, TrainingExerciseDraft>) {
  try { localStorage.setItem(KEY, JSON.stringify(store, replacer)); } catch {}
}

function draftKey(exerciseId: string, participantId?: string | null) {
  return `${String(participantId || "account")}::${String(exerciseId || "")}`;
}

function isExpired(draft: TrainingExerciseDraft, now = Date.now()) {
  return now - Number(draft.savedAt || 0) > MAX_DRAFT_AGE_MS;
}

export function pruneTrainingExerciseDrafts(participantId?: string | null) {
  const store = loadStore();
  const now = Date.now();
  let changed = false;
  Object.entries(store).forEach(([key, draft]) => {
    const participantMatches = participantId === undefined || String(draft.participantId || "account") === String(participantId || "account");
    if ((participantMatches && isExpired(draft, now)) || !normalizeDraft(draft)) {
      delete store[key];
      changed = true;
    }
  });
  if (changed) {
    saveStore(store);
    emitDraftUpdate();
  }
  return changed;
}

export function loadTrainingExerciseDraft(exerciseId: string, participantId?: string | null): TrainingExerciseDraft | null {
  if (!exerciseId) return null;
  const store = loadStore();
  const key = draftKey(exerciseId, participantId);
  const draft = store[key] || null;
  if (!draft || draft.exerciseId !== exerciseId || isExpired(draft)) {
    if (draft) {
      delete store[key];
      saveStore(store);
      emitDraftUpdate();
    }
    return null;
  }
  return draft;
}

export function saveTrainingExerciseDraft(draft: TrainingExerciseDraft) {
  const normalized = normalizeDraft({ ...draft, savedAt: Date.now() });
  if (!normalized) return;
  const store = loadStore();
  store[draftKey(normalized.exerciseId, normalized.participantId)] = normalized;
  saveStore(store);
  emitDraftUpdate();
}

export function clearTrainingExerciseDraft(exerciseId: string, participantId?: string | null) {
  if (!exerciseId) return;
  const store = loadStore();
  const key = draftKey(exerciseId, participantId);
  if (!(key in store)) return;
  delete store[key];
  saveStore(store);
  emitDraftUpdate();
}

export function hasMeaningfulTrainingExerciseDraft(draft: TrainingExerciseDraft | null) {
  if (!draft || isExpired(draft)) return false;
  const s = draft.state || {};
  return Number(s.darts || 0) > 0 || Number(s.round || 0) > 0 || Number(s.index || 0) > 0 || Number(s.progress || 0) > 0 || Number(s.points || 0) !== 0 || Number(s.aux?.techniqueStage || 0) > 0;
}

export function getEffectiveDraftSeconds(draft: TrainingExerciseDraft | null) {
  if (!draft || draft.secondsLeft == null || isExpired(draft)) return null;
  // A paused Training exercise must remain paused while the app is closed.
  // Subtracting wall-clock time here could silently finish a resumed session.
  return Math.max(0, Math.floor(Number(draft.secondsLeft) || 0));
}
