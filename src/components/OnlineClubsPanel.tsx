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

type ClubTab = "accueil" | "actu" | "equipes" | "membres" | "matchs" | "convocations" | "calendrier" | "invitations" | "reglages";

const MANAGER_ROLES = new Set(["owner", "admin", "coach", "captain"]);

function alpha(hex = "#22e6ff", opacity = "33") {
  const h = /^#[0-9a-f]{6}$/i.test(hex) ? hex : "#22e6ff";
  return `${h}${opacity}`;
}

function card(accent: string): React.CSSProperties {
  return {
    borderRadius: 18,
    border: `1px solid ${alpha(accent, "38")}`,
    background: `linear-gradient(145deg, ${alpha(accent, "14")}, rgba(255,255,255,.045))`,
    boxShadow: `0 0 22px ${alpha(accent, "14")}, inset 0 1px 0 rgba(255,255,255,.055)`,
    padding: 12,
  };
}

function tinyButton(accent: string, active = false): React.CSSProperties {
  return {
    borderRadius: 14,
    border: `1px solid ${alpha(accent, active ? "dd" : "48")}`,
    background: active ? `linear-gradient(135deg, ${alpha(accent, "3b")}, ${alpha(accent, "16")})` : "rgba(255,255,255,.045)",
    color: active ? accent : "#fff",
    padding: "9px 11px",
    fontWeight: 1000,
    boxShadow: active ? `0 0 18px ${alpha(accent, "30")}` : undefined,
  };
}

function inputStyle(accent: string): React.CSSProperties {
  return {
    minWidth: 0,
    width: "100%",
    boxSizing: "border-box",
    borderRadius: 14,
    border: `1px solid ${alpha(accent, "46")}`,
    background: "rgba(0,0,0,.28)",
    color: "#fff",
    padding: "11px 12px",
    fontWeight: 800,
    outline: "none",
  };
}

function Logo({ src, name, accent, size = 44, round = 14 }: { src?: string | null; name: string; accent: string; size?: number; round?: number }) {
  return (
    <div style={{ width: size, height: size, borderRadius: round, overflow: "hidden", flex: "0 0 auto", display: "grid", placeItems: "center", border: `1px solid ${alpha(accent, "80")}`, background: `radial-gradient(circle at 35% 25%, ${alpha(accent, "44")}, rgba(0,0,0,.62))`, color: accent, fontWeight: 1000 }}>
      {src ? <img src={src} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : name.slice(0, 2).toUpperCase()}
    </div>
  );
}

