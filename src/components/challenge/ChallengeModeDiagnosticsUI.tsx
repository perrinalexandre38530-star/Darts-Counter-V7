import React from 'react';
import type {ChallengeArchiveItem} from '../../lib/challengeArchiveCore.ts';
import {buildChallengeModeDiagnostics} from '../../lib/challengeModeDiagnostics.ts';
import './ChallengeModeDiagnosticsUI.css';

type View='stats'|'records';
const number=(n:number)=>Number(n).toLocaleString('fr-FR',{maximumFractionDigits:1});
const date=(ms:number)=>ms?new Date(ms).toLocaleDateString('fr-FR',{day:'2-digit',month:'2-digit',year:'2-digit'}):'—';

function MiniCurve({series,unit,title,higherBetter=true}:{series:number[];unit:string;title:string;higherBetter?:boolean}){
 const values=series.filter(Number.isFinite);
 if(values.length<2)return null;
 const lo=Math.min(...values),hi=Math.max(...values),diff=Math.max(1,hi-lo);
 const x=(i:number)=>30+i*530/(values.length-1);
 const y=(v:number)=>112-(v-lo)/diff*88;
 const d=values.map((value,index)=>(index===0?'M':'L')+x(index).toFixed(1)+' '+y(value).toFixed(1)).join(' ');
 return <div className="mss-md-curve" role="img" aria-label={`${title} : ${values.map(value=>number(value)).join(', ')} ${unit}`}>
  <header><b>{title}</b><small>{higherBetter?'PLUS = MIEUX':'MOINS = MIEUX'}</small></header>
  <svg viewBox="0 0 590 145" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
   {[24,68,112].map(yy=><line key={yy} x1="28" x2="562" y1={yy} y2={yy} stroke="#3c536b" strokeDasharray="4 5"/>) }
   <path d={d} fill="none" stroke="#76d9ed" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
   {values.map((value,index)=><circle key={index} cx={x(index)} cy={y(value)} r="3.5" fill="#b7f7ff"/>)}
  </svg>
  <footer><span>{number(values[0]!)} {unit} au départ</span><span>{number(values[values.length-1]!)} {unit} au dernier essai</span></footer>
 </div>;
}

/** Un diagnostic distinct pour chaque famille, jamais calculé à partir d'un score fictif. */
export function ChallengeModeDiagnosticsUI({items,modeId,view}:{items:readonly ChallengeArchiveItem[];modeId:string;view:View}){
 const report=React.useMemo(()=>buildChallengeModeDiagnostics(items,modeId),[items,modeId]);
 const [showAll,setShowAll]=React.useState(false);
 const cards=view==='records'?report.recordCards:report.cards;
 const entries=showAll?report.objectives:report.objectives.slice(0,10);
 const label=view==='records'?'RECORDS TECHNIQUES':'ANALYSE SPÉCIFIQUE DU DÉFI';
 return <section className={'mss-md-panel mss-md-panel--'+view} aria-label={label}>
  <header className="mss-md-header"><div><small>{label}</small><h3>{report.title}</h3></div><span>{report.documented} / {report.finished} PARTIES ANALYSABLES</span></header>
  {!report.documented?<div className="mss-md-empty">Pas encore de journal d’impacts ou de statistiques par objectif exploitable pour ce défi. Les anciens résultats sont conservés, sans estimation de touches ni de records.</div>:<>
   <div className="mss-md-cards">{cards.map(card=><div className="mss-md-card" key={card.label}><small>{card.label}</small><strong>{card.value}</strong><span>{card.detail}</span></div>)}</div>
   {view==='stats'?<>
    {report.objectives.length>0&&<div className="mss-md-block">
     <div className="mss-md-block-head"><b>{report.unit==='fléchettes'?'RÉUSSITE PAR OBJECTIF':'VALIDATION PAR OBJECTIF / VOLÉE'}</b><small>{report.unit==='fléchettes'?'IMPACTS CONFORMES':'VOLÉES VALIDÉES'}</small></div>
     <div className="mss-md-objectives">{entries.map(row=><div className="mss-md-objective" key={row.key}>
      <span title={row.label}>{row.label}</span>
      <div className="mss-md-track"><i style={{width:row.rate+'%'}}/></div>
      <b>{number(row.rate)} %</b><small>{row.validated}/{row.attempts}</small>
     </div>)}</div>
     {report.objectives.length>10&&<button type="button" className="mss-md-more" onClick={()=>setShowAll(v=>!v)}>{showAll?'RÉDUIRE':`VOIR LES ${report.objectives.length} OBJECTIFS`}</button>}
    </div>}
    {report.visits.length>0&&<div className="mss-md-block">
     <div className="mss-md-block-head"><b>EFFICACITÉ PAR VOLÉE</b><small>IMPACTS CONFORMES / FLÉCHETTES SAISIES</small></div>
     <div className="mss-md-visits">{report.visits.map(row=><div key={row.visit} className="mss-md-visit" title={`Volée ${row.visit} : ${row.successful}/${row.attempts} touches conformes ; ${number(row.points)} pts`}>
      <div className="mss-md-visit-bar"><i style={{height:row.rate+'%'}}/></div><small>V{row.visit}</small><b>{number(row.rate)}%</b>
     </div>)}</div>
    </div>}
    <MiniCurve title="PROGRESSION DES OBJECTIFS VALIDÉS" series={report.sessions.slice(-20).map(row=>row.progress)} unit="objectifs"/>
   </>:<>
    <MiniCurve title="PROGRESSION DE LA MEILLEURE SÉRIE" series={report.sessions.slice(-20).map(row=>row.bestStreak)} unit="touches"/>
    {report.sessions.length>1&&<div className="mss-md-record-list"><b>DERNIERS RÉSULTATS DOCUMENTÉS</b>
     {report.sessions.slice(-6).reverse().map(row=><div key={row.id}><span>{date(row.playedAt)}</span><strong>{row.successes} touches conformes</strong><small>{row.failures} erreur{row.failures>1?'s':''} · {row.attempts} fl.</small></div>)}
    </div>}
   </>}
  </>}
  {report.missing>0&&<p className="mss-md-coverage">{report.missing} partie{report.missing>1?'s':''} terminée{report.missing>1?'s':''} sans détail technique exploitable : elles restent dans le bilan général et les records de score, mais ne sont pas ajoutées à ces indicateurs.</p>}
  <p className="mss-md-source">Source : History V4 · mêmes profils et configurations que le filtre actif · aucune modification des parties.</p>
 </section>;
}
