// @ts-nocheck
import React from "react";
import { Meter, SOFT, panelStyle } from "../newModes/newModePlayShared";

const PROFILES: Record<string, { title: string; icon: string; nodes: string[]; threshold: number; win: number; resource: string }> = {
  vikings: { title: "VIKINGS · CONQUÊTE NORDIQUE", icon: "🛡️", nodes: ["FJORD", "PORT", "VILLAGE", "FORT", "TEMPLE", "JARL"], threshold: 5, win: 4, resource: "FUREUR" },
  black_flag: { title: "BLACK FLAG · ARCHIPEL PIRATE", icon: "🏴‍☠️", nodes: ["CAYE", "PORT", "ÎLE", "FORT", "GALION", "TRÉSOR"], threshold: 6, win: 4, resource: "BUTIN" },
  menhir_mayhem: { title: "MENHIR MAYHEM · GUERRE DES CAMPS", icon: "🪨", nodes: ["VILLAGE", "FORÊT", "CARRIÈRE", "CAMP NORD", "CAMP SUD", "FORT"], threshold: 5, win: 4, resource: "POTION" },
  attila: { title: "ATTILA · MARCHE DES HUNS", icon: "🐎", nodes: ["CAMPEMENT", "PLAINE", "PONT", "CITÉ", "FORT", "CAPITALE", "EMPIRE"], threshold: 5, win: 5, resource: "TERREUR" },
  poseidon: { title: "POSÉIDON · DOMINATION DES MERS", icon: "🔱", nodes: ["RÉCIF", "PORT", "DÉTROIT", "ABYSSES", "TEMPLE", "OCÉAN"], threshold: 6, win: 4, resource: "MARÉE" },
  sabaudia_dauphine: { title: "SABAUDIA & DAUPHINÉ · FRONTIÈRES ALPINES", icon: "🏔️", nodes: ["SAVOIE", "HAUTE-SAVOIE", "DAUPHINÉ", "CHAMBÉRY", "GRENOBLE", "MAURIENNE", "TARENTAISE", "VERCORS"], threshold: 5, win: 5, resource: "INFLUENCE" },
  galaxies: { title: "GALAXIES · CONQUÊTE STELLAIRE", icon: "🌌", nodes: ["NÉBULEUSE", "SYSTÈME A", "SYSTÈME B", "CEINTURE", "LUNE", "MONDE", "PORTAIL", "NOYAU"], threshold: 6, win: 5, resource: "ÉNERGIE" },
};

const TROJAN_PHASES = ["BOIS", "ASSEMBLAGE", "SIÈGE", "INFILTRATION", "CITADELLE"];

function card(accent: string): React.CSSProperties {
  return { ...panelStyle(`${accent}40`), padding: 9, display: "grid", gap: 7 };
}
function actorOf(state: any, playerId: string) {
  return state.config?.participantMode === "teams" ? String(state.config?.teamByPlayer?.[playerId] || "A") : playerId;
}
function actorLabel(state: any, owner: any) {
  if (!owner) return "LIBRE";
  if (state.config?.participantMode === "teams") return `TEAM ${owner}`;
  return state.players?.find((p: any) => String(p.id) === String(owner))?.name || "CONQUIS";
}
function actorColor(state: any, owner: any, accent: string) {
  if (!owner) return "rgba(255,255,255,.10)";
  if (state.config?.participantMode === "teams") return String(owner) === "B" ? "#ff7188" : accent;
  const idx = Math.max(0, state.players?.findIndex((p: any) => String(p.id) === String(owner)) ?? 0);
  return [accent, "#ff7188", "#70d6ff", "#ffd166", "#a98bff", "#7fe7b5"][idx % 6];
}

