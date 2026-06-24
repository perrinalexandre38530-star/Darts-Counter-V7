import React from "react";
import {
  createClub,
  createClubPost,
  getClubDetail,
  inviteUserToClub,
  listClubInvites,
  listClubTeams,
  listMyClubs,
  respondClubInvite,
  upsertClubTeam,
  type Club,
  type ClubInvite,
  type ClubMember,
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

type ClubTab = "accueil" | "equipes" | "membres" | "actu" | "invitations";

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

function Logo({ src, name, accent, size = 44 }: { src?: string | null; name: string; accent: string; size?: number }) {
  return (
    <div style={{ width: size, height: size, borderRadius: Math.round(size * .32), overflow: "hidden", flex: "0 0 auto", display: "grid", placeItems: "center", border: `1px solid ${alpha(accent, "80")}`, background: `radial-gradient(circle at 35% 25%, ${alpha(accent, "44")}, rgba(0,0,0,.62))`, color: accent, fontWeight: 1000 }}>
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
  const [clubTab, setClubTab] = React.useState<ClubTab>("accueil");
  const [postText, setPostText] = React.useState("");
  const [inviteQuery, setInviteQuery] = React.useState("");
  const [inviteResults, setInviteResults] = React.useState<OnlineFriendUser[]>([]);
  const [selectedInviteTeam, setSelectedInviteTeam] = React.useState<string>("");

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
      setClubTab(tab);
      setSelectedInviteTeam((detail.teams || [])[0]?.id || "");
    } catch (e: any) {
      setError(e?.message || "Impossible d’ouvrir l’espace club");
    } finally {
      setBusy(false);
    }
  }, [signedIn]);

  React.useEffect(() => { reload(); }, [reload]);

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
      upsertTeam({
        ...localTeam,
        clubId: club.id,
        clubName: club.name,
        clubRole: "owner",
        syncedClubTeamId: team.id,
        updatedAt: Date.now(),
      });
      await reload();
      await openClub(club.id, "equipes");
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

  if (selectedClub && selectedClubId) {
    const canManage = ["owner", "admin", "coach", "captain"].includes(String(selectedClub.role || ""));
    const tabs: { id: ClubTab; label: string }[] = [
      { id: "accueil", label: "Accueil" },
      { id: "actu", label: "Actu" },
      { id: "equipes", label: "Équipes" },
      { id: "membres", label: "Membres" },
      { id: "invitations", label: "Inviter" },
    ];
    return (
      <div style={{ display: "grid", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button type="button" onClick={() => { setSelectedClubId(null); setSelectedClub(null); reload(); }} style={tinyButton(accent)}>←</button>
          <Logo src={selectedClub.logoUrl} name={selectedClub.name} accent={accent} size={46} />
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: 20, color: accent, fontWeight: 1000, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{selectedClub.name}</div>
            <div style={{ fontSize: 11.5, opacity: .75 }}>{selectedClub.membersCount || clubMembers.length} membre(s) • {clubTeams.length} équipe(s) • {String(selectedClub.visibility || "members")}</div>
          </div>
          <button type="button" onClick={() => openClub(selectedClubId, clubTab)} disabled={busy} style={tinyButton(accent)}>↻</button>
        </div>

        {error ? <div style={{ ...card("#ff5a6f"), color: "#ffd9df", fontSize: 12 }}>{error}</div> : null}

        <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 2 }}>
          {tabs.map((t) => <button key={t.id} type="button" onClick={() => setClubTab(t.id)} style={{ ...tinyButton(accent, clubTab === t.id), flex: "0 0 auto" }}>{t.label}</button>)}
        </div>

        {clubTab === "accueil" ? (
          <div style={{ display: "grid", gap: 10 }}>
            <div style={card(accent)}>
              <div style={{ fontWeight: 1000, color: accent, marginBottom: 6 }}>ESPACE CLUB</div>
              <div style={{ fontSize: 13, opacity: .82 }}>Ici tu retrouves les équipes, membres, invitations et actualités du club. Les matchs, convocations et résultats seront branchés ensuite sur cette même base.</div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0,1fr))", gap: 8 }}>
              <div style={card(accent)}><div style={{ fontSize: 20, fontWeight: 1000 }}>{clubMembers.length}</div><div style={{ fontSize: 10, opacity: .7 }}>Membres</div></div>
              <div style={card(accent)}><div style={{ fontSize: 20, fontWeight: 1000 }}>{clubTeams.length}</div><div style={{ fontSize: 10, opacity: .7 }}>Équipes</div></div>
              <div style={card(accent)}><div style={{ fontSize: 20, fontWeight: 1000 }}>{clubPosts.length}</div><div style={{ fontSize: 10, opacity: .7 }}>Actus</div></div>
            </div>
          </div>
        ) : null}

        {clubTab === "actu" ? (
          <div style={{ display: "grid", gap: 10 }}>
            {canManage ? <div style={card(accent)}>
              <div style={{ fontWeight: 1000, marginBottom: 8 }}>Publier une actualité</div>
              <textarea value={postText} onChange={(e) => setPostText(e.target.value)} placeholder="Message pour les membres du club..." style={{ width: "100%", minHeight: 86, boxSizing: "border-box", borderRadius: 14, border: `1px solid ${alpha(accent, "46")}`, background: "rgba(0,0,0,.28)", color: "#fff", padding: 12, fontWeight: 800 }} />
              <button type="button" disabled={!postText.trim() || busy} onClick={publishPost} style={{ ...tinyButton(accent, true), width: "100%", marginTop: 8 }}>Publier</button>
            </div> : null}
            {clubPosts.length ? clubPosts.map((p) => <div key={p.id} style={card(accent)}><div style={{ fontWeight: 1000 }}>{p.title || "Actualité"}</div><div style={{ marginTop: 5, fontSize: 13, lineHeight: 1.35 }}>{p.body}</div><div style={{ marginTop: 8, fontSize: 10.5, opacity: .65 }}>{p.authorName || "Club"} • {p.createdAt ? new Date(p.createdAt).toLocaleString() : ""}</div></div>) : <div style={card(accent)}>Aucune actualité pour l’instant.</div>}
          </div>
        ) : null}

        {clubTab === "equipes" ? (
          <div style={{ display: "grid", gap: 9 }}>
            {clubTeams.length ? clubTeams.map((team) => <div key={team.id} style={card(accent)}><div style={{ display: "flex", alignItems: "center", gap: 10 }}><Logo src={team.logoDataUrl || team.logoUrl} name={team.name} accent={accent} /><div style={{ minWidth: 0 }}><div style={{ fontWeight: 1000, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{team.name}</div><div style={{ fontSize: 11, opacity: .7 }}>{String(team.sport || "sport").toUpperCase()} • {team.membersCount || 0} membre(s)</div></div></div></div>) : <div style={card(accent)}>Aucune équipe synchronisée.</div>}
          </div>
        ) : null}

        {clubTab === "membres" ? (
          <div style={{ display: "grid", gap: 8 }}>
            {clubMembers.map((m) => <div key={m.id} style={{ ...card(accent), display: "flex", alignItems: "center", gap: 10 }}><Logo src={m.avatarUrl} name={m.displayName} accent={accent} size={36} /><div style={{ minWidth: 0, flex: 1 }}><div style={{ fontWeight: 950, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.displayName}</div><div style={{ fontSize: 10.5, opacity: .7 }}>{m.role || "membre"}</div></div></div>)}
          </div>
        ) : null}

        {clubTab === "invitations" ? (
          <div style={{ display: "grid", gap: 10 }}>
            {!canManage ? <div style={card(accent)}>Seuls les responsables du club peuvent inviter des membres.</div> : <div style={card(accent)}>
              <div style={{ fontWeight: 1000, marginBottom: 8 }}>Inviter un joueur Online</div>
              <select value={selectedInviteTeam} onChange={(e) => setSelectedInviteTeam(e.target.value)} style={{ width: "100%", borderRadius: 14, border: `1px solid ${alpha(accent, "46")}`, background: "rgba(0,0,0,.28)", color: "#fff", padding: 11, fontWeight: 800, marginBottom: 8 }}>
                <option value="">Club seulement</option>
                {clubTeams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
              <div style={{ display: "flex", gap: 8 }}><input value={inviteQuery} onChange={(e) => setInviteQuery(e.target.value)} placeholder="Pseudo ou email" style={{ flex: 1, minWidth: 0, borderRadius: 14, border: `1px solid ${alpha(accent, "46")}`, background: "rgba(0,0,0,.28)", color: "#fff", padding: 11, fontWeight: 800 }} /><button type="button" onClick={runUserSearch} style={tinyButton(accent, true)}>OK</button></div>
              <div style={{ display: "grid", gap: 8, marginTop: 10 }}>{inviteResults.map((u) => <button key={u.id} type="button" onClick={() => sendClubInvite(u)} style={{ ...card(accent), color: "#fff", textAlign: "left", display: "flex", alignItems: "center", gap: 10 }}><Logo src={u.avatarUrl} name={u.displayName || u.nickname || "Joueur"} accent={accent} size={34} /><span style={{ fontWeight: 950 }}>{u.displayName || u.nickname}</span><span style={{ marginLeft: "auto", color: accent, fontWeight: 1000 }}>Inviter</span></button>)}</div>
            </div>}
          </div>
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
          <input value={newClubName} onChange={(e) => setNewClubName(e.target.value)} placeholder="Nom du club" style={{ flex: 1, minWidth: 0, borderRadius: 14, border: `1px solid ${alpha(accent, "46")}`, background: "rgba(0,0,0,.28)", color: "#fff", padding: "11px 12px", fontWeight: 800 }} />
          <button type="button" disabled={!newClubName.trim() || busy || !signedIn} onClick={handleCreateClub} style={{ borderRadius: 14, border: 0, background: !newClubName.trim() || !signedIn ? "rgba(255,255,255,.12)" : `linear-gradient(135deg, ${accent}, ${alpha(accent, "99")})`, color: "#001018", padding: "0 13px", fontWeight: 1000 }}>Créer</button>
        </div>
      </div>

      {invites.length ? <div style={card(accent)}><div style={{ fontWeight: 1000, marginBottom: 8 }}>Invitations en attente</div><div style={{ display: "grid", gap: 8 }}>{invites.map((it) => <div key={it.id} style={{ borderRadius: 14, background: "rgba(255,255,255,.055)", padding: 10, display: "grid", gap: 8 }}><div style={{ fontWeight: 900 }}>{it.clubName || "Club"}{it.teamName ? ` • ${it.teamName}` : ""}</div><div style={{ fontSize: 11, opacity: .72 }}>Invité par {it.senderName || "un membre"}</div><div style={{ display: "flex", gap: 8 }}><button type="button" onClick={() => handleInvite(it.id, "accepted")} style={{ flex: 1, borderRadius: 12, border: 0, padding: 9, fontWeight: 1000, background: "rgba(84,255,145,.22)", color: "#9dffbd" }}>Accepter</button><button type="button" onClick={() => handleInvite(it.id, "refused")} style={{ flex: 1, borderRadius: 12, border: 0, padding: 9, fontWeight: 1000, background: "rgba(255,90,111,.16)", color: "#ff9baa" }}>Refuser</button></div></div>)}</div></div> : null}

      <div style={{ display: "grid", gap: 10 }}>
        {clubs.length === 0 ? <div style={card(accent)}><div style={{ fontWeight: 1000 }}>Aucun club Online rejoint</div><div style={{ marginTop: 6, fontSize: 12, opacity: .76 }}>Crée un club ou accepte une invitation. Les équipes “Club” créées dans Teams peuvent être synchronisées ici.</div></div> : clubs.map((club) => {
          const teams = teamsByClub[club.id] || [];
          return <button type="button" key={club.id} onClick={() => openClub(club.id)} style={{ ...card(accent), color: "#fff", textAlign: "left" }}><div style={{ display: "flex", gap: 10, alignItems: "center" }}><Logo src={club.logoUrl} name={club.name} accent={accent} /><div style={{ minWidth: 0, flex: 1 }}><div style={{ fontWeight: 1000, fontSize: 15, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{club.name}</div><div style={{ fontSize: 11, opacity: .72 }}>{club.membersCount || 0} membre(s) • {teams.length} équipe(s) • rôle {club.role || "membre"}</div></div><div style={{ color: accent, fontWeight: 1000 }}>Ouvrir</div></div></button>;
        })}
      </div>

      {localClubTeams.length ? <div style={card(accent)}><div style={{ fontWeight: 1000 }}>Équipes Club locales à synchroniser</div><div style={{ marginTop: 6, fontSize: 11.5, opacity: .72 }}>Clique sur “Synchroniser” pour créer l’espace club Online et ouvrir sa page.</div><div style={{ marginTop: 10, display: "grid", gap: 8 }}>{localClubTeams.slice(0, 12).map((t: any) => <div key={t.id} style={{ borderRadius: 14, padding: 9, background: "rgba(255,255,255,.05)", display: "flex", gap: 9, alignItems: "center" }}><Logo src={t.logoDataUrl || t.logoUrl} name={t.name} accent={accent} size={34} /><div style={{ minWidth: 0, flex: 1 }}><div style={{ fontWeight: 950 }}>{t.name}</div><div style={{ fontSize: 10.5, opacity: .72 }}>{t.clubName || t.name} • {sportsLabel(t)}</div></div><button type="button" disabled={busy || !signedIn} onClick={() => syncLocalTeam(t)} style={tinyButton(accent, true)}>Synchroniser</button></div>)}</div></div> : null}
    </div>
  );
}
