import React from 'react';
import { BottomNavIcon } from '../BottomNav';
import { loadChallengeArchive, challengeArchiveItems, summarizeChallengeArchive, type ChallengeArchiveItem } from '../../lib/challengeArchive';
import {buildChallengeStats,buildChallengeRecordDetails} from '../../lib/challengeInsightMetrics';
import './ChallengeInsightsPage.css';

export type ChallengeInsightView='stats'|'records';
const frenchDate=(ms:number)=>ms?new Date(ms).toLocaleDateString('fr-FR',{day:'2-digit',month:'2-digit',year:'2-digit'}):'—';
const num=(v:number,decimals=0)=>Number.isFinite(v)?v.toLocaleString('fr-FR',{maximumFractionDigits:decimals,minimumFractionDigits:decimals}):'—';
const measure=(entry:ChallengeArchiveItem,minimum:boolean)=>minimum?entry.darts:entry.score;

/** Responsive SVG, no third-party chart dependency. Data ALWAYS comes from History V4. */
function TimeChart({values,labels,title,suffix='',higherBetter=true}:{values:number[];labels:string[];title:string;suffix?:string;higherBetter?:boolean}){
 const items=values.filter(Number.isFinite);
 if(!items.length)return <div className="mss-ci-empty">Aucune donnée enregistrée pour ce graphique.</div>;
 const min=Math.min(...items),max=Math.max(...items);
 const low=Math.max(0,min-(max-min||Math.max(1,max*.15))),high=max+(max-min||Math.max(1,max*.15));
 const span=Math.max(1,high-low);
 const x=(i:number)=>values.length>1?44+i*512/(values.length-1):300;
 const y=(value:number)=>156-(value-low)/span*129;
 const path=values.map((value,i)=>`${i===0?'M':'L'}${x(i).toFixed(1)} ${y(value).toFixed(1)}`).join(' ');
 return <div className="mss-ci-chart" role="img" aria-label={`${title} : ${items.map((value,i)=>`${labels[i]||i}: ${num(value,1)}${suffix}`).join('; ')}`}>
  <div className="mss-ci-chart-heading"><b>{title}</b><small>{higherBetter?'VALEUR LA PLUS HAUTE FAVORABLE':'VALEUR LA PLUS BASSE FAVORABLE'}</small></div>
  <svg viewBox="0 0 600 215" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
   {[0,1,2,3,4].map(step=>{const yy=27+step*32.25;return <g key={step}><line x1="43" x2="557" y1={yy} y2={yy} stroke="#34475e" strokeDasharray="4 5"/><text x="36" y={yy+4} textAnchor="end" fill="#9eafc3" fontSize="11">{num(high-(high-low)*step/4,1)}</text></g>})}
   <path d={path} stroke="#51d6ee" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" fill="none"/>
   {values.map((v,i)=><circle key={i} cx={x(i)} cy={y(v)} r="4.3" fill="#8af5ff" stroke="#15314a" strokeWidth="1.5"/>)}
   <text x="43" y="195" fill="#a9bbcc" fontSize="11">{labels[0]||'Début'}</text>
   <text x="557" y="195" textAnchor="end" fill="#a9bbcc" fontSize="11">{labels[labels.length-1]||'Dernier'}</text>
  </svg>
  <div className="mss-ci-chart-footer">{items.length} performances · {suffix||'valeur'}</div>
 </div>;
}
function Bars({values,title}:{values:Array<{label:string;value:number}>;title:string}){
 const max=Math.max(1,...values.map(value=>value.value));
 if(!values.some(row=>row.value>0))return <div className="mss-ci-empty">Aucune répartition de touches disponible.</div>;
 return <div className="mss-ci-chart"><div className="mss-ci-chart-heading"><b>{title}</b></div><div className={"mss-ci-bars"+(title.includes("CONFIGURATION")?" mss-ci-bars--config":"")}>{values.map(item=><div key={item.label} className="mss-ci-bar-row"><span>{item.label}</span><div><i style={{width:(100*item.value/max)+'%'}}/></div><b>{item.value}</b></div>)}</div></div>;
}
function documentedHits(items:ChallengeArchiveItem[]){
 const counts:Record<string,number>={G:0,P:0,S:0,D:0,T:0,BULL25:0,DBULL50:0,MISS:0};
 let entriesCount=0;
 for(const item of items){
  const payload=item.record?.payload||item.record?.decoded||{};
  const entries=payload?.entries||payload?.log||item.record?.resume?.state?.log||[];
  if(!Array.isArray(entries))continue;
  for(const hit of entries){
   if(item.playerId&&String(hit?.pid||hit?.playerId)!==String(item.playerId))continue;
   let zone=String(hit?.zone||hit?.hit||'').toUpperCase();
   if(zone==='25'||zone==='BULL')zone='BULL25';if(zone==='50'||zone==='DBULL')zone='DBULL50';
   if(Object.prototype.hasOwnProperty.call(counts,zone)){counts[zone]++;entriesCount++;}
  }
 }
 return {counts,entriesCount};
}

