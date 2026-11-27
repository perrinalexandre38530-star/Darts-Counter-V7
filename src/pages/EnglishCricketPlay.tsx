import React from 'react';
import type {Profile} from '../lib/types';
import ProfileAvatar from '../components/ProfileAvatar';
import MssKillerPlayersShared from '../components/config/MssKillerPlayersShared';
import tickerCricket from '../assets/tickers/ticker_cricket_english.webp';
import { MssClassicConfigFlow } from '../components/config/MssClassicConfigFlow';
import MssCricketAwenaTip from '../components/config/MssCricketAwenaTip';
import {newEnglishCricket,englishCricketThrow,englishCricketUndo,englishCricketCurrentPlayer,type EnglishCricketHit,type EnglishCricketState} from '../lib/englishCricketEngine';

type Props={profiles?:Profile[];params?:any;go?:(tab:any,params?:any)=>void;onFinish?:(match:any)=>void};
const gold='#f6c256',border='1px solid #f6c25655';
const pane:React.CSSProperties={background:'#0b0f1f',border,borderRadius:19,padding:16,display:'grid',gap:12};
const choice=(active:boolean):React.CSSProperties=>({border:`1px solid ${active?gold:'#ffffff33'}`,background:active?'#f6c25622':'#161b2a',borderRadius:13,color:active?gold:'#f3f6ff',fontWeight:900,padding:'10px 12px',cursor:'pointer'});
export default function EnglishCricketPlay({profiles=[],params,go}:Props){
 const [phase,setPhase]=React.useState<'setup'|'play'>('setup');
 const [setupStep,setSetupStep]=React.useState(0);
 const [view,setView]=React.useState<'guided'|'complete'>('guided');
 const [created,setCreated]=React.useState<any[]>([]);
 const available=React.useMemo(()=>[...profiles,...(Array.isArray(params?.quickPlayers)?params.quickPlayers:[]),...created], [profiles,params?.quickPlayers,created]);
 const [selectedIds,setSelectedIds]=React.useState<string[]>(()=>Array.isArray(params?.quickPlayers)?params.quickPlayers.map((x:any)=>String(x.id)).slice(0,2):[]);
 const [state,setState]=React.useState<EnglishCricketState|null>(null);
 const [mult,setMult]=React.useState<1|2|3>(1);
 const chosen=selectedIds.map(id=>available.find(p=>p.id===id)).filter(Boolean) as any[];
 const steps=['Awena vous explique','Choix joueurs','Règles et scoring','Récapitulatif'];
 const start=()=>{if(chosen.length!==2)return;setState(newEnglishCricket(chosen.map(p=>({id:String(p.id),name:String(p.name)}))));setPhase('play');};
 const hit=(sector:number,multiplier:1|2|3=mult)=>{setState(prev=>prev?englishCricketThrow(prev,{sector,multiplier}):prev);setMult(1);};
 const title=(s:string)=><strong style={{color:gold,letterSpacing:.6,fontWeight:1000}}>{s}</strong>;
 return <div style={{minHeight:'100%',background:'#050712',color:'#fff',padding:'12px 12px 28px',display:'grid',gap:13,alignContent:'start'}}>
 <div style={{position:'relative',overflow:'hidden',borderRadius:12}}><img src={tickerCricket} alt="English Cricket" style={{display:'block',width:'100%',aspectRatio:'800/230',objectFit:'cover'}}/><button type="button" onClick={()=>go?.('games')} style={{position:'absolute',top:12,left:9,...choice(false),padding:7}}>←</button></div>
 {phase==='setup'?<>
  <MssClassicConfigFlow title="English Cricket" steps={steps} step={setupStep} view={view} accent={gold} progressiveSingleLine summary={`${chosen.length}/2 joueurs`} onStep={setSetupStep} onView={setView} onHelp={()=>setSetupStep(0)}/>
  {(view==='complete'||setupStep===0)&&<section style={pane}>{title('ENGLISH CRICKET · AWENA VOUS EXPLIQUE')}<p style={{fontSize:13,lineHeight:1.6,color:'#c8d0e5',margin:0}}>Un joueur bat, l'autre lance. Le batteur ne gagne des runs que sur les points au-dessus de 40 par volée de trois fléchettes. Le lanceur vise BULL25 (un guichet) et DBULL50 (deux guichets). À zéro guichet, on échange les rôles et on compare les runs.</p></section>}
  {(view==='complete'||setupStep===1)&&<section style={pane}>{title('CHOIX JOUEURS · DEUX PARTICIPANTS')}
    <MssKillerPlayersShared usageMode="cricket" profiles={available as any} bots={[]} selectedIds={selectedIds} maxSelection={2} accent={gold} onToggle={id=>setSelectedIds(prev=>prev.includes(id)?prev.filter(x=>x!==id):prev.length<2?[...prev,id]:prev)} onCreateProfile={(p:any)=>setCreated(prev=>[...prev,p])} onCreateBot={()=>{}} />
    <div style={{textAlign:'center',color:gold,fontSize:12}}>{chosen.length}/2 sélectionnés</div></section>}
  {(view==='complete'||setupStep===2)&&<section style={pane}>{title('RÈGLES · BATTEUR ET LANCEUR')}<div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:9}}>{[['10','GUICHETS'],['40','SEUIL PAR VOLÉE'],['25','BULL = −1'],['50','DBULL = −2']].map(([value,label])=><div key={label} style={{background:'#ffffff09',border:'1px solid #ffffff21',borderRadius:14,padding:11,textAlign:'center'}}><b style={{fontSize:25,color:gold}}>{value}</b><div style={{fontSize:11,marginTop:5}}>{label}</div></div>)}</div><p style={{fontSize:12,color:'#bdc6db',margin:0}}>Le premier joueur sélectionné bat en premier. Les rôles alternent à chaque manche. Chaque tour comporte trois fléchettes.</p></section>}
  {(view==='complete'||setupStep===3)&&<section style={pane}>{title('FICHE DE PARTIE')}<div style={{display:'flex',justifyContent:'space-between',gap:9}}>{chosen.map(p=><div key={p.id} style={{display:'grid',placeItems:'center',gap:6,width:'50%',padding:8,border:'1px solid #ffffff22',borderRadius:13}}><ProfileAvatar profile={p} size={54}/><strong>{p.name}</strong></div>)}</div><button type="button" disabled={chosen.length!==2} onClick={start} style={{...choice(chosen.length===2),minHeight:54,background:chosen.length===2?gold:'#555',color:chosen.length===2?'#221500':'#ddd'}}>LANCER ENGLISH CRICKET</button></section>}
  {setupStep>0&&view==='guided'&&<MssCricketAwenaTip step={setupStep} stepName={steps[setupStep]} variant="english" />}
 </>:state&&<>
  <section style={pane}><div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>{title('ENGLISH CRICKET')}<span style={{fontSize:12,color:gold}}>MANCHE {Math.min(state.innings+1,2)}/2</span></div><div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>{state.players.map((p,i)=><div key={p.id} style={{background:'#ffffff08',padding:12,border:`1px solid ${state.innings===i?gold:'#ffffff21'}`,borderRadius:14,textAlign:'center'}}><b style={{fontSize:15}}>{p.name}</b><div style={{fontSize:26,fontWeight:1000,color:gold}}>{state.runs[i]}</div><small>RUNS</small></div>)}</div>
   {state.innings<2?<><div style={{textAlign:'center',display:'grid',gap:5}}>{title(`AU TOUR DE ${englishCricketCurrentPlayer(state)?.name?.toUpperCase()}`)}<span style={{color:'#b9c6d9'}}>{state.currentRole==='batter'?'BATTEUR · Marque au-delà de 40 points':'LANCEUR · Vise les Bulls'} · {state.dartsLeft} fléchette(s) restante(s)</span></div><div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}><div style={{textAlign:'center',border:'1px solid #ffffff22',borderRadius:14,padding:10}}><strong style={{color:gold,fontSize:28}}>{state.wicketsLeft}</strong><div style={{fontSize:12}}>GUICHETS RESTANTS</div></div><div style={{textAlign:'center',border:'1px solid #ffffff22',borderRadius:14,padding:10}}><strong style={{color:gold,fontSize:28}}>{state.visitScore}</strong><div style={{fontSize:12}}>POINTS VOLÉE</div></div></div></>:<div style={{textAlign:'center',fontSize:20,fontWeight:1000,color:gold}}>{state.tied?'ÉGALITÉ':`VICTOIRE · ${state.players.find(p=>p.id===state.winnerId)?.name||''}`}</div>}
  </section>
  {state.innings<2&&<section style={pane}><div style={{display:'flex',gap:8}}>{([1,2,3] as const).map(n=><button type="button" key={n} onClick={()=>setMult(n)} style={{...choice(mult===n),flex:1}}>{n===1?'SIMPLE':n===2?'DOUBLE':'TRIPLE'}</button>)}</div><div style={{display:'grid',gridTemplateColumns:'repeat(5,minmax(0,1fr))',gap:5}}>{Array.from({length:20},(_,i)=>i+1).map(n=><button type="button" key={n} onClick={()=>hit(n)} style={{...choice(false),padding:9,fontSize:16}}>{n}</button>)}</div><div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8}}><button type="button" onClick={()=>hit(25,1)} style={{...choice(false),color:'#36d375'}}>BULL25</button><button type="button" onClick={()=>hit(25,2)} style={{...choice(false),color:'#ff777f'}}>BULL50</button><button type="button" onClick={()=>hit(0,1)} style={{...choice(false),color:'#f4ae47'}}>MISS</button></div></section>}
  <div style={{display:'flex',gap:9}}><button type="button" onClick={()=>setState(prev=>prev?englishCricketUndo(prev):prev)} disabled={!state.history.length} style={{...choice(false),flex:1}}>↶ ANNULER</button><button type="button" onClick={()=>{setPhase('setup');setState(null)}} style={{...choice(false),flex:1}}>NOUVELLE PARTIE</button></div>
 </>}
 </div>;
}
