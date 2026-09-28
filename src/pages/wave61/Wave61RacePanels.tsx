// @ts-nocheck
import React from "react";
import { SOFT, panelStyle } from "../newModes/newModePlayShared";
import { wave61SoleilPhase } from "../../lib/gameEngines/wave61Engine";

function pct(value: number, max: number) { return Math.max(0, Math.min(100, (Number(value || 0) / Math.max(1, Number(max || 1))) * 100)); }
function Bar({ value, max, accent, danger = false }: any) {
  return <div style={{ height: 7, borderRadius: 999, overflow: "hidden", background: "rgba(255,255,255,.07)", border: "1px solid rgba(255,255,255,.08)" }}><div style={{ width: `${pct(value,max)}%`, height: "100%", background: danger ? "linear-gradient(90deg,#ff9d5c,#ff5d6c)" : `linear-gradient(90deg,${accent}88,${accent})`, transition: "width .22s ease" }} /></div>;
}

export function TugRushPanel({ state, accent }: any) {
  const pos = Number(state?.special?.tugPosition || 0);
  const goal = Math.max(1, Number(state?.config?.goal || 60));
  const x = 50 + Math.max(-50, Math.min(50, (pos / goal) * 50));
  return <div style={{ ...panelStyle(accent + "55"), padding: 10 }}>
    <div style={{ display:"flex", justifyContent:"space-between", gap:8, fontSize:10, fontWeight:1100 }}><span style={{color:accent}}>TUG RUSH · CAMP A</span><span style={{color:"#ff7b8f"}}>CAMP B</span></div>
    <div style={{ position:"relative", height:54, marginTop:8, borderRadius:14, background:"linear-gradient(90deg,rgba(109,247,168,.09),rgba(255,255,255,.025) 50%,rgba(255,91,118,.09))", border:"1px solid rgba(255,255,255,.08)" }}>
      <div style={{ position:"absolute", top:8, bottom:8, left:"50%", width:1, background:"rgba(255,255,255,.28)" }} />
      <div style={{ position:"absolute", left:10, right:10, top:"50%", height:4, transform:"translateY(-50%)", borderRadius:999, background:"rgba(255,255,255,.16)" }} />
      <div style={{ position:"absolute", top:"50%", left:`${x}%`, transform:"translate(-50%,-50%)", width:24, height:24, borderRadius:999, display:"grid", placeItems:"center", background:"#fff", color:"#111", fontWeight:1200, boxShadow:"0 0 18px rgba(255,255,255,.25)", transition:"left .25s ease" }}>●</div>
    </div>
    <div style={{ marginTop:6, color:SOFT, fontSize:9.2, textAlign:"center" }}>Position corde : <b style={{color:"#fff"}}>{Math.round(pos)}</b> / ±{goal}</div>
  </div>;
}

export function SoleilPanel({ state, accent }: any) {
  const stop = wave61SoleilPhase(state) === "STOP";
  const active = state?.players?.[state?.activePlayerIndex];
  const progress = Number(state?.progress?.[active?.id] || 0);
  const falls = Number(state?.special?.soleilFallsByPlayer?.[active?.id] || 0);
  return <div style={{ ...panelStyle(accent + "55"), padding:10, display:"grid", gap:8 }}>
    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", gap:10 }}><b style={{color:accent,fontSize:10}}>1, 2, 3 SOLEIL</b><span style={{padding:"6px 10px",borderRadius:999,background:stop?"rgba(255,78,94,.14)":"rgba(83,255,159,.12)",border:`1px solid ${stop?"#ff6678":"#5cff9f"}66`,color:stop?"#ff8a99":"#75ffaf",fontWeight:1100,fontSize:10}}>{stop?"🔴 SOLEIL — FIGE-TOI":"🟢 AVANCE"}</span></div>
    <Bar value={progress} max={state?.config?.goal || 100} accent={accent} />
    <div style={{color:SOFT,fontSize:9.2}}>Progression {Math.round(progress)}/{state?.config?.goal || 100} · fautes {falls}</div>
  </div>;
}

