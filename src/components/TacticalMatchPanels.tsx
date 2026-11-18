import React from "react";

type Combatant = { id: string; name: string; avatarDataUrl?: string | null; alive?: boolean; lives?: number; misses?: number; team?: string; score?: number };
type Panel = 'stats' | 'ranking' | 'logs' | 'map' | 'objective' | 'rules' | 'config';
type Props = { placement?: 'players' | 'actions'; kind: 'battle' | 'warfare'; players: Combatant[]; activeId?: string; round?: number; target?: string | number; logs?: any[]; mapEnabled?: boolean; objective: string; rules: string[]; configuration: string[]; accent?: string; children?: React.ReactNode };
const sections: { id: Panel; label: string; glyph: string }[] = [
  {id:'stats',label:'STATS',glyph:'▥'}, {id:'ranking',label:'CLASSEMENT',glyph:'🏆'}, {id:'logs',label:'LOGS',glyph:'☷'}, {id:'map',label:'MAP',glyph:'⌖'},
  {id:'objective',label:'OBJECTIF',glyph:'◎'}, {id:'rules',label:'RÈGLES',glyph:'ⓘ'}, {id:'config',label:'CONFIG',glyph:'⚙'},
];

function shortName(name?: string) {
  const n = String(name || 'Joueur').trim();
  return n.length > 12 ? `${n.slice(0, 12)}…` : n;
}

function avatarNode(p: Combatant, accent: string, activeId?: string, size=36){
  return <span className="mss-combat-band-avatar" style={{width:size,height:size,borderColor:p.id===activeId?accent:'rgba(255,255,255,.22)'}}>{p.avatarDataUrl?<img src={p.avatarDataUrl} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/>:<b>{p.name?.slice(0,1)||'J'}</b>}</span>;
}

