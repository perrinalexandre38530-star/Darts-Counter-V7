import React from "react";
import MssSelectorIconButton from "../MssSelectorIconButton";

/** UNIQUE MSS SOURCE — structure de configuration copiée de KILLER.
 * Ce module est indépendant des moteurs ; JOUEURS/ÉQUIPES, FORMAT et les cartes
 * sélectionnées doivent être utilisés, sans réinventer le rendu, par chaque jeu.
 */
export type MssParticipantKind = "players" | "teams";
export function MssKillerParticipantTypeButton({ mode, label, active, accent, onClick }: {
  mode: MssParticipantKind; label: string; active: boolean; accent: string; onClick: () => void;
}) {
  const icon = mode === "players"
    ? <><circle cx="12" cy="7.5" r="3.2"/><path d="M5.5 20v-1.8A6.5 6.5 0 0 1 12 11.7a6.5 6.5 0 0 1 6.5 6.5V20"/></>
    : <><circle cx="7" cy="8.5" r="2.4"/><circle cx="12" cy="6.4" r="2.8"/><circle cx="17" cy="8.5" r="2.4"/><path d="M2.5 19.5v-1a4.5 4.5 0 0 1 6.8-3.8"/><path d="M7.5 20v-1.7A5.4 5.4 0 0 1 12.9 12.9h.2a5.4 5.4 0 0 1 5.4 5.4V20"/><path d="M14.7 14.7a4.5 4.5 0 0 1 6.8 3.8v1"/></>;
  return <button type="button" onClick={onClick} aria-pressed={active} title={label} style={{
    minHeight: 86, width: "100%", borderRadius: 18,
    border: active ? `1px solid ${accent}` : `1px solid ${accent}66`,
    background: active ? `linear-gradient(135deg, ${accent}, #f7df9b)` : "rgba(255,255,255,.035)",
    color: active ? "#383c47" : accent, display: "grid", placeItems: "center", gap: 6,
    padding: "10px 8px", cursor: "pointer", boxShadow: active ? `0 0 20px ${accent}33` : "none",
  }}>
    <svg viewBox="0 0 24 24" width="31" height="31" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{icon}</svg>
    <span style={{fontSize: 12,fontWeight: 1000,letterSpacing: .9,textTransform: "uppercase"}}>{label}</span>
  </button>;
}

export function MssKillerParticipantMode({mode, onChange, accent}: {mode: MssParticipantKind;onChange: (value: MssParticipantKind)=>void;accent: string}) {
  return <div style={{display:"grid",gridTemplateColumns:"repeat(2,minmax(0,1fr))",gap:10}} role="group" aria-label="Type de partie">
    <MssKillerParticipantTypeButton mode="players" label="Joueurs" active={mode==="players"} accent={accent} onClick={()=>onChange("players")}/>
    <MssKillerParticipantTypeButton mode="teams" label="Équipes" active={mode==="teams"} accent={accent} onClick={()=>onChange("teams")}/>
  </div>;
}

export function MssKillerFormat({ mode, playerFormat, onPlayerFormat, teamCount, onTeamCount, teamSize, onTeamSize, accent, maxPlayers = 20 }: {
  mode:MssParticipantKind;playerFormat:"duel"|"multi";onPlayerFormat:(value:"duel"|"multi")=>void;
  teamCount:number;onTeamCount:(value:number)=>void;teamSize:number;onTeamSize:(value:number)=>void;accent:string;maxPlayers?:number;
}) {
  const cardChoice=(n:number,selected:boolean,onClick:()=>void,disabled=false)=><button key={n} type="button" disabled={disabled} aria-pressed={selected} onClick={onClick} style={{padding:11,borderRadius:12,border:`1px solid ${selected?accent:`${accent}55`}`,background:selected?`${accent}28`:"rgba(255,255,255,.03)",color:selected?accent:"#fff",fontWeight:900,cursor:disabled?"not-allowed":"pointer",opacity:disabled?.35:1}}>{n}</button>;
  return mode==="players" ? <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
    {([["duel","DUEL","2 joueurs"],["multi","MULTI",`2 à ${maxPlayers} joueurs`]] as const).map(([id,label,detail])=><button key={id} type="button" aria-pressed={playerFormat===id} onClick={()=>onPlayerFormat(id)} style={{minWidth:0,minHeight:79,borderRadius:14,background:playerFormat===id?`${accent}2c`:"rgba(255,255,255,.03)",border:`1px solid ${playerFormat===id?accent:`${accent}55`}`,color:playerFormat===id?accent:"#fff",cursor:"pointer",display:"grid",placeContent:"center",gap:4}}><strong style={{fontSize:16}}>{label}</strong><span style={{fontSize:11,opacity:.82}}>{detail}</span></button>)}
  </div> : <div style={{display:"grid",gap:14}}>
    <div style={{display:"grid",gap:8}}><div style={{color:"#e5e7f1",fontSize:12}}>Nombre d'équipes</div><div style={{display:"grid",gridTemplateColumns:"repeat(3,minmax(0,1fr))",gap:8}}>{[2,3,4].map(n=>cardChoice(n,teamCount===n,()=>onTeamCount(n),n*2>maxPlayers))}</div></div>
    <div style={{display:"grid",gap:8}}><div style={{color:"#e5e7f1",fontSize:12}}>Joueurs / bots par équipe</div><div style={{display:"grid",gridTemplateColumns:"repeat(4,minmax(0,1fr))",gap:8}}>{[2,3,4,5].map(n=>cardChoice(n,teamSize===n,()=>onTeamSize(n),n*teamCount>maxPlayers))}</div></div>
    <div style={{textAlign:"center",color:accent,fontSize:12,fontWeight:800}}>{teamCount} équipes × {teamSize} membres = {teamCount*teamSize} participants</div>
  </div>;
}

