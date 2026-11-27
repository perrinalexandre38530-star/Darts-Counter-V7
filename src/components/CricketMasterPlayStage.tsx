import React from 'react';
import { CricketMarkIcon } from './MaskIcon';
import ShoveActivePlayerCard from './ShoveActivePlayerCard';

/** CRICKET MASTER — adaptation native du langage Play SHOVE A PENNY (pas de duplication de son moteur). */
type Player = { id: string; name: string; marks?: Record<number, number>; score?: number };
type Props = {
  players: Player[];
  targets?: readonly number[];
  gameLabel?: string;
  activePlayerId: string;
  profiles: any[];
  dartsThrown: number;
  round: number;
  maxRounds: number;
  withPoints: boolean;
  onObjective: () => void;
  onActions: () => void;
};
const TARGETS = [15, 16, 17, 18, 19, 20, 26, 27, 25] as const;
const GOLD = '#ffbf46';
const COLORS: Record<number, string> = { 26: '#05bce9', 27: '#d946ef', 25: '#29be5c' };
const TARGET_NAME: Record<number, string> = { 26: 'DOUBLE', 27: 'TRIPLE', 28: 'BED', 25: 'BULL' };
const PLAYER_TONES = ['#ffbd49', '#f472b6', '#22c55e', '#38bdf8', '#a78bfa', '#fdba74', '#fb7185', '#4ade80'];
function avatarUrl(profile: any): string | null {
  return profile?.avatarDataUrl || profile?.avatarUrl || profile?.photoDataUrl || profile?.avatar || null;
}
export default function CricketMasterPlayStage({ players, targets: configuredTargets, gameLabel = "TACTICS", activePlayerId, profiles, dartsThrown, round, maxRounds, withPoints, onObjective, onActions }: Props) {
  const targets = configuredTargets?.length ? configuredTargets : TARGETS;
  const active = players.find(p => p.id === activePlayerId) || players[0];
  if (!active) return null;
  const profileById = new Map((profiles || []).map(p => [String(p.id), p]));
  const closed = targets.filter(target => Number(active.marks?.[target] || 0) >= 3).length;
  const accent = GOLD;
  return <div data-cricket-master-stage="shove-layout-v1" style={{ display:'grid',gap:9,width:'100%',minWidth:0 }}>
    <ShoveActivePlayerCard
      profile={profileById.get(String(active.id)) || active}
      name={active.name}
      closedCases={closed}
      totalCases={targets.length}
      ruleSet="electronic"
      round={round}
      maxRounds={maxRounds}
      darts={Array.from({ length: dartsThrown }, () => ({ v: 0, mult: 1 as const }))}
      accent={accent}
      onObjective={onObjective}
      objectiveTitle={`${targets.length} CIBLES`}
      objectiveSubtitle="3 IMPACTS"
    />
    {/* SHOVE-like bottom navigation: functional objective and actions. */}
    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:7}}>
      <button type="button" onClick={onObjective} style={{border:'1px solid #ffc04c55',background:'#101521',borderRadius:13,padding:'11px 6px',fontWeight:900,color:accent,fontSize:12,cursor:'pointer'}}>◎ OBJECTIFS / RÈGLES</button>
      <button type="button" onClick={onActions} style={{border:'1px solid #ffc04c55',background:'#101521',borderRadius:13,padding:'11px 6px',fontWeight:900,color:accent,fontSize:12,cursor:'pointer'}}>↺ ACTIONS / RÉSUMÉ</button>
    </div>
    {/* SHOVE marks dashboard: fixed target column, scrollable player columns, real Cricket marks. */}
    <section aria-label={`Tableau des marques ${gameLabel}`} style={{border:`1px solid ${accent}62`,borderRadius:16,background:'#101521',padding:8,minWidth:0}}>
      <div style={{color:accent,textAlign:'center',letterSpacing:.9,fontSize:13,fontWeight:1000,marginBottom:8}}>TABLEAU DES MARQUES</div>
      <div style={{maxWidth:'100%',overflowX:'auto',overflowY:'hidden',WebkitOverflowScrolling:'touch',borderRadius:10,border:'1px solid #ffffff19'}} tabIndex={0} aria-label="Faire défiler les joueurs horizontalement">
        <table style={{borderCollapse:'separate',borderSpacing:0,width:'max-content',minWidth:'100%'}}>
          <thead><tr><th scope="col" style={{position:'sticky',left:0,zIndex:5,minWidth:77,background:'#172031',color:accent,textAlign:'center',fontSize:11,padding:'8px 4px'}}>CIBLE</th>
            {players.map((p,i) => {
              const photo=avatarUrl(profileById.get(String(p.id)) || p);
              const tone = String(p.id) === activePlayerId ? accent : PLAYER_TONES[i % PLAYER_TONES.length];
              return <th scope="col" key={p.id} title={p.name} style={{minWidth:69,width:69,background:p.id===activePlayerId?`${accent}1f`:'#131927',borderBottom:`2px solid ${tone}`,padding:'6px 3px'}}>
                {photo?<img src={photo} alt={p.name} style={{width:34,height:34,objectFit:'cover',borderRadius:'50%',border:`2px solid ${tone}`}}/>:<span style={{width:34,height:34,border:`2px solid ${tone}`,borderRadius:'50%',display:'grid',placeItems:'center',fontSize:12,color:tone,margin:'auto'}}>{p.name.slice(0,2).toUpperCase()}</span>}
                <div style={{fontSize:10,fontWeight:900,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis',maxWidth:68}}>{p.name}</div>
                {withPoints && <small style={{fontSize:10,color:tone}}>{Number(p.score||0)} pts</small>}
              </th>;
            })}
          </tr></thead>
          <tbody>{targets.map(target => <tr key={target}>
            <th scope="row" style={{position:'sticky',left:0,zIndex:4,background:'#172031',color:COLORS[target]||accent,letterSpacing:target>=25?0:.7,fontWeight:1000,fontSize:target>=25?11:17,padding:'8px 4px',borderTop:'1px solid #ffffff12',textAlign:'center'}}>{TARGET_NAME[target]||target}</th>
            {players.map((p,i) => {
              const count = Math.max(0, Number(p.marks?.[target] || 0));
              const tone = COLORS[target] || (p.id===activePlayerId?accent:PLAYER_TONES[i % PLAYER_TONES.length]);
              return <td key={p.id} style={{background:count>=3?`${tone}1c`:'#0c1220',minWidth:69,width:69,height:40,borderTop:'1px solid #ffffff10',borderLeft:'1px solid #ffffff08',textAlign:'center',padding:2}}>
                {count ? <CricketMarkIcon marks={Math.min(count,3)} color={tone} size={31} glow={p.id===activePlayerId && count>=3} /> : <span style={{color:'#526078'}}>—</span>}
              </td>;
            })}
          </tr>)}</tbody>
        </table>
      </div>
      {players.length>4 && <div style={{color:'#abb4c7',textAlign:'center',fontSize:10,marginTop:7}}>Fais glisser horizontalement pour voir tous les joueurs.</div>}
    </section>
    {/* SHOVE strip of current player's validated marks. */}
    <section aria-label={`Progression de ${active.name}`} style={{border:`1px solid ${accent}42`,borderRadius:14,background:'#0c111c',padding:'8px 6px'}}>
      <div style={{color:accent,fontSize:10,fontWeight:950,letterSpacing:.7,marginBottom:6}}>MES MARQUES VALIDÉES</div>
      <div style={{display:'flex',overflowX:'auto',gap:5,WebkitOverflowScrolling:'touch',paddingBottom:2}}>
        {targets.map(target=>{
          const count = Math.max(0,Number(active.marks?.[target]||0));const tone=COLORS[target]||accent;
          return <div key={target} style={{flex:'0 0 53px',border:`1px solid ${count>=3?tone:'#ffffff1b'}`,borderRadius:9,padding:'5px 2px',textAlign:'center',background:count>=3?`${tone}1a`:'#101521'}}>
            <div style={{fontSize:target>=25?9:13,color:tone,fontWeight:1000}}>{TARGET_NAME[target]||target}</div>
            {count?<CricketMarkIcon marks={Math.min(count,3)} color={tone} size={25} glow={count>=3}/>:<div style={{height:25,color:'#526078',paddingTop:5}}>—</div>}
          </div>;
        })}
      </div>
    </section>
  </div>;
}