export default function TacticalMatchPanels({placement='actions',kind,players,activeId,round,target,logs=[],mapEnabled=false,objective,rules,configuration,accent='#ffc857'}:Props){
 const [open,setOpen]=React.useState<Panel|null>(null);
 const ranked=React.useMemo(()=>[...players].sort((a,b)=>Number(b.alive!==false)-Number(a.alive!==false)||Number(b.lives||0)-Number(a.lives||0)||Number(b.score||0)-Number(a.score||0)),[players]);
 const shown=sections.filter(x=>x.id!=='map'||mapEnabled);
 const btn:React.CSSProperties={background:'rgba(255,255,255,.045)',border:'1px solid rgba(255,255,255,.15)',borderRadius:10,color:'inherit',padding:'6px',fontSize:10,fontWeight:850,display:'flex',alignItems:'center',justifyContent:'center',gap:5,cursor:'pointer'};
 const avatar=(p:Combatant,size=26)=><span style={{width:size,height:size,borderRadius:'50%',overflow:'hidden',display:'inline-grid',placeItems:'center',background:'#252531',border:`1px solid ${p.id===activeId?accent:'rgba(255,255,255,.2)'}`,flexShrink:0}}>{p.avatarDataUrl?<img src={p.avatarDataUrl} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/>:<b>{p.name?.slice(0,1)||'J'}</b>}</span>;
 const playerLine=(p:Combatant,i:number)=><div key={p.id} style={{display:'flex',alignItems:'center',gap:9,padding:'9px 10px',borderRadius:12,background:p.id===activeId?`${accent}19`:'rgba(255,255,255,.04)',border:`1px solid ${p.id===activeId?accent+'66':'rgba(255,255,255,.07)'}`,opacity:p.alive===false?.55:1}}><span style={{width:20,color:accent}}>{i+1}</span>{avatar(p,34)}<strong style={{flex:1,overflow:'hidden',textOverflow:'ellipsis'}}>{p.name}</strong><span style={{fontSize:12}}>{kind==='battle'?(p.alive===false?'ÉLIMINÉ':`♥ ${p.lives??0} · ✕ ${p.misses??0}`):`${p.team||''} · ${p.score??0}`}</span></div>;

 const roster = <div className="mss-combat-band" style={{['--roster-accent' as any]:accent}} role="group" aria-label="Résumé des joueurs">
   <div className="mss-combat-band-scroll">
     {players.map((p) => {
       const isActive = p.id === activeId;
       const battleStat = p.alive===false ? 'ÉLIMINÉ' : `♥ ${p.lives ?? 0} · ✕ ${p.misses ?? 0}`;
       const warStat = `${p.team || 'ARMÉE'} · ${p.score ?? 0}/10`;
       return (
         <button
           key={p.id}
           type="button"
           onClick={() => setOpen('ranking')}
           className={`mss-combat-band-segment${isActive ? ' is-active' : ''}${p.alive===false ? ' is-eliminated' : ''}`}
           title={p.name}
         >
           {avatarNode(p, accent, activeId, 42)}
           <div className="mss-combat-band-copy">
             <strong>{shortName(p.name)}</strong>
             <small>{kind === 'battle' ? battleStat : warStat}</small>
           </div>
         </button>
       );
     })}
   </div>
 </div>;

 return <>
  {placement === 'players' ? roster : (
    <nav className="mss-combat-bottomnav" aria-label="Informations de la partie">
      {shown.map(x => <button key={x.id} type="button" onClick={()=>setOpen(x.id)} className={`mss-combat-nav-item${open===x.id?' is-selected':''}`} title={x.label} aria-label={x.label} style={{['--roster-accent' as any]:accent}}>
        <span className="mss-combat-nav-glyph" aria-hidden="true">{x.glyph}</span>{open===x.id && <span className="mss-combat-nav-title">{x.label}</span>}
      </button>)}
    </nav>
  )}
  {open&&<div role="presentation" onClick={()=>setOpen(null)} style={{position:'fixed',inset:0,zIndex:10050,background:'rgba(0,0,0,.8)',display:'grid',placeItems:'center',padding:12}}><section role="dialog" aria-modal="true" aria-label={sections.find(x=>x.id===open)?.label} onClick={e=>e.stopPropagation()} style={{width:'min(620px,100%)',maxHeight:'min(80dvh,720px)',overflow:'auto',borderRadius:20,background:'#151622',border:`1px solid ${accent}66`,color:'#f8f8ff',boxShadow:'0 20px 60px #000c',padding:16}}>
   <header style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:12,marginBottom:14,borderBottom:`1px solid ${accent}55`,paddingBottom:12}}><strong style={{color:accent,letterSpacing:'.07em'}}>{sections.find(x=>x.id===open)?.glyph} {sections.find(x=>x.id===open)?.label}</strong><button type="button" onClick={()=>setOpen(null)} aria-label="Fermer" style={{...btn,padding:'8px 13px'}}>✕</button></header>
   {open==='stats'&&<div style={{display:'grid',gap:9}}><div style={{color:accent}}>Tour {round??1}{target!==undefined?` · Cible ${target}`:''} · {players.filter(p=>p.alive!==false).length}/{players.length} actifs</div>{ranked.map(playerLine)}</div>}
   {open==='ranking'&&<div style={{display:'grid',gap:9}}>{ranked.map(playerLine)}</div>}
   {open==='logs'&&<div style={{display:'grid',gap:6}}>{logs.length?logs.slice(-35).reverse().map((l,i)=><div key={i} style={{fontSize:12,padding:10,background:'rgba(255,255,255,.045)',borderRadius:9}}>#{logs.length-i} · {players.find(p=>p.id===String(l?.playerId))?.name||'Joueur'} · {Array.isArray(l?.darts)?l.darts.map((d:any)=>d?.label||d?.v||'—').join(' / '):'Volée enregistrée'}</div>):<span>Aucune volée validée pour le moment.</span>}</div>}
   {open==='map'&&mapEnabled&&<><div style={{fontSize:12,opacity:.76,marginBottom:10}}>Carte tactique de survie · les marqueurs reflètent les joueurs encore en jeu. La carte n'altère pas les règles d'élimination.</div><div style={{position:'relative',height:260,overflow:'hidden',borderRadius:16,border:'1px solid #536044',background:'radial-gradient(ellipse at 25% 25%,#465c45 0 12%,transparent 45%),radial-gradient(ellipse at 80% 78%,#554a39 0 15%,transparent 55%),repeating-linear-gradient(35deg,#27372f 0 24px,#2c4035 25px 48px)'}}><div style={{position:'absolute',left:'12%',top:'10%',width:'76%',height:'80%',borderRadius:'50%',border:'2px dashed #d3c783',background:'rgba(255,212,95,.035)'}}/>{players.map((p,i)=>{const angle=i*2.39996;const radius=18+((i*17)%27);const x=50+Math.cos(angle)*radius;const y=50+Math.sin(angle)*radius;return <div key={p.id} title={p.name} style={{position:'absolute',left:`${x}%`,top:`${y}%`,transform:'translate(-50%,-50%)',opacity:p.alive===false?.38:1,textAlign:'center',fontSize:10,color:'#fff',textShadow:'0 2px 3px #000'}}>{avatar(p,32)}<div>{p.name.slice(0,9)}</div></div>})}</div><div style={{marginTop:10,fontSize:12}}>Zone sûre · {players.filter(p=>p.alive!==false).length} survivant(s)</div></>}
   {open==='objective'&&<p style={{lineHeight:1.55,margin:0}}>{objective}</p>}
   {open==='rules'&&<ol style={{lineHeight:1.6,paddingLeft:20}}>{rules.map((r,i)=><li key={i}>{r}</li>)}</ol>}
   {open==='config'&&<div style={{display:'grid',gap:10}}>{configuration.map((c,i)=><div key={i} style={{padding:'10px 12px',background:'rgba(255,255,255,.045)',borderRadius:10}}>{c}</div>)}</div>}
  </section></div>}
 </>;
}
