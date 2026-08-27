export type FitMuscle =
  | "Pectoraux"
  | "Dos"
  | "Lombaires"
  | "Épaules"
  | "Biceps"
  | "Triceps"
  | "Avant-bras"
  | "Quadriceps"
  | "Ischios"
  | "Fessiers"
  | "Adducteurs"
  | "Abducteurs"
  | "Mollets"
  | "Abdos"
  | "Cou"
  | "Full body";

export type FitEquipment =
  | "Barre"
  | "Haltères"
  | "Machine"
  | "Poulie"
  | "Poids du corps"
  | "Kettlebell"
  | "Élastique"
  | "TRX"
  | "Banc"
  | "Médecine ball"
  | "Autre";

export type FitExercise = {
  id: string;
  name: string;
  muscle: FitMuscle;
  secondary?: FitMuscle[];
  equipment: FitEquipment;
  icon: string;
  accent: string;
  /** Optional metadata used by the open FIT PERF catalogue. */
  source?: "mss" | "free-exercise-db";
  sourceId?: string;
  sourceLicense?: string;
  level?: string;
  category?: string;
  force?: string;
  mechanic?: string;
  movementPattern?: string;
  goalTags?: string[];
  rawPrimaryMuscles?: string[];
  rawSecondaryMuscles?: string[];
  instructions?: string[];
  tips?: string[];
  commonMistakes?: string[];
  imagePaths?: string[];
  /** Motion family used to reuse one AWENA/mocap movement across exercise variants. */
  motionKey?: string;
};

export type FitSet = {
  id: string;
  weightKg: number;
  reps: number;
  completed: boolean;
  warmup?: boolean;
};

export type FitSessionExercise = {
  id: string;
  exerciseId: string;
  sets: FitSet[];
};

export type FitSession = {
  id: string;
  title: string;
  templateId?: string;
  profileId?: string;
  profileName?: string;
  startedAt: number;
  endedAt?: number;
  exercises: FitSessionExercise[];
};

export type FitTemplate = {
  id: string;
  name: string;
  subtitle: string;
  icon: string;
  accent: string;
  exerciseIds: string[];
};

const STORAGE_KEY = "mss-fit-perf-sessions-v1";
export const FREE_EXERCISE_CACHE_KEY = "mss-fit-perf-free-exercise-db-v1";

const externalExerciseRegistry = new Map<string, FitExercise>();
let externalCacheHydrated = false;

export function registerExternalFitExercises(exercises: FitExercise[]) {
  for (const exercise of exercises) {
    if (exercise && typeof exercise.id === "string" && exercise.id) externalExerciseRegistry.set(exercise.id, exercise);
  }
}

function hydrateExternalExerciseCache() {
  if (externalCacheHydrated || typeof window === "undefined") return;
  externalCacheHydrated = true;
  try {
    const parsed = JSON.parse(window.localStorage.getItem(FREE_EXERCISE_CACHE_KEY) || "null") as { exercises?: FitExercise[] } | null;
    if (Array.isArray(parsed?.exercises)) registerExternalFitExercises(parsed.exercises);
  } catch {}
}

export const FIT_EXERCISES: FitExercise[] = [
  { id: "bench", name: "Développé couché", muscle: "Pectoraux", secondary: ["Triceps", "Épaules"], equipment: "Barre", icon: "▰", accent: "#f7c948" },
  { id: "incline-db", name: "Développé incliné", muscle: "Pectoraux", secondary: ["Triceps", "Épaules"], equipment: "Haltères", icon: "◩", accent: "#ffcf66" },
  { id: "cable-fly", name: "Écarté poulie", muscle: "Pectoraux", equipment: "Poulie", icon: "⌁", accent: "#ffd77a" },
  { id: "pullup", name: "Tractions", muscle: "Dos", secondary: ["Biceps"], equipment: "Poids du corps", icon: "⌃", accent: "#76e4f7" },
  { id: "row", name: "Rowing barre", muscle: "Dos", secondary: ["Biceps"], equipment: "Barre", icon: "≋", accent: "#60d5ef" },
  { id: "lat-pulldown", name: "Tirage vertical", muscle: "Dos", secondary: ["Biceps"], equipment: "Poulie", icon: "⇣", accent: "#56c5e5" },
  { id: "ohp", name: "Développé militaire", muscle: "Épaules", secondary: ["Triceps"], equipment: "Barre", icon: "⇧", accent: "#b59cff" },
  { id: "lateral-raise", name: "Élévations latérales", muscle: "Épaules", equipment: "Haltères", icon: "↔", accent: "#c4adff" },
  { id: "curl", name: "Curl biceps", muscle: "Biceps", equipment: "Haltères", icon: "◜", accent: "#ff8fb8" },
  { id: "triceps-push", name: "Extension triceps", muscle: "Triceps", equipment: "Poulie", icon: "⇢", accent: "#ff719f" },
  { id: "squat", name: "Squat", muscle: "Quadriceps", secondary: ["Fessiers", "Ischios"], equipment: "Barre", icon: "⌄", accent: "#7df29a" },
  { id: "leg-press", name: "Presse à cuisses", muscle: "Quadriceps", secondary: ["Fessiers"], equipment: "Machine", icon: "◫", accent: "#67e889" },
  { id: "rdl", name: "Soulevé de terre roumain", muscle: "Ischios", secondary: ["Fessiers", "Dos"], equipment: "Barre", icon: "⌁", accent: "#61d981" },
  { id: "hip-thrust", name: "Hip thrust", muscle: "Fessiers", secondary: ["Ischios"], equipment: "Barre", icon: "◓", accent: "#69eca5" },
  { id: "calf", name: "Mollets debout", muscle: "Mollets", equipment: "Machine", icon: "⌃", accent: "#54d58a" },
  { id: "plank", name: "Gainage", muscle: "Abdos", equipment: "Poids du corps", icon: "▬", accent: "#ff9b66" },
  { id: "deadlift", name: "Soulevé de terre", muscle: "Full body", secondary: ["Dos", "Fessiers", "Ischios"], equipment: "Barre", icon: "◆", accent: "#f58d62" },
  { id: "goblet", name: "Goblet squat", muscle: "Quadriceps", secondary: ["Fessiers"], equipment: "Kettlebell", icon: "⬡", accent: "#7ce899" },
];

