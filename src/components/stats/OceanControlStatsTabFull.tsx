// @ts-nocheck
import React from "react";
import { oceanControlVariantLabel } from "../../lib/gameEngines/oceanControlEngine";

const BLUE="#30b9ff",CYAN="#65e9ff",GREEN="#65e5aa",GOLD="#f5ca68",RED="#ff6573",SOFT="#aab4c7";
const n=(v:any)=>Number.isFinite(Number(v))?Number(v):0;
const txt=(v:any)=>String(v??"").trim();
const pct=(a:number,b:number)=>b>0?`${Math.round(a/b*1000)/10}%`:"0%";
const playedAt=(r:any)=>n(r?.finishedAt||r?.endedAt||r?.updatedAt||r?.createdAt);
function isOcean(r:any){return [r?.kind,r?.mode,r?.summary?.kind,r?.summary?.mode,r?.payload?.kind,r?.payload?.mode,r?.payload?.stats?.mode].map(v=>txt(v).toLowerCase()).join("|").includes("ocean_control");}
function pools(r:any){return [r?.summary?.perPlayer,r?.payload?.summary?.perPlayer,r?.payload?.stats?.players,r?.summary?.rankings,r?.payload?.players,r?.summary?.players,r?.players].filter(Array.isArray);}
function findRow(r:any,pid:string,pname?:string){const found:any[]=[];for(const pool of pools(r)){const x=pool.find((q:any)=>txt(q?.id||q?.playerId||q?.profileId)===txt(pid))||(pname?pool.find((q:any)=>txt(q?.name||q?.playerName).toLowerCase()===txt(pname).toLowerCase()):null);if(x)found.push(x);}return found.reduce((a,x)=>({...a,...x}),null);}
function winnerIds(r:any){return [r?.winnerIds,r?.summary?.winnerIds,r?.payload?.winnerIds,r?.winnerId,r?.summary?.winnerId].flatMap((v:any)=>Array.isArray(v)?v:v?[v]:[]).map(String);}

