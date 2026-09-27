// @ts-nocheck
import React from "react";
import { Meter, SOFT, panelStyle } from "../newModes/newModePlayShared";

const MONT_BLANC_STAGES = [
  { name: "DÉPART", altitude: 0 },
  { name: "REFUGE", altitude: 1400 },
  { name: "GLACIER", altitude: 2600 },
  { name: "ARÊTE", altitude: 3800 },
  { name: "SOMMET", altitude: 4809 },
];
const EVEREST_STAGES = [
  { name: "BASE CAMP", altitude: 0 },
  { name: "CAMP I", altitude: 5900 },
  { name: "CAMP II", altitude: 6500 },
  { name: "CAMP III", altitude: 7300 },
  { name: "CAMP IV", altitude: 7950 },
  { name: "BALCONY", altitude: 8400 },
  { name: "SOMMET", altitude: 8849 },
];
const SUMMIT_14_PEAKS = [
  "SHISHAPANGMA", "GASHERBRUM II", "BROAD PEAK", "GASHERBRUM I",
  "ANNAPURNA I", "NANGA PARBAT", "MANASLU", "DHAULAGIRI I",
  "CHO OYU", "MAKALU", "LHOTSE", "KANGCHENJUNGA", "K2", "EVEREST",
];

function box(accent: string): React.CSSProperties {
  return { ...panelStyle(`${accent}42`), padding: 9, display: "grid", gap: 8 };
}

function weatherLabel(state: any) {
  const cycle = state.special?.ascentWeatherCycle || [];
  const raw = Number(cycle[(Number(state.turnIndex || 0) + Number(state.roundIndex || 0)) % Math.max(1, cycle.length)] || 10);
  if (raw >= 18) return { label: "TEMPÊTE", icon: "🌨️", color: "#ff7188" };
  if (raw >= 14) return { label: "VENT FORT", icon: "💨", color: "#ffd166" };
  if (raw >= 9) return { label: "NUAGEUX", icon: "☁️", color: "#9fc8ff" };
  return { label: "FENÊTRE CLAIRE", icon: "☀️", color: "#7fe7b5" };
}

function MountainPanel({ state, accent, modeId }: any) {
  const stages = modeId === "everest" ? EVEREST_STAGES : MONT_BLANC_STAGES;
  const summit = modeId === "everest" ? 8849 : 4809;
  const weather = weatherLabel(state);
  return <div style={box(accent)}>
    <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
      <div style={{ color: accent, fontSize: 10, fontWeight: 1100, letterSpacing: .7 }}>{modeId === "everest" ? "🏔️ EVEREST · EXPÉDITION HAUTE ALTITUDE" : "⛰️ MONT BLANC · ASCENSION ALPINE"}</div>
      <div style={{ color: weather.color, fontSize: 9, fontWeight: 1000 }}>{weather.icon} {weather.label}</div>
    </div>
    <div style={{ display: "grid", gridTemplateColumns: `repeat(${stages.length},minmax(70px,1fr))`, gap: 5 }}>
      {stages.map((stage, i) => <div key={stage.name} style={{ borderRadius: 10, padding: 6, textAlign: "center", border: "1px solid rgba(255,255,255,.08)", background: "rgba(255,255,255,.025)" }}>
        <b style={{ fontSize: 8 }}>{stage.name}</b><div style={{ color: SOFT, fontSize: 7.4, marginTop: 2 }}>{stage.altitude} m</div>
      </div>)}
    </div>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 7 }}>
      {state.players.map((p: any) => {
        const altitude = Math.round(Number(state.special?.ascentAltitudeByPlayer?.[p.id] || 0));
        const fatigue = Math.round(Number(state.special?.ascentFatigueByPlayer?.[p.id] || 0));
        const oxygen = Math.round(Number(state.special?.ascentOxygenByPlayer?.[p.id] || 0));
        const acclimation = Math.round(Number(state.special?.ascentAcclimationByPlayer?.[p.id] || 0));
        const stage = Number(state.special?.ascentStageByPlayer?.[p.id] || 0);
        return <div key={p.id} style={{ borderRadius: 11, padding: 8, border: `1px solid ${accent}32`, background: "rgba(255,255,255,.025)", display: "grid", gap: 5 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}><b style={{ fontSize: 9.5 }}>{p.name}</b><span style={{ color: accent, fontSize: 9.5, fontWeight: 1000 }}>{altitude} m</span></div>
          <div style={{ color: SOFT, fontSize: 8.1 }}>{stages[Math.min(stage, stages.length - 1)]?.name || "DÉPART"} · {Math.round((altitude / summit) * 100)}%</div>
          <Meter value={altitude} max={summit} accent={accent} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 5 }}>
            <div><span style={{ color: SOFT, fontSize: 7.5 }}>FATIGUE {fatigue}%</span><Meter value={fatigue} max={100} accent={fatigue >= 75 ? "#ff7188" : "#ffd166"} /></div>
            <div><span style={{ color: SOFT, fontSize: 7.5 }}>{modeId === "everest" ? "OXYGÈNE" : "ÉNERGIE"} {oxygen}%</span><Meter value={oxygen} max={100} accent={oxygen <= 30 ? "#ff7188" : "#70d6ff"} /></div>
          </div>
          {modeId === "everest" ? <div><span style={{ color: SOFT, fontSize: 7.5 }}>ACCLIMATATION {acclimation}%</span><Meter value={acclimation} max={100} accent="#7fe7b5" /></div> : null}
        </div>;
      })}
    </div>
  </div>;
}

