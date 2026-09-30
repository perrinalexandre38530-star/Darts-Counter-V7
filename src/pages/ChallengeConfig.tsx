import React from 'react';
import BackDot from '../components/BackDot';
import PlayerPagedSelector from '../components/PlayerPagedSelector';
import { useTheme } from '../contexts/ThemeContext';
import { useAwenaOptional } from '../awena/AwenaProvider';
import { loadTeamsBySport, type TeamEntity } from '../lib/petanqueTeamsStore';
import type { Profile } from '../lib/types';

export type ChallengeTarget='1'|'2'|'3'|'4'|'5'|'6'|'7'|'8'|'9'|'10'|'11'|'12'|'13'|'14'|'15'|'16'|'17'|'18'|'19'|'20'|'bull25'|'bull50';
export type ChallengeRule='all'|'single'|'double'|'triple'|'bull25'|'bull50';
export type ChallengeMatchMode='solo'|'duo'|'duel'|'multi';
export type ChallengeParticipantSource='direct'|'team';
export type ChallengeConfigData={
  target:ChallengeTarget;
  visits:number;
  rule:ChallengeRule;
  playerIds:string[];
  teamIds:string[];
  participantMode:'players'|'teams';
  participantSource?:ChallengeParticipantSource;
  configMode:'guided'|'complete';
  matchMode?:ChallengeMatchMode;
};

type ConfigMode='guided'|'complete';
type MatchMode='solo'|'duo'|'multi';

const targetText=(target:ChallengeTarget)=>target==='bull25'?'BULL 25':target==='bull50'?'BULL 50':target;
const teamLogo=(team:any)=>team?.logoDataUrl||team?.logoUrl||team?.avatarUrl||team?.imageUrl||'';
const unique=(values:any[])=>Array.from(new Set((values||[]).map(String).filter(Boolean)));

