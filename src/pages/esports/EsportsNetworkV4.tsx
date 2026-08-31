import React from "react";
import { ESPORTS_GAMES, getEsportsGame } from "../../esports/catalog";
import { requestEsportsFriend } from "../../esports/community";
import type { PublicEsportsLfgPost, PublicEsportsPlayer, PublicEsportsTeam } from "../../esports/publicNetwork";
import { searchPublicEsportsPlayers } from "../../esports/publicNetwork";
import {
  applyToEsportsLfg,
  getMyEsportsMatchmaking,
  inviteEsportsTeamMember,
  joinEsportsMatchmaking,
  leaveEsportsMatchmaking,
  leaveEsportsTeam,
  listEsportsLfgApplications,
  listEsportsNotifications,
  listEsportsSeasonLeaderboard,
  listEsportsTeamMemberships,
  markEsportsNotificationRead,
  requestEsportsTeamJoin,
  reviewEsportsLfgApplication,
  reviewEsportsTeamMembership,
  setEsportsTeamMemberRole,
  subscribeEsportsNetworkV4,
  withdrawEsportsLfgApplication,
  type EsportsLeaderboardRow,
  type EsportsLfgApplication,
  type EsportsMatchmakingTicket,
  type EsportsNetworkNotification,
  type EsportsTeamMembership,
} from "../../esports/networkV4";
import type { EsportsPlatform, EsportsState } from "../../esports/types";

type Common = {
  panelStyle: React.CSSProperties;
  buttonStyle: (active?: boolean) => React.CSSProperties;
  inputStyle: React.CSSProperties;
  textSoft: string;
  setToast: (value: string) => void;
  tr: (fr: string, en: string, es: string) => string;
};

function platformLabel(value: string): string {
  const labels: Record<string, string> = { pc: "PC", playstation: "PlayStation", xbox: "Xbox", switch: "Switch", mobile: "Mobile", crossplay: "Cross-play" };
  return labels[value] || value;
}

function migrationMessage(tr: Common["tr"]): string {
  return tr(
    "Migration Supabase E-SPORTS V0.4 requise pour activer ce réseau compétitif.",
    "E-SPORTS V0.4 Supabase migration required to enable this competitive network.",
    "Se requiere la migración Supabase E-SPORTS V0.4 para activar esta red competitiva.",
  );
}

