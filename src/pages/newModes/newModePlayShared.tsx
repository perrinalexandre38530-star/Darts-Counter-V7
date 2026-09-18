// @ts-nocheck
import React from "react";
import ProfileAvatar from "../../components/ProfileAvatar";
import ScoreInputHub from "../../components/ScoreInputHub";
import type { Dart as UIDart } from "../../lib/types";
import type { GameDart } from "../../lib/types-game";

export const SOFT = "#aeb5c8";
export const PANEL_BG = "linear-gradient(180deg,rgba(15,18,28,.96),rgba(6,8,14,.97))";

export function panelStyle(accent = "rgba(255,255,255,.10)"): React.CSSProperties {
  return { borderRadius: 18, padding: 10, background: PANEL_BG, border: `1px solid ${accent}`, boxShadow: "0 14px 34px rgba(0,0,0,.34)", boxSizing: "border-box", minWidth: 0 };
}
export function actionStyle(color: string, disabled = false): React.CSSProperties {
  return { minHeight: 40, borderRadius: 12, border: `1px solid ${disabled ? "rgba(255,255,255,.10)" : color + "88"}`, background: disabled ? "rgba(255,255,255,.035)" : `${color}18`, color: disabled ? "#62697b" : color, fontWeight: 1000, cursor: disabled ? "not-allowed" : "pointer", padding: "0 11px" };
}
export function playerName(p: any, index = 0) { return String(p?.name || p?.displayName || p?.display_name || p?.pseudo || `Joueur ${index + 1}`); }
export function avatarOf(p:any){return p?.avatarDataUrl ?? p?.avatarUrl ?? p?.avatar ?? p?.photoDataUrl ?? null;}
export function isBotProfile(p: any, botIds?: Set<string>) { return Boolean(botIds?.has(String(p?.id || "")) || p?.isBot || p?.bot || p?.kind === "bot" || p?.botLevel); }

export function resolveModeProfiles(config:any, store:any){
  const ids=(Array.isArray(config?.selectedIds)?config.selectedIds:[]).map(String);
  const payload=Array.isArray(config?.playersList)?config.playersList:[];
  let resolved:any[]=[];
  try{resolved=typeof store?.resolveSelectedProfiles==="function"?store.resolveSelectedProfiles(ids):[];}catch{}
  const all=[...payload,...(Array.isArray(resolved)?resolved:[]),...(Array.isArray(store?.profiles)?store.profiles:[])];
  const byId=new Map<string,any>();
  for(const p of all){const pid=String(p?.id||p?.profileId||"");if(pid&&!byId.has(pid))byId.set(pid,p);}
  const rows=ids.map((id,i)=>{const p=byId.get(id)||payload.find((x:any)=>String(x?.id||x?.profileId||"")===id)||{id,name:`Joueur ${i+1}`};return {...p,id,name:playerName(p,i),avatarDataUrl:avatarOf(p)};});
  if(rows.length)return rows;
  const count=Math.max(2,Number(config?.players||2));
  return Array.from({length:count},(_,i)=>({id:`p${i+1}`,name:`Joueur ${i+1}`,avatarDataUrl:null}));
}

export function uiToGameDart(d: UIDart): GameDart {
  if(!d||Number(d.v)===0)return{bed:"MISS"};
  if(Number(d.v)===25)return{bed:Number(d.mult)===2?"IB":"OB"};
  if(Number(d.v)===50)return{bed:"IB"};
  return {bed:Number(d.mult)===3?"T":Number(d.mult)===2?"D":"S",number:Number(d.v)} as GameDart;
}
export function gameToUiDart(d:GameDart):UIDart{
  if(!d||d.bed==="MISS")return{v:0,mult:1};
  if(d.bed==="IB")return{v:25,mult:2};
  if(d.bed==="OB")return{v:25,mult:1};
  return{v:Number(d.number||0),mult:d.bed==="T"?3:d.bed==="D"?2:1};
}
export function dartLabel(d:GameDart){if(!d||d.bed==="MISS")return"MISS";if(d.bed==="IB")return"DBULL";if(d.bed==="OB")return"BULL";return`${d.bed}${d.number||""}`;}

