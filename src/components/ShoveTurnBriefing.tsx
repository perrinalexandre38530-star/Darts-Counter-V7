import React from 'react';
import { CricketMarkIcon } from './MaskIcon';
import { shoveTargets, type ShoveMarks, type ShoveRuleSet } from '../lib/gameEngines/shoveAPennyTargets';

type Props = {
  phase: 'before' | 'after';
  name: string;
  avatar?: string | null;
  ruleSet: ShoveRuleSet;
  marks: ShoveMarks;
  previousMarks?: ShoveMarks;
  marksPerBox: number;
  accent: string;
  message: string;
  onClose: () => void;
};

/** Transition par joueur : 5 s, marquages Cricket, nouveaux impacts animés. */
export default function ShoveTurnBriefing({phase,name,avatar,ruleSet,marks,previousMarks,marksPerBox,accent,message,onClose}:Props) {
  const targets = shoveTargets(ruleSet);
  const closed = targets.filter(n=>Number(marks[String(n)]||0)>=marksPerBox).length;
  return <div data-shove-turn-briefing={phase} role="dialog" aria-modal="true" aria-label={phase==='before'?'Tableau du prochain joueur':'Bilan des marques'} style={{position:'fixed',inset:0,zIndex:1900,display:'grid',placeItems:'center',background:'rgba(1,4,11,.88)',backdropFilter:'blur(10px)',padding:12}}>
    <section style={{width:'min(550px,100%)',maxHeight:'92dvh',overflowY:'auto',position:'relative',padding:14,borderRadius:22,border:`1px solid ${accent}98`,background:`radial-gradient(circle at 50% 0%,${accent}18,transparent 50%),#0a101b`,boxShadow:`0 25px 75px rgba(0,0,0,.65),0 0 30px ${accent}20`}}>
      <div style={{display:'grid',gridTemplateColumns:'48px 1fr 37px',gap:8,alignItems:'center',marginBottom:10}}>
        {avatar?<img src={avatar} alt="" style={{width:45,height:45,objectFit:'cover',borderRadius:'50%',border:`2px solid ${accent}`}}/>:<div style={{height:45,width:45,border:`2px solid ${accent}`,borderRadius:'50%',display:'grid',placeItems:'center',fontWeight:1000,color:accent}}>{name.slice(0,1).toUpperCase()}</div>}
        <div style={{minWidth:0}}><div style={{color:accent,fontSize:9,fontWeight:1000,letterSpacing:.65}}>{phase==='before'?'À TOI DE JOUER':'VOLÉE TERMINÉE'}</div><strong style={{display:'block',color:'#fff',fontSize:20,textTransform:'uppercase',overflow:'hidden',whiteSpace:'nowrap',textOverflow:'ellipsis'}}>{name}</strong></div>
        <button type="button" onClick={onClose} title="Passer l'animation" aria-label="Passer l'animation" style={{width:37,height:37,borderRadius:12,border:`1px solid ${accent}65`,background:'#171d29',color:'#fff',fontSize:20,cursor:'pointer'}}>×</button>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(3,minmax(0,1fr))',gap:6}}>
        {targets.map((n)=>{
          const count=Number(marks[String(n)]||0), previous=Number(previousMarks?.[String(n)]||0), gained=phase==='after'?Math.max(0,count-previous):0;
          return <div key={n} data-shove-animated-mark={gained>0?'1':'0'} style={{display:'grid',gridTemplateColumns:'28px minmax(0,1fr)',alignItems:'center',minHeight:52,padding:'5px 7px',gap:3,borderRadius:11,border:`1px solid ${gained>0?accent+'dd':accent+'44'}`,background:count>=marksPerBox?`${accent}26`:'#0f1827',animation:gained>0?'shoveMarkReveal .8s ease-in-out 2':undefined}}>
            <b style={{color:accent,fontSize:n===25?11:21,textAlign:'center'}}>{n===25?'B':n}</b>
            <div style={{display:'grid',placeItems:'center',gap:1}}>{count>0?<CricketMarkIcon marks={Math.min(3,count)} color={accent} size={24} glow={gained>0}/>:<span style={{fontSize:18,color:'#4e5a6b'}}>—</span>}{gained>0?<small style={{fontSize:10,color:'#77e5b6',fontWeight:1000}}>+{gained}</small>:count>3?<small style={{fontSize:9,color:accent}}>+{count-3}</small>:null}</div>
          </div>;
        })}
      </div>
      <div style={{display:'grid',gridTemplateColumns:'1fr auto',gap:8,alignItems:'center',padding:'9px 2px 6px',fontSize:11}}><strong style={{color:'#ecf3ff'}}>{message}</strong><span style={{fontWeight:1000,color:accent}}>{closed}/{targets.length} CASES</span></div>
      <div style={{width:'100%',height:4,borderRadius:999,background:'#303b4b',overflow:'hidden'}}><div key={name+phase} style={{height:'100%',width:'100%',background:accent,transformOrigin:'left',animation:'shoveBriefTimer 5s linear forwards'}}/></div>
      <style>{`@keyframes shoveBriefTimer{from{transform:scaleX(1)}to{transform:scaleX(0)}} @keyframes shoveMarkReveal{0%{transform:scale(.9);filter:brightness(1)}50%{transform:scale(1.06);filter:brightness(1.7)}100%{transform:scale(1);filter:brightness(1)}}`}</style>
    </section>
  </div>;
}
