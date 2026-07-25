import React from "react";
import SparklinePro from "../SparklinePro";

const C = {
  runner: "#ff5d9e",
  chaser: "#42d6ff",
  gold: "#ffd76a",
  text: "#f8fafc",
  soft: "rgba(226,232,240,.70)",
};

type Tab = "resume" | "evolution" | "roles" | "precision" | "matches";

type Props = { records: any[]; playerId: string };

const card: React.CSSProperties = {
  borderRadius: 18,
  border: "1px solid rgba(255,255,255,.10)",
  background: "linear-gradient(180deg,rgba(255,255,255,.055),rgba(0,0,0,.18))",
  boxShadow: "0 12px 28px rgba(0,0,0,.28)",
};

function lc(v: any) { return String(v ?? "").toLowerCase(); }
function n(v: any, fallback = 0) { const x = Number(v); return Number.isFinite(x) ? x : fallback; }
function r1(v: number) { return Math.round((Number(v) || 0) * 10) / 10; }
function same(a: any, b: any) { return String(a ?? "") === String(b ?? ""); }
function modeOk(rec: any) {
  const blob = [rec?.kind,rec?.mode,rec?.game,rec?.summary?.mode,rec?.payload?.kind,rec?.payload?.mode,rec?.payload?.summary?.mode].filter(Boolean).map(lc).join(" ");
  return ["attrape_moi","attrape moi","attrape-moi","attrapemoi","catch me","catchme"].some((x)=>blob.includes(x));
}
function pools(rec: any) {
  return [rec?.payload?.stats?.players,rec?.payload?.players,rec?.summary?.players,rec?.summary?.perPlayer,rec?.players].filter(Array.isArray);
}
function playerRow(rec: any, playerId: string) {
  for (const arr of pools(rec)) {
    const hit = arr.find((p:any)=>same(p?.id ?? p?.playerId ?? p?.profileId, playerId));
    if (hit) return hit;
  }
  return null;
}
function entities(rec: any) {
  const s = rec?.summary || rec?.payload?.summary || {};
  const src = s?.entities || s?.standings || rec?.payload?.stats?.entities || [];
  return Array.isArray(src) ? src : [];
}
function entityFor(rec: any, pl: any) {
  const id = String(pl?.entityId ?? pl?.teamId ?? "");
  const arr = entities(rec);
  if (id) {
    const hit = arr.find((e:any)=>same(e?.id,id));
    if (hit) return hit;
  }
  const pid = String(pl?.id ?? pl?.playerId ?? pl?.profileId ?? "");
  return arr.find((e:any)=>Array.isArray(e?.playerIds) && e.playerIds.some((x:any)=>same(x,pid))) || null;
}
function playedAt(rec: any) {
  const raw = rec?.finishedAt ?? rec?.updatedAt ?? rec?.createdAt ?? rec?.payload?.finishedAt ?? rec?.payload?.createdAt ?? Date.now();
  const x = Number(raw); return Number.isFinite(x) ? x : Date.parse(String(raw)) || Date.now();
}
function fmtDate(ts: number) { try { return new Date(ts).toLocaleDateString("fr-FR",{day:"2-digit",month:"2-digit",year:"2-digit"}); } catch { return "—"; } }

