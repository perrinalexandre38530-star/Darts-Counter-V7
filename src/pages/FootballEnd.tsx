// @ts-nocheck
import React from "react";
import ProfileAvatar from "../components/ProfileAvatar";
import { footballAccuracy, footballVariantLabel } from "../lib/gameEngines/footballEngine";

const GREEN = "#65e5aa";
const BLUE = "#35d0ff";
const RED = "#ff5b77";
const GOLD = "#ffd36b";
const SOFT = "#aeb8c9";
const WHITE = "#f7fbff";

const n = (v: any) => Number.isFinite(Number(v)) ? Number(v) : 0;
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

export default function FootballEnd({ state, profilesById, onClose, onReplay, onStats, onHistory }: any) {
  const sideRows = state.sides.map((side: any, index: number) => ({
    side, index, score: n(state.scoreBySide[side.id]), winner: state.winnerSideIds.includes(side.id),
  })).sort((a: any, b: any) => Number(b.winner) - Number(a.winner) || b.score - a.score);

  const playerRows = state.players.map((player: any) => {
    const profile = profilesById.get(String(player.id)) || player;
    const stats = state.statsByPlayer[player.id] || {};
    const sideIndex = state.sideByPlayer[player.id] ?? 0;
    const impact = n(stats.goals) * 12 + n(stats.saves) * 6 + n(stats.interceptions) * 4 + n(stats.successfulActions) + n(stats.counterAttacks) * 2;
    return { player, profile, stats, side: state.sides[sideIndex], sideIndex, winner: state.winnerPlayerIds.includes(player.id), impact, accuracy: footballAccuracy(stats) };
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
  const title = state.draw ? "MATCH NUL" : (sideRows[0]?.side?.name || "VICTOIRE");
  const comparison = [
    ["POSSESSION", leftPoss, rightPoss, "%"],
    ["TIRS", sumSide(state, 0, "shots"), sumSide(state, 1, "shots"), ""],
    ["CADRÉS", sumSide(state, 0, "shotsOnTarget"), sumSide(state, 1, "shotsOnTarget"), ""],
    ["ARRÊTS", sumSide(state, 0, "saves"), sumSide(state, 1, "saves"), ""],
    ["INTERCEPT.", sumSide(state, 0, "interceptions"), sumSide(state, 1, "interceptions"), ""],
    ["PROGRESSION", sumSide(state, 0, "advances"), sumSide(state, 1, "advances"), ""],
  ];
  const goalEvents = (state.visits || []).flatMap((visit: any) => (visit.events || []).filter((event: any) => String(event.type).includes("goal")).map((event: any) => ({ visit, event }))).slice(-8);

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

      {mvp ? <section style={{ marginTop: 7, borderRadius: 16, padding: 8, display: "grid", gridTemplateColumns: "39px minmax(0,1fr) auto", gap: 8, alignItems: "center", border: `1px solid ${GOLD}55`, background: `${GOLD}0c` }}>
        <ProfileAvatar profile={mvp.profile} size={37} />
        <div style={{ minWidth: 0 }}><div style={{ color: GOLD, fontSize: 6.5, fontWeight: 1100, letterSpacing: .8 }}>JOUEUR DU MATCH</div><div style={{ marginTop: 2, color: WHITE, fontSize: 11, fontWeight: 1150, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{playerName(mvp.profile)}</div><div style={{ marginTop: 2, color: SOFT, fontSize: 6.8 }}>{n(mvp.stats.goals)} but · {n(mvp.stats.saves)} arrêt · {n(mvp.stats.interceptions)} interception · {n(mvp.stats.counterAttacks)} contre</div></div>
        <div style={{ color: GREEN, fontSize: 17, fontWeight: 1200 }}>{mvp.accuracy}%</div>
      </section> : null}

      <section style={{ marginTop: 7, borderRadius: 16, padding: 9, border: "1px solid rgba(255,255,255,.09)", background: "rgba(255,255,255,.025)", display: "grid", gap: 7 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 70px 1fr", gap: 6, alignItems: "center" }}><strong style={{ color: leftColor, fontSize: 8, textAlign: "right", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{state.sides[0]?.name}</strong><span style={{ color: GOLD, fontSize: 7, fontWeight: 1100, textAlign: "center" }}>STATS MATCH</span><strong style={{ color: rightColor, fontSize: 8, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{state.sides[1]?.name}</strong></div>
        {comparison.map(([label, left, right, suffix]: any) => <ComparisonRow key={label} label={label} left={left} right={right} suffix={suffix} leftColor={leftColor} rightColor={rightColor} />)}
      </section>

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
        <div style={{ textAlign: "right" }}><div style={{ color: GREEN, fontSize: 14, fontWeight: 1150 }}>{row.accuracy}%</div><div style={{ color: SOFT, fontSize: 5.8 }}>{n(row.stats.darts)} fl.</div></div>
      </div>)}</section>

      {goalEvents.length ? <section style={{ marginTop: 7, borderRadius: 15, padding: 8, border: "1px solid rgba(255,255,255,.08)", background: "rgba(255,255,255,.02)" }}><div style={{ color: GOLD, fontSize: 7, fontWeight: 1100 }}>CHRONOLOGIE DES BUTS</div><div style={{ marginTop: 5, display: "grid", gap: 4 }}>{goalEvents.map(({ visit, event }: any, index: number) => <div key={`${visit.id}-${index}`} style={{ display: "grid", gridTemplateColumns: "56px minmax(0,1fr)", gap: 6, color: SOFT, fontSize: 7 }}><strong style={{ color: GREEN }}>P{visit.period} · T{visit.round}</strong><span>{event.label}</span></div>)}</div></section> : null}

      <div style={{ marginTop: 8, display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 6 }}>
        <button onClick={onReplay} style={{ minHeight: 42, borderRadius: 12, border: `1px solid ${GREEN}88`, background: `${GREEN}18`, color: GREEN, fontWeight: 1100 }}>↻ REVANCHE</button>
        <button onClick={onStats} style={{ minHeight: 42, borderRadius: 12, border: `1px solid ${BLUE}88`, background: `${BLUE}18`, color: BLUE, fontWeight: 1100 }}>📊 STATISTIQUES & RECORDS</button>
        <button onClick={onHistory} style={{ minHeight: 42, borderRadius: 12, border: `1px solid ${GOLD}88`, background: `${GOLD}18`, color: GOLD, fontWeight: 1100 }}>🕘 HISTORIQUE</button>
        <button onClick={onClose} style={{ minHeight: 42, borderRadius: 12, border: `1px solid ${RED}66`, background: `${RED}12`, color: RED, fontWeight: 1100 }}>FERMER</button>
      </div>
    </div>
  </div>;
}
