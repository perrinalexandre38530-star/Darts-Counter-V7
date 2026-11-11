import React from 'react';
import { CHALLENGE_MODE_OPTIONS } from '../../lib/challengeUnifiedCatalog';
import { BottomNavIcon } from '../BottomNav';
import {ChallengeInsightsPage,type ChallengeInsightView} from './ChallengeInsightsPage';
import {challengeArchiveItems,loadChallengeArchive,summarizeChallengeArchive,type ChallengeArchiveItem} from '../../lib/challengeArchive';
import {buildChallengeImpactDetails} from '../../lib/challengePerformanceDetails';
import './ChallengeArchiveUI.css';

const date=(ms:number)=>ms?new Date(ms).toLocaleDateString('fr-FR',{day:'2-digit',month:'2-digit',year:'numeric'}):'—';
const score=(item:ChallengeArchiveItem,minimum=false)=>minimum?`${item.darts||'—'} fléchettes`:`${item.score} pts`;
const archiveFrom=(mode:string)=>CHALLENGE_MODE_OPTIONS.find(item=>item.id===mode);

/** Detail screen shared by the chooser's floating sheet and Stats > Training. */
export function ChallengeArchiveDetails({modeId,playerId,playerName,onResume,compact=false}:{
 modeId?:string|null;playerId?:string|null;playerName?:string|null;
 onResume?:(record:ChallengeArchiveItem)=>void;compact?:boolean;
}){
 const [records,setRecords]=React.useState<any[]>([]);
 const [loading,setLoading]=React.useState(true);
 const [error,setError]=React.useState('');
 const [modeFilter,setModeFilter]=React.useState(modeId||'all');
 const [insightView,setInsightView]=React.useState<ChallengeInsightView|null>(null);
 React.useEffect(()=>setModeFilter(modeId||'all'),[modeId]);
 const refresh=React.useCallback(()=>{
  let alive=true;
  setLoading(true);setError('');
  void loadChallengeArchive({hydrate:true,modeId}).then(items=>{if(alive)setRecords(items);})
   .catch(e=>{if(alive)setError(String(e?.message||e));})
   .finally(()=>{if(alive)setLoading(false);});
  return ()=>{alive=false};
 },[modeId]);
 React.useEffect(()=>{
  const dispose=refresh();
  return()=>dispose();
 },[refresh]);
 const all=React.useMemo(()=>challengeArchiveItems(records,{playerId,playerName}),[records,playerId,playerName]);
 const options=React.useMemo(()=>[...new Set(all.map(item=>item.modeId))].map(id=>({id,name:archiveFrom(id)?.title||id})),[all]);
 const relevant=React.useMemo(()=>modeFilter==='all'?all:all.filter(item=>item.modeId===modeFilter),[all,modeFilter]);
 const summary=React.useMemo(()=>summarizeChallengeArchive(relevant),[relevant]);
 const impactDetails=React.useMemo(()=>buildChallengeImpactDetails(relevant),[relevant]);
 const recordGoal=(item:ChallengeArchiveItem)=>summary.byConfig.find(group=>group.key===item.configKey)?.goal==='min';
 const bestStreak=React.useMemo(()=>Math.max(0,...summary.latest.map(row=>row.bestStreak),...summary.byConfig.map(group=>group.best.bestStreak)),[summary]);
 return <section className={'mss-challenge-archive '+(compact?'compact':'')} aria-label="Performances et records Challenge">
  {modeFilter!=='all'&&<div className="mss-ca-insight-launchers">
   <button type="button" onClick={()=>setInsightView('stats')}><BottomNavIcon name="stats" size={20}/> STATISTIQUES DÉTAILLÉES</button>
   <button type="button" onClick={()=>setInsightView('records')}><BottomNavIcon name="tournaments" size={20}/> RECORDS DÉTAILLÉS</button>
  </div>}
  {!modeId&&<div className="mss-ca-mode-select"><label htmlFor="mss-ca-mode-select">CHALLENGE</label><select id="mss-ca-mode-select" value={modeFilter} onChange={e=>setModeFilter(e.target.value)}><option value="all">TOUS LES DÉFIS</option>{options.map(item=><option value={item.id} key={item.id}>{item.name}</option>)}</select></div>}
  <div className="mss-ca-kpis">
   <div><small>PARTIES TERMINÉES</small><strong>{summary.completed}</strong></div>
   <div><small>EN COURS</small><strong>{summary.inProgress}</strong></div>
   <div><small>FLÉCHETTES</small><strong>{summary.totalDarts}</strong></div>
   <div><small>PRÉCISION MOYENNE</small><strong>{summary.completed?summary.averageAccuracy.toFixed(1)+'%':'—'}</strong></div>
  </div>
  {loading&&<p className="mss-ca-muted" role="status">Chargement des records enregistrés…</p>}
  {error&&<p className="mss-ca-error" role="alert">Impossible de charger les parties : {error} <button type="button" onClick={()=>refresh()}>Réessayer</button></p>}
  {!loading&&!error&&!summary.total&&<p className="mss-ca-muted">Aucune partie pour ce défi et ce profil. Ton premier résultat apparaîtra ici à la fin de la partie.</p>}
  {summary.completed>0&&<div className="mss-ca-quick-records"><span>MEILLEURE SÉRIE <b>{bestStreak}</b></span><span>DERNIÈRE PERFORMANCE <b>{summary.latest[0]?score(summary.latest[0],recordGoal(summary.latest[0])):'—'}</b></span><span>DERNIÈRE PARTIE <b>{date(summary.latest[0]?.playedAt||0)}</b></span></div>}
  {impactDetails.total>0&&<div className="mss-ca-block"><h3>RÉPARTITION DES IMPACTS · {impactDetails.total} TOUCHES DOCUMENTÉES</h3><div className="mss-ca-hit-grid">{Object.entries(impactDetails.byZone).map(([zone,count])=><div key={zone}><b>{zone}</b><strong>{count}</strong><small>{Math.round(count/impactDetails.total*100)}%</small></div>)}</div></div>}
  {summary.byConfig.length>0&&<div className="mss-ca-block"><h3>RECORDS PAR CONFIGURATION</h3><div className="mss-ca-config-list">{summary.byConfig.slice(0,compact?5:20).map(group=><article key={group.key}><div><b>{group.best.title}</b><small>{group.label} · {group.plays} partie{group.plays>1?'s':''}</small></div><div className="mss-ca-best"><span>RECORD</span><strong>{score(group.best,group.goal==='min')}</strong><small>{date(group.best.playedAt)}</small></div></article>)}</div></div>}
  {summary.latest.length>0&&<div className="mss-ca-block"><h3>DERNIÈRES PERFORMANCES</h3><div className="mss-ca-recent-list">{summary.latest.slice(0,compact?4:8).map(item=><div key={item.id}><div><b>{item.title}</b><small>{date(item.playedAt)} · {item.configLabel}</small></div><strong>{score(item,recordGoal(item))}</strong><small>{item.darts} fl. · {item.accuracy.toFixed(1)}% · série {item.bestStreak}</small></div>)}</div></div>}
  {summary.ongoing.length>0&&<div className="mss-ca-block"><h3>PARTIES À REPRENDRE</h3><div className="mss-ca-recent-list">{summary.ongoing.slice(0,6).map(item=><div key={item.id}><div><b>{item.title}</b><small>{date(item.playedAt)} · {item.darts} fléchettes jouées</small></div>{onResume&&<button type="button" onClick={()=>onResume(item)}>REPRENDRE</button>}</div>)}</div></div>}
  {insightView&&modeFilter!=='all'&&<ChallengeInsightsPage modeId={modeFilter} modeTitle={archiveFrom(modeFilter)?.title||modeFilter} playerId={playerId} playerName={playerName} initialView={insightView} onClose={()=>setInsightView(null)}/>}
 </section>;
}

