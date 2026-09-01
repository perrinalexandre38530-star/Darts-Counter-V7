import type { FitProgramDefinition, FitProgramEquipment, FitProgramGoal, FitProgramLevel } from "./fitProgramCatalog";

export type FitEquipmentPreset = "gym" | "home" | "bodyweight";

export type FitUserPreferences = {
  goal: FitProgramGoal;
  level: FitProgramLevel;
  equipmentPreset: FitEquipmentPreset;
  daysPerWeek: number;
  durationMin: number;
  updatedAt: number;
};

export type FitProgramRecommendation = {
  program: FitProgramDefinition;
  score: number;
  reasons: string[];
};

export const FIT_USER_PREFERENCES_KEY = "mss-fit-user-preferences-v1";

export const DEFAULT_FIT_USER_PREFERENCES: FitUserPreferences = {
  goal: "fitness",
  level: "beginner",
  equipmentPreset: "bodyweight",
  daysPerWeek: 3,
  durationMin: 45,
  updatedAt: 0,
};

export function loadFitUserPreferences(): FitUserPreferences | null {
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = JSON.parse(localStorage.getItem(FIT_USER_PREFERENCES_KEY) || "null");
    if (!raw || typeof raw !== "object") return null;
    const goal = String(raw.goal || "fitness") as FitProgramGoal;
    const level = String(raw.level || "beginner") as FitProgramLevel;
    const equipmentPreset = String(raw.equipmentPreset || "bodyweight") as FitEquipmentPreset;
    const daysPerWeek = Math.max(2, Math.min(6, Number(raw.daysPerWeek) || 3));
    const durationMin = Math.max(15, Math.min(90, Number(raw.durationMin) || 45));
    if (!["muscle", "strength", "fatloss", "fitness", "endurance", "mobility", "skills", "recovery", "performance"].includes(goal)) return null;
    if (!["beginner", "intermediate", "advanced"].includes(level)) return null;
    if (!["gym", "home", "bodyweight"].includes(equipmentPreset)) return null;
    return { goal, level, equipmentPreset, daysPerWeek, durationMin, updatedAt: Number(raw.updatedAt || 0) };
  } catch {
    return null;
  }
}

export function saveFitUserPreferences(input: Omit<FitUserPreferences, "updatedAt"> | FitUserPreferences): FitUserPreferences {
  const next: FitUserPreferences = {
    goal: input.goal,
    level: input.level,
    equipmentPreset: input.equipmentPreset,
    daysPerWeek: Math.max(2, Math.min(6, Number(input.daysPerWeek) || 3)),
    durationMin: Math.max(15, Math.min(90, Number(input.durationMin) || 45)),
    updatedAt: Date.now(),
  };
  try { localStorage.setItem(FIT_USER_PREFERENCES_KEY, JSON.stringify(next)); } catch {}
  try { window.dispatchEvent(new CustomEvent("dc:fit-preferences-changed", { detail: next })); } catch {}
  return next;
}

export function equipmentForPreset(preset: FitEquipmentPreset): FitProgramEquipment[] {
  if (preset === "gym") return ["none", "bodyweight", "gym", "dumbbells", "barbell", "bands", "kettlebell", "mat", "pullupbar"];
  if (preset === "home") return ["none", "bodyweight", "dumbbells", "bands", "kettlebell", "mat", "pullupbar"];
  return ["none", "bodyweight", "mat", "pullupbar"];
}

function levelIndex(level: FitProgramLevel) {
  return level === "beginner" ? 0 : level === "intermediate" ? 1 : 2;
}

export function scoreFitProgram(program: FitProgramDefinition, preferences: FitUserPreferences): FitProgramRecommendation {
  let score = 0;
  const reasons: string[] = [];

  if (program.goals.includes(preferences.goal)) {
    score += 38;
    reasons.push("objectif");
  } else if (program.goals.includes("fitness")) {
    score += 12;
  }

  const levelDelta = Math.abs(levelIndex(program.level) - levelIndex(preferences.level));
  if (levelDelta === 0) {
    score += 20;
    reasons.push("niveau");
  } else if (levelDelta === 1) score += 8;

  const durationDelta = Math.abs(program.typicalDurationMin - preferences.durationMin);
  if (durationDelta <= 5) {
    score += 18;
    reasons.push("durée");
  } else if (durationDelta <= 15) score += 11;
  else if (durationDelta <= 30) score += 4;

  const dayDelta = Math.abs(program.sessionsPerWeek - preferences.daysPerWeek);
  if (dayDelta === 0) {
    score += 14;
    reasons.push("rythme");
  } else if (dayDelta === 1) score += 8;
  else if (dayDelta === 2) score += 3;

  const available = equipmentForPreset(preferences.equipmentPreset);
  const requiresGym = program.equipment.includes("gym") || program.equipment.includes("barbell");
  if (requiresGym && preferences.equipmentPreset !== "gym") {
    score -= 14;
  } else {
    const compatible = program.equipment.length === 0 || program.equipment.some((item) => available.includes(item));
    if (compatible) {
      score += 10;
      reasons.push("matériel");
    }
  }

  return { program, score: Math.max(0, Math.min(100, Math.round(score))), reasons: [...new Set(reasons)].slice(0, 3) };
}

export function recommendFitPrograms(programs: FitProgramDefinition[], preferences: FitUserPreferences, limit = 3): FitProgramRecommendation[] {
  return programs
    .filter((program) => !program.custom)
    .map((program) => scoreFitProgram(program, preferences))
    .sort((a, b) => b.score - a.score || a.program.typicalDurationMin - b.program.typicalDurationMin)
    .slice(0, Math.max(1, limit));
}
