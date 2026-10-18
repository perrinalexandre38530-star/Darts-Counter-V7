// @ts-nocheck
import React from "react";
import BackDot from "../components/BackDot";
import PageHeader from "../components/PageHeader";
import PlayerPagedSelector from "../components/PlayerPagedSelector";
import { getTicker } from "../lib/tickers";
import petanqueExplainPortrait from "../assets/petanque_explain/petanque_explain_vertical.webp";
import petanqueExplainLandscape from "../assets/petanque_explain/petanque_explain_horizontal.webp";

const ACCENT = "#44e7ff";

const FORMATS:any = {
  duo:       { label:"DUO · 1 VS 1", sideSize:1, total:2, darts:3, note:"1 joueur par équipe · 3 fléchettes chacun" },
  doublette: { label:"DOUBLETTE · 2 VS 2", sideSize:2, total:4, darts:3, note:"2 joueurs par équipe · 3 fléchettes chacun" },
  triplette: { label:"TRIPLETTE · 3 VS 3", sideSize:3, total:6, darts:2, note:"3 joueurs par équipe · 2 fléchettes chacun" },
  quadrette: { label:"QUADRETTE · 4 VS 4", sideSize:4, total:8, darts:2, note:"4 joueurs par équipe · 2 fléchettes chacun" },
};