export function EsportsCompetitiveNetworkV4({ state, panelStyle, buttonStyle, inputStyle, textSoft, setToast, tr }: Common & { state: EsportsState }) {
  const [gameId, setGameId] = React.useState(state.selectedGameId);
  const game = getEsportsGame(gameId);
  const [platform, setPlatform] = React.useState<EsportsPlatform>(state.gamer.primaryPlatform || game.platforms[0] || "pc");
  const [mode, setMode] = React.useState("Ranked");
  const [rankLabel, setRankLabel] = React.useState(state.gamer.rankByGame?.[gameId] || "");
  const [region, setRegion] = React.useState(state.gamer.country || "FR");
  const [teamSize, setTeamSize] = React.useState(game.teamSizes[0] || 1);
  const [ticket, setTicket] = React.useState<EsportsMatchmakingTicket | null>(null);
  const [notifications, setNotifications] = React.useState<EsportsNetworkNotification[]>([]);
  const [leaderboard, setLeaderboard] = React.useState<EsportsLeaderboardRow[]>([]);
  const [leaderboardGame, setLeaderboardGame] = React.useState("all");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState("");

  React.useEffect(() => {
    const next = getEsportsGame(gameId);
    setPlatform((current) => next.platforms.includes(current) ? current : (next.platforms[0] || "pc"));
    setTeamSize(next.teamSizes[0] || 1);
    setRankLabel(state.gamer.rankByGame?.[gameId] || "");
  }, [gameId, state.gamer.rankByGame]);

  const load = React.useCallback(async () => {
    try {
      const [nextTicket, nextNotifications, nextLeaderboard] = await Promise.all([
        getMyEsportsMatchmaking(),
        listEsportsNotifications(70),
        listEsportsSeasonLeaderboard(leaderboardGame === "all" ? undefined : leaderboardGame, 50),
      ]);
      setTicket(nextTicket);
      setNotifications(nextNotifications);
      setLeaderboard(nextLeaderboard);
      setError("");
    } catch (e: any) {
      if (String(e?.code || "") === "esports_network_v4_migration_required") setError(migrationMessage(tr));
      else setError(String(e?.message || e));
    }
  }, [leaderboardGame, tr]);

  React.useEffect(() => { void load(); }, [load]);
  React.useEffect(() => subscribeEsportsNetworkV4(() => void load()), [load]);

  const join = async () => {
    setBusy(true);
    try {
      const next = await joinEsportsMatchmaking({ gameId, platform, mode, rankLabel, region, teamSize });
      setTicket(next);
      await load();
      setToast(next.status === "matched" ? tr("MATCH TROUVÉ !", "MATCH FOUND!", "¡PARTIDA ENCONTRADA!") : tr("Tu es dans la file de matchmaking.", "You're in the matchmaking queue.", "Estás en la cola de matchmaking."));
    } catch (e: any) { setToast(String(e?.code || "") === "esports_network_v4_migration_required" ? migrationMessage(tr) : String(e?.message || e)); }
    finally { setBusy(false); }
  };

  const leave = async () => {
    setBusy(true);
    try { await leaveEsportsMatchmaking(); setTicket(null); await load(); setToast(tr("File de matchmaking quittée.", "Matchmaking queue left.", "Has salido de la cola de matchmaking.")); }
    catch (e: any) { setToast(String(e?.message || e)); }
    finally { setBusy(false); }
  };

  const addMatch = async () => {
    if (!ticket?.matchedWithUserId) return;
    try { await requestEsportsFriend(ticket.matchedWithUserId, `${tr("Match trouvé via E-SPORTS", "Match found through E-SPORTS", "Partida encontrada vía E-SPORTS")} · ${getEsportsGame(ticket.gameId).shortName}`); setToast(tr("Demande d'ami envoyée au joueur trouvé.", "Friend request sent to matched player.", "Solicitud de amistad enviada al jugador encontrado.")); }
    catch (e: any) { setToast(String(e?.message || e)); }
  };

  const markAll = async () => {
    try { await markEsportsNotificationRead(); await load(); }
    catch (e: any) { setToast(String(e?.message || e)); }
  };

  const unread = notifications.filter((n) => !n.readAt).length;
  return <div style={{ display: "grid", gap: 10 }}>
    <section style={{ ...panelStyle, padding: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "start", flexWrap: "wrap" }}>
        <div><div style={{ fontSize: 22, fontWeight: 1000 }}>⚡ {tr("Réseau compétitif", "Competitive network", "Red competitiva")}</div><div style={{ marginTop: 4, color: textSoft, fontSize: 10.5 }}>{tr("Matchmaking multi-jeux, notifications temps réel et saisons communautaires.", "Cross-game matchmaking, realtime notifications and community seasons.", "Matchmaking multijuego, notificaciones en tiempo real y temporadas comunitarias.")}</div></div>
        <span style={{ borderRadius: 999, padding: "5px 8px", background: "rgba(56,189,248,.12)", color: "#38bdf8", fontSize: 8.5, fontWeight: 1000 }}>COMPETITIVE NETWORK V0.4</span>
      </div>
      {error ? <div style={{ marginTop: 9, color: "#fb7185", fontSize: 9.5 }}>{error}</div> : null}
    </section>

    <section style={{ ...panelStyle, padding: 14 }}>
      <div style={{ fontSize: 18, fontWeight: 1000 }}>🎯 MATCHMAKING</div>
      <div style={{ color: textSoft, fontSize: 9.5, marginTop: 3 }}>{tr("Compatibilité : même jeu/mode/taille d'équipe, plateforme compatible et niveau proche par libellé.", "Compatibility: same game/mode/team size, compatible platform and rank label.", "Compatibilidad: mismo juego/modo/tamaño, plataforma compatible y nivel por etiqueta.")}</div>
      <div style={{ marginTop: 9, display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(145px,1fr))", gap: 7 }}>
        <select value={gameId} onChange={(e) => setGameId(e.target.value)} style={inputStyle}>{ESPORTS_GAMES.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}</select>
        <select value={platform} onChange={(e) => setPlatform(e.target.value as EsportsPlatform)} style={inputStyle}>{game.platforms.map((p) => <option key={p} value={p}>{platformLabel(p)}</option>)}</select>
        <input value={mode} onChange={(e) => setMode(e.target.value)} placeholder="Ranked / Casual" style={inputStyle}/>
        <input value={rankLabel} onChange={(e) => setRankLabel(e.target.value)} placeholder={tr("Rang : Diamant III", "Rank: Diamond III", "Rango: Diamante III")} style={inputStyle}/>
        <input value={region} onChange={(e) => setRegion(e.target.value.toUpperCase())} maxLength={8} placeholder="FR / EU" style={inputStyle}/>
        <select value={teamSize} onChange={(e) => setTeamSize(Number(e.target.value))} style={inputStyle}>{game.teamSizes.map((size) => <option key={size} value={size}>{game.matchShape === "team" ? `${size}v${size}` : `${size} / team`}</option>)}</select>
      </div>
      <div style={{ marginTop: 10, display: "flex", gap: 7, flexWrap: "wrap", alignItems: "center" }}>
        <button type="button" disabled={busy || ticket?.status === "searching"} onClick={join} style={buttonStyle(true)}>⚡ {busy ? "…" : ticket?.status === "matched" ? tr("Relancer une recherche", "Search again", "Buscar de nuevo") : tr("Trouver un joueur", "Find a player", "Encontrar jugador")}</button>
        {ticket ? <button type="button" disabled={busy} onClick={leave} style={buttonStyle(false)}>× {tr("Quitter la file", "Leave queue", "Salir de la cola")}</button> : null}
        {ticket?.status === "searching" ? <span style={{ color: "#facc15", fontSize: 10, fontWeight: 1000 }}>● {tr("RECHERCHE EN COURS", "SEARCHING", "BUSCANDO")}</span> : null}
      </div>
      {ticket?.status === "matched" ? <div style={{ marginTop: 10, borderRadius: 17, padding: 12, background: "rgba(52,211,153,.08)", border: "1px solid rgba(52,211,153,.28)" }}><div style={{ color: "#34d399", fontWeight: 1000, fontSize: 17 }}>✓ {tr("MATCH TROUVÉ", "MATCH FOUND", "PARTIDA ENCONTRADA")}</div><div style={{ marginTop: 5, fontSize: 13, fontWeight: 1000 }}>{ticket.matchedDisplayName || tr("Joueur compatible", "Compatible player", "Jugador compatible")}</div><div style={{ color: textSoft, fontSize: 9.5 }}>{getEsportsGame(ticket.gameId).shortName} · {platformLabel(ticket.platform)}{ticket.matchedRankLabel ? ` · ${ticket.matchedRankLabel}` : ""}</div>{ticket.matchedWithUserId ? <button type="button" onClick={addMatch} style={{ ...buttonStyle(false), marginTop: 8 }}>＋ {tr("Ajouter en ami", "Add friend", "Añadir amigo")}</button> : null}</div> : null}
    </section>

    <section style={{ ...panelStyle, padding: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}><div><div style={{ fontSize: 18, fontWeight: 1000 }}>🔔 {tr("Notifications E-SPORTS", "E-SPORTS notifications", "Notificaciones E-SPORTS")} {unread ? `· ${unread}` : ""}</div><div style={{ color: textSoft, fontSize: 9 }}>{tr("Candidatures, clans et matchmaking arrivent ici en temps réel.", "Applications, clans and matchmaking arrive here in realtime.", "Candidaturas, clanes y matchmaking llegan aquí en tiempo real.")}</div></div>{unread ? <button type="button" onClick={markAll} style={{ ...buttonStyle(false), minHeight: 30, padding: "4px 8px" }}>✓ {tr("Tout lire", "Mark all read", "Marcar todo")}</button> : null}</div>
      <div style={{ marginTop: 8, display: "grid", gap: 6 }}>{notifications.length ? notifications.slice(0, 20).map((n) => <button key={n.id} type="button" onClick={async () => { if (!n.readAt) { await markEsportsNotificationRead(n.id); await load(); } }} style={{ border: `1px solid ${n.readAt ? "rgba(255,255,255,.06)" : "rgba(56,189,248,.28)"}`, borderRadius: 13, padding: 9, background: n.readAt ? "rgba(255,255,255,.025)" : "rgba(56,189,248,.055)", color: "inherit", textAlign: "left", cursor: "pointer" }}><div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}><strong>{n.readAt ? "" : "● "}{n.title}</strong><span style={{ color: textSoft, fontSize: 8 }}>{n.createdAt ? new Date(n.createdAt).toLocaleString() : ""}</span></div>{n.body ? <div style={{ marginTop: 3, color: textSoft, fontSize: 9.5 }}>{n.body}</div> : null}</button>) : <div style={{ color: textSoft, fontSize: 10, padding: 8 }}>{tr("Aucune notification.", "No notifications.", "Sin notificaciones.")}</div>}</div>
    </section>

    <section style={{ ...panelStyle, padding: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "end", flexWrap: "wrap" }}><div><div style={{ fontSize: 18, fontWeight: 1000 }}>🏆 {tr("Saison & leaderboard", "Season & leaderboard", "Temporada y clasificación")}</div><div style={{ color: textSoft, fontSize: 9.5 }}>{tr("Community XP serveur : LFG accepté +10, clan rejoint +5, match trouvé +8. Ce n'est pas encore un classement de skill.", "Server Community XP: accepted LFG +10, team joined +5, match found +8. This is not a skill ranking yet.", "XP comunitario del servidor: LFG aceptado +10, clan +5, match +8. Aún no es un ranking de habilidad.")}</div></div><select value={leaderboardGame} onChange={(e) => setLeaderboardGame(e.target.value)} style={{ ...inputStyle, width: 220 }}><option value="all">🌍 {tr("Tous les jeux", "All games", "Todos los juegos")}</option>{ESPORTS_GAMES.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}</select></div>
      <div style={{ marginTop: 9, display: "grid", gap: 5 }}>{leaderboard.length ? leaderboard.slice(0, 25).map((row) => <div key={`${row.userId}_${row.gameId}`} style={{ display: "grid", gridTemplateColumns: "34px minmax(120px,1fr) 80px 70px", gap: 7, alignItems: "center", padding: "8px 7px", borderRadius: 11, background: row.position <= 3 ? "rgba(250,204,21,.055)" : "rgba(255,255,255,.025)" }}><strong style={{ textAlign: "center" }}>{row.position === 1 ? "🥇" : row.position === 2 ? "🥈" : row.position === 3 ? "🥉" : `#${row.position}`}</strong><div><strong>{row.displayName}</strong><div style={{ color: textSoft, fontSize: 8 }}>{row.countryCode || ""} · {row.seasonName}</div></div><strong style={{ textAlign: "right", color: "#facc15" }}>{row.communityXp} XP</strong><span style={{ textAlign: "right", color: textSoft, fontSize: 8 }}>{row.matchesFound} MM</span></div>) : <div style={{ padding: 10, color: textSoft, fontSize: 10 }}>{tr("Le leaderboard se remplira avec l'activité réseau V0.4.", "The leaderboard will fill with V0.4 network activity.", "La clasificación se llenará con la actividad de red V0.4.")}</div>}</div>
    </section>
  </div>;
}

export function EsportsTeamMembershipV4({ cloudTeams, panelStyle, buttonStyle, inputStyle, textSoft, setToast, tr, onRefresh }: Common & { cloudTeams: PublicEsportsTeam[]; onRefresh?: () => void }) {
  const [memberships, setMemberships] = React.useState<EsportsTeamMembership[]>([]);
  const [query, setQuery] = React.useState("");
  const [players, setPlayers] = React.useState<PublicEsportsPlayer[]>([]);
  const [inviteTeamId, setInviteTeamId] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState("");

  const load = React.useCallback(async () => {
    try { setMemberships(await listEsportsTeamMemberships()); setError(""); }
    catch (e: any) { setMemberships([]); setError(String(e?.code || "") === "esports_network_v4_migration_required" ? migrationMessage(tr) : String(e?.message || e)); }
  }, [tr]);
  React.useEffect(() => { void load(); }, [load]);
  React.useEffect(() => subscribeEsportsNetworkV4(() => void load()), [load]);

  const mineTeams = cloudTeams.filter((team) => team.mine);
  React.useEffect(() => { if (!inviteTeamId && mineTeams[0]?.id) setInviteTeamId(mineTeams[0].id); }, [inviteTeamId, mineTeams]);

  const requestJoin = async (team: PublicEsportsTeam) => {
    setBusy(true);
    try { await requestEsportsTeamJoin(team.id, tr("Je souhaite rejoindre votre clan.", "I'd like to join your clan.", "Quiero unirme a vuestro clan.")); await load(); setToast(tr("Demande d'adhésion envoyée.", "Join request sent.", "Solicitud de ingreso enviada.")); }
    catch (e: any) { setToast(String(e?.code || "") === "esports_network_v4_migration_required" ? migrationMessage(tr) : String(e?.message || e)); }
    finally { setBusy(false); }
  };

  const search = async () => {
    if (query.trim().length < 2) return;
    setBusy(true);
    try { setPlayers(await searchPublicEsportsPlayers({ query, limit: 20 })); }
    catch (e: any) { setToast(String(e?.message || e)); }
    finally { setBusy(false); }
  };

  const invite = async (player: PublicEsportsPlayer) => {
    if (!inviteTeamId) return;
    try { await inviteEsportsTeamMember(inviteTeamId, player.userId, "member", tr("Invitation depuis E-SPORTS HUB.", "Invitation from E-SPORTS HUB.", "Invitación desde E-SPORTS HUB.")); await load(); setToast(tr("Invitation de clan envoyée.", "Clan invitation sent.", "Invitación de clan enviada.")); }
    catch (e: any) { setToast(String(e?.message || e)); }
  };

  const review = async (row: EsportsTeamMembership, status: "active" | "declined") => {
    try { await reviewEsportsTeamMembership(row.id, status); await load(); onRefresh?.(); setToast(status === "active" ? tr("Adhésion acceptée.", "Membership accepted.", "Ingreso aceptado.") : tr("Demande refusée.", "Request declined.", "Solicitud rechazada.")); }
    catch (e: any) { setToast(String(e?.message || e)); }
  };

  const role = async (row: EsportsTeamMembership, nextRole: "captain" | "officer" | "member") => {
    try { await setEsportsTeamMemberRole(row.id, nextRole); await load(); setToast(tr("Rôle mis à jour.", "Role updated.", "Rol actualizado.")); }
    catch (e: any) { setToast(String(e?.message || e)); }
  };

  const leave = async (teamId: string) => {
    try { await leaveEsportsTeam(teamId); await load(); onRefresh?.(); setToast(tr("Clan quitté.", "Clan left.", "Clan abandonado.")); }
    catch (e: any) { setToast(String(e?.message || e)); }
  };

  const pendingForMe = memberships.filter((m) => m.mine && m.status === "pending");
  const ownedPending = memberships.filter((m) => m.teamMine && !m.mine && m.status === "pending");
  const myActive = memberships.filter((m) => m.mine && m.status === "active");
  const manageableActive = memberships.filter((m) => m.teamMine && !m.mine && m.status === "active");
  const publicJoinable = cloudTeams.filter((team) => !team.mine && team.visibility === "public" && !memberships.some((m) => m.teamId === team.id && m.mine && ["active", "pending"].includes(m.status)));

  return <div style={{ display: "grid", gap: 10 }}>
    {error ? <section style={{ ...panelStyle, padding: 10, color: "#fb7185", fontSize: 9.5 }}>{error}</section> : null}
    <section style={{ ...panelStyle, padding: 12 }}><div style={{ fontSize: 17, fontWeight: 1000 }}>🧩 {tr("Adhésions & rôles V0.4", "Memberships & roles V0.4", "Membresías y roles V0.4")}</div><div style={{ color: textSoft, fontSize: 9, marginTop: 3 }}>{tr("OWNER · CAPTAIN · OFFICER · MEMBER, avec demandes et invitations réelles.", "OWNER · CAPTAIN · OFFICER · MEMBER, with real requests and invitations.", "OWNER · CAPTAIN · OFFICER · MEMBER, con solicitudes e invitaciones reales.")}</div>
      {pendingForMe.length ? <div style={{ marginTop: 9, display: "grid", gap: 6 }}>{pendingForMe.map((m) => <div key={m.id} style={{ borderRadius: 12, padding: 9, background: "rgba(56,189,248,.055)" }}><strong>{m.requestKind === "invite" ? "✉ " : "⏳ "}[{m.teamTag}] {m.teamName}</strong><div style={{ color: textSoft, fontSize: 8.5 }}>{m.requestKind === "invite" ? tr("Invitation reçue", "Invitation received", "Invitación recibida") : tr("Demande en attente", "Request pending", "Solicitud pendiente")}</div>{m.requestKind === "invite" ? <div style={{ display: "flex", gap: 5, marginTop: 6 }}><button type="button" onClick={() => review(m,"active")} style={{ ...buttonStyle(true), minHeight: 28 }}>✓ {tr("Accepter", "Accept", "Aceptar")}</button><button type="button" onClick={() => review(m,"declined")} style={{ ...buttonStyle(false), minHeight: 28 }}>× {tr("Refuser", "Decline", "Rechazar")}</button></div> : null}</div>)}</div> : null}
      {ownedPending.length ? <div style={{ marginTop: 9 }}><strong style={{ fontSize: 10 }}>{tr("Demandes reçues", "Incoming requests", "Solicitudes recibidas")} · {ownedPending.length}</strong><div style={{ marginTop: 5, display: "grid", gap: 5 }}>{ownedPending.map((m) => <div key={m.id} style={{ borderRadius: 11, padding: 8, background: "rgba(255,255,255,.03)", display: "grid", gridTemplateColumns: "1fr auto", gap: 6, alignItems: "center" }}><div><strong>{m.displayName}</strong><div style={{ color: textSoft, fontSize: 8 }}>{m.teamTag ? `[${m.teamTag}] ` : ""}{m.teamName}{m.message ? ` · ${m.message}` : ""}</div></div><div style={{ display: "flex", gap: 4 }}><button type="button" onClick={() => review(m,"active")} style={{ ...buttonStyle(true), minHeight: 27, padding: "2px 7px" }}>✓</button><button type="button" onClick={() => review(m,"declined")} style={{ ...buttonStyle(false), minHeight: 27, padding: "2px 7px" }}>×</button></div></div>)}</div></div> : null}
    </section>

    {mineTeams.length ? <section style={{ ...panelStyle, padding: 12 }}><div style={{ fontWeight: 1000 }}>✉ {tr("Inviter un gamer dans mon clan", "Invite a gamer to my clan", "Invitar gamer a mi clan")}</div><div style={{ marginTop: 7, display: "grid", gridTemplateColumns: "minmax(160px,220px) 1fr auto", gap: 6 }}><select value={inviteTeamId} onChange={(e) => setInviteTeamId(e.target.value)} style={inputStyle}>{mineTeams.map((t) => <option key={t.id} value={t.id}>{t.tag ? `[${t.tag}] ` : ""}{t.name}</option>)}</select><input value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => e.key === "Enter" && void search()} placeholder={tr("Pseudo du gamer…", "Gamer nickname…", "Alias del gamer…")} style={inputStyle}/><button type="button" disabled={busy || query.trim().length < 2} onClick={search} style={buttonStyle(false)}>⌕</button></div>{players.length ? <div style={{ marginTop: 6, display: "grid", gap: 4 }}>{players.slice(0,8).map((p) => <div key={p.userId} style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 6, alignItems: "center", padding: 7, borderRadius: 10, background: "rgba(255,255,255,.025)" }}><span>{p.displayName}</span><button type="button" onClick={() => invite(p)} style={{ ...buttonStyle(true), minHeight: 27, padding: "2px 7px" }}>＋ {tr("Inviter", "Invite", "Invitar")}</button></div>)}</div> : null}</section> : null}

    {manageableActive.length ? <section style={{ ...panelStyle, padding: 12 }}><div style={{ fontWeight: 1000 }}>🎖 {tr("Rôles de mes clans", "Roles in my clans", "Roles de mis clanes")}</div><div style={{ marginTop: 7, display: "grid", gap: 5 }}>{manageableActive.map((m) => <div key={m.id} style={{ display: "grid", gridTemplateColumns: "1fr 130px", gap: 7, alignItems: "center", padding: 8, borderRadius: 11, background: "rgba(255,255,255,.025)" }}><div><strong>{m.displayName}</strong><div style={{ color: textSoft, fontSize: 8 }}>{m.teamTag ? `[${m.teamTag}] ` : ""}{m.teamName}</div></div><select value={m.role} onChange={(e) => void role(m,e.target.value as any)} style={{ ...inputStyle, minHeight: 32, padding: "4px 6px" }}><option value="captain">CAPTAIN</option><option value="officer">OFFICER</option><option value="member">MEMBER</option></select></div>)}</div></section> : null}

    <section style={{ ...panelStyle, padding: 12 }}><div style={{ fontWeight: 1000 }}>🌍 {tr("Clans rejoignables", "Joinable clans", "Clanes disponibles")} · {publicJoinable.length}</div><div style={{ marginTop: 7, display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 6 }}>{publicJoinable.slice(0,16).map((team) => <div key={team.id} style={{ borderRadius: 12, padding: 9, background: "rgba(255,255,255,.025)" }}><strong>{team.tag ? `[${team.tag}] ` : ""}{team.name}</strong><div style={{ color: textSoft, fontSize: 8.5 }}>{team.ownerDisplayName || tr("Capitaine", "Captain", "Capitán")}</div><button type="button" disabled={busy} onClick={() => requestJoin(team)} style={{ ...buttonStyle(false), width: "100%", marginTop: 6, minHeight: 28 }}>＋ {tr("Demander à rejoindre", "Request to join", "Solicitar ingreso")}</button></div>)}</div></section>

    {myActive.filter((m) => m.role !== "owner").length ? <section style={{ ...panelStyle, padding: 12 }}><div style={{ fontWeight: 1000 }}>🛡 {tr("Mes adhésions", "My memberships", "Mis membresías")}</div><div style={{ marginTop: 6, display: "grid", gap: 5 }}>{myActive.filter((m) => m.role !== "owner").map((m) => <div key={m.id} style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 6, alignItems: "center" }}><span><strong>{m.teamTag ? `[${m.teamTag}] ` : ""}{m.teamName}</strong> · <span style={{ color: textSoft, fontSize: 9 }}>{m.role.toUpperCase()}</span></span><button type="button" onClick={() => leave(m.teamId)} style={{ ...buttonStyle(false), minHeight: 27, padding: "2px 7px" }}>{tr("Quitter", "Leave", "Salir")}</button></div>)}</div></section> : null}
  </div>;
}

