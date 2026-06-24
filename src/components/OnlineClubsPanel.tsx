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
    const tabs: { id: ClubTab; label: string }[] = [
      { id: "accueil", label: "Accueil" },
      { id: "actu", label: "Actu" },
      { id: "equipes", label: "Équipes" },
      { id: "membres", label: "Membres" },
      { id: "matchs", label: "Matchs" },
      { id: "convocations", label: "Convocs" },
      { id: "calendrier", label: "Agenda" },
      { id: "invitations", label: "Inviter" },
      { id: "reglages", label: "Réglages" },
    ];

    return (
      <div style={{ display: "grid", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button type="button" onClick={() => { setSelectedClubId(null); setSelectedClub(null); reload(); }} style={tinyButton(accent)}>←</button>
          <Logo src={selectedClub.logoUrl} name={selectedClub.name} accent={accent} size={48} round={999} />
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: 22, color: accent, fontWeight: 1000, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{selectedClub.name}</div>
            <div style={{ fontSize: 11.5, opacity: .75 }}>{selectedClub.membersCount || clubMembers.length} membre(s) • {clubTeams.length} équipe(s) • rôle {roleLabel(selectedClub.role)}</div>
          </div>
          <button type="button" onClick={() => openClub(selectedClubId, clubTab)} disabled={busy} style={tinyButton(accent)}>↻</button>
        </div>

        <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 2, scrollbarWidth: "none" }}>
          {tabs.map((t) => <button key={t.id} type="button" onClick={() => setClubTab(t.id)} style={{ ...tinyButton(accent, clubTab === t.id), flex: "0 0 auto" }}>{t.label}</button>)}
        </div>

        {error ? <div style={{ ...card("#ff5a6f"), color: "#ffd9df", fontSize: 12 }}>{error}</div> : null}

        {clubTab === "accueil" ? (
          <div style={{ display: "grid", gap: 12 }}>
            <div style={card(accent)}>
              <SectionTitle accent={accent}>Tableau de bord club</SectionTitle>
              <div style={{ marginTop: 8, fontSize: 13, lineHeight: 1.35, opacity: .82 }}>Espace partagé du club : actualités, effectif, équipes, matchs, convocations et calendrier. Cette base reste multisports.</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 8, marginTop: 12 }}>
                <StatTile accent={accent} value={clubMembers.length} label="Membres" />
                <StatTile accent={accent} value={clubTeams.length} label="Équipes" />
                <StatTile accent={accent} value={nextMatches.length} label="Matchs" />
                <StatTile accent={accent} value={pendingConvocations.length} label="À répondre" />
              </div>
            </div>
            <div style={card(accent)}>
              <SectionTitle accent={accent}>Prochain match</SectionTitle>
              {nextMatches[0] ? <div style={{ marginTop: 10, display: "flex", gap: 10, alignItems: "center" }}><Logo src={clubTeams.find(t => t.id === nextMatches[0].clubTeamId)?.logoDataUrl || clubTeams.find(t => t.id === nextMatches[0].clubTeamId)?.logoUrl} name={nextMatches[0].teamName || selectedClub.name} accent={accent} /><div><div style={{ fontWeight: 1000 }}>{nextMatches[0].title}</div><div style={{ fontSize: 12, opacity: .76 }}>{formatDateTime(nextMatches[0].startsAt)}{nextMatches[0].location ? ` • ${nextMatches[0].location}` : ""}</div></div></div> : <div style={{ marginTop: 8, opacity: .72 }}>Aucun match planifié pour l’instant.</div>}
            </div>
            <div style={card(accent)}>
              <SectionTitle accent={accent}>Dernières actus</SectionTitle>
              <div style={{ display: "grid", gap: 8, marginTop: 10 }}>{clubPosts.slice(0, 3).map((p) => <div key={p.id} style={{ borderRadius: 14, background: "rgba(255,255,255,.055)", padding: 10 }}><div style={{ fontWeight: 950 }}>{p.title || "Actualité"}</div><div style={{ fontSize: 12.5, opacity: .85, marginTop: 4 }}>{p.body}</div></div>)}{clubPosts.length === 0 ? <div style={{ opacity: .72 }}>Aucune actualité.</div> : null}</div>
            </div>
          </div>
        ) : null}

        {clubTab === "actu" ? (
          <div style={{ display: "grid", gap: 10 }}>
            {canManage ? <div style={card(accent)}><SectionTitle accent={accent}>Publier une actualité</SectionTitle><textarea value={postText} onChange={(e) => setPostText(e.target.value)} placeholder="Message pour les membres du club..." style={{ ...inputStyle(accent), minHeight: 86, marginTop: 10 }} /><button type="button" onClick={publishPost} disabled={!postText.trim() || busy} style={{ ...tinyButton(accent, true), width: "100%", marginTop: 8 }}>Publier</button></div> : null}
            {clubPosts.length ? clubPosts.map((p) => <div key={p.id} style={card(accent)}><div style={{ fontWeight: 1000 }}>{p.title || "Actualité"}</div><div style={{ marginTop: 5, fontSize: 13, lineHeight: 1.35 }}>{p.body}</div><div style={{ marginTop: 8, fontSize: 10.5, opacity: .65 }}>{p.authorName || "Club"} • {p.createdAt ? new Date(p.createdAt).toLocaleString("fr-FR") : ""}</div></div>) : <div style={card(accent)}>Aucune actualité pour l’instant.</div>}
          </div>
        ) : null}

        {clubTab === "equipes" ? (
          <div style={{ display: "grid", gap: 10 }}>
            {clubTeams.length ? clubTeams.map((team) => <div key={team.id} style={card(accent)}><div style={{ display: "flex", alignItems: "center", gap: 10 }}><Logo src={team.logoDataUrl || team.logoUrl} name={team.name} accent={accent} /><div style={{ minWidth: 0 }}><div style={{ fontWeight: 1000, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{team.name}</div><div style={{ fontSize: 11, opacity: .7 }}>{String(team.sport || "sport").toUpperCase()} • {team.membersCount || 0} membre(s)</div></div></div></div>) : <div style={card(accent)}>Aucune équipe synchronisée.</div>}
          </div>
        ) : null}

        {clubTab === "membres" ? (
          <div style={{ display: "grid", gap: 8 }}>
            {clubMembers.length ? clubMembers.map((m) => <div key={m.id} style={{ ...card(accent), display: "flex", gap: 10, alignItems: "center" }}><Logo src={m.avatarUrl} name={m.displayName} accent={accent} size={38} round={999} /><div style={{ minWidth: 0, flex: 1 }}><div style={{ fontWeight: 1000 }}>{m.displayName}</div><div style={{ fontSize: 11, opacity: .7 }}>{roleLabel(m.role)} • {m.status || "active"}</div></div></div>) : <div style={card(accent)}>Aucun membre.</div>}
          </div>
        ) : null}

        {clubTab === "matchs" ? (
          <div style={{ display: "grid", gap: 10 }}>
            {canManage ? <div style={card(accent)}>
              <SectionTitle accent={accent}>Créer un match</SectionTitle>
              <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
                <select value={matchTeamId} onChange={(e) => setMatchTeamId(e.target.value)} style={inputStyle(accent)}>{clubTeams.map(t => <option key={t.id} value={t.id}>{t.name} • {t.sport}</option>)}</select>
                <input value={matchOpponent} onChange={(e) => setMatchOpponent(e.target.value)} placeholder="Adversaire" style={inputStyle(accent)} />
                <input value={matchDate} onChange={(e) => setMatchDate(e.target.value)} type="datetime-local" style={inputStyle(accent)} />
                <input value={matchLocation} onChange={(e) => setMatchLocation(e.target.value)} placeholder="Lieu / terrain" style={inputStyle(accent)} />
                <button type="button" onClick={createMatch} disabled={!matchOpponent.trim() || busy} style={{ ...tinyButton(accent, true), width: "100%" }}>Créer + convoquer l’effectif</button>
              </div>
            </div> : null}
            {clubMatches.length ? clubMatches.map((m) => <div key={m.id} style={card(accent)}><div style={{ display: "flex", gap: 10, alignItems: "center" }}><Logo src={clubTeams.find(t => t.id === m.clubTeamId)?.logoDataUrl || clubTeams.find(t => t.id === m.clubTeamId)?.logoUrl} name={m.teamName || selectedClub.name} accent={accent} size={40} /><div style={{ minWidth: 0, flex: 1 }}><div style={{ fontWeight: 1000 }}>{m.title}</div><div style={{ fontSize: 12, opacity: .76 }}>{formatDateTime(m.startsAt)}{m.location ? ` • ${m.location}` : ""}</div><div style={{ marginTop: 4, fontSize: 11, color: accent }}>{m.teamName || "Club"} • {String(m.status || "scheduled")}</div></div></div></div>) : <div style={card(accent)}>Aucun match planifié.</div>}
          </div>
        ) : null}

        {clubTab === "convocations" ? (
          <div style={{ display: "grid", gap: 10 }}>
            {clubMatches.length === 0 ? <div style={card(accent)}>Crée d’abord un match pour générer les convocations.</div> : null}
            {clubMatches.map((match) => {
              const rows = clubConvocations.filter(c => c.clubMatchId === match.id);
              const counts = rows.reduce<Record<string, number>>((acc, c) => { acc[String(c.status || "pending")] = (acc[String(c.status || "pending")] || 0) + 1; return acc; }, {});
              return <div key={match.id} style={card(accent)}><div style={{ display: "flex", alignItems: "center", gap: 8 }}><div style={{ flex: 1, minWidth: 0 }}><div style={{ fontWeight: 1000 }}>{match.title}</div><div style={{ fontSize: 11.5, opacity: .75 }}>{formatDateTime(match.startsAt)} • Présents {counts.present || 0} / Absents {counts.absent || 0} / Incertains {counts.uncertain || 0}</div></div></div><div style={{ display: "grid", gap: 7, marginTop: 10 }}>{rows.map((c) => { const st = statusLabel(c.status); return <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 8, borderRadius: 13, background: "rgba(255,255,255,.045)", padding: 8 }}><Logo src={c.avatarUrl} name={c.displayName} accent={accent} size={32} round={999} /><div style={{ flex: 1, minWidth: 0 }}><div style={{ fontWeight: 950 }}>{c.displayName}</div><div style={{ fontSize: 10.5, color: st.color }}>{st.label}</div></div><button type="button" onClick={() => answerConvocation(c, "present")} style={tinyButton("#45ff8c", c.status === "present")}>✓</button><button type="button" onClick={() => answerConvocation(c, "uncertain")} style={tinyButton("#ffc857", c.status === "uncertain")}>?</button><button type="button" onClick={() => answerConvocation(c, "absent")} style={tinyButton("#ff5a6f", c.status === "absent")}>×</button></div>})}</div></div>;
            })}
          </div>
        ) : null}

        {clubTab === "calendrier" ? (
          <div style={{ display: "grid", gap: 10 }}>
            {canManage ? <div style={card(accent)}><SectionTitle accent={accent}>Ajouter un évènement</SectionTitle><div style={{ display: "grid", gap: 8, marginTop: 10 }}><input value={eventTitle} onChange={(e) => setEventTitle(e.target.value)} placeholder="Entraînement, réunion, tournoi..." style={inputStyle(accent)} /><input value={eventDate} onChange={(e) => setEventDate(e.target.value)} type="datetime-local" style={inputStyle(accent)} /><input value={eventLocation} onChange={(e) => setEventLocation(e.target.value)} placeholder="Lieu" style={inputStyle(accent)} /><button type="button" onClick={createEvent} disabled={!eventTitle.trim() || busy} style={{ ...tinyButton(accent, true), width: "100%" }}>Ajouter au calendrier</button></div></div> : null}
            {[...clubMatches.map(m => ({ id: `m-${m.id}`, title: m.title, type: "match", startsAt: m.startsAt, location: m.location })), ...clubEvents.map(e => ({ id: `e-${e.id}`, title: e.title, type: e.type, startsAt: e.startsAt, location: e.location }))].sort((a,b) => String(a.startsAt || "9999").localeCompare(String(b.startsAt || "9999"))).map((it) => <div key={it.id} style={card(accent)}><div style={{ fontWeight: 1000 }}>{it.type === "match" ? "🏟️ " : "📅 "}{it.title}</div><div style={{ fontSize: 12, opacity: .76, marginTop: 4 }}>{formatDateTime(it.startsAt)}{it.location ? ` • ${it.location}` : ""}</div></div>)}
          </div>
        ) : null}

        {clubTab === "invitations" ? (
          <div style={{ display: "grid", gap: 10 }}>
            {!canManage ? <div style={card(accent)}>Seuls les responsables du club peuvent inviter des membres.</div> : <div style={card(accent)}>
              <SectionTitle accent={accent}>Inviter un joueur Online</SectionTitle>
              <select value={selectedInviteTeam} onChange={(e) => setSelectedInviteTeam(e.target.value)} style={{ ...inputStyle(accent), marginTop: 10 }}><option value="">Club complet</option>{clubTeams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}</select>
              <div style={{ display: "flex", gap: 8, marginTop: 10 }}><input value={inviteQuery} onChange={(e) => setInviteQuery(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") runUserSearch(); }} placeholder="Pseudo ou email" style={inputStyle(accent)} /><button type="button" onClick={runUserSearch} style={tinyButton(accent, true)}>OK</button></div>
              <div style={{ display: "grid", gap: 8, marginTop: 10 }}>{inviteResults.map((u) => <button key={u.id} type="button" onClick={() => sendClubInvite(u)} style={{ ...card(accent), color: "#fff", textAlign: "left", display: "flex", alignItems: "center", gap: 10 }}><Logo src={u.avatarUrl} name={u.displayName || u.nickname || "Joueur"} accent={accent} size={34} round={999} /><span style={{ fontWeight: 950 }}>{u.displayName || u.nickname}</span><span style={{ marginLeft: "auto", color: accent, fontWeight: 1000 }}>Inviter</span></button>)}</div>
            </div>}
          </div>
        ) : null}

        {clubTab === "reglages" ? (
          <div style={card(accent)}><SectionTitle accent={accent}>Réglages club</SectionTitle><div style={{ marginTop: 10, fontSize: 13, lineHeight: 1.45, opacity: .82 }}>Visibilité : <b>{selectedClub.visibility || "members"}</b><br />Sports : <b>{(selectedClub.sports || []).join(", ") || "multisports"}</b><br />Les droits fins, rôles modifiables, bannière/logo et paramètres avancés seront branchés sur cette base.</div></div>
        ) : null}
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
