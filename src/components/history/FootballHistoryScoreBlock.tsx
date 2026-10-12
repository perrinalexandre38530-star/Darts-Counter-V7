// @ts-nocheck
import React from "react";
import { footballVariantLabel } from "../../lib/gameEngines/footballEngine";
import { footballKeyMomentsFromRecord } from "../../lib/footballInsights";

const GREEN = "#65e5aa";
const BLUE = "#53c9ff";
const RED = "#ff5b77";
const GOLD = "#f6c256";
const SOFT = "#aab7b0";
const WHITE = "#f7fbff";
const n = (value: any) => (Number.isFinite(Number(value)) ? Number(value) : 0);

function sum(rows: any[], key: string) { return (rows || []).reduce((total, row) => total + n(row?.[key]), 0); }

function momentIcon(moment: any) {
  const value = `${String(moment?.type || "")} ${String(moment?.label || "")}`.toLowerCase();
  if (value.includes("goal") || value.includes("but")) return "⚽";
  if (value.includes("save") || value.includes("arrêt") || value.includes("arret")) return "🧤";
  if (value.includes("intercept") || value.includes("tacle")) return "🛡️";
  if (value.includes("counter") || value.includes("contre")) return "🚀";
  if (value.includes("penalt")) return "🥅";
  return "•";
}

