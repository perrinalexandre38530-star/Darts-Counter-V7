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

const playerName = (profile: any) => profile?.name || profile?.displayName || profile?.display_name || "Joueur";

function sumSide(state: any, sideIndex: number, key: string) {
  return state.players.reduce((total: number, player: any) => {
    if ((state.sideByPlayer[player.id] ?? 0) !== sideIndex) return total;
    return total + Number(state.statsByPlayer[player.id]?.[key] || 0);
  }, 0);
}

function ComparisonRow({ label, left, right, leftColor, rightColor }: any) {
  const max = Math.max(1, Number(left || 0), Number(right || 0));
  return <div style={{ display: "grid", gridTemplateColumns: "32px minmax(0,1fr) 66px minmax(0,1fr) 32px", gap: 6, alignItems: "center" }}>
    <strong style={{ color: leftColor, fontSize: 10, textAlign: "right" }}>{left}</strong>
    <div style={{ height: 5, borderRadius: 999, background: "rgba(255,255,255,.07)", overflow: "hidden", display: "flex", justifyContent: "flex-end" }}><span style={{ display: "block", height: "100%", width: `${(Number(left || 0) / max) * 100}%`, background: leftColor, borderRadius: 999 }} /></div>
    <span style={{ color: SOFT, fontSize: 6.5, fontWeight: 950, textAlign: "center" }}>{label}</span>
    <div style={{ height: 5, borderRadius: 999, background: "rgba(255,255,255,.07)", overflow: "hidden" }}><span style={{ display: "block", height: "100%", width: `${(Number(right || 0) / max) * 100}%`, background: rightColor, borderRadius: 999 }} /></div>
    <strong style={{ color: rightColor, fontSize: 10 }}>{right}</strong>
  </div>;
}

