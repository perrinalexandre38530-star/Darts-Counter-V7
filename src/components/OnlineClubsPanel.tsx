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

type ClubTab = "home" | "actu" | "matchs" | "convocs" | "agenda" | "effectif" | "equipes" | "messages" | "photos" | "documents" | "reglages";

type FullscreenMode = "none" | "club";

const MANAGER_ROLES = new Set(["owner", "admin", "coach", "captain"]);
const TABS: Array<{ id: ClubTab; label: string; short: string }> = [
  { id: "home", label: "Accueil", short: "Accueil" },
  { id: "actu", label: "Actualités", short: "Actu" },
  { id: "matchs", label: "Matchs", short: "Matchs" },
  { id: "convocs", label: "Convocations", short: "Convocs" },
  { id: "agenda", label: "Agenda", short: "Agenda" },
  { id: "effectif", label: "Effectif", short: "Effectif" },
  { id: "equipes", label: "Équipes", short: "Équipes" },
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
    borderRadius: 22,
    border: `1px solid ${alpha(accent, "38")}`,
    background: `linear-gradient(145deg, ${alpha(accent, "15")}, rgba(255,255,255,.045))`,
    boxShadow: `0 0 24px ${alpha(accent, "12")}, inset 0 1px 0 rgba(255,255,255,.055)`,
    padding: pad,
  };
}

