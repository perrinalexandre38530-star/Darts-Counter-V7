// @ts-nocheck
import React from "react";
import { oceanControlVariantLabel } from "../../lib/gameEngines/oceanControlEngine";

const BLUE="#30b9ff",CYAN="#65e9ff",GREEN="#65e5aa",GOLD="#f5ca68",RED="#ff6573",SOFT="#aab4c7";
const n=(v:any)=>Number.isFinite(Number(v))?Number(v):0;

export default function OceanControlHistoryScoreBlock({record}:any){
  const summary=record?.summary||record?.payload?.summary||{};
  const variant=summary?.variant||record?.payload?.variant||record?.payload?.config?.variant||"tactical";
  const rows=summary?.rankings||summary?.perPlayer||record?.payload?.stats?.players||record?.players||[];
  const scoreByOwner=summary?.scoreByOwner||record?.payload?.summary?.scoreByOwner||{};
  const scoreLine=Object.keys(scoreByOwner).length?Object.entries(scoreByOwner).map(([id,value])=>`${String(id).replace(/^fleet-|^team-/i,"")} ${n(value)}`).join(" · "):summary?.scoreLine;
  return <div style={{marginTop:8,display:"grid",gap:6}}>
    <div style={{display:"flex",justifyContent:"space-between",gap:8,alignItems:"center"}}><div style={{color:CYAN,fontSize:9,fontWeight:1100}}>⚓ {oceanControlVariantLabel(variant)}</div>{scoreLine?<div style={{color:GOLD,fontSize:7.5,fontWeight:1000,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",maxWidth:"58%"}}>{scoreLine}</div>:null}</div>
    {(Array.isArray(rows)?rows:[]).slice().sort((a:any,b:any)=>n(a?.rank)-n(b?.rank)).map((row:any,index:number)=><div key={row?.id||index} style={{display:"grid",gridTemplateColumns:"28px minmax(0,1fr) auto",gap:7,alignItems:"center",padding:7,borderRadius:11,background:"rgba(255,255,255,.035)",border:"1px solid rgba(255,255,255,.08)"}}>
      <strong style={{color:n(row?.rank)===1?GOLD:SOFT}}>#{n(row?.rank)||index+1}</strong>
      <div style={{minWidth:0}}><div style={{whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",fontWeight:950}}>{row?.name||"Joueur"}</div><div style={{marginTop:2,color:SOFT,fontSize:7.2}}>{n(row?.shipHits)} impacts · {n(row?.perfectVisits)} parfaite{n(row?.perfectVisits)>1?"s":""} · série {n(row?.bestHitStreak)}</div></div>
      <div style={{textAlign:"right"}}><strong style={{display:"block",color:RED}}>{n(row?.shipsSunk)} nav.</strong><span style={{color:GREEN,fontSize:7.5}}>{n(row?.validShots)>0?`${Math.round(n(row?.shipHits)/n(row?.validShots)*1000)/10}%`:"0%"}</span></div>
    </div>)}
  </div>;
}
