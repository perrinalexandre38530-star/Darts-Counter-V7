export type FitPracticeId =
  | "musculation"
  | "calisthenics"
  | "hiit"
  | "military"
  | "yoga"
  | "mobility"
  | "stretching"
  | "functional"
  | "cardio"
  | "powerlifting"
  | "core";

export type FitProgramGoal = "muscle" | "strength" | "fatloss" | "fitness" | "endurance" | "mobility" | "skills" | "recovery" | "performance";
export type FitProgramEquipment = "none" | "bodyweight" | "gym" | "dumbbells" | "barbell" | "bands" | "kettlebell" | "mat" | "pullupbar";
export type FitProgramLevel = "beginner" | "intermediate" | "advanced";

export type FitProgramSessionRecipe = {
  dayOffset: number; // Monday = 0
  title: string;
  durationMin: number;
  templateId?: "push" | "pull" | "legs" | "full" | "free";
  practice?: FitPracticeId;
  note?: string;
};

export type FitProgramDefinition = {
  id: string;
  title: string;
  subtitle: string;
  practice: FitPracticeId;
  goals: FitProgramGoal[];
  level: FitProgramLevel;
  durationWeeks: number;
  sessionsPerWeek: number;
  typicalDurationMin: number;
  equipment: FitProgramEquipment[];
  accent: string;
  icon: string;
  schedule: FitProgramSessionRecipe[];
  custom?: boolean;
};

export const FIT_PRACTICES: Array<{ id: FitPracticeId; label: string; icon: string; accent: string }> = [
  { id: "musculation", label: "Musculation", icon: "🏋️", accent: "#f6c256" },
  { id: "calisthenics", label: "Calisthénie", icon: "🤸", accent: "#a993ff" },
  { id: "hiit", label: "HIIT", icon: "⚡", accent: "#ff6f8e" },
  { id: "military", label: "Militaire", icon: "🪖", accent: "#b8c879" },
  { id: "yoga", label: "Yoga", icon: "🧘", accent: "#74e0c1" },
  { id: "mobility", label: "Mobilité", icon: "🧎", accent: "#67d8ff" },
  { id: "stretching", label: "Étirements", icon: "🌿", accent: "#8ee39a" },
  { id: "functional", label: "Fonctionnel", icon: "🔥", accent: "#ffad66" },
  { id: "cardio", label: "Cardio", icon: "❤️", accent: "#ff7f8f" },
  { id: "powerlifting", label: "Powerlifting", icon: "🏆", accent: "#ff8f73" },
  { id: "core", label: "Core / Pilates", icon: "◉", accent: "#f4a8df" },
];

export const FIT_GOALS: Array<{ id: FitProgramGoal; label: string }> = [
  { id: "muscle", label: "Prise de muscle" },
  { id: "strength", label: "Force" },
  { id: "fatloss", label: "Perte de poids" },
  { id: "fitness", label: "Remise en forme" },
  { id: "endurance", label: "Endurance" },
  { id: "mobility", label: "Mobilité" },
  { id: "skills", label: "Skills" },
  { id: "recovery", label: "Récupération" },
  { id: "performance", label: "Performance" },
];

