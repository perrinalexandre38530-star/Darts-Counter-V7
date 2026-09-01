import React from "react";
import { getEsportsGame } from "../../esports/catalog";
import type { EsportsCompetitiveMatchV5 } from "../../esports/networkV5";
import {
  forfeitCompetitiveMatchV6,
  getCompetitiveRematchStateV6,
  getMyEsportsRatingProfileV6,
  listMyCompetitiveDisputesV6,
  listMyEsportsRankedHistoryV6,
  listMyEsportsRatingHistoryV6,
  openCompetitiveDisputeV6,
  requestCompetitiveRematchV6,
  subscribeEsportsNetworkV6,
  withdrawCompetitiveDisputeV6,
  type EsportsDisputeV6,
  type EsportsRatingHistoryPointV6,
  type EsportsRatingProfileV6,
  type EsportsRankedHistoryRowV6,
  type EsportsRematchStateV6,
} from "../../esports/networkV6";

const DIVISIONS = [
  { id: "bronze", label: "BRONZE", floor: 100, icon: "🥉", color: "#d97706" },
  { id: "silver", label: "SILVER", floor: 900, icon: "◈", color: "#cbd5e1" },
  { id: "gold", label: "GOLD", floor: 1050, icon: "🥇", color: "#facc15" },
  { id: "platinum", label: "PLATINUM", floor: 1200, icon: "◆", color: "#67e8f9" },
  { id: "diamond", label: "DIAMOND", floor: 1400, icon: "💎", color: "#60a5fa" },
  { id: "master", label: "MASTER", floor: 1600, icon: "♛", color: "#c084fc" },
  { id: "grandmaster", label: "GRANDMASTER", floor: 1850, icon: "✦", color: "#fb7185" },
  { id: "champion", label: "CHAMPION", floor: 2100, icon: "🏆", color: "#f59e0b" },
] as const;

function migrationMessage(tr: Props["tr"]): string {
  return tr(
    "Migration Supabase E-SPORTS V0.6 requise pour divisions, placements, historique MMR, rematch, forfaits et litiges.",
    "E-SPORTS V0.6 Supabase migration is required for divisions, placements, MMR history, rematch, forfeits and disputes.",
    "Se requiere la migración Supabase E-SPORTS V0.6 para divisiones, colocación, historial MMR, revancha, abandonos y disputas.",
  );
}

type Props = {
  gameId: string;
  session: EsportsCompetitiveMatchV5 | null;
  panelStyle: React.CSSProperties;
  buttonStyle: (active?: boolean) => React.CSSProperties;
  inputStyle: React.CSSProperties;
  textSoft: string;
  setToast: (value: string) => void;
  tr: (fr: string, en: string, es: string) => string;
  onSessionRefresh: () => void | Promise<any>;
};

function fmtDate(value?: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toLocaleDateString(undefined, { day: "2-digit", month: "short" }) : "";
}

function ResultPill({ result }: { result: EsportsRankedHistoryRowV6["result"] }) {
  const map: Record<string, { text: string; color: string }> = {
    win: { text: "WIN", color: "#34d399" }, loss: { text: "LOSS", color: "#fb7185" }, draw: { text: "DRAW", color: "#facc15" },
    disputed: { text: "DISPUTE", color: "#fb923c" }, cancelled: { text: "CANCEL", color: "#94a3b8" }, pending: { text: "PENDING", color: "#38bdf8" },
  };
  const item = map[result] || map.pending;
  return <span className="esports-v6-result-pill" style={{ color: item.color, borderColor: `${item.color}55`, background: `${item.color}12` }}>{item.text}</span>;
}