export default function ChallengeConfig({go,profiles=[],activeProfileId=null}:{go:(tab:any,params?:any)=>void;profiles?:Profile[];activeProfileId?:string|null}){
 const theme=useTheme();
 const awena=useAwenaOptional();
 const primary='#ff4148';
 const [mode,setMode]=React.useState<ConfigMode>('guided');
 const [step,setStep]=React.useState(0);
 const [matchMode,setMatchMode]=React.useState<MatchMode|null>(null);
 const [participantSource,setParticipantSource]=React.useState<ChallengeParticipantSource>('direct');
 const [playerIds,setPlayerIds]=React.useState<string[]>(()=>activeProfileId?[String(activeProfileId)]:[]);
 const [teamIds,setTeamIds]=React.useState<string[]>([]);
 const [target,setTarget]=React.useState<ChallengeTarget>('20');
 const [visits,setVisits]=React.useState(30);
 const [rule,setRule]=React.useState<ChallengeRule>('all');
 const teams=React.useMemo<TeamEntity[]>(()=>{try{return loadTeamsBySport('darts')||[]}catch{return []}},[]);
 const rules:[ChallengeRule,string,string][]=[
  ['all','TOUS LES HITS','S = 1 • D = 2 • T = 3'],
  ['single','SEULEMENT SIMPLE','Seuls les simples comptent'],
  ['double','SEULEMENT DOUBLE','Seuls les doubles comptent'],
  ['triple','SEULEMENT TRIPLE','Seuls les triples comptent'],
  ['bull25','BULL 25','Bull extérieur uniquement'],
  ['bull50','BULL 50','Bull intérieur uniquement']
 ];

 const maxPlayers=matchMode==='solo'?1:matchMode==='duo'?2:Number.POSITIVE_INFINITY;
 const minPlayers=matchMode==='solo'?1:matchMode==='duo'?2:matchMode==='multi'?3:0;
 const exactPlayers=matchMode==='solo'||matchMode==='duo';
 const selectionValid=Boolean(matchMode)&&(exactPlayers?playerIds.length===minPlayers:playerIds.length>=minPlayers);
 const selectedTeams=React.useMemo(()=>teams.filter(team=>teamIds.includes(String(team.id))),[teams,teamIds]);
 const teamMemberIds=React.useMemo(()=>new Set(unique(selectedTeams.flatMap(team=>Array.isArray(team.playerIds)?team.playerIds:[]))),[selectedTeams]);
 const selectableProfiles=React.useMemo(()=>participantSource==='team'?profiles.filter(profile=>teamMemberIds.has(String(profile.id))):profiles,[participantSource,profiles,teamMemberIds]);

 const trimForMode=React.useCallback((ids:string[],next:MatchMode|null)=>{
  const values=unique(ids);
  if(next==='solo') return values.slice(0,1);
  if(next==='duo') return values.slice(0,2);
  return values;
 },[]);

 const chooseMatchMode=(next:MatchMode)=>{
  setMatchMode(next);
  setPlayerIds(prev=>trimForMode(prev,next));
  if(next==='solo'&&teamIds.length>1) setTeamIds(prev=>prev.slice(0,1));
 };

 const changeSource=(next:ChallengeParticipantSource)=>{
  setParticipantSource(next);
  if(next==='team'){
   setPlayerIds([]);
   if(matchMode==='solo'&&teamIds.length>1) setTeamIds(prev=>prev.slice(0,1));
  }
 };

 const toggleTeam=(idRaw:any)=>{
  if(!matchMode) return;
  const id=String(idRaw);
  let next:string[];
  if(matchMode==='solo') next=teamIds.includes(id)?[]:[id];
  else next=teamIds.includes(id)?teamIds.filter(x=>x!==id):[...teamIds,id];
  setTeamIds(next);
  const allowed=new Set(unique(teams.filter(team=>next.includes(String(team.id))).flatMap(team=>Array.isArray(team.playerIds)?team.playerIds:[])));
  setPlayerIds(prev=>trimForMode(prev.filter(pid=>allowed.has(String(pid))),matchMode));
 };

 const togglePlayer=(idRaw:any)=>{
  if(!matchMode) return;
  const id=String(idRaw);
  if(participantSource==='team'&&!teamMemberIds.has(id)) return;
  setPlayerIds(prev=>{
   if(prev.includes(id)) return prev.filter(x=>x!==id);
   if(maxPlayers===1) return [id];
   if(Number.isFinite(maxPlayers)&&prev.length>=maxPlayers) return prev;
   return [...prev,id];
  });
 };

 const participantMessage=!matchMode
  ? 'Choisissez d’abord SOLO, DUO ou MULTI.'
  : matchMode==='solo'
   ? `${playerIds.length}/1 joueur sélectionné`
   : matchMode==='duo'
    ? `${playerIds.length}/2 joueurs sélectionnés`
    : `${playerIds.length} joueur${playerIds.length>1?'s':''} sélectionné${playerIds.length>1?'s':''} • minimum 3`;

 const start=()=>{
  if(!matchMode||!selectionValid) return;
  go('challenge_play',{config:{
   target,visits,rule,
   playerIds,
   teamIds:participantSource==='team'?teamIds:[],
   participantMode:'players',
   participantSource,
   configMode:mode,
   matchMode
  } satisfies ChallengeConfigData});
 };

 const formatStage=<Section title="TYPE DE PARTIE" subtitle="Ce choix fixe immédiatement le nombre de joueurs autorisé." key="format">
  <div className="match-mode">
   <button type="button" className={matchMode==='solo'?'on':''} onClick={()=>chooseMatchMode('solo')}><b>SOLO</b><span>1 joueur exactement</span></button>
   <button type="button" className={matchMode==='duo'?'on':''} onClick={()=>chooseMatchMode('duo')}><b>DUO</b><span>2 joueurs exactement</span></button>
   <button type="button" className={matchMode==='multi'?'on':''} onClick={()=>chooseMatchMode('multi')}><b>MULTI</b><span>3 joueurs minimum</span></button>
  </div>
 </Section>;

 const playersStage=<Section title="JOUEURS" subtitle={matchMode?'Sélectionnez les joueurs directement ou passez d’abord par une équipe.':'Le format doit être choisi avant les participants.'} key="players">
  {!matchMode?<div className="locked-hint">CHOISISSEZ D’ABORD SOLO, DUO OU MULTI</div>:<>
   <div className="source-row">
    <button type="button" className={participantSource==='direct'?'on':''} onClick={()=>changeSource('direct')}><b>JOUEURS</b><span>Sélection directe</span></button>
    <button type="button" className={participantSource==='team'?'on':''} onClick={()=>changeSource('team')}><b>ÉQUIPE</b><span>Choisir l’équipe puis ses joueurs</span></button>
   </div>
   {participantSource==='team'&&<>
    <h3>1. CHOISISSEZ L’ÉQUIPE</h3>
    <div className="team-grid">
     {teams.length?teams.map(team=>{const logo=teamLogo(team);const members=Array.isArray(team.playerIds)?team.playerIds.length:0;return <button type="button" key={team.id} className={'team-choice '+(teamIds.includes(String(team.id))?'on':'')} onClick={()=>toggleTeam(team.id)}>{logo?<img src={logo} alt=""/>:<span className="team-fallback">{String(team.name||'E').slice(0,1)}</span>}<span className="team-copy"><b>{team.name||'Équipe'}</b><small>{members} joueur{members>1?'s':''}</small></span></button>}):<div className="hint">Aucune équipe Darts enregistrée.</div>}
    </div>
    <h3>2. CHOISISSEZ {matchMode==='solo'?'LE JOUEUR':matchMode==='duo'?'LES 2 JOUEURS':'AU MOINS 3 JOUEURS'}</h3>
    {!teamIds.length?<div className="locked-hint compact">Sélectionnez au moins une équipe pour afficher ses joueurs.</div>:selectableProfiles.length?<PlayerPagedSelector profiles={selectableProfiles} selectedIds={playerIds} onToggle={togglePlayer} accent={primary} usageMode="challenge" modalTitle="Joueurs du Challenge"/>:<div className="hint">Aucun profil joueur n’est associé aux équipes sélectionnées.</div>}
   </>}
   {participantSource==='direct'&&<PlayerPagedSelector profiles={profiles} selectedIds={playerIds} onToggle={togglePlayer} accent={primary} usageMode="challenge" modalTitle="Joueurs du Challenge"/>}
   <div className={'selection-status '+(selectionValid?'ok':'ko')}><span>{selectionValid?'✓':'!'}</span><b>{participantMessage}</b>{matchMode==='duo'&&playerIds.length>=2?<small>Maximum atteint : désélectionnez un joueur pour le remplacer.</small>:null}</div>
  </>}
 </Section>;

 const targetStage=<Section title="CIBLE" subtitle="Choisissez le secteur à travailler." key="target"><div className="target-grid">{[...Array.from({length:20},(_,i)=>String(i+1)),'bull25','bull50'].map(x=><button type="button" key={x} className={'target-btn '+(target===x?'on':'')} onClick={()=>setTarget(x as ChallengeTarget)}>{x==='bull25'?'BULL 25':x==='bull50'?'BULL 50':x}</button>)}</div></Section>;
 const visitsStage=<Section title="NOMBRE DE TOURS" subtitle="Chaque tour comprend jusqu’à 3 fléchettes par joueur." key="visits"><div className="visit-grid">{[5,10,15,20,30,50,100].map(n=><button type="button" key={n} className={'arcade-choice '+(visits===n?'on':'')} onClick={()=>setVisits(n)}>{n}</button>)}</div><div className="hint">{visits} tours • {visits*3} fléchettes maximum par joueur</div></Section>;
 const ruleStage=<Section title="OBJECTIF" subtitle="Déterminez quels impacts rapportent des points." key="rule"><div className="rule-grid">{rules.map(([id,label,detail])=><button type="button" key={id} className={'rule-btn '+(rule===id?'on':'')} onClick={()=>setRule(id)}><b>{label}</b><span>{detail}</span></button>)}</div></Section>;
 const stages=[formatStage,playersStage,targetStage,visitsStage,ruleStage];
 const stepLabels=['FORMAT','JOUEURS','CIBLE','TOURS','OBJECTIF'];
 const currentStepValid=step===0?Boolean(matchMode):step===1?selectionValid:true;
 const shown=mode==='complete'?stages:[stages[step]];

 return <div className={`challenge-config msc-mode-config ${mode==='guided'?'msc-mode-config--guided':'msc-mode-config--split'}`} style={{background:theme.bg,color:theme.text}}>
  <header className="challenge-head msc-mode-config-header">
   <img src="/challenge/ticker_challenge.png" alt="Challenge"/>
   <div className="challenge-back"><BackDot onClick={()=>go('games')} size={44} color="#36e9ff" glow="#36e9ff77"/></div>
   <button className="challenge-awena" type="button" aria-label="Ouvrir Awena" title="Awena" onClick={()=>awena?.openPanel?.()}><span><img src="/awena/awena-avatar.webp" alt="Awena"/></span><i aria-hidden>🎙</i></button>
  </header>
  <main className="config-wrap msc-mode-config-body">
   <section className="config-overview">
    <div className="overview-copy"><small>CONFIGURATION CHALLENGE</small><div className="mode-row"><button type="button" className={mode==='guided'?'on':''} onClick={()=>{setMode('guided');setStep(0)}}>GUIDÉE</button><button type="button" className={mode==='complete'?'on':''} onClick={()=>setMode('complete')}>COMPLÈTE</button></div><p>{mode==='guided'?'Configuration compacte, étape par étape, dans le même esprit que X01.':'Tous les réglages sont accessibles sur une seule page.'}</p></div>
    <div className="summary"><b>{matchMode?matchMode.toUpperCase():'—'}</b><span>OBJECTIF {targetText(target)}</span><span>{visits} TOURS</span><span>{rules.find(r=>r[0]===rule)?.[1]}</span></div>
   </section>
   {mode==='guided'&&<section className="progress-card"><div><strong>CONFIGURATION GUIDÉE</strong><span>Étape {step+1}/{stages.length} • {stepLabels[step]}</span></div><div className="steps">{stepLabels.map((label,i)=><button type="button" onClick={()=>setStep(i)} className={i===step?'on':i<step?'done':''} key={label}><b>{i+1}</b><span>{label}</span></button>)}</div></section>}
   <div className={mode==='complete'?'complete-grid':'guided-stage'}>{shown}</div>
   <div className="config-actions">
    {mode==='guided'&&step>0&&<button type="button" onClick={()=>setStep(s=>s-1)}>← PRÉCÉDENT</button>}
    {mode==='guided'&&step<stages.length-1?<button type="button" className="launch" disabled={!currentStepValid} onClick={()=>currentStepValid&&setStep(s=>s+1)}>SUIVANT →</button>:<button type="button" className="launch" disabled={!selectionValid} onClick={start}>▶ LANCER LE CHALLENGE</button>}
   </div>
  </main>
  <style>{css(primary)}</style>
 </div>;
}

