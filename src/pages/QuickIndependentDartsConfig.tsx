// @ts-nocheck
import React from "react";
import DartsQuickHeader, { DartsQuickIntro } from "../components/DartsQuickHeader";
import { makeGros6Segment } from "../lib/gros6Engine";

type Mode = "gros_6" | "warfare" | "prisoner" | "golf";
export default function QuickIndependentDartsConfig({ modeId, onBack, go }: {modeId:Mode;onBack:()=>void;go:(route:string,params?:any)=>void}) {
  const [count,setCount] = React.useState(modeId === "warfare" ? 2 : 2);
  const [names,setNames] = React.useState(Array.from({length:12},(_,i)=>`J${i+1}`));
  const [lives,setLives] = React.useState(6);
  const [darts,setDarts] = React.useState(3);
  const [holes,setHoles] = React.useState(9);
  const [zoneRule,setZoneRule] = React.useState("ANY");
  const [order,setOrder] = React.useState("fixed");
  const title = {gros_6:"GROS 6",warfare:"WARFARE",prisoner:"PRISONER",golf:"GOLF"}[modeId];
  const max = modeId === "gros_6" ? 10 : modeId === "golf" ? 8 : 12;
  const card:React.CSSProperties = {borderRadius:18,background:"rgba(10,12,24,.94)",border:"1px solid rgba(85,230,255,.20)",padding:12,display:"grid",gap:10};
  const chip = (active:boolean):React.CSSProperties => ({borderRadius:14,padding:"10px 15px",fontWeight:950,background:active?"#55e6ff22":"rgba(255,255,255,.035)",border:`1px solid ${active?"#55e6ff":"#ffffff20"}`,color:active?"#a8f5ff":"white"});
  const players = () => {
    const session=`quick-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,6)}`;
    return names.slice(0,count).map((value,i)=>({id:`${session}-p${i+1}`,profileId:null,temporaryPlayerId:`${session}-p${i+1}`,isTemporary:true,isBot:false,name:value.trim()||`J${i+1}`,avatarDataUrl:null,dartSetId:null}));
  };
  const quickMeta={quickParty:true,partyMode:"quick",temporaryParticipants:true,profileStatsDeferred:true};
  function launch() {
    const roster=players();
    if (modeId === "gros_6") {
      const config={...quickMeta,id:`gros6-quick-${Date.now()}`,mode:"gros_6",createdAt:Date.now(),participantMode:"players",startingLives:lives,targetRule:"strict",allowBull:true,allowSpecialZones:false,allowOuterRing:false,selectionPolicy:"open",startingTargetMode:"s6",startingTarget:makeGros6Segment("S",6),randomStartOrder:order==="random",startOrderMode:order==="random"?"random":"manual",thirdDartBonusSelection:true,thirdDartBonusCount:3,scoreInputDefaultMethod:"keypad",presetId:"custom",players:roster};
      go("gros_6_play",{config,...quickMeta});return;
    }
    if (modeId === "warfare") {
      const teams={TOP:roster.filter((_,i)=>i%2===0),BOTTOM:roster.filter((_,i)=>i%2===1)};
      go("warfare_play",{config:{teams,zoneRule,friendlyFire:false,handicapTopHarder:false,layout:"TOP_BOTTOM",bullRule:"NONE",...quickMeta},...quickMeta});return;
    }
    const selectedIds=roster.map(p=>p.id);
    if (modeId === "golf") {
      const config={players:count,selectedIds,quickPlayers:roster,holes,teamsEnabled:false,botsEnabled:false,missStrokes:5,holeOrderMode:"chronological",scoringMode:"strokes",startOrderMode:order==="random"?"random":"chronological",showHoleGrid:true,...quickMeta};
      go("golf_play",{config,...quickMeta});return;
    }
    const config={mode:"prisoner",participantMode:"players",players:count,selectedIds,playersList:roster,teamConfigs:[],playerDartSets:{},botIds:[],botsEnabled:false,botLevel:"normal",startingDarts:darts,sequenceMode:"clockwise",bullCaptureRule:"bull",missPenaltyEnabled:true,eliminationEnabled:true,randomOrder:order==="random",scoreInputMethod:"keypad",...quickMeta};
    go("prisoner_play",{...config,...quickMeta});
  }
  return <div className="screen x01-config-v3-screen msc-mode-config" style={{color:"white",minHeight:"100dvh",padding:"12px 12px 96px",background:"radial-gradient(circle at top,#15192c 0,#05060c 50%,#020308 100%)"}}>
    <DartsQuickHeader modeId={modeId} title={title} onBack={onBack}/>
    <main style={{maxWidth:760,margin:"0 auto",display:"grid",gap:14}}>
      <DartsQuickIntro title={title}/>
      <section style={card}><strong style={{color:"#55e6ff"}}>JOUEURS</strong>
        <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
          {[2,3,4].filter(n=>n<=max).map(n=><button key={n} type="button" onClick={()=>setCount(n)} style={chip(count===n)}>{n===2?"DUEL":n===3?"3 JOUEURS":"4 JOUEURS"}</button>)}
          <label style={{display:"flex",alignItems:"center",gap:7,fontSize:12}}>MULTI <select aria-label="Nombre de joueurs" value={count} onChange={e=>setCount(Number(e.target.value))} style={{...chip(true),minHeight:42}}>{Array.from({length:max-1},(_,i)=>i+2).map(n=><option key={n} value={n}>{n}</option>)}</select></label>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:10}}>{names.slice(0,count).map((name,i)=><label key={i} style={{display:"grid",gap:5,color:"#aab4c7",fontSize:11,fontWeight:900}}>JOUEUR {i+1}<input aria-label={`Nom du joueur ${i+1}`} value={name} maxLength={32} onFocus={e=>e.currentTarget.select()} onChange={e=>setNames(prev=>prev.map((v,j)=>i===j?e.target.value:v))} style={{background:"#181b29",color:"white",borderRadius:12,border:"1px solid #ffffff2a",padding:12,fontSize:16}}/></label>)}</div>
      </section>
      <section style={card}><strong style={{color:"#55e6ff"}}>RÈGLES · {title}</strong>
        {modeId === "gros_6" ? <div style={{display:"flex",alignItems:"center",gap:9}}>VIES { [3,6,9].map(n=><button key={n} style={chip(lives===n)} onClick={()=>setLives(n)}>{n}</button>)}</div> : null}
        {modeId === "golf" ? <div style={{display:"flex",alignItems:"center",gap:9}}>TROUS {[9,18].map(n=><button key={n} style={chip(holes===n)} onClick={()=>setHoles(n)}>{n}</button>)}</div> : null}
        {modeId === "prisoner" ? <div style={{display:"flex",alignItems:"center",gap:9}}>FLÉCHETTES { [3,5,7].map(n=><button key={n} style={chip(darts===n)} onClick={()=>setDarts(n)}>{n}</button>)}</div> : null}
        {modeId === "warfare" ? <div style={{display:"grid",gap:7}}>ZONES VALIDES<div style={{display:"flex",flexWrap:"wrap",gap:7}}>{[["ANY","TOUTES"],["SINGLE_DOUBLE","SIMPLE / DOUBLE"],["DOUBLE_ONLY","DOUBLES"]].map(([v,label])=><button key={v} style={chip(zoneRule===v)} onClick={()=>setZoneRule(v)}>{label}</button>)}</div><small style={{color:"#aab4c7"}}>Les joueurs sont répartis alternativement entre les deux armées.</small></div> : null}
      </section>
      {modeId !== "warfare" ? <section style={card}><strong style={{color:"#55e6ff"}}>ORDRE DE DÉPART</strong><div style={{display:"flex",gap:8}}>{[["fixed","DANS L’ORDRE"],["random","ALÉATOIRE"]].map(([v,t])=><button key={v} style={chip(order===v)} onClick={()=>setOrder(v)}>{t}</button>)}</div></section> : null}
      <button type="button" onClick={launch} style={{minHeight:56,borderRadius:16,color:"#baffdf",background:"linear-gradient(180deg,#52f5b23a,#52f5b214)",border:"1px solid #52f5b2aa",fontWeight:1000,fontSize:18}}>JOUER</button>
    </main>
  </div>;
}