function glass(accent: string): React.CSSProperties {
  return {
    borderRadius: 22,
    border: `1px solid ${alpha(accent, "34")}`,
    background: "rgba(5,12,22,.72)",
    boxShadow: `inset 0 1px 0 rgba(255,255,255,.05), 0 0 22px ${alpha(accent, "10")}`,
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

function Logo({ src, name, accent, size = 46, round = 16 }: { src?: string | null; name: string; accent: string; size?: number; round?: number }) {
  return (
    <div style={{ width: size, height: size, borderRadius: round, overflow: "hidden", flex: "0 0 auto", display: "grid", placeItems: "center", border: `1px solid ${alpha(accent, "80")}`, background: `radial-gradient(circle at 35% 25%, ${alpha(accent, "44")}, rgba(0,0,0,.62))`, color: accent, fontWeight: 1000 }}>
      {src ? <img src={src} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : name.slice(0, 2).toUpperCase()}
    </div>
  );
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

function sportsLabel(team: any) {
  const ids = Array.isArray(team?.sportIds) ? team.sportIds : team?.sport ? [team.sport] : [];
  if (team?.allSports) return "tous les sports";
  return ids.filter(Boolean).map(sportName).join(", ") || "Multisports";
}

function teamMainSport(team: any) {
  const ids = Array.isArray(team?.sportIds) ? team.sportIds.filter(Boolean) : [];
  return String(team?.sport || ids[0] || "generic").toLowerCase();
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

function roleLabel(role?: string) {
  const raw = String(role || "member").toLowerCase();
  if (raw === "owner") return "Président";
  if (raw === "admin") return "Admin";
  if (raw === "coach") return "Coach";
  if (raw === "captain") return "Capitaine";
  if (raw === "player") return "Joueur";
  return "Membre";
}

function SectionTitle({ children, accent, centered = false }: { children: React.ReactNode; accent: string; centered?: boolean }) {
  return <div style={{ color: accent, fontSize: 20, fontWeight: 1000, letterSpacing: .45, textAlign: centered ? "center" : "left", textTransform: "uppercase" }}>{children}</div>;
}

function MetaChip({ children, accent }: { children: React.ReactNode; accent: string }) {
  return <span style={{ display: "inline-flex", alignItems: "center", gap: 6, borderRadius: 999, border: `1px solid ${alpha(accent, "55")}`, background: `linear-gradient(135deg, ${alpha(accent, "24")}, rgba(255,255,255,.045))`, color: "#fff", padding: "6px 9px", fontSize: 11, fontWeight: 950, boxShadow: `0 0 14px ${alpha(accent, "18")}` }}>{children}</span>;
}

function StatTile({ value, label, accent }: { value: React.ReactNode; label: string; accent: string }) {
  return <div style={{ ...card(accent, 11), textAlign: "center" }}><div style={{ fontSize: 24, fontWeight: 1000, color: "#fff" }}>{value}</div><div style={{ fontSize: 10.5, opacity: .74, marginTop: 2, textTransform: "uppercase", letterSpacing: .25 }}>{label}</div></div>;
}

function EmptyState({ title, body, accent }: { title: string; body: string; accent: string }) {
  return <div style={{ ...card(accent), minHeight: 108, display: "grid", alignContent: "center", textAlign: "center" }}><div style={{ color: accent, fontWeight: 1000, fontSize: 18 }}>{title}</div><div style={{ marginTop: 8, fontSize: 12.5, opacity: .72, lineHeight: 1.35 }}>{body}</div></div>;
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

function teamColor(idx: number, accent: string) {
  const colors = [accent, "#7cff9d", "#ffc857", "#ff6b7d", "#b58cff", "#69a7ff"];
  return colors[idx % colors.length];
}

function ProgressBar({ value, total, color, label }: { value: number; total: number; color: string; label: string }) {
  const pct = total > 0 ? Math.max(0, Math.min(100, Math.round((value / total) * 100))) : 0;
  return <div style={{ display: "grid", gap: 5 }}><div style={{ display: "flex", justifyContent: "space-between", gap: 8, fontSize: 11, fontWeight: 950 }}><span>{label}</span><span style={{ color }}>{value}/{total}</span></div><div style={{ height: 8, borderRadius: 999, background: "rgba(255,255,255,.08)", overflow: "hidden", border: "1px solid rgba(255,255,255,.08)" }}><div style={{ width: `${pct}%`, height: "100%", borderRadius: 999, background: `linear-gradient(90deg, ${color}, rgba(255,255,255,.65))`, boxShadow: `0 0 14px ${color}` }} /></div></div>;
}

function QuickAction({ title, body, accent, onClick }: { title: string; body: string; accent: string; onClick: () => void }) {
  return <button type="button" onClick={onClick} style={{ ...card(accent, 13), color: "#fff", textAlign: "left", minHeight: 86 }}><div style={{ color: accent, fontWeight: 1000, fontSize: 14 }}>{title}</div><div style={{ marginTop: 6, fontSize: 11.5, opacity: .74, lineHeight: 1.3 }}>{body}</div></button>;
}

function DetailRow({ label, value, accent }: { label: string; value: React.ReactNode; accent: string }) {
  return <div style={{ display: "grid", gridTemplateColumns: "120px 1fr", gap: 10, padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,.07)", alignItems: "start" }}><div style={{ color: alpha(accent, "ff"), fontSize: 11, fontWeight: 1000, textTransform: "uppercase", opacity: .9 }}>{label}</div><div style={{ fontSize: 12.5, opacity: .86, lineHeight: 1.35 }}>{value}</div></div>;
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
  const [clubTab, setClubTab] = React.useState<ClubTab>("home");
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

  const openClub = React.useCallback(async (clubId: string, tab: ClubTab = "home") => {
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
  const nextMatch = React.useMemo(() => {
    const now = Date.now();
    return clubMatches
      .filter((m) => !m.startsAt || new Date(m.startsAt).getTime() >= now - 1000 * 60 * 60 * 8)
      .sort((a, b) => String(a.startsAt || "9999").localeCompare(String(b.startsAt || "9999")))[0] || null;
  }, [clubMatches]);
  const filteredMatches = React.useMemo(() => teamFilter === "all" ? clubMatches : clubMatches.filter((m) => String(m.clubTeamId || "") === teamFilter), [clubMatches, teamFilter]);
  const filteredEvents = React.useMemo(() => [...clubEvents].sort((a,b) => String(a.startsAt || "9999").localeCompare(String(b.startsAt || "9999"))), [clubEvents]);
  const filteredTeams = React.useMemo(() => teamFilter === "all" ? clubTeams : clubTeams.filter((t) => t.id === teamFilter), [clubTeams, teamFilter]);

  async function refreshSelected(tab = clubTab) {
    if (selectedClubId) await openClub(selectedClubId, tab);
  }

  async function handleCreateClub() {
    const name = newClubName.trim();
    if (!name || !signedIn) return;
    setBusy(true);
    try {
      const club = await createClub({ name, sports: ["darts", "foot", "babyfoot", "petanque", "pingpong"], visibility: "members" });
      setNewClubName("");
      await reload();
      await openClub(club.id, "home");
    } catch (e: any) {
      setError(e?.message || "Création club impossible");
    } finally {
      setBusy(false);
    }
  }

  async function syncLocalTeam(t: any) {
    if (!signedIn) return;
    setBusy(true);
    setError(null);
    try {
      const clubName = String(t.clubName || t.name || "Club").trim();
      const club = await createClub({ name: clubName, sports: t.allSports ? ["darts", "foot", "babyfoot", "petanque", "pingpong"] : (Array.isArray(t.sportIds) ? t.sportIds : [teamMainSport(t)]), logoUrl: t.logoUrl || t.logoDataUrl || null, visibility: "members" });
      const team = await upsertClubTeam({ clubId: club.id, localTeamId: t.id, sport: teamMainSport(t), name: t.name, logoUrl: t.logoUrl || null, logoDataUrl: t.logoDataUrl || null, description: t.description || "", playerIds: Array.isArray(t.playerIds) ? t.playerIds : [] });
      upsertTeam({ ...t, syncedClubId: club.id, syncedClubTeamId: team.id, teamKind: "club" });
      await reload();
      await openClub(club.id, "home");
    } catch (e: any) {
      setError(e?.message || "Synchronisation impossible");
    } finally {
      setBusy(false);
    }
  }

  async function handleInvite(inviteId: string, status: "accepted" | "refused") {
    setBusy(true);
    try {
      await respondClubInvite(inviteId, status);
      await reload();
    } catch (e: any) {
      setError(e?.message || "Réponse impossible");
    } finally {
      setBusy(false);
    }
  }

  async function createPost() {
    if (!selectedClubId || !postText.trim()) return;
    setBusy(true);
    try {
      await createClubPost({ clubId: selectedClubId, title: postTitle.trim(), body: postText.trim(), type: "post" });
      setPostText("");
      setPostTitle("");
      await refreshSelected("actu");
    } catch (e: any) { setError(e?.message || "Publication impossible"); }
    finally { setBusy(false); }
  }

  async function createEvent() {
    if (!selectedClubId || !eventTitle.trim()) return;
    setBusy(true);
    try {
      await createClubEvent({ clubId: selectedClubId, title: eventTitle.trim(), startsAt: eventDate ? new Date(eventDate).toISOString() : null, location: eventLocation.trim(), type: "event" });
      setEventTitle(""); setEventDate(""); setEventLocation("");
      await refreshSelected("agenda");
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
      setMatchOpponent(""); setMatchDate(""); setMatchLocation("");
      await refreshSelected("matchs");
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
      setInviteQuery(""); setInviteResults([]);
      await refreshSelected("effectif");
    } catch (e: any) { setError(e?.message || "Invitation impossible"); }
    finally { setBusy(false); }
  }

  async function answerConvocation(c: ClubConvocation, status: "present" | "absent" | "uncertain") {
    if (!selectedClubId) return;
    setBusy(true);
    try {
      await respondClubConvocation({ clubId: selectedClubId, convocationId: c.id, status });
      await refreshSelected("convocs");
    } catch (e: any) { setError(e?.message || "Réponse impossible"); }
    finally { setBusy(false); }
  }

  function renderClubHeader() {
    if (!selectedClub) return null;
    const allSports = (selectedClub.sports || []).map(sportName).join(" • ") || "Multisports";
    return (
      <>
        <div style={{ position: "sticky", top: 0, zIndex: 25, padding: "12px 12px 8px", background: "linear-gradient(180deg, rgba(3,9,17,.98), rgba(3,9,17,.88) 70%, rgba(3,9,17,0))" }}>
          <div style={{ display: "grid", gridTemplateColumns: "48px 1fr 48px", alignItems: "center", gap: 10 }}>
            <button type="button" onClick={() => { setFullscreenMode("none"); setSelectedClubId(null); }} style={iconButton(accent)}>←</button>
            <div style={{ textAlign: "center", minWidth: 0 }}>
              <div style={{ color: accent, fontSize: 20, fontWeight: 1000, letterSpacing: .5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{selectedClub.name}</div>
              <div style={{ fontSize: 11, opacity: .72 }}>{roleLabel(selectedClub.role)} • {allSports}</div>
            </div>
            <button type="button" onClick={() => setShowClubInfo(true)} style={iconButton(accent)}>i</button>
          </div>
        </div>

        <div style={{ padding: "0 12px 12px" }}>
          <div style={{ ...glass(accent), padding: 0, overflow: "hidden", position: "relative" }}>
            <div style={{ minHeight: 150, background: selectedClub.coverUrl ? `linear-gradient(180deg, rgba(0,0,0,.08), rgba(0,0,0,.70)), url(${selectedClub.coverUrl}) center/cover` : `radial-gradient(circle at 50% 0%, ${alpha(accent, "28")}, rgba(2,8,15,.85) 58%, rgba(2,8,15,.96))`, display: "grid", placeItems: "center", padding: 16 }}>
              <div style={{ display: "grid", justifyItems: "center", gap: 8 }}>
                <Logo src={selectedClub.logoUrl} name={selectedClub.name} accent={accent} size={86} round={24} />
                <div style={{ color: accent, fontSize: 25, fontWeight: 1000, textAlign: "center", textShadow: `0 0 18px ${alpha(accent, "70")}` }}>{selectedClub.name}</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, justifyContent: "center" }}>
                  <MetaChip accent={accent}>{clubMembers.length || selectedClub.membersCount || 0} membres</MetaChip>
                  <MetaChip accent={accent}>{clubTeams.length || selectedClub.teamsCount || 0} équipes</MetaChip>
                  <MetaChip accent={accent}>{selectedClub.visibility || "members"}</MetaChip>
                </div>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 1, background: alpha(accent, "2a"), borderTop: `1px solid ${alpha(accent, "28")}` }}>
              <StatTile accent={accent} value={clubMatches.length} label="matchs" />
              <StatTile accent={accent} value={clubConvocations.length} label="convocs" />
              <StatTile accent={accent} value={clubPosts.length} label="actus" />
              <StatTile accent={accent} value={clubEvents.length} label="agenda" />
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

  function renderTeamFilter() {
    if (!clubTeams.length) return null;
    return <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 2 }}><button type="button" onClick={() => setTeamFilter("all")} style={navButton(accent, teamFilter === "all")}>Toutes</button>{clubTeams.map((t) => <button key={t.id} type="button" onClick={() => setTeamFilter(t.id)} style={navButton(accent, teamFilter === t.id)}>{t.name}</button>)}</div>;
  }

  function renderHome() {
    const convStats = countByStatus(clubConvocations, nextMatch?.id);
    const totalMembers = clubMembers.length || selectedClub?.membersCount || 0;
    const latestPosts = clubPosts.slice(0, 4);
    const nextEvents = filteredEvents.slice(0, 4);
    const upcomingMatches = clubMatches.slice(0, 3);
    return (
      <div style={{ display: "grid", gap: 14 }}>
        <div style={{ ...card(accent), padding: 0, overflow: "hidden" }}>
          <div style={{ padding: 14, display: "grid", gap: 12 }}>
            <SectionTitle accent={accent} centered>Tableau de bord club</SectionTitle>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 8 }}>
              <StatTile accent={accent} value={totalMembers} label="membres" />
              <StatTile accent="#7cff9d" value={clubTeams.length} label="équipes" />
              <StatTile accent="#ffc857" value={clubMatches.length} label="matchs" />
              <StatTile accent="#b58cff" value={clubEvents.length} label="agenda" />
            </div>
            <div style={{ ...glass(accent), padding: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
                <div><div style={{ color: accent, fontWeight: 1000 }}>Résumé activité</div><div style={{ marginTop: 4, fontSize: 12, opacity: .72 }}>Vue rapide façon SportEasy : prochaines échéances, réponses aux convocations, fil du club.</div></div>
                <MetaChip accent={accent}>{roleLabel(selectedClub?.role)}</MetaChip>
              </div>
              <div style={{ display: "grid", gap: 9, marginTop: 12 }}>
                <ProgressBar value={convStats.present} total={Math.max(convStats.total, 1)} color="#7cff9d" label="Présents prochain match" />
                <ProgressBar value={clubPosts.length} total={Math.max(clubPosts.length + 3, 4)} color={accent} label="Actualités publiées" />
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 10 }}>
          <QuickAction accent={accent} title="Créer un match" body="Planifier une rencontre, rattacher une équipe, préparer la convocation." onClick={() => setClubTab("matchs")} />
          <QuickAction accent="#7cff9d" title="Gérer les réponses" body="Présents, absents, incertains et relances depuis l’onglet convocations." onClick={() => setClubTab("convocs")} />
          <QuickAction accent="#ffc857" title="Publier une actu" body="Annonce, résultat, info entraînement, message du coach ou du bureau." onClick={() => setClubTab("actu")} />
          <QuickAction accent="#b58cff" title="Gérer l’effectif" body="Inviter des membres Online et suivre les rôles dans le club." onClick={() => setClubTab("effectif")} />
        </div>

        {nextMatch ? <div style={card(accent)}><SectionTitle accent={accent}>Prochain match</SectionTitle><div style={{ marginTop: 12 }}><MatchCard match={nextMatch} accent={accent} /></div></div> : <EmptyState accent={accent} title="Aucun prochain match" body="Crée un match pour afficher une vraie fiche rencontre avec adversaire, lieu, horaire, convocations et score." />}

        <div style={card(accent)}>
          <SectionTitle accent={accent}>À venir</SectionTitle>
          <div style={{ display: "grid", gap: 9, marginTop: 12 }}>
            {[...upcomingMatches.map((m) => ({ id: `m-${m.id}`, kind: "Match", title: m.title, startsAt: m.startsAt, location: m.location })), ...nextEvents.map((e) => ({ id: `e-${e.id}`, kind: "Évènement", title: e.title, startsAt: e.startsAt, location: e.location }))].slice(0, 5).map((it) => <div key={it.id} style={{ ...glass(accent), padding: 11, display: "grid", gridTemplateColumns: "58px 1fr", gap: 10, alignItems: "center" }}><div style={{ color: accent, fontWeight: 1000, textAlign: "center" }}>{formatShortDate(it.startsAt)}</div><div style={{ minWidth: 0 }}><MetaChip accent={accent}>{it.kind}</MetaChip><div style={{ fontWeight: 1000, marginTop: 6, overflowWrap: "anywhere" }}>{it.title}</div><div style={{ fontSize: 11.5, opacity: .72, marginTop: 3 }}>{formatDateTime(it.startsAt)}{it.location ? ` • ${it.location}` : ""}</div></div></div>)}
            {!upcomingMatches.length && !nextEvents.length ? <EmptyState accent={accent} title="Rien de prévu" body="Ajoute un match ou un évènement pour alimenter l’agenda du club." /> : null}
          </div>
        </div>

        <div style={card(accent)}>
          <SectionTitle accent={accent}>Fil club</SectionTitle>
          <div style={{ display: "grid", gap: 9, marginTop: 12 }}>
            {latestPosts.length ? latestPosts.map((p) => <PostCard key={p.id} post={p} accent={accent} />) : <EmptyState accent={accent} title="Aucune actualité" body="Le fil affichera annonces, résultats, infos importantes, photos et messages du club." />}
          </div>
        </div>
      </div>
    );
  }

  function PostCard({ post, accent }: { post: ClubPost; accent: string }) {
    return <div style={{ ...glass(accent), padding: 0, overflow: "hidden" }}><div style={{ padding: 13 }}><div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}><div style={{ width: 40, height: 40, borderRadius: 16, display: "grid", placeItems: "center", border: `1px solid ${alpha(accent, "55")}`, color: accent, fontWeight: 1000, background: alpha(accent, "16") }}>CL</div><div style={{ minWidth: 0, flex: 1 }}><div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}><div style={{ fontWeight: 1000, overflowWrap: "anywhere" }}>{post.title || "Actualité club"}</div><MetaChip accent={accent}>{post.type || "post"}</MetaChip></div><div style={{ fontSize: 12.5, opacity: .84, marginTop: 7, lineHeight: 1.42, whiteSpace: "pre-wrap" }}>{post.body || "—"}</div><div style={{ fontSize: 10.5, opacity: .55, marginTop: 8 }}>{post.authorName || "Club"} • {formatDateTime(post.createdAt)}</div></div></div></div><div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", borderTop: "1px solid rgba(255,255,255,.07)", background: "rgba(255,255,255,.025)" }}><MiniPresence label="Vu" value={0} color={accent} /><MiniPresence label="J’aime" value={0} color="#7cff9d" /><MiniPresence label="Commentaires" value={0} color="#ffc857" /></div></div>;
  }

  function MatchCard({ match, accent }: { match: ClubMatch; accent: string }) {
    const conv = countByStatus(clubConvocations, match.id);
    const score = match.scoreFor != null || match.scoreAgainst != null ? `${match.scoreFor ?? 0} - ${match.scoreAgainst ?? 0}` : "VS";
    const team = clubTeams.find((t) => t.id === match.clubTeamId);
    return <div style={{ ...card(accent), padding: 0, overflow: "hidden" }}><div style={{ padding: 13, display: "grid", gap: 12 }}><div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 10, alignItems: "center" }}><div style={{ minWidth: 0 }}><div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}><MetaChip accent={accent}>{sportName(match.sport)}</MetaChip>{team ? <MetaChip accent={accent}>{team.name}</MetaChip> : null}<span style={{ fontSize: 11, opacity: .70 }}>{formatDateTime(match.startsAt)}</span></div><div style={{ fontSize: 18, fontWeight: 1000, marginTop: 8, overflowWrap: "anywhere" }}>{match.title}</div><div style={{ fontSize: 12, opacity: .75, marginTop: 5 }}>📍 {match.location || "Lieu à définir"}</div></div><div style={{ minWidth: 76, textAlign: "center", color: accent, fontSize: 28, fontWeight: 1000, borderRadius: 18, border: `1px solid ${alpha(accent,"44")}`, background: alpha(accent,"14"), padding: "10px 8px" }}>{score}</div></div><div style={{ display: "grid", gap: 7 }}><ProgressBar value={conv.present} total={Math.max(conv.total,1)} color="#7cff9d" label="Présents" /><ProgressBar value={conv.absent} total={Math.max(conv.total,1)} color="#ff6b7d" label="Absents" /></div></div><div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", borderTop: `1px solid ${alpha(accent, "22")}` }}><MiniPresence label="Présents" value={conv.present} color="#7cff9d" /><MiniPresence label="Inc." value={conv.uncertain} color="#ffc857" /><MiniPresence label="Abs." value={conv.absent} color="#ff6b7d" /><MiniPresence label="Att." value={conv.pending} color={accent} /></div></div>;
  }

  function MiniPresence({ label, value, color }: { label: string; value: number; color: string }) {
    return <div style={{ padding: 9, textAlign: "center", borderRight: "1px solid rgba(255,255,255,.06)" }}><div style={{ color, fontSize: 18, fontWeight: 1000 }}>{value}</div><div style={{ fontSize: 10, opacity: .66 }}>{label}</div></div>;
  }

  function EventCard({ event, accent }: { event: ClubEvent; accent: string }) {
    return <div style={{ ...glass(accent), padding: 12, display: "flex", gap: 11, alignItems: "center" }}><div style={{ width: 54, height: 54, borderRadius: 18, display: "grid", placeItems: "center", color: accent, border: `1px solid ${alpha(accent, "55")}`, background: alpha(accent, "15"), fontWeight: 1000 }}>{formatShortDate(event.startsAt)}</div><div style={{ minWidth: 0, flex: 1 }}><div style={{ fontWeight: 1000, overflowWrap: "anywhere" }}>{event.title}</div><div style={{ fontSize: 12, opacity: .75, marginTop: 4 }}>{formatDateTime(event.startsAt)}{event.location ? ` • ${event.location}` : ""}</div></div></div>;
  }

  function renderActu() {
    return <div style={{ display: "grid", gap: 12 }}>{canManage ? <div style={card(accent)}><SectionTitle accent={accent}>Publier une actualité</SectionTitle><div style={{ display: "grid", gap: 9, marginTop: 10 }}><input value={postTitle} onChange={(e) => setPostTitle(e.target.value)} placeholder="Titre : convocation, résultat, annonce..." style={inputStyle(accent)} /><textarea value={postText} onChange={(e) => setPostText(e.target.value)} placeholder="Message pour les membres du club..." style={{ ...inputStyle(accent), minHeight: 96, resize: "vertical" }} /><button type="button" onClick={createPost} disabled={!postText.trim() || busy} style={{ ...navButton(accent, true), width: "100%" }}>Publier dans le fil</button></div></div> : null}{clubPosts.length ? clubPosts.map((p) => <PostCard key={p.id} post={p} accent={accent} />) : <EmptyState accent={accent} title="Aucune actualité" body="Les annonces club, résultats et informations importantes apparaîtront ici." />}</div>;
  }

  function renderMatchs() {
    return <div style={{ display: "grid", gap: 12 }}>{renderTeamFilter()}{canManage ? <div style={card(accent)}><SectionTitle accent={accent}>Créer un match</SectionTitle><div style={{ display: "grid", gap: 9, marginTop: 10 }}><select value={matchTeamId} onChange={(e) => setMatchTeamId(e.target.value)} style={inputStyle(accent)}>{clubTeams.map((team) => <option key={team.id} value={team.id}>{team.name} • {sportName(team.sport)}</option>)}</select><input value={matchOpponent} onChange={(e) => setMatchOpponent(e.target.value)} placeholder="Adversaire" style={inputStyle(accent)} /><input value={matchDate} onChange={(e) => setMatchDate(e.target.value)} type="datetime-local" style={inputStyle(accent)} /><input value={matchLocation} onChange={(e) => setMatchLocation(e.target.value)} placeholder="Lieu / terrain" style={inputStyle(accent)} /><button type="button" onClick={createMatch} disabled={!matchOpponent.trim() || busy} style={{ ...navButton(accent, true), width: "100%" }}>Créer + préparer les convocations</button></div></div> : null}{filteredMatches.length ? filteredMatches.map((m) => <MatchCard key={m.id} match={m} accent={accent} />) : <EmptyState accent={accent} title="Aucun match planifié" body="Ajoute les prochains matchs puis convoque les joueurs concernés." />}</div>;
  }

  function renderConvocs() {
    const byMatch = clubMatches.map((m) => ({ match: m, convs: clubConvocations.filter((c) => c.clubMatchId === m.id) })).filter((x) => x.convs.length || true);
    return <div style={{ display: "grid", gap: 12 }}>{byMatch.length ? byMatch.map(({ match, convs }) => { const stats = countByStatus(convs); return <div key={match.id} style={card(accent)}><div style={{ display: "flex", gap: 10, alignItems: "center", justifyContent: "space-between" }}><div><div style={{ color: accent, fontWeight: 1000, fontSize: 16 }}>{match.title}</div><div style={{ fontSize: 12, opacity: .72, marginTop: 4 }}>{formatDateTime(match.startsAt)}</div></div><MetaChip accent={accent}>{stats.present}/{stats.total} présents</MetaChip></div><div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 6, marginTop: 12 }}><StatTile accent="#7cff9d" value={stats.present} label="présents" /><StatTile accent="#ffc857" value={stats.uncertain} label="incertains" /><StatTile accent="#ff6b7d" value={stats.absent} label="absents" /><StatTile accent={accent} value={stats.pending} label="attente" /></div><div style={{ display: "grid", gap: 8, marginTop: 12 }}>{convs.length ? convs.map((c) => { const st = statusLabel(c.status); return <div key={c.id} style={{ ...glass(accent), padding: 9, display: "flex", gap: 9, alignItems: "center" }}><Logo src={c.avatarUrl} name={c.displayName} accent={accent} size={38} round={999} /><div style={{ flex: 1, minWidth: 0 }}><div style={{ fontWeight: 950, overflowWrap: "anywhere" }}>{c.displayName}</div><div style={{ fontSize: 10.5, color: st.color }}>{st.label}</div></div><button type="button" onClick={() => answerConvocation(c, "present")} style={navButton("#45ff8c", c.status === "present")}>✓</button><button type="button" onClick={() => answerConvocation(c, "uncertain")} style={navButton("#ffc857", c.status === "uncertain")}>?</button><button type="button" onClick={() => answerConvocation(c, "absent")} style={navButton("#ff5a6f", c.status === "absent")}>×</button></div>}) : <EmptyState accent={accent} title="Aucun joueur convoqué" body="Les convocations seront rattachées à ce match dès que l’effectif sera choisi." />}</div></div>}) : <EmptyState accent={accent} title="Aucune convocation" body="Crée un match pour pouvoir convoquer les joueurs et suivre leurs réponses." />}</div>;
  }

  function renderAgenda() {
    const items = [...clubMatches.map(m => ({ id: `m-${m.id}`, title: m.title, type: "Match", startsAt: m.startsAt, location: m.location })), ...clubEvents.map(e => ({ id: `e-${e.id}`, title: e.title, type: sportName(e.type), startsAt: e.startsAt, location: e.location }))].sort((a,b) => String(a.startsAt || "9999").localeCompare(String(b.startsAt || "9999")));
    return <div style={{ display: "grid", gap: 12 }}>{canManage ? <div style={card(accent)}><SectionTitle accent={accent}>Ajouter un évènement</SectionTitle><div style={{ display: "grid", gap: 9, marginTop: 10 }}><input value={eventTitle} onChange={(e) => setEventTitle(e.target.value)} placeholder="Entraînement, réunion, tournoi..." style={inputStyle(accent)} /><input value={eventDate} onChange={(e) => setEventDate(e.target.value)} type="datetime-local" style={inputStyle(accent)} /><input value={eventLocation} onChange={(e) => setEventLocation(e.target.value)} placeholder="Lieu" style={inputStyle(accent)} /><button type="button" onClick={createEvent} disabled={!eventTitle.trim() || busy} style={{ ...navButton(accent, true), width: "100%" }}>Ajouter au calendrier</button></div></div> : null}{items.length ? items.map((it) => <div key={it.id} style={{ ...card(accent), display: "flex", gap: 11, alignItems: "center" }}><div style={{ width: 58, height: 58, borderRadius: 20, display: "grid", placeItems: "center", color: accent, border: `1px solid ${alpha(accent, "60")}`, background: alpha(accent, "18"), fontWeight: 1000 }}>{formatShortDate(it.startsAt)}</div><div style={{ minWidth: 0, flex: 1 }}><MetaChip accent={accent}>{it.type}</MetaChip><div style={{ marginTop: 7, fontWeight: 1000, overflowWrap: "anywhere" }}>{it.title}</div><div style={{ fontSize: 12, opacity: .75, marginTop: 4 }}>{formatDateTime(it.startsAt)}{it.location ? ` • ${it.location}` : ""}</div></div></div>) : <EmptyState accent={accent} title="Agenda vide" body="Les entraînements, réunions, matchs et tournois apparaîtront ici." />}</div>;
  }

  function renderEffectif() {
    const groups: Record<string, ClubMember[]> = {};
    clubMembers.forEach((m) => { const key = roleLabel(m.role); groups[key] = [...(groups[key] || []), m]; });
    return <div style={{ display: "grid", gap: 12 }}>{canManage ? <div style={card(accent)}><SectionTitle accent={accent}>Inviter un joueur Online</SectionTitle><select value={selectedInviteTeam} onChange={(e) => setSelectedInviteTeam(e.target.value)} style={{ ...inputStyle(accent), marginTop: 10 }}><option value="">Club complet</option>{clubTeams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}</select><div style={{ display: "flex", gap: 8, marginTop: 10 }}><input value={inviteQuery} onChange={(e) => setInviteQuery(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") runUserSearch(); }} placeholder="Pseudo ou email" style={inputStyle(accent)} /><button type="button" onClick={runUserSearch} style={navButton(accent, true)}>OK</button></div><div style={{ display: "grid", gap: 8, marginTop: 10 }}>{inviteResults.map((u) => <button key={u.id} type="button" onClick={() => sendClubInvite(u)} style={{ ...card(accent), color: "#fff", textAlign: "left", display: "flex", alignItems: "center", gap: 10 }}><Logo src={u.avatarUrl} name={u.displayName || u.nickname || "Joueur"} accent={accent} size={36} round={999} /><span style={{ fontWeight: 950 }}>{u.displayName || u.nickname}</span><span style={{ marginLeft: "auto", color: accent, fontWeight: 1000 }}>Inviter</span></button>)}</div></div> : null}{Object.keys(groups).length ? Object.entries(groups).map(([role, members]) => <div key={role} style={card(accent)}><SectionTitle accent={accent}>{role}</SectionTitle><div style={{ display: "grid", gap: 8, marginTop: 12 }}>{members.map((m) => <div key={m.id} style={{ ...glass(accent), padding: 10, display: "flex", gap: 10, alignItems: "center" }}><Logo src={m.avatarUrl} name={m.displayName} accent={accent} size={42} round={999} /><div style={{ minWidth: 0, flex: 1 }}><div style={{ fontWeight: 1000, overflowWrap: "anywhere" }}>{m.displayName}</div><div style={{ fontSize: 11, opacity: .7 }}>{roleLabel(m.role)} • {m.status || "actif"}</div></div><MetaChip accent={accent}>{roleLabel(m.role)}</MetaChip></div>)}</div></div>) : <EmptyState accent={accent} title="Aucun membre" body="Invite les membres du club pour gérer l’effectif et les convocations." />}</div>;
  }

  function renderEquipes() {
    const bySport: Record<string, ClubTeam[]> = {};
    filteredTeams.forEach((t) => { const key = sportName(t.sport); bySport[key] = [...(bySport[key] || []), t]; });
    return <div style={{ display: "grid", gap: 12 }}>{renderTeamFilter()}{Object.keys(bySport).length ? Object.entries(bySport).map(([sport, teams], idx) => <div key={sport} style={card(teamColor(idx, accent))}><SectionTitle accent={teamColor(idx, accent)}>{sport}</SectionTitle><div style={{ display: "grid", gap: 9, marginTop: 12 }}>{teams.map((team) => <div key={team.id} style={{ ...glass(teamColor(idx, accent)), padding: 12, display: "flex", gap: 11, alignItems: "center" }}><Logo src={team.logoUrl || team.logoDataUrl} name={team.name} accent={teamColor(idx, accent)} size={52} round={17} /><div style={{ flex: 1, minWidth: 0 }}><div style={{ fontWeight: 1000, fontSize: 16, overflowWrap: "anywhere" }}>{team.name}</div><div style={{ fontSize: 12, opacity: .72, marginTop: 4 }}>{team.membersCount || 0} membre(s) • {sportName(team.sport)}</div></div><MetaChip accent={teamColor(idx, accent)}>Détails</MetaChip></div>)}</div></div>) : <EmptyState accent={accent} title="Aucune équipe" body="Synchronise une équipe Club depuis Teams ou crée une équipe rattachée au club." />}</div>;
  }

  function renderMessages() {
    const channels = ["Général", "Bureau", "Coachs", "Convocations", ...clubTeams.map((t) => t.name)];
    return <div style={{ display: "grid", gap: 12 }}><div style={card(accent)}><SectionTitle accent={accent}>Messagerie club</SectionTitle><div style={{ marginTop: 8, fontSize: 12.5, opacity: .76, lineHeight: 1.35 }}>Organisation des salons prête pour connecter ensuite les messages temps réel : club, bureau, coachs, convocations et salons par équipe.</div><div style={{ display: "grid", gap: 9, marginTop: 12 }}>{channels.map((c, i) => <div key={c} style={{ ...glass(accent), padding: 12, display: "flex", gap: 10, alignItems: "center" }}><div style={iconButton(i < 4 ? accent : teamColor(i, accent))}>{i === 0 ? "#" : i < 4 ? "•" : "⚑"}</div><div style={{ flex: 1, minWidth: 0 }}><div style={{ fontWeight: 1000, overflowWrap: "anywhere" }}>{c}</div><div style={{ fontSize: 11.5, opacity: .72 }}>{i === 0 ? "Salon général du club" : i === 1 ? "Échanges administrateurs / bureau" : i === 2 ? "Consignes staff et coachs" : i === 3 ? "Questions de présence et relances" : "Salon d’équipe"}</div></div><MetaChip accent={accent}>Bientôt</MetaChip></div>)}</div></div><EmptyState accent={accent} title="Chat à brancher" body="La structure est détaillée. Prochaine étape : relier ces salons à la messagerie existante et aux notifications." /></div>;
  }

  function renderPhotos() {
    const boxes = ["Photos de match", "Entraînements", "Tournois", "Troisième mi-temps", "Logos & médias", "Archives"];
    return <div style={{ display: "grid", gap: 12 }}><div style={card(accent)}><SectionTitle accent={accent}>Galerie club</SectionTitle><div style={{ marginTop: 8, fontSize: 12.5, opacity: .76 }}>Albums organisés par type, prêts à recevoir photos et médias partagés par les membres.</div></div><div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 10 }}>{boxes.map((b, i) => <div key={b} style={{ ...card(teamColor(i, accent)), minHeight: 112, display: "grid", alignContent: "end", background: `radial-gradient(circle at 30% 10%, ${alpha(teamColor(i, accent),"35")}, rgba(255,255,255,.04) 48%, rgba(0,0,0,.28))` }}><div style={{ color: teamColor(i, accent), fontWeight: 1000 }}>{b}</div><div style={{ fontSize: 11, opacity: .7, marginTop: 4 }}>0 photo • album à compléter</div></div>)}</div></div>;
  }

  function renderDocuments() {
    const docs = ["Règlement intérieur", "Licences", "Feuilles de match", "Convocations PDF", "PV de réunion", "Documents administratifs"];
    return <div style={{ display: "grid", gap: 12 }}><div style={card(accent)}><SectionTitle accent={accent}>Documents club</SectionTitle><div style={{ marginTop: 8, fontSize: 12.5, opacity: .76 }}>Espace documentaire pour stocker et retrouver les fichiers utiles au club.</div></div><div style={{ display: "grid", gap: 9 }}>{docs.map((d, i) => <div key={d} style={{ ...glass(accent), padding: 12, display: "grid", gridTemplateColumns: "46px 1fr auto", gap: 10, alignItems: "center" }}><div style={iconButton(teamColor(i, accent))}>▣</div><div style={{ minWidth: 0 }}><div style={{ fontWeight: 1000 }}>{d}</div><div style={{ fontSize: 11.5, opacity: .72 }}>Aucun fichier ajouté pour l’instant</div></div><MetaChip accent={accent}>Ajouter</MetaChip></div>)}</div></div>;
  }

  function renderReglages() {
    return <div style={{ display: "grid", gap: 12 }}><div style={card(accent)}><SectionTitle accent={accent}>Réglages & administration</SectionTitle><div style={{ marginTop: 10 }}><DetailRow accent={accent} label="Visibilité" value={selectedClub?.visibility || "members"} /><DetailRow accent={accent} label="Sports" value={(selectedClub?.sports || []).map(sportName).join(", ") || "Multisports"} /><DetailRow accent={accent} label="Rôles" value="Président, Admin, Coach, Capitaine, Joueur, Membre" /><DetailRow accent={accent} label="Permissions" value="Admins, coachs et capitaines peuvent créer matchs, actus, évènements et gérer les convocations." /><DetailRow accent={accent} label="Données" value="Clubs, équipes, effectif, posts, agenda, matchs et convocations sont synchronisés Online." /></div></div><div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 10 }}><QuickAction accent={accent} title="Modifier identité" body="Logo, couverture, description, sports associés." onClick={() => {}} /><QuickAction accent="#7cff9d" title="Gérer rôles" body="Promouvoir coach, capitaine ou administrateur." onClick={() => {}} /><QuickAction accent="#ffc857" title="Invitations" body="Codes, liens, QR code et demandes en attente." onClick={() => setClubTab("effectif")} /><QuickAction accent="#ff6b7d" title="Zone danger" body="Archivage, suppression, transfert de propriété." onClick={() => {}} /></div></div>;
  }

  function renderCurrentTab() {
    if (clubTab === "home") return renderHome();
    if (clubTab === "actu") return renderActu();
    if (clubTab === "matchs") return renderMatchs();
    if (clubTab === "convocs") return renderConvocs();
    if (clubTab === "agenda") return renderAgenda();
    if (clubTab === "effectif") return renderEffectif();
    if (clubTab === "equipes") return renderEquipes();
    if (clubTab === "messages") return renderMessages();
    if (clubTab === "photos") return renderPhotos();
    if (clubTab === "documents") return renderDocuments();
    return renderReglages();
  }

  if (fullscreenMode === "club" && selectedClub) {
    return (
      <div style={{ position: "fixed", inset: 0, zIndex: 9999, overflowY: "auto", background: "radial-gradient(circle at 50% 0%, rgba(20,75,90,.42), #020711 38%, #000 100%)", color: "#fff", WebkitOverflowScrolling: "touch" }}>
        <div style={{ maxWidth: 820, margin: "0 auto", paddingBottom: 92 }}>
          {renderClubHeader()}
          {error ? <div style={{ margin: "0 12px 12px", ...card("#ff5a6f"), color: "#ffd9df", fontSize: 12 }}>{error}</div> : null}
          <div style={{ padding: "0 12px 20px", display: "grid", gap: 12 }}>{renderCurrentTab()}</div>
        </div>
        {showClubInfo ? <div style={{ position: "fixed", inset: 0, zIndex: 10000, background: "rgba(0,0,0,.74)", display: "grid", placeItems: "center", padding: 18 }} onClick={() => setShowClubInfo(false)}><div style={{ ...card(accent), maxWidth: 460, width: "100%" }} onClick={(e) => e.stopPropagation()}><SectionTitle accent={accent}>Espace club</SectionTitle><div style={{ marginTop: 10, lineHeight: 1.45, fontSize: 13.5 }}>Interface type SportEasy : accueil vivant, actualités, matchs, convocations, agenda, effectif, équipes, messages et réglages. Les informations sont rattachées au club et restent compatibles avec tous les sports.</div><button type="button" onClick={() => setShowClubInfo(false)} style={{ ...navButton(accent, true), width: "100%", marginTop: 14 }}>Fermer</button></div></div> : null}
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 1000, color: accent, letterSpacing: .4 }}>CLUBS</div>
          <div style={{ fontSize: 12, opacity: .78 }}>Clubs et équipes Online que tu as rejoints.</div>
        </div>
        <button type="button" onClick={reload} disabled={busy} style={iconButton(accent)}>↻</button>
      </div>

      {!signedIn ? <div style={card(accent)}>Connecte ton compte Online pour afficher les clubs partagés.</div> : null}
      {error ? <div style={{ ...card("#ff5a6f"), color: "#ffd9df", fontSize: 12 }}>{error}</div> : null}

      <div style={card(accent)}>
        <div style={{ fontWeight: 1000, marginBottom: 8 }}>Créer un club</div>
        <div style={{ display: "flex", gap: 8 }}>
          <input value={newClubName} onChange={(e) => setNewClubName(e.target.value)} placeholder="Nom du club" style={inputStyle(accent)} />
          <button type="button" disabled={!newClubName.trim() || busy || !signedIn} onClick={handleCreateClub} style={{ borderRadius: 16, border: 0, background: !newClubName.trim() || !signedIn ? "rgba(255,255,255,.12)" : `linear-gradient(135deg, ${accent}, ${alpha(accent, "99")})`, color: "#001018", padding: "0 15px", fontWeight: 1000 }}>Créer</button>
        </div>
      </div>

      {invites.length ? <div style={card(accent)}><div style={{ fontWeight: 1000, marginBottom: 8 }}>Invitations en attente</div><div style={{ display: "grid", gap: 8 }}>{invites.map((it) => <div key={it.id} style={{ borderRadius: 16, background: "rgba(255,255,255,.055)", padding: 10, display: "grid", gap: 8 }}><div style={{ fontWeight: 900 }}>{it.clubName || "Club"}{it.teamName ? ` • ${it.teamName}` : ""}</div><div style={{ fontSize: 11, opacity: .72 }}>Invité par {it.senderName || "un membre"}</div><div style={{ display: "flex", gap: 8 }}><button type="button" onClick={() => handleInvite(it.id, "accepted")} style={{ flex: 1, borderRadius: 12, border: 0, padding: 9, fontWeight: 1000, background: "rgba(84,255,145,.22)", color: "#9dffbd" }}>Accepter</button><button type="button" onClick={() => handleInvite(it.id, "refused")} style={{ flex: 1, borderRadius: 12, border: 0, padding: 9, fontWeight: 1000, background: "rgba(255,90,111,.16)", color: "#ff9baa" }}>Refuser</button></div></div>)}</div></div> : null}

      <div style={{ display: "grid", gap: 10 }}>
        {clubs.length === 0 ? <div style={card(accent)}><div style={{ fontWeight: 1000 }}>Aucun club Online rejoint</div><div style={{ marginTop: 6, fontSize: 12, opacity: .76 }}>Crée un club ou accepte une invitation. Les équipes “Club” créées dans Teams peuvent être synchronisées ici.</div></div> : clubs.map((club) => {
          const teams = teamsByClub[club.id] || [];
          return <button type="button" key={club.id} onClick={() => openClub(club.id)} style={{ ...card(accent), color: "#fff", textAlign: "left" }}><div style={{ display: "flex", gap: 10, alignItems: "center" }}><Logo src={club.logoUrl} name={club.name} accent={accent} /><div style={{ minWidth: 0, flex: 1 }}><div style={{ fontWeight: 1000, fontSize: 16, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{club.name}</div><div style={{ fontSize: 11, opacity: .72 }}>{club.membersCount || 0} membre(s) • {teams.length} équipe(s) • rôle {roleLabel(club.role)}</div></div><div style={{ color: accent, fontWeight: 1000 }}>Ouvrir</div></div></button>;
        })}
      </div>

      {localClubTeams.length ? <div style={card(accent)}><div style={{ fontWeight: 1000 }}>Équipes Club locales à synchroniser</div><div style={{ marginTop: 6, fontSize: 11.5, opacity: .72 }}>Clique sur “Synchroniser” pour créer l’espace club Online et ouvrir sa page.</div><div style={{ marginTop: 10, display: "grid", gap: 8 }}>{localClubTeams.slice(0, 12).map((t: any) => <div key={t.id} style={{ borderRadius: 16, padding: 10, background: "rgba(255,255,255,.05)", display: "flex", gap: 9, alignItems: "center" }}><Logo src={t.logoDataUrl || t.logoUrl} name={t.name} accent={accent} size={36} /><div style={{ minWidth: 0, flex: 1 }}><div style={{ fontWeight: 950 }}>{t.name}</div><div style={{ fontSize: 10.5, opacity: .72 }}>{t.clubName || t.name} • {sportsLabel(t)}</div></div><button type="button" disabled={busy || !signedIn} onClick={() => syncLocalTeam(t)} style={navButton(accent, true)}>Synchroniser</button></div>)}</div></div> : null}
    </div>
  );
}
