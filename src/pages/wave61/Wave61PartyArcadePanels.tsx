// @ts-nocheck
import React from "react";
import { Meter, SOFT, panelStyle } from "../newModes/newModePlayShared";
import { wave61FinalBuzzerChallenge, wave61MafiaPhase } from "../../lib/gameEngines/wave61Engine";

function shell(accent: string): React.CSSProperties {
  return { ...panelStyle(`${accent}40`), padding: 9, display: "grid", gap: 8 };
}

const SYMBOL_ICON: Record<string, string> = {
  CHERRY: "🍒",
  LEMON: "🍋",
  BELL: "🔔",
  BAR: "BAR",
  SEVEN: "7️⃣",
  DIAMOND: "💎",
  WILD: "⭐",
  BLANK: "—",
};

export function FinalBuzzerPanel({ state, accent }: any) {
  const challenge = wave61FinalBuzzerChallenge(state);
  const cutoffs = state.special?.finalBuzzerCutoffs || [];
  const raw = Number(cutoffs[Math.max(0, Number(state.turnIndex || 0)) % Math.max(1, cutoffs.length)] || 2);
  const cutoff = ((raw - 1) % 3) + 1;
  return <div style={shell(accent)}>
    <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
      <div style={{ color: accent, fontSize: 10, fontWeight: 1100, letterSpacing: .7 }}>⏱️ FINAL BUZZER · {challenge?.name || "DÉFI"}</div>
      <div style={{ color: "#ff7188", fontSize: 9.5, fontWeight: 1100 }}>BUZZER APRÈS DART {cutoff}</div>
    </div>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 6 }}>
      {[1,2,3].map((n) => <div key={n} style={{ minHeight: 48, borderRadius: 11, display: "grid", placeItems: "center", border: `1px solid ${n <= cutoff ? accent + "66" : "rgba(255,255,255,.07)"}`, background: n <= cutoff ? accent + "11" : "rgba(255,255,255,.018)", color: n <= cutoff ? accent : "#5f6675", fontWeight: 1100, fontSize: 10 }}>{n <= cutoff ? `DART ${n}` : "APRÈS BUZZER"}</div>)}
    </div>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 6 }}>
      {state.players.map((p: any) => {
        const score = Math.round(Number(state.progress?.[p.id] || 0));
        const streak = Number(state.special?.finalBuzzerStreakByPlayer?.[p.id] || 0);
        const clutch = Number(state.special?.finalBuzzerClutchByPlayer?.[p.id] || 0);
        return <div key={p.id} style={{ borderRadius: 10, padding: 7, border: "1px solid rgba(255,255,255,.08)", background: "rgba(255,255,255,.025)", display: "grid", gap: 4 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}><b style={{ fontSize: 9.5 }}>{p.name}</b><span style={{ color: accent, fontSize: 9.5, fontWeight: 1100 }}>{score}</span></div>
          <div style={{ color: SOFT, fontSize: 8 }}>Série {streak} · Clutch {clutch}</div>
          <Meter value={score} max={Math.max(1, Number(state.config?.goal || 80))} accent={accent} />
        </div>;
      })}
    </div>
  </div>;
}

export function JackpotPanel({ state, accent }: any) {
  const pot = Math.round(Number(state.special?.jackpotPot || 250));
  return <div style={shell(accent)}>
    <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
      <div style={{ color: accent, fontSize: 10, fontWeight: 1100, letterSpacing: .7 }}>🎰 JACKPOT · MACHINE À SOUS DARTS</div>
      <div style={{ color: "#ffd166", fontSize: 10, fontWeight: 1100 }}>POT {pot}</div>
    </div>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 7 }}>
      {state.players.map((p: any) => {
        const spin = Array.isArray(state.special?.jackpotLastSpinByPlayer?.[p.id]) ? state.special.jackpotLastSpinByPlayer[p.id] : [];
        const credits = Math.round(Number(state.scores?.[p.id] || 0));
        const jackpots = Number(state.special?.jackpotJackpotsByPlayer?.[p.id] || 0);
        return <div key={p.id} style={{ borderRadius: 12, padding: 8, border: `1px solid ${accent}32`, background: "rgba(255,255,255,.025)", display: "grid", gap: 6 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}><b style={{ fontSize: 9.5 }}>{p.name}</b><span style={{ color: accent, fontWeight: 1100, fontSize: 9.5 }}>{credits} crédits</span></div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 5 }}>
            {[0,1,2].map((i) => { const sym = spin[i] || "BLANK"; return <div key={i} style={{ minHeight: 50, borderRadius: 10, border: "1px solid rgba(255,255,255,.10)", background: "linear-gradient(180deg,rgba(255,255,255,.07),rgba(255,255,255,.02))", display: "grid", placeItems: "center", color: sym === "SEVEN" ? "#ffd166" : "#fff", fontSize: sym === "BAR" ? 11 : 19, fontWeight: 1100 }}>{SYMBOL_ICON[sym] || sym}</div>; })}
          </div>
          <div style={{ color: SOFT, fontSize: 8.1 }}>Jackpots 777 : {jackpots}</div>
        </div>;
      })}
    </div>
  </div>;
}