export default function FootballHistoryScoreBlock({ record }: any) {
  const summary = record?.summary || record?.payload?.summary || {};
  const config = summary?.config || record?.payload?.config || record?.resume?.config || {};
  const variant = summary?.variant || record?.payload?.variant || config?.variant || "match";
  const state = record?.resume?.state || record?.payload?.stateSnapshot || {};
  const sides = Array.isArray(state?.sides) ? state.sides : [];
  const scoreBySide = summary?.scoreBySide || state?.scoreBySide || {};
  const sideA = sides[0] || { id: "side-a", name: "Équipe A", color: BLUE };
  const sideB = sides[1] || { id: "side-b", name: "Équipe B", color: RED };
  const scoreA = n(scoreBySide?.[sideA.id]);
  const scoreB = n(scoreBySide?.[sideB.id]);
  const rows = summary?.rankings || summary?.perPlayer || record?.payload?.stats?.players || record?.players || [];
  const matchStats = summary?.matchStats || record?.payload?.stats?.match || {};
  const records = summary?.records || record?.payload?.summary?.records || {};
  const finished = record?.status === "finished" || summary?.finished === true || Boolean(record?.finishedAt || record?.endedAt);
  const draw = Boolean(summary?.draw);
  const winnerSideIds = summary?.winnerSideIds || state?.winnerSideIds || [];
  const winnerName = summary?.winnerName || "";
  const mvp = records?.mvp || records?.topScorer || [...(Array.isArray(rows) ? rows : [])].sort((a: any, b: any) => (n(b?.goals) * 10 + n(b?.saves) * 5 + n(b?.interceptions) * 3) - (n(a?.goals) * 10 + n(a?.saves) * 5 + n(a?.interceptions) * 3))[0];
  const durationMs = n(matchStats?.durationMs) || Math.max(0, n(record?.finishedAt || record?.endedAt) - n(record?.startedAt || record?.createdAt));
  const durationMin = durationMs ? Math.max(1, Math.round(durationMs / 60000)) : 0;
  const penaltyA = state?.penaltyAttemptsBySide?.[sideA.id] || [];
  const penaltyB = state?.penaltyAttemptsBySide?.[sideB.id] || [];
  const statusColor = finished ? (draw ? GOLD : GREEN) : BLUE;
  const format = variant === "first_to" || variant === "classic" ? `1er à ${n(config?.goalTarget) || 3}` : variant === "penalties" ? `${n(config?.penaltyShots) || 5} tirs` : variant === "match" ? `2 × ${n(config?.halfRounds) || 5} tours` : footballVariantLabel(variant);
  const moments = footballKeyMomentsFromRecord(record, 5);

  return <div style={{ marginTop: 8, display: "grid", gap: 6, minWidth: 0 }}>
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
      <div style={{ color: GREEN, fontSize: 8.5, fontWeight: 1100 }}>⚽ {footballVariantLabel(variant).toUpperCase()}</div>
      <div style={{ padding: "3px 6px", borderRadius: 999, border: `1px solid ${statusColor}55`, background: `${statusColor}10`, color: statusColor, fontSize: 5.8, fontWeight: 1050 }}>{finished ? (draw ? "MATCH NUL" : "TERMINÉ") : "EN COURS"}</div>
    </div>

    <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) auto minmax(0,1fr)", gap: 8, alignItems: "center", padding: 8, borderRadius: 13, background: "linear-gradient(135deg,rgba(101,229,170,.07),rgba(53,208,255,.035))", border: "1px solid rgba(101,229,170,.22)" }}>
      <div style={{ minWidth: 0 }}><strong style={{ color: sideA.color || BLUE, display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: 8.5 }}>{sideA.name || "Équipe A"}</strong>{winnerSideIds.includes(sideA.id) ? <span style={{ color: GOLD, fontSize: 5.5, fontWeight: 1000 }}>VAINQUEUR</span> : null}</div>
      <div style={{ textAlign: "center" }}><strong style={{ color: GOLD, fontSize: 18, whiteSpace: "nowrap" }}>{scoreA} - {scoreB}</strong><div style={{ color: SOFT, fontSize: 5.8 }}>{format}</div></div>
      <div style={{ minWidth: 0, textAlign: "right" }}><strong style={{ color: sideB.color || RED, display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: 8.5 }}>{sideB.name || "Équipe B"}</strong>{winnerSideIds.includes(sideB.id) ? <span style={{ color: GOLD, fontSize: 5.5, fontWeight: 1000 }}>VAINQUEUR</span> : null}</div>
    </div>

    <div style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 4 }}>
      {[["TIRS", n(matchStats?.shots) || sum(rows, "shots"), GOLD], ["CADRÉS", n(matchStats?.shotsOnTarget) || sum(rows, "shotsOnTarget"), BLUE], ["ARRÊTS", n(matchStats?.saves) || sum(rows, "saves"), GREEN], ["INTERCEPT.", n(matchStats?.interceptions) || sum(rows, "interceptions"), RED]].map(([label, value, color]: any) => <div key={label} style={{ padding: 5, borderRadius: 9, textAlign: "center", background: "rgba(255,255,255,.035)", border: "1px solid rgba(255,255,255,.07)" }}><strong style={{ color, fontSize: 9.5 }}>{value}</strong><div style={{ marginTop: 1, color: SOFT, fontSize: 5.4 }}>{label}</div></div>)}
    </div>

    {finished && (mvp || records?.topScorer || records?.topKeeper) ? <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 4 }}>
      {[
        ["★ MVP", mvp?.name || mvp?.playerName, GOLD],
        ["⚽ BUTEUR", records?.topScorer?.name || records?.topScorer?.playerName, GREEN],
        ["🧤 GARDIEN", records?.topKeeper?.name || records?.topKeeper?.playerName, BLUE],
      ].filter((item: any) => item[1]).map(([label, value, color]: any) => <div key={label} style={{ minWidth: 0, padding: "5px 6px", borderRadius: 9, border: `1px solid ${color}30`, background: `${color}08` }}><div style={{ color, fontSize: 5.4, fontWeight: 1050 }}>{label}</div><div style={{ marginTop: 2, color: WHITE, fontSize: 6.5, fontWeight: 950, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{value}</div></div>)}
    </div> : null}

    {(penaltyA.length || penaltyB.length) ? <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, padding: 6, borderRadius: 10, border: `1px solid ${GOLD}33`, background: `${GOLD}08` }}>
      {[{ side: sideA, attempts: penaltyA }, { side: sideB, attempts: penaltyB }].map(({ side, attempts }: any) => <div key={side.id}><div style={{ color: side.color, fontSize: 5.8, fontWeight: 1000 }}>{side.name}</div><div style={{ marginTop: 3, display: "flex", gap: 3, flexWrap: "wrap" }}>{attempts.map((ok: boolean, index: number) => <span key={index} style={{ width: 14, height: 14, borderRadius: "50%", display: "grid", placeItems: "center", background: ok ? GREEN : RED, color: ok ? "#03110b" : "#fff", fontSize: 6.5, fontWeight: 1100 }}>{ok ? "✓" : "×"}</span>)}</div></div>)}
    </div> : null}

    {moments.length ? <div style={{ padding: 6, borderRadius: 11, border: "1px solid rgba(255,255,255,.075)", background: "rgba(255,255,255,.02)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 6, alignItems: "center" }}><strong style={{ color: GOLD, fontSize: 5.8 }}>MOMENTS CLÉS</strong><span style={{ color: SOFT, fontSize: 5.2 }}>dernières actions décisives</span></div>
      <div style={{ marginTop: 4, display: "grid", gap: 3 }}>{moments.map((moment: any, index: number) => <div key={moment.id || index} style={{ display: "grid", gridTemplateColumns: "16px 38px minmax(0,1fr) auto", gap: 4, alignItems: "center", color: SOFT, fontSize: 5.8 }}><span style={{ textAlign: "center" }}>{momentIcon(moment)}</span><strong style={{ color: GREEN }}>P{moment.period}·T{moment.round}</strong><span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{moment.label}</span>{moment.scoreLine ? <strong style={{ color: WHITE }}>{moment.scoreLine}</strong> : null}</div>)}</div>
    </div> : null}

    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, color: SOFT, fontSize: 6.3 }}>
      <span>{durationMin ? `${durationMin} min · ` : ""}{n(matchStats?.totalDarts) || sum(rows, "darts")} fléchettes · {n(matchStats?.totalVisits) || n(state?.visits?.length)} volées</span>
      {winnerName ? <strong style={{ color: statusColor, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "42%" }}>{winnerName}</strong> : null}
    </div>

    {Array.isArray(rows) && rows.length ? <div style={{ display: "grid", gap: 4 }}>
      {rows.slice().sort((a: any, b: any) => n(a?.rank) - n(b?.rank)).slice(0, 4).map((row: any, index: number) => <div key={row?.id || index} style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) repeat(4,34px)", gap: 3, alignItems: "center", padding: "4px 6px", borderRadius: 9, background: "rgba(255,255,255,.025)" }}><strong style={{ minWidth: 0, color: row?.win ? GOLD : WHITE, fontSize: 6.8, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{row?.name || "Joueur"}{mvp && String(mvp?.id || mvp?.playerId) === String(row?.id || row?.playerId) ? " ★" : ""}</strong><span style={{ color: GOLD, fontSize: 6.5, textAlign: "center" }}>{n(row?.goals)}B</span><span style={{ color: BLUE, fontSize: 6.5, textAlign: "center" }}>{n(row?.saves)}A</span><span style={{ color: RED, fontSize: 6.5, textAlign: "center" }}>{n(row?.interceptions)}I</span><span style={{ color: GREEN, fontSize: 6.5, textAlign: "center" }}>{Math.round(n(row?.accuracy) * 10) / 10}%</span></div>)}
    </div> : null}
  </div>;
}