export function EsportsLfgApplicationsV4({ posts, panelStyle, buttonStyle, textSoft, setToast, tr, onRefresh }: Omit<Common,"inputStyle"> & { posts: PublicEsportsLfgPost[]; onRefresh?: () => void }) {
  const [applications, setApplications] = React.useState<EsportsLfgApplication[]>([]);
  const [error, setError] = React.useState("");
  const load = React.useCallback(async () => {
    try { setApplications(await listEsportsLfgApplications()); setError(""); }
    catch (e: any) { setApplications([]); setError(String(e?.code || "") === "esports_network_v4_migration_required" ? migrationMessage(tr) : String(e?.message || e)); }
  }, [tr]);
  React.useEffect(() => { void load(); }, [load]);
  React.useEffect(() => subscribeEsportsNetworkV4(() => void load()), [load]);

  const review = async (app: EsportsLfgApplication, status: "accepted" | "declined") => {
    try { await reviewEsportsLfgApplication(app.id,status); await load(); onRefresh?.(); setToast(status === "accepted" ? tr("Joueur accepté dans le LFG.", "Player accepted into LFG.", "Jugador aceptado en LFG.") : tr("Candidature refusée.", "Application declined.", "Candidatura rechazada.")); }
    catch (e: any) { setToast(String(e?.message || e)); }
  };
  const withdraw = async (app: EsportsLfgApplication) => {
    try { await withdrawEsportsLfgApplication(app.id); await load(); setToast(tr("Candidature retirée.", "Application withdrawn.", "Candidatura retirada.")); }
    catch (e: any) { setToast(String(e?.message || e)); }
  };

  const incoming = applications.filter((a) => a.forMyPost);
  const mine = applications.filter((a) => a.mine && !a.forMyPost);
  const ownPostIds = new Set(posts.filter((p) => p.mine).map((p) => p.id));
  return <section style={{ ...panelStyle, padding: 12 }}>
    <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}><div><div style={{ fontSize: 17, fontWeight: 1000 }}>🤝 {tr("Candidatures LFG V0.4", "LFG applications V0.4", "Candidaturas LFG V0.4")}</div><div style={{ color: textSoft, fontSize: 9 }}>{tr("Accepter/refuser remplace le simple contact et décrémente automatiquement les places.", "Accept/decline replaces simple contact and automatically decrements slots.", "Aceptar/rechazar sustituye el simple contacto y reduce plazas automáticamente.")}</div></div><button type="button" onClick={load} style={{ ...buttonStyle(false), minHeight: 28, padding: "3px 7px" }}>↻</button></div>
    {error ? <div style={{ marginTop: 7, color: "#fb7185", fontSize: 9 }}>{error}</div> : null}
    {incoming.length ? <div style={{ marginTop: 9 }}><strong style={{ fontSize: 10 }}>{tr("Reçues", "Received", "Recibidas")} · {incoming.filter((a) => ownPostIds.has(a.postId)).length}</strong><div style={{ marginTop: 5, display: "grid", gap: 5 }}>{incoming.filter((a) => ownPostIds.has(a.postId)).map((a) => <div key={a.id} style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 7, alignItems: "center", padding: 8, borderRadius: 11, background: "rgba(255,255,255,.03)" }}><div><strong>{a.applicantDisplayName}</strong><div style={{ color: textSoft, fontSize: 8.5 }}>{getEsportsGame(a.gameId).shortName} · {a.rankLabel || "—"} · {a.status.toUpperCase()}</div>{a.message ? <div style={{ marginTop: 2, fontSize: 9 }}>{a.message}</div> : null}</div>{a.status === "pending" ? <div style={{ display: "flex", gap: 4 }}><button type="button" onClick={() => review(a,"accepted")} style={{ ...buttonStyle(true), minHeight: 27, padding: "2px 7px" }}>✓</button><button type="button" onClick={() => review(a,"declined")} style={{ ...buttonStyle(false), minHeight: 27, padding: "2px 7px" }}>×</button></div> : null}</div>)}</div></div> : null}
    {mine.length ? <div style={{ marginTop: 9 }}><strong style={{ fontSize: 10 }}>{tr("Mes candidatures", "My applications", "Mis candidaturas")} · {mine.length}</strong><div style={{ marginTop: 5, display: "grid", gap: 4 }}>{mine.map((a) => <div key={a.id} style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 6, alignItems: "center", padding: 7, borderRadius: 10, background: "rgba(255,255,255,.025)" }}><span>{getEsportsGame(a.gameId).shortName} · <strong>{a.status.toUpperCase()}</strong></span>{a.status === "pending" ? <button type="button" onClick={() => withdraw(a)} style={{ ...buttonStyle(false), minHeight: 26, padding: "2px 6px" }}>{tr("Retirer", "Withdraw", "Retirar")}</button> : null}</div>)}</div></div> : null}
    {!incoming.length && !mine.length && !error ? <div style={{ marginTop: 8, color: textSoft, fontSize: 9.5 }}>{tr("Aucune candidature pour le moment.", "No applications yet.", "No hay candidaturas por ahora.")}</div> : null}
  </section>;
}

export async function applyToLfgFromCard(post: PublicEsportsLfgPost, tr: Common["tr"]): Promise<string> {
  await applyToEsportsLfg(post.id, `${tr("Candidature depuis le réseau E-SPORTS", "Application from E-SPORTS network", "Candidatura desde la red E-SPORTS")} · ${getEsportsGame(post.gameId).shortName} · ${post.mode}`);
  return tr("Candidature envoyée au créateur du LFG.", "Application sent to LFG owner.", "Candidatura enviada al creador del LFG.");
}