function Kpi({label,value,sub,color=C.gold}:any){return <div style={{...card,padding:"12px 11px",minWidth:0}}><div style={{fontSize:11,color:C.soft,fontWeight:850,lineHeight:1.05}}>{label}</div><div style={{marginTop:5,color,fontSize:24,fontWeight:1100,lineHeight:1}}>{value}</div>{sub?<div style={{marginTop:4,fontSize:9.5,color:"rgba(255,255,255,.52)"}}>{sub}</div>:null}</div>}
function TabBtn({active,label,onClick,color=C.gold}:any){return <button onClick={onClick} style={{flex:"0 0 auto",height:36,padding:"0 12px",borderRadius:999,border:`1px solid ${active?color:"rgba(255,255,255,.12)"}`,background:active?`${color}18`:"rgba(255,255,255,.035)",color:active?color:"rgba(255,255,255,.65)",fontSize:9,fontWeight:1000,letterSpacing:.45}}>{label}</button>}
function MetricBar({label,left,right,leftColor=C.runner,rightColor=C.chaser,leftLabel="FUYARD",rightLabel="CHASSEUR"}:any){const l=Math.max(0,n(left));const rr=Math.max(0,n(right));const max=Math.max(l,rr,1);return <div style={{padding:9,borderRadius:13,background:"rgba(255,255,255,.035)",border:"1px solid rgba(255,255,255,.07)"}}><div style={{display:"flex",justifyContent:"space-between",gap:8,fontSize:9,color:C.soft,fontWeight:900}}><span>{leftLabel} {r1(l)}</span><b style={{color:"#fff"}}>{label}</b><span>{rightLabel} {r1(rr)}</span></div><div style={{marginTop:6,display:"grid",gridTemplateColumns:"1fr 1fr",gap:3,height:9}}><div style={{display:"flex",justifyContent:"flex-end",background:"rgba(255,255,255,.04)",borderRadius:"999px 0 0 999px",overflow:"hidden"}}><div style={{width:`${l/max*100}%`,background:leftColor}}/></div><div style={{background:"rgba(255,255,255,.04)",borderRadius:"0 999px 999px 0",overflow:"hidden"}}><div style={{width:`${rr/max*100}%`,height:"100%",background:rightColor}}/></div></div></div>}
function Bars({rows}: {rows:Array<{label:string,value:number,color:string}>}) { const max=Math.max(1,...rows.map(x=>x.value)); return <div style={{display:"grid",gap:7}}>{rows.map((row)=><div key={row.label} style={{display:"grid",gridTemplateColumns:"86px 1fr 42px",gap:8,alignItems:"center"}}><div style={{fontSize:10,color:C.soft,fontWeight:850}}>{row.label}</div><div style={{height:9,borderRadius:999,background:"rgba(255,255,255,.055)",overflow:"hidden"}}><div style={{height:"100%",width:`${row.value/max*100}%`,background:row.color,borderRadius:999}}/></div><div style={{fontSize:11,fontWeight:1000,textAlign:"right"}}>{r1(row.value)}</div></div>)}</div> }