export default function ClosestCenterConfig(props: any) {
  const go = props.go ?? props.setTab;
  const profiles = React.useMemo(() => (Array.isArray(props.store?.profiles) ? props.store.profiles : []).filter((p:any)=>!p?.isBot), [props.store?.profiles]);

  const [formatMode, setFormatMode] = React.useState<keyof typeof FORMATS>("duo");
  const fmt = FORMATS[formatMode];
  const [selectedIds, setSelectedIds] = React.useState<string[]>(() => profiles.slice(0, 2).map((p:any)=>String(p.id)));
  const [rounds, setRounds] = React.useState(3);
  const [targetScore, setTargetScore] = React.useState(13);
  const [teamMap, setTeamMap] = React.useState<Record<string,"A"|"B">>({});
  const [pointsMode, setPointsMode] = React.useState<"petanque"|"descending"|"winner">("petanque");
  const [inputMode, setInputMode] = React.useState<"camera"|"manual">("camera");
  const [configMode, setConfigMode] = React.useState<"guided"|"complete">("guided");
  const [guidedStep, setGuidedStep] = React.useState(0);

  const ticker = getTicker("closest_center") || getTicker("darts_games") || "";

  React.useEffect(() => {
    setSelectedIds(prev => prev.slice(0, fmt.total));
  }, [formatMode]);

  const toggle = (id:string) => setSelectedIds(prev => {
    const sid=String(id);
    if (prev.includes(sid)) return prev.filter(x=>x!==sid);
    if (prev.length >= fmt.total) return prev;
    return [...prev,sid];
  });

  const selectedProfiles = profiles.filter((p:any)=>selectedIds.includes(String(p.id)));

  React.useEffect(() => {
    setTeamMap(prev => {
      const next:any={};
      selectedIds.forEach((id,i) => next[id]=prev[id] || (i < fmt.sideSize ? "A" : "B"));
      return next;
    });
  }, [selectedIds.join("|"), formatMode]);

  const teamCounts = React.useMemo(() => selectedIds.reduce((acc:any,id) => {
    const team=teamMap[id] || "A";
    acc[team]=(acc[team]||0)+1;
    return acc;
  }, {A:0,B:0}), [selectedIds,teamMap]);

  const assignTeam = (id:string, team:"A"|"B") => {
    const old = teamMap[id] || "A";
    if (old===team) return;
    setTeamMap(v=>{
      const next={...v,[id]:team} as Record<string,"A"|"B">;
      const targetMembers=selectedIds.filter(pid=>pid!==id && (v[pid] || "A")===team);
      if (targetMembers.length >= fmt.sideSize) {
        // Les deux équipes sont pleines : permute automatiquement un joueur
        // afin de toujours conserver le format exact (1v1, 2v2, 3v3, 4v4).
        const swapId=targetMembers[targetMembers.length-1];
        next[swapId]=old;
      }
      return next;
    });
  };

  const exactPlayers = selectedIds.length === fmt.total;
  const exactTeams = exactPlayers && teamCounts.A === fmt.sideSize && teamCounts.B === fmt.sideSize;
  const canStart = exactPlayers && exactTeams;

  const start = () => {
    if (!canStart) return;
    const selected = selectedIds.map((id:string,i:number) => {
      const p=profiles.find((x:any)=>String(x.id)===String(id));
      return {
        id:String(id),
        name:p?.name||p?.displayName||`Joueur ${i+1}`,
        avatar:p?.avatarDataUrl||p?.avatarUrl||p?.avatar||null,
        teamId:teamMap[id] || (i < fmt.sideSize ? "A":"B"),
      };
    });
    go?.("closest_center_play", {
      config: {
        rounds: pointsMode === "petanque" ? 99 : rounds,
        targetScore: pointsMode === "petanque" ? targetScore : null,
        teamMode:true,
        formatMode,
        sideSize:fmt.sideSize,
        pointsMode,
        players:selected,
        dartsPerPlayer:fmt.darts,
        dartsPerTeam:fmt.darts*fmt.sideSize,
        inputMode,
        cameraOnly: inputMode === "camera",
      }
    });
  };

  const steps = ["CONCEPT", "FORMAT", "JOUEURS", "RÈGLE", "SAISIE"];
  const canNext = guidedStep < steps.length - 1;
  const canPrev = guidedStep > 0;

  const renderConcept = () => <>
    <section style={card}>
      <h2 style={title}>🎯 DARTS PÉTANQUE</h2>
      <div style={note}><b>Principe principal : la logique de la pétanque réelle.</b> Deux équipes jouent une mène. L’équipe dont la meilleure fléchette est la plus proche du bull marque autant de points qu’elle possède de fléchettes mieux placées que la meilleure fléchette adverse.</div>
      <div style={{...note,borderColor:"#8fffc255",background:"#39d98a10"}}><b>Saisie manuelle épurée :</b> tu ne renseignes que les fléchettes qui marquent. Aucun besoin de classer toutes les fléchettes ni de mesurer des millimètres.</div>
      <div style={{...note,borderColor:"#ffce5c55",background:"#ffce5c10"}}><b>Variantes disponibles :</b> Top 5 (5/4/3/2/1) ou “seul le plus proche”. Elles restent séparées de la règle Pétanque.</div>
    </section>
    <section style={card}><h3 style={subtitle}>AWENA · EXPLICATION VISUELLE</h3><picture><source media="(max-width: 840px)" srcSet={petanqueExplainPortrait}/><img src={petanqueExplainLandscape} alt="Awena vous explique Darts Pétanque" style={{width:"100%",display:"block",borderRadius:16,border:"1px solid rgba(68,231,255,.26)",background:"#02070d"}}/></picture></section>
  </>;

  const renderFormat = () => <section style={card}>
    <h3 style={subtitle}>1 · FORMAT D’ÉQUIPES</h3>
    <div style={{display:"grid",gridTemplateColumns:"repeat(2,minmax(0,1fr))",gap:8}}>
      {Object.entries(FORMATS).map(([key,v]:any)=><button key={key} style={modeBtn(formatMode===key)} onClick={()=>setFormatMode(key as any)}><b>{v.label}</b><small style={{display:"block",marginTop:4,opacity:.72}}>{v.note}</small></button>)}
    </div>
    <div style={{...note,marginTop:10}}><b>{fmt.label}</b> · {fmt.darts} fléchette{fmt.darts>1?"s":""} en main par joueur · {fmt.darts*fmt.sideSize} fléchette{fmt.darts*fmt.sideSize>1?"s":""} maximum par équipe dans la mène.</div>
  </section>;

  const renderPlayers = () => <section style={card}>
    <h3 style={subtitle}>2 · JOUEURS & ÉQUIPES</h3>
    <div style={{fontSize:12,color:"#9fb1bf",marginBottom:9}}>Sélectionne exactement <b>{fmt.total} joueurs</b> pour {fmt.label}. Les bots sont exclus.</div>
    <PlayerPagedSelector profiles={profiles} selectedIds={selectedIds} onToggle={toggle} accent={ACCENT} usageMode="closest_center"/>
    <div style={{marginTop:10,display:"grid",gap:7}}>
      {selectedProfiles.map((p:any,i:number)=>{
        const id=String(p.id); const team=teamMap[id]||(i<fmt.sideSize?"A":"B");
        return <div key={id} style={{display:"grid",gridTemplateColumns:"1fr auto auto",gap:7,alignItems:"center",padding:"7px 0",borderBottom:"1px solid rgba(255,255,255,.06)"}}>
          <div><b style={{fontSize:12}}>{p.name||p.displayName||`Joueur ${i+1}`}</b><small style={{display:"block",color:"#8395a3",marginTop:2}}>{fmt.darts} fléchette{fmt.darts>1?"s":""}</small></div>
          <button style={pill(team==="A")} onClick={()=>assignTeam(id,"A")}>ÉQUIPE A</button>
          <button style={pill(team==="B")} onClick={()=>assignTeam(id,"B")}>ÉQUIPE B</button>
        </div>
      })}
    </div>
    <div style={{marginTop:10,fontSize:11,color:exactTeams?"#8fffc2":"#ffbd93"}}>Équipe A : {teamCounts.A}/{fmt.sideSize} · Équipe B : {teamCounts.B}/{fmt.sideSize} · Sélection : {selectedIds.length}/{fmt.total}</div>
  </section>;

  const renderRule = () => <section style={card}>
    <h3 style={subtitle}>3 · RÈGLE & MANCHES</h3>
    {pointsMode==="petanque"
      ? <div style={{...note,marginTop:0}}><b>Fin de partie :</b> première équipe à atteindre l’objectif. <div style={{...grid,marginTop:8}}>{[7,11,13].map(n=><button key={n} style={pill(targetScore===n)} onClick={()=>setTargetScore(n)}>OBJECTIF {n}</button>)}</div></div>
      : <div style={grid}>{[1,3,5,7,10].map(n=><button key={n} style={pill(rounds===n)} onClick={()=>setRounds(n)}>{n} manche{n>1?"s":""}</button>)}</div>}
    <div style={{display:"grid",gap:8,marginTop:10}}>
      <button style={modeBtn(pointsMode==="petanque")} onClick={()=>setPointsMode("petanque")}><b>⚪ RÈGLE PÉTANQUE</b><small style={{display:"block",marginTop:4,opacity:.72}}>1 point par fléchette de l’équipe gagnante mieux placée que la meilleure adverse</small></button>
      <button style={modeBtn(pointsMode==="descending")} onClick={()=>setPointsMode("descending")}><b>🎯 VARIANTE TOP 5</b><small style={{display:"block",marginTop:4,opacity:.72}}>5 / 4 / 3 / 2 / 1 points pour les cinq meilleures fléchettes</small></button>
      <button style={modeBtn(pointsMode==="winner")} onClick={()=>setPointsMode("winner")}><b>🥇 VARIANTE PLUS PROCHE</b><small style={{display:"block",marginTop:4,opacity:.72}}>seule la fléchette la plus proche marque 1 point</small></button>
    </div>
  </section>;

  const renderInput = () => <section style={card}>
    <h3 style={subtitle}>4 · MODE DE SAISIE</h3>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
      <button style={modeBtn(inputMode==="camera")} onClick={()=>setInputMode("camera")}>📷 CAMÉRA IA</button>
      <button style={modeBtn(inputMode==="manual")} onClick={()=>setInputMode("manual")}>✍️ MANUEL · LOCAL</button>
    </div>
    {inputMode==="camera"?<>
      <ol style={{margin:"12px 0 0",paddingLeft:20,color:"#cad5e1",lineHeight:1.6,fontSize:13}}>
        <li>Enrôlement IA des fléchettes de chaque joueur.</li>
        <li>Calibration projective 5 points.</li>
        <li>Pré-contrôle avant chaque volée.</li>
        <li>Le joueur lance exactement <b>{fmt.darts}</b> fléchette{fmt.darts>1?"s":""}.</li>
        <li>L’IA mesure tous les impacts pour appliquer automatiquement la règle choisie.</li>
      </ol>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginTop:10}}>
        <button onClick={()=>go?.("camera_scoring_setup",{returnTab:"closest_center_config"})} style={navBtn}>📷 CONFIGURER / CALIBRER</button>
        <button disabled={!canStart} onClick={start} style={{...navBtn,borderColor:ACCENT,background:`${ACCENT}18`,opacity:canStart?1:.4}}>▶ LANCER</button>
      </div>
    </>:<>
      <div style={{...note,marginTop:12,borderColor:"#8fffc255",background:"#39d98a10"}}>
        {pointsMode==="petanque"
          ? <><b>Règle Pétanque :</b> en fin de mène, choisis seulement l’équipe qui marque puis ajoute uniquement les fléchettes gagnantes. Exemple : A possède 3 fléchettes mieux placées que la meilleure de B → saisis uniquement ces 3 fléchettes = 3 points.</>
          : pointsMode==="winner"
          ? <><b>Variante Plus proche :</b> indique uniquement le propriétaire de la fléchette gagnante.</>
          : <><b>Variante Top 5 :</b> renseigne uniquement les cinq fléchettes qui scorent, dans l’ordre #1 à #5.</>}
      </div>
      <button disabled={!canStart} onClick={start} style={{...navBtn,width:"100%",marginTop:10,borderColor:"#8fffc2",background:"rgba(57,217,138,.12)",opacity:canStart?1:.4}}>▶ LANCER EN SAISIE MANUELLE</button>
    </>}
  </section>;

  return <div style={{height:"100%",display:"flex",flexDirection:"column",background:"linear-gradient(180deg,#07111b,#04070d)",color:"#fff"}}>
    <PageHeader tickerSrc={ticker} tickerAlt="DARTS PÉTANQUE" tickerHeight={74} left={<BackDot onClick={()=>go?.("games")} color={ACCENT}/>}/>
    <div style={{flex:1,overflow:"auto",padding:12,display:"grid",gap:12,maxWidth:980,width:"100%",margin:"0 auto"}}>
      <section style={{...card,padding:9,display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
        <button style={modeBtn(configMode==="guided")} onClick={()=>setConfigMode("guided")}>CONFIG GUIDÉE</button>
        <button style={modeBtn(configMode==="complete")} onClick={()=>setConfigMode("complete")}>CONFIG COMPLÈTE</button>
      </section>
      {configMode==="guided"?<>
        <section style={{...card,padding:8,display:"grid",gridTemplateColumns:"repeat(5,minmax(0,1fr))",gap:6}}>{steps.map((step,i)=><button key={step} onClick={()=>setGuidedStep(i)} style={{minHeight:44,borderRadius:12,border:`1px solid ${i===guidedStep?ACCENT:"rgba(255,255,255,.08)"}`,background:i===guidedStep?`${ACCENT}1f`:"rgba(255,255,255,.025)",color:i===guidedStep?"#fff":"#8798a6",fontWeight:1000,fontSize:9}}>{i+1}<br/>{step}</button>)}</section>
        {guidedStep===0?renderConcept():guidedStep===1?renderFormat():guidedStep===2?renderPlayers():guidedStep===3?renderRule():renderInput()}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
          <button disabled={!canPrev} onClick={()=>setGuidedStep(v=>Math.max(0,v-1))} style={{...navBtn,opacity:canPrev?1:.35}}>← PRÉCÉDENT</button>
          {canNext?<button onClick={()=>setGuidedStep(v=>Math.min(steps.length-1,v+1))} style={navBtn}>SUIVANT →</button>:<button disabled={!canStart} onClick={start} style={{...navBtn,borderColor:ACCENT,background:`${ACCENT}20`,opacity:canStart?1:.4}}>{inputMode==="camera"?"LANCER L’ENRÔLEMENT IA →":"LANCER LA PARTIE MANUELLE →"}</button>}
        </div>
      </>:<>{renderConcept()}{renderFormat()}{renderPlayers()}{renderRule()}{renderInput()}<button disabled={!canStart} onClick={start} style={{minHeight:54,borderRadius:18,border:`1px solid ${ACCENT}`,background:`linear-gradient(135deg,${ACCENT}33,#1677ff33)`,color:"#fff",fontWeight:1000,fontSize:16,opacity:canStart?1:.45}}>{inputMode==="camera"?"LANCER L’ENRÔLEMENT IA →":"LANCER LA PARTIE MANUELLE →"}</button></>}
    </div>
  </div>;
}

const card:React.CSSProperties={border:"1px solid rgba(255,255,255,.1)",background:"rgba(255,255,255,.035)",borderRadius:18,padding:14,boxShadow:"0 12px 35px rgba(0,0,0,.25)"};
const title:React.CSSProperties={margin:"0 0 10px",fontSize:22,letterSpacing:.5};
const subtitle:React.CSSProperties={margin:"0 0 10px",fontSize:13,letterSpacing:1.2,color:ACCENT};
const note:React.CSSProperties={padding:11,borderRadius:14,border:`1px solid ${ACCENT}33`,background:`${ACCENT}0f`,fontSize:13,lineHeight:1.5,color:"#dbe9f4",marginTop:8};
const grid:React.CSSProperties={display:"flex",gap:8,flexWrap:"wrap",marginTop:8};
const pill=(active:boolean):React.CSSProperties=>({minHeight:38,padding:"7px 12px",borderRadius:999,border:`1px solid ${active?ACCENT:"rgba(255,255,255,.12)"}`,background:active?`${ACCENT}22`:"rgba(255,255,255,.03)",color:"#fff",fontWeight:900});
const modeBtn=(active:boolean):React.CSSProperties=>({minHeight:50,borderRadius:14,border:`1px solid ${active?ACCENT:"rgba(255,255,255,.1)"}`,background:active?`linear-gradient(135deg,${ACCENT}25,#1677ff20)`:"rgba(255,255,255,.025)",color:active?"#fff":"#8fa0ae",fontWeight:1000,fontSize:12,letterSpacing:.6,padding:"8px 10px",textAlign:"left"});
const navBtn:React.CSSProperties={minHeight:48,borderRadius:14,border:"1px solid rgba(255,255,255,.14)",background:"rgba(255,255,255,.05)",color:"#fff",fontWeight:1000};
