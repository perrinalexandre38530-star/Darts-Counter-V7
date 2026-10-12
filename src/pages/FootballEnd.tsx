// @ts-nocheck
import React from "react";
import ProfileAvatar from "../components/ProfileAvatar";
import { footballAccuracy, footballVariantLabel } from "../lib/gameEngines/footballEngine";
import { History } from "../lib/history";
import { buildFootballEndInsights, buildFootballSectorProfileFromState, footballKeyMomentsFromState, footballPerformanceRating, footballTacticalProfile } from "../lib/footballInsights";

const GREEN = "#65e5aa";
const BLUE = "#35d0ff";
const RED = "#ff5b77";
const GOLD = "#ffd36b";
const SOFT = "#aeb8c9";
const WHITE = "#f7fbff";

const n = (v: any) => Number.isFinite(Number(v)) ? Number(v) : 0;
const pct = (value: any, total: any) => n(total) > 0 ? Math.round((n(value) / n(total)) * 100) : 0;
const playerName = (profile: any) => profile?.name || profile?.displayName || profile?.display_name || "Joueur";

function sumSide(state: any, sideIndex: number, key: string) {
  return state.players.reduce((total: number, player: any) => {
    if ((state.sideByPlayer[player.id] ?? 0) !== sideIndex) return total;
    return total + n(state.statsByPlayer[player.id]?.[key]);
  }, 0);
}

function possessionPct(state: any, sideIndex: number) {
  if (!state.visits?.length) return 50;
  const id = state.sides[sideIndex]?.id;
  const count = state.visits.filter((visit: any) => visit.possessionSideIdBefore === id).length;
  return Math.round((count / state.visits.length) * 100);
}

function ComparisonRow({ label, left, right, leftColor, rightColor, suffix = "" }: any) {
  const max = Math.max(1, n(left), n(right));
  return <div style={{ display: "grid", gridTemplateColumns: "42px minmax(0,1fr) 70px minmax(0,1fr) 42px", gap: 6, alignItems: "center" }}>
    <strong style={{ color: leftColor, fontSize: 9, textAlign: "right" }}>{left}{suffix}</strong>
    <div style={{ height: 5, borderRadius: 999, background: "rgba(255,255,255,.07)", overflow: "hidden", display: "flex", justifyContent: "flex-end" }}><span style={{ display: "block", height: "100%", width: `${n(left) / max * 100}%`, background: leftColor, borderRadius: 999 }} /></div>
    <span style={{ color: SOFT, fontSize: 6.3, fontWeight: 950, textAlign: "center" }}>{label}</span>
    <div style={{ height: 5, borderRadius: 999, background: "rgba(255,255,255,.07)", overflow: "hidden" }}><span style={{ display: "block", height: "100%", width: `${n(right) / max * 100}%`, background: rightColor, borderRadius: 999 }} /></div>
    <strong style={{ color: rightColor, fontSize: 9 }}>{right}{suffix}</strong>
  </div>;
}