export const FIT_PROGRAMS: FitProgramDefinition[] = [
  {
    id: "muscle-ppl-8", title: "PUSH PULL LEGS", subtitle: "Hypertrophie structurée · salle", practice: "musculation", goals: ["muscle", "strength"], level: "intermediate", durationWeeks: 8, sessionsPerWeek: 3, typicalDurationMin: 50, equipment: ["gym", "barbell", "dumbbells"], accent: "#f6c256", icon: "PPL",
    schedule: [
      { dayOffset: 0, title: "PUSH · Hypertrophie", durationMin: 50, templateId: "push" },
      { dayOffset: 2, title: "PULL · Hypertrophie", durationMin: 50, templateId: "pull" },
      { dayOffset: 4, title: "LEGS · Hypertrophie", durationMin: 55, templateId: "legs" },
    ],
  },
  {
    id: "fullbody-beginner-8", title: "DÉBUTANT FULL BODY", subtitle: "3 séances simples pour démarrer", practice: "musculation", goals: ["fitness", "muscle"], level: "beginner", durationWeeks: 8, sessionsPerWeek: 3, typicalDurationMin: 40, equipment: ["gym", "dumbbells"], accent: "#82e6ff", icon: "FB",
    schedule: [0, 2, 4].map((dayOffset) => ({ dayOffset, title: "FULL BODY · Débutant", durationMin: 40, templateId: "full" as const })),
  },
  {
    id: "power-55-8", title: "FORCE 5×5", subtitle: "Force fondamentale · barre", practice: "powerlifting", goals: ["strength", "performance"], level: "intermediate", durationWeeks: 8, sessionsPerWeek: 3, typicalDurationMin: 60, equipment: ["barbell", "gym"], accent: "#ff8f73", icon: "5×5",
    schedule: [0, 2, 4].map((dayOffset, index) => ({ dayOffset, title: `FORCE 5×5 · ${String.fromCharCode(65 + index)}`, durationMin: 60, templateId: index === 1 ? "pull" as const : "full" as const })),
  },
  {
    id: "calisthenics-start-6", title: "CALISTHÉNIE START", subtitle: "Pompes · tractions · gainage · contrôle", practice: "calisthenics", goals: ["strength", "skills", "fitness"], level: "beginner", durationWeeks: 6, sessionsPerWeek: 3, typicalDurationMin: 35, equipment: ["bodyweight", "pullupbar"], accent: "#a993ff", icon: "CAL",
    schedule: [
      { dayOffset: 0, title: "CALISTHÉNIE · PUSH", durationMin: 35, templateId: "free" },
      { dayOffset: 2, title: "CALISTHÉNIE · PULL", durationMin: 35, templateId: "free" },
      { dayOffset: 5, title: "CALISTHÉNIE · FULL BODY", durationMin: 40, templateId: "free" },
    ],
  },
  {
    id: "calisthenics-skills-8", title: "SKILLS CALISTHÉNIE", subtitle: "Tractions · handstand · muscle-up", practice: "calisthenics", goals: ["skills", "strength"], level: "intermediate", durationWeeks: 8, sessionsPerWeek: 4, typicalDurationMin: 40, equipment: ["bodyweight", "pullupbar"], accent: "#be9cff", icon: "SKL",
    schedule: [0, 2, 4, 6].map((dayOffset, i) => ({ dayOffset, title: ["PULL SKILL", "HANDSTAND", "MUSCLE-UP", "CORE & MOBILITY"][i], durationMin: i === 3 ? 25 : 40, templateId: "free" as const })),
  },
  {
    id: "hiit-20-4", title: "HIIT 20", subtitle: "20 minutes · sans matériel", practice: "hiit", goals: ["fatloss", "fitness", "endurance"], level: "intermediate", durationWeeks: 4, sessionsPerWeek: 3, typicalDurationMin: 20, equipment: ["none", "bodyweight"], accent: "#ff6f8e", icon: "20",
    schedule: [1, 3, 5].map((dayOffset) => ({ dayOffset, title: "HIIT · FULL BODY 20", durationMin: 20, templateId: "free" as const })),
  },
  {
    id: "military-6", title: "MILITARY FITNESS", subtitle: "Bootcamp · endurance · gainage", practice: "military", goals: ["performance", "endurance", "strength"], level: "intermediate", durationWeeks: 6, sessionsPerWeek: 4, typicalDurationMin: 45, equipment: ["bodyweight", "pullupbar"], accent: "#b8c879", icon: "MIL",
    schedule: [
      { dayOffset: 0, title: "BOOTCAMP · FULL BODY", durationMin: 45, templateId: "free" },
      { dayOffset: 2, title: "POMPES · TRACTIONS · CORE", durationMin: 40, templateId: "free" },
      { dayOffset: 4, title: "CIRCUIT COMMANDO", durationMin: 45, templateId: "free" },
      { dayOffset: 6, title: "MOBILITÉ & RÉCUP", durationMin: 20, templateId: "free", practice: "mobility" },
    ],
  },
  {
    id: "yoga-athlete-6", title: "YOGA ATHLÈTE", subtitle: "Mobilité · équilibre · récupération", practice: "yoga", goals: ["mobility", "recovery"], level: "beginner", durationWeeks: 6, sessionsPerWeek: 3, typicalDurationMin: 25, equipment: ["mat"], accent: "#74e0c1", icon: "YOG",
    schedule: [1, 3, 6].map((dayOffset, i) => ({ dayOffset, title: ["YOGA · MOBILITÉ", "YOGA · FLOW", "YOGA · RECOVERY"][i], durationMin: i === 1 ? 30 : 20, templateId: "free" as const })),
  },
  {
    id: "mobility-daily-4", title: "MOBILITÉ 15", subtitle: "Hanches · épaules · chevilles · dos", practice: "mobility", goals: ["mobility", "recovery"], level: "beginner", durationWeeks: 4, sessionsPerWeek: 5, typicalDurationMin: 15, equipment: ["none", "mat"], accent: "#67d8ff", icon: "MOB",
    schedule: [0, 1, 3, 4, 6].map((dayOffset) => ({ dayOffset, title: "MOBILITÉ · 15 MIN", durationMin: 15, templateId: "free" as const })),
  },
  {
    id: "stretch-recovery-4", title: "RECOVERY & STRETCH", subtitle: "Étirements guidés post-effort", practice: "stretching", goals: ["recovery", "mobility"], level: "beginner", durationWeeks: 4, sessionsPerWeek: 3, typicalDurationMin: 15, equipment: ["mat"], accent: "#8ee39a", icon: "REC",
    schedule: [1, 4, 6].map((dayOffset) => ({ dayOffset, title: "STRETCHING · RECOVERY", durationMin: 15, templateId: "free" as const })),
  },
  {
    id: "functional-6", title: "FUNCTIONAL ATHLETE", subtitle: "Force · cardio · explosivité", practice: "functional", goals: ["performance", "fitness"], level: "intermediate", durationWeeks: 6, sessionsPerWeek: 4, typicalDurationMin: 40, equipment: ["kettlebell", "bodyweight", "dumbbells"], accent: "#ffad66", icon: "FUN",
    schedule: [0, 2, 4, 6].map((dayOffset, i) => ({ dayOffset, title: ["FUNCTIONAL · STRENGTH", "EMOM", "FUNCTIONAL · POWER", "AMRAP"][i], durationMin: 40, templateId: "free" as const })),
  },
  {
    id: "core-pilates-6", title: "CORE & PILATES", subtitle: "Gainage · posture · contrôle", practice: "core", goals: ["fitness", "mobility"], level: "beginner", durationWeeks: 6, sessionsPerWeek: 3, typicalDurationMin: 25, equipment: ["mat"], accent: "#f4a8df", icon: "CORE",
    schedule: [0, 3, 5].map((dayOffset) => ({ dayOffset, title: "CORE · PILATES", durationMin: 25, templateId: "free" as const })),
  },
  {
    id: "cardio-base-6", title: "CARDIO BASE", subtitle: "Condition physique · cardio progressif", practice: "cardio", goals: ["fitness", "endurance", "fatloss"], level: "beginner", durationWeeks: 6, sessionsPerWeek: 3, typicalDurationMin: 30, equipment: ["none"], accent: "#ff7f8f", icon: "CARD",
    schedule: [1, 3, 5].map((dayOffset, i) => ({ dayOffset, title: ["CARDIO · ENDURANCE", "CARDIO · INTERVALLES", "CARDIO · TEMPO"][i], durationMin: i === 1 ? 25 : 30, templateId: "free" as const })),
  },
];