function ConquestPanel({ state, accent, modeId }: any) {
  const profile=PROFILES[modeId]; if(!profile) return null;
  const targets=state.special?.conquestTargets||[], owners=state.special?.conquestOwnerByNode||[], pressure=state.special?.conquestPressureByNode||[], forts=state.special?.conquestFortByNode||[];
  const active=state.players?.[state.activePlayerIndex]; const activeResource=Math.round(Number(state.special?.conquestResourceByPlayer?.[active?.id]||0));
  const isGalaxy=modeId==="galaxies"; const isAlps=modeId==="sabaudia_dauphine";
  return <div style={card(accent)}>
    <div style={{display:"flex",justifyContent:"space-between",gap:8,alignItems:"center"}}><div style={{color:accent,fontSize:10,fontWeight:1100,letterSpacing:.7}}>{profile.title}</div><span style={{color:SOFT,fontSize:8.5}}>{isGalaxy?"🚀 Hyperdrive à 100%":isAlps?"🏰 Fortifie les cols contrôlés":`${profile.resource} à 100% = pouvoir spécial`}</span></div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(120px,1fr))",gap:6}}>{profile.nodes.map((node,i)=>{const owner=owners[i]; const color=actorColor(state,owner,accent); const pr=pressure[i]||{actor:null,value:0}; const focused=Number(state.special?.conquestFocusByPlayer?.[active?.id]||0)===i; return <div key={`${node}-${i}`} style={{borderRadius:11,padding:7,border:`1px solid ${focused?accent:owner?color+"99":"rgba(255,255,255,.10)"}`,background:owner?color+"13":focused?accent+"0b":"rgba(255,255,255,.025)",display:"grid",gap:4,boxShadow:focused?`0 0 16px ${accent}1f`:"none"}}><div style={{display:"flex",justifyContent:"space-between",gap:5}}><b style={{fontSize:9.2}}>{focused?"🎯":profile.icon} {node}</b><span style={{color:accent,fontWeight:1100,fontSize:10}}>{targets[i]||"—"}</span></div><span style={{color:owner?color:SOFT,fontSize:8.4,fontWeight:900}}>{owner?`🏳 ${actorLabel(state,owner)}`:"○ TERRITOIRE LIBRE"}{Number(forts[i]||0)>0?` · 🛡️${forts[i]}`:""}</span><Meter value={Number(pr.value||0)} max={profile.threshold} accent={pr.actor?actorColor(state,pr.actor,accent):accent}/><span style={{color:SOFT,fontSize:7.7}}>Pression {Math.round(Number(pr.value||0))}/{profile.threshold}</span></div>})}</div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))",gap:6}}>{state.players.map((p:any)=>{const actor=actorOf(state,p.id);const controlled=owners.filter((o:any)=>String(o||"")===actor).length;const resource=Math.round(Number(state.special?.conquestResourceByPlayer?.[p.id]||0));return <div key={p.id} style={{borderRadius:10,padding:7,background:p.id===active?.id?accent+"0c":"rgba(255,255,255,.025)",border:`1px solid ${p.id===active?.id?accent+"66":"rgba(255,255,255,.08)"}`,display:"grid",gap:4}}><div style={{display:"flex",justifyContent:"space-between"}}><b style={{fontSize:9.5}}>{p.id===active?.id?"▶ ":""}{p.name}</b><span style={{color:accent,fontSize:9,fontWeight:1000}}>{controlled}/{profile.win}</span></div><Meter value={controlled} max={profile.win} accent={accent}/><div style={{display:"flex",justifyContent:"space-between",color:SOFT,fontSize:8.2}}><span>{profile.resource} {resource}%</span><span>captures {state.special?.conquestCapturesByPlayer?.[p.id]||0}</span></div>{p.id===active?.id?<Meter value={activeResource} max={100} accent={isGalaxy?"#7bc8ff":accent}/>:null}</div>})}</div>
  </div>;
}

export function VikingsPanel(props: any) { return <ConquestPanel {...props} modeId="vikings" />; }
export function BlackFlagPanel(props: any) { return <ConquestPanel {...props} modeId="black_flag" />; }
export function MenhirMayhemPanel(props: any) { return <ConquestPanel {...props} modeId="menhir_mayhem" />; }
export function AttilaPanel(props: any) { return <ConquestPanel {...props} modeId="attila" />; }
export function PoseidonPanel(props: any) { return <ConquestPanel {...props} modeId="poseidon" />; }
export function SabaudiaDauphinePanel(props: any) { return <ConquestPanel {...props} modeId="sabaudia_dauphine" />; }
export function GalaxiesPanel(props: any) { return <ConquestPanel {...props} modeId="galaxies" />; }

export function ChevalTroiePanel({ state, accent }: any) {
  const active=state.players?.[state.activePlayerIndex];
  return <div style={card(accent)}>
    <div style={{ display:"flex",justifyContent:"space-between",gap:8 }}><div style={{ color: accent, fontSize: 10, fontWeight: 1100, letterSpacing: .7 }}>🐴 LE CHEVAL DE TROIE · OPÉRATION EN 5 PHASES</div><span style={{color:SOFT,fontSize:8.5}}>BULL = discrétion</span></div>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(185px,1fr))", gap: 7 }}>
      {state.players.map((p: any) => { const phase=Number(state.special?.trojanPhaseByPlayer?.[p.id]||0); const alert=Math.max(0,Number(state.special?.trojanAlertByPlayer?.[p.id]||0)); const wood=Number(state.special?.trojanWoodByPlayer?.[p.id]||0); const danger=alert>=80?"🚨 ALERTE MAX":alert>=55?"⚠️ GARDE EN ÉVEIL":alert>=25?"👀 SOUPÇONS":"🥷 INFILTRATION DISCRÈTE"; return <div key={p.id} style={{display:"grid",gap:6,borderRadius:11,padding:8,border:`1px solid ${p.id===active?.id?accent+"88":"rgba(255,255,255,.08)"}`,background:p.id===active?.id?accent+"0c":"rgba(255,255,255,.025)"}}><div style={{display:"flex",justifyContent:"space-between"}}><b>🐴 {p.name}</b><span style={{color:alert>=55?"#ff7c70":accent,fontSize:8,fontWeight:1100}}>{danger}</span></div><div style={{display:"grid",gridTemplateColumns:`repeat(${TROJAN_PHASES.length},minmax(0,1fr))`,gap:3}}>{TROJAN_PHASES.map((label,i)=><div key={label} style={{borderRadius:7,padding:"5px 2px",textAlign:"center",background:i<phase?accent+"20":i===phase?accent+"0f":"rgba(255,255,255,.025)",border:`1px solid ${i===phase?accent:i<phase?accent+"77":"rgba(255,255,255,.08)"}`,color:i<=phase?"#fff":SOFT,fontSize:7.2,fontWeight:900}}>{i<phase?"✓ ":""}{label}</div>)}</div><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:5}}><span style={{color:SOFT,fontSize:8.3}}>🪵 Bois <b style={{color:"#fff"}}>{wood}</b></span><span style={{color:SOFT,fontSize:8.3}}>🚨 Alerte <b style={{color:alert>=55?"#ff7c70":"#fff"}}>{Math.round(alert)}%</b></span></div><Meter value={alert} max={100} accent={alert>=70?"#ff6b68":alert>=45?"#ffbf62":accent}/></div>; })}
    </div>
  </div>;
}