export const FIT_TEMPLATES: FitTemplate[] = [
  { id: "push", name: "PUSH", subtitle: "Pectoraux · épaules · triceps", icon: "P", accent: "#f7c948", exerciseIds: ["bench", "incline-db", "cable-fly", "ohp", "lateral-raise", "triceps-push"] },
  { id: "pull", name: "PULL", subtitle: "Dos · biceps · chaîne postérieure", icon: "R", accent: "#70def4", exerciseIds: ["pullup", "row", "lat-pulldown", "rdl", "curl"] },
  { id: "legs", name: "LEGS", subtitle: "Quadriceps · ischios · fessiers", icon: "L", accent: "#72ed98", exerciseIds: ["squat", "leg-press", "rdl", "hip-thrust", "calf"] },
  { id: "full", name: "FULL BODY", subtitle: "Tout le corps · force générale", icon: "F", accent: "#b69dff", exerciseIds: ["squat", "bench", "row", "ohp", "deadlift", "plank"] },
];

function parseSessions(raw: string | null): FitSession[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item) => item && typeof item === "object") as FitSession[];
  } catch {
    return [];
  }
}

export function loadFitSessions(): FitSession[] {
  try {
    return parseSessions(window.localStorage.getItem(STORAGE_KEY)).sort((a, b) => Number(b.startedAt || 0) - Number(a.startedAt || 0));
  } catch {
    return [];
  }
}

export function saveFitSessions(sessions: FitSession[]) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions.slice(0, 250)));
  } catch {}
}

export function appendFitSession(session: FitSession) {
  const existing = loadFitSessions().filter((item) => item.id !== session.id);
  saveFitSessions([session, ...existing]);
}