function RatingGraph({ rows }: { rows: EsportsRatingHistoryPointV6[] }) {
  const points = React.useMemo(() => {
    const ordered = [...rows].reverse().slice(-30);
    if (!ordered.length) return [] as Array<{ x: number; y: number; row: EsportsRatingHistoryPointV6 }>;
    const values = ordered.map((r) => r.ratingAfter);
    const min = Math.min(...values) - 20;
    const max = Math.max(...values) + 20;
    const span = Math.max(80, max - min);
    return ordered.map((row, index) => ({ x: ordered.length === 1 ? 160 : 10 + (index / (ordered.length - 1)) * 300, y: 96 - ((row.ratingAfter - min) / span) * 76, row }));
  }, [rows]);
  if (!points.length) return <div className="esports-v6-empty-chart">Aucune variation MMR pour l'instant.</div>;
  const d = points.map((p, i) => `${i ? "L" : "M"}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");
  return <div className="esports-v6-chart-wrap"><svg className="esports-v6-chart" viewBox="0 0 320 110" role="img" aria-label="Historique MMR"><defs><linearGradient id="es-v6-line" x1="0" x2="1"><stop offset="0" stopColor="#38bdf8"/><stop offset=".55" stopColor="#c084fc"/><stop offset="1" stopColor="#facc15"/></linearGradient></defs><path d="M10 96 H310" stroke="rgba(255,255,255,.08)" strokeWidth="1"/><path d={d} fill="none" stroke="url(#es-v6-line)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>{points.map((p) => <circle key={p.row.id} cx={p.x} cy={p.y} r="4" fill={p.row.delta >= 0 ? "#34d399" : "#fb7185"} stroke="#080b13" strokeWidth="2"/>)}</svg></div>;
}

export default function EsportsRankedProgressV6({ gameId, session, panelStyle, buttonStyle, inputStyle, textSoft, setToast, tr, onSessionRefresh }: Props) {
  const [profile, setProfile] = React.useState<EsportsRatingProfileV6 | null>(null);
  const [ratingHistory, setRatingHistory] = React.useState<EsportsRatingHistoryPointV6[]>([]);
  const [matchHistory, setMatchHistory] = React.useState<EsportsRankedHistoryRowV6[]>([]);
  const [rematch, setRematch] = React.useState<EsportsRematchStateV6 | null>(null);
  const [disputes, setDisputes] = React.useState<EsportsDisputeV6[]>([]);
  const [reason, setReason] = React.useState("score_mismatch");
  const [details, setDetails] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState("");

  const showError = React.useCallback((e: any) => {
    const msg = String(e?.code || "") === "esports_network_v6_migration_required" ? migrationMessage(tr) : String(e?.message || e);
    setError(msg);
    return msg;
  }, [tr]);

  const load = React.useCallback(async () => {
    try {
      const [nextProfile, nextRatingHistory, nextMatchHistory, nextDisputes, nextRematch] = await Promise.all([
        getMyEsportsRatingProfileV6(gameId),
        listMyEsportsRatingHistoryV6(gameId, 40),
        listMyEsportsRankedHistoryV6(gameId, 30),
        listMyCompetitiveDisputesV6(20),
        session?.id ? getCompetitiveRematchStateV6(session.id) : Promise.resolve(null),
      ]);
      setProfile(nextProfile); setRatingHistory(nextRatingHistory); setMatchHistory(nextMatchHistory); setDisputes(nextDisputes); setRematch(nextRematch); setError("");
    } catch (e: any) { showError(e); }
  }, [gameId, session?.id, showError]);

  React.useEffect(() => { void load(); }, [load]);
  React.useEffect(() => subscribeEsportsNetworkV6(() => void load()), [load]);

  const forfeit = async () => {
    if (!session || session.status === "confirmed" || session.status === "cancelled") return;
    if (typeof window !== "undefined" && !window.confirm(tr("Déclarer forfait ? Le match sera immédiatement donné à l'adversaire et le MMR sera calculé comme une défaite.", "Forfeit? The match will immediately be awarded to your opponent and MMR will be calculated as a loss.", "¿Abandonar? La partida se dará al rival y el MMR contará como derrota."))) return;
    setBusy(true);
    try { await forfeitCompetitiveMatchV6(session.id); setToast(tr("Forfait enregistré. Le résultat et le MMR sont figés côté serveur.", "Forfeit recorded. Result and MMR are now server-finalized.", "Abandono registrado. Resultado y MMR quedan fijados en servidor.")); await onSessionRefresh(); await load(); }
    catch (e: any) { setToast(showError(e)); } finally { setBusy(false); }
  };

  const requestRematch = async () => {
    if (!session?.id) return;
    setBusy(true);
    try { const next = await requestCompetitiveRematchV6(session.id); setRematch(next); setToast(next.ready ? tr("REMATCH accepté des deux côtés : nouvelle session créée.", "REMATCH accepted by both sides: new session created.", "REVANCHA aceptada por ambos: nueva sesión creada.") : tr("Demande de rematch envoyée à l'adversaire.", "Rematch request sent to opponent.", "Solicitud de revancha enviada al rival.")); await onSessionRefresh(); await load(); }
    catch (e: any) { setToast(showError(e)); } finally { setBusy(false); }
  };

  const submitDispute = async () => {
    if (!session?.id || details.trim().length < 3) return;
    setBusy(true);
    try { await openCompetitiveDisputeV6(session.id, reason, details.trim()); setDetails(""); setToast(tr("Litige enregistré. Aucun MMR supplémentaire ne peut être appliqué tant que le dossier reste ouvert.", "Dispute recorded. No additional MMR can be applied while the case remains open.", "Disputa registrada. No se aplicará MMR adicional mientras siga abierta.")); await load(); }
    catch (e: any) { setToast(showError(e)); } finally { setBusy(false); }
  };

  const withdrawDispute = async () => {
    if (!session?.id) return;
    setBusy(true);
    try { await withdrawCompetitiveDisputeV6(session.id); setToast(tr("Litige retiré. Vous pouvez à nouveau corriger et confirmer le score.", "Dispute withdrawn. You can correct and confirm the score again.", "Disputa retirada. Puedes volver a corregir y confirmar el resultado.")); await onSessionRefresh(); await load(); }
    catch (e: any) { setToast(showError(e)); } finally { setBusy(false); }
  };

  const game = getEsportsGame(gameId);
  const division = profile?.division === "placement" ? { id: "placement", label: "PLACEMENT", floor: 0, icon: "🎯", color: "#38bdf8" } : DIVISIONS.find((d) => d.id === profile?.division) || DIVISIONS[1];
  const activeDispute = session ? disputes.find((d) => d.matchId === session.id && d.status === "open") : null;

  return <div className="esports-section-stack esports-v6-root">
    <section className="esports-panel esports-v6-rank-hero" style={{ ...panelStyle, padding: 14, ["--rank-accent" as any]: division.color }}>
      <div className="esports-heading-row"><div><div className="esports-v6-eyebrow">MULTISPORTS E-SPORTS · RANKED V0.6</div><div style={{ fontSize: 20, fontWeight: 1000 }}>🏆 {tr("PROGRESSION COMPÉTITIVE", "COMPETITIVE PROGRESSION", "PROGRESIÓN COMPETITIVA")}</div><div style={{ marginTop: 3, color: textSoft, fontSize: 9 }}>{game.icon} {game.name} · {profile?.seasonName || tr("Saison active", "Active season", "Temporada activa")}</div></div><span className="esports-v6-division-badge" style={{ color: division.color, borderColor: `${division.color}55` }}>{division.icon} {division.label}</span></div>
      {error ? <div className="esports-v6-error">{error}</div> : null}
      {profile ? <>
        <div className="esports-v6-rank-main"><div><div className="esports-v6-mmr">{profile.rating}</div><div className="esports-v6-mmr-label">MMR · PEAK {profile.peakRating}</div></div><div className="esports-v6-rank-copy"><strong>{profile.division === "placement" ? tr(`${profile.placementsRemaining} match(s) de placement restant(s)`, `${profile.placementsRemaining} placement match(es) remaining`, `${profile.placementsRemaining} partida(s) de colocación restante(s)`) : profile.divisionLabel}</strong><div style={{ color: textSoft, fontSize: 9, marginTop: 3 }}>{profile.division === "placement" ? tr("La division finale apparaît après 5 résultats classés confirmés.", "Your final division appears after 5 confirmed ranked results.", "La división final aparece tras 5 resultados clasificados confirmados.") : profile.nextDivision ? `${profile.progressPercent}% → ${profile.nextDivision}` : tr("Sommet de l'échelle MULTISPORTS", "Top of the MULTISPORTS ladder", "Cima de la clasificación MULTISPORTS")}</div><div className="esports-v6-progress"><span style={{ width: `${profile.division === "placement" ? profile.placementsDone / 5 * 100 : profile.progressPercent}%`, background: division.color }}/></div></div></div>
        <div className="esports-v6-kpis"><div><strong>{profile.matches}</strong><span>MATCHS</span></div><div><strong>{profile.wins}</strong><span>WINS</span></div><div><strong>{profile.winRate}%</strong><span>WIN RATE</span></div><div><strong>{profile.streak > 0 ? `+${profile.streak}` : profile.streak}</strong><span>STREAK</span></div></div>
      </> : <div className="esports-v6-loading">{tr("Chargement de la progression…", "Loading progression…", "Cargando progresión…")}</div>}
    </section>

    <section className="esports-panel" style={{ ...panelStyle, padding: 14 }}>
      <div className="esports-heading-row"><div><div style={{ fontSize: 17, fontWeight: 1000 }}>📈 {tr("COURBE MMR", "MMR CURVE", "CURVA MMR")}</div><div style={{ color: textSoft, fontSize: 8.5 }}>{tr("Chaque point correspond à un résultat classé confirmé côté serveur.", "Each point is a server-confirmed ranked result.", "Cada punto corresponde a un resultado clasificado confirmado por servidor.")}</div></div><span className="esports-status-pill">{ratingHistory.length} pts</span></div>
      <RatingGraph rows={ratingHistory}/>
      <div className="esports-v6-division-grid">{DIVISIONS.map((d) => <div key={d.id} className={`esports-v6-division-step ${profile?.division === d.id ? "is-current" : ""}`} style={{ ["--step-color" as any]: d.color }}><span>{d.icon}</span><strong>{d.label}</strong><small>{d.floor}+</small></div>)}</div>
    </section>

    {session ? <section className="esports-panel" style={{ ...panelStyle, padding: 14 }}>
      <div className="esports-heading-row"><div><div style={{ fontSize: 17, fontWeight: 1000 }}>🎛 {tr("CONTRÔLE DU MATCH", "MATCH CONTROL", "CONTROL DEL PARTIDO")}</div><div style={{ color: textSoft, fontSize: 8.5 }}>{session.playerA.displayName} vs {session.playerB.displayName} · {session.status.toUpperCase()}</div></div><span className="esports-v6-match-id">#{session.id.slice(0, 8)}</span></div>
      <div className="esports-v6-action-grid">
        {session.status !== "confirmed" && session.status !== "cancelled" ? <button type="button" disabled={busy} onClick={forfeit} style={buttonStyle(false)} className="esports-v6-danger-action">🏳 {tr("Déclarer forfait", "Forfeit match", "Abandonar")}</button> : null}
        {session.status === "confirmed" ? <button type="button" disabled={busy || !!rematch?.requestedByMe} onClick={requestRematch} style={buttonStyle(true)}>↻ {rematch?.ready ? tr("Rematch créé", "Rematch created", "Revancha creada") : rematch?.requestedByMe ? tr("Rematch demandé", "Rematch requested", "Revancha solicitada") : tr("Demander un rematch", "Request rematch", "Pedir revancha")}</button> : null}
      </div>
      {rematch?.requestedByMe || rematch?.requestedByOpponent ? <div className="esports-v6-rematch-state"><span className={rematch.requestedByMe ? "ok" : ""}>MOI {rematch.requestedByMe ? "✓" : "…"}</span><span>↔</span><span className={rematch.requestedByOpponent ? "ok" : ""}>{tr("RIVAL", "RIVAL", "RIVAL")} {rematch.requestedByOpponent ? "✓" : "…"}</span></div> : null}
      {(session.status === "disputed" || activeDispute) ? <div className="esports-v6-dispute-box"><div style={{ fontWeight: 1000, color: "#fb923c" }}>⚠ {tr("CENTRE DE LITIGE", "DISPUTE CENTER", "CENTRO DE DISPUTAS")}</div>{activeDispute ? <div style={{ marginTop: 6 }}><div style={{ color: textSoft, fontSize: 9 }}>{tr("Dossier déjà ouvert", "Case already open", "Caso ya abierto")} · {activeDispute.reason} · {fmtDate(activeDispute.createdAt)}</div>{activeDispute.openedByMe ? <button type="button" disabled={busy} onClick={withdrawDispute} style={{ ...buttonStyle(false), marginTop: 7 }}>↩ {tr("Retirer mon litige", "Withdraw my dispute", "Retirar mi disputa")}</button> : null}</div> : <><div className="esports-form-grid" style={{ marginTop: 8 }}><select value={reason} onChange={(e) => setReason(e.target.value)} style={inputStyle}><option value="score_mismatch">Score différent</option><option value="wrong_opponent">Mauvais adversaire</option><option value="disconnect">Déconnexion / incident</option><option value="cheating">Triche suspectée</option><option value="other">Autre</option></select><textarea value={details} onChange={(e) => setDetails(e.target.value)} maxLength={1000} placeholder={tr("Décris précisément le problème…", "Describe the issue precisely…", "Describe el problema con precisión…")} style={{ ...inputStyle, minHeight: 70, resize: "vertical" }}/></div><button type="button" disabled={busy || details.trim().length < 3} onClick={submitDispute} style={{ ...buttonStyle(false), marginTop: 7 }}>⚠ {tr("Ouvrir le dossier", "Open case", "Abrir caso")}</button></>}</div> : null}
    </section> : null}

    <section className="esports-panel" style={{ ...panelStyle, padding: 14 }}>
      <div className="esports-heading-row"><div><div style={{ fontSize: 17, fontWeight: 1000 }}>🕘 {tr("HISTORIQUE CLASSÉ", "RANKED HISTORY", "HISTORIAL CLASIFICADO")}</div><div style={{ color: textSoft, fontSize: 8.5 }}>{tr("Score, rival et variation MMR — optimisé téléphone.", "Score, rival and MMR change — phone optimized.", "Resultado, rival y cambio MMR — optimizado para móvil.")}</div></div><span className="esports-status-pill">{matchHistory.length}</span></div>
      <div className="esports-v6-history-list">{matchHistory.length ? matchHistory.map((row) => <div key={row.matchId} className="esports-v6-history-row"><ResultPill result={row.result}/><div className="esports-v6-history-opponent"><strong>{row.opponentDisplayName}</strong><span>{fmtDate(row.confirmedAt || row.createdAt)} · {row.reason}</span></div><div className="esports-v6-history-score">{row.scoreFor == null ? "—" : `${row.scoreFor}–${row.scoreAgainst ?? 0}`}</div><div className={`esports-v6-delta ${(row.delta || 0) >= 0 ? "positive" : "negative"}`}>{row.delta == null ? "" : `${row.delta >= 0 ? "+" : ""}${row.delta}`}</div></div>) : <div className="esports-v6-loading">{tr("Aucun match classé dans cette saison.", "No ranked matches this season.", "No hay partidas clasificadas esta temporada.")}</div>}</div>
    </section>
  </div>;
}
