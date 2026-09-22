import React from "react";
import BackDot from "../../components/BackDot";
import PlusDot from "../../components/PlusDot";
import PlayerPagedSelector from "../../components/PlayerPagedSelector";
import { useTheme } from "../../contexts/ThemeContext";
import { useLang } from "../../contexts/LangContext";
import { pickLegacyLocalizedText } from "../../i18n/legacyLocalizedText";
import { loadStore } from "../../lib/storage";
import { listFriends, type OnlineFriendUser } from "../../lib/friendsApi";
import { DARTS_GAMES, type DartsGameDef } from "../../games/dartsGameRegistry";
import { filterDartsGamesForCurrentRuntime } from "../../config/androidStoreV1";
import { appSportMeta, enabledAppSports, type AppSportId } from "../../config/sportCatalog";
import { AGENDA_SPORT_ASSETS } from "./agendaSportAssets";
import agendaTickerFr from "../../assets/tickers/ticker_agenda_fr.webp";
import agendaTickerEn from "../../assets/tickers/ticker_agenda_en.webp";
import {
  collectMultisportAgendaEvents,
  createMultisportEvent,
  downloadMultisportAgendaIcs,
  hydrateMultisportAgendaPersistence,
  flushMultisportAgendaPersistence,
  localDayStart,
  localMonthStart,
  localWeekStart,
  multisportSportMeta,
  removeMultisportEvent,
  respondToAgendaInvitation,
  updateMultisportEvent,
  type MultisportAgendaEvent,
  type MultisportEventSport,
  type MultisportEventType,
} from "../../planning/multisportAgenda";
import {
  createOrganizationEvent,
  deleteOrganizationEvent,
  listOrganizationEvents,
  updateOrganizationEvent,
  type OrganizationEventType,
  type OrganizationLocalEvent,
  type OrganizationLocalGroup,
} from "../../organizations/organizationService";

type Props = { go: (route: any, params?: any) => void; params?: any };
type OrganizationAgendaContext = {
  organizationId: string;
  organizationName: string;
  userId: string;
  sports?: string[];
  groups?: OrganizationLocalGroup[];
};
type AgendaCreateInput = Omit<MultisportAgendaEvent, "id" | "createdAt">;
type View = "today" | "week" | "month" | "invitations";
type AgendaPerson = { id: string; name: string; avatar?: string | null; source: "local" | "friend"; profile: any };
type SportTypeOption = { value: MultisportEventType; fr: string; en: string; es: string };
type AgendaCreateDraft = {
  title?: string;
  sport?: MultisportEventSport;
  eventType?: MultisportEventType;
  durationMin?: number;
  discipline?: string;
  route?: string;
  routeParams?: Record<string, unknown>;
};
const DAY = 86_400_000;

const DARTS_TICKERS = import.meta.glob("../../assets/tickers/*.png", { eager: true, import: "default" }) as Record<string, string>;