export default function FootballEnd({ state, profilesById, onClose, onReplay, onStats, onHistory }: any) {
  const sideRows = state.sides.map((side: any, index: number) => ({
    side,
    index,
    score: Number(state.scoreBySide[side.id] || 0),
    winner: state.winnerSideIds.includes(side.id),
  })).sort((a: any, b: any) => Number(b.winner) - Number(a.winner) || b.score - a.score);

  const playerRows = state.players.map((player: any) => {
    const profile = profilesById.get(String(player.id)) || player;
    const stats = state.statsByPlayer[player.id] || {};
    const sideIndex = state.sideByPlayer[player.id] ?? 0;
    return {
      player,
      profile,
      stats,
      side: state.sides[sideIndex],
      winner: state.winnerPlayerIds.includes(player.id),
      impact: Number(stats.goals || 0) * 10 + Number(stats.saves || 0) * 5 + Number(stats.interceptions || 0) * 3 + Number(stats.successfulActions || 0),
    };
  }).sort((a: any, b: any) => Number(b.winner) - Number(a.winner) || b.impact - a.impact);

  const title = state.draw ? "MATCH NUL" : (sideRows[0]?.side?.name || "VICTOIRE");
  const mvp = [...playerRows].sort((a: any, b: any) => b.impact - a.impact)[0];
  const leftColor = state.sides[0]?.color || BLUE;
  const rightColor = state.sides[1]?.color || RED;
  const comparison = [
    ["TIRS", sumSide(state, 0, "shots"), sumSide(state, 1, "shots")],
    ["CADRÉS", sumSide(state, 0, "shotsOnTarget"), sumSide(state, 1, "shotsOnTarget")],
    ["INTERCEPT.", sumSide(state, 0, "interceptions"), sumSide(state, 1, "interceptions")],
    ["PROGRESSION", sumSide(state, 0, "advances"), sumSide(state, 1, "advances")],
  ];

  return <div role="dialog" aria-modal="true" style={{ position: "fixed", inset: 0, zIndex: 10000, overflowY: "auto", padding: "max(8px,env(safe-area-inset-top)) 8px max(12px,env(safe-area-inset-bottom))", boxSizing: "border-box", background: "radial-gradient(circle at 50% 0%,rgba(101,229,170,.28),rgba(0,8,4,.96) 48%,#000 100%)" }}>
    <div style={{ width: "min(720px,100%)", margin: "0 auto" }}>
      <section style={{ borderRadius: 20, padding: 12, textAlign: "center", border: `1px solid ${GREEN}66`, background: "linear-gradient(180deg,rgba(101,229,170,.14),rgba(0,0,0,.42))", boxShadow: `0 0 38px ${GREEN}1c` }}>
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) auto minmax(0,1fr)", gap: 8, alignItems: "center" }}>
          <div style={{ minWidth: 0, textAlign: "left" }}><div style={{ color: leftColor, fontSize: 8, fontWeight: 1100, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{state.sides[0]?.name}</div><div style={{ color: WHITE, fontSize: 28, fontWeight: 1200 }}>{state.scoreBySide[state.sides[0]?.id] || 0}</div></div>
          <div><div style={{ fontSize: 31 }}>⚽</div><div style={{ color: GREEN, fontSize: 7.5, fontWeight: 1150, letterSpacing: 1.4 }}>{state.draw ? "FIN DU MATCH" : "VICTOIRE"}</div></div>
          <div style={{ minWidth: 0, textAlign: "right" }}><div style={{ color: rightColor, fontSize: 8, fontWeight: 1100, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{state.sides[1]?.name}</div><div style={{ color: WHITE, fontSize: 28, fontWeight: 1200 }}>{state.scoreBySide[state.sides[1]?.id] || 0}</div></div>
        </div>
        <div style={{ marginTop: 3, color: WHITE, fontSize: 19, fontWeight: 1200 }}>{title}</div>
        <div style={{ marginTop: 4, color: SOFT, fontSize: 7.5 }}>{footballVariantLabel(state.config.variant)} · {state.period} période{state.period > 1 ? "s" : ""} · {state.visits.length} volées</div>
      </section>

      {mvp ? <section style={{ marginTop: 7, borderRadius: 16, padding: 8, display: "grid", gridTemplateColumns: "39px minmax(0,1fr) auto", gap: 8, alignItems: "center", border: `1px solid ${GOLD}55`, background: `${GOLD}0c` }}>
        <ProfileAvatar profile={mvp.profile} size={37} />
        <div style={{ minWidth: 0 }}><div style={{ color: GOLD, fontSize: 6.5, fontWeight: 1100, letterSpacing: .8 }}>JOUEUR DU MATCH</div><div style={{ marginTop: 2, color: WHITE, fontSize: 11, fontWeight: 1150, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{playerName(mvp.profile)}</div><div style={{ marginTop: 2, color: SOFT, fontSize: 6.8 }}>{mvp.stats.goals || 0} but · {mvp.stats.saves || 0} arrêt · {mvp.stats.interceptions || 0} interception</div></div>
        <div style={{ color: GREEN, fontSize: 17, fontWeight: 1200 }}>{footballAccuracy(mvp.stats)}%</div>
      </section> : null}

      <section style={{ marginTop: 7, borderRadius: 16, padding: 9, border: "1px solid rgba(255,255,255,.09)", background: "rgba(255,255,255,.025)", display: "grid", gap: 7 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 66px 1fr", gap: 6, alignItems: "center" }}><strong style={{ color: leftColor, fontSize: 8, textAlign: "right", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{state.sides[0]?.name}</strong><span style={{ color: GOLD, fontSize: 7, fontWeight: 1100, textAlign: "center" }}>MATCH</span><strong style={{ color: rightColor, fontSize: 8, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{state.sides[1]?.name}</strong></div>
        {comparison.map(([label, left, right]: any) => <ComparisonRow key={label} label={label} left={left} right={right} leftColor={leftColor} rightColor={rightColor} />)}
      </section>

      <div style={{ marginTop: 7, display: "grid", gap: 6 }}>{playerRows.map((row: any, rank: number) => <div key={row.player.id} style={{ display: "grid", gridTemplateColumns: "28px 37px minmax(0,1fr) auto", gap: 7, alignItems: "center", borderRadius: 14, padding: 7, background: row.winner ? `linear-gradient(135deg,${GREEN}13,rgba(255,255,255,.03))` : "rgba(255,255,255,.025)", border: `1px solid ${row.winner ? GREEN : "rgba(255,255,255,.08)"}55` }}>
        <div style={{ color: row.winner ? GOLD : SOFT, fontSize: 13, fontWeight: 1100, textAlign: "center" }}>#{rank + 1}</div>
        <ProfileAvatar profile={row.profile} size={35} />
        <div style={{ minWidth: 0 }}><div style={{ color: row.side?.color || WHITE, fontSize: 9.3, fontWeight: 1100, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{playerName(row.profile)}{row.winner ? " · VAINQUEUR" : ""}</div><div style={{ marginTop: 2, color: SOFT, fontSize: 6.9 }}>{row.stats.goals || 0} but · {row.stats.shotsOnTarget || 0} cadré · {row.stats.saves || 0} arrêt · {row.stats.interceptions || 0} int.</div></div>
        <div style={{ textAlign: "right" }}><div style={{ color: GREEN, fontSize: 15, fontWeight: 1150 }}>{footballAccuracy(row.stats)}%</div><div style={{ color: SOFT, fontSize: 6 }}>{row.stats.successfulActions || 0} actions</div></div>
      </div>)}</div>

      <div style={{ marginTop: 8, display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 6 }}>
        <button onClick={onReplay} style={{ minHeight: 42, borderRadius: 12, border: `1px solid ${GREEN}88`, background: `${GREEN}18`, color: GREEN, fontWeight: 1100 }}>↻ REVANCHE</button>
        <button onClick={onStats} style={{ minHeight: 42, borderRadius: 12, border: `1px solid ${BLUE}88`, background: `${BLUE}18`, color: BLUE, fontWeight: 1100 }}>📊 STATISTIQUES</button>
        <button onClick={onHistory} style={{ minHeight: 42, borderRadius: 12, border: `1px solid ${GOLD}88`, background: `${GOLD}18`, color: GOLD, fontWeight: 1100 }}>🕘 HISTORIQUE</button>
        <button onClick={onClose} style={{ minHeight: 42, borderRadius: 12, border: `1px solid ${RED}66`, background: `${RED}12`, color: RED, fontWeight: 1100 }}>FERMER</button>
      </div>
    </div>
  </div>;
}
