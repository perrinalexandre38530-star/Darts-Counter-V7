import { buildRunningPlanWeeks, loadRunningPlan } from "../activity/runningTraining";
import { loadRunningRaces } from "../activity/runningRaceCalendar";
import { FIT_PROGRAMS, getActiveFitProgramDefinition } from "../fit/fitProgramCatalog";
import { getActiveMultisportPlanDefinition } from "./multisportPlan";

export type MultisportEventSport = "fit" | "running" | "darts" | "foot" | "babyfoot" | "pingpong" | "petanque" | "molkky" | "dicegame" | "esports" | "other";
export type MultisportEventType = "workout" | "training" | "match" | "game" | "outing" | "race" | "tournament" | "recovery" | "club" | "other";
export type MultisportEventSource = "manual" | "fit_program" | "multisport_program" | "running_program" | "running_race" | "friend" | "club" | "team" | "system";
export type MultisportEventStatus = "planned" | "pending" | "confirmed" | "declined" | "completed" | "cancelled";

export type MultisportAgendaEvent = {
  id: string;
  title: string;
  sport: MultisportEventSport;
  discipline?: string;
  type: MultisportEventType;
  source: MultisportEventSource;
  sourceId?: string;
  startAt: number;
  durationMin?: number;
  location?: string;
  notes?: string;
  organizer?: string;
  club?: string;
  participants?: string[];
  status: MultisportEventStatus;
  route?: string;
  routeParams?: Record<string, unknown>;
  accent?: string;
  readonly?: boolean;
  createdAt?: number;
};

export const MULTISPORT_AGENDA_STORAGE_KEY = "mss-multisport-agenda-v1";
const DAY = 86_400_000;

const SPORT_META: Record<MultisportEventSport, { label: string; icon: string; accent: string }> = {
  fit: { label: "FIT PERF", icon: "🏋️", accent: "#f6c256" },
  running: { label: "RUNNING PERF", icon: "🏃", accent: "#74f7a5" },
  darts: { label: "DARTS", icon: "🎯", accent: "#cfe48b" },
  foot: { label: "FOOT", icon: "⚽", accent: "#35d86f" },
  babyfoot: { label: "BABY-FOOT", icon: "⚽", accent: "#ffcf5a" },
  pingpong: { label: "PING-PONG", icon: "🏓", accent: "#ff8fd7" },
  petanque: { label: "PÉTANQUE", icon: "🟡", accent: "#8fd7ff" },
  molkky: { label: "MÖLKKY", icon: "🪵", accent: "#f7b267" },
  dicegame: { label: "DICE GAME", icon: "🎲", accent: "#b9a7ff" },
  esports: { label: "E-SPORTS", icon: "🎮", accent: "#8ab4ff" },
  other: { label: "SPORT", icon: "◆", accent: "#c7ccd6" },
};

export function multisportSportMeta(sport: MultisportEventSport) { return SPORT_META[sport] || SPORT_META.other; }

