export type MultisportPlanSport = "fit" | "running" | "darts" | "foot" | "babyfoot" | "pingpong" | "petanque" | "molkky" | "dicegame" | "esports" | "other";
export type MultisportPlanEventType = "workout" | "training" | "match" | "game" | "outing" | "race" | "tournament" | "recovery" | "club" | "other";
export type MultisportPlanIntensity = "easy" | "moderate" | "hard";

export type MultisportPlanSlot = {
  id: string;
  dayOffset: number;
  sport: MultisportPlanSport;
  discipline?: string;
  title: string;
  durationMin: number;
  startHour: number;
  startMinute: number;
  intensity: MultisportPlanIntensity;
  eventType: MultisportPlanEventType;
  presetId?: string;
  route?: string;
  routeParams?: Record<string, unknown>;
  note?: string;
};

export type MultisportWeeklyPlan = {
  id: string;
  title: string;
  subtitle: string;
  durationWeeks: number;
  slots: MultisportPlanSlot[];
  createdAt: number;
  updatedAt: number;
};

export type ActiveMultisportPlan = {
  planId: string;
  startedAt: number;
  createdAt: number;
};

export type MultisportActivityPreset = {
  id: string;
  label: string;
  shortLabel: string;
  icon: string;
  sport: MultisportPlanSport;
  discipline?: string;
  title: string;
  durationMin: number;
  intensity: MultisportPlanIntensity;
  eventType: MultisportPlanEventType;
  route: string;
  routeParams?: Record<string, unknown>;
};

export type SmartMultisportTemplateId = "balanced" | "strength_run" | "performance" | "social";
export type SmartMultisportTemplate = { id: SmartMultisportTemplateId; label: string; subtitle: string; icon: string; slots: Array<{ dayOffset: number; presetId: string; startHour?: number }> };

export const MULTISPORT_PLAN_STORAGE_KEY = "mss-multisport-weekly-plans-v1";
export const MULTISPORT_ACTIVE_PLAN_KEY = "mss-multisport-active-plan-v1";
const DAY = 86_400_000;