export const FIT_ACTIVE_PROGRAM_KEY = "mss-fit-active-program-v2";
export const FIT_CUSTOM_PROGRAMS_KEY = "mss-fit-custom-programs-v1";

export type FitActiveProgram = {
  programId: string;
  startedAt: number; // Monday local start
  createdAt: number;
};

export type CreateFitProgramInput = {
  title: string;
  practice: FitPracticeId;
  level?: FitProgramLevel;
  durationWeeks?: number;
  typicalDurationMin?: number;
  days: number[];
  goals?: FitProgramGoal[];
};

export function localMondayStart(ts = Date.now()) {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  const weekday = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - weekday);
  return d.getTime();
}

function normalizeCustomProgram(raw: any): FitProgramDefinition | null {
  if (!raw || typeof raw !== "object") return null;
  const practice = String(raw.practice || "musculation") as FitPracticeId;
  if (!FIT_PRACTICES.some((item) => item.id === practice)) return null;
  const title = String(raw.title || "Mon programme").trim().slice(0, 80);
  const days = Array.isArray(raw.schedule)
    ? raw.schedule.map((item: any) => Number(item?.dayOffset)).filter((value: number) => Number.isInteger(value) && value >= 0 && value <= 6)
    : [];
  if (!title || !days.length) return null;
  const meta = FIT_PRACTICES.find((item) => item.id === practice)!;
  const duration = Math.max(5, Math.min(180, Number(raw.typicalDurationMin) || 45));
  const weeks = Math.max(1, Math.min(52, Number(raw.durationWeeks) || 6));
  const schedule: FitProgramSessionRecipe[] = days.map((dayOffset: number, index: number) => ({
    dayOffset,
    title: String(raw.schedule?.[index]?.title || `${meta.label.toUpperCase()} · SÉANCE ${index + 1}`).slice(0, 90),
    durationMin: Math.max(5, Math.min(180, Number(raw.schedule?.[index]?.durationMin) || duration)),
    templateId: "free",
    practice,
  }));
  return {
    id: String(raw.id || `custom_${Date.now()}`), title, subtitle: String(raw.subtitle || `${schedule.length} séance(s) / semaine · programme personnalisé`).slice(0, 120),
    practice, goals: Array.isArray(raw.goals) ? raw.goals.filter((goal: any) => FIT_GOALS.some((item) => item.id === goal)) : ["fitness"],
    level: (["beginner", "intermediate", "advanced"].includes(String(raw.level)) ? raw.level : "intermediate") as FitProgramLevel,
    durationWeeks: weeks, sessionsPerWeek: schedule.length, typicalDurationMin: duration,
    equipment: Array.isArray(raw.equipment) ? raw.equipment : practice === "musculation" || practice === "powerlifting" ? ["gym"] : practice === "yoga" || practice === "mobility" || practice === "stretching" || practice === "core" ? ["mat"] : ["bodyweight"],
    accent: String(raw.accent || meta.accent), icon: String(raw.icon || meta.icon).slice(0, 8), schedule, custom: true,
  };
}

