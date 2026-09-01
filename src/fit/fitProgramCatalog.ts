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
};

export const FIT_PRACTICES: Array<{ id: FitPracticeId; label: string; icon: string }> = [
  { id: "musculation", label: "Musculation", icon: "🏋️" },
  { id: "calisthenics", label: "Calisthénie", icon: "🤸" },
  { id: "hiit", label: "HIIT", icon: "⚡" },
  { id: "military", label: "Militaire", icon: "🪖" },
  { id: "yoga", label: "Yoga", icon: "🧘" },
  { id: "mobility", label: "Mobilité", icon: "🧎" },
  { id: "stretching", label: "Étirements", icon: "🌿" },
  { id: "functional", label: "Fonctionnel", icon: "🔥" },
  { id: "cardio", label: "Cardio", icon: "❤️" },
  { id: "powerlifting", label: "Powerlifting", icon: "🏆" },
  { id: "core", label: "Core / Pilates", icon: "◉" },
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
];

export const FIT_ACTIVE_PROGRAM_KEY = "mss-fit-active-program-v2";

export type FitActiveProgram = {
  programId: string;
  startedAt: number; // Monday local start
  createdAt: number;
};

export function localMondayStart(ts = Date.now()) {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  const weekday = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - weekday);
  return d.getTime();
}

export function loadActiveFitProgram(): FitActiveProgram | null {
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = JSON.parse(localStorage.getItem(FIT_ACTIVE_PROGRAM_KEY) || "null");
    if (!raw || !FIT_PROGRAMS.some((item) => item.id === String(raw.programId || ""))) return null;
    const startedAt = Number(raw.startedAt || 0);
    if (!Number.isFinite(startedAt) || startedAt <= 0) return null;
    return { programId: String(raw.programId), startedAt, createdAt: Number(raw.createdAt || Date.now()) };
  } catch { return null; }
}

export function activateFitProgram(programId: string, now = Date.now()): FitActiveProgram | null {
  if (!FIT_PROGRAMS.some((item) => item.id === programId)) return null;
  const value: FitActiveProgram = { programId, startedAt: localMondayStart(now), createdAt: Date.now() };
  try { localStorage.setItem(FIT_ACTIVE_PROGRAM_KEY, JSON.stringify(value)); } catch {}
  try { window.dispatchEvent(new CustomEvent("dc:multisport-agenda-changed")); } catch {}
  return value;
}

export function clearActiveFitProgram() {
  try { localStorage.removeItem(FIT_ACTIVE_PROGRAM_KEY); } catch {}
  try { window.dispatchEvent(new CustomEvent("dc:multisport-agenda-changed")); } catch {}
}

export function getActiveFitProgramDefinition() {
  const active = loadActiveFitProgram();
  if (!active) return null;
  const program = FIT_PROGRAMS.find((item) => item.id === active.programId) || null;
  return program ? { active, program } : null;
}