export const MULTISPORT_ACTIVITY_PRESETS: MultisportActivityPreset[] = [
  { id: "fit-full", label: "Musculation · Full Body", shortLabel: "Musculation", icon: "🏋️", sport: "fit", discipline: "musculation", title: "MUSCULATION · FULL BODY", durationMin: 55, intensity: "hard", eventType: "workout", route: "games", routeParams: { fitTemplateId: "full", fitPractice: "musculation" } },
  { id: "fit-push", label: "Musculation · Push", shortLabel: "Push", icon: "🏋️", sport: "fit", discipline: "musculation", title: "MUSCULATION · PUSH", durationMin: 50, intensity: "hard", eventType: "workout", route: "games", routeParams: { fitTemplateId: "push", fitPractice: "musculation" } },
  { id: "fit-pull", label: "Musculation · Pull", shortLabel: "Pull", icon: "🏋️", sport: "fit", discipline: "musculation", title: "MUSCULATION · PULL", durationMin: 50, intensity: "hard", eventType: "workout", route: "games", routeParams: { fitTemplateId: "pull", fitPractice: "musculation" } },
  { id: "fit-legs", label: "Musculation · Legs", shortLabel: "Legs", icon: "🦵", sport: "fit", discipline: "musculation", title: "MUSCULATION · LEGS", durationMin: 55, intensity: "hard", eventType: "workout", route: "games", routeParams: { fitTemplateId: "legs", fitPractice: "musculation" } },
  { id: "calisthenics", label: "Calisthénie", shortLabel: "Calisthénie", icon: "🤸", sport: "fit", discipline: "calisthenics", title: "CALISTHÉNIE", durationMin: 40, intensity: "hard", eventType: "workout", route: "games", routeParams: { fitTemplateId: "free", fitPractice: "calisthenics" } },
  { id: "hiit", label: "HIIT", shortLabel: "HIIT", icon: "⚡", sport: "fit", discipline: "hiit", title: "HIIT · FULL BODY", durationMin: 20, intensity: "hard", eventType: "workout", route: "games", routeParams: { fitTemplateId: "free", fitPractice: "hiit" } },
  { id: "functional", label: "Fonctionnel", shortLabel: "Fonctionnel", icon: "🔥", sport: "fit", discipline: "functional", title: "FUNCTIONAL TRAINING", durationMin: 40, intensity: "hard", eventType: "workout", route: "games", routeParams: { fitTemplateId: "free", fitPractice: "functional" } },
  { id: "yoga", label: "Yoga", shortLabel: "Yoga", icon: "🧘", sport: "fit", discipline: "yoga", title: "YOGA · FLOW", durationMin: 25, intensity: "easy", eventType: "recovery", route: "games", routeParams: { fitTemplateId: "free", fitPractice: "yoga" } },
  { id: "mobility", label: "Mobilité", shortLabel: "Mobilité", icon: "🧎", sport: "fit", discipline: "mobility", title: "MOBILITÉ · RECOVERY", durationMin: 15, intensity: "easy", eventType: "recovery", route: "games", routeParams: { fitTemplateId: "free", fitPractice: "mobility" } },
  { id: "stretching", label: "Étirements", shortLabel: "Étirements", icon: "🌿", sport: "fit", discipline: "stretching", title: "STRETCHING · RECOVERY", durationMin: 15, intensity: "easy", eventType: "recovery", route: "games", routeParams: { fitTemplateId: "free", fitPractice: "stretching" } },
  { id: "running-easy", label: "Running · Endurance", shortLabel: "Running", icon: "🏃", sport: "running", discipline: "running", title: "RUNNING · ENDURANCE", durationMin: 40, intensity: "moderate", eventType: "training", route: "games", routeParams: { runningPresetId: "easy", runningActivitySport: "running" } },
  { id: "running-intervals", label: "Running · Intervalles", shortLabel: "Intervalles", icon: "⚡", sport: "running", discipline: "running", title: "RUNNING · INTERVALLES", durationMin: 30, intensity: "hard", eventType: "training", route: "games", routeParams: { runningPresetId: "intervals", runningActivitySport: "running" } },
  { id: "running-long", label: "Running · Sortie longue", shortLabel: "Sortie longue", icon: "🛣️", sport: "running", discipline: "running", title: "RUNNING · SORTIE LONGUE", durationMin: 60, intensity: "hard", eventType: "training", route: "games", routeParams: { runningPresetId: "long", runningActivitySport: "running" } },
  { id: "trail", label: "Trail", shortLabel: "Trail", icon: "⛰️", sport: "running", discipline: "trail", title: "TRAIL · SORTIE", durationMin: 60, intensity: "hard", eventType: "outing", route: "games", routeParams: { runningPresetId: "hills", runningActivitySport: "trail" } },
  { id: "walking", label: "Marche active", shortLabel: "Marche", icon: "🚶", sport: "running", discipline: "walking", title: "MARCHE ACTIVE", durationMin: 45, intensity: "easy", eventType: "outing", route: "games", routeParams: { runningPresetId: "easy", runningActivitySport: "walking" } },
  { id: "hiking", label: "Randonnée", shortLabel: "Randonnée", icon: "🥾", sport: "running", discipline: "hiking", title: "RANDONNÉE", durationMin: 90, intensity: "moderate", eventType: "outing", route: "games", routeParams: { runningPresetId: "free", runningActivitySport: "hiking" } },
  { id: "football", label: "Football", shortLabel: "Football", icon: "⚽", sport: "foot", discipline: "football", title: "FOOTBALL · ENTRAÎNEMENT / MATCH", durationMin: 90, intensity: "hard", eventType: "match", route: "games" },
  { id: "darts", label: "Fléchettes", shortLabel: "Darts", icon: "🎯", sport: "darts", discipline: "darts", title: "DARTS · PARTIE", durationMin: 60, intensity: "easy", eventType: "game", route: "games" },
  { id: "pingpong", label: "Ping-pong", shortLabel: "Ping-pong", icon: "🏓", sport: "pingpong", discipline: "pingpong", title: "PING-PONG · PARTIE", durationMin: 60, intensity: "moderate", eventType: "game", route: "games" },
  { id: "babyfoot", label: "Baby-foot", shortLabel: "Baby-foot", icon: "⚽", sport: "babyfoot", discipline: "babyfoot", title: "BABY-FOOT · PARTIE", durationMin: 45, intensity: "easy", eventType: "game", route: "games" },
  { id: "petanque", label: "Pétanque", shortLabel: "Pétanque", icon: "🟡", sport: "petanque", discipline: "petanque", title: "PÉTANQUE · PARTIE", durationMin: 90, intensity: "easy", eventType: "game", route: "games" },
  { id: "molkky", label: "Mölkky", shortLabel: "Mölkky", icon: "🪵", sport: "molkky", discipline: "molkky", title: "MÖLKKY · PARTIE", durationMin: 60, intensity: "easy", eventType: "game", route: "games" },
  { id: "esports", label: "E-sports", shortLabel: "E-sports", icon: "🎮", sport: "esports", discipline: "esports", title: "E-SPORTS · SESSION", durationMin: 90, intensity: "easy", eventType: "game", route: "games" },
];

