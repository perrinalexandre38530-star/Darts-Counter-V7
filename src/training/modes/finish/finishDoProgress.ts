/** FINISH DO precision across accepted training attempts. Local, profile-scoped; not match History. */
export type FinishAimProgress = { label: string; attempts: number; hits: number; singleHits: number; updatedAt: number };
export type FinishDoDay = { date: string; sessions: number; darts: number; attempts: number; hits: number };
export type FinishDoProgress = { version: 1; darts: number; sessions: number; aims: Record<string, FinishAimProgress>; days?: Record<string, FinishDoDay> };
const PREFIX = "mss.training.finish-do.precision.v1:";
const validAim = (s: string) => s === "BULL50" || /^D(?:[1-9]|1[0-9]|20)$/.test(s);
export function finishDoProgressKey(profileId?: string | null) { return PREFIX + encodeURIComponent(profileId || "guest"); }
export function loadFinishDoProgress(profileId?: string | null): FinishDoProgress {
  const empty: FinishDoProgress = { version: 1, darts: 0, sessions: 0, aims: {} };
  try {
    const raw = JSON.parse(localStorage.getItem(finishDoProgressKey(profileId)) || "null");
    if (!raw || raw.version !== 1 || typeof raw.aims !== "object" || !raw.aims) return empty;
    const num = (v: unknown) => Math.max(0, Math.min(1000000, Math.floor(Number(v) || 0)));
    const aims: Record<string, FinishAimProgress> = {};
    for (const [label, row] of Object.entries(raw.aims)) {
      if (!validAim(label) || !row || typeof row !== "object") continue;
      const r = row as Partial<FinishAimProgress>;
      const attempts = num(r.attempts);
      const hits = Math.min(attempts, num(r.hits));
      aims[label] = { label, attempts, hits, singleHits: Math.min(attempts - hits, num(r.singleHits)), updatedAt: Math.max(0, Number(r.updatedAt) || 0) };
    }
    const days: Record<string, FinishDoDay> = {};
    for (const [date, day] of Object.entries(raw.days || {})) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !day || typeof day !== "object") continue;
      const d = day as Partial<FinishDoDay>;
      days[date] = { date, sessions: num(d.sessions), darts: num(d.darts), attempts: num(d.attempts), hits: Math.min(num(d.attempts), num(d.hits)) };
    }
    return { version: 1, darts: num(raw.darts), sessions: num(raw.sessions), aims, days };
  } catch { return empty; }
}
export type FinishAimEvidence = { aimedDouble?: string; actual: string };
export function saveFinishDoAttempt(profileId: string | null | undefined, evidence: FinishAimEvidence[]): FinishDoProgress {
  const progress = loadFinishDoProgress(profileId);
  progress.sessions += 1;
  progress.darts += evidence.length;
  const today = new Date();
  const date = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  const days = progress.days || (progress.days = {});
  const day = days[date] || { date, sessions: 0, darts: 0, attempts: 0, hits: 0 };
  day.sessions += 1;
  day.darts += evidence.length;
  for (const shot of evidence) {
    const label = String(shot.aimedDouble || "");
    if (!validAim(label)) continue;
    const row = progress.aims[label] || { label, attempts: 0, hits: 0, singleHits: 0, updatedAt: 0 };
    row.attempts += 1;
    day.attempts += 1;
    if (shot.actual === label) { row.hits += 1; day.hits += 1; }
    else if (shot.actual === (label === "BULL50" ? "BULL25" : `S${label.slice(1)}`)) row.singleHits += 1;
    row.updatedAt = Date.now();
    progress.aims[label] = row;
  }
  days[date] = day;
  // Keep only recent daily buckets; old aggregate totals are never discarded.
  const dates = Object.keys(days).sort();
  for (const old of dates.slice(0, Math.max(0, dates.length - 120))) delete days[old];
  try {
    localStorage.setItem(finishDoProgressKey(profileId), JSON.stringify(progress));
    window.dispatchEvent(new CustomEvent("mss-finish-do-progress", { detail: { profileId: profileId || "guest" } }));
  } catch { /* local storage may be unavailable; training stays playable */ }
  return progress;
}
export function getFinishDoPriority(progress: FinishDoProgress, minimumAttempts = 3): FinishAimProgress | null {
  return Object.values(progress.aims)
    .filter(row => row.attempts >= minimumAttempts && row.hits < row.attempts)
    .sort((a,b) => a.hits/a.attempts - b.hits/b.attempts || b.attempts-a.attempts || a.label.localeCompare(b.label))[0] || null;
}
export function finishDoLessonForAim(label: string): string {
  if (label === "BULL50") return "finish-do-bull-outer-recovery";
  if (label === "D20") return "finish-do-d20-recovery";
  if (["D16", "D8", "D4", "D2"].includes(label)) return "finish-do-ladder";
  return "finish-do-odd";
}