export function ChatSourisPanel({ state, accent }: any) {
  const goal = Number(state?.config?.goal || 100);
  return <div style={{ ...panelStyle(accent + "55"), padding:10 }}>
    <div style={{color:accent,fontSize:10,fontWeight:1100,marginBottom:8}}>CHAT & SOURIS · POURSUITE</div>
    <div style={{display:"grid",gap:7}}>{(state?.players||[]).map((p:any)=>{const role=state?.special?.chatSourisRoleByPlayer?.[p.id]||"MOUSE";const pos=Number(state?.special?.chatSourisPosByPlayer?.[p.id]||0);const caught=!!state?.special?.chatSourisCaughtByPlayer?.[p.id];return <div key={p.id} style={{display:"grid",gridTemplateColumns:"92px 1fr auto",gap:8,alignItems:"center",opacity:caught?.55:1}}><span style={{color:"#fff",fontSize:9.5,fontWeight:950}}>{role==="CAT"?"🐱 CHAT":"🐭 SOURIS"} · {p.name}</span><Bar value={pos} max={goal} accent={role==="CAT"?"#ff8e6d":accent} danger={role==="CAT"}/><span style={{color:caught?"#ff7a8c":SOFT,fontSize:9,fontWeight:900}}>{caught?"CAPTURÉE":Math.round(pos)}</span></div>})}</div>
  </div>;
}

export function MazeChasePanel({ state, accent }: any) {
  const p = state?.players?.[state?.activePlayerIndex];
  const pos = Math.round(Number(state?.special?.mazePosByPlayer?.[p?.id] || 0));
  const ghost = Math.round(Number(state?.special?.mazeGhostByPlayer?.[p?.id] ?? -6));
  const power = Number(state?.special?.mazePowerByPlayer?.[p?.id] || 0);
  const goal = Number(state?.config?.goal || 20);
  return <div style={{ ...panelStyle(accent + "55"), padding:10 }}><div style={{display:"flex",justifyContent:"space-between",gap:8}}><b style={{color:accent,fontSize:10}}>MAZE CHASE · LABYRINTHE</b><span style={{color:power?"#ffe66d":SOFT,fontSize:9,fontWeight:1000}}>⚡ POWER {power}</span></div><div style={{display:"grid",gridTemplateColumns:"repeat(10,1fr)",gap:4,marginTop:8}}>{Array.from({length:goal},(_,i)=>i+1).map((n)=><div key={n} style={{height:23,borderRadius:7,border:`1px solid ${n===pos?accent+"99":n===ghost?"#ff6c7f88":"rgba(255,255,255,.08)"}`,background:n<pos?`${accent}16`:n===pos?`${accent}35`:n===ghost?"rgba(255,70,90,.18)":"rgba(255,255,255,.025)",display:"grid",placeItems:"center",fontSize:9,color:n===pos?"#fff":SOFT}}>{n===pos?"🙂":n===ghost?"👻":n}</div>)}</div></div>;
}

export function ChienChatPanel({ state, accent }: any) {
  const goal=Number(state?.config?.goal||100);
  return <div style={{...panelStyle(accent+"55"),padding:10}}><div style={{color:accent,fontSize:10,fontWeight:1100,marginBottom:8}}>CHIEN & CHAT · DOUBLE PISTE</div><div style={{display:"grid",gap:7}}>{(state?.players||[]).map((p:any)=>{const role=state?.special?.chienChatRoleByPlayer?.[p.id]||"DOG";const pos=Number(state?.special?.chienChatPosByPlayer?.[p.id]||0);return <div key={p.id} style={{display:"grid",gridTemplateColumns:"105px 1fr 36px",gap:7,alignItems:"center"}}><span style={{color:"#fff",fontSize:9.2,fontWeight:950}}>{role==="DOG"?"🐶 CHIEN":"🐱 CHAT"} · {p.name}</span><Bar value={pos} max={goal} accent={role==="DOG"?accent:"#ff9c6d"}/><span style={{color:SOFT,fontSize:9,textAlign:"right"}}>{Math.round(pos)}</span></div>})}</div><div style={{marginTop:7,color:SOFT,fontSize:8.8}}>Bonus : 🦴 secteur 5 pour les chiens · 🐟 secteur 17 pour les chats · BULL = raccourci.</div></div>;
}

