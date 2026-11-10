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

/** Aperçu jouable isolé : tant que l'Historique/ONLINE n'ont pas de contrat
 * de données pour ces objectifs, ne pas y enregistrer de scores. */
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
  const ids:string[]=Array.isArray(game.playerIds)?game.playerIds.map(String):[];
  return ids.length?ids.map(id=>{
   const profile:any=profiles.find(item=>String(item?.id)===id);
   return {id,name:String(profile?.name||profile?.nickname||'Joueur'),avatar:avatar(profile)};
  }):[{id:'preview',name:'Joueur'}];
 },[store?.profiles,game.playerIds]);
 const [zone,setZone]=React.useState<ArcadeZone>('D');
 const [hits,setHits]=React.useState<ArcadeHit[]>([]);
 const [resetOpen,setResetOpen]=React.useState(false);
 const ids=players.map(p=>p.id);
 const activeId=currentArcadePlayer(hits,ids,config);
 const progress=players.map(player=>({player,...evaluateArcadeProgress(hits.filter(hit=>hit.pid===player.id),config)}));
 const active=progress.find(row=>row.player.id===activeId)||progress[0]!;
 const objectives=arcadeObjectives(config);
 const finished=progress.every(row=>row.complete);
 const standings=[...progress].sort((a,b)=>Number(b.complete)-Number(a.complete)||b.index-a.index||a.attempts-b.attempts);
 const record=(impact:ArcadeZone,segment:number|null)=>setHits(previous=>{
  const pid=currentArcadePlayer(previous,ids,config);
  return pid?[...previous,{pid,zone:impact,segment}]:previous;
 });
 const variant=config.catalogVariant==='doubles'?'DOUBLES':config.catalogVariant==='triples'?'TRIPLES':'SIMPLES';
 return <div className="ca-page" style={{background:theme.bg,color:theme.text}}>
  <header className="ca-header">
   <img src="/challenge/ticker_challenge.png" alt="CHALLENGE"/>
   <div className="ca-back"><BackDot onClick={()=>go('challenge_config')} size={44} color="#35e9ff" glow="#35e9ff77"/></div>
   <button type="button" className="ca-awena" onClick={()=>awena?.openPanel?.()} aria-label="Ouvrir Awena"><img src="/awena/awena-avatar.webp" alt="Awena"/></button>
  </header>
  <main className="ca-layout">
   <section className="ca-panel ca-info">
    <small className="ca-kicker">{definition.family} · CHALLENGE · APERÇU</small>
    <h1>{definition.title}</h1>
    <p>{definition.description}</p>
    <div className="ca-meta"><span>NUMÉRO INITIAL : {config.catalogLine}</span><span>{config.catalogChallengeId==='perfect-line'?'D → G → T → P → BULL → DBULL':variant+' · '+config.catalogRounds+' PAIRES'}</span></div>
    <div className="ca-player">
     <div className="ca-avatar">{active.player.avatar?<img src={active.player.avatar} alt=""/>:active.player.name.slice(0,1).toUpperCase()}</div>
     <div className="ca-identity"><small>{finished?'CHALLENGE TERMINÉ':'JOUEUR ACTIF'}</small><strong>{finished?'CLASSEMENT FINAL':active.player.name}</strong></div>
     <div className="ca-score"><small>FLÉCHETTES</small><strong>{active.attempts}</strong></div>
    </div>
    <div className="ca-goal"><small>{finished?'PARCOURS TERMINÉ':'CIBLE À ATTEINDRE'}</small><strong>{finished?'✓':active.current?.label||'✓'}</strong><span>{active.index}/{objectives.length} VALIDÉS</span><div className="ca-meter"><i style={{width:(100*active.index/Math.max(1,objectives.length))+'%'}}/></div><p>Une bonne touche valide l’étape. Sinon, la cible reste identique et une fléchette est comptabilisée.</p></div>
    <div className="ca-sequence" aria-label="Objectifs du parcours">{objectives.map((step,index)=><span key={index} className={index<active.index?'passed':index===active.index?'current':''}>{step.label}</span>)}</div>
    <h2>CLASSEMENT EN DIRECT</h2>
    <div className="ca-standing">{standings.map((row,index)=><div key={row.player.id} className={activeId===row.player.id?'selected':''}><span>{index+1}</span><b>{row.player.name}</b><small>{row.complete?'TERMINÉ':row.index+'/'+objectives.length}</small><strong>{row.attempts} FL.</strong></div>)}</div>
   </section>
   <section className="ca-panel ca-input">
    <div className="ca-toolbar"><div><strong>SAISIE DÉTAILLÉE</strong><small>Grand simple / Petit simple / Double / Triple</small></div><button type="button" disabled={!hits.length} onClick={()=>setHits(prev=>prev.slice(0,-1))}>↶ ANNULER</button></div>
    {finished?<div className="ca-result"><div>🏆</div><h2>CHALLENGE TERMINÉ</h2><p>{standings[0]?.player.name} · {standings[0]?.attempts} fléchettes</p><button type="button" onClick={()=>{setHits([]);setZone('D')}}>REJOUER</button><button type="button" onClick={()=>go('challenge_config')}>AUTRES CHALLENGES</button></div>:<>
     <div className="ca-zones">{(['G','P','D','T'] as ArcadeZone[]).map(value=><button type="button" key={value} className={zone===value?'selected':''} onClick={()=>setZone(value)}><b>{value}</b><small>{value==='G'?'GRAND SIMPLE':value==='P'?'PETIT SIMPLE':value==='D'?'DOUBLE':'TRIPLE'}</small></button>)}</div>
     <div className="ca-sectors">{numbers.map(n=><button type="button" key={n} onClick={()=>record(zone,n)}>{n}</button>)}</div>
     <div className="ca-bulls"><button type="button" className="b25" onClick={()=>record('BULL',null)}>BULL <b>25</b></button><button type="button" className="b50" onClick={()=>record('DBULL',null)}>DBULL <b>50</b></button><button type="button" className="miss" onClick={()=>record('MISS',null)}>MISS <b>×</b></button></div>
    </>}
    <div className="ca-reset"><button type="button" onClick={()=>setResetOpen(v=>!v)}>{resetOpen?'ANNULER':'RECOMMENCER'}</button>{resetOpen&&<button type="button" onClick={()=>{setHits([]);setResetOpen(false)}}>CONFIRMER</button>}</div>
    <p className="ca-warning">VERSION DE PRÉVISUALISATION : les scores ne sont ni inscrits dans l’Historique officiel, ni envoyés aux classements ONLINE.</p>
   </section>
  </main>
 </div>;
}
