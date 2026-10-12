// @ts-nocheck
import React from "react";
import BackDot from "../components/BackDot";
import PageHeader from "../components/PageHeader";
import ProfileAvatar from "../components/ProfileAvatar";
import tickerCastle from "../assets/tickers/ticker_castle.webp";
import { useAwenaOptional } from "../awena/AwenaProvider";
import { useFullscreenPlay } from "../hooks/useFullscreenPlay";
import { History } from "../lib/history";
import type { Dart as UIDart } from "../lib/types";
import { playNewModeDartSequence, playNewModeDartSfx, playNewModeSfx, unlockNewModeAudio } from "../lib/newModesArcadeSfx";
import {
  assignCastleNumber, castleDartLabel, cloneCastleState, createCastleState, normalizeCastleConfig,
  pickCastleBotDarts, playCastleVisit, type CastleState,
} from "../lib/gameEngines/castleEngine";
import { NewModeInput, isBotProfile, lastEvents, playerName, resolveModeProfiles, uiToGameDart } from "./newModes/newModePlayShared";
import {
  ActiveHero, BotTurn, FloatingAdvice, KpiStrip, LogModal, PlayersModal, PremiumAwenaButton,
  PremiumEndPanel, QuickRow, RankingModal, StatsModal, SummaryStrip, bestBy, modePlayerColors, percent,
} from "./newModes/PremiumPartyModeUi";
import "./newModes/PremiumPartyModeUi.css";

const ACCENT = "#ffb33f";
const RED = "#ff633f";
const GREEN = "#67e7a9";

function castleRows(target: number) {
  if (target === 10) return [4, 3, 2, 1];
  if (target === 20) return [6, 5, 4, 3, 2];
  return [5, 4, 3, 2, 1];
}
function CastleMeter({ value, target, accent = ACCENT, compact = false }: any) {
  const bottomRows = castleRows(Number(target)); const topRows = [...bottomRows].reverse();
  const filledValue = Math.max(0, Math.min(Number(target) || 0, Number(value) || 0));
  return <div className="castle-bricks" aria-label={`${filledValue} briques sur ${target}`} style={{ display: "grid", gap: compact ? 2 : 3, justifyItems: "center" }}>
    {topRows.map((size, topIndex) => { const rowInBottomOrder = bottomRows.length - 1 - topIndex; const below = bottomRows.slice(0, rowInBottomOrder).reduce((sum, n) => sum + n, 0); const filled = Math.max(0, Math.min(size, filledValue - below)); return <div key={`${size}-${topIndex}`} style={{ display: "grid", gridTemplateColumns: `repeat(${size}, ${compact ? 8 : 13}px)`, gap: compact ? 2 : 3 }}>{Array.from({ length: size }, (_, idx) => { const on = idx < filled; return <span key={idx} style={{ width: compact ? 8 : 13, height: compact ? 5 : 9, borderRadius: 2, border: `1px solid ${on ? accent : "rgba(255,255,255,.13)"}`, background: on ? `linear-gradient(180deg,${accent},${RED})` : "rgba(255,255,255,.04)", boxShadow: on && !compact ? `0 0 7px ${accent}55` : "none" }} />; })}</div>; })}
  </div>;
}

function coachText(state: CastleState, activePlayer: any) {
  if (!activePlayer) return "";
  if (state.phase === "assignment") return "1 fléchette avec la main opposée sur un secteur 1–20.";
  const own = Number(state.bricks?.[activePlayer.id] || 0); const target = Number(state.config.rules.targetBricks || 15);
  const ownNum = Number(state.targets?.[activePlayer.id] || 0);
  if (target - own <= 3) return `Ton château est proche de la victoire : vise ${ownNum}.`;
  if (state.config.rules.attacksEnabled) {
    const threat = [...state.players].filter((p:any)=>p.id!==activePlayer.id).sort((a:any,b:any)=>Number(state.bricks[b.id]||0)-Number(state.bricks[a.id]||0))[0];
    if (threat && Number(state.bricks[threat.id] || 0) >= Math.ceil(target * .65)) return `${threat.name} devient dangereux : son secteur ${state.targets[threat.id]} peut être attaqué.`;
  }
  return `Construis sur ton secteur ${ownNum}. Double et Triple accélèrent la construction.`;
}

