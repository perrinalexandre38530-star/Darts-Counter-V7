// @ts-nocheck
import React from "react";
import BackDot from "../components/BackDot";
import PageHeader from "../components/PageHeader";
import ProfileAvatar from "../components/ProfileAvatar";
import bssArt from "../assets/bss/bss_original.jpg";
import { useFullscreenPlay } from "../hooks/useFullscreenPlay";
import { History } from "../lib/history";
import type { Dart as UIDart } from "../lib/types";
import { NewModeInput, dartLabel, isBotProfile, playerName, resolveModeProfiles, uiToGameDart } from "./newModes/newModePlayShared";
import { cloneBssState, createBssState, normalizeBssConfig, pickBssBotDarts, playBssVisit, type BssState } from "../lib/gameEngines/bssKingEngine";
import { useAwenaOptional } from "../awena/AwenaProvider";
import { PremiumAwenaButton } from "./newModes/PremiumPartyModeUi";
import "./newModes/PremiumPartyModeUi.css";

const GOLD="#f0c76a", RED="#d74855", BG="#09080b", SOFT="#a9a1a5";
const COLORS=["#f0c76a","#ff667a","#65d7ff","#7df2a7","#bc8cff","#ff9b54","#f9ed69","#6de4da","#ff7dd1","#9dc3ff"];

function panel(extra:any={}){return {border:"1px solid rgba(255,255,255,.09)",borderRadius:18,background:"linear-gradient(180deg,rgba(30,23,26,.96),rgba(10,9,12,.98))",boxShadow:"0 12px 30px rgba(0,0,0,.34)",...extra};}
function scoreLabel(d:any){try{return dartLabel(d)}catch{return "—"}}

