// @ts-nocheck
import React from "react";
import ProfileAvatar from "../components/ProfileAvatar";
import { oceanControlAccuracy, oceanControlVariantLabel } from "../lib/gameEngines/oceanControlEngine";

const BLUE = "#30b9ff", CYAN = "#65e9ff", GREEN = "#65e5aa", GOLD = "#f5ca68", RED = "#ff6573", SOFT = "#aab4c7";
const playerName = (p: any) => p?.name || p?.displayName || p?.display_name || "Joueur";

export default function OceanControlEnd({ state, profilesById, onClose, onReplay, onStats, onHistory }: any) {
  const winnerOwner = state.owners.find((owner: any) => state.winnerOwnerIds.includes(owner.id));
  const rows = state.players.map((player: any, index: number) => {
    const stats = state.statsByPlayer[player.id] || {};
    const profile = profilesById.get(String(player.id)) || player;
    const won = state.winnerPlayerIds.includes(player.id);
    return { player, profile, stats, won, index };
  }).sort((a: any, b: any) => Number(b.won) - Number(a.won) || Number(b.stats?.shipsSunk || 0) - Number(a.stats?.shipsSunk || 0) || Number(b.stats?.shipHits || 0) - Number(a.stats?.shipHits || 0));

  return <div role="dialog" aria-modal="true" style={{ position: "fixed", inset: 0, zIndex: 10000, background: "radial-gradient(circle at 50% 0%,rgba(48,185,255,.28),rgba(0,5,10,.96) 48%,#000 100%)", overflowY: "auto", padding: "max(10px,env(safe-area-inset-top)) 9px max(12px,env(safe-area-inset-bottom))", boxSizing: "border-box" }}>
    <div style={{ width: "min(760px,100%)", margin: "0 auto" }}>
      <div style={{ borderRadius: 24, padding: 16, textAlign: "center", background: "linear-gradient(180deg,rgba(48,185,255,.16),rgba(0,0,0,.42))", border: `1px solid ${BLUE}66`, boxShadow: `0 0 45px ${BLUE}22` }}>
        <div style={{ fontSize: 42 }}>⚓</div>
        <div style={{ marginTop: 5, color: CYAN, fontSize: 10, fontWeight: 1100, letterSpacing: 2 }}>OCÉAN SÉCURISÉ</div>
        <div style={{ marginTop: 6, color: "#fff", fontSize: 25, fontWeight: 1200 }}>{winnerOwner?.name || "VICTOIRE"}</div>
        <div style={{ marginTop: 5, color: SOFT, fontSize: 9 }}>{oceanControlVariantLabel(state.config.variant)} · {state.battleNumber} bataille{state.battleNumber > 1 ? "s" : ""} · {state.visits.length} volées</div>
        <div style={{ marginTop: 11, display: "flex", justifyContent: "center", gap: 7, flexWrap: "wrap" }}>{state.owners.map((owner: any) => <div key={owner.id} style={{ borderRadius: 999, padding: "6px 10px", border: `1px solid ${state.winnerOwnerIds.includes(owner.id) ? GOLD : "rgba(255,255,255,.10)"}`, background: state.winnerOwnerIds.includes(owner.id) ? `${GOLD}18` : "rgba(255,255,255,.035)", color: state.winnerOwnerIds.includes(owner.id) ? GOLD : SOFT, fontSize: 9, fontWeight: 1000 }}>{owner.name} · {state.scoreByOwner[owner.id] || 0}</div>)}</div>
      </div>

      <div style={{ marginTop: 9, display: "grid", gap: 7 }}>{rows.map((row: any, rank: number) => <div key={row.player.id} style={{ display: "grid", gridTemplateColumns: "36px 44px minmax(0,1fr) auto", gap: 8, alignItems: "center", borderRadius: 17, padding: 9, background: row.won ? `linear-gradient(135deg,${BLUE}15,rgba(255,255,255,.035))` : "rgba(255,255,255,.03)", border: `1px solid ${row.won ? BLUE : "rgba(255,255,255,.09)"}66` }}>
        <div style={{ color: row.won ? GOLD : SOFT, fontSize: 17, fontWeight: 1100, textAlign: "center" }}>#{rank + 1}</div>
        <ProfileAvatar profile={row.profile} size={42} />
        <div style={{ minWidth: 0 }}><div style={{ color: row.won ? CYAN : "#fff", fontSize: 10.5, fontWeight: 1100, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{playerName(row.profile)}{row.won ? " · VAINQUEUR" : ""}</div><div style={{ marginTop: 3, color: SOFT, fontSize: 8.2 }}>{row.stats?.shipsSunk || 0} navires coulés · {row.stats?.sonarUses || 0} sonars · {row.stats?.precisionStrikes || 0} frappes</div></div>
        <div style={{ textAlign: "right" }}><div style={{ color: GREEN, fontSize: 19, fontWeight: 1150 }}>{oceanControlAccuracy(row.stats)}%</div><div style={{ color: SOFT, fontSize: 7.2 }}>{row.stats?.shipHits || 0}/{row.stats?.validShots || 0} tirs</div></div>
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