export function NewModeInput({ currentThrow, setCurrentThrow, multiplier, setMultiplier, onValidate, preferredMethod, disabled=false, validateLabel="VALIDER", accent="#ffc04c", maxDarts=3 }:any){
  const cap=Math.max(1,Math.min(3,Number(maxDarts)||3));
  const append=(d:UIDart)=>setCurrentThrow((prev:UIDart[])=>prev.length>=cap?prev:[...prev,d]);
  return <div style={{...panelStyle(accent+"35"),padding:8}}>
    <ScoreInputHub
      currentThrow={currentThrow}
      multiplier={multiplier}
      onSimple={()=>setMultiplier(1)}
      onDouble={()=>setMultiplier(2)}
      onTriple={()=>setMultiplier(3)}
      onCancel={()=>{setCurrentThrow([]);setMultiplier(1);}}
      onBackspace={()=>setCurrentThrow((prev:UIDart[])=>prev.slice(0,-1))}
      onNumber={(n:number)=>append({v:n,mult:multiplier})}
      onBull={()=>append({v:25,mult:multiplier===2?2:1})}
      onMiss={()=>append({v:0,mult:1})}
      onDirectDart={append}
      onSetVisitDarts={(darts:UIDart[])=>setCurrentThrow((darts||[]).slice(0,cap))}
      onValidate={onValidate}
      validateLabel={validateLabel}
      validateDisabled={!currentThrow.length||disabled}
      disabled={disabled}
      preferredMethod={preferredMethod}
      compact
      fitToParent
    />
  </div>;
}