export function RollerCoasterPanel({ state, accent }: any) {
  const p=state?.players?.[state?.activePlayerIndex]; const pos=Number(state?.special?.rollerPosByPlayer?.[p?.id]||0); const speed=Number(state?.special?.rollerSpeedByPlayer?.[p?.id]||0); const goal=Number(state?.config?.goal||100); const names=["MONTÉE","DROP","LOOPING","VIRAGE","SPRINT FINAL"]; const idx=Math.max(0,Math.min(4,Math.floor((pos/Math.max(1,goal))*5)));
  return <div style={{...panelStyle(accent+"55"),padding:10,display:"grid",gap:8}}><div style={{display:"flex",justifyContent:"space-between",gap:8}}><b style={{color:accent,fontSize:10}}>ROLLER COASTER · {names[idx]}</b><span style={{color:speed>75?"#ff9a76":"#fff",fontSize:10,fontWeight:1100}}>⚡ {Math.round(speed)}%</span></div><Bar value={pos} max={goal} accent={accent}/><div style={{height:7,borderRadius:999,background:"rgba(255,255,255,.06)",overflow:"hidden"}}><div style={{height:"100%",width:`${Math.max(0,Math.min(100,speed))}%`,background:speed>75?"linear-gradient(90deg,#ffd36a,#ff6b6b)":`linear-gradient(90deg,${accent}88,${accent})`}}/></div><div style={{color:SOFT,fontSize:9}}>Piste {Math.round(pos)}/{goal} · surveille la vitesse dans les LOOPINGS et VIRAGES.</div></div>;
}

export function AthleticsPanel({ state, accent }: any) {
  const disciplines=["SPRINT","HAIES","LONGUEUR","HAUTEUR","JAVELOT","RELAIS"]; const current=disciplines[Math.max(0,Math.min(5,Number(state?.roundIndex||0)))] || "SPRINT";
  return <div style={{...panelStyle(accent+"55"),padding:10}}><div style={{display:"flex",justifyContent:"space-between",gap:8}}><b style={{color:accent,fontSize:10}}>ATHLÉTISME · {current}</b><span style={{color:SOFT,fontSize:9}}>Épreuve {Math.min(6,Number(state?.roundIndex||0)+1)}/6</span></div><div style={{display:"grid",gridTemplateColumns:"repeat(6,1fr)",gap:4,marginTop:8}}>{disciplines.map((d,i)=><div key={d} style={{padding:"6px 4px",borderRadius:8,textAlign:"center",background:i===Number(state?.roundIndex||0)?`${accent}24`:"rgba(255,255,255,.03)",border:`1px solid ${i===Number(state?.roundIndex||0)?accent+"66":"rgba(255,255,255,.07)"}`,fontSize:7.8,fontWeight:950,color:i===Number(state?.roundIndex||0)?"#fff":SOFT}}>{d}</div>)}</div><div style={{display:"grid",gap:4,marginTop:8}}>{(state?.players||[]).map((p:any)=><div key={p.id} style={{display:"flex",justifyContent:"space-between",gap:8,fontSize:9.2}}><span style={{color:"#fff",fontWeight:900}}>{p.name}</span><span style={{color:accent,fontWeight:1100}}>{Math.round(Number(state?.scores?.[p.id]||0))} pts</span></div>)}</div></div>;
}

