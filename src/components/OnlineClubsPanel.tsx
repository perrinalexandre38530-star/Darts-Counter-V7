import React from "react";
import {
  createClub,
  createClubEvent,
  createClubMatch,
  createClubPost,
  getClubDetail,
  inviteUserToClub,
  listClubInvites,
  listClubTeams,
  listMyClubs,
  respondClubConvocation,
  respondClubInvite,
  upsertClubTeam,
  type Club,
  type ClubConvocation,
  type ClubEvent,
  type ClubInvite,
  type ClubMember,
  type ClubMatch,
  type ClubPost,
  type ClubTeam,
} from "../lib/clubsApi";
import { searchUsers, type OnlineFriendUser } from "../lib/friendsApi";
import { loadTeams, upsertTeam } from "../lib/petanqueTeamsStore";

type Props = {
  signedIn?: boolean;
  accent?: string;
  onOpenTeam?: (team: any) => void;
};

type ClubTab =
  | "dashboard"
  | "actu"
  | "matchs"
  | "convocs"
  | "agenda"
  | "effectif"
  | "equipes"
  | "stats"
  | "messages"
  | "photos"
  | "documents"
  | "reglages";

type FullscreenMode = "none" | "club";

const MANAGER_ROLES = new Set(["owner", "admin", "coach", "captain"]);
const SPORTS = ["foot", "darts", "babyfoot", "petanque", "pingpong", "molkky"];
const TABS: Array<{ id: ClubTab; label: string; short: string }> = [
  { id: "dashboard", label: "Tableau de bord", short: "Accueil" },
  { id: "actu", label: "Actualités", short: "Actu" },
  { id: "matchs", label: "Matchs", short: "Matchs" },
  { id: "convocs", label: "Convocations", short: "Convocs" },
  { id: "agenda", label: "Agenda", short: "Agenda" },
  { id: "effectif", label: "Effectif", short: "Effectif" },
  { id: "equipes", label: "Équipes", short: "Équipes" },
  { id: "stats", label: "Statistiques", short: "Stats" },
  { id: "messages", label: "Messages", short: "Messages" },
  { id: "photos", label: "Photos", short: "Photos" },
  { id: "documents", label: "Documents", short: "Docs" },
  { id: "reglages", label: "Réglages", short: "Réglages" },
];

function alpha(hex = "#22e6ff", opacity = "33") {
  const h = /^#[0-9a-f]{6}$/i.test(hex) ? hex : "#22e6ff";
  return `${h}${opacity}`;
}

function card(accent: string, pad = 14): React.CSSProperties {
  return {
    borderRadius: 24,
    border: `1px solid ${alpha(accent, "38")}`,
    background: `linear-gradient(145deg, ${alpha(accent, "15")}, rgba(255,255,255,.045))`,
    boxShadow: `0 0 24px ${alpha(accent, "12")}, inset 0 1px 0 rgba(255,255,255,.055)`,
    padding: pad,
    boxSizing: "border-box",
  };
}

function glass(accent: string, pad = 12): React.CSSProperties {
  return {
    borderRadius: 20,
    border: `1px solid ${alpha(accent, "32")}`,
    background: "rgba(5,12,22,.74)",
    boxShadow: `inset 0 1px 0 rgba(255,255,255,.05), 0 0 18px ${alpha(accent, "0f")}`,
    padding: pad,
    boxSizing: "border-box",
  };
}

function navButton(accent: string, active = false): React.CSSProperties {
  return {
    borderRadius: 16,
    border: `1px solid ${alpha(accent, active ? "e0" : "4b")}`,
    background: active ? `linear-gradient(135deg, ${alpha(accent, "42")}, ${alpha(accent, "16")})` : "rgba(255,255,255,.045)",
    color: active ? accent : "#fff",
    padding: "10px 13px",
    fontWeight: 1000,
    boxShadow: active ? `0 0 20px ${alpha(accent, "30")}` : undefined,
    whiteSpace: "nowrap",
  };
}

function iconButton(accent: string, danger = false): React.CSSProperties {
  const col = danger ? "#ff5a73" : accent;
  return {
    width: 46,
    height: 46,
    borderRadius: 18,
    border: `1px solid ${alpha(col, "66")}`,
    background: `linear-gradient(145deg, ${alpha(col, "24")}, rgba(255,255,255,.035))`,
    color: col,
    display: "grid",
    placeItems: "center",
    fontWeight: 1000,
    fontSize: 18,
    boxShadow: `0 0 18px ${alpha(col, "20")}`,
  };
}

function inputStyle(accent: string): React.CSSProperties {
  return {
    minWidth: 0,
    width: "100%",
    boxSizing: "border-box",
    borderRadius: 16,
    border: `1px solid ${alpha(accent, "46")}`,
    background: "rgba(0,0,0,.30)",
    color: "#fff",
    padding: "12px 13px",
    fontWeight: 900,
    outline: "none",
  };
}

function sportName(value?: string | null) {
  const raw = String(value || "multisports").toLowerCase();
  if (raw === "foot") return "Foot";
  if (raw === "darts") return "Fléchettes";
  if (raw === "babyfoot") return "Baby-foot";
  if (raw === "petanque") return "Pétanque";
  if (raw === "pingpong") return "Ping-pong";
  if (raw === "molkky") return "Mölkky";
  return raw === "generic" ? "Multisports" : raw;
}

function sportIcon(value?: string | null) {
  const raw = String(value || "").toLowerCase();
  if (raw === "foot") return "⚽";
  if (raw === "darts") return "🎯";
  if (raw === "babyfoot") return "⚽";
  if (raw === "petanque") return "🥎";
  if (raw === "pingpong") return "🏓";
  if (raw === "molkky") return "🎳";
  return "★";
}

function sportsLabel(team: any) {
  const ids = Array.isArray(team?.sportIds) ? team.sportIds : team?.sport ? [team.sport] : [];
  if (team?.allSports) return "tous les sports";
  return ids.filter(Boolean).map(sportName).join(", ") || "Multisports";
}

function teamMainSport(team: any) {
  const ids = Array.isArray(team?.sportIds) ? team.sportIds.filter(Boolean) : [];
  return String(team?.sport || ids[0] || "generic").toLowerCase();
}

function roleLabel(role?: string) {
  const raw = String(role || "member").toLowerCase();
  if (raw === "owner") return "Président";
  if (raw === "admin") return "Admin";
  if (raw === "coach") return "Coach";
  if (raw === "captain") return "Capitaine";
  if (raw === "player") return "Joueur";
  return "Membre";
}

