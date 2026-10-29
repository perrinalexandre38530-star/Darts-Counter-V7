// @ts-nocheck
import React from "react";
import BackDot from "../components/BackDot";
import PageHeader from "../components/PageHeader";
import PlayerPagedSelector from "../components/PlayerPagedSelector";
import { getTicker } from "../lib/tickers";
import petanqueExplainPortrait from "../assets/petanque_explain/petanque_explain_vertical.webp";
import petanqueExplainLandscape from "../assets/petanque_explain/petanque_explain_horizontal.webp";
import { CLOSEST_CENTER_LOCAL_SOURCE_ID, describeClosestCenterCameraSource } from "../lib/closestCenterCameraSource";

const ACCENT = "#44e7ff";

type ConfigIconName = "concept"|"format"|"players"|"rule"|"camera"|"manual"|"play";
function ConfigIcon({name,size=18}:{name:ConfigIconName;size?:number}){
  const q={fill:"none",stroke:"currentColor",strokeWidth:2,strokeLinecap:"round",strokeLinejoin:"round"} as const;
  const c={width:size,height:size,viewBox:"0 0 24 24",ariaHidden:true};
  if(name==="players") return <svg {...c}><circle {...q} cx="9" cy="8" r="3"/><circle {...q} cx="17" cy="9" r="2.4"/><path {...q} d="M3.5 20a5.5 5.5 0 0 1 11 0M14 20a4.2 4.2 0 0 1 7 0"/></svg>;
  if(name==="camera") return <svg {...c}><rect {...q} x="3" y="6" width="18" height="13" rx="3"/><circle {...q} cx="12" cy="12.5" r="4"/><path {...q} d="M8 6l1.5-2h5L16 6"/></svg>;
  if(name==="manual") return <svg {...c}><path {...q} d="M5 19h4l10-10-4-4L5 15v4Z"/><path {...q} d="m13 7 4 4"/></svg>;
  if(name==="format") return <svg {...c}><rect {...q} x="3" y="5" width="8" height="6" rx="2"/><rect {...q} x="13" y="5" width="8" height="6" rx="2"/><rect {...q} x="8" y="14" width="8" height="6" rx="2"/></svg>;
  if(name==="rule") return <svg {...c}><path {...q} d="M5 4h14v16H5zM8 8h8M8 12h6M8 16h4"/></svg>;
  if(name==="play") return <svg {...c}><circle {...q} cx="12" cy="12" r="9"/><path {...q} d="m10 8 5 4-5 4V8Z"/></svg>;
  return <svg {...c}><circle {...q} cx="12" cy="12" r="8"/><circle {...q} cx="12" cy="12" r="4"/><path {...q} d="M12 2v3M22 12h-3M12 22v-3M2 12h3"/></svg>;
}

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
  const [cameraSourceId] = React.useState<string>(CLOSEST_CENTER_LOCAL_SOURCE_ID);
  const cameraSource = React.useMemo(() => describeClosestCenterCameraSource(cameraSourceId), [cameraSourceId]);
  const [configMode, setConfigMode] = React.useState<"guided"|"complete">("guided");
  const [guidedStep, setGuidedStep] = React.useState(0);
  const [landscape, setLandscape] = React.useState(() => typeof window !== "undefined" ? window.innerWidth > window.innerHeight && window.innerWidth >= 760 : false);

  const ticker = getTicker("closest_center") || getTicker("darts_games") || "";

  React.useEffect(() => {
    const sync = () => setLandscape(window.innerWidth > window.innerHeight && window.innerWidth >= 760);
    sync(); window.addEventListener("resize", sync); window.addEventListener("orientationchange", sync);
    return () => { window.removeEventListener("resize", sync); window.removeEventListener("orientationchange", sync); };
  }, []);

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
        cameraSourceId,
      }
    });
  };

  const steps = ["CONCEPT", "FORMAT", "JOUEURS", "RÈGLE", "SAISIE"];
  const canNext = guidedStep < steps.length - 1;
  const canPrev = guidedStep > 0;

  const renderConcept = () => <>
    <section style={card}>
      <div style={{display:"flex",alignItems:"center",gap:8}}><span style={iconDisc}><ConfigIcon name="concept" size={19}/></span><h2 style={{...title,margin:0}}>DARTS PÉTANQUE</h2></div>
      <div style={note}><b>Principe principal : la logique de la pétanque réelle.</b> Deux équipes jouent une mène. L’équipe dont la meilleure fléchette est la plus proche du bull marque autant de points qu’elle possède de fléchettes mieux placées que la meilleure fléchette adverse.</div>
      <div style={{...note,borderColor:"#8fffc255",background:"#39d98a10"}}><b>Saisie manuelle épurée :</b> tu ne renseignes que les fléchettes qui marquent. Aucun besoin de classer toutes les fléchettes ni de mesurer des millimètres.</div>
      <div style={{...note,borderColor:"#ffce5c55",background:"#ffce5c10"}}><b>Variantes disponibles :</b> Top 5 (5/4/3/2/1) ou “seul le plus proche”. Elles restent séparées de la règle Pétanque.</div>
    </section>
    {!landscape ? <details style={{...card,padding:0,overflow:"hidden"}}><summary style={{listStyle:"none",cursor:"pointer",padding:"10px 12px",display:"flex",alignItems:"center",justifyContent:"space-between",gap:8}}><span style={{display:"flex",alignItems:"center",gap:8}}><span style={iconDisc}><ConfigIcon name="concept" size={17}/></span><b style={{fontSize:11,color:ACCENT,letterSpacing:.8}}>AWENA EXPLIQUE</b></span><span style={{fontSize:9,color:"#8395a3",fontWeight:900}}>OUVRIR ▾</span></summary><div style={{padding:"0 10px 10px"}}><picture><source media="(max-width: 840px)" srcSet={petanqueExplainPortrait}/><img src={petanqueExplainLandscape} alt="Awena vous explique Darts Pétanque" style={{width:"100%",display:"block",maxHeight:"44vh",objectFit:"contain",borderRadius:14,border:"1px solid rgba(68,231,255,.22)",background:"#02070d"}}/></picture></div></details> : null}
  </>;

  const renderFormat = () => <section style={card}>
    <div style={sectionHead}><span style={iconDisc}><ConfigIcon name="format" size={17}/></span><h3 style={{...subtitle,margin:0}}>FORMAT D’ÉQUIPES</h3></div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(2,minmax(0,1fr))",gap:8}}>
      {Object.entries(FORMATS).map(([key,v]:any)=><button key={key} style={modeBtn(formatMode===key)} onClick={()=>setFormatMode(key as any)}><b>{v.label}</b><small style={{display:"block",marginTop:4,opacity:.72}}>{v.note}</small></button>)}
    </div>
    <div style={{...note,marginTop:10}}><b>{fmt.label}</b> · {fmt.darts} fléchette{fmt.darts>1?"s":""} en main par joueur · {fmt.darts*fmt.sideSize} fléchette{fmt.darts*fmt.sideSize>1?"s":""} maximum par équipe dans la mène.</div>
  </section>;

  const renderPlayers = () => <section style={card}>
    <div style={sectionHead}><span style={iconDisc}><ConfigIcon name="players" size={17}/></span><h3 style={{...subtitle,margin:0}}>JOUEURS & ÉQUIPES</h3></div>
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
    <div style={sectionHead}><span style={iconDisc}><ConfigIcon name="rule" size={17}/></span><h3 style={{...subtitle,margin:0}}>RÈGLE & OBJECTIF</h3></div>
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
    <div style={sectionHead}><span style={iconDisc}><ConfigIcon name={inputMode==="camera"?"camera":"manual"} size={17}/></span><h3 style={{...subtitle,margin:0}}>MODE DE SAISIE</h3></div>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
      <button style={{...modeBtn(inputMode==="camera"),display:"flex",alignItems:"center",justifyContent:"center",gap:8,textAlign:"center"}} onClick={()=>setInputMode("camera")}><ConfigIcon name="camera"/>CAMÉRA IA</button>
      <button style={{...modeBtn(inputMode==="manual"),display:"flex",alignItems:"center",justifyContent:"center",gap:8,textAlign:"center"}} onClick={()=>setInputMode("manual")}><ConfigIcon name="manual"/>MANUEL · LOCAL</button>
    </div>
    {inputMode==="camera"?<>
      <div style={{marginTop:10,padding:"9px 10px",borderRadius:14,border:"1px solid rgba(68,231,255,.24)",background:"rgba(68,231,255,.06)",display:"flex",alignItems:"center",justifyContent:"space-between",gap:10}}>
        <div style={{minWidth:0}}>
          <div style={{fontSize:9,fontWeight:1000,letterSpacing:1,color:ACCENT}}>SOURCE DE SCORING</div>
          <div style={{fontSize:12,fontWeight:900,color:"#fff",marginTop:2}}>{cameraSource.label}</div>
          <div style={{fontSize:10,color:"#91a2b1",marginTop:2}}>Une seule source fournit à la fois l’aperçu et les frames analysées.</div>
        </div>
        <span style={{padding:"5px 8px",borderRadius:999,border:"1px solid rgba(143,255,194,.28)",color:"#8fffc2",fontSize:9,fontWeight:1000,whiteSpace:"nowrap"}}>ACTIVE</span>
      </div>
      <ol style={{margin:"12px 0 0",paddingLeft:20,color:"#cad5e1",lineHeight:1.6,fontSize:13}}>
        <li>Enrôlement IA des fléchettes de chaque joueur.</li>
        <li>Calibration projective 5 points.</li>
        <li>Pré-contrôle avant chaque volée.</li>
        <li>Le joueur lance exactement <b>{fmt.darts}</b> fléchette{fmt.darts>1?"s":""}.</li>
        <li>L’IA mesure tous les impacts pour appliquer automatiquement la règle choisie.</li>
      </ol>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginTop:10}}>
        <button onClick={()=>go?.("camera_scoring_calibration",{returnTab:"closest_center_config",cameraSourceId})} style={navBtn}>CALIBRER LA SOURCE</button>
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

  const configMain = <div style={{display:"grid",gap:10,alignContent:"start"}}>
    <section style={{...card,padding:8,display:"grid",gridTemplateColumns:"1fr 1fr",gap:7}}>
      <button style={{...modeBtn(configMode==="guided"),textAlign:"center"}} onClick={()=>setConfigMode("guided")}>◉ CONFIG GUIDÉE</button>
      <button style={{...modeBtn(configMode==="complete"),textAlign:"center"}} onClick={()=>setConfigMode("complete")}>▦ CONFIG COMPLÈTE</button>
    </section>
    {configMode==="guided"?<>
      <section style={{...card,padding:7,display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(64px,1fr))",gap:5}}>{steps.map((step,i)=>{const names:any=["concept","format","players","rule",inputMode==="camera"?"camera":"manual"];return <button key={step} onClick={()=>setGuidedStep(i)} title={step} style={{minHeight:44,borderRadius:12,border:`1px solid ${i===guidedStep?ACCENT:"rgba(255,255,255,.08)"}`,background:i===guidedStep?`${ACCENT}18`:"rgba(255,255,255,.025)",color:i===guidedStep?ACCENT:"#8798a6",fontWeight:1000,fontSize:8,display:"grid",placeItems:"center",gap:2}}><ConfigIcon name={names[i]} size={17}/><span>{step}</span></button>})}</section>
      {guidedStep===0?renderConcept():guidedStep===1?renderFormat():guidedStep===2?renderPlayers():guidedStep===3?renderRule():renderInput()}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
        <button disabled={!canPrev} onClick={()=>setGuidedStep(v=>Math.max(0,v-1))} style={{...navBtn,opacity:canPrev?1:.35}}>← PRÉCÉDENT</button>
        {canNext?<button onClick={()=>setGuidedStep(v=>Math.min(steps.length-1,v+1))} style={navBtn}>SUIVANT →</button>:<button disabled={!canStart} onClick={start} style={{...navBtn,borderColor:ACCENT,background:`${ACCENT}20`,opacity:canStart?1:.4}}>{inputMode==="camera"?"LANCER L’ENRÔLEMENT IA →":"LANCER LA PARTIE MANUELLE →"}</button>}
      </div>
    </>:<>{renderConcept()}{renderFormat()}{renderPlayers()}{renderRule()}{renderInput()}<button disabled={!canStart} onClick={start} style={{minHeight:52,borderRadius:16,border:`1px solid ${ACCENT}`,background:`linear-gradient(135deg,${ACCENT}33,#1677ff33)`,color:"#fff",fontWeight:1000,fontSize:15,opacity:canStart?1:.45}}>{inputMode==="camera"?"LANCER L’ENRÔLEMENT IA →":"LANCER LA PARTIE MANUELLE →"}</button></>}
  </div>;

  const landscapeAside = <aside style={{...card,padding:10,display:"grid",gridTemplateRows:"auto minmax(0,1fr) auto",gap:8,minHeight:0,overflow:"hidden",background:"linear-gradient(180deg,rgba(11,25,36,.98),rgba(5,11,17,.98))"}}>
    <div style={{display:"flex",justifyContent:"space-between",gap:8,alignItems:"center"}}><div><div style={{fontSize:9,color:ACCENT,fontWeight:1000,letterSpacing:1.1}}>AWENA EXPLIQUE</div><b style={{fontSize:13}}>DARTS PÉTANQUE</b></div><span style={{padding:"5px 8px",borderRadius:999,border:`1px solid ${inputMode==="camera"?ACCENT:"#8fffc2"}55`,fontSize:9,fontWeight:1000,color:inputMode==="camera"?ACCENT:"#8fffc2"}}>{inputMode==="camera"?"CAMÉRA IA":"MANUEL"}</span></div>
    <div style={{minHeight:0,overflow:"hidden",display:"grid",placeItems:"center"}}><img src={petanqueExplainLandscape} alt="Awena vous explique Darts Pétanque" style={{width:"100%",height:"100%",maxHeight:"100%",objectFit:"contain",display:"block",borderRadius:14,border:"1px solid rgba(68,231,255,.22)",background:"#02070d"}}/></div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(2,minmax(0,1fr))",gap:6}}>
      <div style={summaryKpi}><span>FORMAT</span><b>{String(fmt.label).split(" · ")[0]}</b></div>
      <div style={summaryKpi}><span>RÈGLE</span><b>{pointsMode==="petanque"?`PÉTANQUE · ${targetScore}`:pointsMode==="descending"?"TOP 5":"PLUS PROCHE"}</b></div>
      <div style={summaryKpi}><span>JOUEURS</span><b>{selectedIds.length}/{fmt.total}</b></div>
      <div style={summaryKpi}><span>FLÉCHETTES</span><b>{fmt.darts}/JOUEUR</b></div>
    </div>
  </aside>;

  return <div style={{height:"100%",minHeight:0,display:"flex",flexDirection:"column",overflow:"hidden",background:"linear-gradient(180deg,#07111b,#04070d)",color:"#fff"}}>
    <PageHeader tickerSrc={ticker} tickerAlt="DARTS PÉTANQUE" tickerHeight={landscape?56:72} left={<BackDot onClick={()=>go?.("games")} color={ACCENT}/>}/>
    <div style={{flex:1,minHeight:0,overflow:"hidden",padding:landscape?9:12,maxWidth:landscape?1320:980,width:"100%",margin:"0 auto",display:"grid",gridTemplateColumns:landscape?"minmax(0,1.22fr) minmax(330px,.78fr)":"1fr",gap:10}}>
      <div style={{minHeight:0,overflow:"auto",paddingRight:landscape?2:0}}>{configMain}</div>
      {landscape ? landscapeAside : null}
    </div>
  </div>;
}

