// @ts-nocheck
import React from "react";
import BackDot from "../components/BackDot";
import PageHeader from "../components/PageHeader";
import PlayerPagedSelector from "../components/PlayerPagedSelector";
import { getTicker } from "../lib/tickers";

const ACCENT = "#44e7ff";
export default function ClosestCenterConfig(props: any) {
  const go = props.go ?? props.setTab;
  const profiles = React.useMemo(() => (Array.isArray(props.store?.profiles) ? props.store.profiles : []).filter((p:any)=>!p?.isBot), [props.store?.profiles]);
  const [selectedIds, setSelectedIds] = React.useState<string[]>(() => profiles.slice(0, 2).map((p:any)=>String(p.id)));
  const [rounds, setRounds] = React.useState(3);
  const [teamMode, setTeamMode] = React.useState(false);
  const [pointsMode, setPointsMode] = React.useState<"descending"|"winner">("descending");
  const ticker = getTicker("closest_center") || getTicker("darts_games") || "";
  const toggle = (id:string) => setSelectedIds(prev => prev.includes(String(id)) ? prev.filter(x=>x!==String(id)) : prev.length < 8 ? [...prev, String(id)] : prev);
  const start = () => {
    if (!selectedIds.length) return;
    const selected = profiles.filter((p:any)=>selectedIds.includes(String(p.id))).map((p:any,i:number)=>({ id:String(p.id), name:p.name||p.displayName||`Joueur ${i+1}`, avatar:p.avatarDataUrl||p.avatarUrl||p.avatar||null, teamId: teamMode ? (i%2===0?"A":"B") : null }));
    go?.("closest_center_play", { config: { rounds, teamMode, pointsMode, players:selected, dartsPerPlayer:3, cameraOnly:true } });
  };
  return <div style={{height:"100%",display:"flex",flexDirection:"column",background:"linear-gradient(180deg,#07111b,#04070d)",color:"#fff"}}>
    <PageHeader tickerSrc={ticker} tickerAlt="PETANQUE" tickerHeight={74} left={<BackDot onClick={()=>go?.("games")} color={ACCENT}/>} />
    <div style={{flex:1,overflow:"auto",padding:12,display:"grid",gap:12,maxWidth:980,width:"100%",margin:"0 auto"}}>
      <section style={card}><h2 style={title}>🎯 PETANQUE</h2><div style={note}><b>Saisie 100 % caméra.</b> L’application mesure chaque impact et attribue les fléchettes au bon joueur grâce à leur apparition et à leur signature visuelle.</div><div style={{...note,borderColor:"#ffce5c55",background:"#ffce5c10"}}>⚠️ Pour une reconnaissance fiable, utilisez des sets bien différenciés : ailettes, couleurs, shafts, motifs ou formes nettement distincts.</div></section>
      <section style={card}><h3 style={subtitle}>1 · JOUEURS</h3><PlayerPagedSelector profiles={profiles} selectedIds={selectedIds} onToggle={toggle} accent={ACCENT} usageMode="closest_center" /></section>
      <section style={card}><h3 style={subtitle}>2 · FORMAT</h3><div style={grid}>{[1,3,5,7,10].map(n=><button key={n} style={pill(rounds===n)} onClick={()=>setRounds(n)}>{n} manche{n>1?"s":""}</button>)}</div><div style={grid}><button style={pill(pointsMode==="descending")} onClick={()=>setPointsMode("descending")}>Tous les impacts classés</button><button style={pill(pointsMode==="winner")} onClick={()=>setPointsMode("winner")}>Seul le plus proche marque</button></div></section>
      <section style={card}><h3 style={subtitle}>3 · ÉQUIPES</h3><button style={pill(teamMode)} onClick={()=>setTeamMode(v=>!v)}>{teamMode?"MODE ÉQUIPE A / B ACTIVÉ":"MODE INDIVIDUEL"}</button>{teamMode?<div style={{fontSize:12,color:"#aeb8c8",marginTop:8}}>Les joueurs sélectionnés sont répartis A/B en alternance. Les points individuels alimentent automatiquement le total de l’équipe.</div>:null}</section>
      <section style={card}><h3 style={subtitle}>4 · DÉROULÉ CAMÉRA</h3><ol style={{margin:0,paddingLeft:20,color:"#cad5e1",lineHeight:1.65,fontSize:13}}><li>Enrôlement IA des 3 fléchettes de chaque joueur.</li><li>Contrôle que les sets sont suffisamment différents.</li><li>Capture de la cible vide et calibration.</li><li>Chaque joueur lance 3 fléchettes sans les retirer.</li><li>La caméra détecte les nouveaux impacts, mesure leur distance au centre et les attribue.</li><li>Fin de manche : classement global des impacts puis points joueur/équipe.</li></ol></section>
      <button disabled={!selectedIds.length} onClick={start} style={{minHeight:54,borderRadius:18,border:`1px solid ${ACCENT}`,background:`linear-gradient(135deg,${ACCENT}33,#1677ff33)`,color:"#fff",fontWeight:1000,fontSize:16,opacity:selectedIds.length?1:.45}}>LANCER L’ENRÔLEMENT IA →</button>
    </div>
  </div>;
}
const card:React.CSSProperties={border:"1px solid rgba(255,255,255,.1)",background:"rgba(255,255,255,.035)",borderRadius:18,padding:14,boxShadow:"0 12px 35px rgba(0,0,0,.25)"};
const title:React.CSSProperties={margin:"0 0 10px",fontSize:22,letterSpacing:.5};
const subtitle:React.CSSProperties={margin:"0 0 10px",fontSize:13,letterSpacing:1.2,color:ACCENT};
const note:React.CSSProperties={padding:11,borderRadius:14,border:`1px solid ${ACCENT}33`,background:`${ACCENT}0f`,fontSize:13,lineHeight:1.5,color:"#dbe9f4",marginTop:8};
const grid:React.CSSProperties={display:"flex",gap:8,flexWrap:"wrap",marginTop:8};
const pill=(active:boolean):React.CSSProperties=>({minHeight:38,padding:"7px 12px",borderRadius:999,border:`1px solid ${active?ACCENT:"rgba(255,255,255,.12)"}`,background:active?`${ACCENT}22`:"rgba(255,255,255,.03)",color:"#fff",fontWeight:900});
