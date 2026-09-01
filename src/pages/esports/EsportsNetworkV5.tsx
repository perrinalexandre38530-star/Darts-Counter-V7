import React from "react";
import { ESPORTS_GAMES, getEsportsGame } from "../../esports/catalog";
import { createOnlineEsportsRoom, joinOnlineEsportsRoom } from "../../esports/online";
import { readEsportsState } from "../../esports/store";
import type { EsportsMatchmakingTicket } from "../../esports/networkV4";
import {
  claimCompetitiveRoomV5,
  ensureMyCompetitiveMatchV5,
  getMyCompetitiveMatchV5,
  listEsportsMmrLeaderboardV5,
  submitCompetitiveResultV5,
  subscribeEsportsNetworkV5,
  type EsportsCompetitiveMatchV5,
  type EsportsMmrLeaderboardRowV5,
} from "../../esports/networkV5";
import type { EsportsState } from "../../esports/types";

type Props = {
  state: EsportsState;
  ticket: EsportsMatchmakingTicket | null;
  panelStyle: React.CSSProperties;
  buttonStyle: (active?: boolean) => React.CSSProperties;
  inputStyle: React.CSSProperties;
  textSoft: string;
  setToast: (value: string) => void;
  tr: (fr: string, en: string, es: string) => string;
};

function migrationMessage(tr: Props["tr"]): string {
  return tr(
    "Migration Supabase E-SPORTS V0.5 requise pour les salons classés, confirmation des scores et MMR.",
    "E-SPORTS V0.5 Supabase migration is required for ranked rooms, result confirmation and MMR.",
    "Se requiere la migración Supabase E-SPORTS V0.5 para salas clasificadas, confirmación y MMR.",
  );
}

function mmrDelta(before?: number | null, after?: number | null): string {
  if (before == null || after == null) return "";
  const delta = after - before;
  return `${delta >= 0 ? "+" : ""}${delta}`;
}

