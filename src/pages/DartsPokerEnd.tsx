// @ts-nocheck
import React from "react";
import ProfileAvatar from "../components/ProfileAvatar";
import type { DartsPokerState } from "../lib/gameEngines/dartsPokerEngine";

const GOLD = "#f6c256";
const RED = "#e83a43";
const GREEN = "#5ce6a8";
const SOFT = "#9aa1b2";

function playerName(profile: any) { return profile?.name || profile?.displayName || "Joueur"; }
function pct(a: number, b: number) { return b > 0 ? `${Math.round((a / b) * 1000) / 10}%` : "0%"; }
function button(color: string): React.CSSProperties { return { minHeight: 44, borderRadius: 14, border: `1px solid ${color}88`, background: `${color}18`, color, fontWeight: 1050, cursor: "pointer" }; }

export default function DartsPokerEnd({ state, profilesById, onClose, onReplay, onStats, onHistory }: { state: DartsPokerState; profilesById: Map<string, any>; onClose: () => void; onReplay: () => void; onStats: () => void; onHistory: () => void; }) {
  const standings = state.standings || [];
  const best = standings[0];
  return <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,.90)", backdropFilter: "blur(9px)", overflow: "auto", padding: 8 }}>
    <div style={{ width: "min(840px,100%)", margin: "10px auto", borderRadius: 24, padding: 14, background: "radial-gradient(circle at 50% 0%,rgba(232,58,67,.22),rgba(10,10,14,.98) 46%)", border: `1px solid ${GOLD}66`, boxShadow: "0 24px 70px rgba(0,0,0,.65)" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ color: GOLD, fontSize: 11, fontWeight: 1100, letterSpacing: 2 }}>SHOWDOWN FINAL</div>
        <div style={{ color: "#fff", fontSize: 26, fontWeight: 1200, marginTop: 3 }}>DARTS POKER</div>
        <div style={{ color: RED, fontSize: 13, fontWeight: 1000, marginTop: 4 }}>{state.winnerIds.length > 1 ? "ÉGALITÉ À LA TABLE" : `${best?.name || "Vainqueur"} remporte la partie`}</div>
      </div>

      <div style={{ marginTop: 13, display: "grid", gap: 7 }}>
        {standings.map((row) => {
          const stats = state.statsByPlayer[row.id] || ({} as any);
          const profile = profilesById.get(String(row.id)) || { id: row.id, name: row.name };
          const winner = row.rank === 1;
          return <div key={row.id} style={{ display: "grid", gridTemplateColumns: "36px 46px minmax(0,1fr) repeat(3,minmax(60px,auto))", gap: 7, alignItems: "center", padding: 9, borderRadius: 15, background: winner ? `${GOLD}12` : "rgba(255,255,255,.035)", border: `1px solid ${winner ? GOLD : "rgba(255,255,255,.09)"}55` }}>
            <div style={{ color: winner ? GOLD : "#fff", fontSize: 18, fontWeight: 1100, textAlign: "center" }}>#{row.rank}</div>
            <ProfileAvatar profile={profile} size={42} />
            <div style={{ minWidth: 0 }}><div style={{ color: winner ? GOLD : "#fff", fontWeight: 1100, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{playerName(profile)}</div><div style={{ color: SOFT, fontSize: 9 }}>{row.bestHandLabel || "Aucune main"}</div></div>
            <div style={{ textAlign: "center" }}><b style={{ color: GREEN, fontSize: 18 }}>{row.wins}</b><small style={{ display: "block", color: SOFT, fontSize: 7 }}>MAINS</small></div>
            <div style={{ textAlign: "center" }}><b style={{ color: GOLD, fontSize: 14 }}>{pct(row.hits, row.darts)}</b><small style={{ display: "block", color: SOFT, fontSize: 7 }}>PRÉCISION</small></div>
            <div style={{ textAlign: "center" }}><b style={{ color: RED, fontSize: 14 }}>{stats.jokers || 0}</b><small style={{ display: "block", color: SOFT, fontSize: 7 }}>JOKERS</small></div>
          </div>;
        })}
      </div>

      <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 7 }}>
        <button onClick={onClose} style={button("#c9ced8")}>FERMER</button>
        <button onClick={onReplay} style={button(RED)}>REJOUER</button>
        <button onClick={onStats} style={button(GREEN)}>STATISTIQUES</button>
        <button onClick={onHistory} style={button(GOLD)}>HISTORIQUE</button>
      </div>
    </div>
  </div>;
}