export function MontBlancPanel(props: any) { return <MountainPanel {...props} modeId="mont_blanc" />; }
export function EverestPanel(props: any) { return <MountainPanel {...props} modeId="everest" />; }

export function Summit14Panel({ state, accent }: any) {
  const weather = weatherLabel(state);
  return <div style={box(accent)}>
    <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
      <div style={{ color: accent, fontSize: 10, fontWeight: 1100, letterSpacing: .7 }}>🏔️ SUMMIT 14 · LES 14 × 8 000</div>
      <div style={{ color: weather.color, fontSize: 9, fontWeight: 1000 }}>{weather.icon} {weather.label}</div>
    </div>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(92px,1fr))", gap: 4 }}>
      {SUMMIT_14_PEAKS.map((name, i) => {
        const best = Math.max(0, ...state.players.map((p: any) => Number(state.special?.summit14PeakByPlayer?.[p.id] || 0)));
        const completed = i < best;
        return <div key={name} style={{ borderRadius: 9, padding: "5px 4px", border: `1px solid ${completed ? accent + "75" : "rgba(255,255,255,.08)"}`, background: completed ? accent + "12" : "rgba(255,255,255,.02)", color: completed ? accent : SOFT, fontSize: 7.2, fontWeight: 900, textAlign: "center" }}>{i + 1}. {name}</div>;
      })}
    </div>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 7 }}>
      {state.players.map((p: any) => {
        const peak = Number(state.special?.summit14PeakByPlayer?.[p.id] || 0);
        const marks = Number(state.special?.summit14MarksByPlayer?.[p.id] || 0);
        const fatigue = Math.round(Number(state.special?.ascentFatigueByPlayer?.[p.id] || 0));
        const oxygen = Math.round(Number(state.special?.ascentOxygenByPlayer?.[p.id] || 0));
        const threshold = state.config?.difficulty === "hard" ? 7 : state.config?.difficulty === "easy" ? 4 : 5;
        return <div key={p.id} style={{ borderRadius: 11, padding: 8, border: `1px solid ${accent}32`, background: "rgba(255,255,255,.025)", display: "grid", gap: 5 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}><b style={{ fontSize: 9.5 }}>{p.name}</b><span style={{ color: accent, fontWeight: 1000, fontSize: 9.5 }}>{peak}/14</span></div>
          <div style={{ color: SOFT, fontSize: 8.2 }}>{peak >= 14 ? "GRAND CHELEM TERMINÉ" : `Prochain : ${SUMMIT_14_PEAKS[Math.min(peak, 13)]}`}</div>
          <Meter value={peak} max={14} accent={accent} />
          <span style={{ color: SOFT, fontSize: 7.7 }}>Progression sommet {marks}/{threshold}</span><Meter value={marks} max={threshold} accent="#c8f2ff" />
          <div style={{ color: SOFT, fontSize: 7.7 }}>Fatigue {fatigue}% · Oxygène {oxygen}%</div>
        </div>;
      })}
    </div>
  </div>;
}
