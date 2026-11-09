import React from 'react';
import BackDot from '../components/BackDot';
import {useTheme} from '../contexts/ThemeContext';
import {useStore} from '../contexts/StoreContext';
import {useAwenaOptional} from '../awena/AwenaProvider';
import {useFullscreenPlay} from '../hooks/useFullscreenPlay';
import {getArcadeChallenge} from '../lib/challengeArcadeCatalog';
import {arcadeObjectives,currentArcadePlayer,evaluateArcadeProgress,type ArcadeHit,type ArcadePlayConfig,type ArcadeZone} from '../lib/challengeArcadeEngine';
import './ChallengeArcadePlay.css';

type Player={id:string;name:string;avatar?:string};
const numbers=Array.from({length:20},(_,i)=>i+1);
const avatar=(item:any)=>item?.avatarDataUrl||item?.photoDataUrl||item?.avatarUrl||item?.photoUrl||'';
export default function ChallengeArcadePlay({go,params}:{go:(tab:any,params?:any)=>void;params?:any}){
 useFullscreenPlay({enabled:true,lockBodyScroll:false});
 const theme=useTheme();
 const awena=useAwenaOptional();
 const {store}=useStore();
 const game:any=params?.config||{};
 const config:ArcadePlayConfig={
  catalogChallengeId:String(game.catalogChallengeId||'perfect-line'),
  catalogLine:Math.max(1,Math.min(20,Number(game.catalogLine)||20)),
  catalogVariant:game.catalogVariant==='doubles'?'doubles':game.catalogVariant==='triples'?'triples':'classic',
  catalogRounds:Math.max(1,Math.min(10,Number(game.catalogRounds)||5)),
 };
 const definition=getArcadeChallenge(config.catalogChallengeId);
 const players=React.useMemo<Player[]>(()=>{
  const profiles:any[]=Array.isArray(store?.profiles)?store.profiles:[];
  const ids=Array.isArray(game.playerIds)?game.playerIds.map(String):[];
  return ids.length?ids.map((id:string)=>{
   const profile:any=profiles.find((item:any)=>String(item?.id)===id);
   return {id,name:String(profile?.name||profile?.nickname||'Joueur'),avatar:avatar(profile)};
  }):[{id:'preview',name:'Joueur'}];
 },[store?.profiles,game.playerIds]);
 const [zone,setZone]=React.useState<ArcadeZone>('D');
 const [hits,setHits]=React.useState<ArcadeHit[]>([]);
 const [resetOpen,setResetOpen]=React.useState(false);
 const ids=players.map(p=>p.id);
 const currentId=currentArcadePlayer(hits,ids,config);
 const progress=players.map(player=>({player,...evaluateArcadeProgress(hits.filter(h=>h.pid===player.id),config)}));
 const active=progress.find(row=>row.player.id===currentId)||progress[0];
 const objectives=arcadeObjectives(config);
 const finished=progress.every(row=>row.complete);
 const standings=[...progress].sort((a,b)=>Number(b.complete)-Number(a.complete)||b.index-a.index||a.attempts-b.attempts);
 const add=(impact:ArcadeZone,segment:number|null)=>setHits(previous=>{
  const pid=currentArcadePlayer(previous,ids,config);
  return pid?[...previous,{pid,zone:impact,segment}]:previous;
 });
 const variantLabel=config.catalogVariant==='doubles'?'DOUBLES':config.catalogVariant==='triples'?'TRIPLES':'SIMPLES';
 return <div className="ca-page" style={{background:theme.bg,color:theme.text}}>
  <header className="ca-header">
   <img src="/challenge/ticker_challenge.png" alt="CHALLENGE"/>
   <div className="ca-back"><BackDot onClick={()=>go('challenge_config')} size={44} color="#35e9ff" glow="#35e9ff77"/></div>
   <button type="button" className="ca-awena" onClick={()=>awena?.openPanel?.()} aria-label="Ouvrir Awena"><img src="/awena/awena-avatar.webp" alt="Awena"/></button>
  </header>
  <main className="ca-layout">
   <section className="ca-panel ca-info">
    <small className="ca-kicker">{definition.family} · CHALLENGE</small>
    <h1>{definition.title}</h1>
    <p>{definition.description}</p>
    <div className="ca-meta"><span>SEGMENT INITIAL : {config.catalogLine}</span><span>{config.catalogChallengeId==='perfect-line'?'D → G → T → P → BULL → DBULL':variantLabel+' · '+config.catalogRounds+' PAIRES'}</span></div>
    <div className="ca-player">
     <div className="ca-avatar">{active.player.avatar?<img src={active.player.avatar} alt=""/>:active.player.name.slice(0,1).toUpperCase()}</div>
     <div className="ca-identity"><small>{finished?'CHALLENGE TERMINÉ':'JOUEUR ACTIF'}</small><strong>{finished?'CLASSEMENT FINAL':active.player.name}</strong></div>
     <div className="ca-score"><small>FLÉCHETTES</small><strong>{active.attempts}</strong></div>
    </div>
    <div className="ca-goal"><small>{finished?'PARCOURS TERMINÉ':'OBJECTIF À ATTEINDRE'}</small><strong>{finished?'✓':active.current?.label||'✓'}</strong><span>{active.index}/{objectives.length} VALIDÉS</span><div className="ca-meter"><i style={{width:(100*active.index/Math.max(1,objectives.length))+'%'}}/></div><p>Un impact exact valide l'étape. Une erreur consomme une fléchette mais ne fait pas avancer.</p></div>
    <div className="ca-sequence">{objectives.map((step,index)=><span key={index} className={index<active.index?'passed':index===active.index?'current':''}>{step.label}</span>)}</div>
    <h2>CLASSEMENT EN DIRECT</h2>
    <div className="ca-standing">{standings.map((row,index)=><div key={row.player.id} className={currentId===row.player.id?'selected':''}><span>{index+1}</span><b>{row.player.name}</b><small>{row.complete?'TERMINÉ':row.index+'/'+objectives.length}</small><strong>{row.attempts} FL.</strong></div>)}</div>
   </section>
   <section className="ca-panel ca-input">
    <div className="ca-toolbar"><div><strong>SAISIE DÉTAILLÉE</strong><small>G/P/D/T : chaque impact conserve sa vraie zone</small></div><button disabled={!hits.length} onClick={()=>setHits(prev=>prev.slice(0,-1))}>↶ ANNULER</button></div>
    {finished?<div className="ca-result"><div>🏆</div><h2>CHALLENGE TERMINÉ</h2><p>{standings[0]?.player.name} · {standings[0]?.attempts} fléchettes</p><button onClick={()=>{setHits([]);setZone('D')}}>REJOUER</button><button onClick={()=>go('challenge_config')}>AUTRES CHALLENGES</button></div>:<>
     <div className="ca-zones">{(['G','P','D','T'] as ArcadeZone[]).map(value=><button key={value} className={zone===value?'selected':''} onClick={()=>setZone(value)}><b>{value}</b><small>{value==='G'?'GRAND SIMPLE':value==='P'?'PETIT SIMPLE':value==='D'?'DOUBLE':'TRIPLE'}</small></button>)}</div>
     <div className="ca-sectors">{numbers.map(n=><button key={n} onClick={()=>add(zone,n)}>{n}</button>)}</div>
     <div className="ca-bulls"><button className="b25" onClick={()=>add('BULL',null)}>BULL <b>25</b></button><button className="b50" onClick={()=>add('DBULL',null)}>DBULL <b>50</b></button><button className="miss" onClick={()=>add('MISS',null)}>MISS <b>×</b></button></div>
    </>}
    <div className="ca-reset"><button onClick={()=>setResetOpen(v=>!v)}>{resetOpen?'ANNULER':'RECOMMENCER'}</button>{resetOpen&&<button onClick={()=>{setHits([]);setResetOpen(false)}}>CONFIRMER</button>}</div>
    <p className="ca-warning">PRÉVISUALISATION : résultats non enregistrés dans l'Historique officiel et non publiés dans le classement ONLINE.</p>
   </section>
  </main>
 </div>;
}
