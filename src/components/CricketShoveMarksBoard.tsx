import React from "react";
import { CricketMarkIcon } from "./MaskIcon";

type Player = { id: string; name: string; marks?: Record<number,number>; score?: number };
type Props = {
  players: Player[];
  targets: readonly number[];
  activeId: string;
  accent: string;
  profiles?: any[];
  hiddenTargets?: boolean;
};
const TONES = ["#fbbf24", "#f472b6", "#22c55e", "#38bdf8", "#a78bfa", "#fdba74"];
const avatarOf = (p:any) => p?.avatarDataUrl || p?.avatarUrl || p?.avatar || p?.photoDataUrl || null;

/** Même grille fixe et défilement horizontal que ShovePennyCricketBoard,
 *  alimentée par les marques réelles du moteur CRICKET. */
export default function CricketShoveMarksBoard({players,targets,activeId,accent,profiles=[],hiddenTargets=false}:Props) {
  const byId = new Map(profiles.map((p:any)=>[String(p.id),p]));
  return <section data-cricket-shove-board="1" style={{borderRadius:14,background:"#101521",border:`1px solid ${accent}55`,padding:8,minWidth:0}}>
    <div style={{color:accent,fontSize:10,fontWeight:1000,letterSpacing:.7,marginBottom:7}}>TABLEAU DES MARQUES · 3 IMPACTS PAR CIBLE</div>
    <div style={{maxWidth:"100%",overflowX:"auto",overflowY:"hidden",WebkitOverflowScrolling:"touch",borderRadius:9,border:"1px solid rgba(255,255,255,.08)"}}>
      <table style={{borderCollapse:"separate",borderSpacing:0,width:"max-content",minWidth:"100%",tableLayout:"fixed"}}>
        <thead><tr>
          <th scope="col" style={{position:"sticky",left:0,zIndex:4,minWidth:55,width:55,background:"#151d2b",color:accent,textAlign:"center",fontSize:10,padding:"6px 3px",borderRight:`1px solid ${accent}65`}}>CIBLE</th>
          {players.map((p,index)=>{
            const avatar=avatarOf(byId.get(String(p.id))||p);
            const active=String(p.id)===activeId;
            const tone=active?accent:TONES[index%TONES.length];
            return <th scope="col" key={p.id} title={p.name} style={{minWidth:64,width:64,height:52,background:active?`${accent}25`:"#111724",borderBottom:`2px solid ${tone}88`,padding:"4px 2px",textAlign:"center"}}>
              {avatar?<img src={avatar} alt={p.name} style={{display:"block",margin:"auto",width:35,height:35,objectFit:"cover",borderRadius:"50%",border:`2px solid ${tone}`}}/>:<span style={{display:"grid",placeItems:"center",margin:"auto",width:35,height:35,border:`2px solid ${tone}`,background:`${tone}18`,borderRadius:"50%",color:tone,fontSize:13,fontWeight:1000}}>{String(p.name||"?").slice(0,2).toUpperCase()}</span>}
              <small style={{color:tone,fontSize:10,fontWeight:900}}>{p.score ?? 0} pts</small>
            </th>;
          })}
        </tr></thead>
        <tbody>{targets.map(target=><tr key={target}>
          <th scope="row" style={{position:"sticky",left:0,zIndex:3,width:55,minWidth:55,background:"#151d2b",color:target===25?"#22c55e":target===26?"#06b6d4":target===27?"#d946ef":accent,fontSize:target>=25?11:17,fontWeight:1000,textAlign:"center",padding:5,borderBottom:"1px solid #344155",borderRight:`1px solid ${accent}55`}}>{hiddenTargets && target!==25 && !players.some(p=>Number(p.marks?.[target]||0)>0)?"?":target===25?"BULL":target===26?"D":target===27?"T":target===28?"BED":target}</th>
          {players.map((p,index)=>{
            const marks=Math.max(0,Number(p.marks?.[target]||0));
            const active=String(p.id)===activeId;
            const tone=active?accent:TONES[index%TONES.length];
            return <td key={p.id} aria-label={`${p.name} : ${marks} marques sur ${target}`} style={{minWidth:64,width:64,height:40,background:marks>=3?`${tone}24`:"#0b1220",borderBottom:"1px solid #263144",borderRight:"1px solid #263144",textAlign:"center",padding:"3px 1px"}}>
              {marks>0?<span style={{display:"flex",alignItems:"center",justifyContent:"center"}}><CricketMarkIcon marks={Math.min(3,marks)} color={tone} size={marks>=3?31:28} glow={active}/></span>:<span style={{color:"#425066"}}>—</span>}
            </td>;
          })}
        </tr>)}</tbody>
      </table>
    </div>
    {players.length>4?<p style={{margin:"6px 0 0",fontSize:9,textAlign:"center",color:"#a6b0bf"}}>Fais défiler les joueurs horizontalement · CIBLE reste fixe</p>:null}
  </section>;
}
