import React from "react";
import BackDot from "../../components/BackDot";
import { useTheme } from "../../contexts/ThemeContext";
import { useLang } from "../../contexts/LangContext";
import { pickLegacyLocalizedText } from "../../i18n/legacyLocalizedText";
import {
  collectMultisportAgendaEvents,
  createMultisportEvent,
  downloadMultisportAgendaIcs,
  localDayStart,
  localMonthStart,
  localWeekStart,
  multisportSportMeta,
  removeMultisportEvent,
  respondToAgendaInvitation,
  type MultisportAgendaEvent,
  type MultisportEventSport,
  type MultisportEventType,
} from "../../planning/multisportAgenda";

type Props = { go: (route: any, params?: any) => void; params?: any };
type View = "today" | "week" | "month" | "invitations";
const DAY = 86_400_000;

const SPORT_OPTIONS: MultisportEventSport[] = ["fit", "running", "darts", "foot", "babyfoot", "pingpong", "petanque", "molkky", "dicegame", "esports", "other"];

function sameLocalDay(a: number, b: number) { return localDayStart(a) === localDayStart(b); }
function formatTime(ts: number, locale: string) { return new Date(ts).toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" }); }
function formatDate(ts: number, locale: string, opts: Intl.DateTimeFormatOptions = { weekday: "short", day: "numeric", month: "short" }) { return new Date(ts).toLocaleDateString(locale, opts); }
function toDateInput(ts: number) { const d = new Date(ts); const pad = (n: number) => String(n).padStart(2, "0"); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }
function inputToTimestamp(dateValue: string, timeValue: string) {
  const [y, m, d] = dateValue.split("-").map(Number); const [hh, mm] = timeValue.split(":").map(Number);
  const date = new Date(); date.setFullYear(y || date.getFullYear(), Math.max(0, (m || 1) - 1), d || 1); date.setHours(hh || 0, mm || 0, 0, 0); return date.getTime();
}

export default function MultisportAgendaPage({ go, params }: Props) {
  const { theme } = useTheme();
  const { lang } = useLang() as any;
  const locale = String(lang || "fr").startsWith("fr") ? "fr-FR" : String(lang || "").startsWith("es") ? "es-ES" : "en-GB";
  const t = (fr: string, en: string, es: string) => pickLegacyLocalizedText(String(lang || "fr"), fr, en, es);
  const accent = (theme as any)?.primary || (theme as any)?.accent || "#f6c256";
  const textSoft = (theme as any)?.textSoft || "#9ca3af";
  const [events, setEvents] = React.useState<MultisportAgendaEvent[]>(() => collectMultisportAgendaEvents());
  const [view, setView] = React.useState<View>(() => (["today", "week", "month", "invitations"].includes(String(params?.agendaView)) ? params.agendaView : "week"));
  const [cursor, setCursor] = React.useState(() => Date.now());
  const [createOpen, setCreateOpen] = React.useState(false);
  const [sportFilter, setSportFilter] = React.useState<MultisportEventSport | "all">("all");

  const refresh = React.useCallback(() => setEvents(collectMultisportAgendaEvents()), []);
  React.useEffect(() => {
    window.addEventListener("dc:multisport-agenda-changed", refresh as EventListener);
    window.addEventListener("focus", refresh);
    return () => { window.removeEventListener("dc:multisport-agenda-changed", refresh as EventListener); window.removeEventListener("focus", refresh); };
  }, [refresh]);

  const filteredEvents = React.useMemo(() => sportFilter === "all" ? events : events.filter((event) => event.sport === sportFilter), [events, sportFilter]);
  const pending = React.useMemo(() => events.filter((event) => event.status === "pending"), [events]);
  const range = React.useMemo(() => {
    if (view === "today") { const start = localDayStart(cursor); return { start, end: start + DAY }; }
    if (view === "month") { const start = localMonthStart(cursor); const d = new Date(start); d.setMonth(d.getMonth() + 1); return { start, end: d.getTime() }; }
    const start = localWeekStart(cursor); return { start, end: start + 7 * DAY };
  }, [cursor, view]);
  const visible = React.useMemo(() => filteredEvents.filter((event) => event.startAt >= range.start && event.startAt < range.end), [filteredEvents, range]);
  const visibleMinutes = React.useMemo(() => visible.reduce((sum, event) => sum + Math.max(0, event.durationMin || 0), 0), [visible]);
  const visibleSports = React.useMemo(() => new Set(visible.map((event) => event.sport)).size, [visible]);

  const shift = (direction: number) => {
    const date = new Date(cursor);
    if (view === "month") date.setMonth(date.getMonth() + direction);
    else date.setDate(date.getDate() + direction * (view === "week" ? 7 : 1));
    setCursor(date.getTime());
  };

  const openEvent = (event: MultisportAgendaEvent) => {
    if (!event.route) return;
    if (["fit", "running", "darts", "foot", "babyfoot", "pingpong", "petanque", "molkky", "dicegame", "esports"].includes(event.sport)) {
      try { localStorage.setItem("dc-start-game", event.sport); } catch {}
      try { window.dispatchEvent(new CustomEvent("dc:sport-change", { detail: { sport: event.sport, game: event.sport, source: "multisport_agenda" } })); } catch {}
    }
    window.requestAnimationFrame(() => go(event.route as any, event.routeParams));
  };

  const title = view === "today"
    ? formatDate(cursor, locale, { weekday: "long", day: "numeric", month: "long" })
    : view === "month"
      ? formatDate(cursor, locale, { month: "long", year: "numeric" })
      : `${formatDate(range.start, locale, { day: "numeric", month: "short" })} — ${formatDate(range.end - DAY, locale, { day: "numeric", month: "short" })}`;

  return (
    <div className="container" style={{ maxWidth: 700, paddingBottom: 100 }}>
      <style>{`
        .msa-top{border:1px solid rgba(255,255,255,.09);border-radius:24px;padding:14px;background:radial-gradient(circle at 15% 0%,${accent}18,transparent 38%),linear-gradient(180deg,rgba(11,15,23,.985),rgba(5,8,14,.99));box-shadow:0 18px 45px rgba(0,0,0,.4)}
        .msa-tabs{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:5px;margin-top:12px;padding:4px;border-radius:15px;background:rgba(0,0,0,.28);border:1px solid rgba(255,255,255,.06)}
        .msa-tab{height:42px;border:1px solid transparent;border-radius:11px;background:transparent;color:rgba(255,255,255,.58);font-size:8px;font-weight:1000;text-transform:uppercase;cursor:pointer;min-width:0}
        .msa-tab.on{color:${accent};border-color:${accent}55;background:${accent}16}
        .msa-event{width:100%;text-align:left;border-radius:17px;border:1px solid rgba(255,255,255,.08);background:linear-gradient(145deg,rgba(255,255,255,.045),rgba(5,8,14,.96));padding:10px;display:grid;grid-template-columns:42px minmax(0,1fr) auto;gap:10px;align-items:center;color:#fff;cursor:pointer;min-width:0}
        .msa-event+.msa-event{margin-top:7px}.msa-day{border-radius:18px;border:1px solid rgba(255,255,255,.07);background:rgba(255,255,255,.025);padding:9px}.msa-day.today{border-color:${accent}55;background:${accent}0c}
        .msa-week{display:grid;gap:8px}.msa-month{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:5px}.msa-month-cell{min-height:66px;border-radius:12px;border:1px solid rgba(255,255,255,.065);background:rgba(255,255,255,.025);padding:5px;overflow:hidden}.msa-month-cell.off{opacity:.28}.msa-dot{width:6px;height:6px;border-radius:999px;display:inline-block;margin-right:3px}
        .msa-action{min-height:42px;border-radius:12px;border:1px solid ${accent}55;background:${accent}15;color:${accent};font-weight:1000;cursor:pointer}.msa-muted{color:${textSoft}}
        @media(max-width:390px){.msa-event{grid-template-columns:38px minmax(0,1fr)}.msa-event-time{grid-column:2}.msa-tab{font-size:6.8px}.msa-month-cell{min-height:56px;padding:4px}}
      `}</style>

      <div className="msa-top">
        <div style={{ display: "grid", gridTemplateColumns: "44px minmax(0,1fr) auto", gap: 9, alignItems: "center" }}>
          <BackDot onClick={() => go("home")} />
          <div style={{ textAlign: "center", minWidth: 0 }}>
            <div style={{ color: accent, fontSize: 8, fontWeight: 1000, letterSpacing: 1.5 }}>MULTISPORTS SCORING</div>
            <div style={{ marginTop: 3, fontSize: 23, fontWeight: 1000, letterSpacing: 1.4 }}>AGENDA</div>
            <div className="msa-muted" style={{ marginTop: 3, fontSize: 9 }}>{t("Toute ta semaine sportive au même endroit", "Your whole sports week in one place", "Toda tu semana deportiva en un solo lugar")}</div>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <button type="button" onClick={() => downloadMultisportAgendaIcs(events)} aria-label={t("Exporter l'agenda", "Export agenda", "Exportar agenda")} title={t("Exporter vers Google / Apple / Outlook (.ics)", "Export to Google / Apple / Outlook (.ics)", "Exportar a Google / Apple / Outlook (.ics)")} style={{ width: 42, height: 42, borderRadius: 14, border: "1px solid rgba(255,255,255,.10)", background: "rgba(255,255,255,.04)", color: "rgba(255,255,255,.76)", fontSize: 18, cursor: "pointer" }}>↗</button>
            <button type="button" onClick={() => setCreateOpen(true)} aria-label={t("Ajouter", "Add", "Añadir")} style={{ width: 42, height: 42, borderRadius: 14, border: `1px solid ${accent}66`, background: `${accent}18`, color: accent, fontSize: 23, cursor: "pointer" }}>+</button>
          </div>
        </div>

        <div className="msa-tabs">
          {(["today", "week", "month", "invitations"] as View[]).map((id) => (
            <button key={id} type="button" className={`msa-tab${view === id ? " on" : ""}`} onClick={() => setView(id)}>
              {id === "today" ? t("Aujourd'hui", "Today", "Hoy") : id === "week" ? t("Semaine", "Week", "Semana") : id === "month" ? t("Mois", "Month", "Mes") : `${t("Invitations", "Invites", "Invitaciones")}${pending.length ? ` · ${pending.length}` : ""}`}
            </button>
          ))}
        </div>
      </div>

      {view !== "invitations" ? <>
        <div style={{ display: "grid", gridTemplateColumns: "40px minmax(0,1fr) 40px", gap: 8, alignItems: "center", marginTop: 10 }}>
          <button type="button" className="msa-action" onClick={() => shift(-1)}>‹</button>
          <button type="button" onClick={() => setCursor(Date.now())} style={{ minHeight: 42, borderRadius: 12, border: "1px solid rgba(255,255,255,.08)", background: "rgba(255,255,255,.035)", color: "#fff", fontWeight: 1000, textTransform: "capitalize" }}>{title}</button>
          <button type="button" className="msa-action" onClick={() => shift(1)}>›</button>
        </div>
        <div style={{ display: "flex", gap: 6, overflowX: "auto", padding: "9px 0 4px" }}>
          <button type="button" onClick={() => setSportFilter("all")} style={chipStyle(sportFilter === "all", accent)}>{t("Tous", "All", "Todos")}</button>
          {SPORT_OPTIONS.filter((id) => id !== "other").map((id) => { const meta = multisportSportMeta(id); return <button key={id} type="button" onClick={() => setSportFilter(id)} style={chipStyle(sportFilter === id, meta.accent)}>{meta.icon} {meta.label}</button>; })}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 6, marginTop: 5 }}>
          <AgendaMetric label={t("ACTIVITÉS", "ACTIVITIES", "ACTIVIDADES")} value={String(visible.length)} accent={accent} />
          <AgendaMetric label={t("SPORTS", "SPORTS", "DEPORTES")} value={String(visibleSports)} accent="#72def4" />
          <AgendaMetric label={t("TEMPS", "TIME", "TIEMPO")} value={formatAgendaMinutes(visibleMinutes)} accent="#75ed9a" />
        </div>
      </> : null}

      {view === "today" ? <div style={{ marginTop: 8 }}>{visible.length ? visible.map((event) => <EventCard key={event.id} event={event} locale={locale} onOpen={() => openEvent(event)} onDelete={!event.readonly ? () => { removeMultisportEvent(event.id); refresh(); } : undefined} />) : <EmptyState text={t("Rien de prévu aujourd'hui. Ajoute une activité ou active un programme.", "Nothing scheduled today. Add an activity or activate a program.", "Nada previsto hoy. Añade una actividad o activa un programa.")} />}</div> : null}

      {view === "week" ? <div className="msa-week" style={{ marginTop: 8 }}>{Array.from({ length: 7 }, (_, i) => range.start + i * DAY).map((day) => { const rows = visible.filter((event) => sameLocalDay(event.startAt, day)); return <section key={day} className={`msa-day${sameLocalDay(day, Date.now()) ? " today" : ""}`}><div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center", marginBottom: rows.length ? 7 : 0 }}><strong style={{ fontSize: 10.5, textTransform: "uppercase", color: sameLocalDay(day, Date.now()) ? accent : "#fff" }}>{formatDate(day, locale)}</strong><span className="msa-muted" style={{ fontSize: 8 }}>{rows.length ? `${rows.length} ${t("activité(s)", "activity", "actividad")}` : t("Libre", "Free", "Libre")}</span></div>{rows.map((event) => <EventCard key={event.id} event={event} locale={locale} onOpen={() => openEvent(event)} onDelete={!event.readonly ? () => { removeMultisportEvent(event.id); refresh(); } : undefined} />)}</section>; })}</div> : null}

      {view === "month" ? <MonthGrid cursor={cursor} events={filteredEvents} locale={locale} onSelectDay={(day) => { setCursor(day); setView("today"); }} /> : null}

      {view === "invitations" ? <div style={{ marginTop: 10 }}>{pending.length ? pending.map((event) => <div key={event.id} style={{ borderRadius: 18, border: `1px solid ${(event.accent || accent)}55`, background: `linear-gradient(145deg,${event.accent || accent}10,rgba(5,8,14,.98))`, padding: 12, marginBottom: 8 }}><EventCard event={event} locale={locale} onOpen={() => undefined} /><div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 7, marginTop: 9 }}><button type="button" className="msa-action" onClick={() => { respondToAgendaInvitation(event.id, "confirmed"); refresh(); }}>{t("ACCEPTER", "ACCEPT", "ACEPTAR")}</button><button type="button" onClick={() => { respondToAgendaInvitation(event.id, "declined"); refresh(); }} style={{ minHeight: 42, borderRadius: 12, border: "1px solid rgba(255,255,255,.1)", background: "rgba(255,255,255,.04)", color: "rgba(255,255,255,.72)", fontWeight: 1000 }}>{t("REFUSER", "DECLINE", "RECHAZAR")}</button></div></div>) : <EmptyState text={t("Aucune invitation en attente.", "No pending invitations.", "No hay invitaciones pendientes.")} />}</div> : null}

      {createOpen ? <CreateEventDialog accent={accent} lang={String(lang || "fr")} onClose={() => setCreateOpen(false)} onCreated={() => { setCreateOpen(false); refresh(); }} /> : null}
    </div>
  );
}

function formatAgendaMinutes(minutes: number) {
  if (!minutes) return "0 min";
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours}h${String(rest).padStart(2, "0")}` : `${hours}h`;
}

function eventTypeLabel(type: MultisportEventType) {
  if (type === "workout") return "SÉANCE";
  if (type === "training") return "ENTRAÎNEMENT";
  if (type === "match") return "MATCH";
  if (type === "game") return "PARTIE";
  if (type === "outing") return "SORTIE";
  if (type === "race") return "COURSE";
  if (type === "tournament") return "TOURNOI";
  if (type === "recovery") return "RÉCUP";
  if (type === "club") return "CLUB";
  return "ACTIVITÉ";
}

function AgendaMetric({ label, value, accent }: { label: string; value: string; accent: string }) {
  return <div style={{ minWidth: 0, borderRadius: 13, border: "1px solid rgba(255,255,255,.065)", background: "rgba(255,255,255,.022)", padding: "8px 7px", textAlign: "center" }}><div style={{ color: "rgba(255,255,255,.42)", fontSize: 6.7, fontWeight: 1000, letterSpacing: .65 }}>{label}</div><div style={{ marginTop: 3, color: accent, fontSize: 13, fontWeight: 1000, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{value}</div></div>;
}

function chipStyle(active: boolean, accent: string): React.CSSProperties { return { flex: "0 0 auto", minHeight: 34, borderRadius: 999, border: `1px solid ${active ? accent + "77" : "rgba(255,255,255,.07)"}`, background: active ? `${accent}18` : "rgba(255,255,255,.025)", color: active ? accent : "rgba(255,255,255,.62)", padding: "0 10px", fontSize: 8, fontWeight: 1000, whiteSpace: "nowrap", cursor: "pointer" }; }

function EventCard({ event, locale, onOpen, onDelete }: { event: MultisportAgendaEvent; locale: string; onOpen: () => void; onDelete?: () => void }) {
  const meta = multisportSportMeta(event.sport); const hot = event.accent || meta.accent;
  return <div className="msa-event" role={event.route ? "button" : undefined} tabIndex={event.route ? 0 : undefined} onClick={event.route ? onOpen : undefined} onKeyDown={(e) => { if (event.route && (e.key === "Enter" || e.key === " ")) onOpen(); }} style={{ borderColor: `${hot}38` }}>
    <div style={{ width: 42, height: 42, borderRadius: 13, display: "grid", placeItems: "center", fontSize: 20, background: `${hot}13`, border: `1px solid ${hot}40` }}>{meta.icon}</div>
    <div style={{ minWidth: 0 }}><div style={{ color: hot, fontSize: 8, fontWeight: 1000, letterSpacing: .7 }}>{meta.label} · {eventTypeLabel(event.type)}{event.discipline ? ` · ${String(event.discipline).toUpperCase()}` : ""}</div><div style={{ marginTop: 2, fontSize: 11.5, fontWeight: 1000, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{event.title}</div><div style={{ marginTop: 3, fontSize: 8.3, color: "rgba(255,255,255,.56)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{event.organizer || event.club ? `${event.organizer || event.club} · ` : ""}{event.location || event.notes || sourceLabel(event.source)}</div></div>
    <div className="msa-event-time" style={{ textAlign: "right", whiteSpace: "nowrap" }}><strong style={{ color: "#fff", fontSize: 11 }}>{formatTime(event.startAt, locale)}</strong>{event.durationMin ? <div style={{ marginTop: 2, color: hot, fontSize: 8, fontWeight: 900 }}>{event.durationMin} min</div> : null}{onDelete ? <button type="button" aria-label="Supprimer" onClick={(e) => { e.stopPropagation(); onDelete(); }} style={{ marginTop: 4, border: 0, background: "transparent", color: "rgba(255,255,255,.35)", fontSize: 12, cursor: "pointer" }}>×</button> : null}</div>
  </div>;
}

function sourceLabel(source: MultisportAgendaEvent["source"]) { if (source === "fit_program") return "Programme FIT PERF"; if (source === "multisport_program") return "Plan MULTISPORTS"; if (source === "running_program") return "Programme RUNNING PERF"; if (source === "running_race") return "Course"; if (source === "club") return "Club"; if (source === "team") return "Équipe"; if (source === "friend") return "Invitation"; return "Personnel"; }
function EmptyState({ text }: { text: string }) { return <div style={{ borderRadius: 18, border: "1px dashed rgba(255,255,255,.12)", background: "rgba(255,255,255,.02)", padding: "28px 18px", textAlign: "center", color: "rgba(255,255,255,.5)", fontSize: 10, lineHeight: 1.5 }}>{text}</div>; }

function MonthGrid({ cursor, events, locale, onSelectDay }: { cursor: number; events: MultisportAgendaEvent[]; locale: string; onSelectDay: (day: number) => void }) {
  const monthStart = localMonthStart(cursor); const first = new Date(monthStart); const mondayIndex = (first.getDay() + 6) % 7; const gridStart = monthStart - mondayIndex * DAY;
  const weekdays = Array.from({ length: 7 }, (_, i) => formatDate(gridStart + i * DAY, locale, { weekday: "narrow" }));
  return <div style={{ marginTop: 10 }}><div className="msa-month" style={{ marginBottom: 5 }}>{weekdays.map((d, i) => <div key={i} style={{ textAlign: "center", color: "rgba(255,255,255,.42)", fontSize: 8, fontWeight: 1000 }}>{d}</div>)}</div><div className="msa-month">{Array.from({ length: 42 }, (_, i) => { const day = gridStart + i * DAY; const d = new Date(day); const currentMonth = d.getMonth() === first.getMonth(); const rows = events.filter((event) => sameLocalDay(event.startAt, day)); return <button type="button" key={day} className={`msa-month-cell${currentMonth ? "" : " off"}`} onClick={() => onSelectDay(day)} style={{ color: "#fff", textAlign: "left", cursor: "pointer" }}><strong style={{ fontSize: 9 }}>{d.getDate()}</strong><div style={{ marginTop: 5, display: "flex", flexWrap: "wrap", gap: 1 }}>{rows.slice(0, 8).map((event) => <span key={event.id} className="msa-dot" title={event.title} style={{ background: event.accent || multisportSportMeta(event.sport).accent }} />)}</div></button>; })}</div></div>;
}

function CreateEventDialog({ accent, lang, onClose, onCreated }: { accent: string; lang: string; onClose: () => void; onCreated: () => void }) {
  const t = (fr: string, en: string, es: string) => pickLegacyLocalizedText(lang, fr, en, es);
  const tomorrow = Date.now() + DAY;
  const [title, setTitle] = React.useState("");
  const [sport, setSport] = React.useState<MultisportEventSport>("fit");
  const [eventType, setEventType] = React.useState<MultisportEventType>("workout");
  const [date, setDate] = React.useState(toDateInput(tomorrow));
  const [time, setTime] = React.useState("18:00");
  const [duration, setDuration] = React.useState("60");
  const [location, setLocation] = React.useState("");
  const [kind, setKind] = React.useState<"personal" | "club" | "invite">("personal");
  const [organizer, setOrganizer] = React.useState("");
  const [participants, setParticipants] = React.useState("");
  const [notes, setNotes] = React.useState("");

  const selectSport = (next: MultisportEventSport) => {
    setSport(next);
    if (next === "fit") setEventType("workout");
    else if (next === "running") setEventType("outing");
    else if (next === "foot") setEventType("match");
    else if (["darts", "babyfoot", "pingpong", "petanque", "molkky", "dicegame", "esports"].includes(next)) setEventType("game");
    else setEventType("other");
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    const people = participants.split(",").map((item) => item.trim()).filter(Boolean).slice(0, 30);
    createMultisportEvent({
      title: title.trim(),
      sport,
      type: eventType,
      source: kind === "club" ? "club" : kind === "invite" ? "friend" : "manual",
      startAt: inputToTimestamp(date, time),
      durationMin: Math.max(0, Number(duration) || 0) || undefined,
      location: location.trim() || undefined,
      organizer: kind === "invite" ? organizer.trim() || undefined : undefined,
      club: kind === "club" ? organizer.trim() || undefined : undefined,
      participants: people.length ? people : undefined,
      notes: notes.trim() || undefined,
      status: kind === "invite" ? "pending" : "confirmed",
      accent: multisportSportMeta(sport).accent,
      route: sport !== "other" ? "games" : undefined,
      routeParams: sport === "fit" ? { fitTemplateId: "free", fitSessionTitle: title.trim() } : undefined,
    });
    onCreated();
  };

  const input: React.CSSProperties = { width: "100%", minHeight: 44, boxSizing: "border-box", borderRadius: 12, border: "1px solid rgba(255,255,255,.1)", background: "rgba(0,0,0,.34)", color: "#fff", padding: "0 11px", fontSize: 16 };
  const label: React.CSSProperties = { color: "rgba(255,255,255,.46)", fontSize: 7, fontWeight: 1000, letterSpacing: .7, marginBottom: -3 };
  return <div role="dialog" aria-modal="true" onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 150, background: "rgba(0,0,0,.72)", backdropFilter: "blur(8px)", display: "grid", placeItems: "center", padding: 12 }}>
    <form onSubmit={submit} onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 520, maxHeight: "88vh", overflowY: "auto", borderRadius: 22, border: "1px solid rgba(255,255,255,.11)", background: "linear-gradient(180deg,#0b1019,#060910)", padding: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div><div style={{ color: accent, fontSize: 8, fontWeight: 1000, letterSpacing: 1 }}>AGENDA MULTISPORTS</div><div style={{ fontSize: 19, fontWeight: 1000 }}>{t("Ajouter une activité", "Add an activity", "Añadir una actividad")}</div></div>
        <button type="button" onClick={onClose} style={{ width: 38, height: 38, borderRadius: 11, border: "1px solid rgba(255,255,255,.1)", background: "rgba(255,255,255,.04)", color: "#fff" }}>×</button>
      </div>
      <div style={{ display: "grid", gap: 9, marginTop: 12 }}>
        <div style={label}>{t("ACTIVITÉ", "ACTIVITY", "ACTIVIDAD")}</div>
        <input style={input} value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t("Ex. Match de foot, PULL, pétanque…", "E.g. football match, PULL, pétanque…", "Ej. partido, PULL, petanca…")} autoFocus/>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <label><div style={label}>{t("SPORT", "SPORT", "DEPORTE")}</div><select style={{ ...input, marginTop: 5 }} value={sport} onChange={(e) => selectSport(e.target.value as MultisportEventSport)}>{SPORT_OPTIONS.map((id) => <option key={id} value={id}>{multisportSportMeta(id).icon} {multisportSportMeta(id).label}</option>)}</select></label>
          <label><div style={label}>{t("TYPE", "TYPE", "TIPO")}</div><select style={{ ...input, marginTop: 5 }} value={eventType} onChange={(e) => setEventType(e.target.value as MultisportEventType)}><option value="workout">{t("Séance", "Workout", "Sesión")}</option><option value="training">{t("Entraînement", "Training", "Entrenamiento")}</option><option value="match">{t("Match", "Match", "Partido")}</option><option value="game">{t("Partie", "Game", "Partida")}</option><option value="outing">{t("Sortie", "Outing", "Salida")}</option><option value="race">{t("Course / épreuve", "Race", "Carrera")}</option><option value="tournament">{t("Tournoi", "Tournament", "Torneo")}</option><option value="recovery">{t("Récupération", "Recovery", "Recuperación")}</option><option value="club">Club</option><option value="other">{t("Autre", "Other", "Otro")}</option></select></label>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}><label><div style={label}>{t("DATE", "DATE", "FECHA")}</div><input style={{ ...input, marginTop: 5 }} type="date" value={date} onChange={(e) => setDate(e.target.value)}/></label><label><div style={label}>{t("HEURE", "TIME", "HORA")}</div><input style={{ ...input, marginTop: 5 }} type="time" value={time} onChange={(e) => setTime(e.target.value)}/></label></div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}><label><div style={label}>{t("DURÉE", "DURATION", "DURACIÓN")}</div><input style={{ ...input, marginTop: 5 }} inputMode="numeric" value={duration} onChange={(e) => setDuration(e.target.value)} placeholder="60 min"/></label><label><div style={label}>{t("ORIGINE", "SOURCE", "ORIGEN")}</div><select style={{ ...input, marginTop: 5 }} value={kind} onChange={(e) => setKind(e.target.value as any)}><option value="personal">{t("Personnel", "Personal", "Personal")}</option><option value="club">{t("Club / équipe", "Club / team", "Club / equipo")}</option><option value="invite">{t("Invitation reçue", "Received invitation", "Invitación recibida")}</option></select></label></div>
        {kind !== "personal" ? <><div style={label}>{kind === "club" ? t("CLUB / ÉQUIPE", "CLUB / TEAM", "CLUB / EQUIPO") : t("INVITÉ PAR", "INVITED BY", "INVITADO POR")}</div><input style={input} value={organizer} onChange={(e) => setOrganizer(e.target.value)} placeholder={kind === "club" ? t("Nom du club / équipe", "Club / team name", "Club / equipo") : t("Nom de l'ami / organisateur", "Friend / organizer", "Amigo / organizador")}/></> : null}
        <div style={label}>{t("LIEU", "LOCATION", "LUGAR")}</div><input style={input} value={location} onChange={(e) => setLocation(e.target.value)} placeholder={t("Lieu (facultatif)", "Location (optional)", "Lugar (opcional)")}/>
        <div style={label}>{t("PARTICIPANTS", "PARTICIPANTS", "PARTICIPANTES")}</div><input style={input} value={participants} onChange={(e) => setParticipants(e.target.value)} placeholder={t("Paul, Marc, équipe A…", "Paul, Marc, team A…", "Paul, Marc, equipo A…")}/>
        <div style={label}>{t("NOTES", "NOTES", "NOTAS")}</div><textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={t("Consignes, rendez-vous, objectif…", "Instructions, meetup, goal…", "Indicaciones, cita, objetivo…")} style={{ ...input, minHeight: 74, resize: "vertical", paddingTop: 10, fontFamily: "inherit" }}/>
        <button type="submit" style={{ minHeight: 48, borderRadius: 13, border: `1px solid ${accent}`, background: `linear-gradient(135deg,${accent},#fff1bd)`, color: "#0a0d12", fontWeight: 1000 }}>{kind === "invite" ? t("AJOUTER COMME INVITATION", "ADD AS INVITATION", "AÑADIR COMO INVITACIÓN") : t("AJOUTER À L'AGENDA", "ADD TO AGENDA", "AÑADIR A LA AGENDA")}</button>
      </div>
    </form>
  </div>;
}