function sameLocalDay(a: number, b: number) { return localDayStart(a) === localDayStart(b); }
function formatTime(ts: number, locale: string) { return new Date(ts).toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" }); }
function formatDate(ts: number, locale: string, opts: Intl.DateTimeFormatOptions = { weekday: "short", day: "numeric", month: "short" }) { return new Date(ts).toLocaleDateString(locale, opts); }
function toDateInput(ts: number) { const d = new Date(ts); const pad = (n: number) => String(n).padStart(2, "0"); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }
function inputToTimestamp(dateValue: string, timeValue: string) {
  const [y, m, d] = dateValue.split("-").map(Number); const [hh, mm] = timeValue.split(":").map(Number);
  const date = new Date(); date.setFullYear(y || date.getFullYear(), Math.max(0, (m || 1) - 1), d || 1); date.setHours(hh || 0, mm || 0, 0, 0); return date.getTime();
}

function enabledAgendaSports() {
  return enabledAppSports();
}

function tickerForDartsMode(id: string) {
  const raw = String(id || "").trim().toLowerCase();
  const requested = raw === "killer_progressive" ? "killer" : raw;
  const aliases: Record<string, string[]> = {
    training_x01: ["training_x01", "x01"],
    tour_horloge: ["tour_horloge", "training_clock", "clock"],
    training_doubleio: ["training_doubleio", "doubleio"],
    training_challenges: ["training_challenges", "challenges"],
    training_super_bull: ["training_super_bull", "super_bull"],
  };
  const seeds = aliases[requested] || [requested, requested.replace(/^training_/, "")];
  const variants = Array.from(new Set(seeds.flatMap((seed) => [seed, seed.replace(/-/g, "_"), seed.replace(/_/g, "-")])));
  for (const candidate of variants) {
    const endings = [`/ticker_${candidate}.png`, `/ticker-${candidate}.png`];
    const found = Object.keys(DARTS_TICKERS).find((key) => endings.some((ending) => key.toLowerCase().endsWith(ending)));
    if (found) return DARTS_TICKERS[found];
  }
  return null;
}

function sportTypeOptions(sport: MultisportEventSport): SportTypeOption[] {
  if (sport === "fit") return [
    { value: "workout", fr: "Séance", en: "Workout", es: "Sesión" },
    { value: "training", fr: "Entraînement", en: "Training", es: "Entrenamiento" },
    { value: "challenge", fr: "Défi", en: "Challenge", es: "Desafío" },
    { value: "recovery", fr: "Récupération", en: "Recovery", es: "Recuperación" },
    { value: "leisure", fr: "Loisirs", en: "Leisure", es: "Ocio" },
  ];
  if (sport === "running") return [
    { value: "outing", fr: "Sortie", en: "Outing", es: "Salida" },
    { value: "training", fr: "Entraînement", en: "Training", es: "Entrenamiento" },
    { value: "race", fr: "Course / épreuve", en: "Race / event", es: "Carrera / prueba" },
    { value: "recovery", fr: "Récupération", en: "Recovery", es: "Recuperación" },
    { value: "club", fr: "Club", en: "Club", es: "Club" },
  ];
  if (sport === "darts") return [
    { value: "match", fr: "Match", en: "Match", es: "Partido" },
    { value: "training", fr: "Training", en: "Training", es: "Entrenamiento" },
    { value: "tournament", fr: "Tournoi", en: "Tournament", es: "Torneo" },
    { value: "league", fr: "Ligue", en: "League", es: "Liga" },
    { value: "leisure", fr: "Loisirs", en: "Leisure", es: "Ocio" },
  ];
  if (["foot", "babyfoot", "pingpong", "badminton", "basket", "padel", "pickleball", "rugby", "tennis", "volley"].includes(String(sport))) return [
    { value: "match", fr: "Match", en: "Match", es: "Partido" },
    { value: "training", fr: "Entraînement", en: "Training", es: "Entrenamiento" },
    { value: "tournament", fr: "Tournoi", en: "Tournament", es: "Torneo" },
    { value: "league", fr: "Ligue / championnat", en: "League / championship", es: "Liga / campeonato" },
    { value: "leisure", fr: "Loisirs", en: "Leisure", es: "Ocio" },
  ];
  if (sport === "archery") return [
    { value: "training", fr: "Entraînement", en: "Training", es: "Entrenamiento" },
    { value: "match", fr: "Compétition", en: "Competition", es: "Competición" },
    { value: "tournament", fr: "Tournoi", en: "Tournament", es: "Torneo" },
    { value: "club", fr: "Club", en: "Club", es: "Club" },
    { value: "leisure", fr: "Loisirs", en: "Leisure", es: "Ocio" },
  ];
  if (sport === "esports") return [
    { value: "match", fr: "Match", en: "Match", es: "Partido" },
    { value: "training", fr: "Training / scrim", en: "Training / scrim", es: "Entrenamiento / scrim" },
    { value: "tournament", fr: "Tournoi", en: "Tournament", es: "Torneo" },
    { value: "league", fr: "Ligue", en: "League", es: "Liga" },
    { value: "leisure", fr: "Loisirs", en: "Leisure", es: "Ocio" },
  ];
  return [
    { value: "game", fr: "Partie", en: "Game", es: "Partida" },
    { value: "training", fr: "Entraînement", en: "Training", es: "Entrenamiento" },
    { value: "tournament", fr: "Tournoi", en: "Tournament", es: "Torneo" },
    { value: "league", fr: "Ligue / compétition", en: "League / competition", es: "Liga / competición" },
    { value: "leisure", fr: "Loisirs", en: "Leisure", es: "Ocio" },
  ];
}

function defaultTypeForSport(sport: MultisportEventSport): MultisportEventType {
  return sportTypeOptions(sport)[0]?.value || "other";
}

function normalizeOrganizationSportId(value: string): MultisportEventSport | null {
  const raw = String(value || "").trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const aliases: Record<string, MultisportEventSport> = {
    darts: "darts", flechettes: "darts", "flechettes scoring": "darts",
    babyfoot: "babyfoot", "baby-foot": "babyfoot",
    pingpong: "pingpong", "ping-pong": "pingpong",
    petanque: "petanque", molkky: "molkky", running: "running",
    fit: "fit", "fit perf": "fit", football: "foot", foot: "foot",
    badminton: "badminton", basket: "basket", basketball: "basket",
    padel: "padel", pickleball: "pickleball", rugby: "rugby", tennis: "tennis",
    volley: "volley", volleyball: "volley", archery: "archery", tiralarc: "archery",
    esports: "esports", esport: "esports",
  };
  const compact = raw.replace(/[^a-z0-9-]/g, "");
  return aliases[raw] || aliases[compact] || (enabledAppSports().some((entry) => entry.id === raw) ? raw as MultisportEventSport : null);
}

function organizationEventTypeToAgenda(value: OrganizationEventType): MultisportEventType {
  if (value === "training") return "training";
  if (value === "match") return "match";
  if (value === "tournament") return "tournament";
  if (value === "meeting") return "club";
  return "other";
}

function agendaTypeToOrganization(value: MultisportEventType): OrganizationEventType {
  if (value === "training" || value === "workout" || value === "recovery" || value === "outing") return "training";
  if (value === "match" || value === "game" || value === "race") return "match";
  if (value === "tournament" || value === "league" || value === "challenge") return "tournament";
  if (value === "club") return "meeting";
  return "event";
}

function mapOrganizationAgendaEvent(event: OrganizationLocalEvent, context: OrganizationAgendaContext): MultisportAgendaEvent {
  const groups = context.groups || [];
  const group = groups.find((item) => item.id === event.groupId);
  const orgSports = context.sports || [];
  const sport = normalizeOrganizationSportId(group?.sportId || "")
    || orgSports.map(normalizeOrganizationSportId).find(Boolean)
    || "other";
  const startAt = new Date(event.startsAt).getTime();
  const endAt = event.endsAt ? new Date(event.endsAt).getTime() : NaN;
  const durationMin = Number.isFinite(endAt) && endAt > startAt ? Math.max(15, Math.round((endAt - startAt) / 60000)) : 60;
  return {
    id: `organization:${event.id}`,
    sourceId: event.id,
    title: event.title,
    sport: sport as MultisportEventSport,
    discipline: group?.name || undefined,
    type: organizationEventTypeToAgenda(event.eventType),
    source: "club",
    startAt,
    durationMin,
    location: event.location || undefined,
    organizer: context.organizationName,
    club: context.organizationName,
    status: "confirmed",
    accent: multisportSportMeta(sport as MultisportEventSport).accent,
    routeParams: {
      organizationId: context.organizationId,
      organizationEventId: event.id,
      organizationGroupId: event.groupId || "",
      organizationEventType: event.eventType,
    },
    createdAt: event.createdAt ? new Date(event.createdAt).getTime() : undefined,
  };
}

export default function MultisportAgendaPage({ go, params }: Props) {
  const { theme } = useTheme();
  const { lang } = useLang() as any;
  const locale = String(lang || "fr").startsWith("fr") ? "fr-FR" : String(lang || "").startsWith("es") ? "es-ES" : "en-GB";
  const t = (fr: string, en: string, es: string) => pickLegacyLocalizedText(String(lang || "fr"), fr, en, es);
  // Ticker header: French only when the app is explicitly in French.
  // English is the fallback for every other language, as requested.
  const agendaHeaderTicker = String(lang || "").toLowerCase().startsWith("fr") ? agendaTickerFr : agendaTickerEn;
  const agendaHeaderAlt = String(lang || "").toLowerCase().startsWith("fr") ? "Agenda" : "Schedule";
  const accent = (theme as any)?.primary || (theme as any)?.accent || "#f6c256";
  const textSoft = (theme as any)?.textSoft || "#9ca3af";
  const organizationAgenda = (params?.organizationAgenda || null) as OrganizationAgendaContext | null;
  const isOrganizationAgenda = Boolean(organizationAgenda?.organizationId && organizationAgenda?.userId);
  const [events, setEvents] = React.useState<MultisportAgendaEvent[]>(() => isOrganizationAgenda ? [] : collectMultisportAgendaEvents());
  const [view, setView] = React.useState<View>(() => (["today", "week", "month", "invitations"].includes(String(params?.agendaView)) ? params.agendaView : "week"));
  const [cursor, setCursor] = React.useState(() => Date.now());
  const [createOpen, setCreateOpen] = React.useState(() => Boolean(params?.agendaCreate));
  const [sportFilter, setSportFilter] = React.useState<MultisportEventSport | "all">("all");
  const [selectedEvent, setSelectedEvent] = React.useState<MultisportAgendaEvent | null>(null);
  const availableSports = React.useMemo(() => {
    const all = enabledAgendaSports();
    if (!organizationAgenda?.sports?.length || organizationAgenda.sports.some((value) => String(value).toLowerCase() === "multisport")) return all;
    const allowed = new Set(organizationAgenda.sports.map(normalizeOrganizationSportId).filter(Boolean));
    const filtered = all.filter((entry) => allowed.has(entry.id));
    return filtered.length ? filtered : all;
  }, [organizationAgenda?.sports]);

  const refresh = React.useCallback(() => {
    if (isOrganizationAgenda && organizationAgenda) {
      void listOrganizationEvents(organizationAgenda.userId, organizationAgenda.organizationId)
        .then(({ events: organizationEvents }) => setEvents(organizationEvents.map((event) => mapOrganizationAgendaEvent(event, organizationAgenda))))
        .catch(() => setEvents([]));
      return;
    }
    setEvents(collectMultisportAgendaEvents());
  }, [isOrganizationAgenda, organizationAgenda?.organizationId, organizationAgenda?.userId, organizationAgenda?.organizationName, organizationAgenda?.groups, organizationAgenda?.sports]);
  React.useEffect(() => {
    let alive = true;
    if (isOrganizationAgenda) { refresh(); }
    else void hydrateMultisportAgendaPersistence().then(() => { if (alive) refresh(); });
    const onStorage = (event: StorageEvent) => { if (!event.key || event.key.startsWith("mss-multisport-agenda") || event.key.startsWith("msc_organizations_v1")) refresh(); };
    if (!isOrganizationAgenda) window.addEventListener("dc:multisport-agenda-changed", refresh as EventListener);
    window.addEventListener("focus", refresh);
    window.addEventListener("storage", onStorage);
    return () => { alive = false; if (!isOrganizationAgenda) window.removeEventListener("dc:multisport-agenda-changed", refresh as EventListener); window.removeEventListener("focus", refresh); window.removeEventListener("storage", onStorage); };
  }, [refresh, isOrganizationAgenda]);

  const removeAgendaEvent = React.useCallback((event: MultisportAgendaEvent) => {
    if (isOrganizationAgenda && organizationAgenda && event.sourceId) {
      void deleteOrganizationEvent(organizationAgenda.userId, organizationAgenda.organizationId, event.sourceId).then(refresh);
      return;
    }
    removeMultisportEvent(event.id);
    refresh();
  }, [isOrganizationAgenda, organizationAgenda?.organizationId, organizationAgenda?.userId, refresh]);

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
  const conflictIds = React.useMemo(() => {
    const ids = new Set<string>();
    const active = filteredEvents.filter((event) => event.status !== "declined" && event.status !== "cancelled");
    for (let i = 0; i < active.length; i += 1) {
      const a = active[i]; const aEnd = a.startAt + Math.max(15, a.durationMin || 60) * 60_000;
      for (let j = i + 1; j < active.length; j += 1) {
        const b = active[j]; if (!sameLocalDay(a.startAt, b.startAt)) continue;
        const bEnd = b.startAt + Math.max(15, b.durationMin || 60) * 60_000;
        if (a.startAt < bEnd && b.startAt < aEnd) { ids.add(a.id); ids.add(b.id); }
      }
    }
    return ids;
  }, [filteredEvents]);

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
    <div className="container msc-agenda-page" style={{ maxWidth: 700, paddingBottom: 100 }}>
      <style>{`
        .msa-top{border:1px solid rgba(255,255,255,.09);border-radius:24px;padding:14px;background:radial-gradient(circle at 15% 0%,${accent}18,transparent 38%),linear-gradient(180deg,rgba(11,15,23,.985),rgba(5,8,14,.99));box-shadow:0 18px 45px rgba(0,0,0,.4)}
        .msa-tabs{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:5px;margin-top:12px;padding:4px;border-radius:15px;background:rgba(0,0,0,.28);border:1px solid rgba(255,255,255,.06)}
        .msa-tab{height:42px;border:1px solid transparent;border-radius:11px;background:transparent;color:rgba(255,255,255,.58);font-size:8px;font-weight:1000;text-transform:uppercase;cursor:pointer;min-width:0}.msa-tab.on{color:${accent};border-color:${accent}55;background:${accent}16}
        .msa-event{width:100%;text-align:left;border-radius:17px;border:1px solid rgba(255,255,255,.08);background:linear-gradient(145deg,rgba(255,255,255,.045),rgba(5,8,14,.96));padding:10px;display:grid;grid-template-columns:42px minmax(0,1fr) auto;gap:10px;align-items:center;color:#fff;cursor:pointer;min-width:0;position:relative;overflow:hidden;isolation:isolate}.msa-event>*{position:relative;z-index:2}.msa-event+.msa-event{margin-top:7px}.msa-event.conflict{border-color:rgba(255,117,117,.55)!important;background:linear-gradient(145deg,rgba(255,90,90,.07),rgba(5,8,14,.97))}
        .msa-day{border-radius:18px;border:1px solid rgba(255,255,255,.07);background:rgba(255,255,255,.025);padding:9px}.msa-day.today{border-color:${accent}55;background:${accent}0c}.msa-day.past{opacity:.88}.msa-week{display:grid;gap:8px}
        .msa-month{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:5px}.msa-month-cell{min-height:70px;border-radius:12px;border:1px solid rgba(255,255,255,.065);background:rgba(255,255,255,.025);padding:5px;overflow:hidden}.msa-month-cell.off{opacity:.28}.msa-month-icons{display:flex;flex-wrap:wrap;gap:2px;margin-top:5px}
        .msa-action{min-height:42px;border-radius:12px;border:1px solid ${accent}55;background:${accent}15;color:${accent};font-weight:1000;cursor:pointer}.msa-muted{color:${textSoft}}
        .msa-sport-filter{display:flex;gap:7px;overflow-x:auto;padding:9px 0 5px;scrollbar-width:none}.msa-sport-filter::-webkit-scrollbar{display:none}
        .msa-sport-icon-btn{flex:0 0 auto;width:42px;height:42px;border-radius:14px;padding:5px;display:grid;place-items:center;cursor:pointer;transition:.15s transform}.msa-sport-icon-btn:active{transform:scale(.94)}
        .msa-sport-select{width:100%;min-height:48px;border-radius:12px;padding:5px 8px;display:flex;align-items:center;gap:9px;cursor:pointer;background:rgba(0,0,0,.34);overflow:hidden;text-align:left}.msa-sport-select-preview{flex:0 0 118px;width:118px;max-width:38%;aspect-ratio:10/3;object-fit:contain;display:block;border-radius:7px;background:#030509}.msa-sport-select-label{min-width:0;flex:1;color:#fff;font-size:14px;font-weight:900;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.msa-sport-select-chevron{flex:0 0 auto;color:rgba(255,255,255,.76);font-size:14px;font-weight:1000}
        .msa-banner-choice{position:relative;width:100%;height:52px;border-radius:9px;overflow:hidden;padding:3px;cursor:pointer;background:#030509;display:grid;place-items:center}.msa-banner-choice img{width:100%;height:100%;object-fit:contain;display:block}.msa-banner-choice.on:after{content:"✓";position:absolute;right:5px;top:5px;width:19px;height:19px;border-radius:999px;display:grid;place-items:center;background:rgba(0,0,0,.82);font-size:10px;font-weight:1000}.msa-sport-picker-panel{max-height:210px;overflow-y:auto;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:5px;padding:6px;border-radius:12px;border:1px solid rgba(255,255,255,.08);background:rgba(0,0,0,.30);scrollbar-width:thin}
        .msa-darts-mode{aspect-ratio:6/1;min-height:0;border-radius:10px;overflow:hidden;position:relative;background:rgba(255,255,255,.025);cursor:pointer;text-align:left}.msa-darts-mode img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:.76}.msa-darts-mode:after{content:"";position:absolute;inset:0;background:linear-gradient(90deg,rgba(3,5,9,.84),rgba(3,5,9,.10),rgba(3,5,9,.65))}
        .msa-side-rail{height:100%;display:flex;flex-direction:column;gap:8px;padding:8px;border-radius:22px;border:1px solid rgba(255,255,255,.08);background:linear-gradient(180deg,rgba(14,18,26,.96),rgba(6,9,14,.98));box-shadow:0 18px 45px rgba(0,0,0,.32);overflow-y:auto;overflow-x:hidden;scrollbar-width:thin}
        .msa-side-rail-sep{height:1px;background:rgba(255,255,255,.08);margin:2px 4px}
        .msa-rail-btn{position:relative;min-height:54px;border-radius:18px;border:1px solid rgba(255,255,255,.09);background:rgba(255,255,255,.03);color:#fff;display:grid;place-items:center;cursor:pointer;font-weight:1000;padding:4px;gap:2px;text-align:center}
        .msa-rail-btn.on{border-color:${accent}66;background:${accent}16;color:${accent};box-shadow:0 0 16px ${accent}22}.msa-rail-btn .ico{font-size:18px;line-height:1}.msa-rail-btn .txt{font-size:8px;line-height:1.05;text-transform:uppercase}.msa-rail-btn .badge{position:absolute;top:-4px;right:-4px;min-width:18px;height:18px;padding:0 4px;border-radius:999px;background:${accent};color:#081018;font-size:10px;font-weight:1000;display:grid;place-items:center}
        .msa-board-shell{height:100%;display:grid;grid-template-columns:minmax(0,1fr) 64px;gap:10px;overflow:hidden;min-height:0}.msa-board-main{height:100%;display:flex;flex-direction:column;gap:10px;min-height:0}.msa-board-topline{display:grid;grid-template-columns:44px minmax(0,1fr) 44px;gap:8px;align-items:center}.msa-board-nav{min-height:42px;border-radius:13px;border:1px solid ${accent}55;background:${accent}15;color:${accent};font-weight:1000;cursor:pointer}.msa-board-title{min-height:42px;border-radius:14px;border:1px solid rgba(255,255,255,.09);background:rgba(60,66,74,.62);backdrop-filter:blur(10px);display:grid;place-items:center;color:#fff;font-weight:1000;text-transform:capitalize;padding:0 10px;text-align:center}.msa-board-meta{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}.msa-board-surface{flex:1;min-height:0;border-radius:22px;border:1px solid rgba(255,255,255,.09);background:linear-gradient(180deg,rgba(72,78,86,.74),rgba(34,38,45,.82));backdrop-filter:blur(8px);padding:10px;overflow:auto;overscroll-behavior:contain;-webkit-overflow-scrolling:touch;scrollbar-width:thin}.msa-sport-rail{height:100%;display:flex;flex-direction:column;gap:8px;padding:8px;border-radius:22px;border:1px solid rgba(255,255,255,.08);background:linear-gradient(180deg,rgba(12,16,24,.94),rgba(6,9,14,.98));overflow-y:auto;overflow-x:hidden;scrollbar-width:thin}.msa-calendar-day{--msa-hour-h:72px;position:relative;min-height:calc(18 * var(--msa-hour-h));height:calc(18 * var(--msa-hour-h));overflow:visible}.msa-day-grid{position:absolute;inset:0;display:grid;grid-template-rows:repeat(18,var(--msa-hour-h));pointer-events:none}.msa-hour-row{display:grid;grid-template-columns:62px minmax(0,1fr);gap:8px;align-items:stretch;min-height:0}.msa-hour-label{border-radius:12px;border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.06);display:grid;place-items:center;color:rgba(255,255,255,.78);font-size:9px;font-weight:900}.msa-hour-slot{border-radius:12px;border:1px solid rgba(255,255,255,.055);background:rgba(10,12,18,.22);position:relative}.msa-day-events-layer{position:absolute;left:70px;right:4px;top:0;bottom:0;pointer-events:none}.msa-day-duration-event{position:absolute;left:0;right:0;z-index:3;border-radius:12px;border:1px solid rgba(255,255,255,.12);padding:6px 9px;display:grid;grid-template-columns:24px minmax(0,1fr) auto;gap:7px;align-items:start;text-align:left;color:#fff;cursor:pointer;overflow:hidden;pointer-events:auto;box-shadow:0 8px 20px rgba(0,0,0,.20);min-height:28px}.msa-day-duration-event .meta{min-width:0}.msa-day-duration-event .time{font-size:8px;font-weight:1000;color:rgba(255,255,255,.80);white-space:nowrap}.msa-day-duration-event .title{margin-top:2px;font-size:9px;line-height:1.14;font-weight:1000;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.msa-day-duration-event .duration{font-size:8px;font-weight:1000;white-space:nowrap;opacity:.9}.msa-week-board{min-height:100%;min-width:700px;display:grid;grid-template-columns:repeat(7,minmax(92px,1fr));gap:6px;overflow:visible}.msa-week-col{min-width:0;display:flex;flex-direction:column;gap:6px;padding:6px;border-radius:16px;border:1px solid rgba(255,255,255,.07);background:rgba(10,12,18,.22);overflow:hidden}.msa-week-col.today{border-color:${accent}88;box-shadow:0 0 0 1px ${accent}22 inset}.msa-week-col.past{opacity:.6}.msa-week-col-head{padding:6px;border-radius:12px;background:rgba(255,255,255,.06);text-align:center;color:#fff;font-size:9px;font-weight:1000;text-transform:uppercase}.msa-week-col-body{display:flex;flex-direction:column;gap:5px;min-height:0;overflow:visible}.msa-event-chip{width:100%;text-align:left;border-radius:12px;border:1px solid rgba(255,255,255,.10);background:linear-gradient(145deg,rgba(255,255,255,.08),rgba(5,8,14,.46));padding:6px;display:grid;grid-template-columns:24px minmax(0,1fr);gap:6px;align-items:center;min-width:0;cursor:pointer;color:#fff}.msa-event-chip .time{font-size:8px;font-weight:1000;color:rgba(255,255,255,.72)}.msa-event-chip .title{font-size:9px;font-weight:1000;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.msa-month{height:100%}.msa-month-cell.today{border-color:${accent}88 !important;box-shadow:0 0 0 1px ${accent}25 inset}.msa-month-cell.past{opacity:.62}
        .msa-agenda-portrait{display:block}.msa-agenda-landscape{display:none}
        html[data-msc-orientation="landscape"] .msa-agenda-portrait{display:none!important}
        html[data-msc-orientation="landscape"] .msa-agenda-landscape{display:block!important}
        @media(max-width:390px){.msa-event{grid-template-columns:38px minmax(0,1fr)}.msa-event-time{grid-column:2}.msa-tab{font-size:6.8px}.msa-month-cell{min-height:58px;padding:4px}.msa-sport-icon-btn{width:39px;height:39px}.msa-sport-select{min-height:44px;padding:4px 7px;gap:7px}.msa-sport-select-preview{flex-basis:104px;width:104px}.msa-sport-select-label{font-size:13px}.msa-banner-choice{height:44px}.msa-sport-picker-panel{max-height:180px;padding:5px;gap:4px}}
      `}</style>

      <div className="msa-agenda-portrait">
      <div className="msc-landscape-page-shell msc-agenda-layout">
      <div className="msc-landscape-header msc-agenda-header" style={{ width: "100%", maxWidth: "none", marginBottom: 10 }}>
        <div style={{ position: "relative", width: "100%", minWidth: 0 }}>
          <img
            src={agendaHeaderTicker}
            alt={agendaHeaderAlt}
            draggable={false}
            style={{ width: "100%", maxWidth: "none", height: "auto", display: "block", filter: `drop-shadow(0 0 14px ${accent}55)` }}
          />
          <div style={{ position: "absolute", left: 6, top: "50%", transform: "translateY(-50%)", zIndex: 5 }}>
            <BackDot onClick={() => go("home")} />
          </div>
        </div>
      </div>

      <section className="msc-landscape-primary msc-agenda-primary">
      <div className="msa-top">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
          <div className="msa-muted" style={{ fontSize: 9.5, lineHeight: 1.35, minWidth: 0 }}>
            {t("Toute ta semaine sportive au même endroit", "Your whole sports week in one place", "Toda tu semana deportiva en un solo lugar")}
          </div>
          <div style={{ display: "flex", gap: 8, flex: "0 0 auto", alignItems: "center" }}>
            <AgendaShareButton accent={accent} title={t("Exporter vers Google / Apple / Outlook (.ics)", "Export to Google / Apple / Outlook (.ics)", "Exportar a Google / Apple / Outlook (.ics)")} onClick={() => { downloadMultisportAgendaIcs(events); }} />
            <PlusDot onClick={() => setCreateOpen(true)} color={accent} title={t("Ajouter une activité", "Add an activity", "Añadir una actividad")} size={42} />
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
        <div className="msa-sport-filter">
          <button type="button" onClick={() => setSportFilter("all")} className="msa-sport-icon-btn" aria-label={t("Tous les sports", "All sports", "Todos los deportes")} title={t("Tous", "All", "Todos")} style={{ border: `1px solid ${sportFilter === "all" ? accent : "rgba(255,255,255,.10)"}`, background: sportFilter === "all" ? `${accent}1b` : "rgba(255,255,255,.025)", color: sportFilter === "all" ? accent : "#fff", fontWeight: 1000, fontSize: 8 }}>{t("TOUS", "ALL", "TODOS")}</button>
          {availableSports.map((entry) => <button key={entry.id} type="button" className="msa-sport-icon-btn" onClick={() => setSportFilter(entry.id)} aria-label={entry.label} title={entry.label} style={{ border: `1px solid ${sportFilter === entry.id ? entry.accent : "rgba(255,255,255,.08)"}`, background: sportFilter === entry.id ? `${entry.accent}18` : "rgba(255,255,255,.022)", boxShadow: sportFilter === entry.id ? `0 0 14px ${entry.accent}28` : "none" }}><TintedSportLogo sport={entry.id} color={entry.accent} size={29}/></button>)}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 6, marginTop: 5 }}>
          <AgendaMetric label={t("ACTIVITÉS", "ACTIVITIES", "ACTIVIDADES")} value={String(visible.length)} accent={accent} />
          <AgendaMetric label={t("SPORTS", "SPORTS", "DEPORTES")} value={String(visibleSports)} accent="#72def4" />
          <AgendaMetric label={t("TEMPS", "TIME", "TIEMPO")} value={formatAgendaMinutes(visibleMinutes)} accent="#75ed9a" />
        </div>
      </> : null}

      </section>

      <aside className="msc-landscape-secondary msc-agenda-secondary">
      {view === "today" ? <div style={{ marginTop: 8 }}>{visible.length ? visible.map((event) => <EventCard key={event.id} event={event} locale={locale} onOpen={() => setSelectedEvent(event)} conflict={conflictIds.has(event.id)} onDelete={!event.readonly ? () => removeAgendaEvent(event) : undefined} />) : <EmptyState text={t("Rien de prévu aujourd'hui. Ajoute une activité ou active un programme.", "Nothing scheduled today. Add an activity or activate a program.", "Nada previsto hoy. Añade una actividad o activa un programa.")} />}</div> : null}

      {view === "week" ? <div className="msa-week" style={{ marginTop: 8 }}>{Array.from({ length: 7 }, (_, i) => range.start + i * DAY).map((day) => ({ day, rows: visible.filter((event) => sameLocalDay(event.startAt, day)).sort((a,b) => a.startAt - b.startAt) })).filter((group) => group.rows.length > 0).map(({ day, rows }) => { const dominant = multisportSportMeta(rows[0].sport); const isPast = day < localDayStart(Date.now()); return <section key={day} className={`msa-day${sameLocalDay(day, Date.now()) ? " today" : ""}${isPast ? " past" : ""}`} style={{ borderColor: `${dominant.accent}38`, background: `linear-gradient(135deg,${dominant.accent}0b,rgba(255,255,255,.018))` }}><div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center", marginBottom: 7 }}><div style={{ display: "flex", alignItems: "center", gap: 7 }}><TintedSportLogo sport={rows[0].sport} color={dominant.accent} size={22}/><strong style={{ fontSize: 10.5, textTransform: "uppercase", color: sameLocalDay(day, Date.now()) ? accent : "#fff" }}>{formatDate(day, locale)}</strong></div><span className="msa-muted" style={{ fontSize: 8 }}>{rows.some((event) => conflictIds.has(event.id)) ? <b style={{ color: "#ff8b8b" }}>⚠ {t("Conflit", "Conflict", "Conflicto")}</b> : `${rows.length} ${t("créneau(x)", "slot(s)", "franja(s)")}`}</span></div>{rows.map((event) => <EventCard key={event.id} event={event} locale={locale} onOpen={() => setSelectedEvent(event)} conflict={conflictIds.has(event.id)} onDelete={!event.readonly ? () => removeAgendaEvent(event) : undefined} />)}</section>; })}{visible.length === 0 ? <EmptyState text={t("Aucun créneau planifié cette semaine.", "No scheduled slots this week.", "No hay franjas planificadas esta semana.")} /> : null}</div> : null}

      {view === "month" ? <MonthGrid cursor={cursor} events={filteredEvents} locale={locale} onSelectDay={(day) => { setCursor(day); setView("today"); }} /> : null}

      {view === "invitations" ? <div style={{ marginTop: 10 }}>{pending.length ? pending.map((event) => <div key={event.id} style={{ borderRadius: 18, border: `1px solid ${(event.accent || accent)}55`, background: `linear-gradient(145deg,${event.accent || accent}10,rgba(5,8,14,.98))`, padding: 12, marginBottom: 8 }}><EventCard event={event} locale={locale} onOpen={() => setSelectedEvent(event)} conflict={conflictIds.has(event.id)} /><div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 7, marginTop: 9 }}><button type="button" className="msa-action" onClick={() => { respondToAgendaInvitation(event.id, "confirmed"); refresh(); }}>{t("ACCEPTER", "ACCEPT", "ACEPTAR")}</button><button type="button" onClick={() => { respondToAgendaInvitation(event.id, "declined"); refresh(); }} style={{ minHeight: 42, borderRadius: 12, border: "1px solid rgba(255,255,255,.1)", background: "rgba(255,255,255,.04)", color: "rgba(255,255,255,.72)", fontWeight: 1000 }}>{t("REFUSER", "DECLINE", "RECHAZAR")}</button></div></div>) : <EmptyState text={t("Aucune invitation en attente.", "No pending invitations.", "No hay invitaciones pendientes.")} />}</div> : null}

      </aside>
      </div>
      </div>

      <div className="msa-agenda-landscape">
      <div className="msc-landscape-page-shell msc-agenda-layout" style={{ ["--msc-landscape-primary-track" as any]: "62px", ["--msc-landscape-secondary-track" as any]: "1fr", ["--msc-landscape-header-height" as any]: "clamp(64px, 12vh, 82px)" }}>
      <div className="msc-landscape-header msc-agenda-header" style={{ width: "100%", maxWidth: "none", marginBottom: 10 }}>
        <div style={{ position: "relative", width: "100%", minWidth: 0 }}>
          <img
            src={agendaHeaderTicker}
            alt={agendaHeaderAlt}
            draggable={false}
            style={{ width: "100%", maxWidth: "none", height: "auto", display: "block", filter: `drop-shadow(0 0 14px ${accent}55)` }}
          />
          <div style={{ position: "absolute", left: 6, top: "50%", transform: "translateY(-50%)", zIndex: 5 }}>
            <BackDot onClick={() => go("home")} />
          </div>
        </div>
      </div>

            <section className="msc-landscape-primary msc-agenda-primary" style={{ display: "flex", flexDirection: "column", minHeight: 0 }}>
        <div className="msa-side-rail">
          <AgendaRailButton icon="＋" label={t("Ajouter", "Add", "Añadir")} onClick={() => setCreateOpen(true)} />
          <AgendaRailButton icon="⇩" label={t("Exporter", "Export", "Exportar")} onClick={() => downloadMultisportAgendaIcs(events)} />
          <div className="msa-side-rail-sep" />
          <AgendaRailButton icon="J" label={t("Jour", "Day", "Día")} active={view === "today"} onClick={() => setView("today")} />
          <AgendaRailButton icon="S" label={t("Semaine", "Week", "Semana")} active={view === "week"} onClick={() => setView("week")} />
          <AgendaRailButton icon="M" label={t("Mois", "Month", "Mes")} active={view === "month"} onClick={() => setView("month")} />
          <AgendaRailButton icon="✉" label={t("Invit.", "Invites", "Invit.")} active={view === "invitations"} badge={pending.length || undefined} onClick={() => setView("invitations")} />
        </div>
      </section>

      <aside className="msc-landscape-secondary msc-agenda-secondary">
        <div className="msa-board-shell">
          <div className="msa-board-main">
            <div className="msa-board-topline">
              <button type="button" className="msa-board-nav" onClick={() => shift(-1)}>‹</button>
              <div className="msa-board-title">{title}</div>
              <button type="button" className="msa-board-nav" onClick={() => shift(1)}>›</button>
            </div>
            <div className="msa-board-meta">
              <AgendaMetric label={t("ACTIVITÉS", "ACTIVITIES", "ACTIVIDADES")} value={String(view === "invitations" ? pending.length : visible.length)} accent={accent} />
              <AgendaMetric label={t("SPORTS", "SPORTS", "DEPORTES")} value={String(view === "invitations" ? new Set(pending.map((event) => event.sport)).size : visibleSports)} accent="#72def4" />
              <AgendaMetric label={t("TEMPS", "TIME", "TIEMPO")} value={formatAgendaMinutes(view === "invitations" ? pending.reduce((sum, event) => sum + Math.max(0, event.durationMin || 0), 0) : visibleMinutes)} accent="#75ed9a" />
            </div>
            <div className="msa-board-surface">
              {view === "today" ? (
                <DayTimelineBoard day={range.start} events={visible.sort((a, b) => a.startAt - b.startAt)} locale={locale} accent={accent} conflictIds={conflictIds} onOpen={(event) => setSelectedEvent(event)} />
              ) : view === "week" ? (
                <WeekPlannerBoard start={range.start} events={visible.sort((a, b) => a.startAt - b.startAt)} locale={locale} accent={accent} conflictIds={conflictIds} onOpen={(event) => setSelectedEvent(event)} />
              ) : view === "month" ? (
                <LandscapeMonthGrid cursor={cursor} events={filteredEvents} locale={locale} onSelectDay={(day) => { setCursor(day); setView("today"); }} />
              ) : (
                <div style={{ height: "100%", overflowY: "auto", paddingRight: 4 }}>
                  {pending.length ? pending.map((event) => <div key={event.id} style={{ borderRadius: 18, border: `1px solid ${(event.accent || accent)}55`, background: `linear-gradient(145deg,${event.accent || accent}10,rgba(5,8,14,.98))`, padding: 12, marginBottom: 8 }}><EventCard event={event} locale={locale} onOpen={() => setSelectedEvent(event)} conflict={conflictIds.has(event.id)} /><div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 7, marginTop: 9 }}><button type="button" className="msa-action" onClick={() => { respondToAgendaInvitation(event.id, "confirmed"); refresh(); }}>{t("ACCEPTER", "ACCEPT", "ACEPTAR")}</button><button type="button" onClick={() => { respondToAgendaInvitation(event.id, "declined"); refresh(); }} style={{ minHeight: 42, borderRadius: 12, border: "1px solid rgba(255,255,255,.1)", background: "rgba(255,255,255,.04)", color: "rgba(255,255,255,.72)", fontWeight: 1000 }}>{t("REFUSER", "DECLINE", "RECHAZAR")}</button></div></div>) : <EmptyState text={t("Aucune invitation en attente.", "No pending invitations.", "No hay invitaciones pendientes.")} />}
                </div>
              )}
            </div>
          </div>
          <div className="msa-sport-rail">
            <button type="button" onClick={() => setSportFilter("all")} className="msa-sport-icon-btn" aria-label={t("Tous les sports", "All sports", "Todos los deportes")} title={t("Tous", "All", "Todos")} style={{ width: "100%", minHeight: 40, border: `1px solid ${sportFilter === "all" ? accent : "rgba(255,255,255,.10)"}`, background: sportFilter === "all" ? `${accent}1b` : "rgba(255,255,255,.025)", color: sportFilter === "all" ? accent : "#fff", fontWeight: 1000, fontSize: 7 }}>{t("TOUS", "ALL", "TODOS")}</button>
            {availableSports.map((entry) => <button key={entry.id} type="button" className="msa-sport-icon-btn" onClick={() => setSportFilter(entry.id)} aria-label={entry.label} title={entry.label} style={{ width: "100%", minHeight: 38, border: `1px solid ${sportFilter === entry.id ? entry.accent : "rgba(255,255,255,.08)"}`, background: sportFilter === entry.id ? `${entry.accent}18` : "rgba(255,255,255,.022)", boxShadow: sportFilter === entry.id ? `0 0 12px ${entry.accent}28` : "none" }}><TintedSportLogo sport={entry.id} color={entry.accent} size={22}/></button>)}
          </div>
        </div>
      </aside>
      </div>
      </div>

      {selectedEvent ? <EventDetailDialog
        event={selectedEvent}
        locale={locale}
        lang={String(lang || "fr")}
        conflict={conflictIds.has(selectedEvent.id)}
        onClose={() => setSelectedEvent(null)}
        onOpenModule={() => { const event = selectedEvent; setSelectedEvent(null); openEvent(event); }}
        onReschedule={isOrganizationAgenda && organizationAgenda && selectedEvent.sourceId ? async (patch) => {
          const startAt = patch.startAt ?? selectedEvent.startAt;
          const durationMin = patch.durationMin ?? selectedEvent.durationMin ?? 60;
          await updateOrganizationEvent(organizationAgenda.userId, selectedEvent.sourceId!, organizationAgenda.organizationId, {
            groupId: String(selectedEvent.routeParams?.organizationGroupId || "") || null,
            title: selectedEvent.title,
            eventType: String(selectedEvent.routeParams?.organizationEventType || agendaTypeToOrganization(selectedEvent.type)) as OrganizationEventType,
            startsAt: new Date(startAt).toISOString(),
            endsAt: new Date(startAt + Math.max(15, durationMin) * 60000).toISOString(),
            location: selectedEvent.location || "",
          });
          setSelectedEvent(null);
          refresh();
        } : undefined}
        hideComplete={isOrganizationAgenda}
        onChanged={() => { refresh(); if (isOrganizationAgenda) setSelectedEvent(null); else { const fresh = collectMultisportAgendaEvents().find((item) => item.id === selectedEvent.id) || null; setSelectedEvent(fresh); } }}
      /> : null}
      {createOpen ? <CreateEventDialog
        accent={accent}
        lang={String(lang || "fr")}
        initialDraft={(params?.agendaDraft || null) as AgendaCreateDraft | null}
        sportsOverride={availableSports}
        onCreate={isOrganizationAgenda && organizationAgenda ? async (input) => {
          const matchingGroup = (organizationAgenda.groups || []).find((group) => normalizeOrganizationSportId(group.sportId) === input.sport);
          await createOrganizationEvent(organizationAgenda.userId, organizationAgenda.organizationId, {
            groupId: matchingGroup?.id || null,
            title: input.title,
            eventType: agendaTypeToOrganization(input.type),
            startsAt: new Date(input.startAt).toISOString(),
            endsAt: new Date(input.startAt + Math.max(15, input.durationMin || 60) * 60000).toISOString(),
            location: input.location || "",
          });
        } : undefined}
        onClose={() => setCreateOpen(false)}
        onCreated={() => { setCreateOpen(false); refresh(); }}
      /> : null}
    </div>
  );
}

