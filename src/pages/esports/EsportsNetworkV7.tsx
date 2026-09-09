import React from "react";
import { ESPORTS_GAMES, getEsportsGame } from "../../esports/catalog";
import { createOnlineEsportsRoom, joinOnlineEsportsRoom } from "../../esports/online";
import type { EsportsState } from "../../esports/types";
import EsportsCompetitiveSeasonsV8 from "./EsportsNetworkV8";
import {
  archiveTeamRosterV7,
  claimTeamCompetitiveRoomV7,
  getMyTeamCompetitiveMatchV7,
  getMyTeamMatchmakingV7,
  getMyTeamRosterV7,
  getPublicTeamProfileV7,
  joinTeamMatchmakingV7,
  leaveTeamMatchmakingV7,
  listMyTeamRankedTeamsV7,
  listTeamLeaderboardV7,
  lockTeamRosterV7,
  submitTeamCompetitiveResultV7,
  subscribeEsportsNetworkV7,
  type EsportsTeamCompetitiveMatchV7,
  type EsportsTeamLeaderboardRowV7,
  type EsportsTeamPublicProfileV7,
  type EsportsTeamQueueTicketV7,
  type EsportsTeamRankedTeamV7,
  type EsportsTeamRosterV7,
} from "../../esports/networkV7";

type Props = {
  state: EsportsState;
  panelStyle: React.CSSProperties;
  buttonStyle: (active?: boolean) => React.CSSProperties;
  inputStyle: React.CSSProperties;
  textSoft: string;
  setToast: (value: string) => void;
  tr: (fr: string, en: string, es: string) => string;
};

function migrationMessage(tr: Props["tr"]): string {
  return tr(
    "Migration Supabase E-SPORTS V0.7 requise pour le TEAM RANKED, les rosters verrouillés et le MMR d'équipe.",
    "E-SPORTS V0.7 Supabase migration is required for TEAM RANKED, locked rosters and team MMR.",
    "Se requiere la migración Supabase E-SPORTS V0.7 para TEAM RANKED, rosters bloqueados y MMR de equipo.",
  );
}

function delta(before?: number | null, after?: number | null): string {
  if (before == null || after == null) return "";
  const d = after - before;
  return `${d >= 0 ? "+" : ""}${d}`;
}

function teamSizesForGame(gameId: string): number[] {
  const sizes = getEsportsGame(gameId).teamSizes.filter((n) => Number(n) >= 2 && Number(n) <= 10);
  return sizes.length ? [...new Set(sizes)] : [2];
}

function MemberChip({ name, role, rating, accent, mine = false }: { name: string; role: string; rating: number; accent: string; mine?: boolean }) {
  return <div className="esports-v7-member-chip" style={{ borderColor: `${accent}33`, background: `${accent}0d` }}>
    <div className="esports-v7-member-dot" style={{ background: accent }} />
    <div><strong>{name}</strong><span>{role.toUpperCase()} · MMR {rating}{mine ? " · YOU" : ""}</span></div>
  </div>;
}

