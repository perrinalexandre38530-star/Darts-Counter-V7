/** Rules shared by all sports in the unified Agenda.
 * An external fixture is NOT a personal booking and a day-only fixture has no kickoff time.
 */
export type AgendaScheduleRef = {
  id: string;
  startAt: number;
  durationMin?: number;
  status: string;
  readonly?: boolean;
  source?: string;
};

export function parseLiveAgendaStart(value?: string | null): { startAt: number; timeConfirmed: boolean } | null {
  const raw = String(value || "").trim();
  if (!raw) return null;
  const day = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
  if (day) {
    const y = Number(day[1]), m = Number(day[2]), d = Number(day[3]);
    const date = new Date(y, m - 1, d, 12, 0, 0);
    if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) return null;
    // Noon is an internal date sort key, never presented as the event time.
    return { startAt: date.getTime(), timeConfirmed: false };
  }
  const timestamp = new Date(raw).getTime();
  if (!Number.isFinite(timestamp)) return null;
  // Accept an explicit time, reject a date label that a JS engine happens to parse.
  const timeConfirmed = /(?:T|\s)\d{1,2}:\d{2}/.test(raw);
  return { startAt: timestamp, timeConfirmed };
}

/** Only actual agenda commitments can clash. Multiple simultaneous LIVE broadcasts are choices, not conflicts. */
export function findAgendaConflictIds(events: readonly AgendaScheduleRef[]): Set<string> {
  const active = events.filter((event) => event.source !== "live" && !event.readonly && event.status !== "declined" && event.status !== "cancelled")
    .sort((a, b) => a.startAt - b.startAt);
  const conflicts = new Set<string>();
  for (let i = 0; i < active.length; i += 1) {
    const a = active[i];
    const aEnd = a.startAt + Math.max(15, a.durationMin || 60) * 60_000;
    for (let j = i + 1; j < active.length; j += 1) {
      const b = active[j];
      if (b.startAt >= aEnd) break;
      const bEnd = b.startAt + Math.max(15, b.durationMin || 60) * 60_000;
      if (a.startAt < bEnd && b.startAt < aEnd) {
        conflicts.add(a.id); conflicts.add(b.id);
      }
    }
  }
  return conflicts;
}