export default function EsportsCompetitiveSessionV5({ state, ticket, panelStyle, buttonStyle, inputStyle, textSoft, setToast, tr }: Props) {
  const [session, setSession] = React.useState<EsportsCompetitiveMatchV5 | null>(null);
  const [scoreA, setScoreA] = React.useState(0);
  const [scoreB, setScoreB] = React.useState(0);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState("");
  const [leaderboardGame, setLeaderboardGame] = React.useState(state.selectedGameId);
  const [leaderboard, setLeaderboard] = React.useState<EsportsMmrLeaderboardRowV5[]>([]);
  const provisioningRef = React.useRef(false);
  const joinedCodesRef = React.useRef(new Set<string>());

  const showError = React.useCallback((e: any) => {
    const msg = String(e?.code || "") === "esports_network_v5_migration_required" ? migrationMessage(tr) : String(e?.message || e);
    setError(msg);
    return msg;
  }, [tr]);

  const loadLeaderboard = React.useCallback(async () => {
    try {
      const rows = await listEsportsMmrLeaderboardV5(leaderboardGame, 50);
      setLeaderboard(rows);
    } catch (e: any) {
      if (String(e?.code || "") !== "esports_network_v5_migration_required") setError(String(e?.message || e));
    }
  }, [leaderboardGame]);

  const loadSession = React.useCallback(async () => {
    try {
      const row = ticket?.status === "matched" ? await ensureMyCompetitiveMatchV5() : await getMyCompetitiveMatchV5();
      setSession(row);
      if (row) {
        const mine = row.mySide === "A" ? row.reportA : row.reportB;
        if (mine?.scoreA != null) setScoreA(Number(mine.scoreA));
        if (mine?.scoreB != null) setScoreB(Number(mine.scoreB));
      }
      setError("");
      return row;
    } catch (e: any) {
      showError(e);
      return null;
    }
  }, [ticket?.status, showError]);

  React.useEffect(() => { void loadSession(); }, [loadSession]);
  React.useEffect(() => { void loadLeaderboard(); }, [loadLeaderboard]);
  React.useEffect(() => subscribeEsportsNetworkV5(() => { void loadSession(); void loadLeaderboard(); }), [loadLeaderboard, loadSession]);

  React.useEffect(() => {
    if (!session || session.status === "confirmed" || session.status === "cancelled") return;
    const provision = async () => {
      if (session.roomCode) {
        if (session.isHost || joinedCodesRef.current.has(session.roomCode)) return;
        joinedCodesRef.current.add(session.roomCode);
        try {
          await joinOnlineEsportsRoom(session.roomCode);
          setToast(`${tr("Salon compétitif rejoint automatiquement", "Ranked room joined automatically", "Sala competitiva unida automáticamente")} · ${session.roomCode}`);
        } catch (e: any) {
          joinedCodesRef.current.delete(session.roomCode);
          setError(String(e?.message || e));
        }
        return;
      }
      if (!session.isHost || provisioningRef.current) return;
      provisioningRef.current = true;
      try {
        const game = getEsportsGame(session.gameId);
        const room = await createOnlineEsportsRoom({
          gameId: session.gameId,
          title: `${tr("Classé", "Ranked", "Clasificado")} · ${game.shortName}`,
          teamSize: Math.max(1, session.teamSize),
          maxPlayers: Math.max(2, session.teamSize * 2),
          bestOf: 1,
          formatLabel: session.mode || "Ranked",
          visibility: "private",
          hostName: state.gamer.displayName,
          competitiveMatch: { matchId: session.id, playerAUserId: session.playerA.userId, playerBUserId: session.playerB.userId },
        });
        const claimed = await claimCompetitiveRoomV5(session.id, room.code);
        setSession(claimed);
        setToast(`${tr("Salon compétitif créé automatiquement", "Ranked room created automatically", "Sala competitiva creada automáticamente")} · ${room.code}`);
      } catch (e: any) {
        showError(e);
      } finally {
        provisioningRef.current = false;
      }
    };
    void provision();
  }, [session, state.gamer.displayName, setToast, tr, showError]);

  const submit = async () => {
    if (!session) return;
    setBusy(true);
    try {
      const next = await submitCompetitiveResultV5(session.id, scoreA, scoreB);
      setSession(next);
      await loadLeaderboard();
      if (next.status === "confirmed") setToast(tr("Résultat confirmé par les deux joueurs : MMR mis à jour.", "Result confirmed by both players: MMR updated.", "Resultado confirmado por ambos: MMR actualizado."));
      else if (next.status === "disputed") setToast(tr("Les deux scores diffèrent : vérifiez puis renvoyez le résultat.", "The two scores differ: verify and submit again.", "Los dos resultados difieren: revisa y envía de nuevo."));
      else setToast(tr("Score envoyé. En attente de la confirmation adverse.", "Score submitted. Waiting for opponent confirmation.", "Resultado enviado. Esperando confirmación rival."));
    } catch (e: any) {
      setToast(showError(e));
    } finally {
      setBusy(false);
    }
  };

  const myReport = session?.mySide === "A" ? session?.reportA : session?.reportB;
  const opponentReport = session?.mySide === "A" ? session?.reportB : session?.reportA;
  const game = getEsportsGame(session?.gameId || leaderboardGame);

  return <div className="esports-section-stack">
    <section style={{ ...panelStyle, padding: 14 }} className="esports-panel">
      <div className="esports-heading-row">
        <div>
          <div style={{ fontSize: 18, fontWeight: 1000 }}>🎮 {tr("SESSION CLASSÉE V0.5", "RANKED SESSION V0.5", "SESIÓN CLASIFICADA V0.5")}</div>
          <div style={{ marginTop: 3, color: textSoft, fontSize: 9.5 }}>{tr("Le MATCH TROUVÉ devient un vrai salon privé, avec équipes A/B automatiques et un seul résultat validé par les deux joueurs.", "MATCH FOUND becomes a real private room with automatic A/B teams and one result validated by both players.", "PARTIDA ENCONTRADA se convierte en una sala privada real con equipos A/B automáticos y un resultado validado por ambos.")}</div>
        </div>
        <span className="esports-status-pill">RANKED · ELO K32</span>
      </div>
      {error ? <div style={{ marginTop: 9, color: "#fb7185", fontSize: 9.5, overflowWrap: "anywhere" }}>{error}</div> : null}

      {session ? <>
        <div className="esports-card-grid" style={{ marginTop: 10 }}>
          {[{ side: "A", player: session.playerA, accent: "#60a5fa" }, { side: "B", player: session.playerB, accent: "#fb923c" }].map((item) => {
            const mine = session.mySide === item.side;
            return <div key={item.side} style={{ borderRadius: 17, padding: 11, background: `${item.accent}10`, border: `1px solid ${item.accent}35` }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 7 }}><strong style={{ color: item.accent }}>TEAM {item.side}</strong>{mine ? <span style={{ fontSize: 8, fontWeight: 1000, color: "#34d399" }}>YOU</span> : null}</div>
              <div style={{ marginTop: 5, fontSize: 14, fontWeight: 1000, overflowWrap: "anywhere" }}>{item.player.displayName}</div>
              <div style={{ marginTop: 3, color: textSoft, fontSize: 9 }}>MMR {item.player.rating} · {session.teamSize > 1 ? `${tr("slot capitaine", "captain slot", "slot capitán")} 1/${session.teamSize}` : "1v1"}</div>
            </div>;
          })}
        </div>

        <div style={{ marginTop: 9, borderRadius: 15, padding: 10, background: "rgba(255,255,255,.025)" }}>
          <div className="esports-heading-row">
            <div><strong>{game.icon} {game.name}</strong><div style={{ color: textSoft, fontSize: 9 }}>{session.mode} · {session.platform} · {session.teamSize > 1 ? `${session.teamSize}v${session.teamSize}` : "1v1"}</div></div>
            <div style={{ textAlign: "right" }}><div style={{ color: textSoft, fontSize: 8 }}>{tr("SALON", "ROOM", "SALA")}</div><strong className="esports-room-code" style={{ color: session.roomCode ? "#34d399" : "#facc15", letterSpacing: 1 }}>{session.roomCode || tr("Création auto…", "Auto-creating…", "Creación auto…")}</strong></div>
          </div>
          {session.teamSize > 1 ? <div style={{ marginTop: 7, color: textSoft, fontSize: 8.5 }}>{tr("Les deux joueurs matchés sont capitaines A/B. Les autres places du salon sont réparties automatiquement A/B à l'arrivée des coéquipiers.", "Matched players are A/B captains. Remaining room slots are automatically balanced A/B as teammates join.", "Los jugadores encontrados son capitanes A/B. Las plazas restantes se reparten automáticamente A/B al unirse compañeros.")}</div> : null}
        </div>

        <div style={{ marginTop: 10 }}>
          <div style={{ fontSize: 12, fontWeight: 1000 }}>✓ {tr("CONFIRMATION DU RÉSULTAT", "RESULT CONFIRMATION", "CONFIRMACIÓN DEL RESULTADO")}</div>
          {session.status === "confirmed" ? <div style={{ marginTop: 8, borderRadius: 16, padding: 11, background: "rgba(52,211,153,.075)", border: "1px solid rgba(52,211,153,.25)" }}>
            <div style={{ color: "#34d399", fontSize: 12, fontWeight: 1000 }}>{tr("RÉSULTAT VALIDÉ PAR LES DEUX JOUEURS", "RESULT VALIDATED BY BOTH PLAYERS", "RESULTADO VALIDADO POR AMBOS")}</div>
            <div style={{ marginTop: 7, fontSize: 22, fontWeight: 1000, textAlign: "center" }}>{session.playerA.displayName} {session.finalScoreA} — {session.finalScoreB} {session.playerB.displayName}</div>
            <div className="esports-card-grid" style={{ marginTop: 9 }}>
              <div style={{ padding: 9, borderRadius: 13, background: "rgba(96,165,250,.07)" }}><strong>{session.playerA.displayName}</strong><div style={{ color: textSoft, fontSize: 9 }}>{session.mmrABefore ?? 1000} → <strong style={{ color: "#60a5fa" }}>{session.mmrAAfter ?? session.playerA.rating}</strong> ({mmrDelta(session.mmrABefore, session.mmrAAfter)})</div></div>
              <div style={{ padding: 9, borderRadius: 13, background: "rgba(251,146,60,.07)" }}><strong>{session.playerB.displayName}</strong><div style={{ color: textSoft, fontSize: 9 }}>{session.mmrBBefore ?? 1000} → <strong style={{ color: "#fb923c" }}>{session.mmrBAfter ?? session.playerB.rating}</strong> ({mmrDelta(session.mmrBBefore, session.mmrBAfter)})</div></div>
            </div>
          </div> : <>
            <div className="esports-form-grid" style={{ marginTop: 8, gridTemplateColumns: "repeat(2,minmax(0,1fr))" }}>
              <label style={{ display: "grid", gap: 4 }}><span style={{ color: "#60a5fa", fontSize: 9, fontWeight: 1000 }}>TEAM A · {session.playerA.displayName}</span><input type="number" min={0} max={999} value={scoreA} onChange={(e) => setScoreA(Math.max(0, Number(e.target.value) || 0))} style={inputStyle}/></label>
              <label style={{ display: "grid", gap: 4 }}><span style={{ color: "#fb923c", fontSize: 9, fontWeight: 1000 }}>TEAM B · {session.playerB.displayName}</span><input type="number" min={0} max={999} value={scoreB} onChange={(e) => setScoreB(Math.max(0, Number(e.target.value) || 0))} style={inputStyle}/></label>
            </div>
            <div className="esports-action-row" style={{ marginTop: 8 }}><button type="button" disabled={busy} onClick={submit} style={buttonStyle(true)}>✓ {busy ? "…" : myReport ? tr("Corriger / reconfirmer mon score", "Correct / reconfirm my score", "Corregir / reconfirmar mi resultado") : tr("Envoyer mon résultat", "Submit my result", "Enviar mi resultado")}</button></div>
            <div style={{ marginTop: 7, color: session.status === "disputed" ? "#fb7185" : textSoft, fontSize: 8.5 }}>{session.status === "disputed" ? tr("CONFLIT : les deux saisies ne correspondent pas. Chacun peut corriger sa propre saisie.", "DISPUTE: both entries differ. Each player can correct their own entry.", "CONFLICTO: las dos entradas difieren. Cada jugador puede corregir la suya.") : opponentReport ? tr("L'adversaire a déjà envoyé son résultat. Envoie le même score pour valider.", "Your opponent already submitted. Submit the same score to validate.", "El rival ya envió su resultado. Envía el mismo marcador para validar.") : tr("Le MMR ne bouge jamais après une seule saisie : les deux joueurs doivent confirmer exactement le même score.", "MMR never changes after a single entry: both players must confirm the exact same score.", "El MMR nunca cambia con una sola entrada: ambos deben confirmar exactamente el mismo resultado.")}</div>
          </>}
        </div>
      </> : <div style={{ padding: "16px 4px", color: textSoft, fontSize: 10, textAlign: "center" }}>{ticket?.status === "matched" ? tr("Préparation de la session classée…", "Preparing ranked session…", "Preparando sesión clasificada…") : tr("Une session classée apparaîtra ici après MATCH TROUVÉ.", "A ranked session will appear here after MATCH FOUND.", "Una sesión clasificada aparecerá aquí tras PARTIDA ENCONTRADA.")}</div>}
    </section>

    <section style={{ ...panelStyle, padding: 14 }} className="esports-panel">
      <div className="esports-heading-row"><div><div style={{ fontSize: 18, fontWeight: 1000 }}>🏅 {tr("LEADERBOARD MMR", "MMR LEADERBOARD", "CLASIFICACIÓN MMR")}</div><div style={{ color: textSoft, fontSize: 9 }}>{tr("Classement de skill par jeu et par saison. Départ à 1000 MMR, Elo K=32.", "Skill ranking per game and season. Starts at 1000 MMR, Elo K=32.", "Ranking de habilidad por juego y temporada. Empieza en 1000 MMR, Elo K=32.")}</div></div><select value={leaderboardGame} onChange={(e) => setLeaderboardGame(e.target.value)} style={{ ...inputStyle, width: "min(190px,100%)" }}>{ESPORTS_GAMES.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}</select></div>
      <div style={{ marginTop: 9, display: "grid", gap: 5 }}>{leaderboard.length ? leaderboard.slice(0, 25).map((row) => <div key={row.userId} className="esports-leader-row" style={{ background: row.position <= 3 ? "rgba(250,204,21,.055)" : "rgba(255,255,255,.025)" }}><strong style={{ textAlign: "center" }}>{row.position === 1 ? "🥇" : row.position === 2 ? "🥈" : row.position === 3 ? "🥉" : `#${row.position}`}</strong><div><strong style={{ overflowWrap: "anywhere" }}>{row.displayName}</strong><div style={{ color: textSoft, fontSize: 8 }}>{row.seasonName} · {row.matches} {tr("matchs", "matches", "partidos")}</div></div><strong style={{ textAlign: "right", color: "#facc15" }}>{row.rating}</strong><span className="esports-leader-extra" style={{ textAlign: "right", color: textSoft, fontSize: 8 }}>{row.wins}W</span></div>) : <div style={{ padding: 10, color: textSoft, fontSize: 10 }}>{tr("Aucun match classé confirmé pour ce jeu.", "No confirmed ranked match for this game yet.", "Aún no hay partidas clasificadas confirmadas para este juego.")}</div>}</div>
    </section>
  </div>;
}
