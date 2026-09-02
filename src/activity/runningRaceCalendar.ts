import { isStandardRunningRaceDistance as validDistance } from "./runningShared";
import { saveRunningRaceGoal, type RunningRaceGoalDistance } from "./runningGoals";

export type RunningRaceEntry = {
  id: string;
  name: string;
  date: number;
  distanceM: RunningRaceGoalDistance;
  targetTimeMs: number;
  location?: string;
  notes?: string;
  primary?: boolean;
  createdAt: number;
};

export const RUNNING_RACE_CALENDAR_KEY = "mss-running-race-calendar-v1";

function makeId() {
  try { return crypto.randomUUID(); } catch { return `race_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`; }
}

function normalizeRace(raw: any): RunningRaceEntry | null {
  if (!raw || !validDistance(raw.distanceM)) return null;
  const date = Number(raw.date || 0);
  const targetTimeMs = Number(raw.targetTimeMs || 0);
  if (!Number.isFinite(date) || !Number.isFinite(targetTimeMs) || date <= 0 || targetTimeMs <= 0) return null;
  return {
    id: String(raw.id || makeId()),
    name: String(raw.name || "Course").slice(0, 64),
    date,
    distanceM: raw.distanceM,
    targetTimeMs,
    location: raw.location ? String(raw.location).slice(0, 80) : undefined,
    notes: raw.notes ? String(raw.notes).slice(0, 220) : undefined,
    primary: !!raw.primary,
    createdAt: Number(raw.createdAt || Date.now()),
  };
}

export function loadRunningRaces(): RunningRaceEntry[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const raw = JSON.parse(localStorage.getItem(RUNNING_RACE_CALENDAR_KEY) || "[]");
    return (Array.isArray(raw) ? raw : []).map(normalizeRace).filter((row): row is RunningRaceEntry => !!row).sort((a, b) => a.date - b.date);
  } catch { return []; }
}

export function saveRunningRaces(races: RunningRaceEntry[]) {
  if (typeof localStorage === "undefined") return;
  try { localStorage.setItem(RUNNING_RACE_CALENDAR_KEY, JSON.stringify(races.slice(0, 30))); } catch {}
}

export function createRunningRace(input: Omit<RunningRaceEntry, "id" | "createdAt" | "primary">): RunningRaceEntry {
  return { ...input, id: makeId(), createdAt: Date.now(), primary: false };
}

export function upsertRunningRace(race: RunningRaceEntry) {
  let races = loadRunningRaces().filter((row) => row.id !== race.id);
  if (race.primary) races = races.map((row) => ({ ...row, primary: false }));
  races.push(race);
  races.sort((a, b) => a.date - b.date);
  saveRunningRaces(races);
  if (race.primary) {
    saveRunningRaceGoal({ distanceM: race.distanceM, targetDate: race.date, targetTimeMs: race.targetTimeMs, createdAt: race.createdAt });
  }
  return races;
}

export function removeRunningRace(id: string) {
  const before = loadRunningRaces();
  const removed = before.find((row) => row.id === id);
  const races = before.filter((row) => row.id !== id);
  saveRunningRaces(races);
  if (removed?.primary) saveRunningRaceGoal(null);
  return races;
}

export function setPrimaryRunningRace(id: string) {
  const races = loadRunningRaces().map((row) => ({ ...row, primary: row.id === id }));
  saveRunningRaces(races);
  const race = races.find((row) => row.id === id);
  if (race) saveRunningRaceGoal({ distanceM: race.distanceM, targetDate: race.date, targetTimeMs: race.targetTimeMs, createdAt: race.createdAt });
  return races;
}

export function raceDaysLeft(race: RunningRaceEntry, now = Date.now()) {
  return Math.ceil((race.date - now) / 86_400_000);
}