export function makeId(prefix = "fit") {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function exerciseById(id: string): FitExercise | undefined {
  const curated = FIT_EXERCISES.find((exercise) => exercise.id === id);
  if (curated) return curated;
  hydrateExternalExerciseCache();
  return externalExerciseRegistry.get(id);
}

export function defaultSets(weightKg = 20, count = 3, reps = 10): FitSet[] {
  return Array.from({ length: count }, (_, index) => ({ id: makeId("set"), weightKg, reps, completed: false, warmup: index === 0 && count >= 4 }));
}

export function createSessionFromTemplate(template: FitTemplate | null, owner?: { profileId?: string | null; profileName?: string | null }): FitSession {
  const exerciseIds = template?.exerciseIds || ["bench", "row", "squat"];
  return {
    id: makeId("session"),
    title: template?.name || "SÉANCE LIBRE",
    templateId: template?.id,
    profileId: owner?.profileId ? String(owner.profileId) : undefined,
    profileName: owner?.profileName ? String(owner.profileName) : undefined,
    startedAt: Date.now(),
    exercises: exerciseIds.map((exerciseId) => ({ id: makeId("sx"), exerciseId, sets: defaultSets(exerciseId === "squat" || exerciseId === "deadlift" ? 40 : 20, 3, 10) })),
  };
}

export function sessionVolume(session: FitSession): number {
  return session.exercises.reduce((total, exercise) => total + exercise.sets.reduce((subtotal, set) => subtotal + (set.completed ? Math.max(0, Number(set.weightKg) || 0) * Math.max(0, Number(set.reps) || 0) : 0), 0), 0);
}

export function completedSets(session: FitSession): number {
  return session.exercises.reduce((total, exercise) => total + exercise.sets.filter((set) => set.completed).length, 0);
}

export function totalSets(session: FitSession): number {
  return session.exercises.reduce((total, exercise) => total + exercise.sets.length, 0);
}

export function estimated1RM(weightKg: number, reps: number): number {
  if (weightKg <= 0 || reps <= 0) return 0;
  if (reps === 1) return weightKg;
  return weightKg * (1 + Math.min(reps, 15) / 30);
}

export type FitRecord = {
  exerciseId: string;
  exerciseName: string;
  weightKg: number;
  reps: number;
  oneRm: number;
  sessionDate: number;
};

export function buildFitRecords(sessions: FitSession[]): FitRecord[] {
  const map = new Map<string, FitRecord>();
  for (const session of sessions) {
    for (const row of session.exercises) {
      const exercise = exerciseById(row.exerciseId);
      if (!exercise) continue;
      for (const set of row.sets) {
        if (!set.completed) continue;
        const oneRm = estimated1RM(Number(set.weightKg) || 0, Number(set.reps) || 0);
        const prev = map.get(row.exerciseId);
        if (!prev || oneRm > prev.oneRm) {
          map.set(row.exerciseId, { exerciseId: row.exerciseId, exerciseName: exercise.name, weightKg: Number(set.weightKg) || 0, reps: Number(set.reps) || 0, oneRm, sessionDate: session.endedAt || session.startedAt });
        }
      }
    }
  }
  return [...map.values()].sort((a, b) => b.oneRm - a.oneRm);
}

export function weekStart(ts = Date.now()) {
  const date = new Date(ts);
  const day = (date.getDay() + 6) % 7;
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() - day);
  return date.getTime();
}

export function sessionsSince(sessions: FitSession[], since: number) {
  return sessions.filter((session) => (session.endedAt || session.startedAt) >= since);
}

export function formatKg(value: number) {
  if (!Number.isFinite(value)) return "0 kg";
  const rounded = Math.round(value * 10) / 10;
  return `${rounded.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} kg`;
}

export function formatVolume(value: number) {
  if (!Number.isFinite(value) || value <= 0) return "0 kg";
  if (value >= 1000) return `${(value / 1000).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} t`;
  return formatKg(value);
}

export function sessionDurationMs(session: FitSession, now = Date.now()) {
  return Math.max(0, (session.endedAt || now) - session.startedAt);
}

export function formatDuration(ms: number) {
  const totalMin = Math.max(0, Math.round(ms / 60000));
  const hours = Math.floor(totalMin / 60);
  const minutes = totalMin % 60;
  return hours > 0 ? `${hours} h ${String(minutes).padStart(2, "0")}` : `${minutes} min`;
}


export function fitSessionsForProfile(sessions: FitSession[], profileId?: string | null): FitSession[] {
  const key = String(profileId || "").trim();
  if (!key) return sessions;
  const tagged = sessions.filter((session) => String(session.profileId || "").trim() === key);
  // Legacy V1 sessions had no owner. Keep them visible only when there is no tagged
  // session yet, so an existing user does not lose the first FIT PERF tests.
  if (tagged.length) return tagged;
  return sessions.filter((session) => !String(session.profileId || "").trim());
}

export type FitProfileSummary = {
  sessions: number;
  weekSessions: number;
  volumeKg: number;
  weekVolumeKg: number;
  sets: number;
  records: number;
  bestOneRm: number;
  totalDurationMs: number;
  score: number;
};

export function buildFitProfileSummary(sessions: FitSession[], profileId?: string | null): FitProfileSummary {
  const scoped = fitSessionsForProfile(sessions, profileId);
  const week = sessionsSince(scoped, weekStart());
  const volumeKg = scoped.reduce((sum, session) => sum + sessionVolume(session), 0);
  const weekVolumeKg = week.reduce((sum, session) => sum + sessionVolume(session), 0);
  const sets = scoped.reduce((sum, session) => sum + completedSets(session), 0);
  const records = buildFitRecords(scoped);
  const totalDurationMs = scoped.reduce((sum, session) => sum + sessionDurationMs(session, session.endedAt || session.startedAt), 0);
  const bestOneRm = records.reduce((best, record) => Math.max(best, record.oneRm), 0);
  const recent28 = sessionsSince(scoped, Date.now() - 28 * 86400000).length;
  const goalPct = Math.min(100, (week.length / 3) * 100);
  const consistency = Math.min(100, (recent28 / 12) * 100);
  const score = scoped.length ? Math.min(99, Math.round(goalPct * .45 + consistency * .35 + Math.min(100, records.length * 7) * .2)) : 0;
  return { sessions: scoped.length, weekSessions: week.length, volumeKg, weekVolumeKg, sets, records: records.length, bestOneRm, totalDurationMs, score };
}
