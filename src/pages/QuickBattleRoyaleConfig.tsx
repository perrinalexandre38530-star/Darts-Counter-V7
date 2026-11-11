// @ts-nocheck
import React from "react";
import DartsQuickHeader, { DartsQuickIntro } from "../components/DartsQuickHeader";

/** Quick players are session-scoped: never resolve these IDs against saved profiles. */
export default function QuickBattleRoyaleConfig({ go, onBack }: { go: (route: string, params?: any) => void; onBack: () => void }) {
  const [count, setCount] = React.useState(2);
  const [names, setNames] = React.useState(Array.from({ length: 12 }, (_, i) => `J${i + 1}`));
  const [lives, setLives] = React.useState(3);
  const [rule, setRule] = React.useState("life_system");
  const card: React.CSSProperties = { borderRadius: 18, border: "1px solid rgba(85,230,255,.22)", padding: 14, display: "grid", gap: 12, background: "rgba(10,12,24,.94)" };
  const chip = (active: boolean): React.CSSProperties => ({ borderRadius: 12, padding: "10px 14px", border: `1px solid ${active ? "#55e6ff" : "#ffffff30"}`, background: active ? "#55e6ff25" : "#161a27", color: active ? "#8df3ff" : "#fff", fontWeight: 900, cursor: "pointer" });
  function start() {
    const session = `battle-quick-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const players = names.slice(0, count).map((n, i) => ({ id: `${session}-p${i + 1}`, temporaryPlayerId: `${session}-p${i + 1}`, profileId: null, isTemporary: true, isBot: false, name: n.trim() || `J${i + 1}`, avatarDataUrl: null }));
    const meta = { quickParty: true, partyMode: "quick", temporaryParticipants: true, profileStatsDeferred: true };
    go("battle_royale_play", { ...meta, matchId: session, config: { ...meta, players, lives, dartsPerTurn: 3, eliminationRule: rule, missLimit: 6, sfxEnabled: false, voiceEnabled: false } });
  }
  return <div className="screen x01-config-v3-screen msc-mode-config" style={{ minHeight: "100dvh", padding: "12px 12px 110px", background: "#060711", color: "#fff" }}>
    <DartsQuickHeader modeId="battle_royale" title="BATTLE ROYALE" onBack={onBack} />
    <main style={{ maxWidth: 760, margin: "auto", display: "grid", gap: 14 }}>
      <DartsQuickIntro title="BATTLE ROYALE" />
      <section style={card}><strong style={{ color: "#55e6ff" }}>JOUEURS</strong>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>{[2, 3, 4, 6, 8, 12].map(n => <button type="button" key={n} style={chip(count === n)} onClick={() => setCount(n)}>{n === 2 ? "DUEL" : `${n} JOUEURS`}</button>)}</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 9 }}>{names.slice(0, count).map((name, i) => <label key={i} style={{ display: "grid", gap: 6, fontWeight: 800, fontSize: 12, color: "#b7c2d2" }}>JOUEUR {i + 1}<input maxLength={32} aria-label={`Nom du joueur ${i + 1}`} value={name} onFocus={e => e.currentTarget.select()} onChange={e => setNames(prev => prev.map((v, j) => j === i ? e.target.value : v))} style={{ padding: 12, borderRadius: 12, border: "1px solid #ffffff33", background: "#181b29", color: "#fff", fontSize: 16 }} /></label>)}</div>
      </section>
      <section style={card}><strong style={{ color: "#55e6ff" }}>RÈGLES · BATTLE ROYALE</strong><div>VIES</div><div style={{ display: "flex", gap: 8 }}>{[3, 5, 7].map(n => <button type="button" key={n} style={chip(lives === n)} onClick={() => setLives(n)}>{n}</button>)}</div>
        <div>ÉLIMINATION</div><div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>{[["life_system", "PAR VIES"], ["miss_x", "PAR MISS"], ["zero_points", "SCORE ZÉRO"]].map(([v, text]) => <button type="button" key={v} style={chip(rule === v)} onClick={() => setRule(v)}>{text}</button>)}</div>
      </section>
      <button type="button" onClick={start} style={{ minHeight: 58, borderRadius: 15, border: "1px solid #60eec7", background: "#135e4a", color: "#c8fff0", fontSize: 20, fontWeight: 1000 }}>JOUER</button>
    </main>
  </div>;
}
