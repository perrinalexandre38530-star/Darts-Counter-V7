// @ts-nocheck
import React from "react";
import ProfileAvatar from "../components/ProfileAvatar";
import { cargoVariantLabel, type CargoState } from "../lib/gameEngines/cargoEngine";

const ORANGE = "#ff9b42";
const GOLD = "#f6c256";
const GREEN = "#62e6a7";
const BLUE = "#56c9ff";
const RED = "#ef5261";
const SOFT = "#aab1bf";
function playerName(profile: any) { return profile?.name || profile?.displayName || "Joueur"; }
function pct(a: number, b: number) { return b > 0 ? `${Math.round((a / b) * 1000) / 10}%` : "0%"; }
function button(color: string): React.CSSProperties { return { minHeight: 44, borderRadius: 14, border: `1px solid ${color}88`, background: `${color}18`, color, fontWeight: 1050, cursor: "pointer" }; }

export default function CargoEnd({ state, profilesById, onClose, onReplay, onStats, onHistory }: { state: CargoState; profilesById: Map<string, any>; onClose: () => void; onReplay: () => void; onStats: () => void; onHistory: () => void; }) {
  const parcel = state.config.variant === "parcel_delivery";
  const standings = state.standings || [];
  const best = standings[0];
  return <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,.91)", backdropFilter: "blur(9px)", overflow: "auto", padding: 8 }}>
    <div style={{ width: "min(880px,100%)", margin: "10px auto", borderRadius: 24, padding: 14, background: "radial-gradient(circle at 50% 0%,rgba(255,155,66,.24),rgba(10,11,14,.98) 48%)", border: `1px solid ${ORANGE}77`, boxShadow: "0 24px 70px rgba(0,0,0,.65)" }}>
      <div style={{ textAlign: "center" }}><div style={{ color: GOLD, fontSize: 11, fontWeight: 1100, letterSpacing: 2 }}>MISSION TERMINÉE</div><div style={{ color: "#fff", fontSize: 28, fontWeight: 1200, marginTop: 3 }}>CARGO</div><div style={{ color: ORANGE, fontSize: 11, fontWeight: 1000 }}>{cargoVariantLabel(state.config.variant)}</div><div style={{ color: GREEN, fontSize: 14, fontWeight: 1000, marginTop: 5 }}>{state.winnerIds.length > 1 ? "ÉGALITÉ AU QUAI" : `${best?.name || "Vainqueur"} remporte la mission`}</div></div>
      <div style={{ marginTop: 13, display: "grid", gap: 7 }}>
        {standings.map((row) => { const stats = state.statsByPlayer[row.id] || ({} as any); const profile = profilesById.get(String(row.id)) || row; const winner = row.rank === 1; return <div key={row.id} style={{ display: "grid", gridTemplateColumns: "36px 46px minmax(0,1fr) repeat(3,minmax(62px,auto))", gap: 7, alignItems: "center", padding: 9, borderRadius: 15, background: winner ? `${ORANGE}12` : "rgba(255,255,255,.035)", border: `1px solid ${winner ? ORANGE : "rgba(255,255,255,.09)"}66` }}>
          <div style={{ color: winner ? GOLD : "#fff", fontSize: 18, fontWeight: 1100, textAlign: "center" }}>#{row.rank}</div><ProfileAvatar profile={profile} size={42} />
          <div style={{ minWidth: 0 }}><div style={{ color: winner ? ORANGE : "#fff", fontWeight: 1100, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{playerName(profile)}</div><div style={{ color: SOFT, fontSize: 9 }}>{stats.completedContracts || 0} contrats · série {stats.longestSeries || 0}</div></div>
          <div style={{ textAlign: "center" }}><b style={{ color: parcel ? BLUE : ORANGE, fontSize: 18 }}>{parcel ? row.parcelsDelivered : row.totalWeight}</b><small style={{ display: "block", color: SOFT, fontSize: 7 }}>{parcel ? "COLIS" : "KG"}</small></div>
          <div style={{ textAlign: "center" }}><b style={{ color: GOLD, fontSize: 14 }}>{stats.pallets || 0}</b><small style={{ display: "block", color: SOFT, fontSize: 7 }}>PALETTES</small></div>
          <div style={{ textAlign: "center" }}><b style={{ color: stats.overloads ? RED : GREEN, fontSize: 14 }}>{pct(stats.hits, stats.darts)}</b><small style={{ display: "block", color: SOFT, fontSize: 7 }}>PRÉCISION</small></div>
        </div>; })}
      </div>
      <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 7 }}><button onClick={onClose} style={button("#c9ced8")}>FERMER</button><button onClick={onReplay} style={button(RED)}>REJOUER</button><button onClick={onStats} style={button(GREEN)}>STATISTIQUES</button><button onClick={onHistory} style={button(GOLD)}>HISTORIQUE</button></div>
    </div>
  </div>;
}
