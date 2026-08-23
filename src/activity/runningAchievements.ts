import { hasNegativeSplit } from "./runningInsights";
import type { ActivityRecord } from "./activityTypes";

export type RunningAchievement = {
  id: string;
  icon: string;
  title: string;
  description: string;
  unlocked: boolean;
  progressPct: number;
  current: number;
  target: number;
};

export function buildRunningAchievements(activities: ActivityRecord[], lang: string): RunningAchievement[] {
  const sessions = activities.length;
  const totalKm = activities.reduce((sum, row) => sum + row.distanceM, 0) / 1000;
  const longestKm = Math.max(0, ...activities.map((row) => row.distanceM / 1000));
  const climb = activities.reduce((sum, row) => sum + Number(row.elevationGainM || 0), 0);
  const negatives = activities.filter((row) => hasNegativeSplit(row.splits || [])).length;
  const ghostWins = activities.filter((row) => row.ghostEnabled && Number(row.ghostDeltaMs) < 0).length;
  const planRuns = activities.filter((row) => !!row.planSessionId).length;
  const defs = lang === "fr" ? [
    ["first", "🏁", "PREMIER DÉPART", "Terminer une première sortie.", sessions, 1],
    ["ten", "🔥", "RÉGULIER", "Terminer 10 sorties.", sessions, 10],
    ["fifty", "⚡", "ENDURANCE", "Cumuler 50 km.", totalKm, 50],
    ["hundred", "💯", "CENTURION", "Cumuler 100 km.", totalKm, 100],
    ["long10", "🛣️", "10K FINISHER", "Courir au moins 10 km en une sortie.", longestKm, 10],
    ["climb", "⛰️", "GRIMPEUR", "Cumuler 1 000 m de D+.", climb, 1000],
    ["negative", "📈", "NEGATIVE SPLIT", "Réussir 3 sorties en negative split.", negatives, 3],
    ["ghost", "👻", "GHOST HUNTER", "Battre 3 fois une sortie Ghost.", ghostWins, 3],
    ["plan", "🎯", "DISCIPLINE", "Terminer 8 séances issues d’un plan.", planRuns, 8],
  ] : lang === "es" ? [
    ["first", "🏁", "PRIMERA SALIDA", "Completa tu primera carrera.", sessions, 1], ["ten", "🔥", "REGULAR", "Completa 10 carreras.", sessions, 10], ["fifty", "⚡", "RESISTENCIA", "Acumula 50 km.", totalKm, 50], ["hundred", "💯", "CENTURIÓN", "Acumula 100 km.", totalKm, 100], ["long10", "🛣️", "FINISHER 10K", "Corre al menos 10 km de una vez.", longestKm, 10], ["climb", "⛰️", "ESCALADOR", "Acumula 1.000 m D+.", climb, 1000], ["negative", "📈", "NEGATIVE SPLIT", "Logra 3 negative splits.", negatives, 3], ["ghost", "👻", "GHOST HUNTER", "Supera 3 veces a tu Ghost.", ghostWins, 3], ["plan", "🎯", "DISCIPLINA", "Completa 8 sesiones del plan.", planRuns, 8],
  ] : [
    ["first", "🏁", "FIRST START", "Complete your first run.", sessions, 1], ["ten", "🔥", "CONSISTENT", "Complete 10 runs.", sessions, 10], ["fifty", "⚡", "ENDURANCE", "Accumulate 50 km.", totalKm, 50], ["hundred", "💯", "CENTURION", "Accumulate 100 km.", totalKm, 100], ["long10", "🛣️", "10K FINISHER", "Run at least 10 km in one activity.", longestKm, 10], ["climb", "⛰️", "CLIMBER", "Accumulate 1,000 m elevation.", climb, 1000], ["negative", "📈", "NEGATIVE SPLIT", "Complete 3 negative-split runs.", negatives, 3], ["ghost", "👻", "GHOST HUNTER", "Beat your Ghost 3 times.", ghostWins, 3], ["plan", "🎯", "DISCIPLINE", "Complete 8 plan workouts.", planRuns, 8],
  ];
  return defs.map(([id, icon, title, description, current, target]) => {
    const c = Number(current); const t = Number(target);
    return { id: String(id), icon: String(icon), title: String(title), description: String(description), current: c, target: t, unlocked: c >= t, progressPct: Math.max(0, Math.min(100, Math.round((c / Math.max(1, t)) * 100))) };
  });
}