function AgendaRailButton({ icon, label, active = false, badge, onClick }: { icon: string; label: string; active?: boolean; badge?: number; onClick: () => void }) {
  return <button type="button" className={`msa-rail-btn${active ? " on" : ""}`} onClick={onClick}><span className="ico">{icon}</span><span className="txt">{label}</span>{badge ? <span className="badge">{badge > 99 ? "99+" : badge}</span> : null}</button>;
}

function AgendaEventChip({ event, locale, conflict = false, onOpen }: { event: MultisportAgendaEvent; locale: string; conflict?: boolean; onOpen: () => void }) {
  const meta = multisportSportMeta(event.sport);
  const hot = event.accent || meta.accent;
  return <button type="button" className="msa-event-chip" onClick={onOpen} style={{ borderColor: conflict ? "rgba(255,117,117,.48)" : `${hot}55`, background: `linear-gradient(145deg,${hot}14,rgba(5,8,14,.46))` }}><TintedSportLogo sport={event.sport} color={hot} size={18}/><div style={{ minWidth: 0 }}><div className="time">{formatTime(event.startAt, locale)}</div><div className="title">{event.title}</div></div></button>;
}

function DayTimelineBoard({ day, events, locale, accent, conflictIds, onOpen }: { day: number; events: MultisportAgendaEvent[]; locale: string; accent: string; conflictIds: Set<string>; onOpen: (event: MultisportAgendaEvent) => void }) {
  // Landscape planner: the event itself occupies its real duration on the timeline.
  // 18:00 + 150 min therefore spans visually from 18:00 to 20:30 instead of staying in the 18:00 row.
  const START_HOUR = 6;
  const END_HOUR = 24;
  const HOUR_HEIGHT = 72;
  const TOTAL_MINUTES = (END_HOUR - START_HOUR) * 60;
  const slots = Array.from({ length: END_HOUR - START_HOUR }, (_, index) => START_HOUR + index);
  const dayStart = localDayStart(day);

  const positioned = events
    .filter((event) => sameLocalDay(event.startAt, day))
    .map((event) => {
      const start = new Date(event.startAt);
      const startMinutes = start.getHours() * 60 + start.getMinutes();
      const durationMin = Math.max(15, Number(event.durationMin || 60));
      const visibleStart = Math.max(START_HOUR * 60, startMinutes);
      const visibleEnd = Math.min(END_HOUR * 60, startMinutes + durationMin);
      if (visibleEnd <= START_HOUR * 60 || visibleStart >= END_HOUR * 60 || visibleEnd <= visibleStart) return null;
      const top = ((visibleStart - START_HOUR * 60) / 60) * HOUR_HEIGHT;
      const height = Math.max(28, ((visibleEnd - visibleStart) / 60) * HOUR_HEIGHT - 4);
      const endAt = event.startAt + durationMin * 60_000;
      return { event, durationMin, top, height, endAt };
    })
    .filter((item): item is NonNullable<typeof item> => !!item);

  return <div className="msa-calendar-day" style={{ ["--msa-hour-h" as any]: `${HOUR_HEIGHT}px` }}>
    <div className="msa-day-grid" aria-hidden="true">
      {slots.map((hour) => <div key={hour} className="msa-hour-row">
        <div className="msa-hour-label">{String(hour).padStart(2, "0")}:00</div>
        <div className="msa-hour-slot" />
      </div>)}
    </div>
    <div className="msa-day-events-layer">
      {positioned.map(({ event, durationMin, top, height, endAt }) => {
        const meta = multisportSportMeta(event.sport);
        const hot = event.accent || meta.accent || accent;
        const conflict = conflictIds.has(event.id);
        return <button
          key={event.id}
          type="button"
          className="msa-day-duration-event"
          onClick={() => onOpen(event)}
          style={{
            top,
            height,
            borderColor: conflict ? "rgba(255,117,117,.58)" : `${hot}70`,
            background: `linear-gradient(100deg,${hot}24,rgba(7,10,16,.90) 72%)`,
            boxShadow: conflict ? "0 0 0 1px rgba(255,117,117,.12) inset,0 8px 20px rgba(0,0,0,.22)" : `0 0 0 1px ${hot}12 inset,0 8px 20px rgba(0,0,0,.22)`,
          }}
          title={`${event.title} · ${formatTime(event.startAt, locale)} → ${formatTime(endAt, locale)} · ${durationMin} min`}
        >
          <TintedSportLogo sport={event.sport} color={hot} size={18}/>
          <div className="meta">
            <div className="time">{formatTime(event.startAt, locale)} → {formatTime(endAt, locale)}</div>
            <div className="title">{event.title}</div>
          </div>
          <div className="duration">{durationMin} min</div>
        </button>;
      })}
    </div>
  </div>;
}

