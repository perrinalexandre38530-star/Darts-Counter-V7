/** FINISH DO precision across accepted training attempts. Local, profile-scoped; not match History. */
export type FinishAimProgress = { label: string; attempts: number; hits: number; singleHits: number; updatedAt: number };
export type FinishDoDay = { date: string; sessions: number; darts: number; attempts: number; hits: number };
export type FinishDoProgress = { version: 1; darts: number; sessions: number; aims: Record<string, FinishAimProgress>; days?: Record<string, FinishDoDay>; checkoutByDouble?: Record<string, number> };
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
    const checkoutByDouble: Record<string, number> = {};
    for (const [label, count] of Object.entries(raw.checkoutByDouble || {})) {
      if (validAim(label)) checkoutByDouble[label] = num(count);
    }
    return { version: 1, darts: num(raw.darts), sessions: num(raw.sessions), aims, days, checkoutByDouble };
  } catch { return empty; }
}
/** FINISH DO immutable accepted-attempt ledger. The original V1 aggregate is a baseline,
 * never a second event: imported historical totals cannot be reconstructed as visits. */
export type FinishDoAttemptEvent = {
  id: string;
  at: number;
  date: string;
  shots: { aimedDouble?: string; actual: string }[];
  finishedDouble?: string;
};
export type FinishDoAttemptJournal = {
  version: 1;
  lineageId: string;
  baseline: FinishDoProgress;
  events: FinishDoAttemptEvent[];
};
const JOURNAL_PREFIX = "mss.training.finish-do.attempts.v1:";
export const finishDoAttemptJournalKey = (profileId?: string | null) => JOURNAL_PREFIX + encodeURIComponent(profileId || "guest");
const newJournalId = () => {
  try { if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID(); } catch {}
  return `${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
};
const validShot = (shot: any) => !!shot && typeof shot.actual === "string" &&
  /^(?:MISS|BULL25|BULL50|[SDT](?:[1-9]|1[0-9]|20))$/.test(shot.actual) &&
  (shot.aimedDouble === undefined || validAim(shot.aimedDouble));
const validEvent = (event: any): event is FinishDoAttemptEvent => !!event &&
  typeof event.id === "string" && event.id.length >= 8 && event.id.length <= 128 &&
  Number.isSafeInteger(event.at) && event.at > 0 &&
  typeof event.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(event.date) &&
  Array.isArray(event.shots) && event.shots.length >= 1 && event.shots.length <= 1000 &&
  event.shots.every(validShot) &&
  (event.finishedDouble === undefined || validAim(event.finishedDouble));
export function loadFinishDoAttemptJournal(profileId?: string | null): FinishDoAttemptJournal | null {
  try {
    const value = JSON.parse(localStorage.getItem(finishDoAttemptJournalKey(profileId)) || "null");
    if (value?.version !== 1 || typeof value.lineageId !== "string" || !value.lineageId ||
        value.baseline?.version !== 1 || !Array.isArray(value.events) ||
        value.events.length > 10000 || !value.events.every(validEvent)) return null;
    const ids = new Set<string>();
    if (value.events.some((event: FinishDoAttemptEvent) => { if (ids.has(event.id)) return true; ids.add(event.id); return false; })) return null;
    return value as FinishDoAttemptJournal;
  } catch { return null; }
}
function applyAttempt(progress: FinishDoProgress, event: FinishDoAttemptEvent): void {
  progress.sessions += 1;
  progress.darts += event.shots.length;
  const days = progress.days || (progress.days = {});
  const day = days[event.date] || { date:event.date, sessions:0, darts:0, attempts:0, hits:0 };
  day.sessions += 1;
  day.darts += event.shots.length;
  for (const shot of event.shots) {
    const label = shot.aimedDouble || "";
    if (!validAim(label)) continue;
    const row = progress.aims[label] || { label, attempts:0, hits:0, singleHits:0, updatedAt:0 };
    row.attempts += 1;
    day.attempts += 1;
    if (shot.actual === label) { row.hits += 1; day.hits += 1; }
    else if (shot.actual === (label === "BULL50" ? "BULL25" : `S${label.slice(1)}`)) row.singleHits += 1;
    row.updatedAt = Math.max(row.updatedAt, event.at);
    progress.aims[label] = row;
  }
  days[event.date] = day;
  if (event.finishedDouble && event.shots.at(-1)?.actual === event.finishedDouble) {
    const byDouble = progress.checkoutByDouble || (progress.checkoutByDouble = {});
    byDouble[event.finishedDouble] = (byDouble[event.finishedDouble] || 0) + 1;
  }
  // Retain recent daily buckets without deleting cumulative precision.
  const dates = Object.keys(days).sort();
  for (const old of dates.slice(0, Math.max(0, dates.length - 120))) delete days[old];
}
function rebuiltProgress(journal: FinishDoAttemptJournal): FinishDoProgress {
  const result = JSON.parse(JSON.stringify(journal.baseline)) as FinishDoProgress;
  for (const event of journal.events.slice().sort((a,b) => a.at-b.at || a.id.localeCompare(b.id))) applyAttempt(result,event);
  return result;
}
/** Import is explicit: refuse independent baselines, ambiguous IDs or inconsistent local state.
 * This does not merge pedagogical cycle stages, which are sequential. */
export function mergeFinishDoAttemptJournal(profileId: string | null | undefined, remote: FinishDoAttemptJournal):
  { status: "merged" | "unchanged" | "conflict"; imported: number; reason?: string } {
  const local = loadFinishDoAttemptJournal(profileId);
  if (!local) return { status:"conflict", imported:0, reason:"Journal local absent : fusion automatique non fiable." };
  if (!remote || remote.version !== 1 || remote.lineageId !== local.lineageId ||
      !Array.isArray(remote.events) || remote.events.length > 10000 || !remote.events.every(validEvent) ||
      JSON.stringify(remote.baseline) !== JSON.stringify(local.baseline))
    return { status:"conflict", imported:0, reason:"Bases historiques différentes ou journal invalide." };
  const known = new Map(local.events.map(event => [event.id, JSON.stringify(event)]));
  const additions: FinishDoAttemptEvent[] = [];
  const remoteSeen = new Set<string>();
  for (const event of remote.events) {
    if (remoteSeen.has(event.id)) return { status:"conflict", imported:0, reason:"Identifiants dupliqués dans le journal distant." };
    remoteSeen.add(event.id);
    const existing = known.get(event.id);
    if (existing && existing !== JSON.stringify(event)) return { status:"conflict", imported:0, reason:"Identifiant de tentative contradictoire." };
    if (!existing) { additions.push(event); known.set(event.id, JSON.stringify(event)); }
  }
  if (!additions.length) return { status:"unchanged", imported:0 };
  // Refuse to erase any local progress changed outside this journal.
  if (JSON.stringify(loadFinishDoProgress(profileId)) !== JSON.stringify(rebuiltProgress(local)))
    return { status:"conflict", imported:0, reason:"Agrégats locaux divergents : intervention manuelle nécessaire." };
  const merged: FinishDoAttemptJournal = { ...local, events:[...local.events,...additions] };
  const aggregate = rebuiltProgress(merged);
  try {
    localStorage.setItem(finishDoAttemptJournalKey(profileId), JSON.stringify(merged));
    localStorage.setItem(finishDoProgressKey(profileId), JSON.stringify(aggregate));
    if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("mss-finish-do-progress", { detail:{profileId:profileId || "guest"} }));
    return { status:"merged", imported:additions.length };
  } catch { return { status:"conflict", imported:0, reason:"Écriture locale indisponible." }; }
}

export type FinishAimEvidence = { aimedDouble?: string; actual: string };
export function saveFinishDoAttempt(profileId: string | null | undefined, evidence: FinishAimEvidence[], finishedDouble?: string): FinishDoProgress {
  const progress = loadFinishDoProgress(profileId);
  const today = new Date();
  const date = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  const last = evidence.at(-1)?.actual;
  const event: FinishDoAttemptEvent = {
    id: newJournalId(), at: Date.now(), date,
    shots: evidence.map(shot => ({ ...(validAim(String(shot.aimedDouble || "")) ? { aimedDouble:shot.aimedDouble } : {}), actual:shot.actual })),
    ...(finishedDouble && validAim(finishedDouble) && last === finishedDouble ? { finishedDouble } : {}),
  };
  // Legacy V1 progress remains usable even when journaling is unsupported by the browser.
  const prior = loadFinishDoAttemptJournal(profileId);
  const journal: FinishDoAttemptJournal = prior || {
    version:1, lineageId:newJournalId(), baseline:JSON.parse(JSON.stringify(progress)), events:[],
  };
  if (event.shots.length && event.shots.every(validShot)) {
    applyAttempt(progress,event);
    try {
      localStorage.setItem(finishDoAttemptJournalKey(profileId), JSON.stringify({ ...journal, events:[...journal.events,event] }));
      localStorage.setItem(finishDoProgressKey(profileId), JSON.stringify(progress));
      window.dispatchEvent(new CustomEvent("mss-finish-do-progress", { detail:{profileId:profileId || "guest"} }));
    } catch { /* unavailable storage must not prevent a training session */ }
  }
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

/** Evidence-driven programme status. Existing V1 aggregates remain backwards compatible. */
export function getFinishDoPlanStatus(progress: FinishDoProgress, lessonValidated: boolean) {
  const plan = buildFinishDoTrainingPlan(progress);
  const row = progress.aims[plan.focus];
  const attempts = row?.attempts || 0;
  const hits = row?.hits || 0;
  const targetHits = plan.tier === "discovery" ? 0 : plan.tier === "foundation" ? 3 : plan.tier === "consistency" ? 6 : 7;
  const precisionComplete = attempts >= (plan.tier === "discovery" ? 3 : 10) &&
    (plan.tier === "discovery" || hits / attempts >= targetHits / 10);
  const checkouts = progress.checkoutByDouble?.[plan.focus] || 0;
  return { plan, placementComplete: lessonValidated, precisionComplete, checkoutComplete: checkouts > 0, attempts, hits, checkouts, targetHits };
}


/** FINISH DO guided cycles. Independent of match history and of the legacy V1 totals. */
export type FinishDoCycle = {
  id: string;
  focus: string;
  tier: FinishDoTrainingPlan["tier"];
  startedAt: number;
  baselineAttempts: number;
  baselineHits: number;
  baselineCheckouts: number;
  goalAttempts: number;
  goalHits: number;
  /** Stage progression is sequential: prior darts cannot validate later stages. */
  stage?: 1 | 2 | 3 | 4;
  precisionStartAttempts?: number;
  precisionStartHits?: number;
  checkoutStartCount?: number;
  completedAt?: number;
};
export type FinishDoCycleJournal = { version: 1; active: FinishDoCycle; completed: FinishDoCycle[] };
const CYCLE_PREFIX = "mss.training.finish-do.cycles.v1:";
export const finishDoCycleKey = (profileId?: string | null) => CYCLE_PREFIX + encodeURIComponent(profileId || "guest");

export function createFinishDoCycle(progress: FinishDoProgress, startedAt = Date.now()): FinishDoCycle {
  const plan = buildFinishDoTrainingPlan(progress);
  const row = progress.aims[plan.focus];
  const goalAttempts = plan.tier === "discovery" ? 3 : 10;
  const goalHits = plan.tier === "discovery" ? 0 : plan.tier === "foundation" ? 3 : plan.tier === "consistency" ? 6 : 7;
  return {
    id: `${startedAt}-${plan.focus}`,
    focus: plan.focus,
    tier: plan.tier,
    startedAt,
    baselineAttempts: row?.attempts || 0,
    baselineHits: row?.hits || 0,
    baselineCheckouts: progress.checkoutByDouble?.[plan.focus] || 0,
    goalAttempts,
    goalHits,
    stage: 1,
  };
}
function validCycle(value: any): value is FinishDoCycle {
  return !!value && validAim(String(value.focus || "")) && Number.isFinite(value.startedAt) && value.startedAt > 0 &&
    ["discovery", "foundation", "consistency", "mastery"].includes(value.tier) &&
    ["baselineAttempts", "baselineHits", "baselineCheckouts", "goalAttempts", "goalHits"].every(key =>
      Number.isSafeInteger(value[key]) && value[key] >= 0);
}
export function loadFinishDoCycleJournal(profileId: string | null | undefined, progress: FinishDoProgress): FinishDoCycleJournal {
  try {
    const stored = JSON.parse(localStorage.getItem(finishDoCycleKey(profileId)) || "null");
    if (stored?.version === 1 && validCycle(stored.active)) return {
      version: 1,
      active: stored.active,
      completed: Array.isArray(stored.completed) ? stored.completed.filter(validCycle).slice(-30) : [],
    };
  } catch { /* local storage may be disabled */ }
  // No retroactive validation of older sessions: the cycle starts at current counters.
  const fresh: FinishDoCycleJournal = { version: 1, active: createFinishDoCycle(progress), completed: [] };
  try { localStorage.setItem(finishDoCycleKey(profileId), JSON.stringify(fresh)); } catch {}
  return fresh;
}
/** Advance at most one stage per evaluation. A new step starts with fresh counters. */
export function syncFinishDoCycleStages(
  profileId: string | null | undefined,
  progress: FinishDoProgress,
  lesson?: { latest?: number; updatedAt?: number } | null,
): FinishDoCycleJournal {
  const journal = loadFinishDoCycleJournal(profileId, progress);
  const active = journal.active;
  const stage = active.stage || 1; // V235 cycles migrate conservatively, not retroactively
  const row = progress.aims[active.focus];
  const totalAttempts = row?.attempts || 0;
  const totalHits = row?.hits || 0;
  const totalCheckouts = progress.checkoutByDouble?.[active.focus] || 0;
  let next: FinishDoCycle | null = null;
  if (stage === 1 && lesson && (lesson.updatedAt || 0) > active.startedAt && (lesson.latest || 0) >= 80) {
    next = { ...active, stage: 2, precisionStartAttempts: totalAttempts, precisionStartHits: totalHits };
  } else if (stage === 2) {
    const attempts = Math.max(0, totalAttempts - (active.precisionStartAttempts ?? active.baselineAttempts));
    const hits = Math.max(0, totalHits - (active.precisionStartHits ?? active.baselineHits));
    if (attempts >= active.goalAttempts && hits >= active.goalHits) {
      next = { ...active, stage: 3, checkoutStartCount: totalCheckouts };
    }
  } else if (stage === 3 && totalCheckouts > (active.checkoutStartCount ?? active.baselineCheckouts)) {
    next = { ...active, stage: 4 };
  }
  if (!next) return journal;
  const updated = { ...journal, active: next };
  try {
    localStorage.setItem(finishDoCycleKey(profileId), JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent("mss-finish-do-cycle", { detail: { profileId: profileId || "guest" } }));
  } catch { /* no persistent storage: the UI still reflects the current cycle */ }
  return updated;
}

export function evaluateFinishDoCycle(
  cycle: FinishDoCycle,
  progress: FinishDoProgress,
  _lesson?: { latest?: number; updatedAt?: number } | null,
) {
  const row = progress.aims[cycle.focus];
  const attempts = Math.max(0, (row?.attempts || 0) - (cycle.precisionStartAttempts ?? cycle.baselineAttempts));
  const hits = Math.max(0, (row?.hits || 0) - (cycle.precisionStartHits ?? cycle.baselineHits));
  const checkouts = Math.max(0, (progress.checkoutByDouble?.[cycle.focus] || 0) - (cycle.checkoutStartCount ?? cycle.baselineCheckouts));
  const stage = cycle.stage || 1;
  return {
    attempts, hits, checkouts,
    placementComplete: stage >= 2,
    precisionComplete: stage >= 3,
    checkoutComplete: stage >= 4,
    complete: stage === 4,
  };
}
/** Explicit promotion: only a sequentially validated cycle can be archived. */
export function advanceFinishDoCycle(
  profileId: string | null | undefined,
  progress: FinishDoProgress,
  lesson?: { latest?: number; updatedAt?: number } | null,
): FinishDoCycleJournal {
  const journal = syncFinishDoCycleStages(profileId, progress, lesson);
  if (!evaluateFinishDoCycle(journal.active, progress, lesson).complete) return journal;
  const now = Date.now();
  const next: FinishDoCycleJournal = {
    version: 1,
    active: createFinishDoCycle(progress, now),
    completed: [...journal.completed, { ...journal.active, completedAt: now }].slice(-30),
  };
  try {
    localStorage.setItem(finishDoCycleKey(profileId), JSON.stringify(next));
    window.dispatchEvent(new CustomEvent("mss-finish-do-cycle", { detail: { profileId: profileId || "guest" } }));
  } catch {}
  return next;
}
