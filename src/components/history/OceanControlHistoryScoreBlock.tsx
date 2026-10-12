// @ts-nocheck
import React from "react";
import { oceanControlVariantLabel } from "../../lib/gameEngines/oceanControlEngine";

const BLUE="#30b9ff",CYAN="#65e9ff",GREEN="#65e5aa",GOLD="#f5ca68",RED="#ff6573",SOFT="#aab4c7";
const n=(v:any)=>Number.isFinite(Number(v))?Number(v):0;

export default function OceanControlHistoryScoreBlock({record}:any){
  const summary=record?.summary||record?.payload?.summary||{};
  const config=summary?.config||record?.payload?.config||{};
  const variant=summary?.variant||record?.payload?.variant||record?.payload?.config?.variant||"tactical";
  const rows=(summary?.rankings||summary?.perPlayer||record?.payload?.stats?.players||record?.players||[]).slice().sort((a:any,b:any)=>n(a?.rank)-n(b?.rank));
  const scoreByOwner=summary?.scoreByOwner||record?.payload?.summary?.scoreByOwner||{};
  const scoreLine=Object.keys(scoreByOwner).length?Object.entries(scoreByOwner).map(([id,value])=>`${String(id).replace(/^fleet-|^team-/i,"")} ${n(value)}`).join(" · "):summary?.scoreLine;
  const battleHistory=(summary?.battleHistory||record?.payload?.battleHistory||[]).slice().reverse().slice(0,3);
  const totalHits=rows.reduce((s:number,row:any)=>s+n(row?.shipHits),0);
  const totalShips=rows.reduce((s:number,row:any)=>s+n(row?.shipsSunk),0);
  const totalSonars=rows.reduce((s:number,row:any)=>s+n(row?.sonarUses),0);
  const shotMap:Record<string,number>={}; const hitMap:Record<string,number>={};
  rows.forEach((row:any)=>{
    Object.entries(row?.shotsBySegment||{}).forEach(([segment,value])=>{shotMap[segment]=(shotMap[segment]||0)+n(value)});
    Object.entries(row?.hitsBySegment||{}).forEach(([segment,value])=>{hitMap[segment]=(hitMap[segment]||0)+n(value)});
  });
  const hotZones=Object.entries(shotMap).map(([segment,value])=>({segment,value:n(value),hits:n(hitMap[segment])})).filter((row:any)=>row.value>0).sort((a:any,b:any)=>b.value-a.value||n(a.segment)-n(b.segment)).slice(0,4);
  const winner=rows.find((row:any)=>n(row?.rank)===1||row?.winner||row?.win)||rows[0];
  const winnerAccuracy=winner&&n(winner?.validShots)>0?Math.round(n(winner?.shipHits)/n(winner?.validShots)*1000)/10:0;
  const gradeScore=winner?Math.round(winnerAccuracy*.5+Math.min(25,n(winner?.shipsSunk)*7)+Math.min(12,n(winner?.perfectVisits)*4)+Math.min(8,n(winner?.sonarContacts))+10):0;
  const grade=gradeScore>=86?"S":gradeScore>=72?"A":gradeScore>=58?"B":gradeScore>=44?"C":"D";
  const gradeColor=grade==="S"?GOLD:grade==="A"?GREEN:grade==="B"?BLUE:grade==="C"?CYAN:SOFT;
  return <div style={{marginTop:8,display:"grid",gap:7}}>
    <div style={{display:"flex",justifyContent:"space-between",gap:8,alignItems:"center",flexWrap:"wrap"}}>
      <div style={{color:CYAN,fontSize:9,fontWeight:1100}}>⚓ {oceanControlVariantLabel(variant)}</div>
      <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
        <span style={{borderRadius:999,padding:"4px 7px",fontSize:7,fontWeight:1000,color:RED,border:`1px solid ${RED}44`,background:`${RED}10`}}>💥 {totalShips} nav.</span>
        <span style={{borderRadius:999,padding:"4px 7px",fontSize:7,fontWeight:1000,color:BLUE,border:`1px solid ${BLUE}44`,background:`${BLUE}10`}}>🎯 {totalHits} impacts</span>
        <span style={{borderRadius:999,padding:"4px 7px",fontSize:7,fontWeight:1000,color:CYAN,border:`1px solid ${CYAN}44`,background:`${CYAN}10`}}>📡 {totalSonars} sonars</span>
      </div>
    </div>
    <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
      <span style={{borderRadius:999,padding:"4px 7px",fontSize:6.8,fontWeight:1000,color:CYAN,border:"1px solid rgba(101,233,255,.22)",background:"rgba(101,233,255,.07)"}}>⚓ {String(config?.fleetPreset||"standard").toUpperCase()}</span>
      <span style={{borderRadius:999,padding:"4px 7px",fontSize:6.8,fontWeight:1000,color:GOLD,border:"1px solid rgba(245,202,104,.22)",background:"rgba(245,202,104,.07)"}}>BO{n(config?.winsNeeded||1)*2-1}</span>
      <span style={{borderRadius:999,padding:"4px 7px",fontSize:6.8,fontWeight:1000,color:GREEN,border:"1px solid rgba(101,229,170,.22)",background:"rgba(101,229,170,.07)"}}>{String(config?.difficulty||"captain").toUpperCase()}</span>
    </div>
    {scoreLine?<div style={{borderRadius:12,padding:"8px 10px",background:"linear-gradient(180deg,rgba(255,255,255,.04),rgba(0,0,0,.18))",border:"1px solid rgba(255,255,255,.08)",color:GOLD,fontSize:7.8,fontWeight:1000}}>{scoreLine}</div>:null}
    {winner?<div style={{display:"grid",gridTemplateColumns:"48px minmax(0,1fr) auto",gap:8,alignItems:"center",padding:8,borderRadius:12,background:`linear-gradient(135deg,${gradeColor}10,rgba(255,255,255,.02))`,border:`1px solid ${gradeColor}44`}}><div style={{width:42,height:42,borderRadius:12,display:"grid",placeItems:"center",background:`${gradeColor}12`,border:`1px solid ${gradeColor}44`,color:gradeColor,fontSize:22,fontWeight:1150}}>{grade}</div><div style={{minWidth:0}}><div style={{color:gradeColor,fontSize:7.4,fontWeight:1100,letterSpacing:.45}}>DÉBRIEF COMMANDANT</div><div style={{marginTop:2,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",fontSize:8.4,fontWeight:1000}}>{winner?.name||"Joueur"}</div><div style={{marginTop:2,color:SOFT,fontSize:6.8}}>{winnerAccuracy}% précision · {n(winner?.sonarContacts)} contacts · série {n(winner?.bestHitStreak)}</div></div><div style={{textAlign:"right",color:SOFT,fontSize:6.6}}>{gradeScore}<br/>pts</div></div>:null}
    {hotZones.length?<div style={{display:"grid",gridTemplateColumns:`repeat(${hotZones.length},minmax(0,1fr))`,gap:6}}>{hotZones.map((zone:any,index:number)=><div key={zone.segment} style={{padding:"7px 6px",borderRadius:11,textAlign:"center",background:index===0?`${RED}10`:"rgba(255,255,255,.025)",border:`1px solid ${index===0?RED+"44":"rgba(255,255,255,.07)"}`}}><div style={{color:index===0?RED:"#fff",fontSize:12,fontWeight:1100}}>Zone {zone.segment}</div><div style={{marginTop:2,color:SOFT,fontSize:6.7}}>{zone.value} tirs · {zone.hits} hits</div></div>)}</div>:null}
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