/** Single Challenge card in bottom-nav Stats > Training. */
export function ChallengeTrainingCard({playerId,playerName,go,renderDetailedStats}:{playerId?:string|null;playerName?:string|null;go?:(tab:string,params?:any)=>void;renderDetailedStats?:()=>React.ReactNode}){
 const [open,setOpen]=React.useState(false);
 const [showDetailedStats,setShowDetailedStats]=React.useState(false);
 const [records,setRecords]=React.useState<any[]>([]);
 const [loading,setLoading]=React.useState(true);
 React.useEffect(()=>{
  let alive=true;
  void loadChallengeArchive().then(rows=>{if(alive)setRecords(rows);}).catch(()=>{}).finally(()=>{if(alive)setLoading(false);});
  return()=>{alive=false};
 },[]);
 const stats=React.useMemo(()=>summarizeChallengeArchive(challengeArchiveItems(records,{playerId,playerName})),[records,playerId,playerName]);
 const resume=async(item:ChallengeArchiveItem)=>{
  try{
   const {History}=await import('../../lib/history');
   const full=await History.get(item.id);
   const rec=full||item.record;
   go?.('challenge_play',{rec,config:rec?.resume?.config||rec?.payload?.config||rec?.decoded?.config,snapshot:rec?.resume?.state||rec?.payload?.state,from:'stats_training'});
  }catch(e){console.warn('[challenge-training] reprise impossible',e);}
 };
 return <section className="mss-challenge-training-card" aria-label="Challenge — Historique et records Training">
  <button type="button" className="mss-ct-card" onClick={()=>setOpen(true)} aria-expanded={open}>
   <span className="mss-ct-medal">🎯</span>
   <span className="mss-ct-name"><small>TRAINING · MES DÉFIS</small><strong>CHALLENGE</strong><em>Historique personnel · records · progression</em></span>
   <span className="mss-ct-stats"><b>{loading?'…':stats.completed}</b><small>PARTIES</small></span>
   <span className="mss-ct-chevron" aria-hidden="true">›</span>
  </button>
  <div className="mss-ct-footer"><span>{stats.inProgress?`${stats.inProgress} partie(s) en cours`:'Records classés par configuration'}</span><button type="button" onClick={()=>setOpen(true)}>VOIR MES SCORES</button></div>
  {open&&<div className="mss-ca-overlay" role="presentation" onMouseDown={e=>{if(e.currentTarget===e.target)setOpen(false)}}>
   <div className="mss-ca-sheet" role="dialog" aria-modal="true" aria-labelledby="mss-ca-training-title">
    <header className="mss-ca-sheet-head"><div><small>STATS · TRAINING</small><h2 id="mss-ca-training-title">CHALLENGE · Mes performances</h2></div><button type="button" onClick={()=>setOpen(false)} aria-label="Fermer les statistiques">×</button></header>
    <ChallengeArchiveDetails playerId={playerId} playerName={playerName} onResume={resume}/>
    {renderDetailedStats&&<div className="mss-ca-extended"><button type="button" onClick={()=>setShowDetailedStats(value=>!value)} aria-expanded={showDetailedStats}>{showDetailedStats?'− MASQUER':'＋ AFFICHER'} L’ANALYSE HISTORIQUE APPROFONDIE</button>{showDetailedStats&&renderDetailedStats()}</div>}
    <div className="mss-ca-actions"><button type="button" onClick={()=>setOpen(false)}>FERMER</button><button type="button" className="primary" onClick={()=>{setOpen(false);go?.('challenge_config')}}>CHOISIR UN CHALLENGE</button></div>
   </div>
  </div>}
 </section>;
}