const card:React.CSSProperties={border:"1px solid rgba(255,255,255,.10)",background:"linear-gradient(180deg,rgba(13,24,34,.82),rgba(5,11,17,.78))",borderRadius:18,padding:14,boxShadow:"0 14px 36px rgba(0,0,0,.26), inset 0 1px 0 rgba(255,255,255,.035)",backdropFilter:"blur(12px)"};
const title:React.CSSProperties={margin:"0 0 10px",fontSize:22,letterSpacing:.5};
const subtitle:React.CSSProperties={margin:"0 0 10px",fontSize:13,letterSpacing:1.2,color:ACCENT};
const note:React.CSSProperties={padding:11,borderRadius:14,border:`1px solid ${ACCENT}33`,background:`${ACCENT}0f`,fontSize:13,lineHeight:1.5,color:"#dbe9f4",marginTop:8};
const grid:React.CSSProperties={display:"flex",gap:8,flexWrap:"wrap",marginTop:8};
const pill=(active:boolean):React.CSSProperties=>({minHeight:38,padding:"7px 12px",borderRadius:999,border:`1px solid ${active?ACCENT:"rgba(255,255,255,.12)"}`,background:active?`${ACCENT}22`:"rgba(255,255,255,.03)",color:"#fff",fontWeight:900});
const modeBtn=(active:boolean):React.CSSProperties=>({minHeight:50,borderRadius:14,border:`1px solid ${active?ACCENT:"rgba(255,255,255,.1)"}`,background:active?`linear-gradient(135deg,${ACCENT}25,#1677ff20)`:"rgba(255,255,255,.025)",color:active?"#fff":"#8fa0ae",fontWeight:1000,fontSize:12,letterSpacing:.6,padding:"8px 10px",textAlign:"left"});
const navBtn:React.CSSProperties={minHeight:48,borderRadius:14,border:"1px solid rgba(255,255,255,.14)",background:"rgba(255,255,255,.05)",color:"#fff",fontWeight:1000};
const summaryKpi:React.CSSProperties={padding:"8px 9px",borderRadius:12,border:"1px solid rgba(255,255,255,.08)",background:"rgba(255,255,255,.03)",minWidth:0};
const sectionHead:React.CSSProperties={display:"flex",alignItems:"center",gap:8,marginBottom:10};
const iconDisc:React.CSSProperties={width:34,height:34,borderRadius:11,border:`1px solid ${ACCENT}44`,background:`${ACCENT}0e`,color:ACCENT,display:"grid",placeItems:"center",flex:"0 0 auto"};