function MatchRecord({ icon, label, row, value, color }: any) {
  if (!row) return null;
  return <div style={{ minWidth: 0, padding: 7, borderRadius: 12, border: `1px solid ${color}40`, background: `${color}0b` }}>
    <div style={{ display: "flex", gap: 5, alignItems: "center" }}><span>{icon}</span><span style={{ color, fontSize: 6.2, fontWeight: 1050 }}>{label}</span></div>
    <div style={{ marginTop: 3, color: WHITE, fontSize: 8.5, fontWeight: 1100, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{playerName(row.profile)}</div>
    <div style={{ marginTop: 2, color, fontSize: 12, fontWeight: 1200 }}>{value}</div>
  </div>;
}

function recordColor(metric: string) {
  if (metric === "goals" || metric === "shotsOnTarget") return GOLD;
  if (metric === "saves") return BLUE;
  if (metric === "interceptions") return RED;
  return GREEN;
}

function momentIcon(moment: any) {
  const value = `${String(moment?.type || "")} ${String(moment?.label || "")}`.toLowerCase();
  if (value.includes("goal") || value.includes("but")) return "⚽";
  if (value.includes("save") || value.includes("arrêt") || value.includes("arret")) return "🧤";
  if (value.includes("intercept") || value.includes("tacle")) return "🛡️";
  if (value.includes("counter") || value.includes("contre")) return "🚀";
  if (value.includes("penalt")) return "🥅";
  return "•";
}

export default function FootballEnd({ state, profilesById, onClose, onReplay, onStats, onHistory }: any) {
  const [insights, setInsights] = React.useState<any>({ breakthroughs: [], rivalry: null, moments: [], milestones: [], ratings: [] });

  React.useEffect(() => {
    let alive = true;
    void (async () => {
      try {
        const records = await (History as any).list();
        if (!alive) return;
        setInsights(buildFootballEndInsights(Array.isArray(records) ? records : [], state, profilesById));
      } catch {
        if (alive) setInsights((prev: any) => ({ ...prev, moments: footballKeyMomentsFromState(state, 12) }));
      }
    })();
    return () => { alive = false; };
  }, [state?.startedAt, state?.finishedAt]);

  const sideRows = state.sides.map((side: any, index: number) => ({
    side, index, score: n(state.scoreBySide[side.id]), winner: state.winnerSideIds.includes(side.id),
  })).sort((a: any, b: any) => Number(b.winner) - Number(a.winner) || b.score - a.score);

  const playerRows = state.players.map((player: any) => {
    const profile = profilesById.get(String(player.id)) || player;
    const stats = state.statsByPlayer[player.id] || {};
    const sideIndex = state.sideByPlayer[player.id] ?? 0;
    const impact = n(stats.goals) * 12 + n(stats.saves) * 6 + n(stats.interceptions) * 4 + n(stats.successfulActions) + n(stats.counterAttacks) * 2;
    return { player, profile, stats, side: state.sides[sideIndex], sideIndex, winner: state.winnerPlayerIds.includes(player.id), impact, accuracy: footballAccuracy(stats), rating: footballPerformanceRating(stats), tactical: footballTacticalProfile(stats), sectorProfile: buildFootballSectorProfileFromState(state, player.id) };
  }).sort((a: any, b: any) => Number(b.winner) - Number(a.winner) || b.impact - a.impact);

  const by = (fn: any) => [...playerRows].sort((a, b) => fn(b) - fn(a))[0] || null;
  const mvp = by((row: any) => row.impact);
  const topScorer = by((row: any) => n(row.stats.goals));
  const topKeeper = by((row: any) => n(row.stats.saves));
  const topDefender = by((row: any) => n(row.stats.interceptions) + n(row.stats.tackles) * .35);
  const mostAccurate = by((row: any) => row.accuracy);
  const leftColor = state.sides[0]?.color || BLUE;
  const rightColor = state.sides[1]?.color || RED;
  const leftPoss = possessionPct(state, 0);
  const rightPoss = 100 - leftPoss;
  const leftShots = sumSide(state, 0, "shots");
  const rightShots = sumSide(state, 1, "shots");
  const leftGoals = n(state.scoreBySide[state.sides[0]?.id]);
  const rightGoals = n(state.scoreBySide[state.sides[1]?.id]);
  const leftDarts = sumSide(state, 0, "darts");
  const rightDarts = sumSide(state, 1, "darts");
  const leftSuccess = sumSide(state, 0, "successfulActions");
  const rightSuccess = sumSide(state, 1, "successfulActions");
  const title = state.draw ? "MATCH NUL" : (sideRows[0]?.side?.name || "VICTOIRE");
  const comparison = [
    ["POSSESSION", leftPoss, rightPoss, "%"],
    ["TIRS", leftShots, rightShots, ""],
    ["CADRÉS", sumSide(state, 0, "shotsOnTarget"), sumSide(state, 1, "shotsOnTarget"), ""],
    ["ARRÊTS", sumSide(state, 0, "saves"), sumSide(state, 1, "saves"), ""],
    ["INTERCEPT.", sumSide(state, 0, "interceptions"), sumSide(state, 1, "interceptions"), ""],
    ["PROGRESSION", sumSide(state, 0, "advances"), sumSide(state, 1, "advances"), ""],
    ["CONVERSION", pct(leftGoals, leftShots), pct(rightGoals, rightShots), "%"],
    ["PRÉCISION", pct(leftSuccess, leftDarts), pct(rightSuccess, rightDarts), "%"],
  ];
  const matchBadges = [
    state.config.variant === "golden_goal" ? { icon: "⚡", label: "GOLDEN GOAL", color: GOLD } : null,
    state.stage === "penalties" || state.config.variant === "penalties" ? { icon: "🥅", label: "TIRS AU BUT", color: BLUE } : null,
    !state.draw && Math.min(leftGoals, rightGoals) === 0 ? { icon: "🧱", label: "CLEAN SHEET", color: GREEN } : null,
    Math.abs(leftGoals - rightGoals) >= 3 ? { icon: "🔥", label: "LARGE VICTOIRE", color: RED } : null,
    state.visits?.some((visit: any) => (visit.events || []).some((event: any) => event.type === "counter")) ? { icon: "🚀", label: "CONTRE-ATTAQUE", color: BLUE } : null,
  ].filter(Boolean);
  const moments = insights?.moments?.length ? insights.moments : footballKeyMomentsFromState(state, 12);

  return <div role="dialog" aria-modal="true" style={{ position: "fixed", inset: 0, zIndex: 10000, overflowY: "auto", padding: "max(8px,env(safe-area-inset-top)) 8px max(12px,env(safe-area-inset-bottom))", boxSizing: "border-box", background: "radial-gradient(circle at 50% 0%,rgba(101,229,170,.28),rgba(0,8,4,.96) 48%,#000 100%)" }}>
    <div style={{ width: "min(720px,100%)", margin: "0 auto" }}>
      <section style={{ borderRadius: 20, padding: 12, textAlign: "center", border: `1px solid ${GREEN}66`, background: "linear-gradient(180deg,rgba(101,229,170,.14),rgba(0,0,0,.42))", boxShadow: `0 0 38px ${GREEN}1c` }}>
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) auto minmax(0,1fr)", gap: 8, alignItems: "center" }}>
          <div style={{ minWidth: 0, textAlign: "left" }}><div style={{ color: leftColor, fontSize: 8, fontWeight: 1100, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{state.sides[0]?.name}</div><div style={{ color: WHITE, fontSize: 30, fontWeight: 1200 }}>{n(state.scoreBySide[state.sides[0]?.id])}</div></div>
          <div><div style={{ fontSize: 31 }}>⚽</div><div style={{ color: GREEN, fontSize: 7.5, fontWeight: 1150, letterSpacing: 1.4 }}>{state.draw ? "FIN DU MATCH" : "VICTOIRE"}</div></div>
          <div style={{ minWidth: 0, textAlign: "right" }}><div style={{ color: rightColor, fontSize: 8, fontWeight: 1100, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{state.sides[1]?.name}</div><div style={{ color: WHITE, fontSize: 30, fontWeight: 1200 }}>{n(state.scoreBySide[state.sides[1]?.id])}</div></div>
        </div>
        <div style={{ marginTop: 3, color: WHITE, fontSize: 19, fontWeight: 1200 }}>{title}</div>
        <div style={{ marginTop: 4, color: SOFT, fontSize: 7.5 }}>{footballVariantLabel(state.config.variant)} · {state.visits.length} volées · {Math.max(1, Math.round(((state.finishedAt || Date.now()) - state.startedAt) / 60000))} min</div>
      </section>

      {matchBadges.length ? <section style={{ marginTop: 7, display: "flex", gap: 5, flexWrap: "wrap", justifyContent: "center" }}>
        {matchBadges.map((badge: any) => <span key={badge.label} style={{ borderRadius: 999, padding: "5px 8px", border: `1px solid ${badge.color}55`, background: `${badge.color}0d`, color: badge.color, fontSize: 6.4, fontWeight: 1100 }}>{badge.icon} {badge.label}</span>)}
      </section> : null}

      {insights?.breakthroughs?.length ? <section style={{ marginTop: 7, borderRadius: 16, padding: 9, border: `1px solid ${GOLD}66`, background: "linear-gradient(135deg,rgba(255,211,107,.12),rgba(101,229,170,.04))" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}><strong style={{ color: GOLD, fontSize: 8.2, letterSpacing: .7 }}>🏆 NOUVEAUX RECORDS</strong><span style={{ color: SOFT, fontSize: 6.2 }}>{insights.breakthroughs.length} record{insights.breakthroughs.length > 1 ? "s" : ""} battu{insights.breakthroughs.length > 1 ? "s" : ""}</span></div>
        <div style={{ marginTop: 7, display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 5 }}>{insights.breakthroughs.map((record: any, index: number) => { const color = recordColor(record.metric); const suffix = record.suffix || ""; return <div key={`${record.playerId}-${record.metric}-${index}`} style={{ minWidth: 0, borderRadius: 11, padding: 7, border: `1px solid ${color}44`, background: `${color}0b` }}><div style={{ color, fontSize: 6.2, fontWeight: 1100 }}>{record.icon} {record.label}</div><div style={{ marginTop: 3, display: "flex", justifyContent: "space-between", gap: 6, alignItems: "baseline" }}><strong style={{ minWidth: 0, color: WHITE, fontSize: 7.4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{record.playerName}</strong><strong style={{ color, fontSize: 13 }}>{record.value}{suffix}</strong></div><div style={{ marginTop: 2, color: SOFT, fontSize: 5.8 }}>Ancien record : {record.previous}{suffix}</div></div>; })}</div>
      </section> : null}

      {insights?.milestones?.length ? <section style={{ marginTop: 7, borderRadius: 16, padding: 9, border: `1px solid ${GREEN}55`, background: "linear-gradient(135deg,rgba(101,229,170,.11),rgba(53,208,255,.035))" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}><strong style={{ color: GREEN, fontSize: 8.2, letterSpacing: .7 }}>🎖️ PALIERS DE CARRIÈRE</strong><span style={{ color: SOFT, fontSize: 6.2 }}>{insights.milestones.length} palier{insights.milestones.length > 1 ? "s" : ""} atteint{insights.milestones.length > 1 ? "s" : ""}</span></div>
        <div style={{ marginTop: 7, display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 5 }}>{insights.milestones.map((milestone: any, index: number) => <div key={`${milestone.playerId}-${milestone.key}-${milestone.target}-${index}`} style={{ minWidth: 0, borderRadius: 11, padding: 7, border: `1px solid ${GREEN}3d`, background: `${GREEN}09` }}><div style={{ color: GREEN, fontSize: 6.2, fontWeight: 1100 }}>{milestone.icon} {milestone.label.toUpperCase()}</div><div style={{ marginTop: 3, display: "flex", justifyContent: "space-between", gap: 6, alignItems: "baseline" }}><strong style={{ minWidth: 0, color: WHITE, fontSize: 7.4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{milestone.playerName}</strong><strong style={{ color: GOLD, fontSize: 13 }}>{milestone.target}</strong></div><div style={{ marginTop: 2, color: SOFT, fontSize: 5.8 }}>Nouveau palier débloqué</div></div>)}</div>
      </section> : null}

      {mvp ? <section style={{ marginTop: 7, borderRadius: 16, padding: 8, display: "grid", gridTemplateColumns: "39px minmax(0,1fr) auto", gap: 8, alignItems: "center", border: `1px solid ${GOLD}55`, background: `${GOLD}0c` }}>
        <ProfileAvatar profile={mvp.profile} size={37} />
        <div style={{ minWidth: 0 }}><div style={{ color: GOLD, fontSize: 6.5, fontWeight: 1100, letterSpacing: .8 }}>JOUEUR DU MATCH</div><div style={{ marginTop: 2, color: WHITE, fontSize: 11, fontWeight: 1150, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{playerName(mvp.profile)}</div><div style={{ marginTop: 2, color: SOFT, fontSize: 6.8 }}>{n(mvp.stats.goals)} but · {n(mvp.stats.saves)} arrêt · {n(mvp.stats.interceptions)} interception · {n(mvp.stats.counterAttacks)} contre</div></div>
        <div style={{ textAlign: "right" }}><div style={{ color: GOLD, fontSize: 17, fontWeight: 1200 }}>{mvp.rating.toFixed(1)}</div><div style={{ color: SOFT, fontSize: 5.7 }}>NOTE · {mvp.accuracy}% précis.</div></div>
      </section> : null}

      <section style={{ marginTop: 7, borderRadius: 16, padding: 9, border: "1px solid rgba(255,255,255,.09)", background: "linear-gradient(135deg,rgba(167,139,250,.055),rgba(101,229,170,.035))" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}><strong style={{ color: "#a78bfa", fontSize: 7.4, letterSpacing: .7 }}>🧬 ADN TACTIQUE DU MATCH</strong><span style={{ color: SOFT, fontSize: 6 }}>profil calculé sur les actions réelles</span></div>
        <div style={{ marginTop: 7, display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 6 }}>
          {playerRows.map((row: any) => <div key={`dna-${row.player.id}`} style={{ minWidth: 0, borderRadius: 12, padding: 7, border: `1px solid ${row.tactical.color}3d`, background: `${row.tactical.color}08` }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 6, alignItems: "center" }}><strong style={{ minWidth: 0, color: WHITE, fontSize: 7.8, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{playerName(row.profile)}</strong><span style={{ color: row.tactical.color, fontSize: 6.2, fontWeight: 1050 }}>{row.tactical.icon} {row.tactical.label}</span></div>
            <div style={{ marginTop: 5, display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 3 }}>
              {[["ATT", row.tactical.attaque, GREEN], ["FIN", row.tactical.finition, GOLD], ["DEF", row.tactical.defense, RED], ["GK", row.tactical.gardien, BLUE], ["CTL", row.tactical.controle, "#a78bfa"]].map(([label, value, color]: any) => <div key={label} style={{ textAlign: "center" }}><strong style={{ display: "block", color, fontSize: 8 }}>{value}</strong><span style={{ color: SOFT, fontSize: 5.2 }}>{label}</span></div>)}
            </div>
            {row.sectorProfile?.strongestSector ? <div style={{ marginTop: 5, color: SOFT, fontSize: 5.8 }}>🎯 Zone forte : <strong style={{ color: GREEN }}>{row.sectorProfile.strongestSector.sector}</strong> · {row.sectorProfile.strongestSector.missionHits}/{row.sectorProfile.strongestSector.darts} actions utiles</div> : null}
          </div>)}
        </div>
      </section>

      {mvp?.sectorProfile?.topSectors?.length ? <section style={{ marginTop: 7, borderRadius: 15, padding: 8, border: `1px solid ${GREEN}38`, background: `${GREEN}06` }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}><strong style={{ color: GREEN, fontSize: 7 }}>🎯 ZONES CHAUDES · {playerName(mvp.profile).toUpperCase()}</strong><span style={{ color: SOFT, fontSize: 6 }}>{mvp.sectorProfile.missionRate}% missions touchées</span></div>
        <div style={{ marginTop: 6, display: "grid", gridTemplateColumns: "repeat(5,minmax(0,1fr))", gap: 4 }}>{mvp.sectorProfile.topSectors.slice(0, 5).map((zone: any, index: number) => <div key={zone.sector} style={{ borderRadius: 10, padding: "6px 4px", textAlign: "center", border: `1px solid ${index === 0 ? GOLD : GREEN}35`, background: `${index === 0 ? GOLD : GREEN}08` }}><strong style={{ color: index === 0 ? GOLD : GREEN, fontSize: 12 }}>{zone.sector}</strong><div style={{ color: SOFT, fontSize: 5.3 }}>{zone.missionHits} utile{zone.missionHits > 1 ? "s" : ""}</div><div style={{ color: "#7f8998", fontSize: 5 }}>{zone.doubles}D · {zone.triples}T</div></div>)}</div>
      </section> : null}

      <section style={{ marginTop: 7, borderRadius: 16, padding: 9, border: "1px solid rgba(255,255,255,.09)", background: "rgba(255,255,255,.025)", display: "grid", gap: 7 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 70px 1fr", gap: 6, alignItems: "center" }}><strong style={{ color: leftColor, fontSize: 8, textAlign: "right", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{state.sides[0]?.name}</strong><span style={{ color: GOLD, fontSize: 7, fontWeight: 1100, textAlign: "center" }}>STATS MATCH</span><strong style={{ color: rightColor, fontSize: 8, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{state.sides[1]?.name}</strong></div>
        {comparison.map(([label, left, right, suffix]: any) => <ComparisonRow key={label} label={label} left={left} right={right} suffix={suffix} leftColor={leftColor} rightColor={rightColor} />)}
      </section>

      {insights?.rivalry ? <section style={{ marginTop: 7, borderRadius: 15, padding: 8, border: `1px solid ${BLUE}3d`, background: `${BLUE}08` }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}><strong style={{ color: BLUE, fontSize: 7, letterSpacing: .6 }}>⚔️ FACE-À-FACE HISTORIQUE</strong><span style={{ color: SOFT, fontSize: 6.2 }}>{insights.rivalry.games} précédent{insights.rivalry.games > 1 ? "s" : ""}</span></div>
        <div style={{ marginTop: 6, display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 8, alignItems: "center" }}><div style={{ textAlign: "right" }}><div style={{ color: leftColor, fontSize: 7, fontWeight: 1000 }}>{insights.rivalry.sideAName}</div><strong style={{ color: WHITE, fontSize: 18 }}>{insights.rivalry.winsA}</strong></div><div style={{ color: GOLD, fontSize: 7, fontWeight: 1100 }}>{insights.rivalry.draws} NUL</div><div><div style={{ color: rightColor, fontSize: 7, fontWeight: 1000 }}>{insights.rivalry.sideBName}</div><strong style={{ color: WHITE, fontSize: 18 }}>{insights.rivalry.winsB}</strong></div></div>
      </section> : null}

      <section style={{ marginTop: 7, display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 5 }}>
        <MatchRecord icon="⚽" label="MEILLEUR BUTEUR" row={topScorer} value={`${n(topScorer?.stats.goals)} but${n(topScorer?.stats.goals) > 1 ? "s" : ""}`} color={GOLD} />
        <MatchRecord icon="🧤" label="MEILLEUR GARDIEN" row={topKeeper} value={`${n(topKeeper?.stats.saves)} arrêt${n(topKeeper?.stats.saves) > 1 ? "s" : ""}`} color={BLUE} />
        <MatchRecord icon="🛡️" label="MEILLEUR DÉFENSEUR" row={topDefender} value={`${n(topDefender?.stats.interceptions)} int.`} color={RED} />
        <MatchRecord icon="🎯" label="PLUS PRÉCIS" row={mostAccurate} value={`${n(mostAccurate?.accuracy)}%`} color={GREEN} />
      </section>

      {state.stage === "penalties" || state.config.variant === "penalties" ? <section style={{ marginTop: 7, borderRadius: 15, padding: 8, border: `1px solid ${GOLD}44`, background: `${GOLD}08` }}>
        <div style={{ color: GOLD, fontSize: 7, fontWeight: 1100 }}>SÉANCE DE TIRS AU BUT</div>
        <div style={{ marginTop: 6, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>{state.sides.map((side: any) => <div key={side.id}><div style={{ color: side.color, fontSize: 7, fontWeight: 1000 }}>{side.name}</div><div style={{ marginTop: 4, display: "flex", gap: 4, flexWrap: "wrap" }}>{(state.penaltyAttemptsBySide[side.id] || []).map((ok: boolean, index: number) => <span key={index} style={{ width: 18, height: 18, borderRadius: "50%", display: "grid", placeItems: "center", background: ok ? GREEN : RED, color: ok ? "#03110b" : "#fff", fontSize: 8, fontWeight: 1200 }}>{ok ? "✓" : "×"}</span>)}</div></div>)}</div>
      </section> : null}

      <section style={{ marginTop: 7, display: "grid", gap: 6 }}>{playerRows.map((row: any, rank: number) => <div key={row.player.id} style={{ display: "grid", gridTemplateColumns: "26px 36px minmax(0,1fr) auto", gap: 7, alignItems: "center", borderRadius: 14, padding: 7, background: row.winner ? `linear-gradient(135deg,${GREEN}13,rgba(255,255,255,.03))` : "rgba(255,255,255,.025)", border: `1px solid ${row.winner ? GREEN : "rgba(255,255,255,.08)"}55` }}>
        <div style={{ color: row.winner ? GOLD : SOFT, fontSize: 12, fontWeight: 1100, textAlign: "center" }}>#{rank + 1}</div>
        <ProfileAvatar profile={row.profile} size={34} />
        <div style={{ minWidth: 0 }}><div style={{ color: row.side?.color || WHITE, fontSize: 9, fontWeight: 1100, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{playerName(row.profile)}{row.winner ? " · VAINQUEUR" : ""}</div><div style={{ marginTop: 2, color: SOFT, fontSize: 6.5 }}>{n(row.stats.goals)}B · {n(row.stats.shotsOnTarget)}TC · {n(row.stats.saves)}A · {n(row.stats.interceptions)}INT · {n(row.stats.advances)}PROG</div></div>
        <div style={{ textAlign: "right" }}><div style={{ color: GOLD, fontSize: 14, fontWeight: 1150 }}>{row.rating.toFixed(1)}</div><div style={{ color: GREEN, fontSize: 5.8 }}>{row.accuracy}% · {n(row.stats.darts)} fl.</div></div>
      </div>)}</section>

      {moments.length ? <section style={{ marginTop: 7, borderRadius: 15, padding: 8, border: "1px solid rgba(255,255,255,.08)", background: "rgba(255,255,255,.02)" }}><div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}><strong style={{ color: GOLD, fontSize: 7 }}>MOMENTS CLÉS</strong><span style={{ color: SOFT, fontSize: 6 }}>buts · arrêts · interceptions · contres</span></div><div style={{ marginTop: 5, display: "grid", gap: 4 }}>{moments.map((moment: any, index: number) => <div key={moment.id || index} style={{ display: "grid", gridTemplateColumns: "22px 50px minmax(0,1fr) auto", gap: 5, alignItems: "center", padding: "4px 5px", borderRadius: 8, background: "rgba(255,255,255,.022)", color: SOFT, fontSize: 6.8 }}><span style={{ textAlign: "center" }}>{momentIcon(moment)}</span><strong style={{ color: GREEN }}>P{moment.period} · T{moment.round}</strong><span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{moment.label}</span>{moment.scoreLine ? <strong style={{ color: WHITE }}>{moment.scoreLine}</strong> : null}</div>)}</div></section> : null}

      <div style={{ marginTop: 8, display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 6 }}>
        <button onClick={onReplay} style={{ minHeight: 42, borderRadius: 12, border: `1px solid ${GREEN}88`, background: `${GREEN}18`, color: GREEN, fontWeight: 1100 }}>↻ REVANCHE</button>
        <button onClick={onStats} style={{ minHeight: 42, borderRadius: 12, border: `1px solid ${BLUE}88`, background: `${BLUE}18`, color: BLUE, fontWeight: 1100 }}>📊 STATISTIQUES & RECORDS</button>
        <button onClick={onHistory} style={{ minHeight: 42, borderRadius: 12, border: `1px solid ${GOLD}88`, background: `${GOLD}18`, color: GOLD, fontWeight: 1100 }}>🕘 HISTORIQUE</button>
        <button onClick={onClose} style={{ minHeight: 42, borderRadius: 12, border: `1px solid ${RED}66`, background: `${RED}12`, color: RED, fontWeight: 1100 }}>FERMER</button>
      </div>
    </div>
  </div>;
}
