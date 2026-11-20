import React from 'react';
import { buildMexicainRoundStandings } from '../../lib/gameEngines/mexicainStandings';

/** Final Mexicain recap, derived exclusively from the authoritative finished state. */
export default function MexicainFinalSummary({ state, profiles = [] }: { state: any; profiles?: any[] }) {
  const history = Array.isArray(state?.special?.mexicainHistory) ? state.special.mexicainHistory : [];
  const players = Array.isArray(state?.players) ? state.players : [];
  const profileMap = new Map(profiles.map((p: any) => [String(p.id), p]));
  const initialLives = state?.config?.modeOptions?.progressive === 'survival' ? 5 : 3;
  const last = buildMexicainRoundStandings(players, history, initialLives).at(-1);
  const ordered = [...players].sort((a: any, b: any) => {
    if (String(a.id) === String(state?.winnerId)) return -1;
    if (String(b.id) === String(state?.winnerId)) return 1;
    return Number(state?.lives?.[b.id] || 0) - Number(state?.lives?.[a.id] || 0)
      || Number(state?.scores?.[b.id] || 0) - Number(state?.scores?.[a.id] || 0)
      || players.indexOf(a) - players.indexOf(b);
  });
  const [section, setSection] = React.useState<'classement' | 'manches' | 'vies'>('classement');
  const initial = { background: 'linear-gradient(120deg,rgba(12,79,50,.42),rgba(21,21,27,.92) 48%,rgba(116,31,29,.36))', border: '1px solid rgba(239,194,107,.54)', borderRadius: 14, padding: 10 } as React.CSSProperties;
  return <section data-mexicain-final-summary="1" style={{...initial,display:'grid',gap:10,color:'#fff',width:'100%',boxSizing:'border-box'}}>
    <header style={{display:'flex',gap:8,justifyContent:'space-between',alignItems:'center',flexWrap:'wrap'}}><strong style={{color:'#ffe0a1',fontSize:13}}>🇲🇽 BILAN DE LA FIESTA</strong><span style={{fontSize:10,color:'#e9d7b9'}}>{history.length} manches jouées · {players.length} participants</span></header>
    <nav aria-label="Bilan du Mexicain" style={{display:'grid',gridTemplateColumns:'repeat(3,minmax(0,1fr))',gap:5}}>
      {(['classement','manches','vies'] as const).map(key => <button key={key} type="button" onClick={()=>setSection(key)} aria-pressed={section===key} style={{border:`1px solid ${section===key?'#ffd17c':'#8d755d'}`,borderRadius:9,background:section===key?'#77542c':'#171a1e',padding:'9px 4px',color:'#fff4d9',fontWeight:900,fontSize:10,cursor:'pointer'}}>{key==='classement'?'CLASSEMENT':key==='manches'?'RONDA PAR RONDA':'VIES'}</button>)}
    </nav>
    {section==='classement' ? <div style={{display:'grid',gap:6}}>{ordered.map((p:any,i:number)=>{
      const profile:any = profileMap.get(String(p.id)) || p;
      const avatar = profile.avatarDataUrl || profile.avatarUrl || profile.avatar;
      const lives = Number(state?.lives?.[p.id] || 0);
      return <div key={p.id} style={{display:'grid',gridTemplateColumns:'32px 42px minmax(0,1fr) auto',gap:9,alignItems:'center',border:'1px solid rgba(235,193,119,.22)',borderRadius:11,background:'rgba(9,11,16,.64)',padding:7}}>
        <strong style={{color:'#ffd27c'}}>#{i+1}</strong>
        {avatar ? <img src={avatar} alt="" style={{width:40,height:40,borderRadius:'50%',objectFit:'cover',border:'1px solid #daa95c'}}/> : <span style={{width:40,height:40,borderRadius:'50%',background:'#1d5542',display:'grid',placeItems:'center'}}>{String(p.name||'?').slice(0,2)}</span>}
        <div style={{minWidth:0}}><strong style={{display:'block',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{p.name}{String(p.id)===String(state?.winnerId)?' · VAINQUEUR':''}</strong><small style={{color:'#e7cc99'}}>{Number(state?.scores?.[p.id] || 0)} points cumulés</small></div>
        <div style={{textAlign:'right'}}><strong style={{display:'block',fontSize:17,color:'#ffd37b'}}>{lives}</strong><small style={{color:'#ff6577'}}>♥ VIES</small></div>
      </div>;
    })}</div> : null}
    {section==='manches' ? <div style={{display:'grid',gap:8}}><small style={{color:'#e9d7b9'}}>Points validés pour le contrat : les bonus TORTILLA / ENCHILADAS affichés sont déjà inclus dans chaque total.</small>{history.length ? history.map((r:any,i:number)=><div key={i} style={{...initial,background:'rgba(8,12,17,.65)',padding:9}}><strong style={{color:'#f6d18b'}}>RONDA {r.round || i+1} · {r.contractLabel || `CIBLE ${Number(r.target)===21?'BULL':r.target}`}</strong>{(r.scores||[]).map((score:any)=><div key={score.id} style={{display:'flex',gap:8,justifyContent:'space-between',padding:'5px 0',fontSize:11,borderBottom:'1px solid #ffffff12'}}><span>{players.find((p:any)=>String(p.id)===String(score.id))?.name||score.id}</span><span>{Number(score.score)||0} pts{r.bonuses?.[score.id]?.name ? ` · ${r.bonuses[score.id].name} +${r.bonuses[score.id].points} (inclus)` : ''}{(r.losers||[]).some((id:any)=>String(id)===String(score.id))?` · −${Number(r.lifeLoss)||1} ♥`:''}</span></div>)}</div>) : <p>Aucune manche terminée.</p>}</div>:null}
    {section==='vies' ? <div style={{display:'grid',gap:8}}>{last?.standings?.map(row=><div key={row.playerId} style={{...initial,background:'rgba(8,12,17,.65)',padding:9}}><div style={{display:'flex',justifyContent:'space-between',gap:7}}><strong>{players.find((p:any)=>String(p.id)===row.playerId)?.name||row.playerId}</strong><span style={{color:'#ff6577'}}>{row.lives} ♥</span></div><div style={{height:7,borderRadius:99,background:'#ffffff19',overflow:'hidden',marginTop:7}}><div style={{height:'100%',width:`${100*Math.max(0,row.lives)/initialLives}%`,background:'linear-gradient(90deg,#12865d,#dfaf52,#d04e58)'}}/></div></div>) || <p>Aucune donnée.</p>}</div>:null}
  </section>;
}