export const SMART_MULTISPORT_TEMPLATES: SmartMultisportTemplate[] = [
  { id: "balanced", label: "Semaine équilibrée", subtitle: "Force · cardio · mobilité · récupération", icon: "⚖️", slots: [
    { dayOffset: 0, presetId: "fit-full", startHour: 18 }, { dayOffset: 1, presetId: "running-easy", startHour: 18 }, { dayOffset: 2, presetId: "mobility", startHour: 19 }, { dayOffset: 4, presetId: "calisthenics", startHour: 18 }, { dayOffset: 5, presetId: "running-long", startHour: 10 }, { dayOffset: 6, presetId: "yoga", startHour: 18 },
  ] },
  { id: "strength_run", label: "Force + Running", subtitle: "Musculation et course sans charger les jambes deux jours de suite", icon: "🏋️", slots: [
    { dayOffset: 0, presetId: "fit-push", startHour: 18 }, { dayOffset: 1, presetId: "running-easy", startHour: 18 }, { dayOffset: 2, presetId: "fit-legs", startHour: 18 }, { dayOffset: 4, presetId: "fit-pull", startHour: 18 }, { dayOffset: 5, presetId: "running-long", startHour: 10 }, { dayOffset: 6, presetId: "mobility", startHour: 18 },
  ] },
  { id: "performance", label: "Performance", subtitle: "Force · intervalles · fonctionnel · récupération", icon: "⚡", slots: [
    { dayOffset: 0, presetId: "fit-full", startHour: 18 }, { dayOffset: 1, presetId: "running-intervals", startHour: 18 }, { dayOffset: 2, presetId: "mobility", startHour: 19 }, { dayOffset: 4, presetId: "functional", startHour: 18 }, { dayOffset: 5, presetId: "running-long", startHour: 10 }, { dayOffset: 6, presetId: "stretching", startHour: 18 },
  ] },
  { id: "social", label: "Sport & loisirs", subtitle: "Entraînement personnel + sports entre amis", icon: "👥", slots: [
    { dayOffset: 0, presetId: "fit-full", startHour: 18 }, { dayOffset: 2, presetId: "pingpong", startHour: 19 }, { dayOffset: 4, presetId: "football", startHour: 19 }, { dayOffset: 5, presetId: "darts", startHour: 20 }, { dayOffset: 6, presetId: "mobility", startHour: 18 },
  ] },
];

function localMondayStart(ts = Date.now()) {
  const d = new Date(ts); d.setHours(0, 0, 0, 0); const weekday = (d.getDay() + 6) % 7; d.setDate(d.getDate() - weekday); return d.getTime();
}

