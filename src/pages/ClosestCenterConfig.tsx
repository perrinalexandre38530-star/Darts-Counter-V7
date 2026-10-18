// @ts-nocheck
import React from "react";
import BackDot from "../components/BackDot";
import PageHeader from "../components/PageHeader";
import PlayerPagedSelector from "../components/PlayerPagedSelector";
import { getTicker } from "../lib/tickers";
import petanqueExplainPortrait from "../assets/petanque_explain/petanque_explain_vertical.webp";
import petanqueExplainLandscape from "../assets/petanque_explain/petanque_explain_horizontal.webp";

const ACCENT = "#44e7ff";
export default function ClosestCenterConfig(props: any) {
  const go = props.go ?? props.setTab;
  const profiles = React.useMemo(() => (Array.isArray(props.store?.profiles) ? props.store.profiles : []).filter((p:any)=>!p?.isBot), [props.store?.profiles]);
  const [selectedIds, setSelectedIds] = React.useState<string[]>(() => profiles.slice(0, 2).map((p:any)=>String(p.id)));
  const [rounds, setRounds] = React.useState(3);
  const [teamMode, setTeamMode] = React.useState(false);
  const [teamMap, setTeamMap] = React.useState<Record<string,"A"|"B">>({});
  const [pointsMode, setPointsMode] = React.useState<"descending"|"winner">("descending");
  const [inputMode, setInputMode] = React.useState<"camera"|"manual">("camera");
  const [configMode, setConfigMode] = React.useState<"guided"|"complete">("guided");
  const [guidedStep, setGuidedStep] = React.useState(0);
  const ticker = getTicker("closest_center") || getTicker("darts_games") || "";
  const toggle = (id:string) => setSelectedIds(prev => prev.includes(String(id)) ? prev.filter(x=>x!==String(id)) : prev.length < 8 ? [...prev, String(id)] : prev);
  const start = () => {
    if (!selectedIds.length) return;
    const selected = profiles.filter((p:any)=>selectedIds.includes(String(p.id))).map((p:any,i:number)=>({ id:String(p.id), name:p.name||p.displayName||`Joueur ${i+1}`, avatar:p.avatarDataUrl||p.avatarUrl||p.avatar||null, teamId: teamMode ? (teamMap[String(p.id)] || (i%2===0?"A":"B")) : null }));
    go?.("closest_center_play", { config: { rounds, teamMode, pointsMode, players:selected, dartsPerPlayer:3, inputMode, cameraOnly: inputMode === "camera" } });
  };
  const selectedProfiles = profiles.filter((p:any)=>selectedIds.includes(String(p.id)));
  const steps = ["CONCEPT", "JOUEURS", "FORMAT", "ÉQUIPES", "SAISIE"];
  const canNext = guidedStep < steps.length - 1;
  const canPrev = guidedStep > 0;
  const renderConcept = () => <>
    <section style={card}><h2 style={title}>🎯 PETANQUE</h2><div style={note}><b>Deux saisies disponibles.</b> En mode CAMÉRA, l’application mesure automatiquement chaque impact et attribue les fléchettes au bon joueur. En mode MANUEL, aucune caméra n’est requise : tu saisis simplement la distance au centre de chacune des 3 fléchettes.</div><div style={{...note,borderColor:"#ffce5c55",background:"#ffce5c10"}}>⚠️ En caméra, utilise des sets bien différenciés. En manuel, mesure en millimètres depuis le centre du bull jusqu’au point d’impact.</div></section>
    <section style={card}><h3 style={subtitle}>AWENA · EXPLICATION VISUELLE</h3><div style={{fontSize:12,color:"#bfd0de",lineHeight:1.55,marginBottom:10}}>Retrouve le guide du mode directement dans la configuration. En affichage vertical, la version portrait est utilisée ; en affichage large, la version paysage reste affichée.</div><picture><source media="(max-width: 840px)" srcSet={petanqueExplainPortrait} /><img src={petanqueExplainLandscape} alt="Awena vous explique le mode PETANQUE" style={{width:"100%",display:"block",borderRadius:16,border:"1px solid rgba(68,231,255,.26)",background:"#02070d",boxShadow:"0 18px 40px rgba(0,0,0,.28)"}} /></picture></section>
  </>;
  const renderPlayers = () => <section style={card}><h3 style={subtitle}>1 · JOUEURS</h3><div style={{fontSize:12,color:"#9fb1bf",marginBottom:9}}>Sélectionne de 1 à 8 joueurs. Les bots sont volontairement exclus : l’IA doit reconnaître de vraies fléchettes physiques.</div><PlayerPagedSelector profiles={profiles} selectedIds={selectedIds} onToggle={toggle} accent={ACCENT} usageMode="closest_center" /></section>;
  const renderFormat = () => <section style={card}><h3 style={subtitle}>2 · FORMAT</h3><div style={grid}>{[1,3,5,7,10].map(n=><button key={n} style={pill(rounds===n)} onClick={()=>setRounds(n)}>{n} manche{n>1?"s":""}</button>)}</div><div style={grid}><button style={pill(pointsMode==="descending")} onClick={()=>setPointsMode("descending")}>Top 5 · 5 / 4 / 3 / 2 / 1 pts</button><button style={pill(pointsMode==="winner")} onClick={()=>setPointsMode("winner")}>Seul le plus proche · 1 pt</button></div><div style={{fontSize:11,color:"#97a9b7",marginTop:8,lineHeight:1.45}}>En Top 5, plusieurs fléchettes du même joueur peuvent occuper plusieurs rangs et cumuler leurs points.</div></section>;
  const renderTeams = () => <section style={card}><h3 style={subtitle}>3 · ÉQUIPES</h3><button style={pill(teamMode)} onClick={()=>setTeamMode(v=>!v)}>{teamMode?"MODE ÉQUIPE A / B ACTIVÉ":"MODE INDIVIDUEL"}</button>{teamMode?<div style={{marginTop:10,display:"grid",gap:7}}><div style={{fontSize:12,color:"#aeb8c8"}}>Attribue chaque joueur à son équipe. Les points de toutes ses fléchettes sont ensuite cumulés automatiquement dans le total de l’équipe.</div>{selectedProfiles.map((p:any,i:number)=>{const id=String(p.id);const team=teamMap[id]||(i%2===0?"A":"B");return <div key={id} style={{display:"grid",gridTemplateColumns:"1fr auto auto",gap:7,alignItems:"center",padding:"7px 0",borderBottom:"1px solid rgba(255,255,255,.06)"}}><b style={{fontSize:12}}>{p.name||p.displayName||`Joueur ${i+1}`}</b><button style={pill(team==="A")} onClick={()=>setTeamMap(v=>({...v,[id]:"A"}))}>ÉQUIPE A</button><button style={pill(team==="B")} onClick={()=>setTeamMap(v=>({...v,[id]:"B"}))}>ÉQUIPE B</button></div>})}</div>:null}</section>;
  const renderCamera = () => <section style={card}><h3 style={subtitle}>4 · MODE DE SAISIE</h3><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}><button style={modeBtn(inputMode==="camera")} onClick={()=>setInputMode("camera")}>📷 CAMÉRA IA</button><button style={modeBtn(inputMode==="manual")} onClick={()=>setInputMode("manual")}>✍️ MANUEL · LOCAL</button></div>{inputMode==="camera"?<><ol style={{margin:"12px 0 0",paddingLeft:20,color:"#cad5e1",lineHeight:1.65,fontSize:13}}><li>Enrôlement IA des 3 fléchettes de chaque joueur.</li><li>Contrôle que les sets sont suffisamment différents.</li><li>Calibration projective 5 points : centre + D20 + D6 + D3 + D11.</li><li>Capture multi-frame de la cible vide, contrôle netteté / exposition / dérive.</li><li>Chaque joueur lance 3 fléchettes sans les retirer.</li><li>La caméra détecte les pointes, mesure la distance au centre et attribue les propriétaires.</li></ol><div style={{...note,marginTop:12}}><b>Précision maximale :</b> téléphone fixe, cible entière visible, calibration 5 points et profil SCORING CAMÉRA adapté. Le Play refuse les mesures instrumentales trop incertaines.</div><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginTop:10}}><button onClick={()=>go?.("camera_scoring_setup",{returnTab:"closest_center_config"})} style={navBtn}>📷 CONFIGURER / CALIBRER</button><button disabled={!selectedIds.length} onClick={start} style={{...navBtn,borderColor:ACCENT,background:`${ACCENT}18`,opacity:selectedIds.length?1:.4}}>👁 APERÇU ÉCRAN PLAY</button></div></>:<><div style={{...note,marginTop:12,borderColor:"#8fffc255",background:"#39d98a10"}}><b>100 % hors-ligne et sans caméra.</b> À chaque volée, saisis la distance au centre en millimètres pour les 3 fléchettes. Utilise MISS si une fléchette ne doit pas participer au classement. Le moteur Top 5 / équipes / historique reste identique.</div><button disabled={!selectedIds.length} onClick={start} style={{...navBtn,width:"100%",marginTop:10,borderColor:"#8fffc2",background:"rgba(57,217,138,.12)",opacity:selectedIds.length?1:.4}}>▶ LANCER EN SAISIE MANUELLE</button></>}</section>;
  return <div style={{height:"100%",display:"flex",flexDirection:"column",background:"linear-gradient(180deg,#07111b,#04070d)",color:"#fff"}}>
    <PageHeader tickerSrc={ticker} tickerAlt="PETANQUE" tickerHeight={74} left={<BackDot onClick={()=>go?.("games")} color={ACCENT}/>} />
    <div style={{flex:1,overflow:"auto",padding:12,display:"grid",gap:12,maxWidth:980,width:"100%",margin:"0 auto"}}>
      <section style={{...card,padding:9,display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}><button style={modeBtn(configMode==="guided")} onClick={()=>setConfigMode("guided")}>CONFIG GUIDÉE</button><button style={modeBtn(configMode==="complete")} onClick={()=>setConfigMode("complete")}>CONFIG COMPLÈTE</button></section>
      {configMode==="guided" ? <>
        <section style={{...card,padding:8,display:"grid",gridTemplateColumns:"repeat(5,minmax(0,1fr))",gap:6}}>{steps.map((step,i)=><button key={step} onClick={()=>setGuidedStep(i)} style={{minHeight:44,borderRadius:12,border:`1px solid ${i===guidedStep?ACCENT:"rgba(255,255,255,.08)"}`,background:i===guidedStep?`${ACCENT}1f`:"rgba(255,255,255,.025)",color:i===guidedStep?"#fff":"#8798a6",fontWeight:1000,fontSize:9}}>{i+1}<br/>{step}</button>)}</section>
        {guidedStep===0?renderConcept():guidedStep===1?renderPlayers():guidedStep===2?renderFormat():guidedStep===3?renderTeams():renderCamera()}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}><button disabled={!canPrev} onClick={()=>setGuidedStep(v=>Math.max(0,v-1))} style={{...navBtn,opacity:canPrev?1:.35}}>← PRÉCÉDENT</button>{canNext?<button onClick={()=>setGuidedStep(v=>Math.min(steps.length-1,v+1))} style={navBtn}>SUIVANT →</button>:<button disabled={!selectedIds.length} onClick={start} style={{...navBtn,borderColor:ACCENT,background:`${ACCENT}20`,opacity:selectedIds.length?1:.4}}>{inputMode==="camera"?"LANCER L’ENRÔLEMENT IA →":"LANCER LA PARTIE MANUELLE →"}</button>}</div>
      </> : <>{renderConcept()}{renderPlayers()}{renderFormat()}{renderTeams()}{renderCamera()}<button disabled={!selectedIds.length} onClick={start} style={{minHeight:54,borderRadius:18,border:`1px solid ${ACCENT}`,background:`linear-gradient(135deg,${ACCENT}33,#1677ff33)`,color:"#fff",fontWeight:1000,fontSize:16,opacity:selectedIds.length?1:.45}}>{inputMode==="camera"?"LANCER L’ENRÔLEMENT IA →":"LANCER LA PARTIE MANUELLE →"}</button></>}
    </div>
  </div>;
}
const card:React.CSSProperties={border:"1px solid rgba(255,255,255,.1)",background:"rgba(255,255,255,.035)",borderRadius:18,padding:14,boxShadow:"0 12px 35px rgba(0,0,0,.25)"};
const title:React.CSSProperties={margin:"0 0 10px",fontSize:22,letterSpacing:.5};
const subtitle:React.CSSProperties={margin:"0 0 10px",fontSize:13,letterSpacing:1.2,color:ACCENT};
const note:React.CSSProperties={padding:11,borderRadius:14,border:`1px solid ${ACCENT}33`,background:`${ACCENT}0f`,fontSize:13,lineHeight:1.5,color:"#dbe9f4",marginTop:8};
const grid:React.CSSProperties={display:"flex",gap:8,flexWrap:"wrap",marginTop:8};
const pill=(active:boolean):React.CSSProperties=>({minHeight:38,padding:"7px 12px",borderRadius:999,border:`1px solid ${active?ACCENT:"rgba(255,255,255,.12)"}`,background:active?`${ACCENT}22`:"rgba(255,255,255,.03)",color:"#fff",fontWeight:900});
const modeBtn=(active:boolean):React.CSSProperties=>({minHeight:46,borderRadius:14,border:`1px solid ${active?ACCENT:"rgba(255,255,255,.1)"}`,background:active?`linear-gradient(135deg,${ACCENT}25,#1677ff20)`:"rgba(255,255,255,.025)",color:active?"#fff":"#8fa0ae",fontWeight:1000,fontSize:12,letterSpacing:.6});
const navBtn:React.CSSProperties={minHeight:48,borderRadius:14,border:"1px solid rgba(255,255,255,.14)",background:"rgba(255,255,255,.05)",color:"#fff",fontWeight:1000};