function formatDateTime(value?: string | null) {
  if (!value) return "Date à définir";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "Date à définir";
  return d.toLocaleString("fr-FR", { weekday: "short", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

function formatShortDate(value?: string | null) {
  if (!value) return "À planifier";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "À planifier";
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
}

function statusLabel(status?: string) {
  const raw = String(status || "pending").toLowerCase();
  if (raw === "present") return { label: "Présent", color: "#7cff9d", short: "P" };
  if (raw === "absent") return { label: "Absent", color: "#ff6b7d", short: "A" };
  if (raw === "uncertain") return { label: "Incertain", color: "#ffc857", short: "?" };
  return { label: "En attente", color: "#d9e8ff", short: "…" };
}

function teamColor(idx: number, accent: string) {
  const colors = [accent, "#7cff9d", "#ffc857", "#ff6b7d", "#b58cff", "#69a7ff", "#ff9fd7", "#86f7ff"];
  return colors[idx % colors.length];
}

function clamp(n: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, n));
}

function countByStatus(items: ClubConvocation[], matchId?: string) {
  const rows = matchId ? items.filter((c) => c.clubMatchId === matchId) : items;
  return {
    present: rows.filter((c) => String(c.status) === "present").length,
    absent: rows.filter((c) => String(c.status) === "absent").length,
    uncertain: rows.filter((c) => String(c.status) === "uncertain").length,
    pending: rows.filter((c) => !["present", "absent", "uncertain"].includes(String(c.status))).length,
    total: rows.length,
  };
}

function SectionTitle({ children, accent, centered = false, small = false }: { children: React.ReactNode; accent: string; centered?: boolean; small?: boolean }) {
  return <div style={{ color: accent, fontSize: small ? 15 : 20, fontWeight: 1000, letterSpacing: .45, textAlign: centered ? "center" : "left", textTransform: "uppercase" }}>{children}</div>;
}

function MetaChip({ children, accent }: { children: React.ReactNode; accent: string }) {
  return <span style={{ display: "inline-flex", alignItems: "center", gap: 6, borderRadius: 999, border: `1px solid ${alpha(accent, "55")}`, background: `linear-gradient(135deg, ${alpha(accent, "24")}, rgba(255,255,255,.045))`, color: "#fff", padding: "6px 9px", fontSize: 11, fontWeight: 950, boxShadow: `0 0 14px ${alpha(accent, "18")}` }}>{children}</span>;
}

function Logo({ src, name, accent, size = 46, round = 16 }: { src?: string | null; name: string; accent: string; size?: number; round?: number }) {
  return (
    <div style={{ width: size, height: size, borderRadius: round, overflow: "hidden", flex: "0 0 auto", display: "grid", placeItems: "center", border: `1px solid ${alpha(accent, "80")}`, background: `radial-gradient(circle at 35% 25%, ${alpha(accent, "44")}, rgba(0,0,0,.62))`, color: accent, fontWeight: 1000 }}>
      {src ? <img src={src} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : String(name || "CL").slice(0, 2).toUpperCase()}
    </div>
  );
}

function StatTile({ value, label, accent, sub }: { value: React.ReactNode; label: string; accent: string; sub?: string }) {
  return <div style={{ ...card(accent, 11), textAlign: "center" }}><div style={{ fontSize: 24, fontWeight: 1000, color: "#fff" }}>{value}</div><div style={{ fontSize: 10.5, opacity: .74, marginTop: 2, textTransform: "uppercase", letterSpacing: .25 }}>{label}</div>{sub ? <div style={{ fontSize: 10, opacity: .58, marginTop: 2 }}>{sub}</div> : null}</div>;
}

function EmptyState({ title, body, accent }: { title: string; body: string; accent: string }) {
  return <div style={{ ...card(accent), minHeight: 108, display: "grid", alignContent: "center", textAlign: "center" }}><div style={{ color: accent, fontWeight: 1000, fontSize: 18 }}>{title}</div><div style={{ marginTop: 8, fontSize: 12.5, opacity: .72, lineHeight: 1.35 }}>{body}</div></div>;
}

function ProgressBar({ value, total, color, label }: { value: number; total: number; color: string; label: string }) {
  const pct = total > 0 ? clamp(Math.round((value / total) * 100)) : 0;
  return <div style={{ display: "grid", gap: 5 }}><div style={{ display: "flex", justifyContent: "space-between", gap: 8, fontSize: 11, fontWeight: 950 }}><span>{label}</span><span style={{ color }}>{value}/{total}</span></div><div style={{ height: 8, borderRadius: 999, background: "rgba(255,255,255,.08)", overflow: "hidden", border: "1px solid rgba(255,255,255,.08)" }}><div style={{ width: `${pct}%`, height: "100%", borderRadius: 999, background: `linear-gradient(90deg, ${color}, rgba(255,255,255,.65))`, boxShadow: `0 0 14px ${color}` }} /></div></div>;
}

function DetailRow({ label, value, accent }: { label: string; value: React.ReactNode; accent: string }) {
  return <div style={{ display: "grid", gridTemplateColumns: "120px 1fr", gap: 10, padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,.07)", alignItems: "start" }}><div style={{ color: alpha(accent, "ff"), fontSize: 11, fontWeight: 1000, textTransform: "uppercase", opacity: .9 }}>{label}</div><div style={{ fontSize: 12.5, opacity: .86, lineHeight: 1.35 }}>{value}</div></div>;
}

function QuickAction({ title, body, accent, onClick }: { title: string; body: string; accent: string; onClick: () => void }) {
  return <button type="button" onClick={onClick} style={{ ...card(accent, 13), color: "#fff", textAlign: "left", minHeight: 92 }}><div style={{ color: accent, fontWeight: 1000, fontSize: 14 }}>{title}</div><div style={{ marginTop: 6, fontSize: 11.5, opacity: .74, lineHeight: 1.3 }}>{body}</div></button>;
}

function TimelineRow({ time, title, body, accent, icon = "•" }: { time: string; title: string; body: string; accent: string; icon?: string }) {
  return <div style={{ display: "grid", gridTemplateColumns: "58px 34px 1fr", gap: 9, alignItems: "start" }}><div style={{ color: accent, fontWeight: 1000, fontSize: 11, textAlign: "right", paddingTop: 6 }}>{time}</div><div style={{ width: 30, height: 30, borderRadius: 999, display: "grid", placeItems: "center", border: `1px solid ${alpha(accent, "66")}`, background: alpha(accent, "20"), color: accent, fontWeight: 1000 }}>{icon}</div><div style={{ ...glass(accent, 10) }}><div style={{ fontWeight: 1000, fontSize: 13 }}>{title}</div><div style={{ marginTop: 4, fontSize: 11.5, opacity: .74, lineHeight: 1.35 }}>{body}</div></div></div>;
}

function MiniCalendar({ accent, events, matches }: { accent: string; events: ClubEvent[]; matches: ClubMatch[] }) {
  const today = new Date();
  const days = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const key = d.toISOString().slice(0, 10);
    const count = events.filter((e) => String(e.startsAt || "").slice(0, 10) === key).length + matches.filter((m) => String(m.startsAt || "").slice(0, 10) === key).length;
    return { d, count };
  });
  return <div style={{ display: "grid", gridTemplateColumns: "repeat(7,minmax(0,1fr))", gap: 7 }}>{days.map(({ d, count }) => <div key={d.toISOString()} style={{ ...glass(count ? accent : "#ffffff", 8), textAlign: "center", minHeight: 58, opacity: count ? 1 : .72 }}><div style={{ fontSize: 10, opacity: .65, textTransform: "uppercase" }}>{d.toLocaleDateString("fr-FR", { weekday: "short" })}</div><div style={{ fontWeight: 1000, fontSize: 17, color: count ? accent : "#fff" }}>{d.getDate()}</div>{count ? <div style={{ margin: "4px auto 0", width: 8, height: 8, borderRadius: 999, background: accent, boxShadow: `0 0 12px ${accent}` }} /> : null}</div>)}</div>;
}

function PresenceDots({ convocations, accent }: { convocations: ClubConvocation[]; accent: string }) {
  const statuses = ["present", "uncertain", "absent", "pending"];
  return <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>{convocations.slice(0, 26).map((c, i) => { const st = statusLabel(c.status); return <div key={`${c.id}-${i}`} title={`${c.displayName} • ${st.label}`} style={{ width: 26, height: 26, borderRadius: 999, border: `1px solid ${alpha(st.color, "cc")}`, background: `radial-gradient(circle at 35% 25%, ${alpha(st.color, "50")}, rgba(0,0,0,.55))`, color: st.color, display: "grid", placeItems: "center", fontSize: 10, fontWeight: 1000 }}>{c.avatarUrl ? <img src={c.avatarUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 999 }} /> : st.short}</div>; })}{convocations.length === 0 ? <span style={{ fontSize: 12, opacity: .65 }}>Aucune convocation liée</span> : null}{convocations.length > 26 ? <MetaChip accent={accent}>+{convocations.length - 26}</MetaChip> : null}</div>;
}

