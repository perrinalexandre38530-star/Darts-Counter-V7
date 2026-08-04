// @ts-nocheck
import React from "react";
import ProfileAvatar from "../components/ProfileAvatar";
import { footballAccuracy, footballVariantLabel } from "../lib/gameEngines/footballEngine";

const GREEN = "#65e5aa", BLUE = "#35d0ff", RED = "#ff5b77", GOLD = "#ffd36b", SOFT = "#aeb8c9";
const playerName = (profile: any) => profile?.name || profile?.displayName || profile?.display_name || "Joueur";

export default function FootballEnd({ state, profilesById, onClose, onReplay, onStats, onHistory }: any) {
  const sideRows = state.sides.map((side: any, index: number) => ({
    side, index, score: Number(state.scoreBySide[side.id] || 0), winner: state.winnerSideIds.includes(side.id),
  })).sort((a: any, b: any) => Number(b.winner) - Number(a.winner) || b.score - a.score);
  const playerRows = state.players.map((player: any) => {
    const profile = profilesById.get(String(player.id)) || player;
    const stats = state.statsByPlayer[player.id] || {};
    const sideIndex = state.sideByPlayer[player.id] ?? 0;
    return { player, profile, stats, side: state.sides[sideIndex], winner: state.winnerPlayerIds.includes(player.id) };
  }).sort((a: any, b: any) => Number(b.winner) - Number(a.winner) || Number(b.stats.goals || 0) - Number(a.stats.goals || 0) || Number(b.stats.successfulActions || 0) - Number(a.stats.successfulActions || 0));
  const title = state.draw ? "MATCH NUL" : (sideRows[0]?.side?.name || "VICTOIRE");

  return <div role="dialog" aria-modal="true" style={{ position: "fixed", inset: 0, zIndex: 10000, overflowY: "auto", padding: "max(10px,env(safe-area-inset-top)) 9px max(14px,env(safe-area-inset-bottom))", boxSizing: "border-box", background: "radial-gradient(circle at 50% 0%,rgba(101,229,170,.28),rgba(0,8,4,.96) 48%,#000 100%)" }}>
    <div style={{ width: "min(760px,100%)", margin: "0 auto" }}>
      <div style={{ borderRadius: 24, padding: 16, textAlign: "center", border: `1px solid ${GREEN}66`, background: "linear-gradient(180deg,rgba(101,229,170,.15),rgba(0,0,0,.42))", boxShadow: `0 0 45px ${GREEN}20` }}>
        <div style={{ fontSize: 42 }}>⚽</div>
        <div style={{ marginTop: 4, color: GREEN, fontSize: 10, fontWeight: 1150, letterSpacing: 2 }}>{state.draw ? "FIN DU MATCH" : "VICTOIRE"}</div>
        <div style={{ marginTop: 6, color: "#fff", fontSize: 25, fontWeight: 1200 }}>{title}</div>
        <div style={{ marginTop: 6, display: "flex", justifyContent: "center", alignItems: "center", gap: 10 }}>
          <strong style={{ color: BLUE, fontSize: 22 }}>{state.sides[0]?.name} {state.scoreBySide[state.sides[0]?.id] || 0}</strong>
          <span style={{ color: SOFT, fontWeight: 1100 }}>—</span>
          <strong style={{ color: RED, fontSize: 22 }}>{state.scoreBySide[state.sides[1]?.id] || 0} {state.sides[1]?.name}</strong>
        </div>
        <div style={{ marginTop: 7, color: SOFT, fontSize: 9 }}>{footballVariantLabel(state.config.variant)} · {state.period} période{state.period > 1 ? "s" : ""} · {state.visits.length} volées</div>
      </div>

      <div style={{ marginTop: 9, display: "grid", gap: 7 }}>{playerRows.map((row: any, rank: number) => <div key={row.player.id} style={{ display: "grid", gridTemplateColumns: "34px 44px minmax(0,1fr) auto", gap: 8, alignItems: "center", borderRadius: 17, padding: 9, background: row.winner ? `linear-gradient(135deg,${GREEN}15,rgba(255,255,255,.035))` : "rgba(255,255,255,.03)", border: `1px solid ${row.winner ? GREEN : "rgba(255,255,255,.09)"}66` }}>
        <div style={{ color: row.winner ? GOLD : SOFT, fontSize: 17, fontWeight: 1100, textAlign: "center" }}>#{rank + 1}</div>
        <ProfileAvatar profile={row.profile} size={42} />
        <div style={{ minWidth: 0 }}><div style={{ color: row.side?.color || "#fff", fontSize: 10.5, fontWeight: 1100, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{playerName(row.profile)}{row.winner ? " · VAINQUEUR" : ""}</div><div style={{ marginTop: 3, color: SOFT, fontSize: 8.2 }}>{row.stats.goals || 0} but · {row.stats.shotsOnTarget || 0} cadré · {row.stats.saves || 0} arrêt · {row.stats.interceptions || 0} interception</div></div>
        <div style={{ textAlign: "right" }}><div style={{ color: GREEN, fontSize: 18, fontWeight: 1150 }}>{footballAccuracy(row.stats)}%</div><div style={{ color: SOFT, fontSize: 7.2 }}>{row.stats.successfulActions || 0} actions</div></div>
      </div>)}</div>

      <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 8 }}>
        <button onClick={onReplay} style={{ minHeight: 46, borderRadius: 14, border: `1px solid ${GREEN}88`, background: `${GREEN}18`, color: GREEN, fontWeight: 1100 }}>↻ REVANCHE</button>
        <button onClick={onStats} style={{ minHeight: 46, borderRadius: 14, border: `1px solid ${BLUE}88`, background: `${BLUE}18`, color: BLUE, fontWeight: 1100 }}>📊 STATISTIQUES</button>
        <button onClick={onHistory} style={{ minHeight: 46, borderRadius: 14, border: `1px solid ${GOLD}88`, background: `${GOLD}18`, color: GOLD, fontWeight: 1100 }}>🕘 HISTORIQUE</button>
        <button onClick={onClose} style={{ minHeight: 46, borderRadius: 14, border: `1px solid ${RED}66`, background: `${RED}12`, color: RED, fontWeight: 1100 }}>FERMER</button>
      </div>
    </div>
  </div>;
}