function WeekPlannerBoard({ start, events, locale, accent, conflictIds, onOpen }: { start: number; events: MultisportAgendaEvent[]; locale: string; accent: string; conflictIds: Set<string>; onOpen: (event: MultisportAgendaEvent) => void }) {
  const days = Array.from({ length: 7 }, (_, index) => start + index * DAY);
  return <div className="msa-week-board">{days.map((day) => {
    const rows = events.filter((event) => sameLocalDay(event.startAt, day)).sort((a, b) => a.startAt - b.startAt);
    const isToday = sameLocalDay(day, Date.now());
    const isPast = day < localDayStart(Date.now());
    return <div key={day} className={`msa-week-col${isToday ? " today" : ""}${isPast ? " past" : ""}`}>
      <div className="msa-week-col-head">{formatDate(day, locale, { weekday: "short", day: "numeric", month: "short" })}</div>
      <div className="msa-week-col-body">{rows.length ? rows.map((event) => <AgendaEventChip key={event.id} event={event} locale={locale} conflict={conflictIds.has(event.id)} onOpen={() => onOpen(event)} />) : <div className="msa-week-empty">—</div>}</div>
    </div>;
  })}</div>;
}

function LandscapeMonthGrid({ cursor, events, locale, onSelectDay }: { cursor: number; events: MultisportAgendaEvent[]; locale: string; onSelectDay: (day: number) => void }) {
  const monthStart = localMonthStart(cursor);
  const first = new Date(monthStart);
  const mondayIndex = (first.getDay() + 6) % 7;
  const gridStart = monthStart - mondayIndex * DAY;
  const weekdays = Array.from({ length: 7 }, (_, i) => formatDate(gridStart + i * DAY, locale, { weekday: "short" }));
  const todayStart = localDayStart(Date.now());

  return <div className="msa-landscape-month-board">
    <div className="msa-landscape-month-weekdays">{weekdays.map((d, i) => <div key={i}>{d}</div>)}</div>
    <div className="msa-landscape-month-days">{Array.from({ length: 42 }, (_, i) => {
      const day = gridStart + i * DAY;
      const d = new Date(day);
      const currentMonth = d.getMonth() === first.getMonth();
      const rows = events.filter((event) => sameLocalDay(event.startAt, day));
      const isToday = sameLocalDay(day, Date.now());
      const isPast = day < todayStart;
      return <button type="button" key={day} className={`msa-landscape-month-cell${currentMonth ? "" : " off"}${isToday ? " today" : ""}${isPast ? " past" : ""}`} onClick={() => onSelectDay(day)}>
        <strong>{d.getDate()}</strong>
        <div className="msa-landscape-month-events">{rows.slice(0, 3).map((event) => {
          const color = event.accent || multisportSportMeta(event.sport).accent;
          return <span key={event.id} title={event.title} style={{ borderColor: `${color}66`, background: `${color}1b`, color }}><TintedSportLogo sport={event.sport} color={color} size={10}/><b>{formatTime(event.startAt, locale)}</b></span>;
        })}{rows.length > 3 ? <em>+{rows.length - 3}</em> : null}</div>
      </button>;
    })}</div>
  </div>;
}