function Kpi({label,value,detail,color=BLUE}:any){return <div style={{borderRadius:16,border:"1px solid rgba(255,255,255,.09)",background:"linear-gradient(180deg,rgba(255,255,255,.05),rgba(0,0,0,.24))",padding:10,minWidth:0}}><div style={{color:SOFT,fontSize:8,fontWeight:1000,textTransform:"uppercase"}}>{label}</div><div style={{marginTop:4,color,fontSize:20,fontWeight:1100}}>{value}</div>{detail?<div style={{marginTop:3,color:"#818b9c",fontSize:8.2}}>{detail}</div>:null}</div>}
function Section({title,children,accent=BLUE,subtitle}:any){return <section style={{marginTop:12,borderRadius:18,border:"1px solid rgba(255,255,255,.08)",background:"rgba(255,255,255,.025)",padding:12}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:8,marginBottom:8}}><div style={{color:accent,fontSize:9.5,fontWeight:1000,textTransform:"uppercase",letterSpacing:.65}}>{title}</div>{subtitle?<div style={{color:SOFT,fontSize:7.8}}>{subtitle}</div>:null}</div>{children}</section>}
function Bar({label,value,max,color=BLUE,detail}:any){const width=max>0?Math.min(100,n(value)/max*100):0;return <div style={{display:"grid",gridTemplateColumns:"120px minmax(0,1fr) 54px",gap:8,alignItems:"center"}}><div style={{minWidth:0}}><div style={{color:"#c7cfda",fontSize:8.7,fontWeight:900,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{label}</div>{detail?<div style={{color:SOFT,fontSize:7}}>{detail}</div>:null}</div><div style={{height:8,borderRadius:999,overflow:"hidden",background:"rgba(255,255,255,.07)"}}><div style={{height:"100%",width:`${width}%`,background:`linear-gradient(90deg,${color}99,${color})`}}/></div><div style={{textAlign:"right",color,fontSize:8.8,fontWeight:1000}}>{value}</div></div>}
function Chip({label,value,color=BLUE}:any){return <div style={{borderRadius:12,padding:"8px 10px",border:"1px solid rgba(255,255,255,.09)",background:"rgba(255,255,255,.035)"}}><strong style={{color}}>{label}</strong><span style={{marginLeft:7,color:SOFT,fontSize:9}}>{value}</span></div>}

function tacticalProfile({ accuracy, sonarRate, strikeRate, ships, wins }: any) {
  if (wins >= 5 && ships >= 10) return { title: "Amiral de flotte", text: "Domination globale sur la durée.", color: GOLD };
  if (accuracy >= 55) return { title: "Sniper marin", text: "Grande précision sur les impacts directs.", color: GREEN };
  if (sonarRate >= 1.4) return { title: "Éclaireur sonar", text: "Usage du sonar au cœur de la tactique.", color: CYAN };
  if (strikeRate >= 0.35) return { title: "Chasseur DBULL", text: "Forte utilisation des frappes de précision.", color: RED };
  return { title: "Capitaine polyvalent", text: "Profil équilibré en progression.", color: BLUE };
}

export default function OceanControlStatsTabFull({records=[],playerId,playerName}:any){
 const [range,setRange]=React.useState("all");
 const now=Date.now(); const ranges:any={day:86400000,week:7*86400000,month:31*86400000,year:366*86400000};
 const matches=(records||[]).filter(isOcean).map((record:any)=>({record,row:findRow(record,playerId,playerName)})).filter((x:any)=>x.row).filter((x:any)=>range==="all"||playedAt(x.record)>=now-ranges[range]).sort((a:any,b:any)=>playedAt(b.record)-playedAt(a.record));
 const rows=matches.map((x:any)=>x.row),games=matches.length,wins=matches.filter(({record,row}:any)=>row?.win===true||winnerIds(record).includes(String(playerId))).length;
 const darts=rows.reduce((s:number,r:any)=>s+n(r?.darts),0),valid=rows.reduce((s:number,r:any)=>s+n(r?.validShots),0),hits=rows.reduce((s:number,r:any)=>s+n(r?.shipHits),0),ships=rows.reduce((s:number,r:any)=>s+n(r?.shipsSunk),0),sonars=rows.reduce((s:number,r:any)=>s+n(r?.sonarUses),0),contacts=rows.reduce((s:number,r:any)=>s+n(r?.sonarContacts),0),strikes=rows.reduce((s:number,r:any)=>s+n(r?.precisionStrikes),0),water=rows.reduce((s:number,r:any)=>s+n(r?.waterShots),0),duplicates=rows.reduce((s:number,r:any)=>s+n(r?.duplicateShots),0),successfulVisits=rows.reduce((s:number,r:any)=>s+n(r?.successfulVisits),0),perfectVisits=rows.reduce((s:number,r:any)=>s+n(r?.perfectVisits),0),multiHitVisits=rows.reduce((s:number,r:any)=>s+n(r?.multiHitVisits),0),bestStreak=rows.reduce((best:number,r:any)=>Math.max(best,n(r?.bestHitStreak)),0),bestVisitHits=rows.reduce((best:number,r:any)=>Math.max(best,n(r?.bestVisitHits)),0),visits=rows.reduce((s:number,r:any)=>s+n(r?.visits),0);
 const accuracyValue=valid>0?Math.round(hits/valid*1000)/10:0; const winRate=games>0?Math.round(wins/games*1000)/10:0; const sonarRate=games>0?Math.round(sonars/games*10)/10:0; const strikeRate=valid>0?Math.round(strikes/valid*1000)/1000:0;
 const profile=tacticalProfile({ accuracy: accuracyValue, sonarRate, strikeRate, ships, wins });
 const impacts:any={Simple:rows.reduce((s:number,r:any)=>s+n(r?.singles),0),Double:rows.reduce((s:number,r:any)=>s+n(r?.doubles),0),Triple:rows.reduce((s:number,r:any)=>s+n(r?.triples),0),Bull:rows.reduce((s:number,r:any)=>s+n(r?.bulls),0),DBull:rows.reduce((s:number,r:any)=>s+n(r?.dbulls),0),Miss:rows.reduce((s:number,r:any)=>s+n(r?.misses),0)};
 const maxImpact=Math.max(1,...Object.values(impacts).map(n));
 const favWeapon=Object.entries(impacts).sort((a:any,b:any)=>n(b[1])-n(a[1]))[0]?.[0]||"—";
 const variants:any={};matches.forEach(({record}:any)=>{const v=record?.summary?.variant||record?.payload?.config?.variant||"tactical";variants[v]=(variants[v]||0)+1;});
 const recentAccuracy=matches.slice(0,8).map(({row}:any)=>n(row?.validShots)>0?Math.round(n(row?.shipHits)/n(row?.validShots)*100):0);
 const trendMax=Math.max(1,...recentAccuracy);
 return <div style={{width:"100%",maxWidth:980,margin:"0 auto"}}>
  <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>{[["all","Tout"],["day","24 h"],["week","7 j"],["month","30 j"],["year","1 an"]].map(([key,label])=><button key={key} onClick={()=>setRange(key)} style={{borderRadius:999,padding:"6px 10px",border:`1px solid ${range===key?BLUE:"rgba(255,255,255,.10)"}`,background:range===key?`${BLUE}18`:"rgba(255,255,255,.03)",color:range===key?CYAN:SOFT,fontWeight:1000,fontSize:9}}>{label}</button>)}</div>
  {!games?<div style={{marginTop:16,borderRadius:18,padding:18,textAlign:"center",color:SOFT,border:"1px solid rgba(255,255,255,.08)",background:"rgba(255,255,255,.025)"}}>Aucune partie OCEAN CONTROL exploitable pour ce joueur.</div>:<>
   <Section title="Profil tactique" accent={profile.color} subtitle={`${games} partie${games>1?"s":""} analysée${games>1?"s":""}`}>
     <div style={{display:"grid",gridTemplateColumns:"minmax(0,1.3fr) minmax(0,1fr)",gap:10,alignItems:"stretch"}}>
       <div style={{borderRadius:16,padding:12,background:`linear-gradient(180deg,${profile.color}14,rgba(255,255,255,.02))`,border:`1px solid ${profile.color}40`}}>
         <div style={{color:profile.color,fontSize:10,fontWeight:1100,letterSpacing:.55,textTransform:"uppercase"}}>{profile.title}</div>
         <div style={{marginTop:5,color:"#eef8ff",fontSize:9.2,lineHeight:1.45}}>{profile.text}</div>
         <div style={{marginTop:8,display:"flex",gap:6,flexWrap:"wrap"}}>
           <Chip label="Winrate" value={`${winRate}%`} color={GREEN} />
           <Chip label="Arme favorite" value={favWeapon} color={BLUE} />
           <Chip label="Sonar / partie" value={sonarRate} color={CYAN} />
         </div>
       </div>
       <div style={{display:"grid",gridTemplateColumns:"repeat(2,minmax(0,1fr))",gap:7}}>
         <Kpi label="Parties" value={games} />
         <Kpi label="Victoires" value={wins} detail={`${winRate}%`} color={GREEN} />
         <Kpi label="Précision" value={`${accuracyValue}%`} detail={`${hits}/${valid} tirs`} color={GREEN} />
         <Kpi label="Navires coulés" value={ships} color={RED} />
       </div>
     </div>
   </Section>
   <div style={{marginTop:10,display:"grid",gridTemplateColumns:"repeat(4,minmax(0,1fr))",gap:7}}>
     <Kpi label="Sonars" value={sonars} detail={`${contacts} contacts`} color={CYAN}/>
     <Kpi label="DBULL" value={strikes} detail={`${Math.round(strikeRate*100)}% des tirs`} color={GOLD}/>
     <Kpi label="Volées parfaites" value={perfectVisits} detail={`${multiHitVisits} multi-impacts`} color={GREEN}/>
     <Kpi label="Meilleure série" value={bestStreak} detail={`${bestVisitHits} hits / volée`} color={GOLD}/>
     <Kpi label="Volées réussies" value={successfulVisits} detail={`${visits||0} volées`} color={BLUE}/>
     <Kpi label="À l’eau" value={water} color={BLUE}/>
     <Kpi label="Doublons" value={duplicates} color={RED}/>
     <Kpi label="Fléchettes" value={darts} color="#fff"/>
   </div>
   <Section title="Efficacité tactique" accent={GREEN} subtitle="Lecture rapide des rendements clés">
     <div style={{display:"grid",gap:8}}>
       <Bar label="Volées avec impact" value={successfulVisits} max={Math.max(1,visits)} color={BLUE} detail={pct(successfulVisits,visits)} />
       <Bar label="Volées parfaites" value={perfectVisits} max={Math.max(1,successfulVisits)} color={GREEN} detail={pct(perfectVisits,Math.max(1,successfulVisits))} />
       <Bar label="Multi-impacts" value={multiHitVisits} max={Math.max(1,successfulVisits)} color={GOLD} detail={pct(multiHitVisits,Math.max(1,successfulVisits))} />
       <Bar label="Contacts sonar" value={contacts} max={Math.max(1,sonars*5)} color={CYAN} detail={`${sonars} balayages`} />
       <Bar label="Frappes DBULL" value={strikes} max={Math.max(1,valid)} color={RED} detail={pct(strikes,Math.max(1,valid))} />
     </div>
   </Section>
   <Section title="Répartition des armes" accent={CYAN} subtitle="Volume d’utilisation cumulé">
     <div style={{display:"grid",gap:7}}>{Object.entries(impacts).map(([key,value]:any)=><Bar key={key} label={key} value={value} max={maxImpact} color={key==="DBull"?GOLD:key==="Bull"?CYAN:key==="Miss"?RED:BLUE} />)}</div>
   </Section>
   <Section title="Variantes jouées" accent={GOLD}>{Object.keys(variants).length ? <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>{Object.entries(variants).map(([key,value]:any)=><Chip key={key} label={oceanControlVariantLabel(key)} value={`${value} partie${n(value)>1?"s":""}`} color={GOLD} />)}</div> : <div style={{color:SOFT,fontSize:9}}>Aucune variante exploitable.</div>}</Section>
   <Section title="Tendance récente" accent={BLUE} subtitle="Précision des 8 dernières parties">
     <div style={{display:"grid",gridTemplateColumns:"repeat(8,minmax(0,1fr))",gap:6,alignItems:"end",minHeight:120}}>{recentAccuracy.map((value:number,index:number)=><div key={index} style={{display:"grid",gap:5,alignItems:"end"}}><div style={{height:Math.max(10,(value/Math.max(1,trendMax))*84),borderRadius:10,background:`linear-gradient(180deg,${BLUE},${CYAN})`}}/><div style={{textAlign:"center",color:value>=50?GREEN:SOFT,fontSize:7.2,fontWeight:1000}}>{value}%</div></div>)}</div>
   </Section>
   <Section title="Parties récentes" accent={BLUE}>
     <div style={{display:"grid",gap:7}}>{matches.slice(0,12).map(({record,row}:any,index:number)=>{const won=row?.win===true||winnerIds(record).includes(String(playerId));const variant=record?.summary?.variant||record?.payload?.config?.variant||"tactical";return <div key={record?.id||index} style={{display:"grid",gridTemplateColumns:"42px minmax(0,1fr) auto",gap:8,alignItems:"center",padding:9,borderRadius:14,border:`1px solid ${won?BLUE+"66":"rgba(255,255,255,.08)"}`,background:won?`${BLUE}0c`:"rgba(255,255,255,.025)"}}><div style={{width:38,height:38,borderRadius:12,display:"grid",placeItems:"center",background:won?BLUE:"rgba(255,255,255,.06)",color:won?"#03121e":"#d1d8e2",fontSize:9,fontWeight:1100}}>{won?"WIN":"—"}</div><div><div style={{fontWeight:1000,fontSize:10}}>{new Date(playedAt(record)||Date.now()).toLocaleDateString("fr-FR")} · {oceanControlVariantLabel(variant)}</div><div style={{color:SOFT,fontSize:8.8}}>{n(row?.shipsSunk)} navires · {n(row?.perfectVisits)} parfaites · série {n(row?.bestHitStreak)} · {pct(n(row?.shipHits),n(row?.validShots))}</div></div><strong style={{color:RED,fontSize:17}}>{n(row?.shipHits)} hits</strong></div>})}</div>
   </Section>
  </>}</div>;
}
