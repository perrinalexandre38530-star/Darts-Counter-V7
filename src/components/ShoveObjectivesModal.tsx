import React from 'react';
import { CricketMarkIcon } from './MaskIcon';
import ShoveFloatingHeader from './ShoveFloatingHeader';
import { shoveTargets, type ShoveMarks, type ShoveRuleSet } from '../lib/gameEngines/shoveAPennyTargets';

type Tab = 'objective' | 'advice' | 'marks' | 'rules' | 'settings';
type Props = {
  name:string;
  marks: ShoveMarks;
  marksPerBox:number;
  ruleSet: ShoveRuleSet;
  round?: number;
  maxRounds?: number;
  accent:string;
  advice:string;
  config:any;
  onClose:()=>void;
  onConfigure?:()=>void;
};

export default function ShoveObjectivesModal(p:Props) {
  const [tab,setTab] = React.useState<Tab>('objective');
  const targets=shoveTargets(p.ruleSet);
  const closed=targets.filter(n=>Number(p.marks[String(n)]||0)>=p.marksPerBox);
  const next=targets.find(n=>!closed.includes(n));
  const traditional=p.ruleSet==='traditional';
  const tabs: {id:Tab;label:string}[] = [
    {id:'objective',label:'OBJECTIF'}, {id:'advice',label:'CONSEILS'},
    {id:'marks',label:'MES MARQUES'}, {id:'rules',label:'RÈGLES'}, {id:'settings',label:'RÉGLAGES'},
  ];
  return <div role="dialog" aria-modal="true" aria-label="Objectifs SHOVE A PENNY" data-shove-objective-modal="1" onClick={p.onClose} style={{position:'fixed',inset:0,zIndex:1500,display:'grid',placeItems:'center',padding:10,background:'rgba(2,4,9,.84)',backdropFilter:'blur(8px)'}}>
    <section onClick={e=>e.stopPropagation()} style={{width:'min(630px,100%)',maxHeight:'88dvh',overflowY:'auto',background:'#0c1320',borderRadius:19,border:`1px solid ${p.accent}80`,padding:12,boxShadow:'0 25px 75px rgba(0,0,0,.7)'}}>
      <div style={{ marginBottom: 10 }}>
        <ShoveFloatingHeader title="OBJECTIFS ET CONSEILS" accent={p.accent} onClose={p.onClose} />
      </div>
      <nav aria-label="Onglets de l'objectif" style={{display:'grid',gridTemplateColumns:'repeat(5,minmax(0,1fr))',gap:3,marginBottom:13}}>
        {tabs.map(t=><button key={t.id} type="button" aria-current={tab===t.id?'page':undefined} onClick={()=>setTab(t.id)} style={{borderRadius:9,padding:'8px 2px',minHeight:41,border:`1px solid ${tab===t.id?p.accent:'#394357'}`,background:tab===t.id?`${p.accent}27`:'#141d2c',color:tab===t.id?p.accent:'#d2dceb',fontWeight:1000,fontSize:'clamp(8px,1.7vw,10px)',cursor:'pointer'}}>{t.label}</button>)}
      </nav>
      {tab==='objective'?<div style={{textAlign:'center',padding:'14px 6px',border:`1px solid ${p.accent}50`,borderRadius:15,background:`${p.accent}09`}}>
        <div style={{color:p.accent,fontSize:12,fontWeight:1000}}>OBJECTIF</div><strong style={{display:'block',color:'#fff',fontSize:32,marginTop:5}}>{traditional?'1 À 9':'15 À BULL'}</strong>
        <b style={{color:p.accent,fontSize:14}}>{traditional?'ORDRE LIBRE':'DANS L’ORDRE'}</b>
        <div style={{marginTop:8,color:'#d0d9e8'}}>{Number(p.maxRounds)>0 ? `TOUR ${p.round}/${p.maxRounds}` : 'PARTIE LIBRE · JUSQU’À VICTOIRE'}</div>
        <p style={{fontSize:12,color:'#dce5f3',lineHeight:1.5}}>Ferme chaque case avec {p.marksPerBox} marques. Simple = 1, double = 2, triple = 3. {traditional?'Choisis librement les numéros de 1 à 9.':'Ferme le numéro demandé avant de passer au suivant.'}</p>
        <div style={{color:p.accent,fontWeight:1000}}>{closed.length} / {targets.length} CASES FERMÉES</div>
      </div>:null}
      {tab==='advice'?<div style={{padding:14,borderRadius:13,background:`${p.accent}12`,border:`1px solid ${p.accent}44`}}><b style={{color:p.accent}}>CONSEIL AWENA</b><p style={{margin:'7px 0 0',color:'#fff',fontSize:13,lineHeight:1.6}}>{p.advice || 'Cherche une case inachevée et évite les surplus inutiles.'}</p>{next!=null?<p style={{fontSize:11,color:'#bfccdc'}}>Prochaine case inachevée : {next===25?'BULL':next}</p>:null}</div>:null}
      {tab==='marks'?<div><strong style={{color:p.accent,textTransform:'uppercase'}}>{p.name} · MON TABLEAU</strong><div style={{display:'grid',gridTemplateColumns:'repeat(3,minmax(0,1fr))',gap:6,marginTop:9}}>{targets.map(n=>{const count=Number(p.marks[String(n)]||0);return <div key={n} style={{minHeight:76,display:'grid',placeItems:'center',gap:2,padding:6,borderRadius:12,border:`1px solid ${count>=p.marksPerBox?p.accent:'#334256'}`,background:count>=p.marksPerBox?`${p.accent}25`:'#0c1727'}}><b style={{fontSize:14,color:p.accent}}>{n===25?'BULL':n}</b>{count>0?<CricketMarkIcon marks={Math.min(3,count)} color={p.accent} size={29}/>:<span style={{color:'#64748b'}}>—</span>}{p.marksPerBox!==3?<small style={{color:'#c5cedb'}}>{count}/{p.marksPerBox}</small>:null}</div>})}</div></div>:null}
      {tab==='rules'?<div style={{padding:12,lineHeight:1.65,fontSize:12,color:'#e6edfb'}}><b style={{color:p.accent}}>RÈGLES DU SHOVE HA’PENNY</b><p>Chaque joueur dispose de trois fléchettes par volée. {traditional?'Les secteurs 1 à 9 sont jouables dans n’importe quel ordre.':'Les secteurs 15 à 20 puis le BULL doivent être fermés dans cet ordre.'} Trois marques ferment une case en règle standard.</p><p>Un simple rapporte 1 marque, un double 2 et un triple 3. Le surplus est transféré selon le réglage de la partie. On ne peut pas remporter la partie grâce à une marque offerte : la marque gagnante doit être personnelle.</p></div>:null}
      {tab==='settings'?<div style={{display:'grid',gap:7}}>{[
        ['VERSION',traditional?'Traditionnelle · 1–9':'Électronique · 15–BULL'],
        ['MARQUES PAR CASE',p.marksPerBox],['SURPLUS',String(p.config?.modeOptions?.overflowRule??1)==='1'?'Offerts à un adversaire':String(p.config?.modeOptions?.overflowRule)==='0'?'Perdus':'Convertis en points'],
        ['REDISTRIBUTION',p.config?.modeOptions?.giftTargetRule==='most_needed'?'Plus en retard':p.config?.modeOptions?.giftTargetRule==='shooter_choice'?'Choix du lanceur':'Joueur suivant'],
        ['SAISIE',p.config?.scoreInputMethod==='target'?'Clavier ciblé':p.config?.scoreInputMethod==='dartboard'?'Cible interactive':'Clavier classique'],
        ['FIN DE PARTIE',p.config?.modeOptions?.endMode==='full_ranking'?'Jusqu’au classement final':p.config?.modeOptions?.endMode==='fixed_rounds'?'Limite de rounds':'Au 1er joueur qui ferme tout'], ['TOURS',Number(p.maxRounds)>0?p.maxRounds:'Libre'],
      ].map(([label,value])=><div key={String(label)} style={{display:'flex',justifyContent:'space-between',gap:15,padding:'9px 10px',borderRadius:10,background:'#161f2f',fontSize:11}}><b style={{color:p.accent}}>{label}</b><span style={{color:'#fff',textAlign:'right'}}>{String(value)}</span></div>)}<p style={{fontSize:11,color:'#adbacd'}}>Ces réglages sont ceux de la partie en cours. Les changer en pleine partie modifierait les règles et les statistiques.</p>{p.onConfigure?<button type="button" onClick={p.onConfigure} style={{minHeight:41,borderRadius:12,border:`1px solid ${p.accent}`,background:`${p.accent}23`,color:p.accent,fontWeight:1000,cursor:'pointer'}}>CONFIGURER UNE NOUVELLE PARTIE</button>:null}</div>:null}
    </section>
  </div>;
}