export function ChallengeInsightsPage({modeId,modeTitle,playerId,playerName,initialView,onClose}:{
 modeId:string;modeTitle:string;playerId?:string|null;playerName?:string|null;
 initialView:ChallengeInsightView;onClose:()=>void;
}){
 const [tab,setTab]=React.useState<ChallengeInsightView>(initialView);
 const [records,setRecords]=React.useState<any[]>([]);
 const [busy,setBusy]=React.useState(true);
 const [error,setError]=React.useState('');
 const [config,setConfig]=React.useState('all');
 const [recordKey,setRecordKey]=React.useState('');
 const [refreshId,setRefreshId]=React.useState(0);
 React.useEffect(()=>setTab(initialView),[initialView]);
 React.useEffect(()=>{
  let active=true;setBusy(true);setError('');
  void loadChallengeArchive({modeId,hydrate:true}).then(rows=>{if(active)setRecords(rows);})
   .catch(e=>{if(active)setError(String(e?.message||e));})
   .finally(()=>{if(active)setBusy(false);});
  return()=>{active=false};
 },[modeId,refreshId]);
 const all=React.useMemo(()=>challengeArchiveItems(records,{modeId,playerId,playerName}),[records,modeId,playerId,playerName]);
 const configGroups=React.useMemo(()=>summarizeChallengeArchive(all).byConfig,[all]);
 const selectedRecordsGroup=configGroups.find(g=>g.key===recordKey)||configGroups[0]||null;
 const filtered=React.useMemo(()=>config==='all'?all:all.filter(row=>row.configKey===config),[all,config]);
 const stats=React.useMemo(()=>buildChallengeStats(filtered),[filtered]);
 const recordDetails=React.useMemo(()=>selectedRecordsGroup?buildChallengeRecordDetails(all,selectedRecordsGroup.key,selectedRecordsGroup.goal):null,[all,selectedRecordsGroup]);
 const hits=React.useMemo(()=>documentedHits(stats.recent),[stats.recent]);
 const mixedConfigs=config==='all'&&stats.configurations.length>1;
 const visibleRecord=recordDetails?.best||null;
 const recordUnit=selectedRecordsGroup?.goal==='min'?'FL.':'PTS';
 React.useEffect(()=>{if(config!=='all'&&!all.some(row=>row.configKey===config))setConfig('all')},[all,config]);
 React.useEffect(()=>{if(recordKey&&!configGroups.some(group=>group.key===recordKey))setRecordKey('')},[configGroups,recordKey]);
 const formatRecord=(value:number|null)=>value===null?'—':num(value);
 return <div className="mss-ci-overlay" role="presentation" onMouseDown={event=>{if(event.target===event.currentTarget)onClose()}}>
  <section className="mss-ci-page" role="dialog" aria-modal="true" aria-label={`${tab==='stats'?'Statistiques':'Records'} ${modeTitle}`}>
   <header className="mss-ci-head">
    <div><small>{tab==='stats'?'STATS · ANALYSE DES PERFORMANCES':'RECORDS · PALMARÈS PERSONNEL'}</small><h2>{modeTitle}</h2><p>{tab==='stats'?'Précision, régularité et évolution des performances':'Meilleurs résultats, progression des records et exploits'} · {playerName||'Profil sélectionné'}</p></div>
    <button type="button" onClick={onClose} aria-label="Fermer la page">×</button>
   </header>
   <nav className="mss-ci-tabs" aria-label="Choisir une analyse">
    <button type="button" className={tab==='stats'?'active':''} aria-pressed={tab==='stats'} onClick={()=>setTab('stats')}><BottomNavIcon name="stats" size={20}/> STATS</button>
    <button type="button" className={tab==='records'?'active':''} aria-pressed={tab==='records'} onClick={()=>setTab('records')}><BottomNavIcon name="tournaments" size={20}/> RECORDS</button>
   </nav>
   <div className={'mss-ci-body '+(tab==='records'?'mss-ci-body--records':'mss-ci-body--stats')}>
    {tab==='stats'?<label className="mss-ci-filter">ANALYSER UNE CONFIGURATION
     <select value={config} onChange={e=>setConfig(e.target.value)}>
      <option value="all">TOUTES LES CONFIGURATIONS</option>
      {configGroups.map(group=><option value={group.key} key={group.key}>{group.label}</option>)}
     </select>
    </label>:<label className="mss-ci-filter">RECORDS D’UNE CONFIGURATION
     <select value={selectedRecordsGroup?.key||''} onChange={e=>setRecordKey(e.target.value)} disabled={!configGroups.length}>
      {!configGroups.length&&<option value="">AUCUNE CONFIGURATION JOUÉE</option>}
      {configGroups.map(group=><option value={group.key} key={group.key}>{group.label}</option>)}
     </select>
    </label>}
    {busy&&<p role="status" className="mss-ci-empty">Chargement des résultats enregistrés dans History V4…</p>}
    {error&&<div className="mss-ci-empty" role="alert">Impossible de charger les résultats : {error} <button type="button" onClick={()=>setRefreshId(x=>x+1)}>RÉESSAYER</button></div>}
    {!busy&&!error&&(tab==='stats'?<>
     <div className="mss-ci-view-intro"><BottomNavIcon name="stats" size={26}/><div><b>ANALYSE DES PERFORMANCES</b><span>Les chiffres concernent les parties terminées. Les séances en cours ne sont pas ajoutées aux moyennes.</span></div></div>
     <div className="mss-ci-kpis mss-ci-stats-kpis">
      <div><small>PARTIES TERMINÉES</small><strong>{stats.played}</strong></div>
      <div><small>EN COURS</small><strong>{stats.ongoing}</strong></div>
      <div><small>FLÉCHETTES JOUÉES</small><strong>{stats.totalDarts}</strong></div>
      <div><small>PRÉCISION MOYENNE</small><strong>{stats.accuracy===null?'—':num(stats.accuracy,1)+'%'}</strong></div>
     </div>
     {stats.played? <>
      <div className="mss-ci-metrics"><div><small>SCORE MOYEN</small><b>{num(stats.averageScore!,1)} pts</b></div><div><small>FLÉCHETTES / PARTIE</small><b>{num(stats.averageDarts!,1)}</b></div><div><small>TOUCHES VALIDES / PARTIE</small><b>{num(stats.averageSuccessful!,1)}</b></div><div><small>MEILLEURE SÉRIE</small><b>{stats.bestStreak}</b></div></div>
      {mixedConfigs&&<p className="mss-ci-hint">Les scores de configurations différentes ne sont pas directement comparables. Sélectionne une configuration pour analyser l’évolution des points.</p>}
      {!mixedConfigs&&<TimeChart title="SCORE · ÉVOLUTION DES 30 DERNIÈRES PARTIES" values={stats.history.map(row=>row.score)} labels={stats.history.map(row=>frenchDate(row.playedAt))} suffix=" pts"/>}
      <div className="mss-ci-chart-pair"><TimeChart title="PRÉCISION · ÉVOLUTION" values={stats.history.map(row=>row.accuracy)} labels={stats.history.map(row=>frenchDate(row.playedAt))} suffix=" %"/><TimeChart title="FLÉCHETTES PAR PARTIE" values={stats.history.map(row=>row.darts)} labels={stats.history.map(row=>frenchDate(row.playedAt))} suffix=" fl." higherBetter={false}/></div>
      {hits.entriesCount>0?<Bars title={`TYPES DE TOUCHES · ${hits.entriesCount} IMPACTS DOCUMENTÉS (PARTIES RÉCENTES)`} values={Object.entries(hits.counts).map(([label,value])=>({label,value}))}/>:<p className="mss-ci-hint">Le détail des zones G/P/D/T apparaîtra lorsque les impacts de ces parties seront disponibles dans leur journal.</p>}
      {config==='all'&&stats.configurations.length>1&&<Bars title="PARTIES TERMINÉES PAR CONFIGURATION" values={stats.configurations.slice(0,12).map(row=>({label:row.label,value:row.count}))}/>}
      <h3 className="mss-ci-section-title">JOURNAL DES DERNIÈRES PERFORMANCES</h3>
      <div className="mss-ci-results">{stats.recent.map(row=><div key={row.id}><span><b>{frenchDate(row.playedAt)}</b><small>{row.configLabel}</small></span><strong>{num(row.score)} pts</strong><small>{row.darts} fl. · {num(row.accuracy,1)} % · série {row.bestStreak}</small></div>)}</div>
     </>:<div className="mss-ci-zero mss-ci-zero--stats"><BottomNavIcon name="stats" size={32}/><h3>AUCUNE PERFORMANCE ENREGISTRÉE</h3><p>Après ta première partie terminée, tu retrouveras ici les courbes de précision, les scores par partie, les fléchettes jouées et les impacts réellement documentés.</p></div>}
    </>:<>
     <div className="mss-ci-view-intro mss-ci-view-intro--records"><BottomNavIcon name="tournaments" size={26}/><div><b>TABLEAU DES RECORDS</b><span>Chaque record est calculé uniquement sur des parties terminées avec exactement la même configuration.</span></div></div>
     {selectedRecordsGroup&&recordDetails?.played&&visibleRecord?<>
      <div className="mss-ci-record-hero">
       <div><small>RECORD PERSONNEL · {selectedRecordsGroup.label}</small><strong>{formatRecord(recordDetails.value)} <em>{recordUnit}</em></strong><span>{selectedRecordsGroup.goal==='min'?'MINIMUM DE FLÉCHETTES':'MAXIMUM DE POINTS'} · établi le {frenchDate(visibleRecord.playedAt)}</span></div>
       <div className="mss-ci-record-badge"><BottomNavIcon name="tournaments" size={28}/><span>MEILLEURE<br/>PERFORMANCE</span></div>
      </div>
      <div className="mss-ci-record-metrics">
       <div><small>PARTIES HOMOLOGUÉES</small><b>{recordDetails.played}</b></div>
       <div><small>RECORDS AMÉLIORÉS</small><b>{recordDetails.improvements}</b></div>
       <div><small>GAIN DEPUIS LE 1ER ESSAI</small><b>{num(recordDetails.absoluteProgress)} {recordUnit}</b></div>
       <div><small>ÉCART AU RECORD · DERNIER ESSAI</small><b>{recordDetails.gap===0?'RECORD ÉGALÉ':`${num(recordDetails.gap!)} ${recordUnit}`}</b></div>
      </div>
      <TimeChart title="HISTORIQUE DU MEILLEUR RECORD" values={recordDetails.history.map(item=>item.value)} labels={recordDetails.history.map(item=>frenchDate(item.playedAt))} suffix={selectedRecordsGroup.goal==='min'?' fl.':' pts'} higherBetter={selectedRecordsGroup.goal!=='min'}/>
      <div className="mss-ci-record-focus"><small>DERNIER RÉSULTAT · {frenchDate(recordDetails.last?.playedAt||0)}</small><strong>{num(recordDetails.last?measure(recordDetails.last,selectedRecordsGroup.goal==='min'):0)} {recordUnit}</strong><span>{recordDetails.gap===0?'Ta dernière partie égalise le record.':'Le record reste à améliorer.'}</span></div>
      <div className="mss-ci-chart-pair"><TimeChart title="LES 30 DERNIÈRES TENTATIVES" values={recordDetails.performances.map(r=>measure(r,selectedRecordsGroup.goal==='min'))} labels={recordDetails.performances.map(r=>frenchDate(r.playedAt))} suffix={selectedRecordsGroup.goal==='min'?' fl.':' pts'} higherBetter={selectedRecordsGroup.goal!=='min'}/><div className="mss-ci-record-secondary"><h3>RECORDS COMPLÉMENTAIRES</h3><div><small>MEILLEURE PRÉCISION</small><b>{num(recordDetails.bestAccuracy?.accuracy||0,1)} %</b><span>{frenchDate(recordDetails.bestAccuracy?.playedAt||0)}</span></div><div><small>PLUS LONGUE SÉRIE</small><b>{recordDetails.longestStreak?.bestStreak??'—'}</b><span>{frenchDate(recordDetails.longestStreak?.playedAt||0)}</span></div></div></div>
      <h3 className="mss-ci-section-title">LES 5 MEILLEURES PARTIES</h3>
      <div className="mss-ci-results mss-ci-record-ranking">{recordDetails.ranking.map((row,i)=><div key={row.id}><span><b>#{i+1} · {frenchDate(row.playedAt)}</b><small>{row.configLabel}</small></span><strong>{num(measure(row,selectedRecordsGroup.goal==='min'))} {recordUnit}</strong><small>{row.darts} fl. · {num(row.accuracy,1)} %</small></div>)}</div>
      <h3 className="mss-ci-section-title">DATES D’AMÉLIORATION DES RECORDS</h3>
      <div className="mss-ci-breakthroughs">{recordDetails.breakthroughs.map(row=><div key={row.id}><span><b>{frenchDate(row.playedAt)}</b><small>{row.first?'Premier record enregistré':`Amélioration de ${num(row.gain)} ${recordUnit}`}</small></span><strong>{num(row.value)} {recordUnit}</strong></div>)}</div>
      {recordDetails.ignoredZeroDarts>0&&<p className="mss-ci-hint">{recordDetails.ignoredZeroDarts} ancienne(s) partie(s) sans nombre de fléchettes exploitable sont exclues des records au minimum de fléchettes.</p>}
     </>:<div className="mss-ci-zero mss-ci-zero--records"><BottomNavIcon name="tournaments" size={34}/><h3>AUCUN RECORD HOMOLOGUÉ</h3><p>{selectedRecordsGroup?'Les parties terminées sans mesure exploitable ne permettent pas de déterminer un record de fléchettes.':'Termine un challenge pour établir ton premier record personnel. Les meilleurs résultats seront ensuite comparés uniquement à configuration équivalente.'}</p></div>}
     {configGroups.length>1&&<><h3 className="mss-ci-section-title">PALMARÈS PAR CONFIGURATION</h3><div className="mss-ci-records">{configGroups.map(group=><button type="button" key={group.key} className={selectedRecordsGroup?.key===group.key?'selected':''} onClick={()=>setRecordKey(group.key)}><span><b>{group.label}</b><small>{group.plays} partie{group.plays>1?'s':''}</small></span><span><small>{group.goal==='min'?'MIN. FLÉCHETTES':'MAX. POINTS'}</small><strong>{group.goal==='min'&&!group.best.darts?'—':num(measure(group.best,group.goal==='min'))} {group.goal==='min'?'FL.':'PTS'}</strong></span></button>)}</div></>}
    </>)}
   </div>
   <footer className="mss-ci-bottom"><span>History V4 · résultats conservés, aucune donnée inventée</span><button type="button" onClick={onClose}>← RETOUR À LA FICHE</button></footer>
  </section>
 </div>;
}