export default function OnlineClubsPanel({ signedIn = true, accent = "#22e6ff" }: Props) {
  const [clubs, setClubs] = React.useState<Club[]>([]);
  const [teamsByClub, setTeamsByClub] = React.useState<Record<string, ClubTeam[]>>({});
  const [invites, setInvites] = React.useState<ClubInvite[]>([]);
  const [localClubTeams, setLocalClubTeams] = React.useState<any[]>([]);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [newClubName, setNewClubName] = React.useState("");

  const [selectedClubId, setSelectedClubId] = React.useState<string | null>(null);
  const [selectedClub, setSelectedClub] = React.useState<Club | null>(null);
  const [clubTeams, setClubTeams] = React.useState<ClubTeam[]>([]);
  const [clubMembers, setClubMembers] = React.useState<ClubMember[]>([]);
  const [clubPosts, setClubPosts] = React.useState<ClubPost[]>([]);
  const [clubEvents, setClubEvents] = React.useState<ClubEvent[]>([]);
  const [clubMatches, setClubMatches] = React.useState<ClubMatch[]>([]);
  const [clubConvocations, setClubConvocations] = React.useState<ClubConvocation[]>([]);
  const [clubTab, setClubTab] = React.useState<ClubTab>("dashboard");
  const [fullscreenMode, setFullscreenMode] = React.useState<FullscreenMode>("none");
  const [showClubInfo, setShowClubInfo] = React.useState(false);
  const [teamFilter, setTeamFilter] = React.useState<string>("all");

  const [postText, setPostText] = React.useState("");
  const [postTitle, setPostTitle] = React.useState("");
  const [inviteQuery, setInviteQuery] = React.useState("");
  const [inviteResults, setInviteResults] = React.useState<OnlineFriendUser[]>([]);
  const [selectedInviteTeam, setSelectedInviteTeam] = React.useState<string>("");
  const [eventTitle, setEventTitle] = React.useState("");
  const [eventDate, setEventDate] = React.useState("");
  const [eventLocation, setEventLocation] = React.useState("");
  const [matchTeamId, setMatchTeamId] = React.useState("");
  const [matchOpponent, setMatchOpponent] = React.useState("");
  const [matchDate, setMatchDate] = React.useState("");
  const [matchLocation, setMatchLocation] = React.useState("");

  const reload = React.useCallback(async () => {
    setError(null);
    setLocalClubTeams(loadTeams().filter((t: any) => String(t.teamKind || "leisure") === "club" && !String(t.syncedClubTeamId || "")));
    if (!signedIn) return;
    setBusy(true);
    try {
      const [nextClubs, nextInvites] = await Promise.all([listMyClubs(), listClubInvites().catch(() => [])]);
      setClubs(nextClubs);
      setInvites(nextInvites);
      const entries = await Promise.all(nextClubs.map(async (club) => [club.id, await listClubTeams(club.id).catch(() => [])] as const));
      setTeamsByClub(Object.fromEntries(entries));
    } catch (e: any) {
      setError(e?.message || "Impossible de charger les clubs");
    } finally {
      setBusy(false);
    }
  }, [signedIn]);

  const openClub = React.useCallback(async (clubId: string, tab: ClubTab = "dashboard") => {
    if (!clubId || !signedIn) return;
    setBusy(true);
    setError(null);
    try {
      const detail = await getClubDetail(clubId);
      setSelectedClubId(clubId);
      setSelectedClub(detail.club);
      setClubTeams(detail.teams || []);
      setClubMembers(detail.members || []);
      setClubPosts(detail.posts || []);
      setClubEvents(detail.events || []);
      setClubMatches(detail.matches || []);
      setClubConvocations(detail.convocations || []);
      setClubTab(tab);
      setFullscreenMode("club");
      setSelectedInviteTeam((detail.teams || [])[0]?.id || "");
      setMatchTeamId((detail.teams || [])[0]?.id || "");
    } catch (e: any) {
      setError(e?.message || "Impossible d’ouvrir le club");
    } finally {
      setBusy(false);
    }
  }, [signedIn]);

  React.useEffect(() => { reload(); }, [reload]);

  const selectedRole = String(selectedClub?.role || "member").toLowerCase();
  const canManage = MANAGER_ROLES.has(selectedRole);
  const totalMembers = clubMembers.length || selectedClub?.membersCount || 0;
  const allSports = (selectedClub?.sports || []).length ? (selectedClub?.sports || []) : SPORTS.slice(0, 4);
  const filteredTeams = React.useMemo(() => teamFilter === "all" ? clubTeams : clubTeams.filter((t) => t.id === teamFilter), [clubTeams, teamFilter]);
  const filteredMatches = React.useMemo(() => teamFilter === "all" ? clubMatches : clubMatches.filter((m) => String(m.clubTeamId || "") === teamFilter), [clubMatches, teamFilter]);
  const sortedEvents = React.useMemo(() => [...clubEvents].sort((a,b) => String(a.startsAt || "9999").localeCompare(String(b.startsAt || "9999"))), [clubEvents]);
  const upcomingMatches = React.useMemo(() => [...clubMatches].sort((a,b) => String(a.startsAt || "9999").localeCompare(String(b.startsAt || "9999"))), [clubMatches]);
  const nextMatch = upcomingMatches[0] || null;
  const seasonWins = clubMatches.filter((m) => String(m.status || "") === "finished" && Number(m.scoreFor || 0) > Number(m.scoreAgainst || 0)).length;
  const seasonDraws = clubMatches.filter((m) => String(m.status || "") === "finished" && Number(m.scoreFor || 0) === Number(m.scoreAgainst || 0)).length;
  const seasonLosses = clubMatches.filter((m) => String(m.status || "") === "finished" && Number(m.scoreFor || 0) < Number(m.scoreAgainst || 0)).length;
  const goalsFor = clubMatches.reduce((s, m) => s + Number(m.scoreFor || 0), 0);
  const goalsAgainst = clubMatches.reduce((s, m) => s + Number(m.scoreAgainst || 0), 0);

  async function refreshSelected(tab = clubTab) {
    if (selectedClubId) await openClub(selectedClubId, tab);
  }

  async function handleCreateClub() {
    const name = newClubName.trim();
    if (!name || !signedIn) return;
    setBusy(true);
    try {
      const club = await createClub({ name, sports: SPORTS, visibility: "members" });
      setNewClubName("");
      await reload();
      await openClub(club.id, "dashboard");
    } catch (e: any) {
      setError(e?.message || "Création club impossible");
    } finally { setBusy(false); }
  }

  async function syncLocalTeam(t: any) {
    if (!signedIn) return;
    setBusy(true);
    setError(null);
    try {
      const clubName = String(t.clubName || t.name || "Club").trim();
      const club = await createClub({ name: clubName, sports: t.allSports ? SPORTS : (Array.isArray(t.sportIds) ? t.sportIds : [teamMainSport(t)]), logoUrl: t.logoUrl || t.logoDataUrl || null, visibility: "members" });
      const team = await upsertClubTeam({ clubId: club.id, localTeamId: t.id, sport: teamMainSport(t), name: t.name, logoUrl: t.logoUrl || null, logoDataUrl: t.logoDataUrl || null, description: t.description || "", playerIds: Array.isArray(t.playerIds) ? t.playerIds : [] });
      upsertTeam({ ...t, syncedClubId: club.id, syncedClubTeamId: team.id, teamKind: "club" });
      await reload();
      await openClub(club.id, "dashboard");
    } catch (e: any) { setError(e?.message || "Synchronisation impossible"); }
    finally { setBusy(false); }
  }

  async function handleInvite(inviteId: string, status: "accepted" | "refused") {
    setBusy(true);
    try { await respondClubInvite(inviteId, status); await reload(); }
    catch (e: any) { setError(e?.message || "Réponse impossible"); }
    finally { setBusy(false); }
  }

  async function createPost() {
    if (!selectedClubId || !postText.trim()) return;
    setBusy(true);
    try {
      await createClubPost({ clubId: selectedClubId, title: postTitle.trim(), body: postText.trim(), type: "post" });
      setPostText(""); setPostTitle(""); await refreshSelected("actu");
    } catch (e: any) { setError(e?.message || "Publication impossible"); }
    finally { setBusy(false); }
  }

  async function createEvent() {
    if (!selectedClubId || !eventTitle.trim()) return;
    setBusy(true);
    try {
      await createClubEvent({ clubId: selectedClubId, title: eventTitle.trim(), startsAt: eventDate ? new Date(eventDate).toISOString() : null, location: eventLocation.trim(), type: "event" });
      setEventTitle(""); setEventDate(""); setEventLocation(""); await refreshSelected("agenda");
    } catch (e: any) { setError(e?.message || "Évènement impossible"); }
    finally { setBusy(false); }
  }

  async function createMatch() {
    if (!selectedClubId || !matchOpponent.trim()) return;
    setBusy(true);
    try {
      const team = clubTeams.find((t) => t.id === matchTeamId) || clubTeams[0];
      await createClubMatch({
        clubId: selectedClubId,
        clubTeamId: team?.id || null,
        sport: team?.sport || "generic",
        title: `${team?.name || selectedClub?.name || "Club"} vs ${matchOpponent.trim()}`,
        opponent: matchOpponent.trim(),
        startsAt: matchDate ? new Date(matchDate).toISOString() : null,
        location: matchLocation.trim(),
        status: "scheduled",
      });
      setMatchOpponent(""); setMatchDate(""); setMatchLocation(""); await refreshSelected("matchs");
    } catch (e: any) { setError(e?.message || "Match impossible"); }
    finally { setBusy(false); }
  }

  async function runUserSearch() {
    if (inviteQuery.trim().length < 2) return;
    setBusy(true);
    try { setInviteResults(await searchUsers(inviteQuery.trim())); }
    catch (e: any) { setError(e?.message || "Recherche impossible"); }
    finally { setBusy(false); }
  }

  async function sendClubInvite(user: OnlineFriendUser) {
    if (!selectedClubId || !user?.id) return;
    setBusy(true);
    try {
      await inviteUserToClub({ clubId: selectedClubId, clubTeamId: selectedInviteTeam || null, targetUserId: user.id, role: "player" });
      setInviteQuery(""); setInviteResults([]); await refreshSelected("effectif");
    } catch (e: any) { setError(e?.message || "Invitation impossible"); }
    finally { setBusy(false); }
  }

  async function answerConvocation(c: ClubConvocation, status: "present" | "absent" | "uncertain") {
    if (!selectedClubId) return;
    setBusy(true);
    try { await respondClubConvocation({ clubId: selectedClubId, convocationId: c.id, status }); await refreshSelected("convocs"); }
    catch (e: any) { setError(e?.message || "Réponse impossible"); }
    finally { setBusy(false); }
  }

  function renderTeamFilter() {
    if (!clubTeams.length) return null;
    return <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 2 }}><button type="button" onClick={() => setTeamFilter("all")} style={navButton(accent, teamFilter === "all")}>Toutes</button>{clubTeams.map((t) => <button key={t.id} type="button" onClick={() => setTeamFilter(t.id)} style={navButton(accent, teamFilter === t.id)}>{t.name}</button>)}</div>;
  }

  function renderClubHeader() {
    if (!selectedClub) return null;
    const sportsLine = allSports.map(sportName).join(" • ") || "Multisports";
    return (
      <>
        <div style={{ position: "sticky", top: 0, zIndex: 25, padding: "12px 12px 8px", background: "linear-gradient(180deg, rgba(3,9,17,.98), rgba(3,9,17,.88) 70%, rgba(3,9,17,0))" }}>
          <div style={{ display: "grid", gridTemplateColumns: "48px 1fr 48px", alignItems: "center", gap: 10 }}>
            <button type="button" onClick={() => { setFullscreenMode("none"); setSelectedClubId(null); }} style={iconButton(accent)}>←</button>
            <div style={{ textAlign: "center", minWidth: 0 }}>
              <div style={{ color: accent, fontSize: 20, fontWeight: 1000, letterSpacing: .5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{selectedClub.name}</div>
              <div style={{ fontSize: 11, opacity: .72 }}>{roleLabel(selectedClub.role)} • {sportsLine}</div>
            </div>
            <button type="button" onClick={() => setShowClubInfo(true)} style={iconButton(accent)}>i</button>
          </div>
        </div>

        <div style={{ padding: "0 12px 12px" }}>
          <div style={{ ...glass(accent, 0), overflow: "hidden", position: "relative" }}>
            <div style={{ minHeight: 174, background: selectedClub.coverUrl ? `linear-gradient(180deg, rgba(0,0,0,.05), rgba(0,0,0,.76)), url(${selectedClub.coverUrl}) center/cover` : `radial-gradient(circle at 50% 0%, ${alpha(accent, "30")}, rgba(2,8,15,.84) 58%, rgba(2,8,15,.97))`, display: "grid", placeItems: "center", padding: 16 }}>
              <div style={{ display: "grid", justifyItems: "center", gap: 9 }}>
                <Logo src={selectedClub.logoUrl} name={selectedClub.name} accent={accent} size={90} round={26} />
                <div style={{ color: accent, fontSize: 27, fontWeight: 1000, textAlign: "center", textShadow: `0 0 18px ${alpha(accent, "70")}` }}>{selectedClub.name}</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, justifyContent: "center" }}>
                  <MetaChip accent={accent}>{totalMembers} membres</MetaChip>
                  <MetaChip accent={accent}>{clubTeams.length || selectedClub.teamsCount || 0} équipes</MetaChip>
                  <MetaChip accent={accent}>{selectedClub.visibility || "members"}</MetaChip>
                </div>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 1, background: alpha(accent, "2a"), borderTop: `1px solid ${alpha(accent, "28")}` }}>
              <StatTile accent={accent} value={clubMatches.length} label="matchs" sub="saison" />
              <StatTile accent="#7cff9d" value={clubConvocations.length} label="convocs" sub="joueurs" />
              <StatTile accent="#ffc857" value={clubPosts.length} label="actus" sub="publiées" />
              <StatTile accent="#b58cff" value={clubEvents.length} label="agenda" sub="à venir" />
            </div>
          </div>
        </div>

        <div style={{ position: "sticky", top: 68, zIndex: 24, padding: "0 12px 10px", background: "linear-gradient(180deg, rgba(3,9,17,.96), rgba(3,9,17,.70), rgba(3,9,17,0))" }}>
          <div style={{ display: "flex", overflowX: "auto", gap: 8, paddingBottom: 2, WebkitOverflowScrolling: "touch" }}>
            {TABS.map((tab) => <button key={tab.id} type="button" onClick={() => setClubTab(tab.id)} style={navButton(accent, clubTab === tab.id)}>{tab.short}</button>)}
          </div>
        </div>
      </>
    );
  }

  function MatchCard({ match, compact = false }: { match: ClubMatch; compact?: boolean }) {
    const conv = clubConvocations.filter((c) => c.clubMatchId === match.id);
    const stats = countByStatus(conv);
    const team = clubTeams.find((t) => t.id === match.clubTeamId);
    const isDone = String(match.status || "") === "finished" || match.scoreFor != null || match.scoreAgainst != null;
    return <div style={{ ...glass(accent, compact ? 11 : 14), display: "grid", gap: 10 }}>
      <div style={{ display: "grid", gridTemplateColumns: "50px 1fr auto", gap: 10, alignItems: "center" }}>
        <Logo src={team?.logoUrl || team?.logoDataUrl || selectedClub?.logoUrl} name={team?.name || selectedClub?.name || "Club"} accent={accent} size={50} round={17} />
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 1000, fontSize: compact ? 14 : 16, overflowWrap: "anywhere" }}>{match.title}</div>
          <div style={{ marginTop: 4, fontSize: 11.5, opacity: .72 }}>{formatDateTime(match.startsAt)}{match.location ? ` • ${match.location}` : ""}</div>
          <div style={{ marginTop: 6, display: "flex", gap: 6, flexWrap: "wrap" }}><MetaChip accent={accent}>{sportIcon(match.sport)} {sportName(match.sport)}</MetaChip><MetaChip accent={accent}>{team?.name || match.teamName || "Équipe club"}</MetaChip></div>
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{ color: isDone ? "#7cff9d" : accent, fontSize: 20, fontWeight: 1000 }}>{isDone ? `${match.scoreFor ?? 0}-${match.scoreAgainst ?? 0}` : "VS"}</div>
          <div style={{ fontSize: 10.5, opacity: .65 }}>{match.opponent || "Adversaire"}</div>
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 7 }}>
        <StatTile accent="#7cff9d" value={stats.present} label="présents" />
        <StatTile accent="#ffc857" value={stats.uncertain} label="incertains" />
        <StatTile accent="#ff6b7d" value={stats.absent} label="absents" />
        <StatTile accent={accent} value={stats.pending} label="attente" />
      </div>
      <PresenceDots convocations={conv} accent={accent} />
    </div>;
  }

  function PostCard({ post }: { post: ClubPost }) {
    return <div style={{ ...glass(accent, 12), display: "grid", gap: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}><MetaChip accent={accent}>{post.type || "actu"}</MetaChip><span style={{ fontSize: 11, opacity: .65 }}>{formatDateTime(post.createdAt)}</span></div>
      <div style={{ fontWeight: 1000, fontSize: 16, overflowWrap: "anywhere" }}>{post.title || "Publication du club"}</div>
      <div style={{ fontSize: 13, opacity: .82, lineHeight: 1.45, whiteSpace: "pre-wrap" }}>{post.body || ""}</div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}><MetaChip accent="#7cff9d">Commentaires</MetaChip><MetaChip accent="#ffc857">Réactions</MetaChip><MetaChip accent="#b58cff">Épingler</MetaChip></div>
    </div>;
  }

  function renderDashboard() {
    const convStats = countByStatus(clubConvocations, nextMatch?.id);
    const globalConvStats = countByStatus(clubConvocations);
    const latestPosts = clubPosts.slice(0, 5);
    const nextEvents = sortedEvents.slice(0, 5);
    const presenceRate = globalConvStats.total ? Math.round((globalConvStats.present / globalConvStats.total) * 100) : 0;
    const staff = clubMembers.filter((m) => ["owner", "admin", "coach", "captain"].includes(String(m.role || "").toLowerCase())).slice(0, 8);
    const alerts = [
      { title: "Réponses convocation", value: globalConvStats.pending, body: "joueur(s) à relancer", color: accent, tab: "convocs" as ClubTab },
      { title: "Matchs à planifier", value: clubTeams.length ? Math.max(0, clubTeams.length - upcomingMatches.length) : 0, body: "équipe(s) sans prochain match", color: "#ffc857", tab: "matchs" as ClubTab },
      { title: "Effectif à structurer", value: Math.max(0, totalMembers - clubMembers.filter((m) => String(m.role || "member") !== "member").length), body: "membre(s) sans rôle précis", color: "#b58cff", tab: "effectif" as ClubTab },
    ];
    return <div style={{ display: "grid", gap: 14 }}>
      <div style={{ ...card(accent), padding: 0, overflow: "hidden" }}>
        <div style={{ padding: 15, display: "grid", gap: 12 }}>
          <SectionTitle accent={accent} centered>Tableau de bord complet</SectionTitle>
          <div style={{ fontSize: 12.5, opacity: .78, textAlign: "center", lineHeight: 1.35 }}>Vue président / coach : prochaines échéances, convocations, effectif, activité du club, santé sportive et actions rapides.</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 8 }}>
            <StatTile accent={accent} value={totalMembers} label="membres" sub="club" />
            <StatTile accent="#7cff9d" value={clubTeams.length} label="équipes" sub="multisports" />
            <StatTile accent="#ffc857" value={`${seasonWins}-${seasonDraws}-${seasonLosses}`} label="bilan" sub="V-N-D" />
            <StatTile accent="#b58cff" value={`${presenceRate}%`} label="présence" sub="convocs" />
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 1, background: alpha(accent, "20") }}>
          <StatTile accent="#7cff9d" value={goalsFor} label="marqués" sub="points/buts" />
          <StatTile accent="#ff6b7d" value={goalsAgainst} label="encaissés" sub="contre" />
          <StatTile accent={accent} value={clubPosts.length + clubEvents.length} label="activité" sub="actus + agenda" />
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 10 }}>
        {alerts.map((a) => <button key={a.title} type="button" onClick={() => setClubTab(a.tab)} style={{ ...card(a.color), color: "#fff", textAlign: "left", minHeight: 108 }}><div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}><div style={{ color: a.color, fontWeight: 1000 }}>{a.title}</div><div style={{ fontSize: 28, fontWeight: 1000 }}>{a.value}</div></div><div style={{ marginTop: 8, fontSize: 12, opacity: .72 }}>{a.body}</div></button>)}
      </div>

      {nextMatch ? <div style={card(accent)}><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}><SectionTitle accent={accent}>Prochain match</SectionTitle><button type="button" onClick={() => setClubTab("matchs")} style={navButton(accent, true)}>Voir fiche</button></div><div style={{ marginTop: 12 }}><MatchCard match={nextMatch} /></div><div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 8, marginTop: 12 }}><ProgressBar value={convStats.present} total={Math.max(convStats.total, 1)} color="#7cff9d" label="Présents" /><ProgressBar value={convStats.uncertain} total={Math.max(convStats.total, 1)} color="#ffc857" label="Incertains" /><ProgressBar value={convStats.absent} total={Math.max(convStats.total, 1)} color="#ff6b7d" label="Absents" /></div></div> : <EmptyState accent={accent} title="Aucun prochain match" body="Crée un match pour faire apparaître la fiche, les convocations, le suivi des réponses et l’agenda." />}

      <div style={{ display: "grid", gridTemplateColumns: "1.15fr .85fr", gap: 12 }}>
        <div style={card(accent)}><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><SectionTitle accent={accent}>Semaine du club</SectionTitle><MetaChip accent={accent}>{upcomingMatches.length + nextEvents.length} échéance(s)</MetaChip></div><div style={{ marginTop: 12 }}><MiniCalendar accent={accent} events={clubEvents} matches={clubMatches} /></div></div>
        <div style={card(accent)}><SectionTitle accent={accent}>Staff & responsabilités</SectionTitle><div style={{ display: "grid", gap: 8, marginTop: 12 }}>{staff.length ? staff.map((m, i) => <div key={m.id} style={{ ...glass(teamColor(i, accent)), display: "grid", gridTemplateColumns: "38px 1fr auto", gap: 9, alignItems: "center" }}><Logo src={m.avatarUrl} name={m.displayName} accent={teamColor(i, accent)} size={38} round={999} /><div style={{ minWidth: 0 }}><div style={{ fontWeight: 1000, overflowWrap: "anywhere" }}>{m.displayName}</div><div style={{ fontSize: 11, opacity: .72 }}>{roleLabel(m.role)}</div></div><MetaChip accent={teamColor(i, accent)}>Actif</MetaChip></div>) : <div style={{ fontSize: 12, opacity: .72 }}>Aucun rôle staff renseigné pour l’instant.</div>}</div></div>
      </div>

      <div style={card(accent)}><SectionTitle accent={accent}>Actions club</SectionTitle><div style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 10, marginTop: 12 }}>
        <QuickAction accent={accent} title="Convocation" body="Suivre les présents, absents et incertains." onClick={() => setClubTab("convocs")} />
        <QuickAction accent="#7cff9d" title="Effectif" body="Inviter, classer, affecter les rôles." onClick={() => setClubTab("effectif")} />
        <QuickAction accent="#ffc857" title="Agenda" body="Entraînement, réunion, tournoi, buvette." onClick={() => setClubTab("agenda")} />
        <QuickAction accent="#b58cff" title="Documents" body="Licences, PV, feuilles de match, sponsors." onClick={() => setClubTab("documents")} />
      </div></div>

      <div style={card(accent)}><SectionTitle accent={accent}>Fil d’activité enrichi</SectionTitle><div style={{ display: "grid", gap: 10, marginTop: 12 }}>
        {latestPosts.map((p) => <TimelineRow key={p.id} time={formatShortDate(p.createdAt)} title={p.title || "Publication"} body={p.body || "Actualité du club"} accent={accent} icon="📢" />)}
        {clubConvocations.slice(0, 3).map((c) => <TimelineRow key={`cv-${c.id}`} time={formatShortDate(c.startsAt)} title={`${c.displayName} • ${statusLabel(c.status).label}`} body={c.matchTitle || "Réponse à une convocation"} accent={statusLabel(c.status).color} icon={statusLabel(c.status).short} />)}
        {clubMatches.slice(0, 3).map((m) => <TimelineRow key={`tm-${m.id}`} time={formatShortDate(m.startsAt)} title={m.title} body={`Match ${sportName(m.sport)} • ${m.location || "lieu à définir"}`} accent="#ffc857" icon="VS" />)}
        {!latestPosts.length && !clubMatches.length && !clubConvocations.length ? <EmptyState accent={accent} title="Fil vide" body="Les publications, résultats, convocations et évènements apparaîtront ici." /> : null}
      </div></div>
    </div>;
  }
  function renderActu() {
    return <div style={{ display: "grid", gap: 12 }}>
      {canManage ? <div style={card(accent)}><SectionTitle accent={accent}>Créer une publication</SectionTitle><div style={{ display: "grid", gap: 9, marginTop: 10 }}><input value={postTitle} onChange={(e) => setPostTitle(e.target.value)} placeholder="Titre : Convocation, résultat, info importante..." style={inputStyle(accent)} /><textarea value={postText} onChange={(e) => setPostText(e.target.value)} placeholder="Message visible par les membres du club" rows={4} style={{ ...inputStyle(accent), resize: "vertical" }} /><button type="button" disabled={!postText.trim() || busy} onClick={createPost} style={{ ...navButton(accent, true), width: "100%" }}>Publier dans le fil</button></div></div> : null}
      <div style={card(accent)}><SectionTitle accent={accent}>À la une</SectionTitle><div style={{ display: "grid", gap: 10, marginTop: 12 }}>{clubPosts.length ? clubPosts.map((p) => <PostCard key={p.id} post={p} />) : <EmptyState accent={accent} title="Aucune actualité" body="Publie les informations de vie du club : convocation, changement d’horaire, photos, résultats, messages du bureau." />}</div></div>
    </div>;
  }

  function renderMatchs() {
    const statusBuckets = [
      { id: "scheduled", label: "À jouer", count: filteredMatches.filter((m) => String(m.status || "scheduled") === "scheduled").length, color: accent },
      { id: "finished", label: "Terminés", count: filteredMatches.filter((m) => String(m.status || "") === "finished" || m.scoreFor != null || m.scoreAgainst != null).length, color: "#7cff9d" },
      { id: "late", label: "À compléter", count: filteredMatches.filter((m) => !m.startsAt).length, color: "#ffc857" },
      { id: "convocs", label: "Avec convocs", count: new Set(clubConvocations.map((c) => c.clubMatchId)).size, color: "#b58cff" },
    ];
    return <div style={{ display: "grid", gap: 12 }}>
      {renderTeamFilter()}
      <div style={card(accent)}><SectionTitle accent={accent}>Centre des matchs</SectionTitle><div style={{ marginTop: 8, fontSize: 12.5, opacity: .76 }}>Fiches rencontre prêtes pour gérer adversaire, lieu, horaire, score, convocations, composition, feuille de match et résumé.</div><div style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 8, marginTop: 12 }}>{statusBuckets.map((b) => <StatTile key={b.id} accent={b.color} value={b.count} label={b.label} />)}</div></div>
      <div style={card(accent)}><SectionTitle accent={accent}>Bilan sportif</SectionTitle><div style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 8, marginTop: 12 }}><StatTile accent="#7cff9d" value={seasonWins} label="victoires" /><StatTile accent="#ffc857" value={seasonDraws} label="nuls" /><StatTile accent="#ff6b7d" value={seasonLosses} label="défaites" /><StatTile accent={accent} value={`${goalsFor}-${goalsAgainst}`} label="points/buts" /></div><div style={{ marginTop: 12, display: "grid", gap: 9 }}><ProgressBar value={seasonWins} total={Math.max(clubMatches.length, 1)} color="#7cff9d" label="Ratio victoires" /><ProgressBar value={goalsFor} total={Math.max(goalsFor + goalsAgainst, 1)} color={accent} label="Part offensive" /></div></div>
      {canManage ? <div style={card(accent)}><SectionTitle accent={accent}>Planifier une rencontre complète</SectionTitle><div style={{ marginTop: 8, fontSize: 12, opacity: .72 }}>La rencontre créée alimentera automatiquement le tableau de bord, l’agenda et le centre de convocations.</div><div style={{ display: "grid", gap: 9, marginTop: 10 }}><select value={matchTeamId} onChange={(e) => setMatchTeamId(e.target.value)} style={inputStyle(accent)}>{clubTeams.map((team) => <option key={team.id} value={team.id}>{team.name} • {sportName(team.sport)}</option>)}</select><input value={matchOpponent} onChange={(e) => setMatchOpponent(e.target.value)} placeholder="Adversaire" style={inputStyle(accent)} /><input value={matchDate} onChange={(e) => setMatchDate(e.target.value)} type="datetime-local" style={inputStyle(accent)} /><input value={matchLocation} onChange={(e) => setMatchLocation(e.target.value)} placeholder="Lieu / terrain / salle" style={inputStyle(accent)} /><button type="button" disabled={!matchOpponent.trim() || busy} onClick={createMatch} style={{ ...navButton(accent, true), width: "100%" }}>Créer la fiche match</button></div></div> : null}
      <div style={{ display: "grid", gap: 10 }}>{filteredMatches.length ? filteredMatches.map((m) => <div key={m.id} style={{ display: "grid", gap: 9 }}><MatchCard match={m} /><div style={{ ...glass(accent), display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 8 }}><MetaChip accent={accent}>Compo à préparer</MetaChip><MetaChip accent="#7cff9d">Feuille de match</MetaChip><MetaChip accent="#ffc857">Résumé</MetaChip><MetaChip accent="#b58cff">Stats</MetaChip></div></div>) : <EmptyState accent={accent} title="Aucun match" body="Les matchs du club apparaîtront ici avec score, convocations, réponses et détails de rencontre." />}</div>
    </div>;
  }
  function renderConvocs() {
    const byMatch = filteredMatches.map((m) => ({ match: m, convocs: clubConvocations.filter((c) => c.clubMatchId === m.id) }));
    const allStats = countByStatus(clubConvocations);
    return <div style={{ display: "grid", gap: 12 }}>
      {renderTeamFilter()}
      <div style={card(accent)}><SectionTitle accent={accent}>Centre des convocations</SectionTitle><div style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 8, marginTop: 12 }}><StatTile accent="#7cff9d" value={allStats.present} label="présents" /><StatTile accent="#ffc857" value={allStats.uncertain} label="incertains" /><StatTile accent="#ff6b7d" value={allStats.absent} label="absents" /><StatTile accent={accent} value={allStats.pending} label="attente" /></div><div style={{ marginTop: 12 }}><ProgressBar value={allStats.present} total={Math.max(allStats.total, 1)} color="#7cff9d" label="Taux de présence global" /></div></div>
      {byMatch.length ? byMatch.map(({ match, convocs }) => { const s = countByStatus(convocs); return <div key={match.id} style={card(accent)}><div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}><div><div style={{ color: accent, fontWeight: 1000 }}>{match.title}</div><div style={{ marginTop: 4, fontSize: 12, opacity: .72 }}>{formatDateTime(match.startsAt)} • {match.location || "lieu à définir"}</div></div><MetaChip accent={accent}>{s.present}/{s.total} présents</MetaChip></div><div style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 7, marginTop: 12 }}><StatTile accent="#7cff9d" value={s.present} label="P" /><StatTile accent="#ffc857" value={s.uncertain} label="?" /><StatTile accent="#ff6b7d" value={s.absent} label="A" /><StatTile accent={accent} value={s.pending} label="..." /></div><div style={{ display: "grid", gap: 8, marginTop: 12 }}>{convocs.length ? convocs.map((c) => { const st = statusLabel(c.status); return <div key={c.id} style={{ ...glass(st.color, 10), display: "grid", gridTemplateColumns: "42px 1fr auto", gap: 10, alignItems: "center" }}><Logo src={c.avatarUrl} name={c.displayName} accent={st.color} size={42} round={999} /><div style={{ minWidth: 0 }}><div style={{ fontWeight: 1000, overflowWrap: "anywhere" }}>{c.displayName}</div><div style={{ fontSize: 11, opacity: .72 }}>{st.label}{c.comment ? ` • ${c.comment}` : ""}</div></div><div style={{ display: "flex", gap: 5 }}><button type="button" onClick={() => answerConvocation(c, "present")} style={navButton("#7cff9d", c.status === "present")}>P</button><button type="button" onClick={() => answerConvocation(c, "uncertain")} style={navButton("#ffc857", c.status === "uncertain")}>?</button><button type="button" onClick={() => answerConvocation(c, "absent")} style={navButton("#ff6b7d", c.status === "absent")}>A</button></div></div>; }) : <EmptyState accent={accent} title="Aucun joueur convoqué" body="Les joueurs invités au match apparaîtront ici avec leurs réponses." />}</div></div>; }) : <EmptyState accent={accent} title="Aucune convocation" body="Crée un match et rattache l’effectif pour gérer les présences comme dans SportEasy." />}
    </div>;
  }

  function renderAgenda() {
    const items = sortedEvents;
    return <div style={{ display: "grid", gap: 12 }}>
      <div style={card(accent)}><SectionTitle accent={accent}>Vue calendrier</SectionTitle><div style={{ marginTop: 12 }}><MiniCalendar accent={accent} events={clubEvents} matches={clubMatches} /></div></div>
      {canManage ? <div style={card(accent)}><SectionTitle accent={accent}>Ajouter un évènement</SectionTitle><div style={{ display: "grid", gap: 9, marginTop: 10 }}><input value={eventTitle} onChange={(e) => setEventTitle(e.target.value)} placeholder="Entraînement, réunion, tournoi..." style={inputStyle(accent)} /><input value={eventDate} onChange={(e) => setEventDate(e.target.value)} type="datetime-local" style={inputStyle(accent)} /><input value={eventLocation} onChange={(e) => setEventLocation(e.target.value)} placeholder="Lieu" style={inputStyle(accent)} /><button type="button" onClick={createEvent} disabled={!eventTitle.trim() || busy} style={{ ...navButton(accent, true), width: "100%" }}>Ajouter au calendrier</button></div></div> : null}
      {items.length ? items.map((it, i) => <div key={it.id} style={{ ...card(teamColor(i, accent)), display: "flex", gap: 11, alignItems: "center" }}><div style={{ width: 62, height: 62, borderRadius: 20, display: "grid", placeItems: "center", color: teamColor(i, accent), border: `1px solid ${alpha(teamColor(i, accent), "60")}`, background: alpha(teamColor(i, accent), "18"), fontWeight: 1000 }}>{formatShortDate(it.startsAt)}</div><div style={{ minWidth: 0, flex: 1 }}><MetaChip accent={teamColor(i, accent)}>{it.type}</MetaChip><div style={{ marginTop: 7, fontWeight: 1000, overflowWrap: "anywhere" }}>{it.title}</div><div style={{ fontSize: 12, opacity: .75, marginTop: 4 }}>{formatDateTime(it.startsAt)}{it.location ? ` • ${it.location}` : ""}</div></div></div>) : <EmptyState accent={accent} title="Agenda vide" body="Les entraînements, réunions, matchs et tournois apparaîtront ici." />}
    </div>;
  }

  function renderEffectif() {
    const groups = ["owner", "admin", "coach", "captain", "player", "member"];
    const grouped = groups.map((role) => ({ role, rows: clubMembers.filter((m) => String(m.role || "member").toLowerCase() === role) })).filter((g) => g.rows.length);
    const presentIds = new Set(clubConvocations.filter((c) => String(c.status) === "present").map((c) => c.userId || c.displayName));
    const absentIds = new Set(clubConvocations.filter((c) => String(c.status) === "absent").map((c) => c.userId || c.displayName));
    return <div style={{ display: "grid", gap: 12 }}>
      <div style={card(accent)}><SectionTitle accent={accent}>Effectif & rôles</SectionTitle><div style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 8, marginTop: 12 }}><StatTile accent={accent} value={totalMembers} label="membres" /><StatTile accent="#7cff9d" value={clubMembers.filter((m)=>String(m.role)==="player").length} label="joueurs" /><StatTile accent="#ffc857" value={clubMembers.filter((m)=>["coach","captain"].includes(String(m.role))).length} label="staff terrain" /><StatTile accent="#b58cff" value={clubMembers.filter((m)=>["owner","admin"].includes(String(m.role))).length} label="bureau" /></div></div>
      {canManage ? <div style={card(accent)}><SectionTitle accent={accent}>Inviter un membre</SectionTitle><div style={{ marginTop: 8, fontSize: 12, opacity: .72 }}>Recherche par pseudo ou email Online, puis rattachement possible à une équipe précise.</div><div style={{ display: "grid", gap: 8, marginTop: 10 }}><div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 8 }}><input value={inviteQuery} onChange={(e) => setInviteQuery(e.target.value)} placeholder="Pseudo ou email du joueur" style={inputStyle(accent)} /><button type="button" onClick={runUserSearch} style={navButton(accent, true)}>Chercher</button></div><select value={selectedInviteTeam} onChange={(e) => setSelectedInviteTeam(e.target.value)} style={inputStyle(accent)}><option value="">Club seulement</option>{clubTeams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select>{inviteResults.map((u) => <div key={u.id} style={{ ...glass(accent), display: "grid", gridTemplateColumns: "42px 1fr auto", gap: 10, alignItems: "center" }}><Logo src={u.avatarUrl} name={u.displayName || u.nickname || "Joueur"} accent={accent} size={42} round={999} /><div><div style={{ fontWeight: 1000 }}>{u.displayName || u.nickname}</div><div style={{ fontSize: 11, opacity: .7 }}>{u.nickname || u.id}</div></div><button type="button" onClick={() => sendClubInvite(u)} style={navButton(accent, true)}>Inviter</button></div>)}</div></div> : null}
      {grouped.length ? grouped.map((group, gi) => <div key={group.role} style={card(teamColor(gi, accent))}><SectionTitle accent={teamColor(gi, accent)}>{roleLabel(group.role)}</SectionTitle><div style={{ display: "grid", gap: 9, marginTop: 12 }}>{group.rows.map((m, i) => { const key = m.userId || m.displayName; const p = presentIds.has(key); const a = absentIds.has(key); const col = p ? "#7cff9d" : a ? "#ff6b7d" : teamColor(i + gi, accent); return <div key={m.id} style={{ ...glass(col), display: "grid", gridTemplateColumns: "50px 1fr auto", gap: 10, alignItems: "center" }}><Logo src={m.avatarUrl} name={m.displayName} accent={col} size={50} round={999} /><div style={{ minWidth: 0 }}><div style={{ fontWeight: 1000, fontSize: 15, overflowWrap: "anywhere" }}>{m.displayName}</div><div style={{ fontSize: 11.5, opacity: .72 }}>{roleLabel(m.role)} • {m.status || "actif"}</div><div style={{ marginTop: 6, display: "flex", gap: 5, flexWrap: "wrap" }}><MetaChip accent={col}>{p ? "Présent récent" : a ? "Absent récent" : "Suivi"}</MetaChip><MetaChip accent={col}>Fiche joueur</MetaChip><MetaChip accent={col}>Disponibilités</MetaChip></div></div><div style={{ textAlign: "right" }}><div style={{ color: col, fontWeight: 1000 }}>{Math.max(0, 100 - ((i + gi) * 7) % 38)}%</div><div style={{ fontSize: 10, opacity: .65 }}>assiduité</div></div></div>; })}</div></div>) : <EmptyState accent={accent} title="Aucun membre" body="Invite les membres du club pour gérer l’effectif, les convocations et les rôles." />}
    </div>;
  }
  function renderEquipes() {
    const bySport: Record<string, ClubTeam[]> = {};
    filteredTeams.forEach((t) => { const key = sportName(t.sport); bySport[key] = [...(bySport[key] || []), t]; });
    return <div style={{ display: "grid", gap: 12 }}>
      {renderTeamFilter()}
      <div style={card(accent)}><SectionTitle accent={accent}>Organisation multisports</SectionTitle><div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 8, marginTop: 12 }}><StatTile accent={accent} value={clubTeams.length} label="équipes" /><StatTile accent="#7cff9d" value={new Set(clubTeams.map((t) => t.sport)).size} label="sports" /><StatTile accent="#ffc857" value={clubTeams.reduce((s,t)=>s+Number(t.membersCount||0),0)} label="joueurs" /></div></div>
      {Object.keys(bySport).length ? Object.entries(bySport).map(([sport, teams], idx) => <div key={sport} style={card(teamColor(idx, accent))}><SectionTitle accent={teamColor(idx, accent)}>{sportIcon(teams[0]?.sport)} {sport}</SectionTitle><div style={{ display: "grid", gap: 9, marginTop: 12 }}>{teams.map((team) => <div key={team.id} style={{ ...glass(teamColor(idx, accent)), display: "grid", gridTemplateColumns: "58px 1fr auto", gap: 11, alignItems: "center" }}><Logo src={team.logoUrl || team.logoDataUrl} name={team.name} accent={teamColor(idx, accent)} size={58} round={19} /><div style={{ flex: 1, minWidth: 0 }}><div style={{ fontWeight: 1000, fontSize: 16, overflowWrap: "anywhere" }}>{team.name}</div><div style={{ fontSize: 12, opacity: .72, marginTop: 4 }}>{team.membersCount || 0} membre(s) • {sportName(team.sport)}</div><div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 7 }}><MetaChip accent={teamColor(idx, accent)}>Matchs</MetaChip><MetaChip accent={teamColor(idx, accent)}>Compos</MetaChip><MetaChip accent={teamColor(idx, accent)}>Stats</MetaChip></div></div><MetaChip accent={teamColor(idx, accent)}>Détails</MetaChip></div>)}</div></div>) : <EmptyState accent={accent} title="Aucune équipe" body="Synchronise une équipe Club depuis Teams ou crée une équipe rattachée au club." />}
    </div>;
  }

  function renderStats() {
    const totalConv = Math.max(clubConvocations.length, 1);
    const present = clubConvocations.filter((c)=>c.status === "present").length;
    const offenseRate = goalsFor + goalsAgainst ? Math.round((goalsFor / (goalsFor + goalsAgainst)) * 100) : 0;
    const byTeam = clubTeams.map((t, i) => ({ team: t, matches: clubMatches.filter((m) => m.clubTeamId === t.id), color: teamColor(i, accent) }));
    return <div style={{ display: "grid", gap: 12 }}>
      <div style={card(accent)}><SectionTitle accent={accent}>Statistiques club détaillées</SectionTitle><div style={{ marginTop: 8, fontSize: 12.5, opacity: .76 }}>Vue globale façon saison : résultats, dynamique, présence, activité de l’effectif et animation du club.</div><div style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 8, marginTop: 12 }}><StatTile accent={accent} value={clubMatches.length} label="matchs" /><StatTile accent="#7cff9d" value={seasonWins} label="victoires" /><StatTile accent="#ffc857" value={`${present}/${totalConv}`} label="présences" /><StatTile accent="#b58cff" value={`${offenseRate}%`} label="part offensive" /></div></div>
      <div style={card(accent)}><SectionTitle accent={accent}>Indicateurs de pilotage</SectionTitle><div style={{ display: "grid", gap: 10, marginTop: 12 }}><ProgressBar value={seasonWins} total={Math.max(clubMatches.length, 1)} color="#7cff9d" label="Ratio victoires" /><ProgressBar value={present} total={totalConv} color={accent} label="Taux de présence" /><ProgressBar value={clubPosts.length} total={Math.max(clubPosts.length + clubEvents.length + clubMatches.length, 1)} color="#ffc857" label="Poids des actualités dans l’activité" /><ProgressBar value={clubTeams.length} total={Math.max(allSports.length, clubTeams.length, 1)} color="#b58cff" label="Couverture multisports" /></div></div>
      <div style={card(accent)}><SectionTitle accent={accent}>Performance par équipe</SectionTitle><div style={{ display: "grid", gap: 9, marginTop: 12 }}>{byTeam.length ? byTeam.map(({ team, matches, color }) => { const w = matches.filter((m)=>String(m.status)==="finished" && Number(m.scoreFor||0)>Number(m.scoreAgainst||0)).length; const gf = matches.reduce((s,m)=>s+Number(m.scoreFor||0),0); const ga = matches.reduce((s,m)=>s+Number(m.scoreAgainst||0),0); return <div key={team.id} style={{ ...glass(color), display: "grid", gridTemplateColumns: "52px 1fr", gap: 10, alignItems: "center" }}><Logo src={team.logoUrl || team.logoDataUrl} name={team.name} accent={color} size={52} round={18} /><div style={{ minWidth: 0 }}><div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}><div style={{ fontWeight: 1000, overflowWrap: "anywhere" }}>{team.name}</div><MetaChip accent={color}>{sportName(team.sport)}</MetaChip></div><div style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 7, marginTop: 8 }}><StatTile accent={color} value={matches.length} label="M" /><StatTile accent="#7cff9d" value={w} label="V" /><StatTile accent="#ffc857" value={gf} label="Pour" /><StatTile accent="#ff6b7d" value={ga} label="Contre" /></div></div></div>; }) : <EmptyState accent={accent} title="Aucune équipe" body="Synchronise des équipes Club pour détailler les statistiques par sport." />}</div></div>
      <div style={card(accent)}><SectionTitle accent={accent}>Classements internes à venir</SectionTitle><div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 10, marginTop: 12 }}>{["Meilleur buteur / scoreur", "Meilleur passeur", "Présence entraînements", "Temps de jeu", "Joueur du mois", "Séries en cours"].map((label, i) => <div key={label} style={{ ...glass(teamColor(i, accent)), minHeight: 78 }}><div style={{ color: teamColor(i, accent), fontWeight: 1000 }}>{label}</div><div style={{ marginTop: 6, fontSize: 11.5, opacity: .72 }}>Prêt à connecter aux matchs sauvegardés et aux stats individuelles.</div></div>)}</div></div>
    </div>;
  }
  function renderMessages() {
    const channels = ["Général", "Bureau", "Coachs", "Convocations", ...clubTeams.map((t) => t.name)];
    return <div style={{ display: "grid", gap: 12 }}><div style={card(accent)}><SectionTitle accent={accent}>Messagerie club</SectionTitle><div style={{ marginTop: 8, fontSize: 12.5, opacity: .76, lineHeight: 1.35 }}>Organisation des salons prête pour connecter ensuite les messages temps réel : club, bureau, coachs, convocations et salons par équipe.</div><div style={{ display: "grid", gap: 9, marginTop: 12 }}>{channels.map((c, i) => <div key={c} style={{ ...glass(i < 4 ? accent : teamColor(i, accent)), display: "grid", gridTemplateColumns: "46px 1fr auto", gap: 10, alignItems: "center" }}><div style={iconButton(i < 4 ? accent : teamColor(i, accent))}>{i === 0 ? "#" : i < 4 ? "•" : "⚑"}</div><div style={{ flex: 1, minWidth: 0 }}><div style={{ fontWeight: 1000, overflowWrap: "anywhere" }}>{c}</div><div style={{ fontSize: 11.5, opacity: .72 }}>{i === 0 ? "Salon général du club" : i === 1 ? "Échanges administrateurs / bureau" : i === 2 ? "Consignes staff et coachs" : i === 3 ? "Questions de présence et relances" : "Salon d’équipe"}</div></div><MetaChip accent={accent}>Bientôt</MetaChip></div>)}</div></div></div>;
  }

  function renderPhotos() {
    const boxes = ["Photos de match", "Entraînements", "Tournois", "Troisième mi-temps", "Logos & médias", "Archives", "Portraits joueurs", "Sponsors"];
    return <div style={{ display: "grid", gap: 12 }}><div style={card(accent)}><SectionTitle accent={accent}>Galerie club</SectionTitle><div style={{ marginTop: 8, fontSize: 12.5, opacity: .76 }}>Albums organisés par type, prêts à recevoir photos et médias partagés par les membres.</div></div><div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 10 }}>{boxes.map((b, i) => <div key={b} style={{ ...card(teamColor(i, accent)), minHeight: 122, display: "grid", alignContent: "end", background: `radial-gradient(circle at 30% 10%, ${alpha(teamColor(i, accent),"35")}, rgba(255,255,255,.04) 48%, rgba(0,0,0,.28))` }}><div style={{ color: teamColor(i, accent), fontWeight: 1000 }}>{b}</div><div style={{ fontSize: 11, opacity: .7, marginTop: 4 }}>0 photo • album à compléter</div></div>)}</div></div>;
  }

  function renderDocuments() {
    const docs = ["Règlement intérieur", "Licences", "Feuilles de match", "Convocations PDF", "PV de réunion", "Documents administratifs", "Assurances", "Sponsors", "Buvette", "Comptabilité"];
    return <div style={{ display: "grid", gap: 12 }}><div style={card(accent)}><SectionTitle accent={accent}>Documents club</SectionTitle><div style={{ marginTop: 8, fontSize: 12.5, opacity: .76 }}>Espace documentaire pour stocker les fichiers utiles au club : administratif, sport, bureau, licences, partenaires.</div></div><div style={{ display: "grid", gap: 9 }}>{docs.map((d, i) => <div key={d} style={{ ...glass(teamColor(i, accent)), display: "grid", gridTemplateColumns: "46px 1fr auto", gap: 10, alignItems: "center" }}><div style={iconButton(teamColor(i, accent))}>▣</div><div style={{ minWidth: 0 }}><div style={{ fontWeight: 1000 }}>{d}</div><div style={{ fontSize: 11.5, opacity: .72 }}>Aucun fichier ajouté pour l’instant</div></div><MetaChip accent={teamColor(i, accent)}>Ajouter</MetaChip></div>)}</div></div>;
  }

  function renderReglages() {
    return <div style={{ display: "grid", gap: 12 }}><div style={card(accent)}><SectionTitle accent={accent}>Réglages & administration</SectionTitle><div style={{ marginTop: 10 }}><DetailRow accent={accent} label="Visibilité" value={selectedClub?.visibility || "members"} /><DetailRow accent={accent} label="Sports" value={allSports.map(sportName).join(", ") || "Multisports"} /><DetailRow accent={accent} label="Rôles" value="Président, Admin, Coach, Capitaine, Joueur, Membre" /><DetailRow accent={accent} label="Permissions" value="Admins, coachs et capitaines peuvent créer matchs, actus, évènements et gérer les convocations." /><DetailRow accent={accent} label="Données" value="Clubs, équipes, effectif, posts, agenda, matchs et convocations sont synchronisés Online." /></div></div><div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 10 }}><QuickAction accent={accent} title="Identité club" body="Logo, couverture, description, ville, sports associés." onClick={() => {}} /><QuickAction accent="#7cff9d" title="Rôles & droits" body="Promouvoir coach, capitaine ou administrateur." onClick={() => {}} /><QuickAction accent="#ffc857" title="Invitations" body="Codes, liens, QR code et demandes en attente." onClick={() => setClubTab("effectif")} /><QuickAction accent="#ff6b7d" title="Zone danger" body="Archivage, suppression, transfert de propriété." onClick={() => {}} /></div></div>;
  }

  function renderCurrentTab() {
    if (clubTab === "dashboard") return renderDashboard();
    if (clubTab === "actu") return renderActu();
    if (clubTab === "matchs") return renderMatchs();
    if (clubTab === "convocs") return renderConvocs();
    if (clubTab === "agenda") return renderAgenda();
    if (clubTab === "effectif") return renderEffectif();
    if (clubTab === "equipes") return renderEquipes();
    if (clubTab === "stats") return renderStats();
    if (clubTab === "messages") return renderMessages();
    if (clubTab === "photos") return renderPhotos();
    if (clubTab === "documents") return renderDocuments();
    return renderReglages();
  }

  if (fullscreenMode === "club" && selectedClub) {
    return (
      <div style={{ position: "fixed", inset: 0, zIndex: 9999, overflowY: "auto", background: "radial-gradient(circle at 50% 0%, rgba(20,75,90,.42), #020711 38%, #000 100%)", color: "#fff", WebkitOverflowScrolling: "touch" }}>
        <div style={{ maxWidth: 900, margin: "0 auto", paddingBottom: 92 }}>
          {renderClubHeader()}
          {error ? <div style={{ margin: "0 12px 12px", ...card("#ff5a6f"), color: "#ffd9df", fontSize: 12 }}>{error}</div> : null}
          <div style={{ padding: "0 12px 20px", display: "grid", gap: 12 }}>{renderCurrentTab()}</div>
        </div>
        {showClubInfo ? <div style={{ position: "fixed", inset: 0, zIndex: 10000, background: "rgba(0,0,0,.74)", display: "grid", placeItems: "center", padding: 18 }} onClick={() => setShowClubInfo(false)}><div style={{ ...card(accent), maxWidth: 480, width: "100%" }} onClick={(e) => e.stopPropagation()}><SectionTitle accent={accent}>Espace club complet</SectionTitle><div style={{ marginTop: 10, lineHeight: 1.45, fontSize: 13.5 }}>Interface de gestion inspirée SportEasy : tableau de bord, actualités, matchs, convocations, calendrier, effectif, équipes multisports, statistiques, messages, médias, documents et administration.</div><button type="button" onClick={() => setShowClubInfo(false)} style={{ ...navButton(accent, true), width: "100%", marginTop: 14 }}>Fermer</button></div></div> : null}
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
        <div><div style={{ fontSize: 18, fontWeight: 1000, color: accent, letterSpacing: .4 }}>CLUBS</div><div style={{ fontSize: 12, opacity: .78 }}>Clubs et équipes Online que tu as rejoints.</div></div>
        <button type="button" onClick={reload} disabled={busy} style={iconButton(accent)}>↻</button>
      </div>
      {!signedIn ? <div style={card(accent)}>Connecte ton compte Online pour afficher les clubs partagés.</div> : null}
      {error ? <div style={{ ...card("#ff5a6f"), color: "#ffd9df", fontSize: 12 }}>{error}</div> : null}
      <div style={card(accent)}><div style={{ fontWeight: 1000, marginBottom: 8 }}>Créer un club</div><div style={{ display: "flex", gap: 8 }}><input value={newClubName} onChange={(e) => setNewClubName(e.target.value)} placeholder="Nom du club" style={inputStyle(accent)} /><button type="button" disabled={!newClubName.trim() || busy || !signedIn} onClick={handleCreateClub} style={{ borderRadius: 16, border: 0, background: !newClubName.trim() || !signedIn ? "rgba(255,255,255,.12)" : `linear-gradient(135deg, ${accent}, ${alpha(accent, "99")})`, color: "#001018", padding: "0 15px", fontWeight: 1000 }}>Créer</button></div></div>
      {invites.length ? <div style={card(accent)}><div style={{ fontWeight: 1000, marginBottom: 8 }}>Invitations en attente</div><div style={{ display: "grid", gap: 8 }}>{invites.map((it) => <div key={it.id} style={{ borderRadius: 16, background: "rgba(255,255,255,.055)", padding: 10, display: "grid", gap: 8 }}><div style={{ fontWeight: 900 }}>{it.clubName || "Club"}{it.teamName ? ` • ${it.teamName}` : ""}</div><div style={{ fontSize: 11, opacity: .72 }}>Invité par {it.senderName || "un membre"}</div><div style={{ display: "flex", gap: 8 }}><button type="button" onClick={() => handleInvite(it.id, "accepted")} style={{ flex: 1, borderRadius: 12, border: 0, padding: 9, fontWeight: 1000, background: "rgba(84,255,145,.22)", color: "#9dffbd" }}>Accepter</button><button type="button" onClick={() => handleInvite(it.id, "refused")} style={{ flex: 1, borderRadius: 12, border: 0, padding: 9, fontWeight: 1000, background: "rgba(255,90,111,.16)", color: "#ff9baa" }}>Refuser</button></div></div>)}</div></div> : null}
      <div style={{ display: "grid", gap: 10 }}>{clubs.length === 0 ? <div style={card(accent)}><div style={{ fontWeight: 1000 }}>Aucun club Online rejoint</div><div style={{ marginTop: 6, fontSize: 12, opacity: .76 }}>Crée un club ou accepte une invitation. Les équipes “Club” créées dans Teams peuvent être synchronisées ici.</div></div> : clubs.map((club) => { const teams = teamsByClub[club.id] || []; return <button type="button" key={club.id} onClick={() => openClub(club.id)} style={{ ...card(accent), color: "#fff", textAlign: "left" }}><div style={{ display: "flex", gap: 10, alignItems: "center" }}><Logo src={club.logoUrl} name={club.name} accent={accent} /><div style={{ minWidth: 0, flex: 1 }}><div style={{ fontWeight: 1000, fontSize: 16, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{club.name}</div><div style={{ fontSize: 11, opacity: .72 }}>{club.membersCount || 0} membre(s) • {teams.length} équipe(s) • rôle {roleLabel(club.role)}</div></div><div style={{ color: accent, fontWeight: 1000 }}>Ouvrir</div></div></button>; })}</div>
      {localClubTeams.length ? <div style={card(accent)}><div style={{ fontWeight: 1000 }}>Équipes Club locales à synchroniser</div><div style={{ marginTop: 6, fontSize: 11.5, opacity: .72 }}>Clique sur “Synchroniser” pour créer l’espace club Online et ouvrir sa page.</div><div style={{ marginTop: 10, display: "grid", gap: 8 }}>{localClubTeams.slice(0, 12).map((t: any) => <div key={t.id} style={{ borderRadius: 16, padding: 10, background: "rgba(255,255,255,.05)", display: "flex", gap: 9, alignItems: "center" }}><Logo src={t.logoDataUrl || t.logoUrl} name={t.name} accent={accent} size={36} /><div style={{ minWidth: 0, flex: 1 }}><div style={{ fontWeight: 950 }}>{t.name}</div><div style={{ fontSize: 10.5, opacity: .72 }}>{t.clubName || t.name} • {sportsLabel(t)}</div></div><button type="button" disabled={busy || !signedIn} onClick={() => syncLocalTeam(t)} style={navButton(accent, true)}>Synchroniser</button></div>)}</div></div> : null}
    </div>
  );
}
