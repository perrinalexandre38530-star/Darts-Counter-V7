// @ts-nocheck
import React from "react";
import DartsQuickHeader, { DartsQuickIntro } from "../components/DartsQuickHeader";

export default function QuickScramConfig({ go, onBack }: {go:(route:string, params?:any)=>void;onBack:()=>void}) {
  const [count,setCount] = React.useState(2);
  const [names,setNames] = React.useState(Array.from({length:8},(_,i)=>`J${i+1}`));
  const [useBull,setUseBull] = React.useState(true);
  const [maxRoundsPerPhase,setMaxRounds] = React.useState(20);
  const [firstStopper,setFirstStopper] = React.useState("random");
  const card:React.CSSProperties = {display:"grid",gap:12,borderRadius:18,padding:15,border:"1px solid #55e6ff40",background:"#101321"};
  const chip=(v:boolean):React.CSSProperties=>({padding:"10px 15px",borderRadius:12,border:`1px solid ${v?"#55e6ff":"#ffffff30"}`,background:v?"#55e6ff28":"#151827",color:"white",fontWeight:900});
  function start(){
    const session=`scram-quick-${Date.now()}-${Math.random().toString(36).slice(2,6)}`;
    const players=names.slice(0,count).map((name,i)=>({id:`${session}-p${i+1}`,temporaryPlayerId:`${session}-p${i+1}`,profileId:null,isTemporary:true,isBot:false,name:name.trim()||`J${i+1}`}));
    const a=players.filter((_,i)=>i%2===0),b=players.filter((_,i)=>i%2===1);
    const teams=[{id:`${session}-a`,name:"ÉQUIPE A",side:"A",playerIds:a.map(p=>p.id)},{id:`${session}-b`,name:"ÉQUIPE B",side:"B",playerIds:b.map(p=>p.id)}];
    const arranged=Array.from({length:count},(_,i)=>players[i]);
    const chosen=firstStopper==="random" ? (Math.random()<.5?"A":"B") : firstStopper;
    go("scram_play",{players:count,selectedIds:arranged.map(p=>p.id),playersList:arranged,teamConfigs:teams,botIds:[],botsEnabled:false,botLevel:"normal",useBull,maxRoundsPerPhase,firstStopper:chosen,participantMode:"players",inputMethod:"keypad",quickParty:true,partyMode:"quick",temporaryParticipants:true,profileStatsDeferred:true});
  }
  return <div className="screen x01-config-v3-screen msc-mode-config" style={{minHeight:"100dvh",padding:"12px 12px 110px",background:"#060711",color:"white"}}><DartsQuickHeader modeId="scram" title="SCRAM" onBack={onBack}/><main style={{maxWidth:760,margin:"auto",display:"grid",gap:14}}><DartsQuickIntro title="SCRAM"/>
    <section style={card}><strong style={{color:"#55e6ff"}}>JOUEURS · 2 CAMPS ÉQUILIBRÉS</strong><div style={{display:"flex",gap:8,flexWrap:"wrap"}}>{[2,4,6,8].map(n=><button type="button" key={n} style={chip(count===n)} onClick={()=>setCount(n)}>{n} JOUEURS</button>)}</div><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:10}}>{names.slice(0,count).map((name,i)=><label key={i} style={{display:"grid",gap:6,color:"#b9c6d8",fontSize:12,fontWeight:900}}>JOUEUR {i+1} · {i%2===0?"A":"B"}<input aria-label={`Nom du joueur ${i+1}`} maxLength={32} value={name} onFocus={e=>e.currentTarget.select()} onChange={e=>setNames(prev=>prev.map((v,j)=>j===i?e.target.value:v))} style={{padding:12,borderRadius:12,border:"1px solid #ffffff30",background:"#181b29",color:"white",fontSize:16}}/></label>)}</div></section>
    <section style={card}><strong style={{color:"#55e6ff"}}>RÈGLES SCRAM</strong><div>BULL {[[true,"INCLUS"],[false,"EXCLU"]].map(([v,label])=><button key={String(v)} type="button" style={{...chip(useBull===v),marginLeft:8}} onClick={()=>setUseBull(v)}>{label}</button>)}</div><div>TOURS MAXIMUM / PHASE</div><div style={{display:"flex",gap:8}}>{[10,20,30].map(n=><button key={n} type="button" style={chip(maxRoundsPerPhase===n)} onClick={()=>setMaxRounds(n)}>{n}</button>)}</div><div>PREMIER BLOQUEUR</div><div style={{display:"flex",flexWrap:"wrap",gap:8}}>{[["random","ALÉATOIRE"],["A","ÉQUIPE A"],["B","ÉQUIPE B"]].map(([v,label])=><button type="button" key={v} style={chip(firstStopper===v)} onClick={()=>setFirstStopper(v)}>{label}</button>)}</div></section>
    <button type="button" onClick={start} style={{minHeight:58,borderRadius:16,background:"#135e4a",border:"1px solid #60eec7",color:"#c8fff0",fontSize:20,fontWeight:1000}}>JOUER</button>
  </main></div>;
}