function makeId(prefix = "agenda") {
  try { return `${prefix}_${crypto.randomUUID()}`; } catch { return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`; }
}

function normalizeStoredEvent(raw: any): MultisportAgendaEvent | null {
  if (!raw || typeof raw !== "object") return null;
  const startAt = Number(raw.startAt || 0);
  if (!Number.isFinite(startAt) || startAt <= 0) return null;
  const sport = String(raw.sport || "other") as MultisportEventSport;
  const meta = multisportSportMeta(sport);
  return {
    id: String(raw.id || makeId()), title: String(raw.title || "Activité").slice(0, 100), sport: SPORT_META[sport] ? sport : "other",
    discipline: raw.discipline ? String(raw.discipline).slice(0, 64) : undefined,
    type: String(raw.type || "other") as MultisportEventType, source: String(raw.source || "manual") as MultisportEventSource,
    sourceId: raw.sourceId ? String(raw.sourceId) : undefined, startAt, durationMin: Number.isFinite(Number(raw.durationMin)) ? Math.max(0, Number(raw.durationMin)) : undefined,
    location: raw.location ? String(raw.location).slice(0, 120) : undefined, notes: raw.notes ? String(raw.notes).slice(0, 500) : undefined,
    organizer: raw.organizer ? String(raw.organizer).slice(0, 80) : undefined, club: raw.club ? String(raw.club).slice(0, 80) : undefined,
    participants: Array.isArray(raw.participants) ? raw.participants.map(String).slice(0, 30) : undefined,
    status: String(raw.status || "planned") as MultisportEventStatus, route: raw.route ? String(raw.route) : undefined,
    routeParams: raw.routeParams && typeof raw.routeParams === "object" ? raw.routeParams : undefined,
    accent: raw.accent ? String(raw.accent) : meta.accent, readonly: !!raw.readonly, createdAt: Number(raw.createdAt || Date.now()),
  };
}

export function loadStoredMultisportEvents(): MultisportAgendaEvent[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const raw = JSON.parse(localStorage.getItem(MULTISPORT_AGENDA_STORAGE_KEY) || "[]");
    return (Array.isArray(raw) ? raw : []).map(normalizeStoredEvent).filter((item): item is MultisportAgendaEvent => !!item);
  } catch { return []; }
}

export function saveStoredMultisportEvents(events: MultisportAgendaEvent[]) {
  if (typeof localStorage === "undefined") return;
  try { localStorage.setItem(MULTISPORT_AGENDA_STORAGE_KEY, JSON.stringify(events.slice(-500))); } catch {}
  try { window.dispatchEvent(new CustomEvent("dc:multisport-agenda-changed")); } catch {}
}

export function createMultisportEvent(input: Omit<MultisportAgendaEvent, "id" | "createdAt">) {
  const event: MultisportAgendaEvent = { ...input, id: makeId(), createdAt: Date.now() };
  saveStoredMultisportEvents([...loadStoredMultisportEvents(), event]);
  return event;
}

export function updateMultisportEvent(id: string, patch: Partial<MultisportAgendaEvent>) {
  const next = loadStoredMultisportEvents().map((event) => event.id === id ? { ...event, ...patch, id: event.id } : event);
  saveStoredMultisportEvents(next);
  return next.find((event) => event.id === id) || null;
}

export function removeMultisportEvent(id: string) {
  saveStoredMultisportEvents(loadStoredMultisportEvents().filter((event) => event.id !== id));
}

export function respondToAgendaInvitation(id: string, response: "confirmed" | "declined") {
  return updateMultisportEvent(id, { status: response });
}

function virtualFitProgramEvents(): MultisportAgendaEvent[] {
  const state = getActiveFitProgramDefinition();
  if (!state) return [];
  const { active, program } = state;
  const events: MultisportAgendaEvent[] = [];
  for (let week = 0; week < program.durationWeeks; week += 1) {
    for (let slot = 0; slot < program.schedule.length; slot += 1) {
      const recipe = program.schedule[slot];
      const startAt = active.startedAt + (week * 7 + recipe.dayOffset) * DAY + 18 * 60 * 60 * 1000;
      events.push({
        id: `fitplan:${program.id}:w${week + 1}:s${slot + 1}`, title: recipe.title, sport: "fit", discipline: recipe.practice || program.practice,
        type: recipe.practice === "mobility" || recipe.practice === "stretching" || recipe.practice === "yoga" ? "recovery" : "workout",
        source: "fit_program", sourceId: program.id, startAt, durationMin: recipe.durationMin, status: "planned", readonly: true,
        accent: program.accent, route: "games", routeParams: { fitTemplateId: recipe.templateId || "free", fitSessionTitle: recipe.title, fitProgramId: program.id },
      });
    }
  }
  return events;
}

function virtualMultisportPlanEvents(): MultisportAgendaEvent[] {
  const state = getActiveMultisportPlanDefinition();
  if (!state) return [];
  const { active, plan } = state;
  const events: MultisportAgendaEvent[] = [];
  for (let week = 0; week < plan.durationWeeks; week += 1) {
    for (let slotIndex = 0; slotIndex < plan.slots.length; slotIndex += 1) {
      const slot = plan.slots[slotIndex];
      const startAt = active.startedAt + (week * 7 + slot.dayOffset) * DAY + slot.startHour * 60 * 60 * 1000 + slot.startMinute * 60 * 1000;
      const meta = multisportSportMeta(slot.sport as MultisportEventSport);
      events.push({
        id: `multiplan:${plan.id}:w${week + 1}:${slot.id}`, title: slot.title, sport: slot.sport as MultisportEventSport, discipline: slot.discipline,
        type: slot.eventType as MultisportEventType, source: "multisport_program", sourceId: plan.id, startAt, durationMin: slot.durationMin,
        notes: slot.note || plan.subtitle, status: "planned", readonly: true, accent: meta.accent, route: slot.route || "games", routeParams: slot.routeParams,
      });
    }
  }
  return events;
}

function virtualRunningEvents(): MultisportAgendaEvent[] {
  const plan = loadRunningPlan();
  if (!plan) return [];
  return buildRunningPlanWeeks(plan).flatMap((week) => week.sessions.map((session) => ({
    id: `runplan:${session.id}`, title: session.title, sport: "running" as const, discipline: "running", type: "training" as const,
    source: "running_program" as const, sourceId: session.id, startAt: session.scheduledAt, durationMin: session.targetDurationMs ? Math.max(1, Math.round(session.targetDurationMs / 60_000)) : undefined,
    notes: session.subtitle, status: "planned" as const, readonly: true, accent: SPORT_META.running.accent, route: "games",
    routeParams: { runningPresetId: session.customWorkout ? "custom" : session.presetId, runningTargetM: session.targetDistanceM || undefined, runningTargetDurationMs: session.targetDurationMs || undefined, runningPlanId: plan.id, runningPlanSessionId: session.id, runningPlanSessionTitle: session.title, runningCustomWorkout: session.customWorkout || undefined },
  })));
}

function virtualRunningRaceEvents(): MultisportAgendaEvent[] {
  return loadRunningRaces().map((race) => ({
    id: `runrace:${race.id}`, title: race.name, sport: "running" as const, discipline: "running", type: "race" as const, source: "running_race" as const, sourceId: race.id,
    startAt: race.date, location: race.location, notes: race.notes, status: "confirmed" as const, readonly: true, accent: "#9df7bc", route: "running_plan", routeParams: { runningPlanTab: "races" },
  }));
}

export function collectMultisportAgendaEvents(): MultisportAgendaEvent[] {
  const map = new Map<string, MultisportAgendaEvent>();
  [...virtualFitProgramEvents(), ...virtualMultisportPlanEvents(), ...virtualRunningEvents(), ...virtualRunningRaceEvents(), ...loadStoredMultisportEvents()].forEach((event) => map.set(event.id, event));
  return [...map.values()].filter((event) => event.status !== "declined" && event.status !== "cancelled").sort((a, b) => a.startAt - b.startAt);
}

export function agendaEventsBetween(startAt: number, endAt: number) {
  return collectMultisportAgendaEvents().filter((event) => event.startAt >= startAt && event.startAt < endAt);
}

export function nextAgendaEvent(now = Date.now()) {
  return collectMultisportAgendaEvents().find((event) => event.startAt >= now - 60 * 60 * 1000 && event.status !== "declined") || null;
}

export function localDayStart(ts = Date.now()) { const d = new Date(ts); d.setHours(0, 0, 0, 0); return d.getTime(); }
export function localWeekStart(ts = Date.now()) { const d = new Date(localDayStart(ts)); const weekday = (d.getDay() + 6) % 7; d.setDate(d.getDate() - weekday); return d.getTime(); }
export function localMonthStart(ts = Date.now()) { const d = new Date(ts); d.setHours(0, 0, 0, 0); d.setDate(1); return d.getTime(); }

export function sportRouteForAgenda(sport: MultisportEventSport) {
  if (sport === "fit" || sport === "running" || sport === "darts" || sport === "foot" || sport === "babyfoot" || sport === "pingpong" || sport === "petanque" || sport === "molkky" || sport === "dicegame" || sport === "esports") return sport;
  return null;
}

function icsEscape(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/\r?\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");
}

function icsUtc(ts: number) {
  const d = new Date(ts);
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;
}

export function buildMultisportAgendaIcs(events: MultisportAgendaEvent[] = collectMultisportAgendaEvents()) {
  const now = icsUtc(Date.now());
  const rows = events
    .filter((event) => event.status !== "declined" && event.status !== "cancelled" && event.status !== "pending")
    .map((event) => {
      const meta = multisportSportMeta(event.sport);
      const endAt = event.startAt + Math.max(1, event.durationMin || 60) * 60_000;
      const description = [meta.label, event.discipline, event.organizer || event.club, event.notes].filter(Boolean).join(" · ");
      return [
        "BEGIN:VEVENT",
        `UID:${icsEscape(event.id)}@multisports-scoring`,
        `DTSTAMP:${now}`,
        `DTSTART:${icsUtc(event.startAt)}`,
        `DTEND:${icsUtc(endAt)}`,
        `SUMMARY:${icsEscape(`${meta.label} · ${event.title}`)}`,
        event.location ? `LOCATION:${icsEscape(event.location)}` : "",
        description ? `DESCRIPTION:${icsEscape(description)}` : "",
        `STATUS:${event.status === "completed" || event.status === "confirmed" ? "CONFIRMED" : "TENTATIVE"}`,
        "END:VEVENT",
      ].filter(Boolean).join("\r\n");
    });
  return ["BEGIN:VCALENDAR", "VERSION:2.0", "CALSCALE:GREGORIAN", "METHOD:PUBLISH", "PRODID:-//MULTISPORTS SCORING//Agenda//FR", ...rows, "END:VCALENDAR", ""].join("\r\n");
}

export function downloadMultisportAgendaIcs(events: MultisportAgendaEvent[] = collectMultisportAgendaEvents(), filename = "multisports-scoring-agenda.ics") {
  if (typeof document === "undefined") return false;
  try {
    const blob = new Blob([buildMultisportAgendaIcs(events)], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1500);
    return true;
  } catch { return false; }
}

export const FIT_PROGRAM_CATALOG = FIT_PROGRAMS;
