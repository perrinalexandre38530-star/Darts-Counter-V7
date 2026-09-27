import React from 'react';
import BackDot from '../components/BackDot';
import { useTheme } from '../contexts/ThemeContext';

export type ChallengeTarget = '1'|'2'|'3'|'4'|'5'|'6'|'7'|'8'|'9'|'10'|'11'|'12'|'13'|'14'|'15'|'16'|'17'|'18'|'19'|'20'|'bull';
export type ChallengeRule = 'all'|'single'|'double'|'triple'|'bull25'|'bull50';
export type ChallengeConfigData = { target: ChallengeTarget; visits:number; rule:ChallengeRule };
export default function ChallengeConfig({go}:{go:(tab:any,params?:any)=>void}){
 const theme=useTheme(); const [target,setTarget]=React.useState<ChallengeTarget>('20'); const [visits,setVisits]=React.useState(30); const [rule,setRule]=React.useState<ChallengeRule>('all');
 const rules:[ChallengeRule,string][]=[['all','TOUS LES HITS'],['single','SEULEMENT SIMPLE'],['double','SEULEMENT DOUBLE'],['triple','SEULEMENT TRIPLE'],['bull25','SEULEMENT BULL 25'],['bull50','SEULEMENT BULL 50']];
 const targets=[...Array.from({length:20},(_,i)=>String(i+1)),'bull'];
 return <div style={{minHeight:'100vh',background:theme.bg,color:theme.text,padding:16,paddingBottom:90}}><BackDot onClick={()=>go('games')}/><div style={{maxWidth:760,margin:'0 auto'}}>
  <h1 style={{textAlign:'center',letterSpacing:2}}>CHALLENGE</h1><p style={{textAlign:'center',opacity:.75}}>Maximum de points sur une cible et un nombre de volées prédéfinis.</p>
  <section style={card(theme)}><h3>CIBLE</h3><select value={target} onChange={e=>setTarget(e.target.value as ChallengeTarget)} style={input(theme)}>{targets.map(x=><option key={x} value={x}>{x==='bull'?'BULL':x}</option>)}</select></section>
  <section style={card(theme)}><h3>NOMBRE DE VOLÉES</h3><div style={{display:'flex',gap:8,flexWrap:'wrap'}}>{[5,10,15,20,30,50,100].map(n=><button key={n} onClick={()=>setVisits(n)} style={pill(theme,visits===n)}>{n}</button>)}</div><div style={{marginTop:10,opacity:.75}}>{visits*3} fléchettes maximum</div></section>
  <section style={card(theme)}><h3>OBJECTIF</h3><div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))',gap:8}}>{rules.map(([id,label])=><button key={id} onClick={()=>setRule(id)} style={pill(theme,rule===id)}>{label}</button>)}</div></section>
  <button onClick={()=>go('challenge_play',{config:{target,visits,rule}})} style={{...pill(theme,true),width:'100%',padding:16,fontSize:20,marginTop:16}}>LANCER LE CHALLENGE</button>
 </div></div>
}
const card=(t:any):React.CSSProperties=>({background:t.card||'rgba(15,23,42,.92)',border:`1px solid ${t.borderSoft||'rgba(255,255,255,.14)'}`,borderRadius:18,padding:16,marginTop:12});
const input=(t:any):React.CSSProperties=>({width:'100%',padding:13,borderRadius:12,background:'rgba(0,0,0,.3)',color:t.text,border:`1px solid ${t.borderSoft||'#555'}`,fontSize:18});
const pill=(t:any,on:boolean):React.CSSProperties=>({padding:'11px 14px',borderRadius:12,border:`1px solid ${on?t.primary:(t.borderSoft||'#555')}`,background:on?`${t.primary}33`:'rgba(0,0,0,.22)',color:t.text,fontWeight:800,cursor:'pointer'});