export function PlayerCard({profile,active,accent,value,subValue,badge,wins=0,muted=false}:any){
  return <div style={{...panelStyle(active?accent+"88":"rgba(255,255,255,.09)"),padding:9,background:active?`linear-gradient(180deg,${accent}16,rgba(7,9,15,.97))`:PANEL_BG,opacity:muted?.58:1,boxShadow:active?`0 0 22px ${accent}24,0 12px 28px rgba(0,0,0,.35)`:"0 10px 24px rgba(0,0,0,.25)"}}>
    <div style={{display:"grid",gridTemplateColumns:"42px minmax(0,1fr) auto",gap:8,alignItems:"center"}}>
      <ProfileAvatar profile={profile} size={42} showStars={false} ringColor={active?accent:"rgba(255,255,255,.18)"}/>
      <div style={{minWidth:0}}><div style={{display:"flex",gap:6,alignItems:"center",minWidth:0}}><strong style={{color:active?"#fff":"#d9deea",fontSize:12.5,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{playerName(profile)}</strong>{badge?<span style={{fontSize:8.5,fontWeight:1000,color:accent,border:`1px solid ${accent}55`,borderRadius:999,padding:"2px 6px"}}>{badge}</span>:null}</div><div style={{marginTop:3,color:SOFT,fontSize:9.5,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{subValue}</div></div>
      <div style={{textAlign:"right"}}><div style={{color:active?accent:"#fff",fontWeight:1100,fontSize:22,lineHeight:1}}>{value}</div><div style={{marginTop:4,color:"#8991a5",fontSize:8.5,fontWeight:900}}>MANCHE{wins!==1?"S":""} {wins}</div></div>
    </div>
  </div>;
}

export function ModeEndPanel({title,winner,profiles,legWins,accent,onReplay,onConfig,onGames,onStats,onHistory,extra}:any){
  const w=profiles.find((p:any)=>String(p.id)===String(winner))||profiles[0];
  return <div style={{...panelStyle(accent+"66"),padding:16,textAlign:"center",boxShadow:`0 0 30px ${accent}20,0 18px 46px rgba(0,0,0,.48)`}}>
    <div style={{color:accent,fontWeight:1100,fontSize:11,letterSpacing:1.3}}>PARTIE TERMINÉE</div>
    <div style={{display:"grid",placeItems:"center",marginTop:10}}><ProfileAvatar profile={w} size={82} showStars={false} ringColor={accent}/></div>
    <div style={{marginTop:8,color:"#fff",fontSize:24,fontWeight:1100}}>{playerName(w)}</div>
    <div style={{marginTop:3,color:SOFT,fontSize:11}}>remporte {title} · {Number(legWins?.[winner]||0)} manche{Number(legWins?.[winner]||0)>1?"s":""}</div>
    {extra?<div style={{marginTop:12}}>{extra}</div>:null}
    {(onStats || onHistory) ? <div style={{display:"grid",gridTemplateColumns:onStats&&onHistory?"1fr 1fr":"1fr",gap:8,marginTop:14}}>{onStats?<button type="button" onClick={onStats} style={actionStyle(accent)}>📊 STATS</button>:null}{onHistory?<button type="button" onClick={onHistory} style={actionStyle("#7dc8ff")}>🕘 HISTORIQUE</button>:null}</div>:null}
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginTop:(onStats||onHistory)?8:14}}><button type="button" onClick={onReplay} style={actionStyle(accent)}>↻ REJOUER</button><button type="button" onClick={onConfig} style={actionStyle("#9ea7bb")}>CONFIGURATION</button></div>
    <button type="button" onClick={onGames} style={{...actionStyle("#fff"),width:"100%",marginTop:8}}>RETOUR AUX JEUX</button>
  </div>;
}

export function lastEvents(visits:any[]){const row=Array.isArray(visits)&&visits.length?visits[visits.length-1]:null;return Array.isArray(row?.events)?row.events:[];}

export function VisitTimeline({ visits, profiles, accent = "#ffc04c", title = "DERNIÈRES ACTIONS", limit = 4 }: any) {
  const rows = (Array.isArray(visits) ? visits : []).slice(-Math.max(1, Number(limit) || 4)).reverse();
  const byId = new Map((Array.isArray(profiles) ? profiles : []).map((p: any) => [String(p?.id || ""), p]));
  if (!rows.length) return null;
  return <div style={{ ...panelStyle("rgba(255,255,255,.08)"), padding: 9 }}>
    <div style={{ color: accent, fontSize: 9.5, fontWeight: 1100, letterSpacing: .8 }}>{title}</div>
    <div style={{ marginTop: 7, display: "grid", gap: 5 }}>
      {rows.map((row: any, idx: number) => {
        const prof = byId.get(String(row?.playerId || ""));
        const events = Array.isArray(row?.events) ? row.events.filter(Boolean) : [];
        const text = events.length ? events.join(" · ") : row?.kind ? String(row.kind).toUpperCase() : "Action";
        return <div key={row?.id || `${row?.playerId || "row"}-${idx}`} style={{ display: "grid", gridTemplateColumns: "6px minmax(0,1fr)", gap: 8, alignItems: "start", padding: "5px 0", borderTop: idx ? "1px solid rgba(255,255,255,.055)" : "none" }}>
          <span style={{ width: 6, height: 6, borderRadius: 99, background: idx === 0 ? accent : "rgba(255,255,255,.22)", boxShadow: idx === 0 ? `0 0 10px ${accent}88` : "none", marginTop: 5 }} />
          <div style={{ minWidth: 0 }}>
            <div style={{ color: idx === 0 ? "#fff" : "#c8cfdd", fontSize: 9.5, lineHeight: 1.4, fontWeight: idx === 0 ? 900 : 700 }}>{text}</div>
            <div style={{ marginTop: 2, color: "#7f8798", fontSize: 8.3 }}>{prof ? playerName(prof) : "Partie"}{row?.leg ? ` · manche ${row.leg}` : ""}{row?.turn ? ` · action ${row.turn}` : ""}</div>
          </div>
        </div>;
      })}
    </div>
  </div>;
}

export function Meter({ value, max, accent = "#ffc04c", dangerAt = 1, height = 6 }: any) {
  const safeMax = Math.max(1, Number(max) || 1);
  const v = Math.max(0, Math.min(safeMax, Number(value) || 0));
  const ratio = v / safeMax;
  const color = ratio >= Number(dangerAt || 1) ? "#ff6b67" : accent;
  return <div aria-label={`${v} sur ${safeMax}`} style={{ height, borderRadius: 999, overflow: "hidden", background: "rgba(255,255,255,.08)" }}>
    <div style={{ width: `${ratio * 100}%`, height: "100%", borderRadius: 999, background: `linear-gradient(90deg,${accent},${color})`, boxShadow: ratio > .65 ? `0 0 12px ${color}55` : "none" }} />
  </div>;
}