/** Rolling seven local calendar days. Old V1 totals remain valid but cannot be dated retroactively. */
export function getFinishDoWeek(progress: FinishDoProgress, now = new Date()) {
  const dates = Array.from({ length: 7 }, (_, offset) => {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (6 - offset));
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  });
  const days = dates.map(date => progress.days?.[date] || { date, sessions: 0, darts: 0, attempts: 0, hits: 0 });
  return { days, sessions: days.reduce((sum, d) => sum + d.sessions, 0), darts: days.reduce((sum, d) => sum + d.darts, 0), attempts: days.reduce((sum, d) => sum + d.attempts, 0), hits: days.reduce((sum, d) => sum + d.hits, 0) };
}

/** Two consecutive, non-overlapping seven-day windows; no invented history. */
export function compareFinishDoWeeks(progress: FinishDoProgress, now = new Date()) {
  const current = getFinishDoWeek(progress, now);
  const previousDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
  const previous = getFinishDoWeek(progress, previousDate);
  const precision = (week: ReturnType<typeof getFinishDoWeek>) =>
    week.attempts ? Math.round(100 * week.hits / week.attempts) : null;
  const currentPrecision = precision(current);
  const previousPrecision = precision(previous);
  return {
    current,
    previous,
    currentPrecision,
    previousPrecision,
    deltaPoints: currentPrecision === null || previousPrecision === null ? null : currentPrecision - previousPrecision,
  };
}

export type FinishDoPlanStep = {
  id: "placement" | "precision" | "checkout";
  title: string;
  instruction: string;
  target: string;
  score: number;
};
export type FinishDoTrainingPlan = {
  tier: "discovery" | "foundation" | "consistency" | "mastery";
  tierName: string;
  focus: string;
  sampleSize: number;
  rate: number | null;
  objective: string;
  steps: FinishDoPlanStep[];
};
/** Advisory training plan, based solely on explicitly aimed darts in accepted attempts. */
export function buildFinishDoTrainingPlan(progress: FinishDoProgress): FinishDoTrainingPlan {
  const focusRow = getFinishDoPriority(progress);
  const studied = Object.values(progress.aims).filter(row => row.attempts >= 3);
  const strongest = studied.slice().sort((a,b) => b.attempts - a.attempts)[0];
  const selected = focusRow || strongest;
  const focus = selected?.label || "D16";
  const rate = selected ? Math.round(100 * selected.hits / selected.attempts) : null;
  const tier = rate === null ? "discovery" : rate < 35 ? "foundation" : rate < 65 ? "consistency" : "mastery";
  const tierName = {discovery:"Découverte",foundation:"Fondations",consistency:"Régularité",mastery:"Maîtrise"}[tier];
  const score = focus === "BULL50" ? 50 : Number(focus.slice(1)) * 2;
  const objective = tier === "discovery"
    ? "Annonce le double visé avant au moins 3 lancers pour établir une première mesure."
    : tier === "foundation"
      ? "Travaille la gestuelle et vise 3 touches sur 10 fléchettes annoncées."
      : tier === "consistency"
        ? "Vise 6 touches sur 10 fléchettes annoncées."
        : "Maintiens au moins 7 touches sur 10, puis teste la finition sous pression.";
  const setup = focus === "BULL50"
    ? "Repère le centre : si BULL25 est touché, 25 reste à sortir par S9 puis D8 (avec deux fléchettes)."
    : `Repère ${focus} : si tu touches le simple ${focus.slice(1)}, recalcule immédiatement le restant.`;
  return { tier, tierName, focus, sampleSize: selected?.attempts || 0, rate, objective, steps: [
    { id:"placement", title:"1 · Comprendre", instruction:setup, target:focus, score },
    { id:"precision", title:"2 · Répéter", instruction:`Annonce ${focus} avant chaque lancer, puis saisis la touche réelle. Répète sur 10 fléchettes et consulte ta précision.`, target:focus, score },
    { id:"checkout", title:"3 · Finir", instruction:`Lance un FINISH DO à ${score} points et termine sur un double. Après chaque erreur, suis la nouvelle combinaison Awena.`, target:focus, score },
  ] };
}
