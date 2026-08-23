import { formatDuration, formatPace } from "./activityMath";
import type { ActivitySplit } from "./activityTypes";

export function adaptiveSplitCoach(args: { split: ActivitySplit; previous?: ActivitySplit; targetPaceSecPerKm?: number | null; ghostDeltaMs?: number | null; lang: string }) {
  const { split, previous, targetPaceSecPerKm, ghostDeltaMs, lang } = args;
  const base = lang === "fr" ? `Kilomètre ${split.index}. ${formatDuration(split.splitMs)}. Allure ${formatPace(split.paceSecPerKm)} au kilomètre.` : lang === "es" ? `Kilómetro ${split.index}. ${formatDuration(split.splitMs)}. Ritmo ${formatPace(split.paceSecPerKm)} por kilómetro.` : `Kilometre ${split.index}. ${formatDuration(split.splitMs)}. Pace ${formatPace(split.paceSecPerKm)} per kilometre.`;
  const cues: string[] = [];
  if (targetPaceSecPerKm && Number.isFinite(targetPaceSecPerKm)) {
    const delta = split.paceSecPerKm - targetPaceSecPerKm;
    if (delta <= -8) cues.push(lang === "fr" ? "Tu es plus rapide que l’allure cible, garde le contrôle." : lang === "es" ? "Vas más rápido que el ritmo objetivo, controla el esfuerzo." : "You are faster than target pace, stay controlled.");
    else if (delta >= 8) cues.push(lang === "fr" ? "Tu es sous l’allure cible, relance progressivement." : lang === "es" ? "Estás por debajo del ritmo objetivo, acelera progresivamente." : "You are behind target pace, build the speed gradually.");
    else cues.push(lang === "fr" ? "Allure cible tenue." : lang === "es" ? "Ritmo objetivo mantenido." : "Target pace on track.");
  }
  if (previous) {
    const delta = split.splitMs - previous.splitMs;
    if (delta <= -5000) cues.push(lang === "fr" ? "Ce kilomètre est plus rapide que le précédent." : lang === "es" ? "Este kilómetro es más rápido que el anterior." : "This kilometre is faster than the previous one.");
    else if (delta >= 8000) cues.push(lang === "fr" ? "L’allure baisse, vérifie ton relâchement et ta respiration." : lang === "es" ? "El ritmo baja, revisa tu relajación y respiración." : "Pace is fading, check your relaxation and breathing.");
  }
  if (ghostDeltaMs != null && Number.isFinite(ghostDeltaMs) && Math.abs(ghostDeltaMs) >= 5000) {
    const ahead = ghostDeltaMs < 0;
    cues.push(lang === "fr" ? `${ahead ? "Tu devances" : "Tu es derrière"} ton Ghost de ${formatDuration(Math.abs(ghostDeltaMs))}.` : lang === "es" ? `${ahead ? "Vas por delante de" : "Vas detrás de"} tu Ghost por ${formatDuration(Math.abs(ghostDeltaMs))}.` : `${ahead ? "You are ahead of" : "You are behind"} your Ghost by ${formatDuration(Math.abs(ghostDeltaMs))}.`);
  }
  return [base, ...cues].join(" ");
}

export function adaptiveMilestoneCoach(progressPct: number, lang: string) {
  const pct = Math.round(progressPct);
  if (lang === "fr") return pct === 25 ? "Premier quart terminé. Installe ton rythme." : pct === 50 ? "Mi-parcours. Reste relâché et régulier." : pct === 75 ? "Trois quarts faits. Garde de la réserve pour finir fort." : "Objectif presque terminé.";
  if (lang === "es") return pct === 25 ? "Primer cuarto completado. Encuentra tu ritmo." : pct === 50 ? "Mitad del recorrido. Mantente relajado y regular." : pct === 75 ? "Tres cuartos completados. Guarda energía para terminar fuerte." : "Objetivo casi completado.";
  return pct === 25 ? "First quarter done. Settle into your rhythm." : pct === 50 ? "Halfway. Stay relaxed and steady." : pct === 75 ? "Three quarters done. Save something for a strong finish." : "Target nearly complete.";
}