export default function CastlePlay(props: any) {
  useFullscreenPlay({ enabled: true, lockBodyScroll: true });
  const awena = useAwenaOptional(); const go = props?.go ?? props?.setTab; const store = props?.store; const onFinish = props?.onFinish;
  const resumeRecord = props?.params?.rec || props?.params?.record || props?.params?.match || null;
  const config = React.useMemo(() => normalizeCastleConfig(props?.params?.config || resumeRecord?.resume?.config || resumeRecord?.payload?.config || {}), []);
  const profiles = React.useMemo(() => resolveModeProfiles(config, store), [config, store]);
  const players = React.useMemo(() => profiles.map((p:any,i:number)=>({ id:String(p.id||`p${i+1}`), name:playerName(p,i) })), [profiles]);
  const botIds = React.useMemo(() => new Set((config.botIds || []).map(String)), [config.botIds]);
  const restored = resumeRecord?.resume?.state || resumeRecord?.payload?.stateSnapshot || resumeRecord?.payload?.state || null;
  const recoveredThrow = resumeRecord?.resume?.currentThrow ?? resumeRecord?.payload?.currentThrow;
  const [state,setState] = React.useState<CastleState>(()=>restored?.mode==="castle"?cloneCastleState(restored):createCastleState(players,config));
  const [currentThrow,setCurrentThrow] = React.useState<UIDart[]>(()=>Array.isArray(recoveredThrow)?recoveredThrow.slice(0,3):[]);
  const [multiplier,setMultiplier] = React.useState<1|2|3>(()=>{const v=resumeRecord?.resume?.multiplier??resumeRecord?.payload?.multiplier;return v===2||v===3?v:1;});
  const [undo,setUndo] = React.useState<CastleState[]>([]); const [notice,setNotice] = React.useState("");
  const [playersOpen,setPlayersOpen]=React.useState(false); const [statsOpen,setStatsOpen]=React.useState(false); const [logOpen,setLogOpen]=React.useState(false); const [rankingOpen,setRankingOpen]=React.useState(false);
  const botBusy=React.useRef(false); const finishedRef=React.useRef(false); const introPlayedRef=React.useRef(false); const initialCheckpointRef=React.useRef(false); const historyHydratedRef=React.useRef(false);
  const matchIdRef=React.useRef(String(resumeRecord?.id||resumeRecord?.matchId||`castle-${Date.now()}-${Math.random().toString(36).slice(2,8)}`));
  const profileById=React.useMemo(()=>new Map(profiles.map((p:any)=>[String(p.id),p])),[profiles]); const colorById=React.useMemo(()=>modePlayerColors(state.players,ACCENT),[state.players]);
  const activeIndex=state.phase==="assignment"?state.assignmentIndex:state.activePlayerIndex; const activePlayer=state.players[activeIndex]; const activeProfile=activePlayer?profileById.get(String(activePlayer.id))||activePlayer:null; const activeColor=activePlayer?colorById.get(String(activePlayer.id))||ACCENT:ACCENT; const activeIsBot=!!activeProfile&&isBotProfile(activeProfile,botIds);
  const sfxEnabled=(config as any).sfxEnabled!==false; const awenaEnabled=(config as any).awenaEnabled!==false; const coachEnabled=(config as any).coachEnabled!==false;
  const nameById=React.useCallback((id:any)=>state.players.find((p:any)=>String(p.id)===String(id))?.name||"Joueur",[state.players]);

  const buildRecord=React.useCallback((s:CastleState,status:"in_progress"|"finished",draft:UIDart[]=currentThrow,draftMultiplier:1|2|3=multiplier)=>{
    const rows=profiles.map((p:any)=>({id:String(p.id),name:playerName(p),avatarDataUrl:p.avatarDataUrl??null}));
    const perPlayer=Object.fromEntries(Object.entries(s.statsByPlayer).map(([id,st]:any)=>[id,{...st,bricks:Number(s.bricks[id]||0),target:Number(s.targets[id]||0),wins:Number(s.legWins[id]||0),accuracy:percent(st.usefulHits,st.darts)}]));
    const ranking=[...s.players].map((p:any,i:number)=>({id:p.id,name:p.name,wins:Number(s.legWins[p.id]||0),bricks:Number(s.bricks[p.id]||0),builds:Number(s.statsByPlayer[p.id]?.builds||0),damage:Number(s.statsByPlayer[p.id]?.damage||0),order:i})).sort((a,b)=>b.wins-a.wins||b.bricks-a.bricks||(b.builds+b.damage)-(a.builds+a.damage)||a.order-b.order);
    return {id:matchIdRef.current,matchId:matchIdRef.current,resumeId:matchIdRef.current,kind:"castle",mode:"castle",sport:"darts",status,createdAt:s.startedAt,updatedAt:Date.now(),finishedAt:status==="finished"?(s.finishedAt||Date.now()):undefined,winnerId:s.winnerId,players:rows,
      game:{mode:"castle",targetBricks:s.config.rules.targetBricks,seriesWins:s.config.seriesWins},summary:{mode:"castle",finished:status==="finished",winnerId:s.winnerId,legWins:s.legWins,targetBricks:s.config.rules.targetBricks,config:s.config,perPlayer,ranking,durationMs:Math.max(0,Number((status==="finished"?(s.finishedAt||Date.now()):Date.now()))-Number(s.startedAt||Date.now())),totalDarts:Object.values(s.statsByPlayer||{}).reduce((a:number,r:any)=>a+Number(r?.darts||0),0),totalBuilds:Object.values(s.statsByPlayer||{}).reduce((a:number,r:any)=>a+Number(r?.builds||0),0),totalDamage:Object.values(s.statsByPlayer||{}).reduce((a:number,r:any)=>a+Number(r?.damage||0),0)},
      resume:{mode:"castle",config:s.config,state:cloneCastleState(s),currentThrow:draft.slice(0,3),multiplier:draftMultiplier,updatedAt:Date.now()},payload:{kind:"castle",mode:"castle",sport:"darts",config:s.config,stateSnapshot:cloneCastleState(s),currentThrow:draft.slice(0,3),multiplier:draftMultiplier,visits:s.visits,visitHistory:s.visits,stats:{mode:"castle",players:s.statsByPlayer,legWins:s.legWins}}};
  },[profiles,currentThrow,multiplier]);
  const saveInProgress=React.useCallback(async(s:CastleState,draft:UIDart[]=currentThrow,m:1|2|3=multiplier)=>{try{await History.upsert(buildRecord(s,"in_progress",draft,m));}catch(e){console.warn("[CASTLE] checkpoint failed",e);}},[buildRecord,currentThrow,multiplier]);
  const persist=React.useCallback((s:CastleState)=>{if(s.phase==="finished"){if(finishedRef.current)return;finishedRef.current=true;const rec=buildRecord(s,"finished",[],1);if(typeof onFinish==="function")onFinish(rec,{navigate:false});else void History.upsert(rec).catch(()=>{});}else void saveInProgress(s,[],1);},[buildRecord,onFinish,saveInProgress]);

  React.useEffect(()=>{if(initialCheckpointRef.current)return;initialCheckpointRef.current=true;if(state.phase!=="finished")void saveInProgress(state,currentThrow,multiplier);},[saveInProgress,state,currentThrow,multiplier]);
  React.useEffect(()=>{if(state.phase==="finished")return;const t=window.setTimeout(()=>void saveInProgress(state,currentThrow,multiplier),190);return()=>window.clearTimeout(t);},[state,currentThrow,multiplier,saveInProgress]);
  React.useEffect(()=>{if(historyHydratedRef.current)return;const resumeId=String(props?.params?.resumeId||resumeRecord?.id||resumeRecord?.matchId||"").trim();if(!resumeId)return;let cancelled=false;void History.get(resumeId).then((full:any)=>{if(cancelled||!full)return;const r=full?.resume?.state||full?.payload?.stateSnapshot||full?.payload?.state;if(!r||r.mode!=="castle")return;historyHydratedRef.current=true;matchIdRef.current=String(full.id||full.matchId||resumeId);setState(cloneCastleState(r));const d=full?.resume?.currentThrow??full?.payload?.currentThrow;setCurrentThrow(Array.isArray(d)?d.slice(0,3):[]);const m=full?.resume?.multiplier??full?.payload?.multiplier;setMultiplier(m===2||m===3?m:1);setUndo([]);setNotice("Partie CASTLE reprise depuis l’historique");initialCheckpointRef.current=true;}).catch(()=>{});return()=>{cancelled=true;};},[props?.params?.resumeId,resumeRecord]);
  React.useEffect(()=>{const flush=()=>{if(state.phase!=="finished")void saveInProgress(state,currentThrow,multiplier)};const vis=()=>{if(document.visibilityState==="hidden")flush()};window.addEventListener("pagehide",flush);document.addEventListener("visibilitychange",vis);return()=>{window.removeEventListener("pagehide",flush);document.removeEventListener("visibilitychange",vis)};},[state,currentThrow,multiplier,saveInProgress]);

  React.useEffect(()=>{if(restored?.mode==="castle"||resumeRecord)return;const start=()=>{if(!sfxEnabled||introPlayedRef.current)return;introPlayedRef.current=true;void unlockNewModeAudio();playNewModeSfx("intro",true)};try{if((navigator as any)?.userActivation?.hasBeenActive){start();return;}}catch{}window.addEventListener("pointerdown",start,{once:true,capture:true} as any);return()=>window.removeEventListener("pointerdown",start,true);},[sfxEnabled]);
  React.useEffect(()=>{awena?.setRuntime?.({route:"castle_play",sport:"darts",mode:"castle",phase:state.phase==="finished"?"summary":"play",inGame:state.phase!=="finished",screenLabel:"CASTLE · Partie",playerName:activePlayer?.name,extra:{targetBricks:state.config.rules.targetBricks,playerTarget:state.targets?.[activePlayer?.id],bricks:state.bricks?.[activePlayer?.id],leg:Number(state.legIndex||0)+1,visit:Number(state.turnIndex||0)+1,attacksEnabled:state.config.rules.attacksEnabled,awenaRememberedMode:"castle",awenaKnowledgeTopic:"screen:castle_play"}});},[awena,state.phase,state.legIndex,state.turnIndex,state.bricks,state.targets,activePlayer?.id]);

  const commit=React.useCallback((next:CastleState,previous=state,forcedNotice?:string)=>{setUndo(u=>[...u.slice(-39),cloneCastleState(previous)]);setState(next);setCurrentThrow([]);setMultiplier(1);let msg=forcedNotice||"";if(!msg&&next.phase==="finished"&&next.winnerId){msg=`🏆 ${nameById(next.winnerId)} remporte CASTLE !`;playNewModeSfx("victory",sfxEnabled);}else if(!msg&&next.legIndex>previous.legIndex&&next.lastLegWinnerId){msg=`🏰 ${nameById(next.lastLegWinnerId)} remporte la manche ${previous.legIndex+1}`;}else if(!msg)msg=lastEvents(next.visits).join(" · ");setNotice(msg);persist(next);},[state,nameById,persist,sfxEnabled]);
  const validate=()=>{if(!currentThrow.length||state.phase==="finished"||activeIsBot)return;if(state.phase==="assignment"){const dart=uiToGameDart(currentThrow[0]);if(!dart?.number||!["S","D","T"].includes(String(dart.bed))){setNotice("🎯 MISS / BULL : relance une fléchette sur 1–20.");setCurrentThrow([]);setMultiplier(1);return;}const next=assignCastleNumber(state,dart);const assigned=next.targets[activePlayer?.id];commit(next,state,`${activePlayer?.name||"Joueur"} → secteur ${assigned}${next.phase==="playing"?" · la bataille commence !":""}`);return;}commit(playCastleVisit(state,currentThrow.map(uiToGameDart)));};
  const doUndo=()=>setUndo(u=>{if(!u.length)return u;const prev=u[u.length-1];setState(cloneCastleState(prev));setCurrentThrow([]);setMultiplier(1);setNotice("Dernière action annulée");finishedRef.current=false;void saveInProgress(prev,[],1);return u.slice(0,-1);});
  const handleCancel=()=>{if(currentThrow.length){setCurrentThrow([]);setMultiplier(1);setNotice("Saisie annulée");}else doUndo();};
  const setThrowWithSfx=React.useCallback((update:any)=>setCurrentThrow((prev:UIDart[])=>{const next=(typeof update==="function"?update(prev):update)||prev;const cap=state.phase==="assignment"?1:3;const out=Array.isArray(next)?next.slice(0,cap):prev;if(out.length>prev.length)out.slice(prev.length).forEach((d:any,i:number)=>window.setTimeout(()=>playNewModeDartSfx(d,sfxEnabled),i*120));return out;}),[state.phase,sfxEnabled]);
  React.useEffect(()=>{if(!activeIsBot||state.phase==="finished"||botBusy.current)return;botBusy.current=true;const t=window.setTimeout(()=>{try{const darts=pickCastleBotDarts(state,config.botLevel);const span=playNewModeDartSequence(darts,sfxEnabled);window.setTimeout(()=>{try{if(state.phase==="assignment"){const next=assignCastleNumber(state,darts[0]);commit(next,state,`${activePlayer?.name||"BOT"} → secteur ${next.targets[activePlayer?.id]}${next.phase==="playing"?" · la bataille commence !":""}`);}else commit(playCastleVisit(state,darts));}finally{botBusy.current=false;}},span+100);}catch{botBusy.current=false;}},620);return()=>window.clearTimeout(t);},[state,activeIsBot,activePlayer?.id]);

  function replay(){matchIdRef.current=`castle-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;finishedRef.current=false;setUndo([]);setNotice("");setCurrentThrow([]);setMultiplier(1);const next=createCastleState(players,config);setState(next);initialCheckpointRef.current=true;void saveInProgress(next,[],1);if(sfxEnabled)playNewModeSfx("intro",true);}

  const activeStats=activePlayer?state.statsByPlayer[activePlayer.id]||{}:{}; const activeBricks=Number(state.bricks?.[activePlayer?.id]||0); const target=Number(state.config.rules.targetBricks||15); const legTarget=state.config.seriesWins*2-1;
  const coach=coachEnabled&&!activeIsBot?coachText(state,activePlayer):"";
  const rankingRows=React.useMemo(()=>[...state.players].map((p:any,i:number)=>{const st=state.statsByPlayer[p.id]||{};const color=colorById.get(String(p.id))||ACCENT;return{id:String(p.id),name:p.name,profile:profileById.get(String(p.id))||p,color,wins:Number(state.legWins[p.id]||0),bricks:Number(state.bricks[p.id]||0),impact:Number(st.builds||0)+Number(st.damage||0),subtitle:`${state.bricks[p.id]||0}/${target} briques · ${st.damage||0} dégâts`,value:Number(state.legWins[p.id]||0),suffix:" M",order:i};}).sort((a,b)=>b.wins-a.wins||b.bricks-a.bricks||b.impact-a.impact||a.order-b.order),[state.players,state.legWins,state.bricks,state.statsByPlayer,target,profileById,colorById]);
  const playersRows=state.players.map((p:any,i:number)=>{const st=state.statsByPlayer[p.id]||{};const color=colorById.get(String(p.id))||ACCENT;return{id:p.id,name:p.name,profile:profileById.get(String(p.id))||p,color,active:i===activeIndex,status:state.phase==="assignment"&&!state.targets[p.id]?"NUMÉRO À ATTRIBUER":`SECTEUR ${state.targets[p.id]||"—"}`,progress:Number(state.bricks[p.id]||0),progressMax:target,metrics:[{label:"BRIQUES",value:`${state.bricks[p.id]||0}/${target}`},{label:"BUILD",value:st.builds||0},{label:"DÉGÂTS",value:st.damage||0},{label:"M",value:state.legWins[p.id]||0}]};});
  const statsItems=[{label:"BRIQUES POSÉES",value:activeStats.builds||0},{label:"DÉGÂTS",value:activeStats.damage||0,color:RED},{label:"TOUCHES UTILES",value:activeStats.usefulHits||0},{label:"PRÉCISION",value:`${percent(activeStats.usefulHits,activeStats.darts)}%`},{label:"MEILLEURE CONSTRUCTION",value:activeStats.bestBuildVisit||0},{label:"MEILLEURE ATTAQUE",value:activeStats.bestDamageVisit||0},{label:"MEILLEUR IMPACT",value:activeStats.bestImpactVisit||0},{label:"SÉRIE UTILE",value:activeStats.bestUsefulStreak||0},{label:"S / D / T",value:`${activeStats.singles||0}/${activeStats.doubles||0}/${activeStats.triples||0}`},{label:"MISS",value:activeStats.misses||0},{label:"BULL / DBULL",value:`${activeStats.bulls||0}/${activeStats.dbulls||0}`},{label:"DARTS",value:activeStats.darts||0}];
  const awards=React.useMemo(()=>{const rows=rankingRows.map((r:any)=>({...r,st:state.statsByPlayer[r.id]||{}}));const builder=bestBy(rows,r=>Number(r.st.builds||0));const destroyer=bestBy(rows,r=>Number(r.st.damage||0));const sniper=bestBy(rows,r=>percent(r.st.usefulHits,r.st.darts));return[{icon:"🏗️",label:"BÂTISSEUR",name:builder?.name||"—",value:`${builder?.st?.builds||0} briques`,color:builder?.color},{icon:"⚔️",label:"ASSAILLANT",name:destroyer?.name||"—",value:`${destroyer?.st?.damage||0} dégâts`,color:destroyer?.color},{icon:"🎯",label:"PRÉCISION",name:sniper?.name||"—",value:`${percent(sniper?.st?.usefulHits,sniper?.st?.darts)}%`,color:sniper?.color}];},[rankingRows,state.statsByPlayer]);
  const totalDarts=Object.values(state.statsByPlayer||{}).reduce((a:number,r:any)=>a+Number(r?.darts||0),0); const durationMs=Math.max(0,Number((state.finishedAt||Date.now()))-Number(state.startedAt||Date.now()));

  if(state.phase==="finished") return <div className="party-mode" style={{["--mode-accent" as any]:ACCENT}} data-mss-native-play-layout="1"><PageHeader tickerSrc={tickerCastle} tickerAlt="CASTLE" tickerHeight={68} tickerBottomGap={8} tickerFit="cover" left={<div style={{marginLeft:7}}><BackDot onClick={()=>go?.("castle_config")} color={ACCENT} glow={`${ACCENT}88`}/></div>} right={awenaEnabled?<div style={{marginRight:7}}><PremiumAwenaButton awena={awena} route="castle_play" mode="castle" screenLabel="CASTLE · Partie" accent={ACCENT}/></div>:null}/><div style={{flex:"1 1 auto",minHeight:0,overflow:"auto"}}><PremiumEndPanel title="CASTLE" accent={ACCENT} winnerId={state.winnerId} rankingRows={rankingRows} durationMs={durationMs} totalDarts={totalDarts} awards={awards} onReplay={replay} onStats={()=>go?.("statsHub",{mode:"castle",playerId:state.winnerId||state.players[0]?.id,focusMatchId:matchIdRef.current})} onHistory={()=>go?.("statsHub",{tab:"history",mode:"castle",focusMatchId:matchIdRef.current})} onConfig={()=>go?.("castle_config")} onGames={()=>go?.("games",{gamesView:"all"})}/></div></div>;

  return <div className="party-mode" style={{["--mode-accent" as any]:ACCENT}} data-mss-native-play-layout="1">
    <PageHeader tickerSrc={tickerCastle} tickerAlt="CASTLE" tickerHeight={68} tickerBottomGap={8} tickerFit="cover" left={<div style={{marginLeft:7}}><BackDot onClick={()=>go?.("castle_config")} color={ACCENT} glow={`${ACCENT}88`}/></div>} right={awenaEnabled?<div style={{marginRight:7}}><PremiumAwenaButton awena={awena} route="castle_play" mode="castle" screenLabel="CASTLE · Partie" accent={ACCENT}/></div>:null}/>
    {coach?<FloatingAdvice text={coach} accent={activeColor} kicker={state.phase==="assignment"?"ATTRIBUTION":"CONSEIL TACTIQUE"}/>:null}
    <main className="party-mode__body"><div className="party-mode__stage"><div className="party-mode__left">
      <SummaryStrip players={state.players} activeId={activePlayer?.id} profileById={profileById} colorById={colorById} winsById={state.legWins} primaryById={(id:string)=>state.targets[id]?`${state.bricks[id]||0}/${target}`:"—"} secondaryById={(id:string)=>state.targets[id]?`N° ${state.targets[id]} · ${(state.statsByPlayer[id]?.damage||0)} dégâts`:"Numéro à attribuer"}/>
      <ActiveHero profile={activeProfile} name={activePlayer?.name} accent={activeColor} eyebrow={`MANCHE ${state.legIndex+1} · BO${legTarget} · ${state.phase==="assignment"?"ATTRIBUTION":"VOLÉE "+(state.turnIndex+1)}`} primary={state.phase==="assignment"?(state.assignmentIndex+1):activeBricks} primarySuffix={state.phase==="assignment"?`/${state.players.length}`:`/${target}`} secondary={state.phase==="assignment"?"1 fléchette main opposée · secteur 1–20":`SECTEUR ${state.targets[activePlayer?.id]||"—"} · ${state.config.rules.attacksEnabled?"ATTAQUE ACTIVE":"CONSTRUCTION SEULE"}`} tertiary={state.phase==="assignment"?"MISS / BULL = relance":`${activeStats.builds||0} briques posées · ${activeStats.damage||0} dégâts infligés`} progress={state.phase==="assignment"?state.assignmentIndex:activeBricks} progressMax={state.phase==="assignment"?state.players.length:target} notice={notice} noticeTone={notice.includes("🏆")?"win":notice.includes("MISS")?"danger":"normal"} aside={state.phase==="assignment"?<div style={{display:"grid",placeItems:"center",gap:4}}><ProfileAvatar profile={activeProfile} size={62} showStars={false} ringColor={activeColor}/><b style={{fontSize:9,color:activeColor}}>LANCE !</b></div>:<CastleMeter value={activeBricks} target={target} accent={activeColor}/>}/>
      <KpiStrip accent={activeColor} onClick={()=>setStatsOpen(true)} items={[["BUILD",activeStats.builds||0],["DÉGÂTS",activeStats.damage||0],["PRÉC.",`${percent(activeStats.usefulHits,activeStats.darts)}%`],["M",state.legWins[activePlayer?.id]||0]]}/>
      <QuickRow players={state.players} activeId={activePlayer?.id} profileById={profileById} colorById={colorById} ticker={tickerCastle} onPlayers={()=>setPlayersOpen(true)} onStats={()=>setStatsOpen(true)} onLog={()=>setLogOpen(true)} onRanking={()=>setRankingOpen(true)}/>
    </div><div className="party-mode__input">{!activeIsBot?<NewModeInput currentThrow={currentThrow} setCurrentThrow={setThrowWithSfx} multiplier={multiplier} setMultiplier={setMultiplier} onValidate={validate} onCancel={handleCancel} preferredMethod={config.scoreInputMethod} validateLabel={state.phase==="assignment"?"ATTRIBUER":"VALIDER"} accent={activeColor} maxDarts={state.phase === "assignment" ? 1 : 3} fitMinScale={0.16}/>:<BotTurn profile={activeProfile} name={activePlayer?.name} accent={activeColor} text={state.phase==="assignment"?"choisit son secteur…":"construit ou attaque…"} icon="🏰"/>}</div></div></main>
    {playersOpen?<PlayersModal rows={playersRows} onClose={()=>setPlayersOpen(false)}/>:null}{statsOpen?<StatsModal items={statsItems} accent={activeColor} subtitle={activePlayer?.name} onClose={()=>setStatsOpen(false)}/>:null}{logOpen?<LogModal visits={state.visits} profileById={profileById} colorById={colorById} labelDart={castleDartLabel} title="JOURNAL CASTLE" onClose={()=>setLogOpen(false)}/>:null}{rankingOpen?<RankingModal rows={rankingRows} title="CLASSEMENT CASTLE" onClose={()=>setRankingOpen(false)}/>:null}
  </div>;
}
