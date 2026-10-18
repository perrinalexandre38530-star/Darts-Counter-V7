// @ts-nocheck
import React from "react";
import BackDot from "../components/BackDot";
import PageHeader from "../components/PageHeader";
import { History } from "../lib/history";
import { getTicker } from "../lib/tickers";
import { buildClosestCenterStats } from "../lib/closestCenterStats";

const ACCENT = "#44e7ff";
const card: React.CSSProperties = { border:"1px solid rgba(255,255,255,.11)", background:"rgba(255,255,255,.04)", borderRadius:16, padding:12 };
const kpi: React.CSSProperties = { padding:"9px 7px", borderRadius:12, background:"rgba(255,255,255,.035)", border:"1px solid rgba(255,255,255,.08)", textAlign:"center" };

function num(v:any, fallback=0){ const n=Number(v); return Number.isFinite(n)?n:fallback; }
function fmtMm(v:any){ const n=Number(v); return Number.isFinite(n)?`${n.toFixed(n<10?2:1)} mm`:"—"; }
function safeArray(v:any){ return Array.isArray(v)?v:[]; }

export default function ClosestCenterHistoryDetail(props:any){
  const go=props.go ?? props.setTab;
  const params=props.params || {};
  const [rec,setRec]=React.useState<any>(params.rec || params.matchPayload || null);
  const [loading,setLoading]=React.useState(true);
  const ticker=getTicker("closest_center") || getTicker("darts_games") || "";

  React.useEffect(()=>{
    let dead=false;
    const id=String(params.matchId || params.focusMatchId || params.resumeId || rec?.id || rec?.matchId || "").trim();
    if(!id){ setLoading(false); return; }
    void History.get(id).then((full:any)=>{ if(!dead && full) setRec((prev:any)=>({...(prev||{}),...full,payload:{...(prev?.payload||{}),...(full?.payload||{})},summary:{...(prev?.summary||{}),...(full?.summary||{})}})); }).finally(()=>{ if(!dead) setLoading(false); });
    return ()=>{ dead=true; };
  },[params.matchId,params.focusMatchId,params.resumeId]);

  const players=safeArray(rec?.players?.length?rec.players:rec?.payload?.players);
  const impacts=safeArray(rec?.payload?.impacts?.length?rec.payload.impacts:rec?.impacts);
  const scores=rec?.scores || rec?.summary?.scores || {};
  const rounds=Math.max(1,num(rec?.rounds ?? rec?.summary?.rounds ?? rec?.game?.rounds,1));
  const pointsMode=String(rec?.game?.pointsMode || rec?.payload?.pointsMode || rec?.summary?.pointsMode || "petanque");
  const dartsPerPlayer=Math.max(1,num(rec?.game?.dartsPerPlayer ?? rec?.payload?.dartsPerPlayer ?? rec?.summary?.dartsPerPlayer,3));
  const targetScore=num(rec?.game?.targetScore ?? rec?.payload?.targetScore ?? rec?.summary?.targetScore,13);
  const formatMode=String(rec?.game?.formatMode || rec?.payload?.formatMode || rec?.summary?.formatMode || "duo");
  const stats=rec?.petanqueStats || rec?.summary?.petanqueStats || rec?.payload?.petanqueStats || buildClosestCenterStats(players,impacts,scores,rounds,dartsPerPlayer);
  const inputMode=String(rec?.inputMode || rec?.summary?.inputMode || rec?.payload?.inputMode || rec?.game?.inputMode || "camera");
  const cameraQuality=rec?.cameraQuality || rec?.summary?.cameraQuality || rec?.payload?.cameraQuality || null;
  const teamTotals=rec?.teamTotals || rec?.summary?.teamTotals || rec?.payload?.teamTotals || {};
  const teamMode=!!rec?.game?.teamMode || Object.keys(teamTotals||{}).length>0;
  const ranking=[...(stats?.players||[])].sort((a:any,b:any)=>num(b.points)-num(a.points)||num(a.bestMm,Infinity)-num(b.bestMm,Infinity));
  const byRound=React.useMemo(()=>{
    const out:any[]=[];
    for(let r=1;r<=rounds;r++){
      const rows=impacts.filter((x:any)=>num(x.round)===r).sort((a:any,b:any)=>num(a.manualRank ?? a.distanceMm,Infinity)-num(b.manualRank ?? b.distanceMm,Infinity));
      out.push({round:r,rows});
    }
    return out;
  },[impacts,rounds]);

  if(loading && !rec) return <div style={{minHeight:"100vh",background:"#061019",color:"white",padding:20}}>Chargement de la partie…</div>;
  if(!rec) return <div style={{minHeight:"100vh",background:"#061019",color:"white",padding:20}}>Partie DARTS PÉTANQUE introuvable. <button onClick={()=>go?.("history")}>Retour</button></div>;

  return <div style={{minHeight:"100vh",background:"radial-gradient(circle at 50% 0%,#102a35,#061019 45%,#020609)",color:"#fff",paddingBottom:28}}>
    <PageHeader tickerSrc={ticker} tickerAlt="DARTS PÉTANQUE · PLUS PRÈS DU CENTRE" tickerHeight={68} left={<BackDot onClick={()=>go?.("history")} color={ACCENT}/>} />
    <div style={{maxWidth:980,margin:"0 auto",padding:"12px 12px 24px",display:"grid",gap:10}}>
      <section style={{...card,borderColor:`${ACCENT}55`}}>
        <div style={{display:"flex",justifyContent:"space-between",gap:10,alignItems:"center",flexWrap:"wrap"}}>
          <div><div style={{fontSize:11,color:ACCENT,fontWeight:1000,letterSpacing:1}}>DARTS PÉTANQUE · PLUS PRÈS DU CENTRE</div><h2 style={{margin:"4px 0 0",fontSize:20}}>FICHE DE PARTIE</h2></div>
          <div style={{padding:"6px 10px",borderRadius:999,border:`1px solid ${inputMode==="manual"?"#8fffc2":ACCENT}`,color:inputMode==="manual"?"#bfffd9":ACCENT,fontSize:11,fontWeight:1000}}>{inputMode==="manual"?"✍️ SAISIE MANUELLE":"📷 CAMÉRA IA"}</div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(120px,1fr))",gap:7,marginTop:10}}>
          <div style={kpi}><b style={{fontSize:17,color:ACCENT}}>{rounds}</b><br/><small>{pointsMode==="petanque"?"mènes":"manches"}</small></div>
          <div style={kpi}><b style={{fontSize:17,color:ACCENT}}>{stats?.totalImpacts ?? impacts.length}</b><br/><small>{inputMode==="manual"?(pointsMode==="petanque"?"fléchettes marquantes":"rangs saisis"):"impacts"}</small></div>
          <div style={kpi}><b style={{fontSize:14,color:ACCENT}}>{formatMode.toUpperCase()}</b><br/><small>{dartsPerPlayer} fl./joueur</small></div>
          {pointsMode==="petanque"?<div style={kpi}><b style={{fontSize:17,color:ACCENT}}>{targetScore}</b><br/><small>objectif</small></div>:null}
          {inputMode!=="manual"?<><div style={kpi}><b style={{fontSize:17,color:ACCENT}}>{fmtMm(stats?.bestDistanceMm)}</b><br/><small>meilleure distance</small></div><div style={kpi}><b style={{fontSize:17,color:ACCENT}}>{fmtMm(stats?.averageDistanceMm)}</b><br/><small>distance moyenne</small></div></>:null}
          {cameraQuality?<div style={kpi}><b style={{fontSize:17,color:ACCENT}}>{cameraQuality.grade || "—"} · {num(cameraQuality.score)}%</b><br/><small>qualité caméra</small></div>:null}
        </div>
      </section>

      <section style={card}>
        <div style={{fontSize:12,color:ACCENT,fontWeight:1000,marginBottom:6}}>CLASSEMENT FINAL</div>
        {ranking.map((s:any,i:number)=><div key={s.playerId||i} style={{display:"grid",gridTemplateColumns:"34px minmax(0,1fr) auto",gap:8,alignItems:"center",padding:"9px 0",borderBottom:"1px solid rgba(255,255,255,.07)"}}>
          <b style={{color:i<3?"#ffd85a":"#83929e"}}>#{i+1}</b>
          <div><b>{s.name || players.find((p:any)=>String(p.id)===String(s.playerId))?.name || "Joueur"}</b>{s.teamId?<span style={{fontSize:10,color:ACCENT}}> · Équipe {s.teamId}</span>:null}<div style={{fontSize:10,color:"#8fa0ad",marginTop:2}}>{inputMode==="manual"?(pointsMode==="petanque"?`${s.rankedDarts||0} fléchette(s) marquante(s) · ${s.roundWins||0} mène(s) gagnée(s)`:`${s.rankedDarts||0} fléchette(s) classée(s) · ${s.roundWins||0} manche(s) gagnée(s)`):`meilleure ${fmtMm(s.bestMm)} · moyenne ${fmtMm(s.averageMm)} · médiane ${fmtMm(s.medianMm)} · ${s.misses||0} MISS`}</div></div>
          <b style={{color:ACCENT,fontSize:17}}>{num(s.points)} pts</b>
        </div>)}
        {teamMode?<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginTop:10}}>{Object.entries(teamTotals||{}).sort().map(([id,pts]:any)=><div key={id} style={kpi}><small>ÉQUIPE {id}</small><br/><b style={{fontSize:18,color:ACCENT}}>{num(pts)} pts</b></div>)}</div>:null}
      </section>

      {cameraQuality?<section style={{...card,borderColor:"rgba(68,231,255,.24)"}}>
        <div style={{display:"flex",justifyContent:"space-between",gap:8}}><b style={{fontSize:12,color:ACCENT}}>QUALITÉ DE MESURE CAMÉRA</b><b>NOTE {cameraQuality.grade} · {num(cameraQuality.score)}/100</b></div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(105px,1fr))",gap:7,marginTop:8}}>
          <div style={kpi}><b>{num(cameraQuality.accepted)}</b><br/><small>volées OK</small></div><div style={kpi}><b>{num(cameraQuality.rejected)}</b><br/><small>refus</small></div><div style={kpi}><b>{num(cameraQuality.rereads)}</b><br/><small>relectures</small></div><div style={kpi}><b>{fmtMm(cameraQuality.avgUncertaintyMm)}</b><br/><small>incertitude moy.</small></div>
        </div>
      </section>:null}

      <section style={card}>
        <div style={{fontSize:12,color:ACCENT,fontWeight:1000,marginBottom:6}}>{pointsMode==="petanque"?"DÉTAIL PAR MÈNE":"DÉTAIL PAR MANCHE"}</div>
        <div style={{display:"grid",gap:7}}>{byRound.map((g:any)=><div key={g.round} style={{padding:9,borderRadius:12,background:"rgba(255,255,255,.025)",border:"1px solid rgba(255,255,255,.07)"}}><b style={{fontSize:11}}>{pointsMode==="petanque"?"MÈNE":"MANCHE"} {g.round}</b>{g.rows.length?<div style={{display:"grid",gap:4,marginTop:6}}>{g.rows.map((x:any,i:number)=>{const p=players.find((q:any)=>String(q.id)===String(x.playerId)); return <div key={x.id||`${g.round}-${i}`} style={{display:"grid",gridTemplateColumns:"24px 1fr auto",gap:7,fontSize:11}}><b style={{color:i<5?"#ffd85a":"#778996"}}>#{i+1}</b><span>{p?.name||"Joueur"}{x.teamId?` · ${x.teamId}`:""}</span><b>{inputMode==="manual"?(pointsMode==="petanque"?"+1 point":`Rang #${num(x.manualRank ?? (i+1),i+1)}`):<>{fmtMm(x.distanceMm)}{Number.isFinite(Number(x.uncertaintyMm))?<small style={{color:"#8294a2"}}> ± {num(x.uncertaintyMm).toFixed(2)}</small>:null}</>}</b></div>})}</div>:<div style={{fontSize:10,color:"#71808d",marginTop:5}}>Aucun impact mesuré enregistré.</div>}</div>)}</div>
      </section>

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}><button onClick={()=>go?.("history",{sport:"darts",game:"closest_center",focusMatchId:rec.id||rec.matchId})} style={{minHeight:42,borderRadius:13,border:`1px solid ${ACCENT}`,background:`${ACCENT}13`,color:"#fff",fontWeight:1000}}>HISTORIQUE DARTS</button><button onClick={()=>go?.("closest_center_config")} style={{minHeight:42,borderRadius:13,border:"1px solid rgba(255,255,255,.2)",background:"rgba(255,255,255,.05)",color:"#fff",fontWeight:1000}}>NOUVELLE PARTIE</button></div>
    </div>
  </div>;
}
