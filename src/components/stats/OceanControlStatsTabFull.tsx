// @ts-nocheck
import React from "react";
import { oceanControlVariantLabel } from "../../lib/gameEngines/oceanControlEngine";
import { oceanControlMissionSummary } from "../../lib/oceanControlMission";
import { oceanControlCompetitiveScore, oceanControlCommandGrade } from "../../lib/oceanControlCompetitive";

const BLUE="#30b9ff",CYAN="#65e9ff",GREEN="#65e5aa",GOLD="#f5ca68",RED="#ff6573",SOFT="#aab4c7";
const n=(v:any)=>Number.isFinite(Number(v))?Number(v):0;
const txt=(v:any)=>String(v??"").trim();
const pct=(a:number,b:number)=>b>0?`${Math.round(a/b*1000)/10}%`:"0%";
const playedAt=(r:any)=>n(r?.finishedAt||r?.endedAt||r?.updatedAt||r?.createdAt);
function isOcean(r:any){return [r?.kind,r?.mode,r?.summary?.kind,r?.summary?.mode,r?.payload?.kind,r?.payload?.mode,r?.payload?.stats?.mode].map(v=>txt(v).toLowerCase()).join("|").includes("ocean_control");}
function pools(r:any){return [r?.summary?.perPlayer,r?.payload?.summary?.perPlayer,r?.payload?.stats?.players,r?.summary?.rankings,r?.payload?.players,r?.summary?.players,r?.players].filter(Array.isArray);}
function findRow(r:any,pid:string,pname?:string){const found:any[]=[];for(const pool of pools(r)){const x=pool.find((q:any)=>txt(q?.id||q?.playerId||q?.profileId)===txt(pid))||(pname?pool.find((q:any)=>txt(q?.name||q?.playerName).toLowerCase()===txt(pname).toLowerCase()):null);if(x)found.push(x);}return found.reduce((a,x)=>({...a,...x}),null);}
function winnerIds(r:any){return [r?.winnerIds,r?.summary?.winnerIds,r?.payload?.winnerIds,r?.winnerId,r?.summary?.winnerId].flatMap((v:any)=>Array.isArray(v)?v:v?[v]:[]).map(String);}
function primaryPool(r:any,pid:string,pname?:string){for(const pool of pools(r)){const found=pool.some((q:any)=>txt(q?.id||q?.playerId||q?.profileId)===txt(pid)||(pname&&txt(q?.name||q?.playerName).toLowerCase()===txt(pname).toLowerCase()));if(found)return pool;}return [];}

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
 const commandScore=Math.round(accuracyValue*.5+winRate*.15+Math.min(20,(ships/Math.max(1,games))*7)+Math.min(10,(perfectVisits/Math.max(1,games))*4)+Math.min(5,contacts/Math.max(1,games)));
 const commandGrade=commandScore>=86?"S":commandScore>=72?"A":commandScore>=58?"B":commandScore>=44?"C":"D";
 const commandGradeColor=commandGrade==="S"?GOLD:commandGrade==="A"?GREEN:commandGrade==="B"?BLUE:commandGrade==="C"?CYAN:SOFT;
 const profile=tacticalProfile({ accuracy: accuracyValue, sonarRate, strikeRate, ships, wins });
 const impacts:any={Simple:rows.reduce((s:number,r:any)=>s+n(r?.singles),0),Double:rows.reduce((s:number,r:any)=>s+n(r?.doubles),0),Triple:rows.reduce((s:number,r:any)=>s+n(r?.triples),0),Bull:rows.reduce((s:number,r:any)=>s+n(r?.bulls),0),DBull:rows.reduce((s:number,r:any)=>s+n(r?.dbulls),0),Miss:rows.reduce((s:number,r:any)=>s+n(r?.misses),0)};
 const maxImpact=Math.max(1,...Object.values(impacts).map(n));
 const favWeapon=Object.entries(impacts).sort((a:any,b:any)=>n(b[1])-n(a[1]))[0]?.[0]||"—";
 const shotMap:any={}; const hitMap:any={};
 rows.forEach((row:any)=>{
  Object.entries(row?.shotsBySegment||{}).forEach(([segment,value]:any)=>{shotMap[segment]=(shotMap[segment]||0)+n(value)});
  Object.entries(row?.hitsBySegment||{}).forEach(([segment,value]:any)=>{hitMap[segment]=(hitMap[segment]||0)+n(value)});
 });
 const maxZoneShots=Math.max(1,...Array.from({length:20},(_,index)=>n(shotMap[String(index+1)])));
 const hotZones=Array.from({length:20},(_,index)=>({segment:String(index+1),shots:n(shotMap[String(index+1)]),hits:n(hitMap[String(index+1)])})).sort((a:any,b:any)=>b.shots-a.shots||b.hits-a.hits||n(a.segment)-n(b.segment)).slice(0,5);
 const variants:any={};matches.forEach(({record}:any)=>{const v=record?.summary?.variant||record?.payload?.config?.variant||"tactical";variants[v]=(variants[v]||0)+1;});
 const recentAccuracy=matches.slice(0,8).map(({row}:any)=>n(row?.validShots)>0?Math.round(n(row?.shipHits)/n(row?.validShots)*100):0);
 const trendMax=Math.max(1,...recentAccuracy);
 const commandDna=[
  {label:"PRÉCISION",value:Math.max(0,Math.min(100,accuracyValue)),color:GREEN},
  {label:"PUISSANCE",value:Math.min(100,Math.round((ships/Math.max(1,games))*24+(hits/Math.max(1,valid))*45)),color:RED},
  {label:"SONAR",value:sonars>0?Math.min(100,Math.round((contacts/Math.max(1,sonars*3))*100)):0,color:CYAN},
  {label:"TEMPO",value:visits>0?Math.min(100,Math.round((successfulVisits/Math.max(1,visits))*100)):0,color:BLUE},
  {label:"SÉRIE",value:Math.min(100,bestStreak*20),color:GOLD},
 ];
 const commandSpecialty=commandDna.slice().sort((a:any,b:any)=>b.value-a.value)[0]||commandDna[0];
 const missionSamples=matches.map(({record,row}:any)=>oceanControlMissionSummary(row,record?.summary?.config||record?.payload?.config||{}));
 const missionAverage=missionSamples.length?Math.round(missionSamples.reduce((sum:number,item:any)=>sum+n(item?.percent),0)/missionSamples.length):0;
 const missionPerfect=missionSamples.filter((item:any)=>n(item?.percent)>=100).length;
 const missionCompleted=missionSamples.reduce((sum:number,item:any)=>sum+n(item?.completed),0);
 const missionPossible=missionSamples.reduce((sum:number,item:any)=>sum+n(item?.total),0);
 const missionById:any={};
 missionSamples.forEach((sample:any)=>sample.objectives.forEach((objective:any)=>{const current=missionById[objective.id]||{...objective,completed:0,attempts:0};current.completed+=objective.complete?1:0;current.attempts+=1;missionById[objective.id]=current;}));
 const missionObjectiveStats=Object.values(missionById).map((objective:any)=>({...objective,rate:objective.attempts?Math.round(objective.completed/objective.attempts*100):0})).sort((a:any,b:any)=>b.rate-a.rate||a.label.localeCompare(b.label));
 const competitiveSamples=matches.map(({record,row}:any)=>{
  const config=record?.summary?.config||record?.payload?.config||{};
  const won=row?.win===true||row?.winner===true||winnerIds(record).includes(String(playerId));
  const snapshot=oceanControlCompetitiveScore(row,config,{won});
  const score=n(row?.commandScore)>0?n(row?.commandScore):snapshot.score;
  const gradeInfo=oceanControlCommandGrade(score);
  return {score,grade:row?.commandGrade||gradeInfo.grade,color:row?.commandGradeColor||gradeInfo.color,playedAt:playedAt(record)};
 });
 const competitiveAverage=competitiveSamples.length?Math.round(competitiveSamples.reduce((sum:number,item:any)=>sum+n(item.score),0)/competitiveSamples.length):0;
 const competitiveBest=competitiveSamples.reduce((best:number,item:any)=>Math.max(best,n(item.score)),0);
 const competitiveGrade=oceanControlCommandGrade(competitiveAverage);
 const gradeDistribution=["S","A","B","C","D"].map((grade)=>({grade,count:competitiveSamples.filter((item:any)=>item.grade===grade).length}));
 const recentCompetitive=competitiveSamples.slice(0,8);
 const recordBestAccuracy=matches.reduce((best:any,item:any)=>{const value=n(item?.row?.validShots)>0?Math.round(n(item.row.shipHits)/n(item.row.validShots)*1000)/10:0;return value>n(best?.value)?{value,item}:best;},{value:0,item:null});
 const recordBestShips=matches.reduce((best:any,item:any)=>n(item?.row?.shipsSunk)>n(best?.value)?{value:n(item.row.shipsSunk),item}:best,{value:0,item:null});
 const recordBestSonar=matches.reduce((best:any,item:any)=>n(item?.row?.sonarContacts)>n(best?.value)?{value:n(item.row.sonarContacts),item}:best,{value:0,item:null});
 const recordBestPerfect=matches.reduce((best:any,item:any)=>n(item?.row?.perfectVisits)>n(best?.value)?{value:n(item.row.perfectVisits),item}:best,{value:0,item:null});
 const recordBestStreak=matches.reduce((best:any,item:any)=>n(item?.row?.bestHitStreak)>n(best?.value)?{value:n(item.row.bestHitStreak),item}:best,{value:0,item:null});
 const recordBestMission=missionSamples.reduce((best:any,item:any,index:number)=>n(item?.percent)>n(best?.value)?{value:n(item.percent),item:matches[index]}:best,{value:0,item:null});
 const rivalryMap:any={};
 matches.forEach(({record,row}:any)=>{
  const pool=primaryPool(record,playerId,playerName);
  const config=record?.summary?.config||record?.payload?.config||{};
  const winners=new Set(winnerIds(record));
  const myWon=row?.win===true||row?.winner===true||winners.has(String(playerId));
  const mySnapshot=oceanControlCompetitiveScore(row,config,{won:myWon});
  const myScore=n(row?.commandScore)>0?n(row.commandScore):mySnapshot.score;
  pool.forEach((opponent:any)=>{
   const opponentId=txt(opponent?.id||opponent?.playerId||opponent?.profileId);
   const opponentName=txt(opponent?.name||opponent?.playerName)||"Adversaire";
   const isSelf=opponentId?opponentId===txt(playerId):(playerName&&opponentName.toLowerCase()===txt(playerName).toLowerCase());
   if(isSelf)return;
   const key=opponentId||`name:${opponentName.toLowerCase()}`;
   const oppWon=opponent?.win===true||opponent?.winner===true||(opponentId&&winners.has(opponentId));
   const oppSnapshot=oceanControlCompetitiveScore(opponent,config,{won:oppWon});
   const oppScore=n(opponent?.commandScore)>0?n(opponent.commandScore):oppSnapshot.score;
   const current=rivalryMap[key]||{id:key,name:opponentName,matches:0,wins:0,losses:0,draws:0,myScoreTotal:0,rivalScoreTotal:0,lastPlayed:0};
   current.matches+=1;
   if(myWon)current.wins+=1;else if(oppWon)current.losses+=1;else current.draws+=1;
   current.myScoreTotal+=myScore;current.rivalScoreTotal+=oppScore;current.lastPlayed=Math.max(current.lastPlayed,playedAt(record));
   rivalryMap[key]=current;
  });
 });
 const rivalries=Object.values(rivalryMap).map((item:any)=>({...item,myAverage:item.matches?Math.round(item.myScoreTotal/item.matches):0,rivalAverage:item.matches?Math.round(item.rivalScoreTotal/item.matches):0,delta:item.matches?Math.round((item.myScoreTotal-item.rivalScoreTotal)/item.matches):0,winRate:item.matches?Math.round(item.wins/item.matches*100):0})).sort((a:any,b:any)=>b.matches-a.matches||Math.abs(a.delta)-Math.abs(b.delta)||b.lastPlayed-a.lastPlayed).slice(0,5);
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
           <Chip label="Grade commandement" value={`${commandGrade} · ${commandScore} pts`} color={commandGradeColor} />
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
   <Section title="Indice compétition" accent={competitiveGrade.color} subtitle={`Moyenne ${competitiveAverage} pts · meilleur ${competitiveBest} pts`}>
     <div style={{display:"grid",gridTemplateColumns:"150px minmax(0,1fr)",gap:10,alignItems:"stretch"}}>
       <div style={{borderRadius:16,padding:12,display:"grid",placeItems:"center",alignContent:"center",textAlign:"center",background:`linear-gradient(180deg,${competitiveGrade.color}12,rgba(255,255,255,.02))`,border:`1px solid ${competitiveGrade.color}40`}}>
         <div style={{color:SOFT,fontSize:6.8,fontWeight:1000,letterSpacing:.5}}>GRADE MOYEN</div>
         <div style={{marginTop:4,color:competitiveGrade.color,fontSize:34,fontWeight:1150,lineHeight:1}}>{competitiveGrade.grade}</div>
         <div style={{marginTop:5,color:"#eef8ff",fontSize:9,fontWeight:1050}}>{competitiveAverage} / 100</div>
         <div style={{marginTop:4,color:SOFT,fontSize:6.8,lineHeight:1.35}}>Indice partie par partie : précision, mission, puissance, sonar, tempo et clutch.</div>
       </div>
       <div style={{display:"grid",gap:8}}>
         <div style={{display:"grid",gridTemplateColumns:"repeat(5,minmax(0,1fr))",gap:6}}>{gradeDistribution.map((item:any)=>{const info=oceanControlCommandGrade(item.grade==="S"?90:item.grade==="A"?78:item.grade==="B"?64:item.grade==="C"?50:30);return <div key={item.grade} style={{borderRadius:12,padding:"8px 6px",textAlign:"center",background:"rgba(255,255,255,.03)",border:`1px solid ${info.color}2f`}}><div style={{color:info.color,fontSize:15,fontWeight:1150}}>{item.grade}</div><div style={{marginTop:2,color:SOFT,fontSize:6.5}}>{item.count} partie{item.count>1?"s":""}</div></div>})}</div>
         <div style={{minHeight:88,display:"grid",gridTemplateColumns:`repeat(${Math.max(1,recentCompetitive.length)},minmax(0,1fr))`,gap:5,alignItems:"end"}}>{recentCompetitive.length?recentCompetitive.map((item:any,index:number)=><div key={index} style={{display:"grid",gap:4,alignItems:"end"}}><div style={{height:Math.max(10,item.score*.68),maxHeight:68,borderRadius:9,background:`linear-gradient(180deg,${item.color},${BLUE})`}}/><div style={{textAlign:"center",color:item.color,fontSize:6.6,fontWeight:1000}}>{item.score}</div></div>):<div style={{color:SOFT,fontSize:8}}>Pas encore de tendance disponible.</div>}</div>
       </div>
     </div>
   </Section>
   <Section title="Records de commandement" accent={GOLD} subtitle="Meilleures performances sur la période">
     <div style={{display:"grid",gridTemplateColumns:"repeat(3,minmax(0,1fr))",gap:7}}>
       <Kpi label="Meilleur indice" value={`${competitiveBest} pts`} detail={`grade ${oceanControlCommandGrade(competitiveBest).grade}`} color={oceanControlCommandGrade(competitiveBest).color}/>
       <Kpi label="Meilleure précision" value={`${recordBestAccuracy.value}%`} detail={recordBestAccuracy.item?new Date(playedAt(recordBestAccuracy.item.record)||Date.now()).toLocaleDateString("fr-FR"):"—"} color={GREEN}/>
       <Kpi label="Navires / partie" value={recordBestShips.value} detail={recordBestShips.item?new Date(playedAt(recordBestShips.item.record)||Date.now()).toLocaleDateString("fr-FR"):"—"} color={RED}/>
       <Kpi label="Contacts sonar" value={recordBestSonar.value} detail="record sur une partie" color={CYAN}/>
       <Kpi label="Meilleure série" value={recordBestStreak.value} detail={`${recordBestPerfect.value} volée(s) parfaite(s)`} color={GOLD}/>
       <Kpi label="Mission record" value={`${recordBestMission.value}%`} detail={recordBestMission.value>=100?"mission parfaite":"objectifs tactiques"} color={recordBestMission.value>=100?GREEN:BLUE}/>
     </div>
   </Section>
   <Section title="Rivalités" accent={RED} subtitle={rivalries.length?`${rivalries.length} adversaire${rivalries.length>1?"s":""} principal${rivalries.length>1?"ux":""}`:"Aucun duel historique exploitable"}>
     {rivalries.length?<div style={{display:"grid",gap:7}}>{rivalries.map((rival:any,index:number)=><div key={rival.id} style={{display:"grid",gridTemplateColumns:"34px minmax(0,1fr) 72px 62px",gap:8,alignItems:"center",padding:9,borderRadius:14,background:index===0?"rgba(255,101,115,.07)":"rgba(255,255,255,.025)",border:`1px solid ${index===0?RED+"3d":"rgba(255,255,255,.08)"}`}}><div style={{width:32,height:32,borderRadius:10,display:"grid",placeItems:"center",color:index===0?RED:SOFT,background:index===0?`${RED}12`:"rgba(255,255,255,.04)",fontWeight:1100}}>VS</div><div style={{minWidth:0}}><div style={{color:"#eef8ff",fontSize:9,fontWeight:1050,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{rival.name}</div><div style={{marginTop:3,color:SOFT,fontSize:7.2}}>{rival.matches} duel{rival.matches>1?"s":""} · {rival.wins} V / {rival.losses} D{rival.draws?` / ${rival.draws} autre`:""} · winrate {rival.winRate}%</div></div><div style={{textAlign:"center"}}><strong style={{display:"block",color:rival.delta>=0?GREEN:RED,fontSize:10}}>{rival.delta>0?"+":""}{rival.delta}</strong><span style={{color:SOFT,fontSize:6.5}}>écart indice</span></div><div style={{textAlign:"right"}}><strong style={{display:"block",color:BLUE,fontSize:9}}>{rival.myAverage}</strong><span style={{color:SOFT,fontSize:6.4}}>vs {rival.rivalAverage}</span></div></div>)}</div>:<div style={{color:SOFT,fontSize:8.5}}>Les rivalités apparaîtront dès que plusieurs parties avec les mêmes adversaires seront présentes dans l’historique.</div>}
   </Section>
   <Section title="ADN de commandement" accent={commandSpecialty.color} subtitle={`Spécialité dominante · ${commandSpecialty.label}`}>
     <div style={{display:"grid",gridTemplateColumns:"minmax(0,1fr) 160px",gap:10,alignItems:"stretch"}}>
       <div style={{display:"grid",gap:8}}>{commandDna.map((metric:any)=><div key={metric.label} style={{display:"grid",gridTemplateColumns:"82px minmax(0,1fr) 34px",gap:8,alignItems:"center"}}><span style={{color:"#c7d4df",fontSize:7.4,fontWeight:1000}}>{metric.label}</span><div style={{height:8,borderRadius:999,overflow:"hidden",background:"rgba(255,255,255,.06)"}}><div style={{height:"100%",width:`${metric.value}%`,background:`linear-gradient(90deg,${metric.color}88,${metric.color})`}}/></div><strong style={{textAlign:"right",color:metric.color,fontSize:8}}>{metric.value}</strong></div>)}</div>
       <div style={{borderRadius:15,padding:11,display:"grid",placeItems:"center",alignContent:"center",textAlign:"center",background:`linear-gradient(180deg,${commandSpecialty.color}12,rgba(255,255,255,.02))`,border:`1px solid ${commandSpecialty.color}40`}}><div style={{color:SOFT,fontSize:6.8,fontWeight:1000}}>SPÉCIALITÉ</div><div style={{marginTop:5,color:commandSpecialty.color,fontSize:13,fontWeight:1100}}>{commandSpecialty.label}</div><div style={{marginTop:4,color:"#eef8ff",fontSize:8.2}}>{commandSpecialty.value}/100</div><div style={{marginTop:5,color:SOFT,fontSize:7,lineHeight:1.35}}>Profil calculé sur la période sélectionnée.</div></div>
     </div>
   </Section>
   <Section title="Maîtrise des objectifs" accent={missionAverage>=80?GREEN:missionAverage>=55?GOLD:BLUE} subtitle={`${missionPerfect} mission${missionPerfect>1?"s":""} parfaite${missionPerfect>1?"s":""}`}>
     <div style={{display:"grid",gridTemplateColumns:"160px minmax(0,1fr)",gap:10,alignItems:"stretch"}}>
       <div style={{borderRadius:16,padding:12,display:"grid",alignContent:"center",textAlign:"center",background:`linear-gradient(180deg,${missionAverage>=80?GREEN:GOLD}10,rgba(255,255,255,.02))`,border:`1px solid ${missionAverage>=80?GREEN:GOLD}38`}}><div style={{color:SOFT,fontSize:6.8,fontWeight:1000,letterSpacing:.45}}>MAÎTRISE MOYENNE</div><div style={{marginTop:4,color:missionAverage>=80?GREEN:GOLD,fontSize:28,fontWeight:1150}}>{missionAverage}%</div><div style={{marginTop:4,color:"#eef8ff",fontSize:7.5}}>{missionCompleted}/{missionPossible} objectifs validés</div><div style={{marginTop:5,color:SOFT,fontSize:6.8,lineHeight:1.35}}>Calculé partie par partie sur la période sélectionnée.</div></div>
       <div style={{display:"grid",gap:7}}>{missionObjectiveStats.map((objective:any)=><div key={objective.id} style={{display:"grid",gridTemplateColumns:"minmax(110px,.7fr) minmax(0,1fr) 42px",gap:8,alignItems:"center"}}><div style={{minWidth:0}}><div style={{display:"flex",gap:5,alignItems:"center"}}><span>{objective.icon}</span><strong style={{minWidth:0,color:"#edf7ff",fontSize:7.5,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{objective.label}</strong></div><div style={{marginTop:2,color:SOFT,fontSize:6.4}}>{objective.completed}/{objective.attempts} parties</div></div><div style={{height:7,borderRadius:999,overflow:"hidden",background:"rgba(255,255,255,.06)"}}><div style={{height:"100%",width:`${objective.rate}%`,background:`linear-gradient(90deg,${objective.color}88,${objective.color})`}}/></div><strong style={{textAlign:"right",color:objective.color,fontSize:7.5}}>{objective.rate}%</strong></div>)}</div>
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
   <Section title="Heatmap des secteurs" accent={RED} subtitle="Pression de tir cumulée sur les zones 1 à 20">
     <div style={{display:"grid",gridTemplateColumns:"repeat(5,minmax(0,1fr))",gap:6}}>{Array.from({length:20},(_,index)=>{const segment=String(index+1);const shots=n(shotMap[segment]);const zoneHits=n(hitMap[segment]);const heat=shots/maxZoneShots;return <div key={segment} style={{position:"relative",overflow:"hidden",minHeight:54,borderRadius:13,padding:8,background:`linear-gradient(180deg,rgba(255,101,115,${0.04+heat*.18}),rgba(48,185,255,.035))`,border:`1px solid rgba(255,101,115,${0.08+heat*.42})`}}><div style={{position:"absolute",inset:"auto 0 0",height:`${Math.max(6,heat*100)}%`,background:"linear-gradient(180deg,transparent,rgba(255,101,115,.11))",pointerEvents:"none"}}/><div style={{position:"relative",zIndex:1,display:"flex",justifyContent:"space-between",alignItems:"center",gap:6}}><strong style={{color:heat>.66?RED:heat>.33?GOLD:"#eef8ff",fontSize:14}}>{segment}</strong><span style={{color:SOFT,fontSize:6.8}}>{shots} tirs</span></div><div style={{position:"relative",zIndex:1,marginTop:8,height:5,borderRadius:999,overflow:"hidden",background:"rgba(255,255,255,.06)"}}><div style={{height:"100%",width:`${Math.min(100,heat*100)}%`,background:`linear-gradient(90deg,${BLUE},${GOLD},${RED})`}}/></div><div style={{position:"relative",zIndex:1,marginTop:4,color:GREEN,fontSize:6.7,fontWeight:1000}}>{zoneHits} impacts</div></div>})}</div>
     <div style={{marginTop:9,display:"flex",gap:6,flexWrap:"wrap"}}>{hotZones.filter((zone:any)=>zone.shots>0).map((zone:any,index:number)=><Chip key={zone.segment} label={index===0?`Zone favorite ${zone.segment}`:`Zone ${zone.segment}`} value={`${zone.shots} tirs · ${zone.hits} hits`} color={index===0?RED:GOLD} />)}</div>
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