function Section({title,subtitle,children}:{title:string;subtitle?:string;children:any}){return <section className="config-card"><div className="section-title"><h2>{title}</h2>{subtitle?<p>{subtitle}</p>:null}</div>{children}</section>}

const css=(p:string)=>`
.challenge-config{min-height:100dvh;padding:0 0 88px;overflow-x:hidden;background:radial-gradient(circle at 50% -8%,#321015 0,transparent 36%),linear-gradient(180deg,#070a10,#030507)!important;box-sizing:border-box}
.challenge-head{height:clamp(76px,10vw,96px);max-width:1180px;margin:0 auto 8px;position:relative;overflow:hidden;border:1px solid #485668;border-top:0;border-radius:0 0 18px 18px;background:#06090e;box-shadow:0 12px 32px #0009,inset 0 0 26px #000}.challenge-head>img{width:100%;height:100%;display:block;object-fit:cover;object-position:center;filter:saturate(1.04) contrast(1.03)}.challenge-head:after{content:'';position:absolute;inset:0;background:linear-gradient(90deg,#02050a88 0,transparent 20%,transparent 80%,#02050a88 100%);pointer-events:none}.challenge-back{position:absolute;z-index:3;left:12px;top:50%;transform:translateY(-50%)}
.challenge-awena{position:absolute;z-index:3;right:12px;top:50%;transform:translateY(-50%);width:48px;height:48px;border-radius:50%;padding:3px;border:0;background:conic-gradient(#3dff96,#33d8ff,#ff4cc8,#3dff96);box-shadow:0 0 16px rgba(51,216,255,.34),0 8px 22px rgba(0,0,0,.42);cursor:pointer}.challenge-awena>span{width:100%;height:100%;border-radius:50%;overflow:hidden;display:block;background:#060815}.challenge-awena img{width:100%;height:100%;object-fit:cover;display:block}.challenge-awena i{position:absolute;right:-2px;bottom:-2px;width:19px;height:19px;border-radius:50%;display:grid;place-items:center;background:#11172a;border:1px solid rgba(255,255,255,.18);color:#fff;font-size:10px;font-style:normal;box-shadow:0 4px 10px rgba(0,0,0,.45)}
.config-wrap{max-width:1040px;margin:auto;padding:8px 12px 14px}.config-overview,.progress-card,.config-card{background:linear-gradient(155deg,rgba(11,17,26,.97),rgba(6,9,15,.97));border:1px solid #465467;border-radius:18px;box-shadow:inset 0 0 24px #0008,0 14px 34px #0008}.config-overview{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:12px;padding:12px;margin-bottom:10px;border-top:2px solid #b6202a}.overview-copy{min-width:0}.config-overview small{color:${p};font-size:11px;font-weight:950;letter-spacing:1px}.config-overview p,.hint{margin:7px 0 0;color:#9eabba;font-size:11px;line-height:1.35}.mode-row{display:flex;gap:7px;margin-top:8px;flex-wrap:wrap}.mode-row button,.arcade-choice,.target-btn,.rule-btn,.config-actions button{border:1px solid #5a6678;background:linear-gradient(180deg,#121a27,#080c13);color:#fff;border-radius:11px;padding:9px 13px;font-size:11px;font-weight:950;box-shadow:inset 0 0 12px #0008;cursor:pointer}.mode-row button.on,.arcade-choice.on,.target-btn.on,.rule-btn.on{border-color:${p};background:linear-gradient(180deg,#541219,#180a0d);box-shadow:inset 0 0 18px #ff273322,0 0 14px #ff273322}.summary{min-width:185px;display:flex;flex-direction:column;justify-content:center;text-align:right;padding:5px 0 5px 14px;border-left:1px solid #354151}.summary b{font-size:24px;color:#ff4a50;line-height:1.05}.summary span{font-size:10px;font-weight:850;color:#c2cad6;margin-top:3px}
.progress-card{padding:10px 12px;margin-bottom:10px;display:grid;grid-template-columns:auto minmax(0,1fr);gap:14px;align-items:center}.progress-card>div:first-child{min-width:155px}.progress-card strong{display:block;color:${p};font-size:11px;letter-spacing:.8px}.progress-card>div:first-child span{display:block;margin-top:3px;color:#939fb0;font-size:10px}.steps{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:5px}.steps button{min-width:0;height:34px;border-radius:999px;border:1px solid #2d3949;background:#0a1018;color:#778396;display:flex;align-items:center;justify-content:center;gap:5px;cursor:pointer}.steps button b{font-size:10px}.steps button span{font-size:7px;font-weight:900}.steps button.on{color:#fff;border-color:${p};background:#3a1116;box-shadow:0 0 14px #ff283344}.steps button.done{color:${p};border-color:#783039}
.guided-stage{display:block}.complete-grid{display:grid;grid-template-columns:1fr;gap:10px}.config-card{padding:12px;margin-bottom:10px}.complete-grid .config-card{margin-bottom:0}.section-title{display:flex;align-items:flex-end;justify-content:space-between;gap:14px;margin-bottom:10px;padding-bottom:8px;border-bottom:1px solid #273342}.section-title h2{margin:0;font-size:14px;letter-spacing:.8px;color:#fff}.section-title p{margin:0;max-width:62%;font-size:9.5px;color:#909cad;text-align:right;line-height:1.3}.config-card h3{font-size:9px;color:#9eabba;letter-spacing:1px;margin:11px 0 6px}
.match-mode{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}.match-mode button{min-height:72px;border:1px solid #586576;background:linear-gradient(180deg,#121a27,#080c13);color:#fff;border-radius:13px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:5px;cursor:pointer;box-shadow:inset 0 0 14px #0008}.match-mode button b{font-size:17px;letter-spacing:1.2px}.match-mode button span{font-size:9px;color:#96a2b3}.match-mode button.on{border-color:#ff3c45;background:linear-gradient(180deg,#5b131a,#19090c);box-shadow:inset 0 0 18px #ff273322,0 0 16px #ff273333}.match-mode button.on b{color:#ff5258}
.source-row{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin-bottom:8px}.source-row button{min-height:52px;border:1px solid #4e5c6e;background:#0a1018;color:#fff;border-radius:12px;padding:8px 10px;text-align:left;cursor:pointer}.source-row button b{display:block;font-size:11px}.source-row button span{display:block;margin-top:2px;font-size:8.5px;color:#94a0b0}.source-row button.on{border-color:${p};background:linear-gradient(180deg,#481218,#16090c);box-shadow:0 0 14px #ff273322}.locked-hint{min-height:64px;border:1px dashed #526074;border-radius:12px;display:grid;place-items:center;padding:12px;color:#a7b2c0;font-size:10px;font-weight:900;text-align:center;background:#080d14}.locked-hint.compact{min-height:46px}
.team-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:7px}.team-choice{min-width:0;min-height:56px;border:1px solid #465466;border-radius:12px;background:linear-gradient(180deg,#101722,#080c12);color:#fff;display:grid;grid-template-columns:40px minmax(0,1fr);gap:8px;align-items:center;padding:6px;text-align:left;cursor:pointer}.team-choice.on{border-color:${p};background:linear-gradient(180deg,#451217,#16090c);box-shadow:0 0 14px #ff273322}.team-choice>img,.team-fallback{width:40px;height:40px;border-radius:50%;object-fit:cover;display:grid;place-items:center;background:#111a26;border:1px solid #566477;font-weight:1000}.team-copy{min-width:0}.team-copy b{display:block;font-size:10px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.team-copy small{display:block;margin-top:2px;color:#929fae;font-size:8px}.selection-status{margin-top:9px;min-height:42px;border-radius:11px;padding:7px 10px;display:grid;grid-template-columns:24px minmax(0,1fr);align-items:center;gap:8px;border:1px solid #4f5d6f;background:#090f17}.selection-status>span{width:24px;height:24px;border-radius:50%;display:grid;place-items:center;font-weight:1000}.selection-status b{font-size:10px}.selection-status small{grid-column:2;color:#8f9cac;font-size:8px}.selection-status.ok{border-color:#2bbd664f}.selection-status.ok>span{background:#123b22;color:#58ee86}.selection-status.ko{border-color:#d43a4555}.selection-status.ko>span{background:#3c1116;color:#ff5d65}
.target-grid{display:grid;grid-template-columns:repeat(11,minmax(0,1fr));gap:5px}.target-btn{padding:9px 3px;font-size:11px;min-height:38px}.target-btn.on{color:#ff555c}.visit-grid{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:7px}.arcade-choice{min-height:42px;font-size:13px}.rule-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:7px}.rule-btn{min-height:58px;text-align:left;display:flex;flex-direction:column;justify-content:center;padding:9px 10px}.rule-btn b{font-size:10px}.rule-btn span{font-size:8.5px;color:#98a5b6;margin-top:3px}.rule-btn.on b{color:#ff555b}
.config-actions{position:sticky;bottom:calc(82px + env(safe-area-inset-bottom,0px));z-index:8;display:flex;justify-content:flex-end;gap:8px;margin-top:6px;padding:7px;border-radius:14px;background:linear-gradient(180deg,#06090eda,#040609f2);backdrop-filter:blur(10px);border:1px solid #293544}.config-actions button{min-height:42px}.config-actions .launch{min-width:220px;background:linear-gradient(180deg,#2be15e,#07852e);border-color:#69ff8d;box-shadow:inset 0 0 14px #aaffb433,0 0 22px #23e75c44;font-size:12px}.config-actions button:disabled{opacity:.38;filter:grayscale(.6);cursor:not-allowed;box-shadow:none}
@media(orientation:landscape) and (min-width:900px){.config-wrap{max-width:1180px;padding:8px 14px 16px}.challenge-head{max-width:1180px;height:82px}.complete-grid{grid-template-columns:repeat(2,minmax(0,1fr));align-items:start}.complete-grid .config-card:nth-child(1),.complete-grid .config-card:nth-child(2){grid-column:1/-1}.target-grid{grid-template-columns:repeat(11,minmax(0,1fr))}.rule-grid{grid-template-columns:repeat(3,minmax(0,1fr))}}
@media(max-width:760px){.challenge-head{height:72px;margin-bottom:5px;border-radius:0 0 14px 14px}.challenge-head>img{object-fit:cover}.challenge-back{left:7px;transform:translateY(-50%) scale(.92)}.challenge-awena{right:7px;width:44px;height:44px}.config-wrap{padding:6px 8px 12px}.config-overview{grid-template-columns:1fr auto;padding:10px}.config-overview p{font-size:9px}.summary{min-width:118px;padding-left:9px}.summary b{font-size:17px}.summary span{font-size:7.5px}.progress-card{grid-template-columns:1fr;padding:9px;gap:7px}.progress-card>div:first-child{min-width:0}.steps button{height:30px}.steps button span{display:none}.config-card{padding:10px}.section-title{align-items:flex-start;flex-direction:column;gap:3px}.section-title p{max-width:100%;text-align:left;font-size:8.5px}.match-mode{gap:5px}.match-mode button{min-height:60px}.match-mode button b{font-size:14px}.match-mode button span{font-size:7.5px}.team-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.target-grid{grid-template-columns:repeat(5,minmax(0,1fr))}.visit-grid{grid-template-columns:repeat(4,minmax(0,1fr))}.rule-grid{grid-template-columns:1fr 1fr}.config-actions{bottom:calc(74px + env(safe-area-inset-bottom,0px));padding:5px}.config-actions button{flex:1;min-width:0!important;padding:9px 8px;font-size:10px!important}}
@media(max-width:430px){.summary{display:none}.config-overview{grid-template-columns:1fr}.source-row{grid-template-columns:1fr 1fr}.team-grid{grid-template-columns:1fr 1fr}.rule-grid{grid-template-columns:1fr}.match-mode button span{max-width:90px;text-align:center}.target-grid{grid-template-columns:repeat(5,minmax(0,1fr))}}
`;