function TintedSportLogo({ sport, color, size = 30 }: { sport: MultisportEventSport; color: string; size?: number }) {
  if (sport === "other" || !AGENDA_SPORT_ASSETS[sport as AppSportId]) return <span style={{ color, fontSize: size * .75 }}>◆</span>;
  const src = AGENDA_SPORT_ASSETS[sport as AppSportId].calendarIcon;
  return <img aria-hidden="true" src={src} alt="" draggable={false} style={{ display: "block", width: size, height: size, objectFit: "contain", filter: `drop-shadow(0 0 6px ${color}88)` }} />;
}

function formatAgendaMinutes(minutes: number) {
  if (!minutes) return "0 min";
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60); const rest = minutes % 60;
  return rest ? `${hours}h${String(rest).padStart(2, "0")}` : `${hours}h`;
}

function eventTypeLabel(type: MultisportEventType) {
  if (type === "workout") return "SÉANCE"; if (type === "training") return "ENTRAÎNEMENT"; if (type === "match") return "MATCH"; if (type === "game") return "PARTIE"; if (type === "outing") return "SORTIE"; if (type === "race") return "COURSE"; if (type === "tournament") return "TOURNOI"; if (type === "league") return "LIGUE"; if (type === "leisure") return "LOISIRS"; if (type === "recovery") return "RÉCUP"; if (type === "club") return "CLUB"; if (type === "challenge") return "DÉFI"; return "ACTIVITÉ";
}

function AgendaShareButton({ accent, title, onClick }: { accent: string; title: string; onClick: () => void }) {
  return <button type="button" onClick={onClick} aria-label={title} title={title} style={{ width: 42, height: 42, borderRadius: 14, border: `1px solid ${accent}`, background: "rgba(0,0,0,.24)", color: accent, display: "grid", placeItems: "center", cursor: "pointer", boxShadow: `0 0 0 1px ${accent}44,0 0 12px ${accent}88`, WebkitTapHighlightColor: "transparent" }}>
    <svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="5" width="15" height="15" rx="2"/><path d="M7 3v4M14 3v4M3 10h15"/><path d="M15 16h6M18 13l3 3-3 3"/>
    </svg>
  </button>;
}

