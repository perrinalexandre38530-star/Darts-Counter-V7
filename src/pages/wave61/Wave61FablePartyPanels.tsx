// @ts-nocheck
import React from "react";
import { Meter, SOFT, panelStyle } from "../newModes/newModePlayShared";
import { getWave61Target } from "../../lib/gameEngines/wave61Engine";

function shell(accent: string): React.CSSProperties {
  return { ...panelStyle(`${accent}40`), padding: 9, display: "grid", gap: 8 };
}

export function MistigriPanel({ state, accent }: any) {
  const holderId = String(state.special?.mistigriHolderId || "");
  const threshold = Math.max(1, Number(state.config?.modeOptions?.dangerThreshold || 3));
  return <div style={shell(accent)}>
    <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
      <div style={{ color: accent, fontSize: 10, fontWeight: 1100, letterSpacing: .7 }}>🃏 MISTIGRI · ÉVITE LA MAUVAISE CARTE</div>
      <div style={{ color: SOFT, fontSize: 9, fontWeight: 900 }}>Le détenteur doit transmettre avant la pénalité</div>
    </div>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(155px,1fr))", gap: 6 }}>
      {state.players.map((p: any) => {
        const holder = holderId === String(p.id);
        const danger = Number(state.special?.mistigriDangerByPlayer?.[p.id] || 0);
        const pairs = Number(state.special?.mistigriPairsByPlayer?.[p.id] || 0);
        const shield = Number(state.special?.mistigriShieldByPlayer?.[p.id] || 0);
        const lives = Number(state.lives?.[p.id] || 0);
        return <div key={p.id} style={{ borderRadius: 11, padding: 8, border: `1px solid ${holder ? "#ffb34788" : accent + "2f"}`, background: holder ? "rgba(255,160,60,.08)" : "rgba(255,255,255,.025)", display: "grid", gap: 5, opacity: state.eliminated?.[p.id] ? .55 : 1 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}><b style={{ fontSize: 9.5 }}>{p.name}</b><span style={{ color: holder ? "#ffb347" : accent, fontSize: 8.5, fontWeight: 1100 }}>{holder ? "MISTIGRI" : `${lives} VIE${lives > 1 ? "S" : ""}`}</span></div>
          <Meter value={danger} max={threshold} accent={holder ? "#ff8a65" : accent} />
          <div style={{ color: SOFT, fontSize: 8 }}>Paires {pairs} · Danger {danger}/{threshold} · Bouclier {shield}</div>
        </div>;
      })}
    </div>
  </div>;
}

export function RadinPanel({ state, accent }: any) {
  const targetWallet = Math.max(1, Number(state.config?.modeOptions?.targetWallet || 250));
  return <div style={shell(accent)}>
    <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
      <div style={{ color: accent, fontSize: 10, fontWeight: 1100, letterSpacing: .7 }}>💰 RADIN · FAIS FRUCTIFIER LA CAISSE</div>
      <div style={{ color: "#ffd166", fontSize: 9, fontWeight: 1100 }}>OBJECTIF {targetWallet}</div>
    </div>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(165px,1fr))", gap: 6 }}>
      {state.players.map((p: any) => {
        const wallet = Math.round(Number(state.special?.radinWalletByPlayer?.[p.id] ?? state.scores?.[p.id] ?? 0));
        const spent = Math.round(Number(state.special?.radinSpentByPlayer?.[p.id] || 0));
        const earned = Math.round(Number(state.special?.radinEarnedByPlayer?.[p.id] || 0));
        return <div key={p.id} style={{ borderRadius: 11, padding: 8, border: `1px solid ${accent}32`, background: "rgba(255,255,255,.025)", display: "grid", gap: 5 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}><b style={{ fontSize: 9.5 }}>{p.name}</b><span style={{ color: "#ffd166", fontSize: 9.5, fontWeight: 1100 }}>{wallet}</span></div>
          <Meter value={wallet} max={targetWallet} accent={accent} />
          <div style={{ color: SOFT, fontSize: 8 }}>Gagné {earned} · Dépensé {spent} · Solde net {earned - spent >= 0 ? "+" : ""}{earned - spent}</div>
        </div>;
      })}
    </div>
  </div>;
}

