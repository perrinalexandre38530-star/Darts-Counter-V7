import React from 'react';
import cricketDartSvg from '../ui_assets/cricket-dart.svg';
import { MSS_HIT, mssHitColor } from '../lib/mssVisualCharter';

type Hit = { v: number; mult: 1 | 2 | 3 };
type Props = {
  profile: any;
  name: string;
  closedCases: number;
  totalCases: number;
  ruleSet: 'traditional' | 'electronic';
  round?: number;
  maxRounds?: number;
  darts: readonly Hit[];
  accent: string;
  onObjective: () => void;
};

/** MSS SHOVE : avatar crop à gauche, marques centrales et objectif entièrement cliquable. */
export default function ShoveActivePlayerCard(p: Props) {
  const avatar = p.profile?.avatarDataUrl || p.profile?.avatarUrl || p.profile?.avatar || p.profile?.photoDataUrl || null;
  const traditional = p.ruleSet === 'traditional';
  const objective = traditional ? '1 À 9' : '15 À BULL';
  const objectiveSub = traditional ? 'ORDRE LIBRE' : 'DANS L’ORDRE';
  const showRound = Number.isFinite(p.round) && Number.isFinite(p.maxRounds) && Number(p.maxRounds) > 0;
  return <section data-shove-active-player="mss-hero-v5" style={{position:'relative',flex:'0 0 auto',minHeight:124,borderRadius:18,border:`1px solid ${p.accent}85`,background:`linear-gradient(100deg,${p.accent}1b,rgba(9,13,22,.99) 65%)`,overflow:'hidden',boxShadow:`inset 0 0 24px ${p.accent}16`}}>
    {avatar ? <img src={avatar} alt="" aria-hidden="true" style={{position:'absolute',left:-38,top:-24,width:178,height:182,objectFit:'cover',objectPosition:'center',opacity:.21,filter:'saturate(.8)',pointerEvents:'none'}}/> : null}
    <div aria-hidden="true" style={{position:'absolute',inset:0,pointerEvents:'none',background:'linear-gradient(90deg,transparent 0%,rgba(6,9,15,.45) 36%,rgba(6,9,15,.70) 70%)'}}/>
    <div style={{position:'relative',display:'grid',gridTemplateColumns:'minmax(0,1fr) minmax(112px,32%)',gap:6,padding:7,minHeight:124,alignItems:'stretch'}}>
      <div style={{minWidth:0,display:'flex',flexDirection:'column',justifyContent:'center',alignItems:'center',gap:2,textAlign:'center',paddingLeft:12}}>
        <strong style={{color:p.accent,fontSize:'clamp(14px,3.1vw,19px)',fontWeight:1000,textTransform:'uppercase',letterSpacing:.55,maxWidth:'100%',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{p.name}</strong>
        <div aria-label={`${p.closedCases} case${p.closedCases>1?'s':''} fermée${p.closedCases>1?'s':''} sur ${p.totalCases}`} style={{color:p.accent,fontWeight:1000,letterSpacing:-1.5,fontSize:'clamp(38px,10vw,53px)',lineHeight:1.0,textShadow:`0 0 18px ${p.accent}40`}}>{p.closedCases}<span style={{fontWeight:850,letterSpacing:0,fontSize:15,color:'#bdc8d9'}}>/{p.totalCases}</span></div>
        <div data-shove-darts="cricket-svg" aria-label={`${p.darts.length} fléchette(s) jouée(s) sur 3`} style={{display:'flex',gap:7,alignItems:'center',justifyContent:'center',paddingTop:4}}>
          {Array.from({length:3},(_,i)=>{
            const dart = p.darts[i];
            return <span key={i} title={dart ? `Fléchette ${i+1} enregistrée` : `Fléchette ${i+1} à jouer`}
              style={{width:30,height:21,display:'inline-block',flex:'0 0 auto',backgroundColor:dart ? mssHitColor(dart) : MSS_HIT.empty,opacity:dart?1:.35,WebkitMaskImage:`url(${cricketDartSvg})`,maskImage:`url(${cricketDartSvg})`,WebkitMaskRepeat:'no-repeat',maskRepeat:'no-repeat',WebkitMaskSize:'contain',maskSize:'contain',WebkitMaskPosition:'center',maskPosition:'center',filter:dart?`drop-shadow(0 0 5px ${mssHitColor(dart)})`:'none',transform:'rotate(-20deg)'}}/>;
          })}
        </div>
      </div>
      <button type="button" data-shove-objective-trigger="1" onClick={p.onObjective} aria-label="Voir objectifs, conseils, marques, règles et réglages" style={{minWidth:0,display:'flex',flexDirection:'column',justifyContent:'center',alignItems:'center',gap:4,border:`1px solid ${p.accent}70`,background:`linear-gradient(160deg,${p.accent}18,rgba(4,7,13,.90))`,borderRadius:14,padding:'6px 4px',textAlign:'center',cursor:'pointer',color:'#fff'}}>
        <span style={{fontSize:10,fontWeight:1000,letterSpacing:.5,color:p.accent}}>OBJECTIF</span>
        <strong style={{fontSize:'clamp(14px,3vw,21px)',lineHeight:1.1,fontWeight:1000,color:'#fff'}}>{objective}</strong>
        <span style={{fontSize:10,fontWeight:1000,color:p.accent,letterSpacing:.4}}>{objectiveSub}</span>
        {showRound ? <small style={{fontSize:9,fontWeight:900,color:'#d0d8e6'}}>TOUR {p.round}/{p.maxRounds}</small> : null}
      </button>
    </div>
  </section>;
}
