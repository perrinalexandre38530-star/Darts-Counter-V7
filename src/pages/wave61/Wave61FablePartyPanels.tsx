// @ts-nocheck
import React from "react";
import { Meter, SOFT, panelStyle } from "../newModes/newModePlayShared";
import { getWave61Target } from "../../lib/gameEngines/wave61Engine";

function shell(accent: string): React.CSSProperties {
  return { ...panelStyle(`${accent}40`), padding: 9, display: "grid", gap: 8 };
}

export function MistigriPanel({ state, accent }: any) {
  const holderId=String(state.special?.mistigriHolderId||""); const threshold=Math.max(1,Number(state.config?.modeOptions?.dangerThreshold||3)); const active=state.players?.[state.activePlayerIndex];
  return <div style={shell(accent)}><div style={{display:"flex",justifyContent:"space-between",gap:10,alignItems:"center"}}><div style={{color:accent,fontSize:10,fontWeight:1100,letterSpacing:.7}}>🃏 MISTIGRI · CARTE MAUDITE EN DIRECT</div><div style={{color:"#ffb347",fontSize:9,fontWeight:1100}}>{state.players.find((p:any)=>String(p.id)===holderId)?.name||"—"} DÉTIENT LE MISTIGRI</div></div><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(155px,1fr))",gap:6}}>{state.players.map((p:any)=>{const holder=holderId===String(p.id);const danger=Number(state.special?.mistigriDangerByPlayer?.[p.id]||0);const pairs=Number(state.special?.mistigriPairsByPlayer?.[p.id]||0);const shield=Number(state.special?.mistigriShieldByPlayer?.[p.id]||0);const lives=Number(state.lives?.[p.id]||0);return <div key={p.id} style={{borderRadius:11,padding:8,border:`1px solid ${holder?"#ffb347":p.id===active?.id?accent+"77":"rgba(255,255,255,.08)"}`,background:holder?"rgba(255,160,60,.10)":"rgba(255,255,255,.025)",display:"grid",gap:5,boxShadow:holder?"0 0 18px rgba(255,160,60,.12)":"none",opacity:state.eliminated?.[p.id] ? .5 : 1}}><div style={{display:"flex",justifyContent:"space-between"}}><b>{holder?"🃏":"🎴"} {p.name}</b><span style={{color:holder?"#ffb347":accent,fontSize:8.5,fontWeight:1100}}>{holder?"À TRANSMETTRE":`${lives} VIE${lives>1?"S":""}`}</span></div><Meter value={danger} max={threshold} accent={danger>=threshold-1?"#ff726c":holder?"#ffb347":accent}/><div style={{display:"flex",justifyContent:"space-between",color:SOFT,fontSize:8}}><span>Paires {pairs}</span><span>Danger {danger}/{threshold}</span><span>🛡️ {shield}</span></div>{holder?<span style={{color:"#ffd0a0",fontSize:7.8}}>Touche la cible pour transmettre · BULL = protection.</span>:null}</div>})}</div></div>;
}

export function RadinPanel({ state, accent }: any) {
  const targetWallet=Math.max(1,Number(state.config?.modeOptions?.targetWallet||250)); const missFee=Number(state.config?.modeOptions?.missFee||12); const rebate=Number(state.config?.modeOptions?.bullRebate||25); const active=state.players?.[state.activePlayerIndex];
  return <div style={shell(accent)}><div style={{display:"flex",justifyContent:"space-between",gap:10,alignItems:"center"}}><div style={{color:accent,fontSize:10,fontWeight:1100,letterSpacing:.7}}>💰 RADIN · CAISSE & DÉPENSES</div><div style={{color:"#ffd166",fontSize:9,fontWeight:1100}}>OBJECTIF {targetWallet}</div></div><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(165px,1fr))",gap:6}}>{state.players.map((p:any)=>{const wallet=Math.round(Number(state.special?.radinWalletByPlayer?.[p.id]??state.scores?.[p.id]??0));const spent=Math.round(Number(state.special?.radinSpentByPlayer?.[p.id]||0));const earned=Math.round(Number(state.special?.radinEarnedByPlayer?.[p.id]||0));const net=earned-spent;return <div key={p.id} style={{borderRadius:11,padding:8,border:`1px solid ${p.id===active?.id?accent+"77":"rgba(255,255,255,.08)"}`,background:p.id===active?.id?accent+"0b":"rgba(255,255,255,.025)",display:"grid",gap:5}}><div style={{display:"flex",justifyContent:"space-between"}}><b>🐷 {p.name}</b><span style={{color:"#ffd166",fontSize:11,fontWeight:1100}}>{wallet}</span></div><Meter value={wallet} max={targetWallet} accent={accent}/><div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:4,textAlign:"center"}}><span style={{fontSize:8,color:"#78e6a3"}}>+{earned}</span><span style={{fontSize:8,color:"#ff8a85"}}>-{spent}</span><span style={{fontSize:8,color:net>=0?"#78e6a3":"#ff8a85"}}>{net>=0?"+":""}{net}</span></div></div>})}</div><div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:5,color:SOFT,fontSize:8.3,textAlign:"center"}}><span style={{borderRadius:8,padding:6,border:"1px solid rgba(255,255,255,.07)"}}>MISS coûte {missFee}</span><span style={{borderRadius:8,padding:6,border:"1px solid rgba(255,255,255,.07)"}}>BULL +{rebate}</span><span style={{borderRadius:8,padding:6,border:"1px solid rgba(255,255,255,.07)"}}>DBULL +{rebate*2}</span></div></div>;
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