export function CorbeauRenardPanel({ state, accent }: any) {
  const goal = Math.max(1, Number(state.config?.modeOptions?.cheeseGoal || 6));
  const threshold = Math.max(1, Number(state.config?.modeOptions?.fableThreshold || 5));
  return <div style={shell(accent)}>
    <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
      <div style={{ color: accent, fontSize: 10, fontWeight: 1100, letterSpacing: .7 }}>🐦🧀🦊 CORBEAU & RENARD</div>
      <div style={{ color: SOFT, fontSize: 9, fontWeight: 900 }}>Premier à {goal} fromages</div>
    </div>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(165px,1fr))", gap: 6 }}>
      {state.players.map((p: any) => {
        const role = String(state.special?.fableRoleByPlayer?.[p.id] || "CORBEAU");
        const cheese = Number(state.special?.fableCheeseByPlayer?.[p.id] || 0);
        const meter = Number(state.special?.fableMeterByPlayer?.[p.id] || 0);
        const guard = Number(state.special?.fableGuardByPlayer?.[p.id] || 0);
        return <div key={p.id} style={{ borderRadius: 11, padding: 8, border: `1px solid ${role === "RENARD" ? "#ff9a4d55" : accent + "32"}`, background: role === "RENARD" ? "rgba(255,130,50,.04)" : "rgba(255,255,255,.025)", display: "grid", gap: 5 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}><b style={{ fontSize: 9.5 }}>{p.name}</b><span style={{ color: role === "RENARD" ? "#ffb366" : accent, fontSize: 8.5, fontWeight: 1100 }}>{role === "RENARD" ? "🦊 RENARD" : "🐦 CORBEAU"}</span></div>
          <Meter value={cheese} max={goal} accent={role === "RENARD" ? "#ff9a4d" : accent} />
          <div style={{ color: SOFT, fontSize: 8 }}>Fromages {cheese}/{goal} · Ruse {meter}/{threshold} · Garde {guard}</div>
        </div>;
      })}
    </div>
  </div>;
}

export function DartsImpossiblePanel({ state, accent }: any) {
  const target = getWave61Target(state);
  const count = Math.max(1, Number(state.config?.modeOptions?.missionCount || state.special?.impossibleContracts?.length || 10));
  const threshold = Math.max(1, Number(state.config?.modeOptions?.alarmThreshold || 100));
  return <div style={shell(accent)}>
    <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
      <div style={{ color: accent, fontSize: 10, fontWeight: 1100, letterSpacing: .7 }}>🕶️ DARTS IMPOSSIBLE · INFILTRATION</div>
      <div style={{ color: "#ff667a", fontSize: 9, fontWeight: 1100 }}>{target?.label || "MISSION TERMINÉE"}</div>
    </div>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(165px,1fr))", gap: 6 }}>
      {state.players.map((p: any) => {
        const step = Number(state.special?.impossibleStepByPlayer?.[p.id] || 0);
        const alarm = Math.round(Number(state.special?.impossibleAlarmByPlayer?.[p.id] || 0));
        const fails = Number(state.special?.impossibleFailsByPlayer?.[p.id] || 0);
        return <div key={p.id} style={{ borderRadius: 11, padding: 8, border: `1px solid ${alarm >= threshold * .75 ? "#ff667a66" : accent + "32"}`, background: alarm >= threshold * .75 ? "rgba(255,70,90,.05)" : "rgba(255,255,255,.025)", display: "grid", gap: 5 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}><b style={{ fontSize: 9.5 }}>{p.name}</b><span style={{ color: accent, fontSize: 9, fontWeight: 1100 }}>{step}/{count}</span></div>
          <Meter value={step} max={count} accent={accent} />
          <Meter value={alarm} max={threshold} accent={alarm >= threshold * .75 ? "#ff667a" : "#ffd166"} />
          <div style={{ color: SOFT, fontSize: 8 }}>Alarme {alarm}/{threshold}% · Compromissions {fails}</div>
        </div>;
      })}
    </div>
  </div>;
}