function AgendaMetric({ label, value, accent }: { label: string; value: string; accent: string }) {
  return <div style={{ minWidth: 0, borderRadius: 13, border: "1px solid rgba(255,255,255,.065)", background: "rgba(255,255,255,.022)", padding: "8px 7px", textAlign: "center" }}><div style={{ color: "rgba(255,255,255,.42)", fontSize: 6.7, fontWeight: 1000, letterSpacing: .65 }}>{label}</div><div style={{ marginTop: 3, color: accent, fontSize: 13, fontWeight: 1000, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{value}</div></div>;
}

function EventCard({ event, locale, onOpen, onDelete, conflict = false }: { event: MultisportAgendaEvent; locale: string; onOpen: () => void; onDelete?: () => void; conflict?: boolean }) {
  const meta = multisportSportMeta(event.sport); const hot = event.accent || meta.accent; const isPast = event.startAt < Date.now();
  return <button type="button" className={`msa-event${conflict ? " conflict" : ""}`} onClick={onOpen} style={{ borderColor: `${hot}38`, boxShadow: `inset 3px 0 0 ${hot}${isPast ? "88" : "cc"}` }}>
    <div style={{ width: 42, height: 42, borderRadius: 13, display: "grid", placeItems: "center", background: `${hot}13`, border: `1px solid ${hot}35` }}><TintedSportLogo sport={event.sport} color={hot} size={29}/></div>
    <div style={{ minWidth: 0 }}><div style={{ display: "flex", alignItems: "center", gap: 5, minWidth: 0 }}><span style={{ color: hot, fontSize: 8, fontWeight: 1000, letterSpacing: .7, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{meta.label} · {eventTypeLabel(event.type)}{event.discipline ? ` · ${String(event.discipline).toUpperCase()}` : ""}</span>{conflict ? <span style={{ flex: "0 0 auto", color: "#ff8b8b", fontSize: 8, fontWeight: 1000 }}>⚠</span> : null}</div><div style={{ marginTop: 2, fontSize: 11.5, fontWeight: 1000, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{event.title}</div><div style={{ marginTop: 3, fontSize: 8.3, color: "rgba(255,255,255,.56)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{event.organizer || event.club ? `${event.organizer || event.club} · ` : ""}{event.location || event.notes || sourceLabel(event.source)}</div></div>
    <div className="msa-event-time" style={{ textAlign: "right", whiteSpace: "nowrap" }}><strong style={{ color: "#fff", fontSize: 11 }}>{formatTime(event.startAt, locale)}</strong>{event.durationMin ? <div style={{ marginTop: 2, color: hot, fontSize: 8, fontWeight: 900 }}>{event.durationMin} min</div> : null}{isPast ? <div style={{ marginTop: 2, fontSize: 7, color: "rgba(255,255,255,.40)" }}>PASSÉ</div> : null}{onDelete ? <button type="button" aria-label="Supprimer" onClick={(e) => { e.stopPropagation(); onDelete(); }} style={{ marginTop: 3, border: 0, background: "transparent", color: "rgba(255,255,255,.35)", fontSize: 12, cursor: "pointer" }}>×</button> : null}</div>
  </button>;
}

function sourceLabel(source: MultisportAgendaEvent["source"]) { if (source === "fit_program") return "Programme FIT"; if (source === "multisport_program") return "Programme multisports"; if (source === "running_program") return "Programme running"; if (source === "running_race") return "Épreuve running"; if (source === "club") return "Club"; if (source === "team") return "Équipe"; if (source === "friend") return "Invitation"; return "Personnel"; }
function EmptyState({ text }: { text: string }) { return <div style={{ borderRadius: 18, border: "1px dashed rgba(255,255,255,.12)", background: "rgba(255,255,255,.02)", padding: "28px 18px", textAlign: "center", color: "rgba(255,255,255,.5)", fontSize: 10, lineHeight: 1.5 }}>{text}</div>; }

function MonthGrid({ cursor, events, locale, onSelectDay }: { cursor: number; events: MultisportAgendaEvent[]; locale: string; onSelectDay: (day: number) => void }) {
  const monthStart = localMonthStart(cursor); const first = new Date(monthStart); const mondayIndex = (first.getDay() + 6) % 7; const gridStart = monthStart - mondayIndex * DAY;
  const weekdays = Array.from({ length: 7 }, (_, i) => formatDate(gridStart + i * DAY, locale, { weekday: "narrow" }));
  return <div style={{ marginTop: 10 }}><div className="msa-month" style={{ marginBottom: 5 }}>{weekdays.map((d, i) => <div key={i} style={{ textAlign: "center", color: "rgba(255,255,255,.42)", fontSize: 8, fontWeight: 1000 }}>{d}</div>)}</div><div className="msa-month">{Array.from({ length: 42 }, (_, i) => { const day = gridStart + i * DAY; const d = new Date(day); const currentMonth = d.getMonth() === first.getMonth(); const rows = events.filter((event) => sameLocalDay(event.startAt, day)); return <button type="button" key={day} className={`msa-month-cell${currentMonth ? "" : " off"}`} onClick={() => onSelectDay(day)} style={{ color: "#fff", textAlign: "left", cursor: "pointer", borderColor: sameLocalDay(day, Date.now()) ? "rgba(255,255,255,.18)" : undefined }}><strong style={{ fontSize: 9 }}>{d.getDate()}</strong><div className="msa-month-icons">{rows.slice(0, 5).map((event) => { const color = event.accent || multisportSportMeta(event.sport).accent; return <span key={event.id} title={event.title} style={{ width: 13, height: 13, borderRadius: 4, display: "grid", placeItems: "center", background: `${color}17`, border: `1px solid ${color}45` }}><TintedSportLogo sport={event.sport} color={color} size={9}/></span>; })}{rows.length > 5 ? <span style={{ fontSize: 7, color: "rgba(255,255,255,.5)" }}>+{rows.length - 5}</span> : null}</div></button>; })}</div></div>;
}

function EventDetailDialog({ event, locale, lang, conflict, onClose, onOpenModule, onChanged, onReschedule, hideComplete = false }: { event: MultisportAgendaEvent; locale: string; lang: string; conflict: boolean; onClose: () => void; onOpenModule: () => void; onChanged: () => void; onReschedule?: (patch: Partial<MultisportAgendaEvent>) => Promise<void> | void; hideComplete?: boolean }) {
  const t = (fr: string, en: string, es: string) => pickLegacyLocalizedText(lang, fr, en, es);
  const meta = multisportSportMeta(event.sport); const hot = event.accent || meta.accent;
  const [date, setDate] = React.useState(toDateInput(event.startAt));
  const [time, setTime] = React.useState(() => { const d = new Date(event.startAt); return `${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`; });
  const [duration, setDuration] = React.useState(String(event.durationMin || 60));
  const editable = !event.readonly;
  const saveSchedule = () => { if (!editable) return; const patch = { startAt: inputToTimestamp(date, time), durationMin: Math.max(15, Number(duration) || 60) }; if (onReschedule) { void Promise.resolve(onReschedule(patch)); return; } updateMultisportEvent(event.id, patch); onChanged(); };
  return <div role="dialog" aria-modal="true" onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 160, background: "rgba(0,0,0,.72)", backdropFilter: "blur(10px)", display: "flex", alignItems: "flex-end", justifyContent: "center", padding: 10 }}>
    <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 560, maxHeight: "88vh", overflowY: "auto", borderRadius: "24px 24px 16px 16px", border: `1px solid ${hot}46`, background: `linear-gradient(180deg,${hot}0e,#0a0e16 26%,#060910)`, padding: 14, boxShadow: "0 -24px 70px rgba(0,0,0,.62)" }}>
      <div style={{ display: "grid", gridTemplateColumns: "48px minmax(0,1fr) 38px", gap: 10, alignItems: "center" }}>
        <div style={{ width: 48, height: 48, borderRadius: 15, display: "grid", placeItems: "center", background: `${hot}15`, border: `1px solid ${hot}42` }}><TintedSportLogo sport={event.sport} color={hot} size={34}/></div>
        <div style={{ minWidth: 0 }}><div style={{ color: hot, fontSize: 8, fontWeight: 1000, letterSpacing: .8 }}>{meta.label} · {eventTypeLabel(event.type)}</div><div style={{ marginTop: 3, fontSize: 17, lineHeight: 1.08, fontWeight: 1000 }}>{event.title}</div><div style={{ marginTop: 4, color: "rgba(255,255,255,.52)", fontSize: 8.5 }}>{formatDate(event.startAt, locale)} · {formatTime(event.startAt, locale)}{event.durationMin ? ` · ${event.durationMin} min` : ""}</div></div>
        <button type="button" onClick={onClose} style={{ width: 38, height: 38, borderRadius: 12, border: "1px solid rgba(255,255,255,.09)", background: "rgba(255,255,255,.04)", color: "#fff", fontSize: 18 }}>×</button>
      </div>
      {conflict ? <div style={{ marginTop: 11, borderRadius: 13, border: "1px solid rgba(255,117,117,.32)", background: "rgba(255,80,80,.07)", padding: 10, color: "#ff9a9a", fontSize: 9, fontWeight: 900 }}>⚠ {t("Cette activité chevauche une autre activité de ton agenda.", "This activity overlaps another event in your agenda.", "Esta actividad se superpone con otra de tu agenda.")}</div> : null}
      <div style={{ marginTop: 11, display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 7 }}>
        <AgendaDetail label={t("ORIGINE", "SOURCE", "ORIGEN")} value={sourceLabel(event.source)} /><AgendaDetail label={t("STATUT", "STATUS", "ESTADO")} value={statusLabel(event.status)} />{event.location ? <AgendaDetail label={t("LIEU", "LOCATION", "LUGAR")} value={event.location} /> : null}{event.club || event.organizer ? <AgendaDetail label={t("ORGANISATEUR", "ORGANIZER", "ORGANIZADOR")} value={event.club || event.organizer || "—"} /> : null}
      </div>
      {event.participants?.length ? <div style={{ marginTop: 9, color: "rgba(255,255,255,.65)", fontSize: 9 }}><b style={{ color: "#fff" }}>{t("Participants", "Participants", "Participantes")}:</b> {event.participants.join(", ")}</div> : null}
      {event.notes ? <div style={{ marginTop: 9, borderRadius: 12, background: "rgba(255,255,255,.025)", padding: 9, color: "rgba(255,255,255,.62)", fontSize: 9, lineHeight: 1.45 }}>{event.notes}</div> : null}
      {editable ? <div style={{ marginTop: 11, borderTop: "1px solid rgba(255,255,255,.07)", paddingTop: 10 }}><div style={{ color: "rgba(255,255,255,.42)", fontSize: 7, fontWeight: 1000, letterSpacing: .8 }}>{t("DÉPLACER L'ACTIVITÉ", "RESCHEDULE", "REPROGRAMAR")}</div><div style={{ display: "grid", gridTemplateColumns: "1.2fr .9fr .7fr", gap: 6, marginTop: 7 }}><input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={detailInput}/><input type="time" value={time} onChange={(e) => setTime(e.target.value)} style={detailInput}/><input inputMode="numeric" value={duration} onChange={(e) => setDuration(e.target.value)} aria-label="Durée" style={detailInput}/></div><button type="button" onClick={saveSchedule} style={{ width: "100%", minHeight: 40, marginTop: 7, borderRadius: 11, border: `1px solid ${hot}55`, background: `${hot}12`, color: hot, fontWeight: 1000 }}>{t("ENREGISTRER LE CRÉNEAU", "SAVE TIME", "GUARDAR HORARIO")}</button></div> : null}
      <div style={{ display: "grid", gridTemplateColumns: event.route ? "1fr 1.25fr" : "1fr", gap: 7, marginTop: 11 }}>
        {!hideComplete && event.status !== "completed" && editable ? <button type="button" onClick={() => { updateMultisportEvent(event.id, { status: "completed" }); onChanged(); }} style={{ minHeight: 46, borderRadius: 13, border: "1px solid rgba(117,237,154,.35)", background: "rgba(117,237,154,.09)", color: "#75ed9a", fontWeight: 1000 }}>✓ {t("TERMINÉE", "COMPLETED", "TERMINADA")}</button> : <button type="button" onClick={onClose} style={{ minHeight: 46, borderRadius: 13, border: "1px solid rgba(255,255,255,.09)", background: "rgba(255,255,255,.035)", color: "#fff", fontWeight: 1000 }}>{t("FERMER", "CLOSE", "CERRAR")}</button>}
        {event.route ? <button type="button" onClick={onOpenModule} style={{ minHeight: 46, borderRadius: 13, border: `1px solid ${hot}`, background: `linear-gradient(135deg,${hot},#fff1bd)`, color: "#080b10", fontWeight: 1000 }}>{t("OUVRIR LE MODULE", "OPEN MODULE", "ABRIR MÓDULO")} →</button> : null}
      </div>
    </div>
  </div>;
}

const detailInput: React.CSSProperties = { minWidth: 0, width: "100%", boxSizing: "border-box", minHeight: 40, borderRadius: 10, border: "1px solid rgba(255,255,255,.1)", background: "rgba(0,0,0,.32)", color: "#fff", padding: "0 8px", fontSize: 16 };
function AgendaDetail({ label, value }: { label: string; value: string }) { return <div style={{ minWidth: 0, borderRadius: 12, border: "1px solid rgba(255,255,255,.065)", background: "rgba(255,255,255,.022)", padding: 8 }}><div style={{ color: "rgba(255,255,255,.4)", fontSize: 6.6, fontWeight: 1000, letterSpacing: .65 }}>{label}</div><div style={{ marginTop: 3, color: "#fff", fontSize: 9.5, fontWeight: 900, overflow: "hidden", textOverflow: "ellipsis" }}>{value}</div></div>; }
function statusLabel(status: MultisportAgendaEvent["status"]) { if (status === "completed") return "Terminée"; if (status === "pending") return "Invitation"; if (status === "confirmed") return "Confirmée"; if (status === "declined") return "Refusée"; if (status === "cancelled") return "Annulée"; return "Planifiée"; }

function CreateEventDialog({ accent, lang, initialDraft, onClose, onCreated, onCreate, sportsOverride }: { accent: string; lang: string; initialDraft?: AgendaCreateDraft | null; onClose: () => void; onCreated: () => void; onCreate?: (input: AgendaCreateInput) => Promise<void> | void; sportsOverride?: ReturnType<typeof enabledAgendaSports> }) {
  const t = (fr: string, en: string, es: string) => pickLegacyLocalizedText(lang, fr, en, es);
  const tomorrow = Date.now() + DAY;
  const sports = sportsOverride?.length ? sportsOverride : enabledAgendaSports();
  const requestedSport = initialDraft?.sport;
  const firstSport = ((requestedSport && sports.some((row) => row.id === requestedSport)) ? requestedSport : (sports[0]?.id || "fit")) as MultisportEventSport;
  const [title, setTitle] = React.useState(String(initialDraft?.title || ""));
  const [sport, setSport] = React.useState<MultisportEventSport>(firstSport);
  const [sportPickerOpen, setSportPickerOpen] = React.useState(false);
  const [eventType, setEventType] = React.useState<MultisportEventType>(() => initialDraft?.eventType || defaultTypeForSport(firstSport));
  const [dartsModeId, setDartsModeId] = React.useState("x01");
  const [dartsPickerOpen, setDartsPickerOpen] = React.useState(false);
  const [date, setDate] = React.useState(toDateInput(tomorrow));
  const [time, setTime] = React.useState("18:00");
  const [duration, setDuration] = React.useState(String(Math.max(0, Number(initialDraft?.durationMin || 60))));
  const [location, setLocation] = React.useState("");
  const [kind, setKind] = React.useState<"personal" | "club" | "invite">("personal");
  const [organizer, setOrganizer] = React.useState("");
  const [peopleOptions, setPeopleOptions] = React.useState<AgendaPerson[]>([]);
  const [peopleLoading, setPeopleLoading] = React.useState(true);
  const [selectedPeople, setSelectedPeople] = React.useState<string[]>([]);
  const [extraParticipants, setExtraParticipants] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [saveError, setSaveError] = React.useState("");

  const selectedHot = sport === "other" ? accent : multisportSportMeta(sport).accent;
  const selectedBanner = sport !== "other" ? AGENDA_SPORT_ASSETS[sport as AppSportId]?.banner : null;
  const typeOptions = sportTypeOptions(sport);
  const allDartsModes = React.useMemo(
    () => filterDartsGamesForCurrentRuntime(DARTS_GAMES).filter((game) => game.ready),
    [],
  );
  const dartsModes = React.useMemo(() => {
    if (eventType === "training") {
      return allDartsModes.filter((game) => game.entry === "training" || game.category === "training");
    }
    return allDartsModes.filter((game) => game.entry === "games" && game.category !== "training");
  }, [allDartsModes, eventType]);
  const selectedDartsMode = dartsModes.find((mode) => mode.id === dartsModeId) || dartsModes[0] || null;
  const participantProfiles = React.useMemo(() => peopleOptions.map((person) => person.profile), [peopleOptions]);

  React.useEffect(() => {
    if (sport !== "darts") return;
    if (!dartsModes.length) return;
    if (!dartsModes.some((mode) => mode.id === dartsModeId)) setDartsModeId(dartsModes[0].id);
  }, [sport, dartsModes, dartsModeId]);

  React.useEffect(() => {
    let alive = true;
    const addPeople = (target: Map<string, AgendaPerson>, rows: any[], source: "local" | "friend") => {
      for (const row of rows || []) {
        if (!row) continue;
        if (source === "local" && (row.isBot || row.bot || String(row.type || row.kind || "").toLowerCase().includes("bot"))) continue;
        const rawId = String(row.id || row.userId || row.profileId || row.name || "").trim();
        const name = String(row.name || row.displayName || row.nickname || row.username || "").trim();
        if (!rawId || !name) continue;
        const id = source === "local" ? rawId : `friend:${rawId}`;
        const avatar = row.avatarDataUrl || row.avatarUrl || row.avatar || row.photoURL || null;
        const profile = {
          ...row,
          id,
          profileId: id,
          name,
          displayName: name,
          avatarDataUrl: row.avatarDataUrl || avatar || undefined,
          avatarUrl: row.avatarUrl || avatar || undefined,
          agendaSource: source,
        };
        target.set(id, { id, name, source, avatar, profile });
      }
    };
    void (async () => {
      const map = new Map<string, AgendaPerson>();
      try {
        const store: any = await loadStore<any>();
        addPeople(map, Array.isArray(store?.profiles) ? store.profiles : [], "local");
        addPeople(map, Array.isArray(store?.friends) ? store.friends : [], "friend");
        if (alive) setPeopleOptions([...map.values()]);
      } catch {}
      try {
        const online = await listFriends();
        addPeople(map, Array.isArray(online) ? online as OnlineFriendUser[] : [], "friend");
      } catch {}
      if (alive) { setPeopleOptions([...map.values()]); setPeopleLoading(false); }
    })();
    return () => { alive = false; };
  }, []);

  const selectSport = (next: MultisportEventSport) => {
    setSport(next);
    setEventType(defaultTypeForSport(next));
    setSportPickerOpen(false);
    setDartsPickerOpen(false);
  };

  const togglePersonId = (id: string) => {
    setSelectedPeople((prev) => prev.includes(id) ? prev.filter((key) => key !== id) : [...prev, id]);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    setSaveError("");
    try {
      const pickedNames = peopleOptions.filter((person) => selectedPeople.includes(person.id)).map((person) => person.name);
      const typedNames = extraParticipants.split(",").map((item) => item.trim()).filter(Boolean);
      const people = Array.from(new Set([...pickedNames, ...typedNames])).slice(0, 30);
      const sportMeta = multisportSportMeta(sport);
      const selectedType = typeOptions.find((option) => option.value === eventType) || typeOptions[0];
      const typeTitle = selectedType ? t(selectedType.fr, selectedType.en, selectedType.es) : t("Activité", "Activity", "Actividad");
      // Le titre est facultatif : un clic sur AJOUTER crée toujours une vraie entrée.
      // Pour Darts, le nom du mode sélectionné est le meilleur titre automatique.
      const finalTitle = title.trim() || (sport === "darts" && selectedDartsMode ? selectedDartsMode.label : `${sportMeta.label} · ${typeTitle}`);
      const startAt = inputToTimestamp(date, time);
      if (!Number.isFinite(startAt) || startAt <= 0) throw new Error(t("Date ou heure invalide", "Invalid date or time", "Fecha u hora no válida"));

      let route: string | undefined = initialDraft?.route || (sport !== "other" ? "games" : undefined);
      let routeParams: Record<string, unknown> | undefined = initialDraft?.routeParams ? { ...initialDraft.routeParams } : (sport === "fit" ? { fitTemplateId: "free", fitSessionTitle: finalTitle } : undefined);
      let discipline: string | undefined = initialDraft?.discipline;
      if (sport === "darts" && selectedDartsMode) {
        discipline = selectedDartsMode.label;
        if (eventType === "training") {
          route = selectedDartsMode.id === "training_x01" ? "training_x01" : selectedDartsMode.id === "tour_horloge" ? "training_clock" : "training";
        } else {
          route = selectedDartsMode.tab;
        }
        routeParams = selectedDartsMode.variantId
          ? { variantId: selectedDartsMode.variantId, gameId: selectedDartsMode.id }
          : { gameId: selectedDartsMode.id };
      }

      const agendaInput: AgendaCreateInput = {
        title: finalTitle,
        sport,
        discipline,
        type: eventType,
        source: kind === "club" ? "club" : kind === "invite" ? "friend" : "manual",
        startAt,
        durationMin: Math.max(0, Number(duration) || 0) || undefined,
        location: location.trim() || undefined,
        organizer: kind === "invite" ? organizer.trim() || undefined : undefined,
        club: kind === "club" ? organizer.trim() || undefined : undefined,
        participants: people.length ? people : undefined,
        notes: notes.trim() || undefined,
        status: kind === "invite" ? "pending" : "confirmed",
        accent: multisportSportMeta(sport).accent,
        route,
        routeParams,
      };
      if (onCreate) await onCreate(agendaInput);
      else {
        createMultisportEvent(agendaInput);
        // Ne ferme le dialogue qu'après confirmation de l'écriture IndexedDB.
        await flushMultisportAgendaPersistence();
      }
      onCreated();
    } catch (error: any) {
      setSaveError(String(error?.message || t("Impossible d'enregistrer l'activité", "Unable to save the activity", "No se puede guardar la actividad")));
    } finally {
      setSaving(false);
    }
  };

  const input: React.CSSProperties = { width: "100%", minHeight: 44, boxSizing: "border-box", borderRadius: 12, border: "1px solid rgba(255,255,255,.1)", background: "rgba(0,0,0,.34)", color: "#fff", padding: "0 11px", fontSize: 16 };
  const label: React.CSSProperties = { color: "rgba(255,255,255,.46)", fontSize: 7, fontWeight: 1000, letterSpacing: .7, marginBottom: -3 };

  return <div role="dialog" aria-modal="true" onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 150, background: "rgba(0,0,0,.76)", backdropFilter: "blur(8px)", display: "grid", placeItems: "center", padding: 12 }}>
    <form onSubmit={submit} onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 560, maxHeight: "90vh", overflowY: "auto", borderRadius: 22, border: `1px solid ${selectedHot}35`, background: `linear-gradient(180deg,${selectedHot}0a,#0b1019 18%,#060910)`, padding: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div><div style={{ color: selectedHot, fontSize: 8, fontWeight: 1000, letterSpacing: 1 }}>AGENDA MULTISPORTS</div><div style={{ fontSize: 19, fontWeight: 1000 }}>{t("Ajouter une activité", "Add an activity", "Añadir una actividad")}</div></div>
        <button type="button" onClick={onClose} style={{ width: 38, height: 38, borderRadius: 11, border: "1px solid rgba(255,255,255,.1)", background: "rgba(255,255,255,.04)", color: "#fff" }}>×</button>
      </div>

      <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
        <div style={label}>{t("ACTIVITÉ", "ACTIVITY", "ACTIVIDAD")}</div>
        <input style={input} value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t("Facultatif — ex. match entre amis", "Optional — e.g. friendly match", "Opcional — ej. partido amistoso")} autoFocus/>

        <div style={label}>{t("SPORT / MODULE", "SPORT / MODULE", "DEPORTE / MÓDULO")}</div>
        {selectedBanner ? <button type="button" className="msa-sport-select" onClick={() => setSportPickerOpen((open) => !open)} aria-expanded={sportPickerOpen} style={{ border: `1px solid ${selectedHot}55`, boxShadow: sportPickerOpen ? `0 0 14px ${selectedHot}14` : "none" }}>
          <img className="msa-sport-select-preview" src={selectedBanner} alt="" aria-hidden="true"/>
          <span className="msa-sport-select-label">{multisportSportMeta(sport).label}</span>
          <span className="msa-sport-select-chevron">{sportPickerOpen ? "▲" : "▼"}</span>
        </button> : null}
        {sportPickerOpen ? <div className="msa-sport-picker-panel">{sports.map((entry) => <button key={entry.id} type="button" className={`msa-banner-choice${sport === entry.id ? " on" : ""}`} onClick={() => selectSport(entry.id)} aria-label={entry.label} title={entry.label} style={{ border: `1px solid ${sport === entry.id ? entry.accent : "rgba(255,255,255,.08)"}`, color: entry.accent }}><img src={AGENDA_SPORT_ASSETS[entry.id].banner} alt={entry.label}/></button>)}</div> : null}

        <label><div style={label}>{t("TYPE", "TYPE", "TIPO")}</div><select style={{ ...input, marginTop: 5, borderColor: `${selectedHot}45` }} value={eventType} onChange={(e) => { setEventType(e.target.value as MultisportEventType); setDartsPickerOpen(false); }}>{typeOptions.map((option) => <option key={option.value} value={option.value}>{t(option.fr, option.en, option.es)}</option>)}</select></label>

        {sport === "darts" ? <div>
          <div style={label}>{eventType === "training" ? t("MODE DE TRAINING DARTS", "DARTS TRAINING MODE", "MODO DE ENTRENAMIENTO DE DARDOS") : t("MODE DE JEU DARTS", "DARTS GAME MODE", "MODO DE DARDOS")}</div>
          {selectedDartsMode ? <button type="button" className="msa-darts-mode" onClick={() => setDartsPickerOpen((open) => !open)} style={{ width: "100%", marginTop: 5, border: `1px solid ${selectedHot}55`, color: "#fff" }}>
            {tickerForDartsMode(selectedDartsMode.id) ? <img src={tickerForDartsMode(selectedDartsMode.id) || ""} alt=""/> : null}
            <span style={{ position: "relative", zIndex: 2, display: "flex", alignItems: "center", height: "100%", padding: "0 10px", color: selectedHot, fontSize: 10, fontWeight: 1000, textShadow: "0 2px 8px #000" }}>{selectedDartsMode.label}<span style={{ marginLeft: "auto", color: "rgba(255,255,255,.7)" }}>{dartsPickerOpen ? "▲" : "▼"}</span></span>
          </button> : null}
          {dartsPickerOpen ? <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 5, maxHeight: 240, overflowY: "auto", marginTop: 7, padding: 5, borderRadius: 12, border: "1px solid rgba(255,255,255,.08)", background: "rgba(0,0,0,.24)" }}>{dartsModes.map((mode) => <DartsModeChoice key={mode.id} mode={mode} selected={mode.id === dartsModeId} accent={selectedHot} onClick={() => { setDartsModeId(mode.id); setDartsPickerOpen(false); }}/>)}</div> : null}
        </div> : null}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}><label><div style={label}>{t("DATE", "DATE", "FECHA")}</div><input style={{ ...input, marginTop: 5 }} type="date" value={date} onChange={(e) => setDate(e.target.value)}/></label><label><div style={label}>{t("HEURE", "TIME", "HORA")}</div><input style={{ ...input, marginTop: 5 }} type="time" value={time} onChange={(e) => setTime(e.target.value)}/></label></div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}><label><div style={label}>{t("DURÉE", "DURATION", "DURACIÓN")}</div><input style={{ ...input, marginTop: 5 }} inputMode="numeric" value={duration} onChange={(e) => setDuration(e.target.value)} placeholder="60 min"/></label><label><div style={label}>{t("ORIGINE", "SOURCE", "ORIGEN")}</div><select style={{ ...input, marginTop: 5 }} value={kind} onChange={(e) => setKind(e.target.value as any)}><option value="personal">{t("Personnel", "Personal", "Personal")}</option><option value="club">{t("Club / équipe", "Club / team", "Club / equipo")}</option><option value="invite">{t("Invitation reçue", "Received invitation", "Invitación recibida")}</option></select></label></div>
        {kind !== "personal" ? <><div style={label}>{kind === "club" ? t("CLUB / ÉQUIPE", "CLUB / TEAM", "CLUB / EQUIPO") : t("INVITÉ PAR", "INVITED BY", "INVITADO POR")}</div><input style={input} value={organizer} onChange={(e) => setOrganizer(e.target.value)} placeholder={kind === "club" ? t("Nom du club / équipe", "Club / team name", "Club / equipo") : t("Nom de l'ami / organisateur", "Friend / organizer", "Amigo / organizador")}/></> : null}
        <div style={label}>{t("LIEU", "LOCATION", "LUGAR")}</div><input style={input} value={location} onChange={(e) => setLocation(e.target.value)} placeholder={t("Lieu (facultatif)", "Location (optional)", "Lugar (opcional)")}/>

        <div style={label}>{t("PARTICIPANTS — PROFILS LOCAUX & AMIS", "PARTICIPANTS — LOCAL PROFILES & FRIENDS", "PARTICIPANTES — PERFILES LOCALES Y AMIGOS")}</div>
        <div style={{ borderRadius: 14, border: "1px solid rgba(255,255,255,.08)", background: "rgba(255,255,255,.02)", padding: 8 }}>
          {peopleLoading && !peopleOptions.length ? <div style={{ color: "rgba(255,255,255,.42)", fontSize: 9, padding: 6 }}>{t("Chargement des profils et amis…", "Loading profiles and friends…", "Cargando perfiles y amigos…")}</div> : null}
          {peopleOptions.length ? <PlayerPagedSelector
            profiles={participantProfiles}
            selectedIds={selectedPeople}
            onToggle={(id: string) => togglePersonId(String(id))}
            accent={selectedHot}
            pageSize={9}
            modalTitle={t("Choisir les participants", "Choose participants", "Elegir participantes")}
            showSelectedSummary={false}
            showProfileStarring={sport === "darts"}
            usageMode={sport === "darts" ? "x01" : "global"}
            loopPages={true}
            showListButton={false}
          /> : null}
          {selectedPeople.length ? <div style={{ display: "flex", gap: 5, overflowX: "auto", marginTop: 7, paddingBottom: 2, scrollbarWidth: "none" }}>{peopleOptions.filter((person) => selectedPeople.includes(person.id)).map((person) => <button key={person.id} type="button" onClick={() => togglePersonId(person.id)} title={t("Retirer", "Remove", "Quitar")} style={{ flex: "0 0 auto", display: "flex", alignItems: "center", gap: 5, minHeight: 30, borderRadius: 999, border: `1px solid ${selectedHot}55`, background: `${selectedHot}0d`, color: "#fff", padding: "2px 8px 2px 3px", fontSize: 8.5, fontWeight: 900 }}><PersonAvatar person={person}/><span>{person.name}</span><span style={{ color: selectedHot }}>×</span></button>)}</div> : null}
          <input style={{ ...input, marginTop: peopleOptions.length ? 8 : 0, minHeight: 39, fontSize: 13 }} value={extraParticipants} onChange={(e) => setExtraParticipants(e.target.value)} placeholder={t("Ajouter un autre nom (optionnel)", "Add another name (optional)", "Añadir otro nombre (opcional)")}/>
        </div>

        <div style={label}>{t("NOTES", "NOTES", "NOTAS")}</div><textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={t("Consignes, rendez-vous, objectif…", "Instructions, meetup, goal…", "Indicaciones, cita, objetivo…")} style={{ ...input, minHeight: 74, resize: "vertical", paddingTop: 10, fontFamily: "inherit" }}/>
        {saveError ? <div role="alert" style={{ color: "#ff9a9a", border: "1px solid rgba(255,100,100,.25)", background: "rgba(255,80,80,.06)", borderRadius: 10, padding: 8, fontSize: 9, fontWeight: 900 }}>{saveError}</div> : null}
        <button type="submit" disabled={saving} style={{ minHeight: 48, borderRadius: 13, border: `1px solid ${selectedHot}`, background: `linear-gradient(135deg,${selectedHot},#fff1bd)`, color: "#0a0d12", fontWeight: 1000, opacity: saving ? .6 : 1 }}>{saving ? t("ENREGISTREMENT…", "SAVING…", "GUARDANDO…") : kind === "invite" ? t("AJOUTER COMME INVITATION", "ADD AS INVITATION", "AÑADIR COMO INVITACIÓN") : t("AJOUTER À L'AGENDA", "ADD TO AGENDA", "AÑADIR A LA AGENDA")}</button>
      </div>
    </form>
  </div>;
}