export function loadCustomFitPrograms(): FitProgramDefinition[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const raw = JSON.parse(localStorage.getItem(FIT_CUSTOM_PROGRAMS_KEY) || "[]");
    return (Array.isArray(raw) ? raw : []).map(normalizeCustomProgram).filter((item): item is FitProgramDefinition => !!item);
  } catch { return []; }
}

export function saveCustomFitPrograms(programs: FitProgramDefinition[]) {
  if (typeof localStorage === "undefined") return;
  try { localStorage.setItem(FIT_CUSTOM_PROGRAMS_KEY, JSON.stringify(programs.filter((item) => item.custom).slice(-40))); } catch {}
  try { window.dispatchEvent(new CustomEvent("dc:fit-programs-changed")); } catch {}
}

export function getFitProgramCatalog() {
  return [...FIT_PROGRAMS, ...loadCustomFitPrograms()];
}

export function createCustomFitProgram(input: CreateFitProgramInput): FitProgramDefinition | null {
  const title = String(input.title || "").trim().slice(0, 80);
  const days = [...new Set((input.days || []).map(Number).filter((value) => Number.isInteger(value) && value >= 0 && value <= 6))].sort((a, b) => a - b);
  if (!title || !days.length) return null;
  const meta = FIT_PRACTICES.find((item) => item.id === input.practice) || FIT_PRACTICES[0];
  const duration = Math.max(5, Math.min(180, Number(input.typicalDurationMin) || 45));
  const weeks = Math.max(1, Math.min(52, Number(input.durationWeeks) || 6));
  const id = `custom_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const program: FitProgramDefinition = {
    id, title, subtitle: `${days.length} séance(s) / semaine · créé dans FIT PERF`, practice: meta.id,
    goals: input.goals?.length ? input.goals : ["fitness"], level: input.level || "intermediate",
    durationWeeks: weeks, sessionsPerWeek: days.length, typicalDurationMin: duration,
    equipment: meta.id === "musculation" || meta.id === "powerlifting" ? ["gym"] : meta.id === "yoga" || meta.id === "mobility" || meta.id === "stretching" || meta.id === "core" ? ["mat"] : ["bodyweight"],
    accent: meta.accent, icon: meta.icon,
    schedule: days.map((dayOffset, index) => ({ dayOffset, title: `${meta.label.toUpperCase()} · SÉANCE ${index + 1}`, durationMin: duration, templateId: "free", practice: meta.id })),
    custom: true,
  };
  saveCustomFitPrograms([...loadCustomFitPrograms(), program]);
  return program;
}

export function deleteCustomFitProgram(programId: string) {
  const remaining = loadCustomFitPrograms().filter((program) => program.id !== programId);
  saveCustomFitPrograms(remaining);
  const active = loadActiveFitProgram();
  if (active?.programId === programId) clearActiveFitProgram();
}

export function loadActiveFitProgram(): FitActiveProgram | null {
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = JSON.parse(localStorage.getItem(FIT_ACTIVE_PROGRAM_KEY) || "null");
    if (!raw || !getFitProgramCatalog().some((item) => item.id === String(raw.programId || ""))) return null;
    const startedAt = Number(raw.startedAt || 0);
    if (!Number.isFinite(startedAt) || startedAt <= 0) return null;
    return { programId: String(raw.programId), startedAt, createdAt: Number(raw.createdAt || Date.now()) };
  } catch { return null; }
}

export function activateFitProgram(programId: string, now = Date.now()): FitActiveProgram | null {
  if (!getFitProgramCatalog().some((item) => item.id === programId)) return null;
  const value: FitActiveProgram = { programId, startedAt: localMondayStart(now), createdAt: Date.now() };
  try { localStorage.setItem(FIT_ACTIVE_PROGRAM_KEY, JSON.stringify(value)); } catch {}
  try { window.dispatchEvent(new CustomEvent("dc:multisport-agenda-changed")); } catch {}
  try { window.dispatchEvent(new CustomEvent("dc:fit-programs-changed")); } catch {}
  return value;
}

export function clearActiveFitProgram() {
  try { localStorage.removeItem(FIT_ACTIVE_PROGRAM_KEY); } catch {}
  try { window.dispatchEvent(new CustomEvent("dc:multisport-agenda-changed")); } catch {}
  try { window.dispatchEvent(new CustomEvent("dc:fit-programs-changed")); } catch {}
}

export function getActiveFitProgramDefinition() {
  const active = loadActiveFitProgram();
  if (!active) return null;
  const program = getFitProgramCatalog().find((item) => item.id === active.programId) || null;
  return program ? { active, program } : null;
}
