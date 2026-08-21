// @ts-nocheck
import React from "react";
import ProfileAvatar from "../components/ProfileAvatar";
import type { DartsPokerState } from "../lib/gameEngines/dartsPokerEngine";

const GOLD = "#f6c256";
const RED = "#e83a43";
const GREEN = "#5ce6a8";
const BLUE = "#55c7ff";
const SOFT = "#9aa1b2";

function playerName(profile: any) { return profile?.name || profile?.displayName || "Joueur"; }
function pct(a: number, b: number) { return b > 0 ? `${Math.round((a / b) * 1000) / 10}%` : "0%"; }
function button(color: string): React.CSSProperties { return { minHeight: 44, borderRadius: 14, border: `1px solid ${color}88`, background: `${color}18`, color, fontWeight: 1050, cursor: "pointer" }; }
function awardWinner(state: DartsPokerState, metric: (stats: any, standing: any) => number) {
  const ranked = (state.standings || []).map((standing) => ({ standing, stats: state.statsByPlayer[standing.id] || {} }))
    .sort((a, b) => metric(b.stats, b.standing) - metric(a.stats, a.standing));
  return ranked[0] || null;
}

export default function DartsPokerEnd({ state, profilesById, onClose, onReplay, onStats, onHistory }: { state: DartsPokerState; profilesById: Map<string, any>; onClose: () => void; onReplay: () => void; onStats: () => void; onHistory: () => void; }) {
  const standings = state.standings || [];
  const best = standings[0];
  const totalDarts = Object.values(state.statsByPlayer || {}).reduce((sum: number, stats: any) => sum + Number(stats?.darts || 0), 0);
  const totalContracts = Object.values(state.statsByPlayer || {}).reduce((sum: number, stats: any) => sum + Number(stats?.contractHits || 0), 0);
  const totalJokers = Object.values(state.statsByPlayer || {}).reduce((sum: number, stats: any) => sum + Number(stats?.jokers || 0), 0);
  const bestHandGlobal = standings.slice().sort((a, b) => Number(b?.bestHandScore || 0) - Number(a?.bestHandScore || 0))[0]?.bestHandLabel || "—";
  const winnerProfile = best ? profilesById.get(String(best.id)) || best : null;
  const awards = [
    { label: "SHARK DE LA TABLE", icon: "♠", color: GOLD, row: awardWinner(state, (_s, standing) => Number(standing?.points || 0)), value: (row: any) => `${row?.standing?.points || 0} pts` },
    { label: "TIREUR D'ÉLITE", icon: "◎", color: GREEN, row: awardWinner(state, (stats) => Number(stats?.darts || 0) ? Number(stats?.hits || 0) / Number(stats?.darts || 1) : 0), value: (row: any) => pct(row?.stats?.hits || 0, row?.stats?.darts || 0) },
    { label: "CHASSEUR DE CONTRATS", icon: "◆", color: RED, row: awardWinner(state, (stats) => Number(stats?.contractHits || 0)), value: (row: any) => `${row?.stats?.contractHits || 0} réussis` },
    { label: "LUCKY JOKER", icon: "★", color: BLUE, row: awardWinner(state, (stats) => Number(stats?.jokers || 0)), value: (row: any) => `${row?.stats?.jokers || 0} joker${Number(row?.stats?.jokers || 0) > 1 ? "s" : ""}` },
  ];

  return <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,.90)", backdropFilter: "blur(9px)", overflow: "auto", padding: 8 }}>
    <div style={{ width: "min(840px,100%)", margin: "10px auto", borderRadius: 24, padding: 14, background: "radial-gradient(circle at 50% 0%,rgba(232,58,67,.22),rgba(10,10,14,.98) 46%)", border: `1px solid ${GOLD}66`, boxShadow: "0 24px 70px rgba(0,0,0,.65)" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ color: GOLD, fontSize: 11, fontWeight: 1100, letterSpacing: 2 }}>SHOWDOWN FINAL</div>
        <div style={{ color: "#fff", fontSize: 26, fontWeight: 1200, marginTop: 3 }}>DARTS POKER</div>
        <div style={{ color: RED, fontSize: 13, fontWeight: 1000, marginTop: 4 }}>{state.winnerIds.length > 1 ? "ÉGALITÉ À LA TABLE" : `${best?.name || "Vainqueur"} remporte la partie`}</div>
        <div style={{ color: SOFT, fontSize: 9, marginTop: 4 }}>{state.config.contractsEnabled ? "Victoires + contrats bonus" : "Classement aux victoires"}</div>
      </div>

      {best ? <div style={{ marginTop: 12, padding: 11, borderRadius: 18, border: `1px solid ${GOLD}66`, background: `linear-gradient(135deg,${GOLD}14,${RED}10)`, display: "grid", gridTemplateColumns: "54px minmax(0,1fr) auto", gap: 10, alignItems: "center" }}><ProfileAvatar profile={winnerProfile} size={50} /><div style={{ minWidth: 0 }}><div style={{ color: GOLD, fontSize: 8, fontWeight: 1100, letterSpacing: .8 }}>TABLE CHAMPION</div><div style={{ color: "#fff", fontSize: 16, fontWeight: 1200, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{playerName(winnerProfile)}</div><div style={{ color: SOFT, fontSize: 8.5, marginTop: 2 }}>{best.bestHandLabel || "—"}</div></div><div style={{ textAlign: "right" }}><div style={{ color: GOLD, fontSize: 25, fontWeight: 1200, lineHeight: 1 }}>{best.points || 0}</div><div style={{ color: SOFT, fontSize: 7 }}>POINTS</div></div></div> : null}

      <div style={{ marginTop: 8, display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 6 }}>
        {[["MANCHES", state.rounds?.length || 0, GOLD],["FLÉCHETTES", totalDarts, BLUE],["CONTRATS", totalContracts, GREEN],["JOKERS", totalJokers, RED]].map(([label,value,color]: any) => <div key={label} style={{ padding: 7, borderRadius: 12, textAlign: "center", background: "rgba(255,255,255,.025)", border: "1px solid rgba(255,255,255,.08)" }}><div style={{ color, fontSize: 14, fontWeight: 1100 }}>{value}</div><div style={{ color: SOFT, fontSize: 6.8 }}>{label}</div></div>)}
      </div>
      <div style={{ marginTop: 6, textAlign: "center", color: SOFT, fontSize: 8 }}>Meilleure main de la table : <strong style={{ color: GOLD }}>{bestHandGlobal}</strong></div>

      <div style={{ marginTop: 11, display: "grid", gap: 7 }}>
        {standings.map((row) => {
          const stats = state.statsByPlayer[row.id] || ({} as any);
          const profile = profilesById.get(String(row.id)) || { id: row.id, name: row.name };
          const winner = row.rank === 1;
          return <div key={row.id} style={{ display: "grid", gridTemplateColumns: "34px 42px minmax(0,1fr) repeat(4,minmax(54px,auto))", gap: 6, alignItems: "center", padding: 9, borderRadius: 15, background: winner ? `${GOLD}12` : "rgba(255,255,255,.035)", border: `1px solid ${winner ? GOLD : "rgba(255,255,255,.09)"}55` }}>
            <div style={{ color: winner ? GOLD : "#fff", fontSize: 17, fontWeight: 1100, textAlign: "center" }}>#{row.rank}</div>
            <ProfileAvatar profile={profile} size={38} />
            <div style={{ minWidth: 0 }}><div style={{ color: winner ? GOLD : "#fff", fontWeight: 1100, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{playerName(profile)}</div><div style={{ color: SOFT, fontSize: 8.5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{row.bestHandLabel || "Aucune main"}</div></div>
            <div style={{ textAlign: "center" }}><b style={{ color: GOLD, fontSize: 18 }}>{row.points || 0}</b><small style={{ display: "block", color: SOFT, fontSize: 6.8 }}>POINTS</small></div>
            <div style={{ textAlign: "center" }}><b style={{ color: GREEN, fontSize: 15 }}>{row.wins}</b><small style={{ display: "block", color: SOFT, fontSize: 6.8 }}>VIC.</small></div>
            <div style={{ textAlign: "center" }}><b style={{ color: RED, fontSize: 15 }}>{stats.contractHits || 0}</b><small style={{ display: "block", color: SOFT, fontSize: 6.8 }}>CONTRATS</small></div>
            <div style={{ textAlign: "center" }}><b style={{ color: BLUE, fontSize: 13 }}>{pct(row.hits, row.darts)}</b><small style={{ display: "block", color: SOFT, fontSize: 6.8 }}>PRÉC.</small></div>
          </div>;
        })}
      </div>

      <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 7 }}>
        {awards.map((award) => {
          const row = award.row;
          const profile = row ? profilesById.get(String(row.standing.id)) || row.standing : null;
          return <div key={award.label} style={{ padding: 9, borderRadius: 14, background: `${award.color}0c`, border: `1px solid ${award.color}44`, display: "grid", gridTemplateColumns: "30px minmax(0,1fr) auto", gap: 7, alignItems: "center" }}>
            <div style={{ width: 28, height: 28, borderRadius: 9, display: "grid", placeItems: "center", color: award.color, border: `1px solid ${award.color}55` }}>{award.icon}</div>
            <div style={{ minWidth: 0 }}><div style={{ color: award.color, fontSize: 7.5, fontWeight: 1100 }}>{award.label}</div><div style={{ color: "#fff", fontSize: 9.5, fontWeight: 1000, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{profile ? playerName(profile) : "—"}</div></div>
            <div style={{ color: SOFT, fontSize: 8.5 }}>{award.value(row)}</div>
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