function DartsModeChoice({ mode, selected, accent, onClick }: { mode: DartsGameDef; selected: boolean; accent: string; onClick: () => void }) {
  const ticker = tickerForDartsMode(mode.id);
  return <button type="button" className="msa-darts-mode" onClick={onClick} style={{ border: `1px solid ${selected ? accent : "rgba(255,255,255,.08)"}`, color: "#fff", boxShadow: selected ? `0 0 14px ${accent}22` : "none" }}>{ticker ? <img src={ticker} alt=""/> : null}<span style={{ position: "relative", zIndex: 2, display: "flex", alignItems: "flex-end", height: "100%", padding: "8px", fontSize: 9, fontWeight: 1000, color: selected ? accent : "#fff", textShadow: "0 2px 6px #000" }}>{mode.label}</span></button>;
}

function PersonAvatar({ person }: { person: AgendaPerson }) {
  if (person.avatar) return <img src={person.avatar} alt="" style={{ width: 28, height: 28, borderRadius: 999, objectFit: "cover", border: "1px solid rgba(255,255,255,.16)" }} />;
  return <span style={{ width: 28, height: 28, borderRadius: 999, display: "grid", placeItems: "center", background: person.source === "friend" ? "rgba(102,217,255,.13)" : "rgba(255,255,255,.08)", color: "#fff", fontSize: 10, fontWeight: 1000 }}>{person.name.slice(0, 1).toUpperCase()}</span>;
}