export type MssKillerSelectedTeam={id:string;name:string;logo?:string|null;color?:string;ring?:string;short?:string;members:{id:string;name:string;avatar?:string|null}[]};
export function MssKillerSelectedTeamCards({teams,accent,onEdit,onRemove}: {teams:MssKillerSelectedTeam[];accent:string;onEdit:(id:string)=>void;onRemove:(id:string)=>void}) {
  if (!teams.length) return null;
  return <div style={{border:`1px solid ${accent}44`,borderRadius:15,padding:10,background:"rgba(255,255,255,.025)"}}>
    <div style={{color:accent,fontSize:12,fontWeight:900,letterSpacing:.6,marginBottom:9}}>ÉQUIPES SÉLECTIONNÉES</div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(2,minmax(0,1fr))",gap:8}}>
      {teams.map(g=><div key={g.id} style={{display:"grid",justifyItems:"center",gap:5,textAlign:"center",background:"rgba(255,255,255,.035)",border:`1px solid ${accent}55`,borderRadius:13,padding:"10px 6px",color:"#fff",minWidth:0}}>
        <div style={{width:62,height:62,borderRadius:"50%",border:`2px solid ${g.ring||accent}`,overflow:"hidden",display:"grid",placeItems:"center",background:g.logo?"#141826":`radial-gradient(circle at 30% 30%,${g.ring||accent}55 0%,${g.color||accent}55 40%,rgba(10,12,24,.95) 100%)`,color:g.ring||accent,fontWeight:1000,fontSize:18,boxShadow:`0 0 18px ${g.color||accent}55`}}>{g.logo?<img src={g.logo} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>:<span>{g.short||g.name.slice(0,2).toUpperCase()}</span>}</div>
        <div style={{color:g.color||accent,fontSize:12,fontWeight:900,overflow:"hidden",textOverflow:"ellipsis",maxWidth:"100%",whiteSpace:"nowrap"}}>{g.name}</div>
        <div style={{display:"flex",justifyContent:"center",flexWrap:"wrap",gap:5,width:"100%"}}>{g.members.map(member=><div key={member.id} title={member.name} style={{display:"grid",justifyItems:"center",gap:3,maxWidth:54}}><div style={{width:30,height:30,borderRadius:"50%",overflow:"hidden",background:"#232530",border:`1px solid ${accent}88`,display:"grid",placeItems:"center",color:accent,fontWeight:900,fontSize:10}}>{member.avatar?<img src={member.avatar} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>:member.name.slice(0,2).toUpperCase()}</div><span style={{fontSize:9,maxWidth:50,textOverflow:"ellipsis",overflow:"hidden",whiteSpace:"nowrap"}}>{member.name}</span></div>)}</div>
        <div style={{display:"flex",gap:9,justifyContent:"center",alignItems:"center",paddingTop:5}}>
          <button type="button" onClick={()=>onEdit(g.id)} aria-label={`Modifier les membres de ${g.name}`} title="Modifier" style={{width:34,height:34,display:"grid",placeItems:"center",border:`1px solid ${accent}88`,color:accent,background:`${accent}12`,borderRadius:11,cursor:"pointer",fontSize:18}}>✎</button>
          <button type="button" onClick={()=>onRemove(g.id)} aria-label={`Retirer ${g.name}`} title="Retirer" style={{width:34,height:34,display:"grid",placeItems:"center",border:"1px solid rgba(255,130,130,.55)",color:"#ffa29a",background:"rgba(180,35,35,.1)",borderRadius:11,cursor:"pointer",fontSize:21}}>×</button>
        </div>
      </div>)}
    </div>
  </div>;
}

export function MssKillerTeamsToolbar({accent,active,onAction}: {accent:string;active?:string;onAction:(action:"manual"|"saved"|"auto"|"bots"|"create")=>void}) {
  return <div style={{display:"flex",alignItems:"center",gap:8,justifyContent:"center",flexWrap:"nowrap"}}>
    {([["manual","teams","Composition manuelle"],["saved","saved-teams","Équipes enregistrées"],["auto","shuffle","Brassage automatique"],["bots","bot-teams","Équipes bots CPU"],["create","plus","Créer un participant ou une équipe"]] as const).map(([action,icon,label])=><MssSelectorIconButton key={action} icon={icon} label={label} accent={accent} active={active===action} onClick={()=>onAction(action)}/>)}
  </div>;
}
