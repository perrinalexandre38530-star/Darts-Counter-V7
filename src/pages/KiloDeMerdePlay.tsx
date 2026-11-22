// @ts-nocheck
// Mode autonome KILO DE MERDE, règles et score indépendants du PRÉSIDENT.
import React from 'react';
import BackDot from '../components/BackDot';
import PageHeader from '../components/PageHeader';
import ProfileAvatar from '../components/ProfileAvatar';
import tickerKiloFr from "../assets/tickers/ticker_kilo_de_merde_fr.webp";
import tickerKiloEn from "../assets/tickers/ticker_kilo_de_merde_en.webp";
import { useLang } from "../contexts/LangContext";
import { mssVisualPresidentCardUrl as mssPresidentCardUrl } from '../lib/mssCardDeck';
import { createKiloState, kiloSelectCard, kiloPenalty, kiloContinue, kiloCardLabel, kiloHasFour, type KiloState } from '../lib/gameEngines/kiloDeMerdeEngine';
const GOLD='#f6c765';
const cardStyle=(selected=false):React.CSSProperties=>({border:`2px solid ${selected?GOLD:'transparent'}`,borderRadius:12,padding:3,background:selected?'#efbf5433':'transparent',flex:'0 0 auto',cursor:'pointer',transform:selected?'translateY(-5px)':undefined});
const block:React.CSSProperties={borderRadius:18,border:'1px solid #cfaf6455',background:'linear-gradient(145deg,#133e33,#071e1e)',padding:13,boxShadow:'0 12px 26px #0005'};
export default function KiloDeMerdePlay(props:any){
  const { lang } = useLang();
  const tickerKilo = lang === "fr" ? tickerKiloFr : tickerKiloEn;
  const cfg=props?.params?.config||props?.config||props?.params||{};
  const store=props?.store||props?.params?.store;
  const profiles=[...(store?.profiles||[]),...(cfg.playersList||[])];
  const ids=[...(cfg.selectedIds||[])];
  const names=new Map(profiles.map((p:any)=>[String(p.id),p]));
  const profile=(id:string)=>names.get(id)||{id,name:'Joueur'};
  const label=(id:string)=>String(profile(id)?.name||profile(id)?.displayName||'Joueur').toUpperCase();
  const go=props?.go||props?.setTab||props?.params?.go;
  const back=()=>typeof go==='function'&&go('kilo_de_merde_config');
  const [game,setGame]=React.useState(()=>createKiloState(ids,Number(cfg.rounds||5)));
  const [selected,setSelected]=React.useState<number|null>(null);
  const [revealed,setRevealed]=React.useState(false);
  const [rules,setRules]=React.useState(false);
  const [prematureChoice,setPrematureChoice]=React.useState(false);
  // Demander confirmation avant toute pénalité : la dernière est irréversible une fois la partie enregistrée.
  const [pendingPenalty,setPendingPenalty]=React.useState<{id:string;premature:boolean;round:number;phase:KiloState['phase'];epoch:number}|null>(null);
  const [undoStack,setUndoStack]=React.useState<KiloState[]>([]);
  // Un résultat terminé reste réversible tant que le classement n’est pas confirmé.
  const [finalConfirmed,setFinalConfirmed]=React.useState(false);
  const liveGameRef=React.useRef(game);
  liveGameRef.current=game;
  const savedOnce=React.useRef(false);
  React.useEffect(()=>{
    if(game.phase!=='finished'||!finalConfirmed||savedOnce.current)return;
    savedOnce.current=true;
    const now=Date.now();
    const sorted=[...game.playerIds].sort((a,b)=>(game.kilos[a]||0)-(game.kilos[b]||0));
    const rows=sorted.map((id,i)=>({id,name:label(id),rank:sorted.filter(other=>(game.kilos[other]||0)<(game.kilos[id]||0)).length+1,score:game.kilos[id]||0,kilos:game.kilos[id]||0,win:(game.kilos[id]||0)===Math.min(...game.playerIds.map(pid=>game.kilos[pid]||0))}));
    const record={id:`kilo_de_merde-${now}`,matchId:`kilo_de_merde-${now}`,kind:'kilo_de_merde',mode:'kilo_de_merde',sport:'darts',status:'finished',createdAt:now,updatedAt:now,winnerId:game.winnerId,players:rows,game:{mode:'kilo_de_merde'},summary:{kind:'kilo_de_merde',mode:'kilo_de_merde',sport:'darts',winnerId:game.winnerId,players:rows,rounds:game.rounds.length,scoreType:'kilos_lower_is_better',scoreLine:rows.map(row=>`${row.name} ${row.kilos} kg`).join(' • ')},payload:{kind:'kilo_de_merde',mode:'kilo_de_merde',players:rows,rounds:game.rounds,config:cfg,game:{mode:'kilo_de_merde'},rules:{mode:'kilo_de_merde'},stats:{mode:'kilo_de_merde',players:rows}}};
    try{props?.onFinish?.(record,{navigate:false});}catch{}
  },[game.phase,finalConfirmed]);
  const activeId=game.playerIds[game.selectorIndex];
  const person=profile(activeId);
  const hands=game.hands[activeId]||[];
  const apply=(update:(old:KiloState)=>KiloState)=>{
    const old=liveGameRef.current;
    const changed=update(old);
    if(changed===old)return;
    liveGameRef.current=changed;
    setUndoStack(stack=>[...stack.slice(-39),old]);
    setGame(changed);
  };
  const choose=(index:number)=>{
    // Le moteur compare le joueur qui a vu sa main au joueur actuellement actif.
    // Un second appui pendant la transition ne peut pas agir sur la main suivante.
    const confirmingPlayerId=activeId;
    const exchangeEpoch=game.exchangeEpoch;
    apply(g=>kiloSelectCard(g,index,confirmingPlayerId,exchangeEpoch));
    setSelected(null);setRevealed(false);
  };
  const next=()=>apply(g=>kiloContinue(g));
  const penalize=(id:string,premature=false)=>{
    // Ne jamais sanctionner sur une simple sélection du nom : confirmation explicite.
    if(!game.playerIds.includes(id) || (premature ? game.phase!=='select' : game.phase!=='slap')) return;
    setPendingPenalty({id,premature,round:game.rounds.length,phase:game.phase,epoch:game.exchangeEpoch});
  };
  const confirmPenalty=()=>{
    const pending=pendingPenalty;
    if(!pending)return;
    // Les boutons d'une fenêtre ancienne ne peuvent pas agir sur un nouveau cycle.
    apply(g=>kiloPenalty(g,pending.id,pending.premature,pending.round,pending.phase,pending.epoch));
    setPendingPenalty(null);setSelected(null);setRevealed(false);setPrematureChoice(false);
  };
  const undo=()=>{
    if((game.phase==='finished'&&finalConfirmed)||!undoStack.length)return;
    const previous=undoStack[undoStack.length-1];
    liveGameRef.current=previous;
    setUndoStack(stack=>stack.slice(0,-1));
    setGame(previous);
    setFinalConfirmed(false);
    setSelected(null);setRevealed(false);setPrematureChoice(false);setPendingPenalty(null);
  };
  const card=(c:any,i:number,click?:()=>void,chosen=false)=> <button key={`${c.suit}-${c.value}-${i}`} type="button" onClick={click} disabled={!click} style={{...cardStyle(chosen),cursor:click?'pointer':'default'}} aria-label={`${kiloCardLabel(c.value)} carte`}><img draggable={false} src={mssPresidentCardUrl(c.suit,c.value)} alt={`${kiloCardLabel(c.value)}`} style={{width:67,height:96,objectFit:'fill',borderRadius:7}}/></button>;
  const rank=[...game.playerIds].sort((a,b)=>game.kilos[a]-game.kilos[b]);
  const primary=GOLD;
  return <div style={{minHeight:'100dvh',background:'#05090e',color:'#f6f3e8',paddingBottom:24}}>
    <PageHeader tickerSrc={tickerKilo} tickerAlt="KILO DE MERDE" tickerFit="contain" tickerHeight={74} tickerBottomGap={6} left={<BackDot onClick={back} color={GOLD}/>} right={<button type="button" onClick={()=>setRules(true)} style={{border:'1px solid #e8bc78',background:'#131c1c',color:GOLD,borderRadius:99,padding:10,fontWeight:900}}>RÈGLES</button>}/>
    <main style={{maxWidth:780,margin:'auto',padding:'10px 12px',display:'grid',gap:12}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:10}}><div><div style={{fontSize:20,fontWeight:1100,color:GOLD}}>🚽 KILO DE MERDE</div><div style={{fontSize:11,color:'#b7cdc1'}}>JEU DE CARTES MSS · 4 CARTES EN MAIN · TAS CENTRAL</div></div><button onClick={()=>setRules(true)} style={{border:'1px solid #c9af6866',borderRadius:99,background:'#111e1d',color:GOLD,padding:'9px 12px'}}>ⓘ RÈGLES</button></div>
      <section style={block}><div style={{color:GOLD,fontWeight:1000,fontSize:12,marginBottom:10}}>CLASSEMENT · MOINS DE KILOS = MEILLEUR</div><div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(115px,1fr))',gap:8}}>{rank.map((id,i)=><div key={id} style={{background:'#0005',borderRadius:13,padding:9,display:'flex',gap:8,alignItems:'center',border:i===0?'1px solid #d8bd6a':'1px solid #ffffff22'}}><ProfileAvatar profile={profile(id)} size={32}/><div><div style={{fontSize:10,fontWeight:1000}}>{label(id)}</div><div style={{fontWeight:1100,color:i===0?'#85edbd':GOLD}}>{game.kilos[id]} kg</div></div></div>)}</div></section>
      <div style={{display:'flex',gap:8,justifyContent:'flex-end'}}>
        <button type="button" disabled={!undoStack.length||(game.phase==='finished'&&finalConfirmed)} onClick={undo} style={{border:'1px solid #dfb85a66',background:'#1a2423',borderRadius:11,color:GOLD,padding:'9px 14px',opacity:!undoStack.length||(game.phase==='finished'&&finalConfirmed)?.45:1,fontWeight:850}}>↶ ANNULER LA DERNIÈRE ACTION</button>
      </div>
      <section style={{...block,textAlign:'center'}}><div style={{color:GOLD,fontWeight:1000,fontSize:12}}>TAS DES KILOS</div><div style={{fontSize:45,marginTop:5}}>🂠</div><div style={{fontSize:13,fontWeight:900}}>{game.pile.length} cartes · {game.rounds.length}/{game.maxRounds} pénalités</div><div style={{color:'#cbded8',fontSize:11,marginTop:8}}>{game.notice}</div></section>
      {game.phase==='select' ? <section style={block}>
        <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:12}}><ProfileAvatar profile={person} size={48}/><div><div style={{fontWeight:1000,color:GOLD}}>{label(activeId)}</div><div style={{color:'#d4e4d7',fontSize:11}}>Choisis UNE carte à passer au joueur situé à ta gauche.</div></div></div>
        <button type="button" onClick={()=>{setPrematureChoice(v=>!v);setRevealed(false);setSelected(null);}} style={{marginBottom:10,border:'1px solid #ff9d6688',borderRadius:12,background:'#431f1b',color:'#ffd0a4',padding:'10px 12px',fontWeight:900,width:'100%'}}>✋ QUELQU’UN A TAPÉ TROP TÔT ?</button>
        {prematureChoice?<div style={{border:'1px solid #ffb48f66',padding:10,borderRadius:12,marginBottom:10}}><div style={{fontSize:12,marginBottom:10,color:'#ffd7bc'}}>Désigne le joueur qui a tapé avant qu'un carré soit annoncé. Il tire une carte du tas ; les échanges en cours sont annulés.</div><div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(110px,1fr))',gap:7}}>{game.playerIds.map(id=><button type="button" key={id} onClick={()=>penalize(id,true)} style={{background:'#662d20',border:'1px solid #ffb48f',color:'#fff',padding:10,borderRadius:10}}>{label(id)}</button>)}</div></div>:null}
        {!revealed?<button onClick={()=>setRevealed(true)} style={{width:'100%',minHeight:52,background:'#efc45a',color:'#14130b',border:0,borderRadius:14,fontWeight:1000}}>JE SUIS {label(activeId)} · VOIR MA MAIN</button>:<><div style={{display:'flex',gap:5,overflowX:'auto',padding:'10px 0'}}>{hands.map((c,i)=>card(c,i,()=>setSelected(i),selected===i))}</div><div style={{fontSize:11,color:'#b8d4c8',margin:'5px 0 12px'}}>Ta main est cachée entre chaque joueur. Ne montre pas tes cartes aux adversaires.</div><button disabled={selected===null} onClick={()=>choose(selected!)} style={{width:'100%',minHeight:52,background:selected===null?'#4a4f4c':'#efc45a',color:'#161713',border:0,borderRadius:14,fontWeight:1000}}>PASSER LA CARTE À GAUCHE</button></>}
      </section>:null}
      {game.phase==='slap'?<section style={{...block,borderColor:'#f9d073'}}><div style={{color:GOLD,fontSize:20,fontWeight:1100,textAlign:'center'}}>✋ TOUT LE MONDE TAPE SUR LE TAS !</div><div style={{fontSize:12,color:'#cce8db',textAlign:'center',margin:'8px 0 15px'}}>Un joueur a quatre cartes identiques. Choisissez le dernier joueur à avoir tapé (ou celui ayant tapé trop tôt).</div><div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(135px,1fr))',gap:8}}>{game.playerIds.map(id=><button key={id} onClick={()=>penalize(id)} style={{border:'1px solid #ffb48f',borderRadius:12,padding:10,color:'#fff',background:'#662d20',display:'flex',alignItems:'center',gap:8}}><ProfileAvatar profile={profile(id)} size={30}/><b>{label(id)}</b></button>)}</div></section>:null}
      {game.phase==='result'||game.phase==='finished'?<section style={{...block,textAlign:'center'}}><div style={{fontSize:30}}>🚽</div><div style={{color:GOLD,fontSize:18,fontWeight:1100}}>{game.rounds.at(-1)?.flushed?"CHASSE D'EAU !":'PÉNALITÉ DU TAS'}</div><div style={{fontSize:12,margin:'8px 0 6px',fontWeight:900,color:'#f5dca8'}}>Joueur pénalisé : {label(game.rounds.at(-1)?.loserId||'')}</div><div style={{fontSize:12,margin:'8px 0 14px'}}>{game.notice}</div>{game.phase==='finished'?<><div style={{fontSize:22,color:'#9cf0ba',fontWeight:1100}}>🏆 {game.winnerId?label(game.winnerId):`EX ÆQUO · ${rank.filter(id=>game.kilos[id]===game.kilos[rank[0]]).map(label).join(" / ")}`}</div><div style={{fontSize:12}}>{game.winnerId?"Victoire au plus faible total de kilos.":"Égalité au plus faible total de kilos."}</div>{!finalConfirmed?<><div style={{fontSize:12,color:"#ffdb9b",margin:"10px 0"}}>Classement provisoire : vérifiez la dernière pénalité. Vous pouvez encore utiliser ANNULER.</div><button type="button" onClick={()=>setFinalConfirmed(true)} style={{border:0,borderRadius:12,padding:"13px 22px",background:"#9de8b8",color:"#102318",fontWeight:1000,marginTop:8}}>VALIDER LE CLASSEMENT ET ENREGISTRER</button></>:<div role="status" style={{marginTop:10,fontSize:12,color:"#9de8b8",fontWeight:900}}>CLASSEMENT VALIDÉ · ENREGISTREMENT DEMANDÉ</div>}<button onClick={()=>{savedOnce.current=false;setFinalConfirmed(false);const fresh=createKiloState(ids,Number(cfg.rounds||5));liveGameRef.current=fresh;setGame(fresh);setUndoStack([]);setSelected(null);setRevealed(false);setPrematureChoice(false);setPendingPenalty(null)}} style={{...cardStyle(),background:'#efc45a',color:'#161313',padding:'14px 28px',marginTop:12}}>REJOUER</button></>:<button onClick={next} style={{border:0,borderRadius:12,padding:'13px 22px',background:GOLD,color:'#12120b',fontWeight:1000}}>{game.rounds.at(-1)?.premature?'REPRENDRE LES ÉCHANGES':'NOUVELLE DONNE'}</button>}</section>:null}
    </main>
    {pendingPenalty?<div role="dialog" aria-modal="true" aria-label="Confirmer la pénalité" onClick={()=>setPendingPenalty(null)} style={{position:'fixed',inset:0,zIndex:9998,background:'#000d',display:'grid',placeItems:'center',padding:14}}>
      <div onClick={e=>e.stopPropagation()} style={{...block,width:'min(420px,100%)',textAlign:'center',display:'grid',gap:14,padding:20}}>
        <div style={{fontSize:30}}>✋</div>
        <div style={{fontWeight:1000,fontSize:18,color:GOLD}}>{pendingPenalty.premature?'TAPE PRÉMATURÉE':'DERNIER À TAPER'}</div>
        <div style={{display:'flex',justifyContent:'center',alignItems:'center',gap:10}}><ProfileAvatar profile={profile(pendingPenalty.id)} size={42}/><strong style={{fontSize:17}}>{label(pendingPenalty.id)}</strong></div>
        <div style={{fontSize:13,color:'#d8e8dc'}}>Confirmer la pénalité de ce joueur ? Il prendra la prochaine carte du tas. {pendingPenalty.premature?'Les choix d’échange en cours seront annulés.':'Une nouvelle donne suivra, sauf si la partie se termine.'}</div>
        {game.rounds.length+1>=game.maxRounds?<div style={{fontSize:12,color:'#ffcf95',fontWeight:900}}>Dernière pénalité : le classement restera modifiable jusqu’à votre validation finale.</div>:null}
        <div style={{display:'flex',gap:8}}>
          <button type="button" onClick={()=>setPendingPenalty(null)} style={{flex:1,padding:13,borderRadius:12,border:'1px solid #e8d6a066',background:'#28312e',color:'#fff',fontWeight:900}}>ANNULER</button>
          <button type="button" onClick={confirmPenalty} style={{flex:1,padding:13,borderRadius:12,border:0,background:GOLD,color:'#191611',fontWeight:1000}}>CONFIRMER</button>
        </div>
      </div>
    </div>:null}
    {rules?<div role="dialog" aria-modal="true" onClick={()=>setRules(false)} style={{position:'fixed',inset:0,zIndex:9999,background:'#000c',display:'grid',placeItems:'center',padding:12}}><div onClick={e=>e.stopPropagation()} style={{...block,width:'min(620px,100%)',maxHeight:'88vh',overflowY:'auto',lineHeight:1.55,fontSize:13}}><div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}><b style={{color:GOLD}}>🚽 RÈGLES · KILO DE MERDE</b><button onClick={()=>setRules(false)} style={{background:'transparent',border:0,color:GOLD,fontSize:24}}>×</button></div><p><b>But :</b> avoir le moins de kilos à la fin des tours choisis.</p><p><b>Paquet :</b> 52 cartes. Chaque joueur reçoit quatre cartes. Les 7 sont réservés au tas central. La sélection des autres valeurs dépend du nombre de joueurs.</p><p><b>Échanges :</b> chacun choisit une carte et la passe à son voisin de gauche. L'application effectue l'échange après tous les choix.</p><p><b>Tape prématurée :</b> si quelqu’un tape avant qu’un carré soit annoncé, désigne-le avec le bouton dédié : il pioche une pénalité et les choix de cartes en cours sont annulés.</p><p><b>Quatre cartes identiques :</b> tout le monde tape sur le tas. Le dernier (ou celui qui tape trop tôt) récupère la première carte du tas et sa valeur en kilos.</p><p><b>Barème :</b> 2–10 = valeur de la carte ; Valet 11 ; Dame 12 ; Roi 13 ; As 100 kg.</p><p><b>Chasse d'eau :</b> si la carte du tas est un 7, tous les kilos du joueur sont annulés et ses cartes de pénalité retournent au tas.</p><p style={{color:'#c8e0d6',fontSize:11}}>Adaptation MSS sur appareil partagé : le dernier à taper est désigné manuellement. Le joueur doit veiller à garder sa main secrète.</p><button onClick={()=>setRules(false)} style={{background:GOLD,border:0,borderRadius:12,padding:12,fontWeight:1000,width:'100%'}}>J'AI COMPRIS</button></div></div>:null}
  </div>;
}