export default function AttrapeMoiStatsTabFull({records,playerId}:Props){
  const [tab,setTab]=React.useState<Tab>("resume");
  const matches=React.useMemo(()=> (records||[]).filter(modeOk).map(rec=>({rec,pl:playerRow(rec,playerId)})).filter((x)=>x.pl).sort((a,b)=>playedAt(a.rec)-playedAt(b.rec)),[records,playerId]);
  const rows=matches;
  const sum=(key:string)=>rows.reduce((a,x)=>a+n(x.pl?.[key]),0);
  const games=rows.length;
  const wins=rows.filter(({rec,pl})=>pl?.winner===true||pl?.win===true||same(rec?.winnerId??rec?.summary?.winnerId??rec?.payload?.winnerId,pl?.entityId??playerId)).length;
  const darts=sum("darts")||sum("dartsThrown"); const points=sum("points")||sum("score"); const visits=sum("visits");
  const runnerPoints=sum("runnerPoints"), chaserPoints=sum("chaserPoints"), runnerDarts=sum("runnerDarts"), chaserDarts=sum("chaserDarts");
  const setsWon=sum("setsWon")||sum("setWins"), legsWon=sum("legsWon"), runnerWins=sum("runnerLegWins"), chaserWins=sum("chaserLegWins");
  const captures=sum("captureCredits")||sum("captures"), escapes=sum("escapeCredits")||sum("escapes");
  const bestVisit=rows.reduce((m,x)=>Math.max(m,n(x.pl?.bestVisit)),0); const runnerBest=rows.reduce((m,x)=>Math.max(m,n(x.pl?.runnerBestVisit)),0); const chaserBest=rows.reduce((m,x)=>Math.max(m,n(x.pl?.chaserBestVisit)),0);
  const singles=sum("singles"), doubles=sum("doubles"), triples=sum("triples"), bulls=sum("bulls"), dbulls=sum("dbulls"), misses=sum("misses");
  const hits=Math.max(0,darts-misses); const avg3=darts?r1(points/darts*3):0, runnerAvg=runnerDarts?r1(runnerPoints/runnerDarts*3):0, chaserAvg=chaserDarts?r1(chaserPoints/chaserDarts*3):0;
  const hitRate=darts?r1(hits/darts*100):0; const pVisit=visits?r1(points/visits):0;
  let fastest:number|null=null,maxLead=0,bestEscape=0,closest:number|null=null,capRoundWeighted=0,capCount=0,runnerLegs=0,chaserLegs=0;
  rows.forEach(({rec,pl})=>{const e=entityFor(rec,pl)||{}; const f=n(pl?.fastestCaptureRound??e?.fastestCaptureRound); if(f>0)fastest=fastest==null?f:Math.min(fastest,f); maxLead=Math.max(maxLead,n(pl?.maxRunnerLead??e?.maxRunnerLead)); bestEscape=Math.max(bestEscape,n(pl?.bestEscapeLead??e?.bestEscapeLead)); const c=n(pl?.closestChaseGap??e?.closestChaseGap,-1); if(c>=0)closest=closest==null?c:Math.min(closest,c); const ac=n(pl?.avgCaptureRound??e?.avgCaptureRound); const cc=n(pl?.captureCredits??e?.captures); if(ac>0&&cc>0){capRoundWeighted+=ac*cc;capCount+=cc;} runnerLegs+=n(pl?.runnerLegs??e?.runnerLegs); chaserLegs+=n(pl?.chaserLegs??e?.chaserLegs);});
  const avgCapture=capCount?r1(capRoundWeighted/capCount):0; const captureRate=chaserLegs?r1(captures/chaserLegs*100):0; const escapeRate=runnerLegs?r1(escapes/runnerLegs*100):0;
  const evolution=rows.map(({rec,pl})=>({t:playedAt(rec),avg3:n(pl?.avg3),runner:n(pl?.runnerAvg3),chaser:n(pl?.chaserAvg3),best:n(pl?.bestVisit),points:n(pl?.points),win:pl?.winner||pl?.win?100:0,captures:n(pl?.captureCredits),escapes:n(pl?.escapeCredits)}));
  const latest=rows.slice(-12).reverse();
  const visitBuckets={zero:sum("zeroVisits"),b1:sum("score1_39"),b40:sum("score40_59"),b60:sum("score60_99"),b100:sum("score100_139"),b140:sum("score140_179"),b180:sum("score180")};
  const tabs:Array<[Tab,string,string]>=[["resume","RÉSUMÉ",C.gold],["evolution","ÉVOLUTION",C.chaser],["roles","RÔLES",C.runner],["precision","PRÉCISION",C.gold],["matches","MATCHS",C.chaser]];

  if(!games) return <div style={{color:C.soft,fontSize:13}}>Aucune partie ATTRAPE-MOI enregistrée pour ce joueur.</div>;

  return <div>
    <div style={{display:"flex",gap:6,overflowX:"auto",paddingBottom:7}}>{tabs.map(([id,label,color])=><TabBtn key={id} active={tab===id} label={label} color={color} onClick={()=>setTab(id)}/>)}</div>

    {tab==="resume"?<>
      <div style={{display:"grid",gridTemplateColumns:"repeat(2,minmax(0,1fr))",gap:9}}>
        <Kpi label="Parties" value={games} sub={`${wins} victoire${wins>1?"s":""}`} color={C.gold}/><Kpi label="Winrate" value={`${games?r1(wins/games*100):0}%`} sub={`${wins}/${games}`} color={C.gold}/>
        <Kpi label="Score cumulé" value={points} sub={`${avg3} AVG/3`} color={C.gold}/><Kpi label="Meilleure volée" value={bestVisit||"—"} sub={`${pVisit} pts/volée`} color={C.gold}/>
        <Kpi label="Sets gagnés" value={setsWon} sub={`${legsWon} manches`} color={C.gold}/><Kpi label="Captures / Évasions" value={`${captures} / ${escapes}`} sub={`${captureRate}% cap. · ${escapeRate}% év.`} color={C.chaser}/>
        <Kpi label="Capture + rapide" value={fastest?`Round ${fastest}`:"—"} sub={avgCapture?`moy. R${avgCapture}`:"—"} color={C.chaser}/><Kpi label="Distance max fuite" value={maxLead||"—"} sub={`plus proche ${closest??"—"}`} color={C.runner}/>
        <Kpi label="Fléchettes" value={darts} sub={`${visits} volées`} color="#fff"/><Kpi label="Précision impacts" value={`${hitRate}%`} sub={`${hits}/${darts} touches`} color="#fff"/>
      </div>
      <div style={{...card,marginTop:10,padding:13}}><div style={{fontWeight:1000,color:C.gold,marginBottom:9}}>Comparaison des rôles</div><div style={{display:"grid",gap:7}}><MetricBar label="AVG/3" left={runnerAvg} right={chaserAvg}/><MetricBar label="BEST VOLÉE" left={runnerBest} right={chaserBest}/><MetricBar label="POINTS" left={runnerPoints} right={chaserPoints}/><MetricBar label="VICTOIRES" left={runnerWins} right={chaserWins}/></div></div>
    </>:null}

    {tab==="evolution"?<div style={{display:"grid",gap:10}}>
      <div style={{...card,padding:13}}><div style={{fontWeight:1000,color:C.chaser}}>Évolution AVG/3 globale</div><div style={{marginTop:8}}><SparklinePro points={evolution.map((x,i)=>({x:i,y:x.avg3}))} height={110}/></div></div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(2,minmax(0,1fr))",gap:9}}><div style={{...card,padding:12}}><div style={{fontWeight:1000,color:C.runner}}>AVG Fuyard</div><SparklinePro points={evolution.map((x,i)=>({x:i,y:x.runner}))} height={90}/></div><div style={{...card,padding:12}}><div style={{fontWeight:1000,color:C.chaser}}>AVG Chasseur</div><SparklinePro points={evolution.map((x,i)=>({x:i,y:x.chaser}))} height={90}/></div></div>
      <div style={{...card,padding:13}}><div style={{fontWeight:1000,color:C.gold,marginBottom:8}}>Records par partie</div><Bars rows={[{label:"Best volée",value:bestVisit,color:C.gold},{label:"Best Fuyard",value:runnerBest,color:C.runner},{label:"Best Chasseur",value:chaserBest,color:C.chaser},{label:"Distance fuite",value:maxLead,color:C.runner}]}/></div>
    </div>:null}

    {tab==="roles"?<div style={{display:"grid",gap:10}}>
      <div style={{...card,padding:13}}><div style={{display:"grid",gridTemplateColumns:"repeat(2,minmax(0,1fr))",gap:8}}><div style={{padding:11,borderRadius:14,background:`${C.runner}0d`,border:`1px solid ${C.runner}33`}}><div style={{color:C.runner,fontWeight:1100}}>FUYARD</div><div style={{marginTop:8,display:"grid",gridTemplateColumns:"repeat(2,minmax(0,1fr))",gap:7}}><Kpi label="AVG/3" value={runnerAvg} color={C.runner}/><Kpi label="Best" value={runnerBest} color={C.gold}/><Kpi label="Points" value={runnerPoints} color="#fff"/><Kpi label="Victoires" value={runnerWins} sub={`${escapes} évasions`} color={C.runner}/></div></div><div style={{padding:11,borderRadius:14,background:`${C.chaser}0d`,border:`1px solid ${C.chaser}33`}}><div style={{color:C.chaser,fontWeight:1100}}>CHASSEUR</div><div style={{marginTop:8,display:"grid",gridTemplateColumns:"repeat(2,minmax(0,1fr))",gap:7}}><Kpi label="AVG/3" value={chaserAvg} color={C.chaser}/><Kpi label="Best" value={chaserBest} color={C.gold}/><Kpi label="Points" value={chaserPoints} color="#fff"/><Kpi label="Victoires" value={chaserWins} sub={`${captures} captures`} color={C.chaser}/></div></div></div></div>
      <div style={{...card,padding:13}}><div style={{fontWeight:1000,color:C.gold,marginBottom:8}}>Efficacité de rôle</div><MetricBar label="TAUX DE SUCCÈS" left={escapeRate} right={captureRate}/><div style={{marginTop:8}}><MetricBar label="DARTS" left={runnerDarts} right={chaserDarts}/></div><div style={{marginTop:8}}><MetricBar label="POINTS" left={runnerPoints} right={chaserPoints}/></div></div>
    </div>:null}

    {tab==="precision"?<div style={{display:"grid",gap:10}}>
      <div style={{...card,padding:13}}><div style={{fontWeight:1000,color:C.gold,marginBottom:9}}>Répartition des impacts</div><Bars rows={[{label:"Simple",value:singles,color:"#fff"},{label:"Double",value:doubles,color:C.chaser},{label:"Triple",value:triples,color:"#c967ff"},{label:"Bull",value:bulls,color:"#65efb4"},{label:"DBull",value:dbulls,color:C.gold},{label:"Miss",value:misses,color:"#ff667e"}]}/></div>
      <div style={{...card,padding:13}}><div style={{fontWeight:1000,color:C.gold,marginBottom:9}}>Distribution des volées</div><Bars rows={[{label:"0",value:visitBuckets.zero,color:"#ff667e"},{label:"1–39",value:visitBuckets.b1,color:"#fff"},{label:"40–59",value:visitBuckets.b40,color:C.gold},{label:"60–99",value:visitBuckets.b60,color:C.chaser},{label:"100–139",value:visitBuckets.b100,color:"#c967ff"},{label:"140–179",value:visitBuckets.b140,color:C.runner},{label:"180",value:visitBuckets.b180,color:C.gold}]}/></div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(2,minmax(0,1fr))",gap:9}}><Kpi label="Touches" value={hits} sub={`${hitRate}%`} color="#fff"/><Kpi label="Miss" value={misses} sub={`${darts?r1(misses/darts*100):0}%`} color="#ff667e"/><Kpi label="Pts / dart" value={darts?r1(points/darts):0} color={C.gold}/><Kpi label="Pts / volée" value={pVisit} color={C.gold}/></div>
    </div>:null}

    {tab==="matches"?<div style={{display:"grid",gap:7}}>{latest.map(({rec,pl},index)=>{const e=entityFor(rec,pl)||{};const won=pl?.winner===true||pl?.win===true;const s=rec?.summary||rec?.payload?.summary||{};return <div key={String(rec?.id||index)} style={{...card,padding:10,display:"grid",gridTemplateColumns:"58px minmax(0,1fr) auto",gap:8,alignItems:"center",borderColor:won?`${C.gold}55`:"rgba(255,255,255,.09)"}}><div style={{fontSize:9,color:C.soft}}>{fmtDate(playedAt(rec))}</div><div style={{minWidth:0}}><div style={{fontWeight:1000}}>{won?"🏆 VICTOIRE":"DÉFAITE"} · {n(pl?.points)} pts</div><div style={{fontSize:9,color:C.soft,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>AVG {r1(n(pl?.avg3))} · Best {n(pl?.bestVisit)} · {n(pl?.setsWon)} set · {n(pl?.legsWon)} manches · {n(pl?.captureCredits)} cap. · {n(pl?.escapeCredits)} év.</div></div><div style={{textAlign:"right"}}><b style={{color:won?C.gold:"rgba(255,255,255,.65)"}}>{won?"WIN":"LOSS"}</b><div style={{fontSize:8,color:C.soft}}>BO{n(s?.legsBestOf??rec?.payload?.config?.legsBestOf,3)}</div></div></div>})}</div>:null}
  </div>;
}
