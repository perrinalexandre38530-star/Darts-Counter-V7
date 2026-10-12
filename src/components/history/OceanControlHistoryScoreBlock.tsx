// @ts-nocheck
import React from "react";
import { oceanControlVariantLabel } from "../../lib/gameEngines/oceanControlEngine";

const BLUE="#30b9ff",CYAN="#65e9ff",GREEN="#65e5aa",GOLD="#f5ca68",RED="#ff6573",SOFT="#aab4c7";
const n=(v:any)=>Number.isFinite(Number(v))?Number(v):0;

export default function OceanControlHistoryScoreBlock({record}:any){
  const summary=record?.summary||record?.payload?.summary||{};
  const variant=summary?.variant||record?.payload?.variant||record?.payload?.config?.variant||"tactical";
  const rows=(summary?.rankings||summary?.perPlayer||record?.payload?.stats?.players||record?.players||[]).slice().sort((a:any,b:any)=>n(a?.rank)-n(b?.rank));
  const scoreByOwner=summary?.scoreByOwner||record?.payload?.summary?.scoreByOwner||{};
  const scoreLine=Object.keys(scoreByOwner).length?Object.entries(scoreByOwner).map(([id,value])=>`${String(id).replace(/^fleet-|^team-/i,"")} ${n(value)}`).join(" · "):summary?.scoreLine;
  const battleHistory=(summary?.battleHistory||record?.payload?.battleHistory||[]).slice().reverse().slice(0,3);
  const totalHits=rows.reduce((s:number,row:any)=>s+n(row?.shipHits),0);
  const totalShips=rows.reduce((s:number,row:any)=>s+n(row?.shipsSunk),0);
  const totalSonars=rows.reduce((s:number,row:any)=>s+n(row?.sonarUses),0);
  return <div style={{marginTop:8,display:"grid",gap:7}}>
    <div style={{display:"flex",justifyContent:"space-between",gap:8,alignItems:"center",flexWrap:"wrap"}}>
      <div style={{color:CYAN,fontSize:9,fontWeight:1100}}>⚓ {oceanControlVariantLabel(variant)}</div>
      <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
        <span style={{borderRadius:999,padding:"4px 7px",fontSize:7,fontWeight:1000,color:RED,border:`1px solid ${RED}44`,background:`${RED}10`}}>💥 {totalShips} nav.</span>
        <span style={{borderRadius:999,padding:"4px 7px",fontSize:7,fontWeight:1000,color:BLUE,border:`1px solid ${BLUE}44`,background:`${BLUE}10`}}>🎯 {totalHits} impacts</span>
        <span style={{borderRadius:999,padding:"4px 7px",fontSize:7,fontWeight:1000,color:CYAN,border:`1px solid ${CYAN}44`,background:`${CYAN}10`}}>📡 {totalSonars} sonars</span>
      </div>
    </div>
    {scoreLine?<div style={{borderRadius:12,padding:"8px 10px",background:"linear-gradient(180deg,rgba(255,255,255,.04),rgba(0,0,0,.18))",border:"1px solid rgba(255,255,255,.08)",color:GOLD,fontSize:7.8,fontWeight:1000}}>{scoreLine}</div>:null}
    {rows.map((row:any,index:number)=>{const accuracy=n(row?.validShots)>0?`${Math.round(n(row?.shipHits)/n(row?.validShots)*1000)/10}%`:"0%";const won=n(row?.rank)===1||row?.winner||row?.win;const accent=won?GOLD:BLUE;return <div key={row?.id||index} style={{display:"grid",gridTemplateColumns:"30px minmax(0,1fr) auto",gap:7,alignItems:"center",padding:8,borderRadius:12,background:won?`${accent}0e`:"rgba(255,255,255,.035)",border:`1px solid ${won?accent+"55":"rgba(255,255,255,.08)"}`}}>
      <strong style={{color:won?GOLD:SOFT}}>#{n(row?.rank)||index+1}</strong>
      <div style={{minWidth:0}}>
        <div style={{whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",fontWeight:950,color:won?"#fff":"#e8eef6"}}>{row?.name||"Joueur"}{won?" · victoire":""}</div>
        <div style={{marginTop:2,color:SOFT,fontSize:7.2}}>{n(row?.shipHits)} impacts · {n(row?.perfectVisits)} parfaite{n(row?.perfectVisits)>1?"s":""} · série {n(row?.bestHitStreak)} · {n(row?.sonarUses)} sonar</div>
      </div>
      <div style={{textAlign:"right"}}><strong style={{display:"block",color:RED}}>{n(row?.shipsSunk)} nav.</strong><span style={{color:GREEN,fontSize:7.5}}>{accuracy}</span></div>
    </div>})}
    {battleHistory.length?<div style={{display:"grid",gap:6}}>{battleHistory.map((battle:any)=> <div key={`${battle?.battle}-${battle?.finishedAt}`} style={{display:"grid",gridTemplateColumns:"34px minmax(0,1fr) auto",gap:7,alignItems:"center",padding:"7px 8px",borderRadius:11,background:"rgba(255,255,255,.025)",border:"1px solid rgba(255,255,255,.07)"}}><strong style={{color:CYAN}}>B{n(battle?.battle)}</strong><div style={{minWidth:0}}><div style={{fontSize:8.2,fontWeight:1000,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>Manche remportée</div><div style={{marginTop:2,color:SOFT,fontSize:7}}>{n(battle?.visits)} volées · {n(battle?.hits)} impacts · {n(battle?.shipsSunk)} navires coulés</div></div><strong style={{color:GOLD,fontSize:8.4}}>{n(battle?.darts)} fl.</strong></div>)}</div>:null}
  </div>;
}