function makeId(prefix: string) {
  try { return `${prefix}_${crypto.randomUUID()}`; } catch { return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`; }
}

function normalizeSlot(raw: any, index = 0): MultisportPlanSlot | null {
  if (!raw || typeof raw !== "object") return null;
  const dayOffset = Number(raw.dayOffset);
  if (!Number.isInteger(dayOffset) || dayOffset < 0 || dayOffset > 6) return null;
  const sport = String(raw.sport || "other") as MultisportPlanSport;
  const allowedSports: MultisportPlanSport[] = ["fit","running","darts","foot","babyfoot","pingpong","petanque","molkky","dicegame","esports","other"];
  const intensity = (["easy","moderate","hard"].includes(String(raw.intensity)) ? String(raw.intensity) : "moderate") as MultisportPlanIntensity;
  return {
    id: String(raw.id || `slot_${dayOffset}_${index}`).slice(0, 80), dayOffset, sport: allowedSports.includes(sport) ? sport : "other",
    discipline: raw.discipline ? String(raw.discipline).slice(0, 64) : undefined, title: String(raw.title || "ACTIVITÉ").slice(0, 100),
    durationMin: Math.max(5, Math.min(360, Number(raw.durationMin) || 45)), startHour: Math.max(0, Math.min(23, Number(raw.startHour) || 18)), startMinute: Math.max(0, Math.min(59, Number(raw.startMinute) || 0)),
    intensity, eventType: String(raw.eventType || "training") as MultisportPlanEventType, presetId: raw.presetId ? String(raw.presetId) : undefined,
    route: raw.route ? String(raw.route) : "games", routeParams: raw.routeParams && typeof raw.routeParams === "object" ? raw.routeParams : undefined, note: raw.note ? String(raw.note).slice(0, 300) : undefined,
  };
}

function normalizePlan(raw: any): MultisportWeeklyPlan | null {
  if (!raw || typeof raw !== "object") return null;
  const title = String(raw.title || "Mon plan multisports").trim().slice(0, 80);
  const slots = (Array.isArray(raw.slots) ? raw.slots : []).map(normalizeSlot).filter((slot: MultisportPlanSlot | null): slot is MultisportPlanSlot => !!slot).slice(0, 21);
  if (!title || !slots.length) return null;
  const createdAt = Number(raw.createdAt || Date.now());
  return { id: String(raw.id || makeId("multiplan")), title, subtitle: String(raw.subtitle || `${slots.length} activité(s) / semaine`).slice(0, 120), durationWeeks: Math.max(1, Math.min(52, Number(raw.durationWeeks) || 6)), slots, createdAt, updatedAt: Number(raw.updatedAt || createdAt) };
}

export function presetById(id: string) { return MULTISPORT_ACTIVITY_PRESETS.find((preset) => preset.id === id) || MULTISPORT_ACTIVITY_PRESETS[0]; }

export function slotFromPreset(dayOffset: number, presetId: string, startHour = 18, startMinute = 0): MultisportPlanSlot {
  const preset = presetById(presetId);
  const routeParams = { ...(preset.routeParams || {}) };
  if (preset.sport === "fit") Object.assign(routeParams, { fitSessionTitle: preset.title });
  return { id: makeId("slot"), dayOffset, sport: preset.sport, discipline: preset.discipline, title: preset.title, durationMin: preset.durationMin, startHour, startMinute, intensity: preset.intensity, eventType: preset.eventType, presetId: preset.id, route: preset.route, routeParams };
}

export function buildSmartMultisportSlots(templateId: SmartMultisportTemplateId): MultisportPlanSlot[] {
  const template = SMART_MULTISPORT_TEMPLATES.find((item) => item.id === templateId) || SMART_MULTISPORT_TEMPLATES[0];
  return template.slots.map((slot) => slotFromPreset(slot.dayOffset, slot.presetId, slot.startHour ?? 18, 0));
}

export function analyzeMultisportPlanSlots(slots: MultisportPlanSlot[]) {
  const ordered = [...slots].sort((a, b) => a.dayOffset - b.dayOffset || a.startHour - b.startHour);
  const activeDays = [...new Set(ordered.map((slot) => slot.dayOffset))];
  const weeklyMinutes = ordered.reduce((sum, slot) => sum + slot.durationMin, 0);
  const sports = new Set(ordered.map((slot) => `${slot.sport}:${slot.discipline || ""}`)).size;
  const hardSessions = ordered.filter((slot) => slot.intensity === "hard").length;
  const warnings: string[] = [];
  for (let day = 0; day < 6; day += 1) {
    const todayHard = ordered.some((slot) => slot.dayOffset === day && slot.intensity === "hard");
    const tomorrowHard = ordered.some((slot) => slot.dayOffset === day + 1 && slot.intensity === "hard");
    if (todayHard && tomorrowHard) warnings.push("Deux séances intenses sont placées deux jours de suite.");
    const legs = ordered.some((slot) => slot.dayOffset === day && slot.presetId === "fit-legs");
    const runQuality = ordered.some((slot) => slot.dayOffset === day + 1 && ["running-intervals","running-long","trail"].includes(String(slot.presetId || "")));
    if (legs && runQuality) warnings.push("Une grosse séance jambes précède une séance Running exigeante.");
  }
  if (activeDays.length >= 7) warnings.push("Aucun jour totalement libre dans cette semaine.");
  if (hardSessions >= 5) warnings.push("Charge élevée : 5 séances intenses ou plus cette semaine.");
  return { weeklyMinutes, sports, hardSessions, restDays: Math.max(0, 7 - activeDays.length), warnings: [...new Set(warnings)] };
}

export function loadMultisportPlans(): MultisportWeeklyPlan[] {
  if (typeof localStorage === "undefined") return [];
  try { const raw = JSON.parse(localStorage.getItem(MULTISPORT_PLAN_STORAGE_KEY) || "[]"); return (Array.isArray(raw) ? raw : []).map(normalizePlan).filter((plan): plan is MultisportWeeklyPlan => !!plan); } catch { return []; }
}

export function saveMultisportPlans(plans: MultisportWeeklyPlan[]) {
  if (typeof localStorage === "undefined") return;
  try { localStorage.setItem(MULTISPORT_PLAN_STORAGE_KEY, JSON.stringify(plans.slice(-30))); } catch {}
  try { window.dispatchEvent(new CustomEvent("dc:multisport-plan-changed")); } catch {}
  try { window.dispatchEvent(new CustomEvent("dc:multisport-agenda-changed")); } catch {}
}

export function createMultisportPlan(input: { title: string; durationWeeks: number; slots: MultisportPlanSlot[]; subtitle?: string }, activate = true) {
  const title = String(input.title || "").trim().slice(0, 80);
  const slots = input.slots.map(normalizeSlot).filter((slot): slot is MultisportPlanSlot => !!slot);
  if (!title || !slots.length) return null;
  const now = Date.now();
  const plan: MultisportWeeklyPlan = { id: makeId("multiplan"), title, subtitle: String(input.subtitle || `${slots.length} activité(s) / semaine · plan MULTISPORTS`).slice(0, 120), durationWeeks: Math.max(1, Math.min(52, Number(input.durationWeeks) || 6)), slots, createdAt: now, updatedAt: now };
  saveMultisportPlans([...loadMultisportPlans(), plan]);
  if (activate) activateMultisportPlan(plan.id);
  return plan;
}

export function updateMultisportPlan(planId: string, input: { title: string; durationWeeks: number; slots: MultisportPlanSlot[]; subtitle?: string }) {
  const current = loadMultisportPlans().find((plan) => plan.id === planId);
  if (!current) return null;
  const title = String(input.title || "").trim().slice(0, 80);
  const slots = input.slots.map(normalizeSlot).filter((slot): slot is MultisportPlanSlot => !!slot);
  if (!title || !slots.length) return null;
  const updated: MultisportWeeklyPlan = { ...current, title, subtitle: String(input.subtitle || `${slots.length} activité(s) / semaine · plan MULTISPORTS`).slice(0, 120), durationWeeks: Math.max(1, Math.min(52, Number(input.durationWeeks) || current.durationWeeks)), slots, updatedAt: Date.now() };
  saveMultisportPlans(loadMultisportPlans().map((plan) => plan.id === planId ? updated : plan));
  return updated;
}

export function deleteMultisportPlan(planId: string) {
  saveMultisportPlans(loadMultisportPlans().filter((plan) => plan.id !== planId));
  if (loadActiveMultisportPlan()?.planId === planId) clearActiveMultisportPlan();
}

export function loadActiveMultisportPlan(): ActiveMultisportPlan | null {
  if (typeof localStorage === "undefined") return null;
  try { const raw = JSON.parse(localStorage.getItem(MULTISPORT_ACTIVE_PLAN_KEY) || "null"); if (!raw || !loadMultisportPlans().some((plan) => plan.id === String(raw.planId || ""))) return null; const startedAt = Number(raw.startedAt || 0); if (!Number.isFinite(startedAt) || startedAt <= 0) return null; return { planId: String(raw.planId), startedAt, createdAt: Number(raw.createdAt || Date.now()) }; } catch { return null; }
}

export function activateMultisportPlan(planId: string, now = Date.now()) {
  if (!loadMultisportPlans().some((plan) => plan.id === planId)) return null;
  const active: ActiveMultisportPlan = { planId, startedAt: localMondayStart(now), createdAt: Date.now() };
  try { localStorage.setItem(MULTISPORT_ACTIVE_PLAN_KEY, JSON.stringify(active)); } catch {}
  try { window.dispatchEvent(new CustomEvent("dc:multisport-plan-changed")); } catch {}
  try { window.dispatchEvent(new CustomEvent("dc:multisport-agenda-changed")); } catch {}
  return active;
}

export function clearActiveMultisportPlan() {
  try { localStorage.removeItem(MULTISPORT_ACTIVE_PLAN_KEY); } catch {}
  try { window.dispatchEvent(new CustomEvent("dc:multisport-plan-changed")); } catch {}
  try { window.dispatchEvent(new CustomEvent("dc:multisport-agenda-changed")); } catch {}
}

export function getActiveMultisportPlanDefinition() {
  const active = loadActiveMultisportPlan(); if (!active) return null; const plan = loadMultisportPlans().find((item) => item.id === active.planId) || null; return plan ? { active, plan } : null;
}

export function multisportPlanEventsRange(plan: MultisportWeeklyPlan, active: ActiveMultisportPlan) {
  const end = active.startedAt + plan.durationWeeks * 7 * DAY;
  return { startAt: active.startedAt, endAt: end };
}