export default function EsportsTeamRankedV7({ state, panelStyle, buttonStyle, inputStyle, textSoft, setToast, tr }: Props) {
  const [teams, setTeams] = React.useState<EsportsTeamRankedTeamV7[]>([]);
  const [teamId, setTeamId] = React.useState("");
  const [gameId, setGameId] = React.useState(state.selectedGameId);
  const [platform, setPlatform] = React.useState("crossplay");
  const [mode, setMode] = React.useState("Ranked Team");
  const [region, setRegion] = React.useState("EU");
  const [teamSize, setTeamSize] = React.useState(() => teamSizesForGame(state.selectedGameId)[0]);
  const [captainUserId, setCaptainUserId] = React.useState("");
  const [memberIds, setMemberIds] = React.useState<string[]>([]);
  const [roster, setRoster] = React.useState<EsportsTeamRosterV7 | null>(null);
  const [ticket, setTicket] = React.useState<EsportsTeamQueueTicketV7 | null>(null);
  const [match, setMatch] = React.useState<EsportsTeamCompetitiveMatchV7 | null>(null);
  const [scoreA, setScoreA] = React.useState(0);
  const [scoreB, setScoreB] = React.useState(0);
  const [leaderboard, setLeaderboard] = React.useState<EsportsTeamLeaderboardRowV7[]>([]);
  const [profile, setProfile] = React.useState<EsportsTeamPublicProfileV7 | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState("");
  const provisioningRef = React.useRef(false);
  const joinedCodesRef = React.useRef(new Set<string>());

  const currentTeam = teams.find((t) => t.teamId === teamId) || teams[0] || null;
  const currentGame = getEsportsGame(gameId);
  const validTeamSizes = React.useMemo(() => teamSizesForGame(gameId), [gameId]);

  const showError = React.useCallback((e: any) => {
    const msg = String(e?.code || "") === "esports_network_v7_migration_required" ? migrationMessage(tr) : String(e?.message || e || tr("Erreur E-SPORTS TEAM RANKED.", "E-SPORTS TEAM RANKED error.", "Error E-SPORTS TEAM RANKED."));
    setError(msg);
    return msg;
  }, [tr]);

  const load = React.useCallback(async () => {
    try {
      const nextTeams = await listMyTeamRankedTeamsV7();
      setTeams(nextTeams);
      const chosenId = teamId && nextTeams.some((t) => t.teamId === teamId) ? teamId : nextTeams[0]?.teamId || "";
      if (chosenId !== teamId) setTeamId(chosenId);
      const [nextRoster, nextTicket, nextMatch, nextLeaderboard] = await Promise.all([
        chosenId ? getMyTeamRosterV7(chosenId, gameId) : Promise.resolve(null),
        getMyTeamMatchmakingV7(),
        getMyTeamCompetitiveMatchV7(),
        listTeamLeaderboardV7(gameId, teamSize, 30),
      ]);
      setRoster(nextRoster); setTicket(nextTicket); setMatch(nextMatch); setLeaderboard(nextLeaderboard); setError("");
      if (nextMatch) {
        const myReport = nextMatch.mySide === "A" ? nextMatch.reportA : nextMatch.reportB;
        if (myReport?.scoreA != null) setScoreA(Number(myReport.scoreA));
        if (myReport?.scoreB != null) setScoreB(Number(myReport.scoreB));
      }
    } catch (e: any) { showError(e); }
  }, [gameId, teamId, teamSize, showError]);

  React.useEffect(() => { void load(); }, [load]);
  React.useEffect(() => subscribeEsportsNetworkV7(() => void load()), [load]);

  React.useEffect(() => {
    if (!validTeamSizes.includes(teamSize)) setTeamSize(validTeamSizes[0]);
  }, [validTeamSizes, teamSize]);

  React.useEffect(() => {
    if (!currentTeam || roster) return;
    const candidates = currentTeam.members;
    const manager = candidates.find((m) => m.role === "owner") || candidates.find((m) => m.role === "captain") || candidates[0];
    setCaptainUserId((prev) => prev && candidates.some((m) => m.userId === prev) ? prev : manager?.userId || "");
    setMemberIds((prev) => prev.length ? prev.filter((id) => candidates.some((m) => m.userId === id)).slice(0, teamSize) : candidates.slice(0, teamSize).map((m) => m.userId));
  }, [currentTeam, roster, teamSize]);

  React.useEffect(() => {
    if (!match || match.status === "confirmed" || match.status === "cancelled") return;
    const provision = async () => {
      if (match.roomCode) {
        if (match.isHostCaptain || joinedCodesRef.current.has(match.roomCode)) return;
        joinedCodesRef.current.add(match.roomCode);
        try { await joinOnlineEsportsRoom(match.roomCode); setToast(`${tr("Salon TEAM RANKED rejoint automatiquement", "TEAM RANKED room joined automatically", "Sala TEAM RANKED unida automáticamente")} · ${match.roomCode}`); }
        catch (e: any) { joinedCodesRef.current.delete(match.roomCode); setError(String(e?.message || e)); }
        return;
      }
      if (!match.isHostCaptain || provisioningRef.current) return;
      provisioningRef.current = true;
      try {
        const room = await createOnlineEsportsRoom({
          gameId: match.gameId,
          title: `${tr("TEAM RANKED", "TEAM RANKED", "TEAM RANKED")} · ${getEsportsGame(match.gameId).shortName}`,
          teamSize: match.teamSize,
          maxPlayers: match.teamSize * 2,
          bestOf: 1,
          formatLabel: match.mode,
          visibility: "private",
          hostName: state.gamer.displayName,
        });
        const next = await claimTeamCompetitiveRoomV7(match.id, room.code);
        setMatch(next);
        setToast(`${tr("Salon d'équipe créé automatiquement", "Team room created automatically", "Sala de equipo creada automáticamente")} · ${room.code}`);
      } catch (e: any) { showError(e); }
      finally { provisioningRef.current = false; }
    };
    void provision();
  }, [match, setToast, showError, state.gamer.displayName, tr]);

  const toggleMember = (userId: string) => {
    if (roster) return;
    setMemberIds((prev) => prev.includes(userId) ? prev.filter((id) => id !== userId) : prev.length < teamSize ? [...prev, userId] : prev);
  };

  const lockRoster = async () => {
    if (!currentTeam || !currentTeam.canManage) return;
    if (memberIds.length !== teamSize) { setToast(tr(`Sélectionne exactement ${teamSize} joueurs.`, `Select exactly ${teamSize} players.`, `Selecciona exactamente ${teamSize} jugadores.`)); return; }
    if (!captainUserId || !memberIds.includes(captainUserId)) { setToast(tr("Le capitaine doit faire partie du roster.", "Captain must be in the roster.", "El capitán debe estar en el roster.")); return; }
    setBusy(true);
    try {
      const next = await lockTeamRosterV7({ teamId: currentTeam.teamId, gameId, platform, mode, region, teamSize, captainUserId, memberUserIds: memberIds });
      setRoster(next); setToast(tr("Roster verrouillé. Cette composition est figée pour la file classée.", "Roster locked. This lineup is frozen for ranked queue.", "Roster bloqueado. Esta alineación queda fijada para ranked.")); await load();
    } catch (e: any) { setToast(showError(e)); } finally { setBusy(false); }
  };

  const unlockRoster = async () => {
    if (!roster) return;
    setBusy(true);
    try { await archiveTeamRosterV7(roster.id); setRoster(null); setTicket(null); setToast(tr("Roster déverrouillé.", "Roster unlocked.", "Roster desbloqueado.")); await load(); }
    catch (e: any) { setToast(showError(e)); } finally { setBusy(false); }
  };

  const enterQueue = async () => {
    if (!roster) return;
    setBusy(true);
    try { const next = await joinTeamMatchmakingV7(roster.id); setTicket(next); setToast(next.status === "matched" ? tr("Équipe adverse trouvée !", "Opponent team found!", "¡Equipo rival encontrado!") : tr("Escouade placée dans la file TEAM RANKED.", "Squad entered TEAM RANKED queue.", "Escuadra añadida a la cola TEAM RANKED.")); await load(); }
    catch (e: any) { setToast(showError(e)); } finally { setBusy(false); }
  };

  const leaveQueue = async () => {
    setBusy(true);
    try { await leaveTeamMatchmakingV7(); setTicket(null); setToast(tr("File TEAM RANKED quittée.", "Left TEAM RANKED queue.", "Cola TEAM RANKED abandonada.")); await load(); }
    catch (e: any) { setToast(showError(e)); } finally { setBusy(false); }
  };

  const submitResult = async () => {
    if (!match || !match.canReport) return;
    setBusy(true);
    try {
      const next = await submitTeamCompetitiveResultV7(match.id, scoreA, scoreB); setMatch(next);
      setToast(next.status === "confirmed" ? tr("Résultat d'équipe confirmé : MMR équipe + individuel mis à jour.", "Team result confirmed: team + individual MMR updated.", "Resultado de equipo confirmado: MMR de equipo e individual actualizado.") : next.status === "disputed" ? tr("Les capitaines ont saisi des scores différents.", "Captains submitted different scores.", "Los capitanes enviaron marcadores diferentes.") : tr("Score capitaine envoyé. En attente du capitaine adverse.", "Captain score submitted. Waiting for opposing captain.", "Marcador del capitán enviado. Esperando al capitán rival."));
      await load();
    } catch (e: any) { setToast(showError(e)); } finally { setBusy(false); }
  };

  const openTeamProfile = async (id: string) => {
    setBusy(true);
    try { setProfile(await getPublicTeamProfileV7(id)); }
    catch (e: any) { setToast(showError(e)); } finally { setBusy(false); }
  };

  const selectedCount = memberIds.length;
  const myTeamIds = new Set(teams.map((t) => t.teamId));

  return <div className="esports-section-stack esports-v7-root">
    <section className="esports-panel esports-v7-hero" style={{ ...panelStyle, padding: 14 }}>
      <div className="esports-heading-row">
        <div><div className="esports-v7-eyebrow">MULTISPORTS E-SPORTS · V0.7</div><div className="esports-v7-title">🛡 TEAM RANKED</div><div style={{ marginTop: 4, color: textSoft, fontSize: 9.5 }}>{tr("Escouades 2v2 / 3v3 / 5v5, roster verrouillé, capitaine, matchmaking par équipe, MMR collectif + MMR individuel de chaque membre.", "2v2 / 3v3 / 5v5 squads, locked roster, captain, team matchmaking, team MMR + individual member MMR.", "Escuadras 2v2 / 3v3 / 5v5, roster bloqueado, capitán, matchmaking por equipo, MMR colectivo + individual.")}</div></div>
        <span className="esports-status-pill">TEAM MMR · LIVE</span>
      </div>
      {error ? <div className="esports-v7-error">{error}</div> : null}
    </section>

    <section className="esports-panel" style={{ ...panelStyle, padding: 14 }}>
      <div className="esports-heading-row"><div><strong>1 · {tr("COMPOSER L'ESCOUADE", "BUILD SQUAD", "CREAR ESCUADRA")}</strong><div style={{ color: textSoft, fontSize: 8.5 }}>{tr("Seuls OWNER/CAPTAIN peuvent verrouiller un roster classé.", "Only OWNER/CAPTAIN can lock a ranked roster.", "Solo OWNER/CAPTAIN pueden bloquear un roster ranked.")}</div></div><span className="esports-v7-counter">{selectedCount}/{teamSize}</span></div>
      {teams.length ? <>
        <div className="esports-form-grid esports-v7-config-grid" style={{ marginTop: 10 }}>
          <select value={teamId} disabled={!!roster} onChange={(e) => { setTeamId(e.target.value); setRoster(null); }} style={inputStyle}>{teams.map((t) => <option key={t.teamId} value={t.teamId}>[{t.tag || "TEAM"}] {t.name} · {t.myRole.toUpperCase()}</option>)}</select>
          <select value={gameId} disabled={!!roster} onChange={(e) => setGameId(e.target.value)} style={inputStyle}>{ESPORTS_GAMES.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}</select>
          <select value={teamSize} disabled={!!roster} onChange={(e) => setTeamSize(Number(e.target.value))} style={inputStyle}>{validTeamSizes.map((n) => <option key={n} value={n}>{n}v{n}</option>)}</select>
          <select value={platform} disabled={!!roster} onChange={(e) => setPlatform(e.target.value)} style={inputStyle}><option value="crossplay">Cross-play</option><option value="pc">PC</option><option value="playstation">PlayStation</option><option value="xbox">Xbox</option><option value="switch">Switch</option><option value="mobile">Mobile</option></select>
          <select value={region} disabled={!!roster} onChange={(e) => setRegion(e.target.value)} style={inputStyle}><option>EU</option><option>NA</option><option>SA</option><option>ASIA</option><option>OCE</option><option>MEA</option></select>
          <input value={mode} disabled={!!roster} onChange={(e) => setMode(e.target.value)} style={inputStyle} />
        </div>
        <div className="esports-v7-member-grid" style={{ marginTop: 10 }}>{(currentTeam?.members || []).map((m) => {
          const picked = memberIds.includes(m.userId);
          const captainEligible = m.role === "owner" || m.role === "captain";
          return <button type="button" key={m.userId} disabled={!!roster} onClick={() => toggleMember(m.userId)} className={`esports-v7-member-select ${picked ? "is-picked" : ""}`}>
            <div><strong>{m.displayName}</strong><span>{m.role.toUpperCase()} · MMR {m.rating}</span></div><span>{picked ? "✓" : "+"}</span>
            {picked && captainEligible ? <label onClick={(e) => e.stopPropagation()}><input type="radio" name="es-v7-captain" checked={captainUserId === m.userId} onChange={() => setCaptainUserId(m.userId)} disabled={!!roster}/> C</label> : null}
          </button>;
        })}</div>
        {roster ? <div className="esports-v7-roster-lock"><div><strong>🔒 [{roster.teamTag || "TEAM"}] {roster.teamName} · {roster.teamSize}v{roster.teamSize}</strong><span>{currentGame.name} · {roster.platform} · {roster.region} · {roster.mode}</span></div><button type="button" disabled={busy || ticket?.status === "matched"} onClick={unlockRoster} style={buttonStyle(false)}>{tr("Déverrouiller", "Unlock", "Desbloquear")}</button></div> : <div className="esports-action-row" style={{ marginTop: 10 }}><button type="button" disabled={busy || !currentTeam?.canManage || memberIds.length !== teamSize || !captainUserId} onClick={lockRoster} style={buttonStyle(true)}>🔒 {tr("VERROUILLER LE ROSTER", "LOCK ROSTER", "BLOQUEAR ROSTER")}</button></div>}
      </> : <div className="esports-v7-empty">{tr("Aucune équipe active. Crée ou rejoins d'abord un clan dans l'onglet Communauté.", "No active team. Create or join a clan first in Community.", "No hay equipo activo. Crea o únete primero a un clan en Comunidad.")}</div>}
    </section>

    <section className="esports-panel" style={{ ...panelStyle, padding: 14 }}>
      <div className="esports-heading-row"><div><strong>2 · {tr("MATCHMAKING D'ÉQUIPE", "TEAM MATCHMAKING", "MATCHMAKING DE EQUIPO")}</strong><div style={{ color: textSoft, fontSize: 8.5 }}>{tr("Recherche uniquement des rosters de même jeu, format, mode, région et plateforme compatible.", "Only searches rosters with same game, format, mode, region and compatible platform.", "Busca rosters del mismo juego, formato, modo, región y plataforma compatible.")}</div></div>{ticket ? <span className={`esports-v7-queue ${ticket.status}`}>{ticket.status.toUpperCase()}</span> : null}</div>
      <div className="esports-action-row" style={{ marginTop: 10 }}>{ticket?.status === "searching" ? <button type="button" disabled={busy} onClick={leaveQueue} style={buttonStyle(false)}>■ {tr("QUITTER LA FILE", "LEAVE QUEUE", "SALIR DE COLA")}</button> : <button type="button" disabled={busy || !roster || roster.status === "matched"} onClick={enterQueue} style={buttonStyle(true)}>⚡ {tr("CHERCHER UNE ÉQUIPE", "FIND A TEAM", "BUSCAR EQUIPO")}</button>}<button type="button" disabled={busy} onClick={() => void load()} style={buttonStyle(false)}>↻ {tr("Actualiser", "Refresh", "Actualizar")}</button></div>
    </section>

    {match ? <section className="esports-panel esports-v7-match" style={{ ...panelStyle, padding: 14 }}>
      <div className="esports-heading-row"><div><div className="esports-v7-eyebrow">{match.status === "confirmed" ? tr("RÉSULTAT OFFICIEL", "OFFICIAL RESULT", "RESULTADO OFICIAL") : tr("MATCH D'ÉQUIPE TROUVÉ", "TEAM MATCH FOUND", "PARTIDA DE EQUIPO ENCONTRADA")}</div><div style={{ fontSize: 19, fontWeight: 1000 }}>{getEsportsGame(match.gameId).icon} {match.teamSize}v{match.teamSize} · {match.mode}</div></div><strong className="esports-room-code" style={{ color: match.roomCode ? "#34d399" : "#facc15" }}>{match.roomCode || tr("Salon auto…", "Auto room…", "Sala auto…")}</strong></div>
      <div className="esports-v7-versus-grid" style={{ marginTop: 10 }}>{[{ key: "A", side: match.teamA, accent: "#60a5fa" }, { key: "B", side: match.teamB, accent: "#fb923c" }].map(({ key, side, accent }) => <div key={key} className="esports-v7-team-card" style={{ borderColor: `${accent}44`, background: `${accent}0b` }}><div className="esports-heading-row"><strong style={{ color: accent }}>TEAM {key} · [{side.tag || "TEAM"}]</strong><strong>MMR {side.rating}</strong></div><div className="esports-v7-team-name">{side.name}</div><div className="esports-section-stack" style={{ marginTop: 8 }}>{side.members.map((m) => <MemberChip key={m.userId} name={m.displayName} role={m.userId === side.captainUserId ? "CAPTAIN" : m.role} rating={m.rating} accent={accent}/>)}</div></div>)}</div>
      {match.status === "confirmed" ? <div className="esports-v7-confirmed"><strong>{match.teamA.name} {match.finalScoreA} — {match.finalScoreB} {match.teamB.name}</strong><div className="esports-v7-mmr-grid"><span>{match.teamA.name}: {match.mmrABefore} → {match.mmrAAfter} ({delta(match.mmrABefore, match.mmrAAfter)})</span><span>{match.teamB.name}: {match.mmrBBefore} → {match.mmrBAfter} ({delta(match.mmrBBefore, match.mmrBAfter)})</span></div></div> : <div style={{ marginTop: 10 }}><div className="esports-form-grid esports-v7-score-grid"><label><span>TEAM A</span><input type="number" min={0} max={999} value={scoreA} disabled={!match.canReport} onChange={(e) => setScoreA(Math.max(0, Number(e.target.value) || 0))} style={inputStyle}/></label><label><span>TEAM B</span><input type="number" min={0} max={999} value={scoreB} disabled={!match.canReport} onChange={(e) => setScoreB(Math.max(0, Number(e.target.value) || 0))} style={inputStyle}/></label></div>{match.canReport ? <div className="esports-action-row" style={{ marginTop: 8 }}><button type="button" disabled={busy} onClick={submitResult} style={buttonStyle(true)}>✓ {tr("CONFIRMER COMME CAPITAINE", "CONFIRM AS CAPTAIN", "CONFIRMAR COMO CAPITÁN")}</button></div> : <div className="esports-v7-empty">{tr("Seul le capitaine verrouillé du roster confirme le résultat.", "Only the locked roster captain confirms the result.", "Solo el capitán bloqueado del roster confirma el resultado.")}</div>}</div>}
    </section> : null}

    <section className="esports-panel" style={{ ...panelStyle, padding: 14 }}>
      <div className="esports-heading-row"><div><strong>🏅 {tr("LEADERBOARD TEAM MMR", "TEAM MMR LEADERBOARD", "CLASIFICACIÓN TEAM MMR")}</strong><div style={{ color: textSoft, fontSize: 8.5 }}>{currentGame.name} · {teamSize}v{teamSize} · {tr("saison active", "active season", "temporada activa")}</div></div><span className="esports-v7-counter">TOP {Math.min(30, leaderboard.length || 30)}</span></div>
      <div className="esports-section-stack" style={{ marginTop: 9 }}>{leaderboard.length ? leaderboard.map((row) => <button key={`${row.teamId}-${row.teamSize}`} type="button" className="esports-v7-leader-row" onClick={() => void openTeamProfile(row.teamId)}><strong>{row.position <= 3 ? ["🥇", "🥈", "🥉"][row.position - 1] : `#${row.position}`}</strong><div><strong>[{row.tag || "TEAM"}] {row.name}</strong><span>{row.wins}W · {row.losses}L · {row.draws}D · Peak {row.peakRating}</span></div><strong>{row.rating}</strong></button>) : <div className="esports-v7-empty">{tr("Aucune équipe classée pour ce format.", "No ranked team for this format yet.", "Aún no hay equipos clasificados para este formato.")}</div>}</div>
    </section>

    {profile ? <section className="esports-panel esports-v7-public-profile" style={{ ...panelStyle, padding: 14 }}>
      <div className="esports-heading-row"><div><div className="esports-v7-eyebrow">{tr("PROFIL PUBLIC D'ÉQUIPE", "PUBLIC TEAM PROFILE", "PERFIL PÚBLICO DE EQUIPO")}</div><div className="esports-v7-title">[{profile.tag || "TEAM"}] {profile.name}</div></div><button type="button" onClick={() => setProfile(null)} style={buttonStyle(false)}>×</button></div>
      <div className="esports-v7-palmares-grid" style={{ marginTop: 10 }}>{profile.ratings.length ? profile.ratings.map((r) => <div key={`${r.gameId}-${r.teamSize}`} className="esports-v7-palmares-card"><strong>{getEsportsGame(r.gameId).shortName} · {r.teamSize}v{r.teamSize}</strong><span>MMR {r.rating} · Peak {r.peakRating}</span><span>{r.wins}W · {r.losses}L · {r.draws}D · {r.matches} matchs</span><span>{r.seasonName}</span></div>) : <div className="esports-v7-empty">{tr("Pas encore de palmarès classé.", "No ranked record yet.", "Aún no hay palmarés ranked.")}</div>}</div>
      <div className="esports-v7-member-grid" style={{ marginTop: 10 }}>{profile.members.map((m) => <MemberChip key={m.userId} name={m.displayName} role={m.role} rating={m.rating} accent={myTeamIds.has(profile.teamId) ? "#34d399" : "#a78bfa"}/>)}</div>
    </section> : null}

    <EsportsCompetitiveSeasonsV8
      teamId={currentTeam?.teamId || ""}
      gameId={gameId}
      teamSize={teamSize}
      panelStyle={panelStyle}
      buttonStyle={buttonStyle}
      textSoft={textSoft}
      setToast={setToast}
      tr={tr}
    />
  </div>;
}