export function MafiaPanel({ state, accent }: any) {
  const phase = wave61MafiaPhase(state);
  const finished = state.phase === "finished";
  const roles = state.special?.mafiaRoleByPlayer || {};
  const intel = state.special?.mafiaIntel || [];
  const alive = state.players.filter((p: any) => !state.eliminated?.[p.id]);
  const mafiaAlive = alive.filter((p: any) => roles[p.id] === "MAFIA").length;
  return <div style={shell(accent)}>
    <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
      <div style={{ color: accent, fontSize: 10, fontWeight: 1100, letterSpacing: .7 }}>{phase === "NIGHT" ? "🌙 MAFIA · NUIT" : "☀️ MAFIA · JOUR / VOTE"}</div>
      <div style={{ color: finished ? "#ffd166" : SOFT, fontSize: 9, fontWeight: 1000 }}>{finished ? `VICTOIRE ${state.special?.mafiaWinningFaction || "—"}` : `${alive.length} en jeu · rôles cachés`}</div>
    </div>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(155px,1fr))", gap: 6 }}>
      {state.players.map((p: any) => {
        const eliminated = !!state.eliminated?.[p.id];
        const votes = Number(state.special?.mafiaVotesByPlayer?.[p.id] || 0);
        const damage = Number(state.special?.mafiaDamageByPlayer?.[p.id] || 0);
        const shield = Number(state.special?.mafiaShieldByPlayer?.[p.id] || 0);
        const role = finished || eliminated ? String(roles[p.id] || "?") : "SECRET";
        const known = intel.find((x: any) => String(x.playerId) === String(p.id));
        return <div key={p.id} style={{ borderRadius: 11, padding: 7, border: `1px solid ${eliminated ? "rgba(255,92,92,.28)" : accent + "2f"}`, background: eliminated ? "rgba(255,70,70,.045)" : "rgba(255,255,255,.025)", display: "grid", gap: 4, opacity: eliminated ? .62 : 1 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 7 }}><b style={{ fontSize: 9.5 }}>{p.name}</b><span style={{ color: eliminated ? "#ff7188" : accent, fontSize: 8.3, fontWeight: 1000 }}>{eliminated ? "OUT" : role}</span></div>
          <div style={{ color: SOFT, fontSize: 8 }}>Votes {votes} · Blessure {damage}% {shield ? "· 🛡️" : ""}</div>
          {known && !finished ? <div style={{ color: known.alignment === "MAFIA" ? "#ff7188" : "#7fe7b5", fontSize: 7.8, fontWeight: 1000 }}>ENQUÊTE : {known.alignment}</div> : null}
          {phase === "DAY" && !finished ? <Meter value={votes} max={Math.max(1, ...state.players.map((x: any) => Number(state.special?.mafiaVotesByPlayer?.[x.id] || 0)))} accent={votes ? "#ffd166" : accent} /> : <Meter value={100 - damage} max={100} accent={damage >= 70 ? "#ff7188" : accent} />}
        </div>;
      })}
    </div>
    {!finished ? <div style={{ color: SOFT, fontSize: 8.7, lineHeight: 1.45 }}>{phase === "NIGHT" ? "Les rôles agissent secrètement sur le secteur de nuit. Mafia attaque, Détective enquête, Médecin protège." : "Chaque impact vote contre un suspect. S/D/T valent 1/2/3 voix ; le plus voté est éliminé à la fin du jour."}</div> : <div style={{ color: SOFT, fontSize: 8.7 }}>Mafia encore debout : {mafiaAlive}. Les rôles sont révélés.</div>}
  </div>;
}
