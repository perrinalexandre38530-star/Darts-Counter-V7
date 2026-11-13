import React from 'react';
import { CricketMarkIcon } from './MaskIcon';
import { shoveTargets, type ShoveMarks, type ShoveRuleSet } from '../lib/gameEngines/shoveAPennyTargets';

type Player = {id:string;name:string};
type Props = {
  state: { players: Player[]; special?: { shoveMarksByPlayer?: Record<string, ShoveMarks> } };
  profiles?: any[];
  accent: string;
  activePlayerId?: string;
  previewMarks?: ShoveMarks;
  marksPerBox: number;
  ruleSet?: ShoveRuleSet;
};

const PLAYER_TONES = ['#fbbf24','#f472b6','#22c55e','#38bdf8','#a78bfa','#fdba74','#fb7185','#4ade80','#60a5fa','#fcd34d'];
const avatarOf = (p:any) => p?.avatarDataUrl || p?.avatarUrl || p?.avatar || p?.photoDataUrl || null;

/** Tableau commun SHOVE/Cricket : colonne CASE collée à gauche, joueurs défilants horizontalement. */
export default function ShovePennyCricketBoard({state,profiles=[],accent,activePlayerId,previewMarks,marksPerBox,ruleSet='traditional'}:Props) {
  const targets = shoveTargets(ruleSet);
  const players = state.players || [];
  const profilesById = new Map(profiles.map((p:any)=>[String(p.id),p]));
  return <section data-shove-cricket-board="1" data-shove-ruleset={ruleSet} style={{borderRadius:14,background:'#101521',border:`1px solid ${accent}55`,padding:8,minWidth:0}}>
    <div style={{color:accent,fontSize:10,fontWeight:1000,letterSpacing:.7,marginBottom:7}}>{ruleSet==='traditional'?'1 À 9 · ORDRE LIBRE':'15 À BULL · DANS L’ORDRE'} · {marksPerBox} MARQUES</div>
    <div data-shove-scroll-board="1" style={{maxWidth:'100%',overflowX:'auto',overflowY:'hidden',WebkitOverflowScrolling:'touch',borderRadius:9,border:'1px solid rgba(255,255,255,.08)'}}>
      <table style={{borderCollapse:'separate',borderSpacing:0,width:'max-content',minWidth:'100%',tableLayout:'fixed'}}>
        <thead><tr>
          <th scope="col" style={{position:'sticky',left:0,zIndex:4,minWidth:55,width:55,background:'#151d2b',color:accent,textAlign:'center',fontSize:10,padding:'6px 3px',borderRight:`1px solid ${accent}65`}}>CASE</th>
          {players.map((p,index)=>{
            const avatar=avatarOf(profilesById.get(String(p.id)) || p);
            const isActive=String(activePlayerId)===String(p.id);
            const tone=isActive?accent:PLAYER_TONES[index%PLAYER_TONES.length];
            return <th scope="col" key={p.id} title={p.name} aria-label={p.name} style={{minWidth:64,width:64,height:52,background:isActive?`${accent}25`:'#111724',borderBottom:`2px solid ${tone}88`,padding:'4px 2px',textAlign:'center'}}>
              {avatar?<img src={avatar} alt={p.name} style={{display:'block',margin:'auto',width:35,height:35,objectFit:'cover',borderRadius:'50%',border:`2px solid ${tone}`}}/>:<span style={{display:'grid',placeItems:'center',margin:'auto',width:35,height:35,border:`2px solid ${tone}`,background:`${tone}18`,borderRadius:'50%',color:tone,fontSize:13,fontWeight:1000}}>{String(p.name||'?').slice(0,2).toUpperCase()}</span>}
            </th>;
          })}
        </tr></thead>
        <tbody>{targets.map((number)=> <tr key={number}>
          <th scope="row" style={{position:'sticky',left:0,zIndex:3,width:55,minWidth:55,background:'#151d2b',color:accent,fontSize:17,fontWeight:1000,textAlign:'center',padding:5,borderBottom:'1px solid #344155',borderRight:`1px solid ${accent}55`}}>{number===25?'BULL':number}</th>
          {players.map((p,index)=>{
            const isActive=String(activePlayerId)===String(p.id);
            const marks=(isActive && previewMarks) || state.special?.shoveMarksByPlayer?.[p.id] || {};
            const count=Math.max(0,Number(marks[String(number)]||0));
            const closed=count>=marksPerBox;
            const tone=isActive?accent:PLAYER_TONES[index%PLAYER_TONES.length];
            return <td key={p.id} aria-label={`${p.name}, ${number}, ${count} marques sur ${marksPerBox}`} style={{minWidth:64,width:64,height:40,background:closed?`${tone}24`:'#0b1220',borderBottom:'1px solid #263144',borderRight:'1px solid #263144',textAlign:'center',padding:'3px 1px'}}>
              {count>0?<span style={{display:'flex',alignItems:'center',justifyContent:'center',gap:2}}><CricketMarkIcon marks={Math.min(3,count)} color={tone} size={closed?31:28} glow={isActive}/>{count>3?<small style={{color:tone,fontWeight:950}}>+{count-3}</small>:null}</span>:<span style={{color:'#425066'}}>—</span>}
            </td>;
          })}
        </tr>)}</tbody>
      </table>
    </div>
    {players.length>4?<p style={{margin:'6px 0 0',fontSize:9,textAlign:'center',color:'#a6b0bf'}}>Fais glisser les joueurs horizontalement · la colonne CASE reste fixe</p>:null}
  </section>;
}