export default function BssKingPlay(props:any){
  useFullscreenPlay({enabled:true,lockBodyScroll:true});
  const awena=useAwenaOptional();
  const go=props?.go??props?.setTab, store=props?.store, onFinish=props?.onFinish;
  const resumeRecord=props?.params?.rec||props?.params?.record||props?.params?.match||null;
  const config=React.useMemo(()=>normalizeBssConfig(props?.params?.config||resumeRecord?.resume?.config||resumeRecord?.payload?.config||{}),[]);
  const profiles=React.useMemo(()=>resolveModeProfiles(config,store),[config,store]);
  const players=React.useMemo(()=>profiles.map((p:any,i:number)=>({id:String(p.id||`p${i+1}`),name:playerName(p,i)})),[profiles]);
  const restored=resumeRecord?.resume?.state||resumeRecord?.payload?.stateSnapshot||resumeRecord?.payload?.state||null;
  const [state,setState]=React.useState<BssState>(()=>restored?.mode==="bss_king"?cloneBssState(restored):createBssState(players,config));
  const [currentThrow,setCurrentThrow]=React.useState<UIDart[]>(()=>Array.isArray(resumeRecord?.resume?.currentThrow)?resumeRecord.resume.currentThrow.slice(0,3):[]);
  const [multiplier,setMultiplier]=React.useState<1|2|3>(1);
  const [notice,setNotice]=React.useState("");
  const [undo,setUndo]=React.useState<BssState[]>([]);
  const botBusy=React.useRef(false),finishedRef=React.useRef(false),checkpointRef=React.useRef(false);
  const matchIdRef=React.useRef(String(resumeRecord?.id||resumeRecord?.matchId||`bss-${Date.now()}-${Math.random().toString(36).slice(2,8)}`));
  const profileById=React.useMemo(()=>new Map(profiles.map((p:any)=>[String(p.id),p])),[profiles]);
  const botIds=React.useMemo(()=>new Set((config.botIds||[]).map(String)),[config.botIds]);
  const active=state.players[state.activePlayerIndex], activeProfile=active?profileById.get(String(active.id))||active:null;
  const activeIsBot=!!activeProfile&&isBotProfile(activeProfile,botIds);
  const activeColor=active?COLORS[Math.max(0,state.players.findIndex((p:any)=>p.id===active.id))%COLORS.length]:GOLD;
  const throneMode=Boolean(active&&state.throneReady?.[active.id]);
  const challenge=throneMode?{kind:"throne",title:"PRENDS LE TRÔNE",subtitle:config.rules.throneFinish==="dbull"?"DBULL 50 obligatoire":"BULL 25 ou DBULL 50",icon:"👑"}:state.challenge;

  const buildRecord=React.useCallback((s:BssState,status:"in_progress"|"finished",draft:UIDart[]=currentThrow)=>{
    const rows=profiles.map((p:any)=>({id:String(p.id),name:playerName(p),avatarDataUrl:p.avatarDataUrl??null}));
    const ranking=[...s.players].map((p:any,i:number)=>({id:p.id,name:p.name,badges:Number(s.badges[p.id]||0),influence:Number(s.influence[p.id]||0),order:i})).sort((a,b)=>b.badges-a.badges||b.influence-a.influence||a.order-b.order);
    return {id:matchIdRef.current,matchId:matchIdRef.current,resumeId:matchIdRef.current,kind:"bss_king",mode:"bss_king",sport:"darts",status,createdAt:s.startedAt,updatedAt:Date.now(),finishedAt:status==="finished"?(s.finishedAt||Date.now()):undefined,winnerId:s.winnerId,players:rows,
      game:{mode:"bss_king",badgesToThrone:s.config.rules.badgesToThrone},summary:{mode:"bss_king",finished:status==="finished",winnerId:s.winnerId,badges:s.badges,influence:s.influence,ranking,config:s.config,totalDarts:Object.values(s.statsByPlayer||{}).reduce((a:number,r:any)=>a+Number(r?.darts||0),0),durationMs:Math.max(0,(status==="finished"?(s.finishedAt||Date.now()):Date.now())-Number(s.startedAt||Date.now()))},
      resume:{mode:"bss_king",config:s.config,state:cloneBssState(s),currentThrow:draft.slice(0,3),updatedAt:Date.now()},payload:{kind:"bss_king",mode:"bss_king",sport:"darts",config:s.config,stateSnapshot:cloneBssState(s),currentThrow:draft.slice(0,3),visits:s.visits,stats:{mode:"bss_king",players:s.statsByPlayer,badges:s.badges,influence:s.influence}}};
  },[profiles,currentThrow]);

  const save=React.useCallback(async(s:BssState,draft:UIDart[]=currentThrow)=>{try{await History.upsert(buildRecord(s,"in_progress",draft));}catch(e){console.warn("[BSS KING] checkpoint failed",e);}},[buildRecord,currentThrow]);
  React.useEffect(()=>{if(checkpointRef.current)return;checkpointRef.current=true;if(state.phase!=="finished")void save(state,currentThrow);},[save,state,currentThrow]);
  React.useEffect(()=>{if(state.phase==="finished")return;const t=window.setTimeout(()=>void save(state,currentThrow),180);return()=>window.clearTimeout(t);},[state.activePlayerIndex,state.round,currentThrow,save]);
  React.useEffect(()=>{if(state.phase!=="finished"||finishedRef.current)return;finishedRef.current=true;const rec=buildRecord(state,"finished",[]);if(typeof onFinish==="function")onFinish(rec,{navigate:false});else void History.upsert(rec).catch(()=>{});},[state,onFinish,buildRecord]);

  const validate=React.useCallback(()=>{if(!active||activeIsBot||!currentThrow.length)return;const darts=currentThrow.map(uiToGameDart);setUndo(v=>[...v.slice(-9),cloneBssState(state)]);const next=playBssVisit(state,darts);const last=next.visits[next.visits.length-1];setState(next);setCurrentThrow([]);setMultiplier(1);setNotice(last?.events?.[0]||"");},[active,activeIsBot,currentThrow,state]);
  const doUndo=React.useCallback(()=>{if(currentThrow.length){setCurrentThrow(v=>v.slice(0,-1));return;}setUndo(v=>{const copy=[...v],prev=copy.pop();if(prev){setState(prev);setNotice("Dernière tournée annulée");}return copy;});},[currentThrow]);

  React.useEffect(()=>{if(state.phase!=="playing"||!activeIsBot||botBusy.current)return;botBusy.current=true;const t=window.setTimeout(()=>{const darts=pickBssBotDarts(state,config.botLevel);setUndo(v=>[...v.slice(-9),cloneBssState(state)]);const next=playBssVisit(state,darts);const last=next.visits[next.visits.length-1];setState(next);setNotice(last?.events?.[0]||"");botBusy.current=false;},620);return()=>{window.clearTimeout(t);botBusy.current=false;};},[state,activeIsBot,config.botLevel]);

  React.useEffect(()=>{awena?.setRuntimeContext?.({route:"bss_king_play",modeId:"bss_king",screenLabel:"BSS KING · Partie",facts:{round:state.round,challenge:challenge.title,badgesToThrone:config.rules.badgesToThrone,activePlayer:active?.name||""}});},[awena,state.round,challenge.title,active?.name,config.rules.badgesToThrone]);

  const ranking=React.useMemo(()=>[...state.players].map((p:any,i:number)=>({p,badges:Number(state.badges[p.id]||0),influence:Number(state.influence[p.id]||0),i})).sort((a,b)=>b.badges-a.badges||b.influence-a.influence||a.i-b.i),[state.players,state.badges,state.influence]);
  const winner=state.winnerId?profileById.get(String(state.winnerId))||state.players.find((p:any)=>p.id===state.winnerId):null;

  if(state.phase==="finished") return <div style={{height:"100dvh",overflow:"auto",background:`radial-gradient(circle at 50% 12%,rgba(215,72,85,.24),transparent 34%),${BG}`,color:"#fff"}}>
    <PageHeader tickerSrc={bssArt} tickerAlt="BSS KING" tickerHeight={72} tickerFit="cover" left={<div style={{marginLeft:7}}><BackDot onClick={()=>go?.("bss_king_config")} color={GOLD} glow={`${GOLD}88`}/></div>} />
    <div style={{maxWidth:900,margin:"0 auto",padding:"18px 14px 90px"}}>
      <section style={panel({padding:20,textAlign:"center",border:`1px solid ${GOLD}66`,boxShadow:`0 0 34px ${GOLD}20,0 18px 50px rgba(0,0,0,.5)`})}>
        <div style={{fontSize:13,fontWeight:1000,letterSpacing:2,color:GOLD}}>👑 BSS KING 👑</div>
        <div style={{display:"grid",placeItems:"center",marginTop:12}}><ProfileAvatar profile={winner} size={96} showStars={false} ringColor={GOLD}/></div>
        <div style={{fontSize:30,fontWeight:1100,marginTop:8}}>{playerName(winner)}</div>
        <div style={{color:SOFT,marginTop:4}}>s'assoit sur le trône et devient le BSS KING.</div>
        <img src={bssArt} alt="Il était une fois les BSS" style={{width:"100%",maxHeight:270,objectFit:"cover",borderRadius:15,marginTop:16,border:"1px solid rgba(255,255,255,.1)"}}/>
        <div style={{display:"grid",gridTemplateColumns:"repeat(2,minmax(0,1fr))",gap:8,marginTop:16}}>
          <button onClick={()=>{const fresh=createBssState(players,config);setState(fresh);setUndo([]);setNotice("");finishedRef.current=false;matchIdRef.current=`bss-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;}} style={{padding:13,borderRadius:999,border:`1px solid ${GOLD}99`,background:`${GOLD}18`,color:"#fff",fontWeight:1000}}>↻ REJOUER</button>
          <button onClick={()=>go?.("bss_king_config")} style={{padding:13,borderRadius:999,border:"1px solid rgba(255,255,255,.15)",background:"rgba(255,255,255,.06)",color:"#fff",fontWeight:1000}}>CONFIGURATION</button>
        </div>
        <button onClick={()=>go?.("games",{gamesView:"all"})} style={{width:"100%",marginTop:8,padding:13,borderRadius:999,border:"1px solid rgba(255,255,255,.12)",background:"rgba(255,255,255,.035)",color:"#ddd",fontWeight:900}}>RETOUR AUX JEUX</button>
      </section>
    </div>
  </div>;

  return <div style={{height:"100dvh",minHeight:0,overflow:"hidden",background:`radial-gradient(circle at 50% 0%,rgba(215,72,85,.17),transparent 32%),${BG}`,color:"#fff",display:"flex",flexDirection:"column"}} data-mss-native-play-layout="1">
    <PageHeader tickerSrc={bssArt} tickerAlt="BSS KING" tickerHeight={68} tickerFit="cover" tickerBottomGap={8} left={<div style={{marginLeft:7}}><BackDot onClick={()=>go?.("bss_king_config")} color={activeColor} glow={`${activeColor}88`}/></div>} right={awena?.enabled!==false?<div style={{marginRight:7}}><PremiumAwenaButton awena={awena} route="bss_king_play" mode="bss_king" screenLabel="BSS KING · Partie" accent={activeColor}/></div>:null}/>
    <main style={{flex:"1 1 auto",minHeight:0,overflow:"hidden",padding:"0 10px 10px"}}>
      <div style={{height:"100%",display:"grid",gridTemplateColumns:"minmax(0,1.05fr) minmax(320px,.95fr)",gap:10}} className="bss-play-grid">
        <div style={{minHeight:0,overflow:"auto",display:"grid",alignContent:"start",gap:9,paddingBottom:8}}>
          <section style={panel({padding:10,border:`1px solid ${activeColor}55`,background:`linear-gradient(180deg,${activeColor}10,rgba(10,9,12,.98))`})}>
            <div style={{display:"grid",gridTemplateColumns:"58px minmax(0,1fr) auto",gap:10,alignItems:"center"}}>
              <ProfileAvatar profile={activeProfile} size={58} showStars={false} ringColor={activeColor}/>
              <div style={{minWidth:0}}><div style={{fontSize:10,color:activeColor,fontWeight:1000,letterSpacing:1}}>TOURNÉE {state.round} · {throneMode?"PHASE TRÔNE":"BSS"}</div><div style={{fontSize:22,fontWeight:1100,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{active?.name}</div><div style={{color:SOFT,fontSize:10,marginTop:2}}>{notice||"À toi de jouer."}</div></div>
              <div style={{textAlign:"center"}}><div style={{fontSize:30,fontWeight:1100,color:activeColor}}>{state.badges[active?.id]||0}</div><div style={{fontSize:8,color:SOFT}}>ÉCUSSONS / {config.rules.badgesToThrone}</div></div>
            </div>
          </section>

          <section style={panel({padding:12,border:`1px solid ${throneMode?GOLD:RED}55`,background:throneMode?"linear-gradient(135deg,rgba(240,199,106,.14),rgba(31,19,22,.98))":"linear-gradient(135deg,rgba(215,72,85,.13),rgba(31,19,22,.98))"})}>
            <div style={{display:"flex",gap:10,alignItems:"center"}}><div style={{fontSize:34}}>{challenge.icon}</div><div><div style={{fontSize:10,color:throneMode?GOLD:RED,fontWeight:1000,letterSpacing:1}}>DÉFI EN COURS</div><div style={{fontSize:18,fontWeight:1100}}>{challenge.title}</div><div style={{fontSize:10.5,color:SOFT,marginTop:3}}>{challenge.subtitle}</div></div></div>
          </section>

          <section style={panel({padding:9})}>
            <div style={{display:"grid",gridTemplateColumns:`repeat(${Math.min(5,Math.max(2,state.players.length))},minmax(0,1fr))`,gap:6}}>
              {ranking.map(({p,badges,influence}:any)=>{const prof=profileById.get(String(p.id))||p, on=p.id===active?.id; return <div key={p.id} style={{padding:"8px 6px",borderRadius:13,border:`1px solid ${on?activeColor:"rgba(255,255,255,.08)"}`,background:on?`${activeColor}10`:"rgba(255,255,255,.025)",textAlign:"center",minWidth:0}}><ProfileAvatar profile={prof} size={34} showStars={false} ringColor={on?activeColor:"rgba(255,255,255,.16)"}/><div style={{marginTop:4,fontSize:9,fontWeight:900,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{p.name}</div><div style={{marginTop:3,fontSize:13,fontWeight:1100,color:on?activeColor:GOLD}}>👑 {badges}</div><div style={{fontSize:7.8,color:SOFT}}>INF {influence}</div></div>})}
            </div>
          </section>

          <section style={panel({padding:10})}>
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,minmax(0,1fr))",gap:6}}>
              <div style={{textAlign:"center"}}><b style={{fontSize:18,color:activeColor}}>{state.roundScores[active?.id]||0}</b><div style={{fontSize:7.5,color:SOFT}}>TOURNÉE</div></div>
              <div style={{textAlign:"center"}}><b style={{fontSize:18}}>{state.influence[active?.id]||0}</b><div style={{fontSize:7.5,color:SOFT}}>INFLUENCE</div></div>
              <div style={{textAlign:"center"}}><b style={{fontSize:18}}>{state.statsByPlayer[active?.id]?.challengeWins||0}</b><div style={{fontSize:7.5,color:SOFT}}>DÉFIS GAGNÉS</div></div>
              <div style={{textAlign:"center"}}><b style={{fontSize:18}}>{state.statsByPlayer[active?.id]?.throneAttempts||0}</b><div style={{fontSize:7.5,color:SOFT}}>TRÔNE</div></div>
            </div>
          </section>

          <section style={panel({padding:10})}>
            <div style={{fontSize:9.5,color:GOLD,fontWeight:1000,letterSpacing:1}}>DERNIÈRES CHRONIQUES BSS</div>
            <div style={{marginTop:6,display:"grid",gap:4}}>{state.events.slice(-4).reverse().map((e:string,i:number)=><div key={`${e}-${i}`} style={{fontSize:9.5,color:i===0?"#fff":SOFT,lineHeight:1.4,borderTop:i?"1px solid rgba(255,255,255,.05)":"none",paddingTop:i?4:0}}>{e}</div>)}</div>
          </section>
        </div>

        <div style={{minHeight:0,overflow:"hidden"}}>
          {!activeIsBot?<NewModeInput currentThrow={currentThrow} setCurrentThrow={setCurrentThrow} multiplier={multiplier} setMultiplier={setMultiplier} onValidate={validate} onCancel={()=>{setCurrentThrow([]);setMultiplier(1)}} preferredMethod={config.scoreInputMethod} minDartsToValidate={1} validateLabel={throneMode?"TENTER LE TRÔNE":"VALIDER LA TOURNÉE"} accent={activeColor} fitMinScale={0.18} centerSlot={<div style={{textAlign:"center",fontSize:10,fontWeight:1000,color:activeColor}}>{currentThrow.length?currentThrow.map((d:any)=>scoreLabel(uiToGameDart(d))).join(" · "):challenge.icon}</div>}/>:<div style={{...panel({padding:18,height:"100%",display:"grid",placeItems:"center",textAlign:"center"})}}><div><ProfileAvatar profile={activeProfile} size={84} showStars={false} ringColor={activeColor}/><div style={{fontSize:20,fontWeight:1100,marginTop:10}}>{active?.name}</div><div style={{color:SOFT,marginTop:5}}>Le BOT BSS prépare sa tournée…</div></div></div>}
          <button onClick={doUndo} disabled={!currentThrow.length&&!undo.length} style={{position:"absolute",right:18,bottom:18,padding:"8px 12px",borderRadius:999,border:"1px solid rgba(255,255,255,.12)",background:"rgba(0,0,0,.55)",color:"#fff",fontWeight:900,opacity:(!currentThrow.length&&!undo.length)?.4:1}}>↶ ANNULER</button>
        </div>
      </div>
    </main>
    <style>{`@media (max-width: 780px){.bss-play-grid{grid-template-columns:1fr!important;grid-template-rows:minmax(0,.95fr) minmax(280px,1.05fr)!important}.bss-play-grid>div:first-child{max-height:44dvh}.bss-play-grid>div:last-child{min-height:0;position:relative}} @media (orientation:portrait) and (max-width:560px){.bss-play-grid{grid-template-rows:minmax(0,.8fr) minmax(330px,1.2fr)!important}.bss-play-grid>div:first-child{max-height:39dvh}}`}</style>
  </div>;
}