function sportsLabel(team: any) {
  const ids = Array.isArray(team?.sportIds) ? team.sportIds : team?.sport ? [team.sport] : [];
  if (team?.allSports) return "tous les sports";
  return ids.filter(Boolean).join(", ") || "multisports";
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

function statusLabel(status?: string) {
  const raw = String(status || "pending").toLowerCase();
  if (raw === "present") return { label: "Présent", color: "#7cff9d" };
  if (raw === "absent") return { label: "Absent", color: "#ff6b7d" };
  if (raw === "uncertain") return { label: "Incertain", color: "#ffc857" };
  return { label: "En attente", color: "#d9e8ff" };
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

function SectionTitle({ children, accent }: { children: React.ReactNode; accent: string }) {
  return <div style={{ color: accent, fontSize: 18, fontWeight: 1000, letterSpacing: .45 }}>{children}</div>;
}

function StatTile({ value, label, accent }: { value: React.ReactNode; label: string; accent: string }) {
  return <div style={{ ...card(accent), textAlign: "center", padding: 10 }}><div style={{ fontSize: 22, fontWeight: 1000 }}>{value}</div><div style={{ fontSize: 10.5, opacity: .72, marginTop: 2 }}>{label}</div></div>;
}

function MetaChip({ children, accent }: { children: React.ReactNode; accent: string }) {
  return <span style={{ display: "inline-flex", alignItems: "center", gap: 6, borderRadius: 999, border: `1px solid ${alpha(accent, "55")}`, background: `linear-gradient(135deg, ${alpha(accent, "24")}, rgba(255,255,255,.045))`, color: "#fff", padding: "6px 9px", fontSize: 11, fontWeight: 950, boxShadow: `0 0 14px ${alpha(accent, "18")}` }}>{children}</span>;
}

function EmptyState({ title, body, accent }: { title: string; body: string; accent: string }) {
  return <div style={{ ...card(accent), minHeight: 92, display: "grid", alignContent: "center", textAlign: "center" }}><div style={{ color: accent, fontWeight: 1000, fontSize: 17 }}>{title}</div><div style={{ marginTop: 7, fontSize: 12, opacity: .72, lineHeight: 1.35 }}>{body}</div></div>;
}

function ClubActionCard({ title, subtitle, icon, accent, onClick }: { title: string; subtitle: string; icon: string; accent: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} style={{ ...card(accent), color: "#fff", textAlign: "left", minHeight: 104, position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", right: -18, top: -22, fontSize: 68, opacity: .11 }}>{icon}</div>
      <div style={{ width: 40, height: 40, borderRadius: 16, display: "grid", placeItems: "center", color: accent, border: `1px solid ${alpha(accent, "55")}`, background: `radial-gradient(circle, ${alpha(accent, "28")}, rgba(0,0,0,.18))`, boxShadow: `0 0 18px ${alpha(accent, "20")}`, fontWeight: 1000 }}>{icon}</div>
      <div style={{ marginTop: 10, color: accent, fontWeight: 1000, fontSize: 16 }}>{title}</div>
      <div style={{ marginTop: 5, fontSize: 11.5, opacity: .75, lineHeight: 1.25 }}>{subtitle}</div>
    </button>
  );
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
  const [clubTab, setClubTab] = React.useState<ClubTab>("accueil");
  const [showClubInfo, setShowClubInfo] = React.useState(false);

  const [postText, setPostText] = React.useState("");
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

  const openClub = React.useCallback(async (clubId: string, tab: ClubTab = "accueil") => {
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
      setSelectedInviteTeam((detail.teams || [])[0]?.id || "");
      setMatchTeamId((detail.teams || [])[0]?.id || "");
    } catch (e: any) {
      setError(e?.message || "Impossible d’ouvrir l’espace club");
    } finally {
      setBusy(false);
    }
  }, [signedIn]);

  React.useEffect(() => { reload(); }, [reload]);

  const canManage = React.useMemo(() => MANAGER_ROLES.has(String(selectedClub?.role || "")), [selectedClub?.role]);
  const nextMatches = React.useMemo(() => clubMatches.filter((m) => String(m.status || "scheduled") !== "finished"), [clubMatches]);
  const pendingConvocations = React.useMemo(() => clubConvocations.filter((c) => String(c.status || "pending") === "pending"), [clubConvocations]);

  async function handleCreateClub() {
    const name = newClubName.trim();
    if (!name || busy) return;
    setBusy(true);
    try {
      const club = await createClub({ name, sports: [], visibility: "members" });
      setNewClubName("");
      await reload();
      if (club?.id) await openClub(club.id, "accueil");
    } catch (e: any) {
      setError(e?.message || "Création du club impossible");
    } finally {
      setBusy(false);
    }
  }

  async function handleInvite(id: string, status: "accepted" | "refused") {
    setBusy(true);
    try { await respondClubInvite(id, status); await reload(); }
    catch (e: any) { setError(e?.message || "Réponse impossible"); }
    finally { setBusy(false); }
  }

  async function syncLocalTeam(localTeam: any) {
    if (!signedIn || busy) return;
    setBusy(true);
    setError(null);
    try {
      const clubName = String(localTeam.clubName || localTeam.name || "Club").trim();
      let club = clubs.find((c) => c.name.toLowerCase() === clubName.toLowerCase()) || null;
      if (!club) {
        club = await createClub({
          name: clubName,
          description: localTeam.description || "",
          logoUrl: localTeam.logoUrl || null,
          sports: Array.isArray(localTeam.sportIds) ? localTeam.sportIds : [teamMainSport(localTeam)],
          visibility: localTeam.clubVisibility || "members",
        });
      }
      const team = await upsertClubTeam({
        clubId: club.id,
        localTeamId: localTeam.id,
        sport: teamMainSport(localTeam),
        name: localTeam.name,
        logoUrl: localTeam.logoUrl || null,
        logoDataUrl: localTeam.logoDataUrl || null,
        description: localTeam.description || null,
        playerIds: Array.isArray(localTeam.playerIds) ? localTeam.playerIds : [],
      } as any);
      upsertTeam({ ...localTeam, clubId: club.id, clubName: club.name, clubRole: "owner", syncedClubTeamId: team.id, updatedAt: Date.now() });
      await reload();
      await openClub(club.id, "accueil");
    } catch (e: any) {
      setError(e?.message || "Synchronisation impossible");
    } finally {
      setBusy(false);
    }
  }

  async function publishPost() {
    const body = postText.trim();
    if (!selectedClubId || !body || busy) return;
    setBusy(true);
    try {
      await createClubPost({ clubId: selectedClubId, body, type: "post" });
      setPostText("");
      await openClub(selectedClubId, "actu");
    } catch (e: any) {
      setError(e?.message || "Publication impossible");
    } finally {
      setBusy(false);
    }
  }

  async function createEvent() {
    if (!selectedClubId || !eventTitle.trim() || busy) return;
    setBusy(true);
    try {
      await createClubEvent({ clubId: selectedClubId, title: eventTitle.trim(), startsAt: eventDate ? new Date(eventDate).toISOString() : null, location: eventLocation.trim(), type: "event" });
      setEventTitle(""); setEventDate(""); setEventLocation("");
      await openClub(selectedClubId, "calendrier");
    } catch (e: any) {
      setError(e?.message || "Création évènement impossible");
    } finally { setBusy(false); }
  }

  async function createMatch() {
    if (!selectedClubId || !matchOpponent.trim() || busy) return;
    const team = clubTeams.find((t) => t.id === matchTeamId) || clubTeams[0] || null;
    setBusy(true);
    try {
      await createClubMatch({
        clubId: selectedClubId,
        clubTeamId: team?.id || null,
        sport: team?.sport || "generic",
        opponent: matchOpponent.trim(),
        title: `${team?.name || selectedClub?.name || "Club"} vs ${matchOpponent.trim()}`,
        startsAt: matchDate ? new Date(matchDate).toISOString() : null,
        location: matchLocation.trim(),
      });
      setMatchOpponent(""); setMatchDate(""); setMatchLocation("");
      await openClub(selectedClubId, "matchs");
    } catch (e: any) {
      setError(e?.message || "Création match impossible");
    } finally { setBusy(false); }
  }

  async function runUserSearch() {
    const q = inviteQuery.trim();
    if (q.length < 2) return;
    setBusy(true);
    try { setInviteResults(await searchUsers(q)); }
    catch (e: any) { setError(e?.message || "Recherche impossible"); }
    finally { setBusy(false); }
  }

  async function sendClubInvite(user: OnlineFriendUser) {
    if (!selectedClubId || !user.id) return;
    setBusy(true);
    try {
      await inviteUserToClub({ clubId: selectedClubId, clubTeamId: selectedInviteTeam || null, targetUserId: user.id, role: "player" });
      setInviteQuery("");
      setInviteResults([]);
      await openClub(selectedClubId, "invitations");
    } catch (e: any) {
      setError(e?.message || "Invitation impossible");
    } finally {
      setBusy(false);
    }
  }

  async function answerConvocation(convocation: ClubConvocation, status: "present" | "absent" | "uncertain") {
    if (!selectedClubId || busy) return;
    setBusy(true);
    try {
      await respondClubConvocation({ clubId: selectedClubId, convocationId: convocation.id, status });
      await openClub(selectedClubId, "convocations");
    } catch (e: any) {
      setError(e?.message || "Réponse convocation impossible");
    } finally { setBusy(false); }
  }

  if (selectedClub && selectedClubId) {
    const tabs: { id: ClubTab; label: string; icon: string }[] = [
      { id: "accueil", label: "Accueil", icon: "⌂" },
      { id: "actu", label: "Actu", icon: "•" },
      { id: "matchs", label: "Matchs", icon: "⚔" },
      { id: "convocations", label: "Convocs", icon: "✓" },
      { id: "calendrier", label: "Agenda", icon: "□" },
      { id: "membres", label: "Effectif", icon: "◌" },
      { id: "equipes", label: "Équipes", icon: "◇" },
      { id: "invitations", label: "Inviter", icon: "+" },
      { id: "reglages", label: "Réglages", icon: "⚙" },
    ];
    const selectedTeam = clubTeams.find((t) => t.id === matchTeamId) || clubTeams[0] || null;
    const heroLogo = selectedClub.logoUrl || clubTeams[0]?.logoDataUrl || clubTeams[0]?.logoUrl || null;
    const overlay: React.CSSProperties = {
      position: "fixed",
      inset: 0,
      zIndex: 9999,
      color: "#fff",
      background: `radial-gradient(circle at 18% -8%, ${alpha(accent, "40")}, transparent 34%), radial-gradient(circle at 88% 0%, rgba(255,255,255,.10), transparent 30%), linear-gradient(180deg, #071725 0%, #02050b 78%)`,
      overflowY: "auto",
      WebkitOverflowScrolling: "touch",
      padding: "18px clamp(12px, 4vw, 28px) 96px",
      boxSizing: "border-box",
    };
    const pageShell: React.CSSProperties = { maxWidth: 880, margin: "0 auto", display: "grid", gap: 14 };
    const dotButton: React.CSSProperties = {
      width: 54,
      height: 54,
      borderRadius: 999,
      border: `1px solid ${alpha(accent, "aa")}`,
      background: "rgba(0,0,0,.46)",
      color: accent,
      fontSize: 25,
      fontWeight: 1000,
      display: "grid",
      placeItems: "center",
      boxShadow: `0 0 20px ${alpha(accent, "35")}`,
    };
    const tabBar: React.CSSProperties = {
      position: "sticky",
      top: 0,
      zIndex: 5,
      display: "flex",
      gap: 8,
      overflowX: "auto",
      padding: "12px 3px 14px",
      margin: "0 -3px",
      scrollbarWidth: "none",
      background: `linear-gradient(180deg, rgba(4,13,21,.98), rgba(4,13,21,.86), rgba(4,13,21,.70))`,
      backdropFilter: "blur(12px)",
    };
    const panelTitle = tabs.find((t) => t.id === clubTab)?.label || "Club";

    return (
      <div style={overlay}>
        <div style={pageShell}>
          <div style={{ position: "relative", minHeight: 242, borderRadius: 30, overflow: "hidden", border: `1px solid ${alpha(accent, "5e")}`, boxShadow: `0 0 28px ${alpha(accent, "20")}` }}>
            <div style={{ position: "absolute", inset: 0, background: selectedClub.coverUrl ? `linear-gradient(180deg, rgba(0,0,0,.12), rgba(0,0,0,.78)), url(${selectedClub.coverUrl}) center/cover` : `radial-gradient(circle at 20% 10%, ${alpha(accent, "40")}, transparent 34%), radial-gradient(circle at 78% 30%, rgba(255,255,255,.12), transparent 28%), linear-gradient(135deg, ${alpha(accent, "22")}, rgba(255,255,255,.035))` }} />
            {heroLogo ? <img src={heroLogo} alt="" style={{ position: "absolute", right: -28, bottom: -38, width: 170, height: 170, objectFit: "cover", opacity: .22, filter: "blur(.2px)", borderRadius: 999 }} /> : null}
            <div style={{ position: "relative", zIndex: 1, padding: 16, display: "grid", gap: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
                <button type="button" onClick={() => { setSelectedClubId(null); setSelectedClub(null); setShowClubInfo(false); reload(); }} style={dotButton} aria-label="Retour">←</button>
                <button type="button" onClick={() => setShowClubInfo(true)} style={dotButton} aria-label="Infos">i</button>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <Logo src={heroLogo} name={selectedClub.name} accent={accent} size={72} round={999} />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: "clamp(28px, 8vw, 44px)", lineHeight: .92, color: accent, fontWeight: 1000, letterSpacing: .6, overflowWrap: "anywhere", textShadow: `0 0 18px ${alpha(accent, "55")}` }}>{selectedClub.name}</div>
                  <div style={{ marginTop: 7, fontSize: 12.5, opacity: .86 }}>{selectedClub.membersCount || clubMembers.length} membre(s) • {clubTeams.length} équipe(s) • rôle {roleLabel(selectedClub.role)}</div><div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginTop: 10 }}><MetaChip accent={accent}>{selectedClub.visibility || "members"}</MetaChip><MetaChip accent={accent}>{(selectedClub.sports || []).join(" • ") || "MULTISPORTS"}</MetaChip></div>
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(70px, 1fr))", gap: 8 }}>
                <StatTile accent={accent} value={clubMembers.length} label="Effectif" />
                <StatTile accent={accent} value={clubTeams.length} label="Équipes" />
                <StatTile accent={accent} value={nextMatches.length} label="Matchs" />
                <StatTile accent={accent} value={pendingConvocations.length} label="Réponses" />
              </div>
            </div>
          </div>

          <div style={tabBar}>
            {tabs.map((t) => <button key={t.id} type="button" onClick={() => setClubTab(t.id)} style={{ ...tinyButton(accent, clubTab === t.id), flex: "0 0 auto", minWidth: 112, borderRadius: 20, display: "grid", gridTemplateColumns: "24px 1fr", gap: 7, alignItems: "center" }}><span style={{ display: "grid", placeItems: "center", width: 24, height: 24, borderRadius: 999, background: clubTab === t.id ? alpha(accent, "22") : "rgba(255,255,255,.05)" }}>{t.icon}</span><span>{t.label}</span></button>)}
          </div>

          {error ? <div style={{ ...card("#ff5a6f"), color: "#ffd9df", fontSize: 12 }}>{error}</div> : null}

          {clubTab !== "accueil" ? <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}><SectionTitle accent={accent}>{panelTitle}</SectionTitle><button type="button" onClick={() => openClub(selectedClubId, clubTab)} disabled={busy} style={tinyButton(accent)}>↻</button></div> : null}

          {clubTab === "accueil" ? (
            <div style={{ display: "grid", gap: 14 }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10 }}>
                <ClubActionCard accent={accent} icon="⚔" title="Matchs" subtitle={nextMatches.length ? `${nextMatches.length} match(s) à préparer` : "Planifie le prochain match"} onClick={() => setClubTab("matchs")} />
                <ClubActionCard accent={accent} icon="✓" title="Convocations" subtitle={pendingConvocations.length ? `${pendingConvocations.length} réponse(s) attendue(s)` : "Présents, absents, incertains"} onClick={() => setClubTab("convocations")} />
                <ClubActionCard accent={accent} icon="•" title="Actualités" subtitle={clubPosts.length ? `${clubPosts.length} publication(s)` : "Annonce, photo, info coach"} onClick={() => setClubTab("actu")} />
                <ClubActionCard accent={accent} icon="◌" title="Effectif" subtitle={`${clubMembers.length} membre(s) dans le club`} onClick={() => setClubTab("membres")} />
              </div>
              <div style={{ ...card(accent), padding: 14 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                  <SectionTitle accent={accent}>À la une du club</SectionTitle>
                  <MetaChip accent={accent}>LIVE CLUB</MetaChip>
                </div>
                {nextMatches[0] ? <button type="button" onClick={() => setClubTab("matchs")} style={{ marginTop: 12, width: "100%", border: `1px solid ${alpha(accent, "34")}`, color: "#fff", textAlign: "left", borderRadius: 22, padding: 12, background: `linear-gradient(135deg, ${alpha(accent, "1e")}, rgba(255,255,255,.055))`, display: "flex", gap: 12, alignItems: "center" }}><Logo src={clubTeams.find(t => t.id === nextMatches[0].clubTeamId)?.logoDataUrl || clubTeams.find(t => t.id === nextMatches[0].clubTeamId)?.logoUrl} name={nextMatches[0].teamName || selectedClub.name} accent={accent} size={54} round={18} /><div style={{ minWidth: 0, flex: 1 }}><div style={{ fontWeight: 1000, overflowWrap: "anywhere", fontSize: 16 }}>{nextMatches[0].title}</div><div style={{ fontSize: 12, opacity: .76, marginTop: 4 }}>{formatDateTime(nextMatches[0].startsAt)}{nextMatches[0].location ? ` • ${nextMatches[0].location}` : ""}</div></div><span style={{ color: accent, fontWeight: 1000 }}>Voir</span></button> : <EmptyState accent={accent} title="Aucun match planifié" body="Crée un match pour afficher les convocations et préparer l’équipe." />}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 10 }}>
                <button type="button" onClick={() => setClubTab("calendrier")} style={{ ...tinyButton(accent), minHeight: 54 }}>Agenda</button>
                <button type="button" onClick={() => setClubTab("equipes")} style={{ ...tinyButton(accent), minHeight: 54 }}>Équipes</button>
                <button type="button" onClick={() => setClubTab("invitations")} style={{ ...tinyButton(accent), minHeight: 54 }}>Inviter</button>
              </div>
            </div>
          ) : null}

          {clubTab === "actu" ? (
            <div style={{ display: "grid", gap: 12 }}>
              {canManage ? <div style={card(accent)}><SectionTitle accent={accent}>Nouvelle publication</SectionTitle><textarea value={postText} onChange={(e) => setPostText(e.target.value)} placeholder="Annonce, résultat, info entraînement, message du coach..." style={{ ...inputStyle(accent), minHeight: 112, marginTop: 10, resize: "vertical" }} /><button type="button" onClick={publishPost} disabled={!postText.trim() || busy} style={{ ...tinyButton(accent, true), width: "100%", marginTop: 8 }}>Publier dans l’actu</button></div> : null}
              {clubPosts.length ? clubPosts.map((p) => <div key={p.id} style={{ ...card(accent), padding: 14 }}><div style={{ display: "flex", gap: 10, alignItems: "center" }}><Logo src={selectedClub.logoUrl} name={selectedClub.name} accent={accent} size={38} round={999} /><div><div style={{ fontWeight: 1000 }}>{p.title || "Actualité du club"}</div><div style={{ fontSize: 10.5, opacity: .65 }}>{p.authorName || "Club"} • {p.createdAt ? new Date(p.createdAt).toLocaleString("fr-FR") : ""}</div></div></div><div style={{ marginTop: 12, fontSize: 14, lineHeight: 1.42 }}>{p.body}</div></div>) : <div style={card(accent)}>Aucune actualité pour l’instant.</div>}
            </div>
          ) : null}

          {clubTab === "equipes" ? (
            <div style={{ display: "grid", gap: 10 }}>
              {clubTeams.length ? clubTeams.map((team) => <button key={team.id} type="button" style={{ ...card(accent), color: "#fff", textAlign: "left", padding: 14 }}><div style={{ display: "flex", alignItems: "center", gap: 12 }}><Logo src={team.logoDataUrl || team.logoUrl} name={team.name} accent={accent} size={56} round={18} /><div style={{ minWidth: 0, flex: 1 }}><div style={{ fontWeight: 1000, fontSize: 18, overflowWrap: "anywhere" }}>{team.name}</div><div style={{ fontSize: 11.5, opacity: .72 }}>{String(team.sport || "sport").toUpperCase()} • {team.membersCount || 0} membre(s)</div></div><div style={{ color: accent, fontWeight: 1000 }}>›</div></div></button>) : <div style={card(accent)}>Aucune équipe synchronisée.</div>}
            </div>
          ) : null}

          {clubTab === "membres" ? (
            <div style={{ display: "grid", gap: 8 }}>
              {clubMembers.length ? clubMembers.map((m) => <div key={m.id} style={{ ...card(accent), display: "flex", gap: 10, alignItems: "center", padding: 11 }}><Logo src={m.avatarUrl} name={m.displayName} accent={accent} size={46} round={999} /><div style={{ minWidth: 0, flex: 1 }}><div style={{ fontWeight: 1000, fontSize: 15, overflowWrap: "anywhere" }}>{m.displayName}</div><div style={{ fontSize: 11, opacity: .7 }}>{roleLabel(m.role)} • {m.status || "active"}</div></div><span style={{ borderRadius: 999, padding: "5px 8px", color: accent, border: `1px solid ${alpha(accent, "44")}`, fontWeight: 900, fontSize: 10 }}>{roleLabel(m.role)}</span></div>) : <div style={card(accent)}>Aucun membre.</div>}
            </div>
          ) : null}

          {clubTab === "matchs" ? (
            <div style={{ display: "grid", gap: 12 }}>
              {canManage ? <div style={card(accent)}>
                <SectionTitle accent={accent}>Programmer un match</SectionTitle>
                <div style={{ display: "grid", gap: 9, marginTop: 10 }}>
                  <select value={matchTeamId} onChange={(e) => setMatchTeamId(e.target.value)} style={inputStyle(accent)}>{clubTeams.map(t => <option key={t.id} value={t.id}>{t.name} • {t.sport}</option>)}</select>
                  <input value={matchOpponent} onChange={(e) => setMatchOpponent(e.target.value)} placeholder="Adversaire" style={inputStyle(accent)} />
                  <input value={matchDate} onChange={(e) => setMatchDate(e.target.value)} type="datetime-local" style={inputStyle(accent)} />
                  <input value={matchLocation} onChange={(e) => setMatchLocation(e.target.value)} placeholder="Lieu / terrain" style={inputStyle(accent)} />
                  <button type="button" onClick={createMatch} disabled={!matchOpponent.trim() || busy} style={{ ...tinyButton(accent, true), width: "100%" }}>Créer le match + convoquer</button>
                </div>
              </div> : null}
              {clubMatches.length ? clubMatches.map((m) => <div key={m.id} style={{ ...card(accent), padding: 0, overflow: "hidden" }}><div style={{ padding: 14, background: `linear-gradient(90deg, ${alpha(accent, "22")}, rgba(255,255,255,.03))` }}><div style={{ display: "flex", gap: 12, alignItems: "center" }}><Logo src={clubTeams.find(t => t.id === m.clubTeamId)?.logoDataUrl || clubTeams.find(t => t.id === m.clubTeamId)?.logoUrl} name={m.teamName || selectedClub.name} accent={accent} size={48} /><div style={{ minWidth: 0, flex: 1 }}><div style={{ fontWeight: 1000, fontSize: 17, overflowWrap: "anywhere" }}>{m.title}</div><div style={{ fontSize: 12, opacity: .76, marginTop: 3 }}>{formatDateTime(m.startsAt)}{m.location ? ` • ${m.location}` : ""}</div></div></div></div><div style={{ padding: 12, display: "flex", justifyContent: "space-between", gap: 8, fontSize: 11, opacity: .8 }}><span>{m.teamName || selectedClub.name}</span><span style={{ color: accent, fontWeight: 1000 }}>{String(m.status || "scheduled")}</span></div></div>) : <div style={card(accent)}>Aucun match planifié.</div>}
            </div>
          ) : null}

          {clubTab === "convocations" ? (
            <div style={{ display: "grid", gap: 12 }}>
              {clubMatches.length === 0 ? <div style={card(accent)}>Crée d’abord un match pour générer les convocations.</div> : null}
              {clubMatches.map((match) => {
                const rows = clubConvocations.filter(c => c.clubMatchId === match.id);
                const counts = rows.reduce<Record<string, number>>((acc, c) => { acc[String(c.status || "pending")] = (acc[String(c.status || "pending")] || 0) + 1; return acc; }, {});
                return <div key={match.id} style={card(accent)}><div style={{ display: "flex", alignItems: "center", gap: 8 }}><div style={{ flex: 1, minWidth: 0 }}><div style={{ fontWeight: 1000, fontSize: 16, overflowWrap: "anywhere" }}>{match.title}</div><div style={{ fontSize: 11.5, opacity: .75, marginTop: 3 }}>{formatDateTime(match.startsAt)}</div></div></div><div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 7, marginTop: 10 }}><StatTile accent="#45ff8c" value={counts.present || 0} label="Présents" /><StatTile accent="#ffc857" value={counts.uncertain || 0} label="Incertains" /><StatTile accent="#ff5a6f" value={counts.absent || 0} label="Absents" /></div><div style={{ display: "grid", gap: 7, marginTop: 10 }}>{rows.map((c) => { const st = statusLabel(c.status); return <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 8, borderRadius: 15, background: "rgba(255,255,255,.045)", padding: 8 }}><Logo src={c.avatarUrl} name={c.displayName} accent={accent} size={34} round={999} /><div style={{ flex: 1, minWidth: 0 }}><div style={{ fontWeight: 950, overflowWrap: "anywhere" }}>{c.displayName}</div><div style={{ fontSize: 10.5, color: st.color }}>{st.label}</div></div><button type="button" onClick={() => answerConvocation(c, "present")} style={tinyButton("#45ff8c", c.status === "present")}>✓</button><button type="button" onClick={() => answerConvocation(c, "uncertain")} style={tinyButton("#ffc857", c.status === "uncertain")}>?</button><button type="button" onClick={() => answerConvocation(c, "absent")} style={tinyButton("#ff5a6f", c.status === "absent")}>×</button></div>})}</div></div>;
              })}
            </div>
          ) : null}

          {clubTab === "calendrier" ? (
            <div style={{ display: "grid", gap: 12 }}>
              {canManage ? <div style={card(accent)}><SectionTitle accent={accent}>Ajouter un évènement</SectionTitle><div style={{ display: "grid", gap: 8, marginTop: 10 }}><input value={eventTitle} onChange={(e) => setEventTitle(e.target.value)} placeholder="Entraînement, réunion, tournoi..." style={inputStyle(accent)} /><input value={eventDate} onChange={(e) => setEventDate(e.target.value)} type="datetime-local" style={inputStyle(accent)} /><input value={eventLocation} onChange={(e) => setEventLocation(e.target.value)} placeholder="Lieu" style={inputStyle(accent)} /><button type="button" onClick={createEvent} disabled={!eventTitle.trim() || busy} style={{ ...tinyButton(accent, true), width: "100%" }}>Ajouter au calendrier</button></div></div> : null}
              {[...clubMatches.map(m => ({ id: `m-${m.id}`, title: m.title, type: "match", startsAt: m.startsAt, location: m.location })), ...clubEvents.map(e => ({ id: `e-${e.id}`, title: e.title, type: e.type, startsAt: e.startsAt, location: e.location }))].sort((a,b) => String(a.startsAt || "9999").localeCompare(String(b.startsAt || "9999"))).map((it) => <div key={it.id} style={{ ...card(accent), display: "flex", gap: 10, alignItems: "center" }}><div style={{ width: 50, height: 50, borderRadius: 18, background: `linear-gradient(135deg, ${alpha(accent, "32")}, rgba(255,255,255,.04))`, display: "grid", placeItems: "center", color: accent, fontWeight: 1000 }}>{it.type === "match" ? "M" : "A"}</div><div style={{ minWidth: 0 }}><div style={{ fontWeight: 1000, overflowWrap: "anywhere" }}>{it.title}</div><div style={{ fontSize: 12, opacity: .76, marginTop: 4 }}>{formatDateTime(it.startsAt)}{it.location ? ` • ${it.location}` : ""}</div></div></div>)}
            </div>
          ) : null}

          {clubTab === "invitations" ? (
            <div style={{ display: "grid", gap: 12 }}>
              {!canManage ? <div style={card(accent)}>Seuls les responsables du club peuvent inviter des membres.</div> : <div style={card(accent)}>
                <SectionTitle accent={accent}>Inviter un joueur Online</SectionTitle>
                <select value={selectedInviteTeam} onChange={(e) => setSelectedInviteTeam(e.target.value)} style={{ ...inputStyle(accent), marginTop: 10 }}><option value="">Club complet</option>{clubTeams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}</select>
                <div style={{ display: "flex", gap: 8, marginTop: 10 }}><input value={inviteQuery} onChange={(e) => setInviteQuery(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") runUserSearch(); }} placeholder="Pseudo ou email" style={inputStyle(accent)} /><button type="button" onClick={runUserSearch} style={tinyButton(accent, true)}>OK</button></div>
                <div style={{ display: "grid", gap: 8, marginTop: 10 }}>{inviteResults.map((u) => <button key={u.id} type="button" onClick={() => sendClubInvite(u)} style={{ ...card(accent), color: "#fff", textAlign: "left", display: "flex", alignItems: "center", gap: 10 }}><Logo src={u.avatarUrl} name={u.displayName || u.nickname || "Joueur"} accent={accent} size={34} round={999} /><span style={{ fontWeight: 950 }}>{u.displayName || u.nickname}</span><span style={{ marginLeft: "auto", color: accent, fontWeight: 1000 }}>Inviter</span></button>)}</div>
              </div>}
            </div>
          ) : null}

          {clubTab === "reglages" ? (
            <div style={card(accent)}><SectionTitle accent={accent}>Réglages club</SectionTitle><div style={{ marginTop: 10, fontSize: 13, lineHeight: 1.45, opacity: .82 }}>Visibilité : <b>{selectedClub.visibility || "members"}</b><br />Sports : <b>{(selectedClub.sports || []).join(", ") || "multisports"}</b><br />Prochaine étape : modifier les rôles, le logo, la bannière, les permissions et les sports du club.</div></div>
          ) : null}
        </div>

        {showClubInfo ? <div style={{ position: "fixed", inset: 0, zIndex: 10000, background: "rgba(0,0,0,.72)", display: "grid", placeItems: "center", padding: 18 }} onClick={() => setShowClubInfo(false)}><div style={{ ...card(accent), maxWidth: 440, width: "100%" }} onClick={(e) => e.stopPropagation()}><SectionTitle accent={accent}>Infos club</SectionTitle><div style={{ marginTop: 10, lineHeight: 1.45, fontSize: 13.5 }}>Cet espace centralise la vie du club : actualités, équipes, effectif, matchs, convocations, agenda et réglages. Les onglets s’ouvrent en plein écran pour éviter l’effet formulaire compact.</div><button type="button" onClick={() => setShowClubInfo(false)} style={{ ...tinyButton(accent, true), width: "100%", marginTop: 14 }}>Fermer</button></div></div> : null}
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
        <button type="button" onClick={reload} disabled={busy} style={tinyButton(accent)}>↻</button>
      </div>

      {!signedIn ? <div style={card(accent)}>Connecte ton compte Online pour afficher les clubs partagés.</div> : null}
      {error ? <div style={{ ...card("#ff5a6f"), color: "#ffd9df", fontSize: 12 }}>{error}</div> : null}

      <div style={card(accent)}>
        <div style={{ fontWeight: 1000, marginBottom: 8 }}>Créer un club</div>
        <div style={{ display: "flex", gap: 8 }}>
          <input value={newClubName} onChange={(e) => setNewClubName(e.target.value)} placeholder="Nom du club" style={inputStyle(accent)} />
          <button type="button" disabled={!newClubName.trim() || busy || !signedIn} onClick={handleCreateClub} style={{ borderRadius: 14, border: 0, background: !newClubName.trim() || !signedIn ? "rgba(255,255,255,.12)" : `linear-gradient(135deg, ${accent}, ${alpha(accent, "99")})`, color: "#001018", padding: "0 13px", fontWeight: 1000 }}>Créer</button>
        </div>
      </div>

      {invites.length ? <div style={card(accent)}><div style={{ fontWeight: 1000, marginBottom: 8 }}>Invitations en attente</div><div style={{ display: "grid", gap: 8 }}>{invites.map((it) => <div key={it.id} style={{ borderRadius: 14, background: "rgba(255,255,255,.055)", padding: 10, display: "grid", gap: 8 }}><div style={{ fontWeight: 900 }}>{it.clubName || "Club"}{it.teamName ? ` • ${it.teamName}` : ""}</div><div style={{ fontSize: 11, opacity: .72 }}>Invité par {it.senderName || "un membre"}</div><div style={{ display: "flex", gap: 8 }}><button type="button" onClick={() => handleInvite(it.id, "accepted")} style={{ flex: 1, borderRadius: 12, border: 0, padding: 9, fontWeight: 1000, background: "rgba(84,255,145,.22)", color: "#9dffbd" }}>Accepter</button><button type="button" onClick={() => handleInvite(it.id, "refused")} style={{ flex: 1, borderRadius: 12, border: 0, padding: 9, fontWeight: 1000, background: "rgba(255,90,111,.16)", color: "#ff9baa" }}>Refuser</button></div></div>)}</div></div> : null}

      <div style={{ display: "grid", gap: 10 }}>
        {clubs.length === 0 ? <div style={card(accent)}><div style={{ fontWeight: 1000 }}>Aucun club Online rejoint</div><div style={{ marginTop: 6, fontSize: 12, opacity: .76 }}>Crée un club ou accepte une invitation. Les équipes “Club” créées dans Teams peuvent être synchronisées ici.</div></div> : clubs.map((club) => {
          const teams = teamsByClub[club.id] || [];
          return <button type="button" key={club.id} onClick={() => openClub(club.id)} style={{ ...card(accent), color: "#fff", textAlign: "left" }}><div style={{ display: "flex", gap: 10, alignItems: "center" }}><Logo src={club.logoUrl} name={club.name} accent={accent} /><div style={{ minWidth: 0, flex: 1 }}><div style={{ fontWeight: 1000, fontSize: 15, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{club.name}</div><div style={{ fontSize: 11, opacity: .72 }}>{club.membersCount || 0} membre(s) • {teams.length} équipe(s) • rôle {roleLabel(club.role)}</div></div><div style={{ color: accent, fontWeight: 1000 }}>Ouvrir</div></div></button>;
        })}
      </div>

      {localClubTeams.length ? <div style={card(accent)}><div style={{ fontWeight: 1000 }}>Équipes Club locales à synchroniser</div><div style={{ marginTop: 6, fontSize: 11.5, opacity: .72 }}>Clique sur “Synchroniser” pour créer l’espace club Online et ouvrir sa page.</div><div style={{ marginTop: 10, display: "grid", gap: 8 }}>{localClubTeams.slice(0, 12).map((t: any) => <div key={t.id} style={{ borderRadius: 14, padding: 9, background: "rgba(255,255,255,.05)", display: "flex", gap: 9, alignItems: "center" }}><Logo src={t.logoDataUrl || t.logoUrl} name={t.name} accent={accent} size={34} /><div style={{ minWidth: 0, flex: 1 }}><div style={{ fontWeight: 950 }}>{t.name}</div><div style={{ fontSize: 10.5, opacity: .72 }}>{t.clubName || t.name} • {sportsLabel(t)}</div></div><button type="button" disabled={busy || !signedIn} onClick={() => syncLocalTeam(t)} style={tinyButton(accent, true)}>Synchroniser</button></div>)}</div></div> : null}
    </div>
  );
}