export function FreefallPanel({ state, accent }: any) {
  const p=state?.players?.[state?.activePlayerIndex]; const alt=Math.round(Number(state?.special?.freefallAltitudeByPlayer?.[p?.id]||0)); const startAlt=Math.max(1,Number(state?.config?.modeOptions?.startAltitude||4000)); const chute=!!state?.special?.freefallChuteByPlayer?.[p?.id]; const crash=!!state?.special?.freefallCrashedByPlayer?.[p?.id];
  return <div style={{...panelStyle(accent+"55"),padding:10,display:"grid",gridTemplateColumns:"1fr auto",gap:12,alignItems:"center"}}><div><b style={{color:accent,fontSize:10}}>CHUTE LIBRE · ALTITUDE</b><div style={{fontSize:28,fontWeight:1200,color:crash?"#ff6c7f":"#fff",marginTop:4}}>{alt.toLocaleString("fr-FR")} m</div><div style={{color:chute?"#79ffb4":SOFT,fontSize:9.4,fontWeight:900}}>{crash?"💥 CRASH":chute?"🪂 PARACHUTE OUVERT":"🧍 CHUTE LIBRE"}</div></div><div style={{height:86,width:26,borderRadius:999,background:"rgba(255,255,255,.05)",border:"1px solid rgba(255,255,255,.1)",display:"flex",alignItems:"flex-end",padding:3}}><div style={{width:"100%",height:`${Math.max(2,Math.min(100,(alt/startAlt)*100))}%`,borderRadius:999,background:`linear-gradient(180deg,${accent},#ff9b65)`}}/></div></div>;
}

export function TyrolienPanel({ state, accent }: any) {
  const p=state?.players?.[state?.activePlayerIndex]; const pos=Number(state?.special?.tyrolienPosByPlayer?.[p?.id]||0); const speed=Number(state?.special?.tyrolienSpeedByPlayer?.[p?.id]||0); const goal=Number(state?.config?.goal||100);
  return <div style={{...panelStyle(accent+"55"),padding:10}}><div style={{display:"flex",justifyContent:"space-between",gap:8}}><b style={{color:accent,fontSize:10}}>LE TYROLIEN · CÂBLE</b><span style={{color:"#fff",fontSize:9.5,fontWeight:1100}}>💨 {Math.round(speed)}%</span></div><div style={{position:"relative",marginTop:14,height:34}}><div style={{position:"absolute",left:4,right:4,top:14,height:2,background:"rgba(255,255,255,.22)",transform:"rotate(-2deg)"}}/><div style={{position:"absolute",left:`calc(${pct(pos,goal)}% - 9px)`,top:4,fontSize:18,transition:"left .25s ease"}}>🧗</div></div><Bar value={pos} max={goal} accent={accent}/><div style={{marginTop:6,color:SOFT,fontSize:9}}>{Math.round(pos)}/{goal} · BULL = boost de glisse.</div></div>;
}

export function JumpRopePanel({ state, accent }: any) {
  const p=state?.players?.[state?.activePlayerIndex]; const jumps=Math.round(Number(state?.progress?.[p?.id]||0)); const combo=Number(state?.special?.ropeComboByPlayer?.[p?.id]||0); const pace=Number(state?.special?.ropePaceByPlayer?.[p?.id]||1); const goal=Number(state?.config?.goal||100);
  return <div style={{...panelStyle(accent+"55"),padding:10,display:"grid",gap:8}}><div style={{display:"flex",justifyContent:"space-between",gap:8,alignItems:"center"}}><b style={{color:accent,fontSize:10}}>SAUT À LA CORDE</b><span style={{color:combo?"#ffec75":SOFT,fontSize:10,fontWeight:1100}}>🔥 COMBO {combo}</span></div><div style={{display:"grid",gridTemplateColumns:"1fr auto",gap:10,alignItems:"end"}}><div><div style={{fontSize:28,color:"#fff",fontWeight:1200}}>{jumps}<span style={{fontSize:11,color:SOFT}}> / {goal} sauts</span></div><Bar value={jumps} max={goal} accent={accent}/></div><div style={{minWidth:64,padding:"8px 10px",borderRadius:12,border:`1px solid ${accent}55`,background:`${accent}0d`,textAlign:"center"}}><div style={{color:SOFT,fontSize:8}}>RYTHME</div><b style={{color:accent,fontSize:18}}>×{pace}</b></div></div></div>;
}
