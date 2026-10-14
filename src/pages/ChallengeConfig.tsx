import React from 'react';
import BackDot from '../components/BackDot';
import PlayerPagedSelector from '../components/PlayerPagedSelector';
import ProfileAvatar from '../components/ProfileAvatar';
import { useTheme } from '../contexts/ThemeContext';
import { useAwenaOptional } from '../awena/AwenaProvider';
import { loadTeamsBySport, resolveTeamLogo, type TeamEntity } from '../lib/petanqueTeamsStore';
import { resolveTeamLogoSrc } from '../assets/teamLogoLibrary';
import type { Profile } from '../lib/types';
import { getChallengeObjectiveImage } from '../lib/challengeObjectiveVisuals';
import { recordProfileUsageForMode } from '../lib/profileUsage';
import { DEFAULT_CUSTOM_SEQUENCE, DEFAULT_HALF_IT_SEQUENCE, exerciseTitle, objectiveLabel, type ChallengeExerciseType, type ChallengeObjectiveToken, type ChallengeScoreMode } from '../lib/challengeExercises';

export type ChallengeTarget='1'|'2'|'3'|'4'|'5'|'6'|'7'|'8'|'9'|'10'|'11'|'12'|'13'|'14'|'15'|'16'|'17'|'18'|'19'|'20'|'bull'|'bull25'|'bull50'|'any-double'|'any-triple';
export type ChallengeRule='all'|'single'|'double'|'triple'|'bull'|'bull25'|'bull50';
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
  soundsEnabled?:boolean;
  exerciseType?:ChallengeExerciseType;
  clockIncludeBull?:boolean;
  clockScoreMode?:ChallengeScoreMode;
  halfItStartScore?:number;
  sequenceObjectives?:ChallengeObjectiveToken[];
  sequenceScoreMode?:ChallengeScoreMode;
  groupingMin?:number;
  groupingMax?:number;
  groupingHits?:2|3;
};

type ConfigMode='guided'|'complete';
type MatchMode='solo'|'duo'|'multi';
type TeamSelections=Record<string,string[]>;
type ChallengePreset={
 target:ChallengeTarget;
 visits:number;
 rule:ChallengeRule;
 configMode:ConfigMode;
 matchMode:MatchMode|null;
 participantSource:ChallengeParticipantSource;
 soundsEnabled:boolean;
 exerciseType:ChallengeExerciseType;
 clockIncludeBull:boolean;
 clockScoreMode:ChallengeScoreMode;
 halfItStartScore:number;
 sequenceObjectives:ChallengeObjectiveToken[];
 sequenceScoreMode:ChallengeScoreMode;
 groupingMin:number;
 groupingMax:number;
 groupingHits:2|3;
};

const CHALLENGE_DRAFT_KEY='dc_challenge_config_draft_v2';
const CHALLENGE_LAST_PLAYED_KEY='dc_challenge_last_played_v2';
const CHALLENGE_FAVORITE_KEY='dc_challenge_favorite_v2';

const targetText=(target:ChallengeTarget)=>target==='any-double'?'DOUBLES':target==='any-triple'?'TRIPLES':(target==='bull'||target==='bull25'||target==='bull50')?'BULL':target;
const teamLogo=(team:any)=>team?.logoDataUrl||resolveTeamLogoSrc(team?.logoLibraryId||team?.logoLibraryFileName||null)||team?.logoUrl||team?.avatarUrl||team?.imageUrl||'';
const unique=(values:any[])=>Array.from(new Set((values||[]).map(String).filter(Boolean)));
const readChallengePreset=(key:string):ChallengePreset|null=>{try{const raw=localStorage.getItem(key);if(!raw)return null;const parsed=JSON.parse(raw);return parsed&&typeof parsed==='object'?parsed as ChallengePreset:null}catch{return null}};
const writeChallengePreset=(key:string,preset:ChallengePreset)=>{try{localStorage.setItem(key,JSON.stringify(preset))}catch{}};
const presetDescriptor=(preset:ChallengePreset|null)=>{
 if(!preset)return '';
 const type=preset.exerciseType||'classic';
 if(type==='classic')return `${targetText(preset.target||'20')} · ${preset.visits||30} TOURS`;
 if(type==='clock')return `${preset.clockIncludeBull?'1 → 20 + BULL':'1 → 20'} · ${preset.clockScoreMode==='real'?'VALEUR RÉELLE':'S1 / D2 / T3'}`;
 if(type==='half-it')return `HALF-IT · DÉPART ${preset.halfItStartScore||40}`;
 if(type==='sequence')return `SÉQUENCE · ${Math.max(1,preset.sequenceObjectives?.length||0)} OBJECTIFS`;
 return `GROUPEMENT ${Math.min(preset.groupingMin||15,preset.groupingMax||20)}–${Math.max(preset.groupingMin||15,preset.groupingMax||20)} · ×${preset.groupingHits||2}`;
};

function TeamLogoView({team,className='',alt=''}:{team:any;className?:string;alt?:string}){
 const direct=teamLogo(team);
 const [src,setSrc]=React.useState(direct);
 React.useEffect(()=>{let alive=true;setSrc(direct);if(!team?.id)return()=>{alive=false};void resolveTeamLogo(team,true).then(v=>{if(alive&&v)setSrc(v)}).catch(()=>{});return()=>{alive=false}},[team?.id,team?.logoMediaKey,team?.logoLibraryId,team?.logoLibraryFileName,direct]);
 if(!src) return null;
 return <img className={className} src={src} alt={alt||team?.name||''} onError={()=>{const fallback=resolveTeamLogoSrc(team?.logoLibraryId||team?.logoLibraryFileName||null)||'';if(fallback&&fallback!==src)setSrc(fallback)}}/>;
}

export default function ChallengeConfig({go,profiles=[],activeProfileId=null}:{go:(tab:any,params?:any)=>void;profiles?:Profile[];activeProfileId?:string|null}){
 const theme=useTheme();
 const awena=useAwenaOptional();
 const primary='#ff4148';
 const [mode,setMode]=React.useState<ConfigMode>('guided');
 const [step,setStep]=React.useState(0);
 const [matchMode,setMatchMode]=React.useState<MatchMode|null>(null);
 const [participantSource,setParticipantSource]=React.useState<ChallengeParticipantSource>('direct');
 const [directPlayerIds,setDirectPlayerIds]=React.useState<string[]>(()=>activeProfileId?[String(activeProfileId)]:[]);
 const [teamSelections,setTeamSelections]=React.useState<TeamSelections>({});
 const [teamPicker,setTeamPicker]=React.useState<TeamEntity|null>(null);
 const [teamPickerPlayerIds,setTeamPickerPlayerIds]=React.useState<string[]>([]);
 const [target,setTarget]=React.useState<ChallengeTarget>('20');
 const [visits,setVisits]=React.useState(30);
 const [rule,setRule]=React.useState<ChallengeRule>('all');
 const [exerciseType,setExerciseType]=React.useState<ChallengeExerciseType>('classic');
 const [clockIncludeBull,setClockIncludeBull]=React.useState(true);
 const [clockScoreMode,setClockScoreMode]=React.useState<ChallengeScoreMode>('challenge');
 const [halfItStartScore,setHalfItStartScore]=React.useState(40);
 const [sequenceObjectives,setSequenceObjectives]=React.useState<ChallengeObjectiveToken[]>([...DEFAULT_CUSTOM_SEQUENCE]);
 const [sequenceScoreMode,setSequenceScoreMode]=React.useState<ChallengeScoreMode>('real');
 const [sequencePicker,setSequencePicker]=React.useState<ChallengeObjectiveToken>('20');
 const [groupingMin,setGroupingMin]=React.useState(15);
 const [groupingMax,setGroupingMax]=React.useState(20);
 const [groupingHits,setGroupingHits]=React.useState<2|3>(2);
 const [soundsEnabled,setSoundsEnabled]=React.useState<boolean>(()=>{try{return localStorage.getItem('dc_challenge_sounds_v1')!=='0'}catch{return true}});
 const [lastPlayedPreset,setLastPlayedPreset]=React.useState<ChallengePreset|null>(()=>readChallengePreset(CHALLENGE_LAST_PLAYED_KEY));
 const [favoritePreset,setFavoritePreset]=React.useState<ChallengePreset|null>(()=>readChallengePreset(CHALLENGE_FAVORITE_KEY));
 const [presetHydrated,setPresetHydrated]=React.useState(false);
 const familyMode=target==='any-double'||target==='any-triple';
 const teams=React.useMemo<TeamEntity[]>(()=>{try{return loadTeamsBySport('darts')||[]}catch{return []}},[]);
 const profileById=React.useMemo(()=>new Map((profiles||[]).map((profile:any)=>[String(profile.id),profile])),[profiles]);
 const rules:[ChallengeRule,string,string][]=[
  ['all','TOUS LES HITS','S = 1 • D = 2 • T = 3'],
  ['single','SEULEMENT SIMPLE','Seuls les simples comptent'],
  ['double','SEULEMENT DOUBLE','Seuls les doubles comptent'],
  ['triple','SEULEMENT TRIPLE','Seuls les triples comptent']
 ];

 const applyPreset=React.useCallback((preset:ChallengePreset|null,opts?:{jumpToPlayers?:boolean;resetPlayers?:boolean})=>{
  if(!preset)return;
  const nextMatch=preset.matchMode==='duo'||preset.matchMode==='multi'||preset.matchMode==='solo'?preset.matchMode:null;
  setTarget((preset.target||'20') as ChallengeTarget);
  setVisits(Math.max(1,Number(preset.visits||30)));
  setRule((preset.rule||'all') as ChallengeRule);
  setExerciseType((preset.exerciseType||'classic') as ChallengeExerciseType);
  setClockIncludeBull(preset.clockIncludeBull!==false);
  setClockScoreMode((preset.clockScoreMode||'challenge') as ChallengeScoreMode);
  setHalfItStartScore(Math.max(0,Number(preset.halfItStartScore??40)||40));
  setSequenceObjectives(Array.isArray(preset.sequenceObjectives)&&preset.sequenceObjectives.length?[...preset.sequenceObjectives]:[...DEFAULT_CUSTOM_SEQUENCE]);
  setSequenceScoreMode((preset.sequenceScoreMode||'real') as ChallengeScoreMode);
  setGroupingMin(Math.max(1,Math.min(20,Number(preset.groupingMin||15))));
  setGroupingMax(Math.max(1,Math.min(20,Number(preset.groupingMax||20))));
  setGroupingHits(preset.groupingHits===3?3:2);
  setSoundsEnabled(preset.soundsEnabled!==false);
  setMatchMode(nextMatch);
  setParticipantSource(preset.participantSource==='team'?'team':'direct');
  setMode(opts?.jumpToPlayers?'guided':preset.configMode==='complete'?'complete':'guided');
  if(opts?.resetPlayers){setDirectPlayerIds([]);setTeamSelections({});setTeamPicker(null);setTeamPickerPlayerIds([])}
  if(opts?.jumpToPlayers)setStep(nextMatch?1:0);
 },[]);

 React.useEffect(()=>{
  const draft=readChallengePreset(CHALLENGE_DRAFT_KEY);
  if(draft)applyPreset(draft,{jumpToPlayers:false,resetPlayers:false});
  setPresetHydrated(true);
 },[applyPreset]);

 React.useEffect(()=>{
  if(target==='bull'||target==='bull25'||target==='bull50'){ if(target!=='bull') setTarget('bull'); if(rule!=='bull') setRule('bull'); return; }
  if(target==='any-double'){ if(rule!=='double') setRule('double'); return; }
  if(target==='any-triple'){ if(rule!=='triple') setRule('triple'); return; }
  if(rule==='bull'||rule==='bull25'||rule==='bull50') setRule('all');
 },[target,rule]);

 const currentPreset=React.useMemo<ChallengePreset>(()=>({
  target,visits,rule,configMode:mode,matchMode,participantSource,soundsEnabled,exerciseType,
  clockIncludeBull,clockScoreMode,halfItStartScore,sequenceObjectives:[...sequenceObjectives],sequenceScoreMode,
  groupingMin,groupingMax,groupingHits
 }),[target,visits,rule,mode,matchMode,participantSource,soundsEnabled,exerciseType,clockIncludeBull,clockScoreMode,halfItStartScore,sequenceObjectives,sequenceScoreMode,groupingMin,groupingMax,groupingHits]);

 React.useEffect(()=>{if(presetHydrated)writeChallengePreset(CHALLENGE_DRAFT_KEY,currentPreset)},[presetHydrated,currentPreset]);

 const maxPlayers=matchMode==='solo'?1:matchMode==='duo'?2:Number.POSITIVE_INFINITY;
 const minPlayers=matchMode==='solo'?1:matchMode==='duo'?2:matchMode==='multi'?3:0;
 const teamIds=React.useMemo(()=>Object.entries(teamSelections).filter(([,ids])=>Array.isArray(ids)&&ids.length>0).map(([id])=>id),[teamSelections]);
 const teamPlayerIds=React.useMemo(()=>unique(Object.values(teamSelections).flat()),[teamSelections]);
 const playerIds=participantSource==='team'?teamPlayerIds:unique(directPlayerIds);
 const exactPlayers=matchMode==='solo'||matchMode==='duo';
 const selectionValid=Boolean(matchMode)&&(exactPlayers?playerIds.length===minPlayers:playerIds.length>=minPlayers);

 const chooseMatchMode=(next:MatchMode)=>{
  setMatchMode(next);
  setDirectPlayerIds([]);
  setTeamSelections({});
  setTeamPicker(null);
  setTeamPickerPlayerIds([]);
 };

 const changeSource=(next:ChallengeParticipantSource)=>{
  setParticipantSource(next);
  setTeamPicker(null);
  setTeamPickerPlayerIds([]);
 };

 const toggleDirectPlayer=(idRaw:any)=>{
  if(!matchMode) return;
  const id=String(idRaw);
  setDirectPlayerIds(prev=>{
   if(prev.includes(id)) return prev.filter(x=>x!==id);
   if(maxPlayers===1) return [id];
   if(Number.isFinite(maxPlayers)&&prev.length>=maxPlayers) return prev;
   return [...prev,id];
  });
 };

 const openTeamPicker=(team:TeamEntity)=>{
  if(!matchMode) return;
  const id=String(team.id);
  setTeamPicker(team);
  setTeamPickerPlayerIds((teamSelections[id]||[]).map(String));
 };

 const removeTeamSelection=(idRaw:any)=>{
  const id=String(idRaw);
  setTeamSelections(prev=>{
   const next={...prev};
   delete next[id];
   return next;
  });
 };

 const pickerOtherIds=React.useMemo(()=>{
  if(!teamPicker||matchMode==='solo') return [];
  const tid=String(teamPicker.id);
  return unique(Object.entries(teamSelections).filter(([id])=>id!==tid).flatMap(([,ids])=>ids||[]));
 },[teamPicker,teamSelections,matchMode]);
 const pickerLimit=Number.isFinite(maxPlayers)?Math.max(0,maxPlayers-pickerOtherIds.length):Number.POSITIVE_INFINITY;

 const toggleTeamPickerPlayer=(idRaw:any)=>{
  const id=String(idRaw);
  setTeamPickerPlayerIds(prev=>{
   if(prev.includes(id)) return prev.filter(x=>x!==id);
   if(pickerLimit===1) return [id];
   if(Number.isFinite(pickerLimit)&&prev.length>=pickerLimit) return prev;
   return [...prev,id];
  });
 };

 const validateTeamPicker=()=>{
  if(!teamPicker||!teamPickerPlayerIds.length) return;
  const tid=String(teamPicker.id);
  const picked=unique(teamPickerPlayerIds);
  setTeamSelections(prev=>matchMode==='solo'?{[tid]:picked.slice(0,1)}:{...prev,[tid]:picked});
  setTeamPicker(null);
  setTeamPickerPlayerIds([]);
 };

 const participantMessage=!matchMode
  ? 'Choisissez d’abord SOLO, DUO ou MULTI.'
  : matchMode==='solo'
   ? `${playerIds.length}/1 joueur sélectionné`
   : matchMode==='duo'
    ? `${playerIds.length}/2 joueurs sélectionnés`
    : `${playerIds.length} joueur${playerIds.length>1?'s':''} sélectionné${playerIds.length>1?'s':''} • minimum 3`;

 const toggleChallengeSounds=(enabled:boolean)=>{setSoundsEnabled(enabled);try{localStorage.setItem('dc_challenge_sounds_v1',enabled?'1':'0')}catch{}};

 const resolvedSequence=exerciseType==='half-it'?[...DEFAULT_HALF_IT_SEQUENCE]:sequenceObjectives;
 const resolvedVisits=exerciseType==='clock'?(clockIncludeBull?21:20):(exerciseType==='half-it'||exerciseType==='sequence'?Math.max(1,resolvedSequence.length):visits);
 const resolvedTarget:ChallengeTarget=exerciseType==='classic'?target:exerciseType==='grouping'?String(Math.min(groupingMin,groupingMax)) as ChallengeTarget:(resolvedSequence[0]&&/^([1-9]|1[0-9]|20)$/.test(String(resolvedSequence[0]))?resolvedSequence[0] as ChallengeTarget:'20');
 const resolvedRule:ChallengeRule=exerciseType==='classic'?rule:'all';
 const exerciseValid=exerciseType!=='sequence'||sequenceObjectives.length>0;
 const exerciseSummary=exerciseType==='classic'?`OBJECTIF ${targetText(target)}`:exerciseTitle({target:resolvedTarget,rule:resolvedRule,visits:resolvedVisits,exerciseType});
 const exerciseRuleSummary=exerciseType==='classic'
  ? `${targetText(target)} · ${resolvedVisits} tours`
  : exerciseType==='clock'
   ? `${clockIncludeBull?'1 → 20 + BULL':'1 → 20'} · ${clockScoreMode==='real'?'valeur réelle':'S=1 · D=2 · T=3'}`
   : exerciseType==='half-it'
    ? `Départ ${halfItStartScore} · échec de volée = score ÷2`
    : exerciseType==='sequence'
     ? `${sequenceObjectives.length} objectifs · ${sequenceScoreMode==='real'?'valeur réelle':'S=1 · D=2 · T=3'}`
     : `${Math.min(groupingMin,groupingMax)}–${Math.max(groupingMin,groupingMax)} · ${groupingHits} fléchettes minimum sur le même secteur · ${visits} tours`;

 const chooseExercise=(next:ChallengeExerciseType)=>{
  setExerciseType(next);
  if(next==='clock'){setClockIncludeBull(true);setClockScoreMode('challenge');}
  if(next==='half-it'){setHalfItStartScore(40);}
  if(next==='sequence'&&!sequenceObjectives.length)setSequenceObjectives([...DEFAULT_CUSTOM_SEQUENCE]);
  if(next==='grouping'){setRule('all');}
 };

 const replayPreset=(preset:ChallengePreset|null)=>applyPreset(preset,{jumpToPlayers:true,resetPlayers:true});
 const saveFavorite=()=>{writeChallengePreset(CHALLENGE_FAVORITE_KEY,currentPreset);setFavoritePreset(currentPreset)};

 const start=()=>{
  if(!matchMode||!selectionValid||!exerciseValid) return;
  writeChallengePreset(CHALLENGE_LAST_PLAYED_KEY,currentPreset);
  setLastPlayedPreset(currentPreset);
  try{recordProfileUsageForMode('challenge',playerIds)}catch{}
  go('challenge_play',{config:{
   target:resolvedTarget,visits:resolvedVisits,rule:resolvedRule,
   exerciseType,
   clockIncludeBull,
   clockScoreMode,
   halfItStartScore,
   sequenceObjectives:resolvedSequence,
   sequenceScoreMode,
   groupingMin:Math.min(groupingMin,groupingMax),
   groupingMax:Math.max(groupingMin,groupingMax),
   groupingHits,
   playerIds,
   teamIds:participantSource==='team'?teamIds:[],
   participantMode:'players',
   participantSource,
   configMode:mode,
   matchMode,
   soundsEnabled
  } satisfies ChallengeConfigData});
 };

 const formatStage=<Section title="TYPE DE PARTIE" subtitle="Choisissez d’abord le format : il fixe immédiatement le nombre de joueurs autorisé." key="format">
  <div className="match-mode">
   <button type="button" className={matchMode==='solo'?'on':''} onClick={()=>chooseMatchMode('solo')}><b>SOLO</b><span>1 joueur exactement</span></button>
   <button type="button" className={matchMode==='duo'?'on':''} onClick={()=>chooseMatchMode('duo')}><b>DUO</b><span>2 joueurs exactement</span></button>
   <button type="button" className={matchMode==='multi'?'on':''} onClick={()=>chooseMatchMode('multi')}><b>MULTI</b><span>3 joueurs minimum</span></button>
  </div>
 </Section>;

 const playersStage=<Section title="JOUEURS" subtitle={matchMode?'Sélection directe ou choix équipe par équipe, comme dans X01.':'Le format doit être choisi avant les participants.'} key="players">
  {!matchMode?<div className="locked-hint">CHOISISSEZ D’ABORD SOLO, DUO OU MULTI</div>:<>
   <div className="source-row">
    <button type="button" className={participantSource==='direct'?'on':''} onClick={()=>changeSource('direct')}><b>JOUEURS</b><span>Sélection directe</span></button>
    <button type="button" className={participantSource==='team'?'on':''} onClick={()=>changeSource('team')}><b>ÉQUIPE</b><span>Équipe → joueurs</span></button>
   </div>

   {participantSource==='team'&&<>
    {teamIds.length>0&&<div className="selected-team-strip">
     {teamIds.map(id=>{const team=teams.find(t=>String(t.id)===id);const ids=teamSelections[id]||[];return <div className="selected-team-chip" key={id}><span className="selected-team-logo-slot"><span>{String(team?.name||'E').slice(0,1)}</span><TeamLogoView team={team} alt=""/></span><div><b>{team?.name||'Équipe'}</b><small>{ids.length} joueur{ids.length>1?'s':''}</small></div><button type="button" onClick={()=>removeTeamSelection(id)} aria-label="Retirer cette équipe">×</button></div>})}
    </div>}
    <h3>CHOISISSEZ UNE ÉQUIPE</h3>
    <div className="team-carousel" role="list">
     {teams.length?teams.map(team=>{const members=Array.isArray(team.playerIds)?team.playerIds.length:0;const selectedCount=(teamSelections[String(team.id)]||[]).length;return <button type="button" key={team.id} role="listitem" className={'team-choice '+(selectedCount?'on':'')} onClick={()=>openTeamPicker(team)}><span className="team-logo-slot"><span>{String(team.name||'E').slice(0,1)}</span><TeamLogoView team={team} alt=""/></span><span className="team-copy"><b>{team.name||'Équipe'}</b><small>{selectedCount?`${selectedCount} sélectionné${selectedCount>1?'s':''}`:`${members} joueur${members>1?'s':''}`}</small></span><em>CHOISIR</em></button>}):<div className="hint">Aucune équipe Darts enregistrée.</div>}
    </div>
    <div className="team-help">Touchez une équipe : la liste de ses joueurs s’ouvre en bloc flottant. Validez, puis ouvrez une autre équipe si nécessaire.</div>
   </>}

   {participantSource==='direct'&&<PlayerPagedSelector profiles={profiles} selectedIds={directPlayerIds} onToggle={toggleDirectPlayer} accent={primary} usageMode="challenge" modalTitle="Joueurs du Challenge"/>}
   <div className={'selection-status '+(selectionValid?'ok':'ko')}><span>{selectionValid?'✓':'!'}</span><b>{participantMessage}</b>{matchMode==='duo'&&playerIds.length>=2?<small>Maximum atteint : désélectionnez un joueur pour le remplacer.</small>:null}</div>
  </>}
 </Section>;

 const exerciseStage=<Section title="TYPE DE CHALLENGE" subtitle="Le moteur Challenge reste le même ; choisissez simplement l’exercice à jouer." key="exercise">
  <div className="exercise-grid">
   {([
    ['classic','CIBLE FIXE','Le Challenge actuel : secteur, Bull, Doubles ou Triples.','◎'],
    ['clock','HORLOGE 1 → 20','Un secteur différent à chaque volée, puis Bull en option.','↻'],
    ['half-it','HALF-IT','15 · 16 · Double · 17 · 18 · Triple · 19 · 20 · Bull.','½'],
    ['sequence','SÉQUENCE','Construisez votre propre suite d’objectifs tour par tour.','≡'],
    ['grouping','GROUPEMENT','Au moins 2 fléchettes dans le même secteur choisi.','◉'],
   ] as Array<[ChallengeExerciseType,string,string,string]>).map(([id,label,detail,icon])=><button type="button" key={id} className={'exercise-card '+(exerciseType===id?'on':'')} onClick={()=>chooseExercise(id)}><i>{icon}</i><span><b>{label}</b><small>{detail}</small></span></button>)}
  </div>
 </Section>;

 const targetStage=<Section title="CIBLE" subtitle="Choisissez un secteur précis ou un Challenge sur tous les doubles / triples." key="target"><div className="target-grid"><button type="button" className={'target-btn family '+(target==='any-double'?'on':'')} onClick={()=>{setTarget('any-double');setRule('double')}}><span className="target-thumb"><img src={getChallengeObjectiveImage('any-double')} alt=""/></span><b>DOUBLES</b></button><button type="button" className={'target-btn family '+(target==='any-triple'?'on':'')} onClick={()=>{setTarget('any-triple');setRule('triple')}}><span className="target-thumb"><img src={getChallengeObjectiveImage('any-triple')} alt=""/></span><b>TRIPLES</b></button>{[...Array.from({length:20},(_,i)=>String(i+1)),'bull'].map(x=><button type="button" key={x} className={'target-btn '+(target===x?'on':'')} onClick={()=>{setTarget(x as ChallengeTarget);if(x==='bull')setRule('bull')}}><span className="target-thumb"><img src={getChallengeObjectiveImage(x)} alt=""/></span><b>{x==='bull'?'BULL':x}</b></button>)}</div>{familyMode&&<div className="locked-hint">KEYPAD X01 DÉTAILLÉ · chaque D1–D20 / T1–T20 est enregistré · égalité départagée par la somme des numéros touchés.</div>}</Section>;
 const visitsStage=<Section title="NOMBRE DE TOURS" subtitle="Chaque tour comprend jusqu’à 3 fléchettes par joueur." key="visits"><div className="visit-grid">{[5,10,15,20,30,50,100].map(n=><button type="button" key={n} className={'arcade-choice '+(visits===n?'on':'')} onClick={()=>setVisits(n)}>{n}</button>)}</div><label className="custom-visits"><span>PERSONNALISÉ</span><input type="number" min={1} max={999} inputMode="numeric" value={visits} onChange={e=>setVisits(Math.max(1,Math.min(999,Number(e.target.value)||1)))}/><small>1 à 999 tours</small></label><div className="hint">{visits} tours • {visits*3} fléchettes maximum par joueur</div></Section>;
 const ruleStage=<Section title="OBJECTIF" subtitle="Déterminez quels impacts rapportent des points." key="rule">{target==='bull'?<div className="locked-hint"><b>BULL</b> · Bull 25 = 1 point · Bull 50 = 2 points · MISS = 0</div>:familyMode?<div className="locked-hint"><b>{target==='any-double'?'DOUBLES':'TRIPLES'}</b> · chaque touche valide rapporte 1 point, le numéro sert au départage.</div>:<div className="rule-grid">{rules.map(([id,label,detail])=><button type="button" key={id} className={'rule-btn '+(rule===id?'on':'')} onClick={()=>setRule(id)}><b>{label}</b><span>{detail}</span></button>)}</div>}</Section>;

 const clockStage=<Section title="HORLOGE 1 → 20" subtitle="Chaque volée avance automatiquement au secteur suivant." key="clock"><div className="advanced-grid"><div className="advanced-block"><h3>FIN DE PARCOURS</h3><div className="binary-row"><button type="button" className={clockIncludeBull?'on':''} onClick={()=>setClockIncludeBull(true)}>1 → 20 + BULL</button><button type="button" className={!clockIncludeBull?'on':''} onClick={()=>setClockIncludeBull(false)}>1 → 20</button></div></div><div className="advanced-block"><h3>CALCUL DES POINTS</h3><div className="binary-row"><button type="button" className={clockScoreMode==='challenge'?'on':''} onClick={()=>setClockScoreMode('challenge')}><b>CHALLENGE</b><small>S=1 · D=2 · T=3</small></button><button type="button" className={clockScoreMode==='real'?'on':''} onClick={()=>setClockScoreMode('real')}><b>VALEUR RÉELLE</b><small>S20=20 · D20=40 · T20=60</small></button></div></div></div><div className="locked-hint">{clockIncludeBull?'21':'20'} tours · l’objectif change automatiquement après chaque volée.</div></Section>;

 const halfItStage=<Section title="HALF-IT" subtitle="Le parcours de l’exercice est prêt à jouer ; seuls le score de départ et les joueurs restent à choisir." key="halfit"><div className="sequence-preview">{DEFAULT_HALF_IT_SEQUENCE.map((item,i)=><span key={`${item}-${i}`}><b>{i+1}</b>{objectiveLabel(item)}</span>)}</div><div className="advanced-block compact"><h3>SCORE DE DÉPART</h3><div className="visit-grid half-start">{[20,40,60,80,100].map(n=><button type="button" key={n} className={'arcade-choice '+(halfItStartScore===n?'on':'')} onClick={()=>setHalfItStartScore(n)}>{n}</button>)}</div></div><div className="locked-hint">À chaque tour : si aucune des 3 fléchettes ne valide l’objectif, le score est divisé par 2 et arrondi au supérieur. Les touches valides utilisent leur valeur réelle.</div></Section>;

 const sequenceStage=<Section title="SÉQUENCE PERSONNALISÉE" subtitle="Ajoutez les objectifs dans l’ordre où ils devront être joués." key="sequence"><div className="sequence-editor"><div className="sequence-preview editable">{sequenceObjectives.map((item,i)=><span key={`${item}-${i}`}><b>{i+1}</b>{objectiveLabel(item)}<button type="button" aria-label="Retirer" onClick={()=>setSequenceObjectives(prev=>prev.filter((_,index)=>index!==i))}>×</button></span>)}</div><div className="sequence-add"><select value={sequencePicker} onChange={e=>setSequencePicker(e.target.value as ChallengeObjectiveToken)}>{Array.from({length:20},(_,i)=>String(i+1)).map(x=><option key={x} value={x}>SECTEUR {x}</option>)}<option value="any-double">DOUBLE LIBRE</option><option value="any-triple">TRIPLE LIBRE</option><option value="bull">BULL</option></select><button type="button" onClick={()=>setSequenceObjectives(prev=>[...prev,sequencePicker])}>+ AJOUTER</button><button type="button" onClick={()=>setSequenceObjectives([...DEFAULT_CUSTOM_SEQUENCE])}>PRESET</button><button type="button" className="danger" onClick={()=>setSequenceObjectives([])}>VIDER</button></div></div><div className="advanced-block compact"><h3>CALCUL DES POINTS</h3><div className="binary-row"><button type="button" className={sequenceScoreMode==='real'?'on':''} onClick={()=>setSequenceScoreMode('real')}>VALEUR RÉELLE</button><button type="button" className={sequenceScoreMode==='challenge'?'on':''} onClick={()=>setSequenceScoreMode('challenge')}>S=1 · D=2 · T=3</button></div></div>{!sequenceObjectives.length&&<div className="selection-status ko"><span>!</span><b>Ajoutez au moins un objectif à la séquence.</b></div>}</Section>;

 const groupingStage=<Section title="GROUPEMENT" subtitle="Une volée ne marque que si le même secteur autorisé reçoit le nombre minimal de fléchettes." key="grouping"><div className="grouping-presets"><button type="button" onClick={()=>{setGroupingMin(15);setGroupingMax(20);setGroupingHits(2)}}>15–20 · ×2</button><button type="button" onClick={()=>{setGroupingMin(1);setGroupingMax(20);setGroupingHits(2)}}>1–20 · ×2</button><button type="button" onClick={()=>{setGroupingMin(15);setGroupingMax(20);setGroupingHits(3)}}>15–20 · ×3</button></div><div className="grouping-config"><div className="advanced-block"><h3>FOURCHETTE DE SECTEURS</h3><div className="range-select"><label>DE <select value={groupingMin} onChange={e=>setGroupingMin(Number(e.target.value))}>{Array.from({length:20},(_,i)=>i+1).map(n=><option key={n} value={n}>{n}</option>)}</select></label><span>→</span><label>À <select value={groupingMax} onChange={e=>setGroupingMax(Number(e.target.value))}>{Array.from({length:20},(_,i)=>i+1).map(n=><option key={n} value={n}>{n}</option>)}</select></label></div></div><div className="advanced-block"><h3>VALIDATION DE LA VOLÉE</h3><div className="binary-row"><button type="button" className={groupingHits===2?'on':''} onClick={()=>setGroupingHits(2)}><b>2 FLÉCHETTES</b><small>minimum dans le même secteur</small></button><button type="button" className={groupingHits===3?'on':''} onClick={()=>setGroupingHits(3)}><b>3 FLÉCHETTES</b><small>triplet obligatoire</small></button></div></div></div><div className="grouping-example"><b>EXEMPLE</b><span>D18 + S18 + T20 → <strong>54 pts</strong></span><small>Le D18 et le S18 valident le secteur 18. Le T20 isolé ne compte pas.</small></div></Section>;

 const audioStage=<Section title="SONS CHALLENGE" subtitle="Jingle d’intro, impacts S / D / T / MISS et musique de fin de partie." key="audio"><div className="audio-toggle-row"><button type="button" className={soundsEnabled?'on':''} onClick={()=>toggleChallengeSounds(true)}><b>SONS ON</b><span>Jingles et impacts activés</span></button><button type="button" className={!soundsEnabled?'on off':''} onClick={()=>toggleChallengeSounds(false)}><b>SONS OFF</b><span>Challenge totalement silencieux</span></button></div></Section>;

 const exerciseSettings=exerciseType==='classic'?[targetStage,visitsStage,ruleStage]:exerciseType==='clock'?[clockStage]:exerciseType==='half-it'?[halfItStage]:exerciseType==='sequence'?[sequenceStage]:[visitsStage,groupingStage];
 const stages=[formatStage,playersStage,exerciseStage,...exerciseSettings,audioStage];
 const stepLabels=['FORMAT','JOUEURS','EXERCICE',...(exerciseType==='classic'?['CIBLE','TOURS','OBJECTIF']:exerciseType==='clock'?['HORLOGE']:exerciseType==='half-it'?['HALF-IT']:exerciseType==='sequence'?['SÉQUENCE']:['TOURS','GROUPEMENT']),'SONS'];
 const currentStepValid=step===0?Boolean(matchMode):step===1?selectionValid:(exerciseType==='sequence'&&step===3?sequenceObjectives.length>0:true);
 React.useEffect(()=>{setStep(prev=>Math.min(prev,Math.max(0,stages.length-1)))},[exerciseType,stages.length]);
 const shown=mode==='complete'?stages:[stages[step]];
 const pickerMembers=teamPicker?(Array.isArray(teamPicker.playerIds)?teamPicker.playerIds.map(String):[]):[];

 return <div className="challenge-config" style={{background:theme.bg,color:theme.text}}>
  <header className="challenge-head">
   <img src="/challenge/ticker_challenge.png" alt="Challenge"/>
   <div className="challenge-back"><BackDot onClick={()=>go('games')} size={44} color="#36e9ff" glow="#36e9ff77"/></div>
   <button className="challenge-awena" type="button" aria-label="Ouvrir Awena" title="Awena" onClick={()=>awena?.openPanel?.()}><span><img src="/awena/awena-avatar.webp" alt="Awena"/></span><i aria-hidden>🎙</i></button>
  </header>
  <main className="config-wrap">
   <section className="config-overview">
    <div className="overview-copy"><small>CONFIGURATION CHALLENGE</small><div className="mode-row"><button type="button" className={mode==='guided'?'on':''} onClick={()=>{setMode('guided');setStep(0)}}>GUIDÉE</button><button type="button" className={mode==='complete'?'on':''} onClick={()=>setMode('complete')}>COMPLÈTE</button></div><p>{mode==='guided'?'Configuration compacte, étape par étape, dans le même esprit que X01.':'Tous les réglages sont accessibles sur une seule page.'}</p><button type="button" className="challenge-leaderboard-access" onClick={()=>go('challenge_leaderboard',{from:'challenge_config'})}><span>🏆</span><b>CLASSEMENTS ONLINE</b><small>Meilleurs scores · filtres · équipes officielles</small></button></div>
    <div className="summary"><b>{matchMode?matchMode.toUpperCase():'—'}</b><span>{playerIds.length} JOUEUR{playerIds.length>1?'S':''}</span><span>{exerciseSummary}</span><span>{resolvedVisits} TOURS</span><span>SONS {soundsEnabled?'ON':'OFF'}</span></div>
   </section>
   {(lastPlayedPreset||favoritePreset)&&<section className="quick-presets" aria-label="Raccourcis Challenge">
    {lastPlayedPreset&&<button type="button" className="quick-preset last" onClick={()=>replayPreset(lastPlayedPreset)}><i>↻</i><span><small>DERNIER CHALLENGE</small><b>{presetDescriptor(lastPlayedPreset)}</b><em>Réglages chargés · choisissez joueurs ou équipes</em></span><strong>REJOUER</strong></button>}
    {favoritePreset&&<button type="button" className="quick-preset favorite" onClick={()=>replayPreset(favoritePreset)}><i>★</i><span><small>CHALLENGE PRÉFÉRÉ</small><b>{presetDescriptor(favoritePreset)}</b><em>Configuration favorite · choisissez les participants</em></span><strong>PRÉPARER</strong></button>}
   </section>}
   {mode==='guided'&&<section className="progress-card"><div><strong>CONFIGURATION GUIDÉE</strong><span>Étape {step+1}/{stages.length} • {stepLabels[step]}</span></div><div className="steps">{stepLabels.map((label,i)=><button type="button" onClick={()=>{if(i<=step||currentStepValid)setStep(i)}} className={i===step?'on':i<step?'done':''} key={label}><b>{i+1}</b><span>{label}</span></button>)}</div></section>}
   <div className={mode==='complete'?'complete-grid':'guided-stage'}>{shown}</div>
   <section className="launch-preview" aria-label="Résumé du challenge"><span><small>PRÊT À JOUER</small><b>{exerciseSummary}</b><em>{exerciseRuleSummary}</em></span><strong>{resolvedVisits}<small>TOURS</small></strong></section>
   <div className="preset-actions"><button type="button" className={favoritePreset?'favorite-set on':'favorite-set'} onClick={saveFavorite}><span>{favoritePreset?'★':'☆'}</span><b>{favoritePreset?'METTRE À JOUR LE FAVORI':'ENREGISTRER COMME FAVORI'}</b></button><small>Les derniers réglages sont mémorisés automatiquement.</small></div>
   <div className="config-actions">
    {mode==='guided'&&step>0&&<button type="button" onClick={()=>setStep(s=>s-1)}>← PRÉCÉDENT</button>}
    {mode==='guided'&&step<stages.length-1?<button type="button" className="launch" disabled={!currentStepValid} onClick={()=>currentStepValid&&setStep(s=>s+1)}>SUIVANT →</button>:<button type="button" className="launch" disabled={!selectionValid||!exerciseValid} onClick={start}>▶ LANCER LE CHALLENGE</button>}
   </div>
  </main>

  {teamPicker&&<div className="team-picker-overlay" onClick={()=>setTeamPicker(null)}>
   <div className="team-picker-card" onClick={e=>e.stopPropagation()}>
    <div className="team-picker-head">
     <div className="team-picker-identity"><span className="picker-team-logo-slot"><span>{String(teamPicker.name||'E').slice(0,1)}</span><TeamLogoView team={teamPicker} alt=""/></span><div><small>CHOISIR LES JOUEURS</small><b>{teamPicker.name||'Équipe'}</b><em>{Number.isFinite(pickerLimit)?`${teamPickerPlayerIds.length}/${pickerLimit} place${pickerLimit>1?'s':''}`:`${teamPickerPlayerIds.length} sélectionné${teamPickerPlayerIds.length>1?'s':''}`}</em></div></div>
     <button type="button" className="team-picker-close" onClick={()=>setTeamPicker(null)}>×</button>
    </div>
    <div className="team-picker-body">
     {pickerMembers.length?<div className="team-player-grid">{pickerMembers.map(pid=>{const profile:any=profileById.get(pid);const checked=teamPickerPlayerIds.includes(pid);const disabled=!checked&&Number.isFinite(pickerLimit)&&teamPickerPlayerIds.length>=pickerLimit;return <button type="button" key={pid} disabled={disabled} className={'team-player-card '+(checked?'on':'')} onClick={()=>toggleTeamPickerPlayer(pid)}><span className="team-player-avatar">{profile?<ProfileAvatar profile={profile} profileId={String(profile.id)} fallbackMode="full" loading="eager" noFrame size={78}/>:<span className="team-player-fallback">?</span>}</span><b>{profile?.name||profile?.nickname||'Joueur'}</b><small>{checked?'SÉLECTIONNÉ':disabled?'MAXIMUM ATTEINT':'TOUCHER POUR AJOUTER'}</small></button>})}</div>:<div className="locked-hint">Aucun joueur associé à cette équipe.</div>}
    </div>
    <div className="team-picker-actions"><button type="button" onClick={()=>setTeamPicker(null)}>ANNULER</button><button type="button" className="validate" disabled={!teamPickerPlayerIds.length} onClick={validateTeamPicker}>VALIDER {teamPickerPlayerIds.length?`(${teamPickerPlayerIds.length})`:''}</button></div>
   </div>
  </div>}
  <style>{css(primary)}</style>
 </div>;
}

function Section({title,subtitle,children}:{title:string;subtitle?:string;children:any}){return <section className="config-card"><div className="section-title"><h2>{title}</h2>{subtitle?<p>{subtitle}</p>:null}</div>{children}</section>}

const css=(p:string)=>`
.challenge-config{min-height:100dvh;padding:0 0 88px;overflow-x:hidden;background:radial-gradient(circle at 50% -8%,#321015 0,transparent 36%),linear-gradient(180deg,#070a10,#030507)!important;box-sizing:border-box}
.challenge-head{height:clamp(76px,10vw,96px);max-width:1180px;margin:0 auto 8px;position:relative;overflow:hidden;border:1px solid #485668;border-top:0;border-radius:0 0 18px 18px;background:#06090e;box-shadow:0 12px 32px #0009,inset 0 0 26px #000}
.challenge-head>img{width:100%;height:100%;display:block;object-fit:cover;object-position:center;filter:saturate(1.04) contrast(1.03)}
.challenge-head:after{content:'';position:absolute;inset:0;background:linear-gradient(90deg,#02050a88 0,transparent 20%,transparent 80%,#02050a88 100%);pointer-events:none}
.challenge-back{position:absolute;z-index:3;left:12px;top:50%;transform:translateY(-50%)}
.challenge-awena{position:absolute;z-index:3;right:12px;top:50%;transform:translateY(-50%);width:48px;height:48px;border-radius:50%;padding:3px;border:0;background:conic-gradient(#3dff96,#33d8ff,#ff4cc8,#3dff96);box-shadow:0 0 16px rgba(51,216,255,.34),0 8px 22px rgba(0,0,0,.42);cursor:pointer}
.challenge-awena>span{width:100%;height:100%;border-radius:50%;overflow:hidden;display:block;background:#060815}.challenge-awena img{width:100%;height:100%;object-fit:cover;display:block}.challenge-awena i{position:absolute;right:-2px;bottom:-2px;width:19px;height:19px;border-radius:50%;display:grid;place-items:center;background:#11172a;border:1px solid rgba(255,255,255,.18);color:#fff;font-size:10px;font-style:normal;box-shadow:0 4px 10px rgba(0,0,0,.45)}
.config-wrap{max-width:1040px;margin:auto;padding:8px 12px 14px;box-sizing:border-box}
.config-overview,.progress-card,.config-card{background:linear-gradient(155deg,rgba(11,17,26,.97),rgba(6,9,15,.97));border:1px solid #465467;border-radius:18px;box-shadow:inset 0 0 24px #0008,0 14px 34px #0008}
.config-overview{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:12px;padding:12px;margin-bottom:10px;border-top:2px solid #b6202a}.overview-copy{min-width:0}.config-overview small{color:${p};font-size:11px;font-weight:950;letter-spacing:1px}.config-overview p,.hint{margin:7px 0 0;color:#9eabba;font-size:11px;line-height:1.35}
.mode-row{display:flex;gap:7px;margin-top:8px;flex-wrap:wrap}.mode-row button,.arcade-choice,.target-btn,.rule-btn,.config-actions button{border:1px solid #5a6678;background:linear-gradient(180deg,#121a27,#080c13);color:#fff;border-radius:11px;padding:9px 13px;font-size:11px;font-weight:950;box-shadow:inset 0 0 12px #0008;cursor:pointer}.mode-row button.on,.arcade-choice.on,.target-btn.on,.rule-btn.on{border-color:${p};background:linear-gradient(180deg,#541219,#180a0d);box-shadow:inset 0 0 18px #ff273322,0 0 14px #ff273322}
.summary{min-width:185px;display:flex;flex-direction:column;justify-content:center;text-align:right;padding:5px 0 5px 14px;border-left:1px solid #354151}.summary b{font-size:24px;color:#ff4a50;line-height:1.05}.summary span{font-size:10px;font-weight:850;color:#c2cad6;margin-top:3px}
.quick-presets{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin:0 0 10px}.quick-preset{min-width:0;min-height:74px;border:1px solid #3b4a5d;border-radius:15px;background:linear-gradient(145deg,#0b1420,#060a10);color:#fff;padding:9px 10px;display:grid;grid-template-columns:38px minmax(0,1fr) auto;gap:8px;align-items:center;text-align:left;box-shadow:inset 0 0 20px #0008;cursor:pointer}.quick-preset>i{width:38px;height:38px;border-radius:12px;display:grid;place-items:center;background:#111d2a;border:1px solid #4e6075;font-style:normal;font-size:20px}.quick-preset>span{min-width:0}.quick-preset small,.quick-preset b,.quick-preset em{display:block}.quick-preset small{color:${p};font-size:7.5px;font-weight:1000;letter-spacing:.9px}.quick-preset b{margin-top:3px;font-size:10px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.quick-preset em{margin-top:3px;color:#8f9dae;font-size:7.5px;font-style:normal}.quick-preset>strong{font-size:8px;color:#fff;padding:7px 9px;border-radius:999px;border:1px solid #566579;background:#0a111a}.quick-preset.favorite{border-color:#b0872f}.quick-preset.favorite>i{color:#ffd85c;border-color:#b0872f;background:#2a220d}.quick-preset.last{border-color:#3d7184}.quick-preset.last>i{color:#50ddff;border-color:#3d7184;background:#0a222b}
.progress-card{padding:10px 12px;margin-bottom:10px;display:grid;grid-template-columns:auto minmax(0,1fr);gap:14px;align-items:center}.progress-card>div:first-child{min-width:155px}.progress-card strong{display:block;color:${p};font-size:11px;letter-spacing:.8px}.progress-card>div:first-child span{display:block;margin-top:3px;color:#939fb0;font-size:10px}
.steps{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:5px}.steps button{min-width:0;height:34px;border-radius:999px;border:1px solid #2d3949;background:#0a1018;color:#778396;display:flex;align-items:center;justify-content:center;gap:5px;cursor:pointer}.steps button b{font-size:10px}.steps button span{font-size:7px;font-weight:900}.steps button.on{color:#fff;border-color:${p};background:#3a1116;box-shadow:0 0 14px #ff283344}.steps button.done{color:${p};border-color:#783039}
.guided-stage{display:block}.complete-grid{display:grid;grid-template-columns:1fr;gap:10px}.config-card{padding:12px;margin-bottom:10px}.complete-grid .config-card{margin-bottom:0}.section-title{display:flex;align-items:flex-end;justify-content:space-between;gap:14px;margin-bottom:10px;padding-bottom:8px;border-bottom:1px solid #273342}.section-title h2{margin:0;font-size:14px;letter-spacing:.8px;color:#fff}.section-title p{margin:0;max-width:62%;font-size:9.5px;color:#909cad;text-align:right;line-height:1.3}.config-card h3{font-size:9px;color:#9eabba;letter-spacing:1px;margin:11px 0 6px}
.match-mode{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}.match-mode button{min-height:72px;border:1px solid #586576;background:linear-gradient(180deg,#121a27,#080c13);color:#fff;border-radius:13px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:5px;cursor:pointer;box-shadow:inset 0 0 14px #0008}.match-mode button b{font-size:17px;letter-spacing:1.2px}.match-mode button span{font-size:9px;color:#96a2b3}.match-mode button.on{border-color:#ff3c45;background:linear-gradient(180deg,#5b131a,#19090c);box-shadow:inset 0 0 18px #ff273322,0 0 16px #ff273333}.match-mode button.on b{color:#ff5258}
.source-row{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin-bottom:8px}.source-row button{min-height:52px;border:1px solid #4e5c6e;background:#0a1018;color:#fff;border-radius:12px;padding:8px 10px;text-align:left;cursor:pointer}.source-row button b{display:block;font-size:11px}.source-row button span{display:block;margin-top:2px;font-size:8.5px;color:#94a0b0}.source-row button.on{border-color:${p};background:linear-gradient(180deg,#481218,#16090c);box-shadow:0 0 14px #ff273322}
.challenge-leaderboard-access{margin-top:8px;width:100%;min-height:44px;border:1px solid #36eaff66;border-radius:11px;background:linear-gradient(180deg,#0b1924,#071019);color:#fff;display:grid;grid-template-columns:28px minmax(0,1fr);grid-template-areas:'icon title' 'icon sub';gap:1px 7px;align-items:center;text-align:left;padding:7px 9px}.challenge-leaderboard-access>span{grid-area:icon;font-size:20px}.challenge-leaderboard-access>b{grid-area:title;font-size:9px;color:#43e9ff;letter-spacing:.7px}.challenge-leaderboard-access>small{grid-area:sub;font-size:7px;color:#93a2b4}
.locked-hint{min-height:64px;border:1px dashed #526074;border-radius:12px;display:grid;place-items:center;padding:12px;color:#a7b2c0;font-size:10px;font-weight:900;text-align:center;background:#080d14}.locked-hint.compact{min-height:46px}
.selected-team-strip{display:flex;gap:7px;overflow-x:auto;padding:2px 1px 8px;margin-bottom:2px;scrollbar-width:thin}.selected-team-chip{flex:0 0 auto;min-width:170px;max-width:230px;display:grid;grid-template-columns:34px minmax(0,1fr) 26px;gap:6px;align-items:center;padding:5px 6px;border:1px solid ${p}77;border-radius:999px;background:${p}12}.selected-team-chip>img,.selected-team-chip>span{width:34px;height:34px;border-radius:50%;object-fit:cover;display:grid;place-items:center;background:#101722;border:1px solid #526073;font-weight:1000}.selected-team-chip>div{min-width:0}.selected-team-chip b,.selected-team-chip small{display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.selected-team-chip b{font-size:9px}.selected-team-chip small{font-size:7px;color:#9ba8b8}.selected-team-chip button{width:26px;height:26px;border-radius:50%;border:1px solid #ffffff22;background:#0007;color:#ff7980;font-weight:1000}
.team-logo-slot,.selected-team-logo-slot,.picker-team-logo-slot{position:relative;display:grid;place-items:center;overflow:hidden;border-radius:50%;background:#101722;border:1px solid #566477}.team-logo-slot{width:64px;height:64px}.selected-team-logo-slot{width:34px;height:34px}.picker-team-logo-slot{width:50px;height:50px}.team-logo-slot>span,.selected-team-logo-slot>span,.picker-team-logo-slot>span{position:absolute;inset:0;display:grid;place-items:center;font-weight:1000}.team-logo-slot>img,.selected-team-logo-slot>img,.picker-team-logo-slot>img{position:relative;z-index:2;width:100%;height:100%;border-radius:50%;object-fit:cover;background:#101722}
.team-carousel{display:flex;gap:10px;overflow-x:auto;overflow-y:hidden;padding:3px 2px 12px;margin:0 -2px;scroll-snap-type:x mandatory;overscroll-behavior-x:contain;-webkit-overflow-scrolling:touch;scrollbar-width:thin}.team-choice{scroll-snap-align:start;flex:0 0 clamp(155px,34vw,205px);min-height:142px;border:1px solid #465466;border-radius:17px;background:linear-gradient(180deg,#101722,#080c12);color:#fff;display:flex;flex-direction:column;gap:6px;align-items:center;justify-content:center;padding:10px;text-align:center;cursor:pointer;position:relative}.team-choice.on{border-color:${p};background:linear-gradient(180deg,#451217,#16090c);box-shadow:0 0 14px #ff273322}.team-choice>img,.team-fallback{width:64px;height:64px;border-radius:50%;object-fit:cover;display:grid;place-items:center;background:#111a26;border:1px solid #566477;font-weight:1000}.team-copy{min-width:0;width:100%}.team-copy b{display:block;font-size:11px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.team-copy small{display:block;margin-top:2px;color:#929fae;font-size:8px}.team-choice em{font-size:7px;font-style:normal;color:${p};font-weight:1000;letter-spacing:.8px}.team-help{margin-top:-4px;color:#8491a2;font-size:8.5px;line-height:1.35}
.selection-status{margin-top:9px;min-height:42px;border-radius:11px;padding:7px 10px;display:grid;grid-template-columns:24px minmax(0,1fr);align-items:center;gap:8px;border:1px solid #4f5d6f;background:#090f17}.selection-status>span{width:24px;height:24px;border-radius:50%;display:grid;place-items:center;font-weight:1000}.selection-status b{font-size:10px}.selection-status small{grid-column:2;color:#8f9cac;font-size:8px}.selection-status.ok{border-color:#2bbd664f}.selection-status.ok>span{background:#123b22;color:#58ee86}.selection-status.ko{border-color:#d43a4555}.selection-status.ko>span{background:#3c1116;color:#ff5d65}
.target-grid{display:grid;grid-template-columns:repeat(11,minmax(0,1fr));gap:6px}.target-btn{position:relative;isolation:isolate;height:46px;min-height:46px;padding:3px 6px;font-size:11px;display:flex;align-items:center;justify-content:center;overflow:hidden}.target-btn:after{content:'';position:absolute;inset:0;z-index:1;background:linear-gradient(180deg,rgba(4,8,13,.16),rgba(4,8,13,.66));pointer-events:none}.target-btn b{position:relative;z-index:2;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:10px;line-height:1;text-shadow:0 2px 5px #000,0 0 8px #000}.target-btn.family b{font-size:8.5px}.target-thumb{position:absolute;z-index:0;inset:-12px;display:flex;align-items:center;justify-content:center;opacity:.25;pointer-events:none}.target-thumb img{display:block;width:100%;height:100%;object-fit:contain;filter:drop-shadow(0 3px 7px #000d);transform:scale(1.34)}.target-btn.family .target-thumb{opacity:.23}.target-btn.family .target-thumb img{transform:scale(1.14)}.target-btn.on .target-thumb{opacity:.42}.target-btn.on b{color:#fff;text-shadow:0 0 8px #ff3d47,0 2px 5px #000}
.visit-grid{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:7px}.arcade-choice{min-height:42px;font-size:13px}.rule-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:7px}.rule-btn{min-height:58px;text-align:left;display:flex;flex-direction:column;justify-content:center;padding:9px 10px}.rule-btn b{font-size:10px}.rule-btn span{font-size:8.5px;color:#98a5b6;margin-top:3px}.rule-btn.on b{color:#ff555b}
.exercise-grid{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:8px}.exercise-card{min-height:92px;border:1px solid #465466;border-radius:14px;background:linear-gradient(180deg,#111a27,#070c13);color:#fff;padding:10px;display:grid;grid-template-columns:34px minmax(0,1fr);gap:8px;align-items:center;text-align:left;box-shadow:inset 0 0 16px #0008}.exercise-card>i{width:34px;height:34px;border-radius:11px;display:grid;place-items:center;background:#111d2a;border:1px solid #536174;color:#d7e4f4;font-size:18px;font-style:normal;font-weight:1000}.exercise-card span{min-width:0}.exercise-card b{display:block;font-size:10px;letter-spacing:.35px}.exercise-card small{display:block;margin-top:4px;color:#94a2b3;font-size:7.5px;line-height:1.28}.exercise-card.on{border-color:${p};background:linear-gradient(180deg,#51141a,#17090c);box-shadow:0 0 18px ${p}33,inset 0 0 18px ${p}18}.exercise-card.on>i{border-color:${p};color:#ff6870;background:#2a0d11}
.advanced-grid,.grouping-config{display:grid;grid-template-columns:1fr 1fr;gap:9px}.advanced-block{border:1px solid #334256;border-radius:13px;background:#081019;padding:10px}.advanced-block.compact{margin-top:9px}.advanced-block h3{margin:0 0 7px;font-size:8px;color:#9cabbc;letter-spacing:.9px}.binary-row{display:grid;grid-template-columns:1fr 1fr;gap:7px}.binary-row button{min-height:48px;border:1px solid #49586b;border-radius:10px;background:linear-gradient(180deg,#111925,#080d14);color:#fff;padding:8px;font-size:9px;font-weight:950;display:flex;flex-direction:column;align-items:flex-start;justify-content:center}.binary-row button small{margin-top:2px;color:#93a1b2;font-size:7.5px}.binary-row button.on{border-color:${p};background:linear-gradient(180deg,#4c1218,#17090c);box-shadow:0 0 14px ${p}2f}.sequence-preview{display:flex;gap:6px;overflow-x:auto;padding:3px 1px 9px}.sequence-preview>span{position:relative;flex:0 0 auto;min-width:76px;min-height:45px;border:1px solid #3a485a;border-radius:10px;background:#09111a;color:#fff;display:flex;align-items:center;justify-content:center;padding:8px 8px 8px 28px;font-size:8px;font-weight:950;white-space:nowrap}.sequence-preview>span>b{position:absolute;left:7px;width:16px;height:16px;border-radius:50%;display:grid;place-items:center;background:#1b2735;color:#ff6970;font-size:7px}.sequence-preview.editable>span{padding-right:27px}.sequence-preview>span>button{position:absolute;right:5px;width:18px;height:18px;border:0;border-radius:50%;background:#301015;color:#ff747a;font-weight:1000}.sequence-add{display:grid;grid-template-columns:minmax(150px,1fr) auto auto auto;gap:6px}.sequence-add select,.range-select select{min-height:39px;border:1px solid #48586b;border-radius:9px;background:#08111a;color:#fff;padding:7px;font-weight:900}.sequence-add button{min-height:39px;border:1px solid #526175;border-radius:9px;background:#0b141e;color:#fff;padding:7px 10px;font-size:8px;font-weight:1000}.sequence-add button:first-of-type{border-color:${p};background:#351016}.sequence-add .danger{border-color:#7a3338;color:#ff7e84}.half-start{grid-template-columns:repeat(5,minmax(0,1fr))}.range-select{display:flex;align-items:center;justify-content:center;gap:9px}.range-select label{display:flex;align-items:center;gap:6px;color:#93a2b4;font-size:8px;font-weight:1000}.range-select select{min-width:72px}.range-select>span{color:${p};font-weight:1000}.grouping-example{margin-top:9px;border:1px solid #3c4a5c;border-radius:12px;background:linear-gradient(90deg,#08111a,#0b151f);padding:9px 11px;display:grid;grid-template-columns:auto auto 1fr;gap:7px 12px;align-items:center}.grouping-example>b{font-size:8px;color:${p}}.grouping-example>span{font-size:10px;font-weight:900}.grouping-example strong{color:#65f192}.grouping-example small{font-size:8px;color:#93a1b2}.audio-toggle-row{display:grid;grid-template-columns:1fr 1fr;gap:8px}.audio-toggle-row button{min-height:66px;border:1px solid #4e5d70;border-radius:12px;background:linear-gradient(180deg,#111a27,#080d14);color:#fff;display:flex;flex-direction:column;align-items:flex-start;justify-content:center;padding:10px 12px;box-shadow:inset 0 0 14px #0007}.audio-toggle-row button b{font-size:12px}.audio-toggle-row button span{margin-top:3px;color:#95a3b4;font-size:8.5px;font-weight:800}.audio-toggle-row button.on{border-color:#4dff83;background:linear-gradient(180deg,#0e421f,#07170d);box-shadow:0 0 18px #25e66033}.audio-toggle-row button.off.on{border-color:#ff5960;background:linear-gradient(180deg,#4b1218,#19090c);box-shadow:0 0 18px #ff293333}.audio-toggle-row button.on b{color:#72ff9e}.audio-toggle-row button.off.on b{color:#ff7379}
.custom-visits{margin-top:8px;min-height:44px;display:grid;grid-template-columns:auto 90px auto;gap:8px;align-items:center;padding:7px 9px;border:1px solid #344255;border-radius:11px;background:#08111a}.custom-visits>span{font-size:8px;color:#9aa8b9;font-weight:1000;letter-spacing:.7px}.custom-visits input{width:100%;box-sizing:border-box;min-height:32px;border:1px solid #59697c;border-radius:8px;background:#050a10;color:#fff;text-align:center;font-size:14px;font-weight:1000}.custom-visits small{font-size:7px;color:#7f8da0}.grouping-presets{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px}.grouping-presets button{min-height:32px;border:1px solid #4e5e72;border-radius:999px;background:#0a121c;color:#dce5ef;padding:6px 11px;font-size:8px;font-weight:1000}.grouping-presets button:hover{border-color:${p};color:#fff}.launch-preview{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:10px;margin-top:8px;padding:9px 11px;border:1px solid #39495c;border-left:3px solid ${p};border-radius:13px;background:linear-gradient(90deg,#0a121c,#080d14);box-shadow:inset 0 0 18px #0008}.launch-preview>span{min-width:0;display:flex;flex-direction:column}.launch-preview small{font-size:7px;color:${p};font-weight:1000;letter-spacing:.8px}.launch-preview b{margin-top:2px;font-size:11px;color:#fff}.launch-preview em{margin-top:2px;font-size:8px;color:#9ba9ba;font-style:normal;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.launch-preview>strong{font-size:22px;color:#ff5a61;display:flex;align-items:baseline;gap:4px}.launch-preview>strong small{font-size:7px;color:#a0adbb}
.preset-actions{display:flex;align-items:center;gap:9px;margin-top:7px;padding:0 3px}.preset-actions small{color:#7f8c9e;font-size:7.5px}.favorite-set{min-height:34px;border:1px solid #4d5b6e;border-radius:999px;background:#0a1119;color:#d9e2ed;padding:6px 11px;display:flex;align-items:center;gap:6px;font-size:8px;font-weight:1000}.favorite-set span{font-size:15px;color:#ffd85c}.favorite-set.on{border-color:#9c7a2d;background:#211a09;color:#fff}
.config-actions{position:sticky;bottom:calc(82px + env(safe-area-inset-bottom,0px));z-index:8;display:flex;justify-content:flex-end;gap:8px;margin-top:6px;padding:7px;border-radius:14px;background:linear-gradient(180deg,#06090eda,#040609f2);backdrop-filter:blur(10px);border:1px solid #293544}.config-actions button{min-height:42px}.config-actions .launch{min-width:220px;background:linear-gradient(180deg,#2be15e,#07852e);border-color:#69ff8d;box-shadow:inset 0 0 14px #aaffb433,0 0 22px #23e75c44;font-size:12px}.config-actions button:disabled{opacity:.38;filter:grayscale(.6);cursor:not-allowed;box-shadow:none}
.team-picker-overlay{position:fixed;inset:0;z-index:10040;display:grid;place-items:center;padding:max(12px,env(safe-area-inset-top,0px)) 12px max(14px,env(safe-area-inset-bottom,0px));background:#000d;backdrop-filter:blur(8px)}.team-picker-card{width:min(720px,96vw);max-height:min(88dvh,760px);display:flex;flex-direction:column;overflow:hidden;border:1px solid ${p}99;border-radius:22px;background:linear-gradient(180deg,#0d1622,#05080e);box-shadow:0 28px 80px #000,0 0 32px ${p}33}.team-picker-head{flex:0 0 auto;display:flex;align-items:center;justify-content:space-between;gap:10px;padding:11px 12px;border-bottom:1px solid ${p}55}.team-picker-identity{min-width:0;display:grid;grid-template-columns:50px minmax(0,1fr);gap:9px;align-items:center}.team-picker-identity>img,.team-picker-identity>span{width:50px;height:50px;border-radius:50%;object-fit:cover;display:grid;place-items:center;background:#101722;border:1px solid #59687b;font-weight:1000}.team-picker-identity>div{min-width:0}.team-picker-identity small,.team-picker-identity b,.team-picker-identity em{display:block}.team-picker-identity small{font-size:8px;color:${p};font-weight:1000;letter-spacing:1px}.team-picker-identity b{font-size:16px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.team-picker-identity em{font-size:9px;color:#9aa7b8;font-style:normal}.team-picker-close{width:40px;height:40px;border-radius:12px;border:1px solid #566477;background:#0c121b;color:#fff;font-size:21px}.team-picker-body{min-height:0;overflow:auto;padding:12px}.team-player-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px}.team-player-card{min-width:0;min-height:142px;border:1px solid #3d4a5d;border-radius:16px;background:linear-gradient(180deg,#101722,#080d14);color:#fff;padding:9px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px}.team-player-card.on{border-color:${p};background:linear-gradient(180deg,#471319,#17090c);box-shadow:0 0 18px ${p}44}.team-player-card:disabled{opacity:.36}.team-player-avatar{width:78px;height:78px;border-radius:50%;overflow:hidden;display:grid;place-items:center;border:2px solid #59687b;background:#101722}.team-player-avatar>*{width:100%!important;height:100%!important}.team-player-fallback{font-size:28px;font-weight:1000}.team-player-card b{width:100%;font-size:11px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.team-player-card small{font-size:7px;color:#97a4b4;font-weight:900}.team-picker-actions{flex:0 0 auto;display:flex;justify-content:flex-end;gap:8px;padding:10px 12px;border-top:1px solid #273545}.team-picker-actions button{min-height:40px;border:1px solid #4f5d6e;border-radius:11px;background:#0a1018;color:#fff;padding:8px 14px;font-weight:1000}.team-picker-actions .validate{border-color:${p};background:linear-gradient(180deg,#5a141b,#1a090c);color:#fff}.team-picker-actions button:disabled{opacity:.4}
@media(orientation:landscape){.challenge-config{height:100dvh;min-height:0;padding:6px 8px 6px;overflow:hidden;display:flex;flex-direction:column}.challenge-head{flex:0 0 64px;width:min(1180px,100%);height:64px;min-height:64px;margin:0 auto 6px;border-radius:14px}.challenge-head>img{object-fit:contain;background:#05080d}.challenge-back{left:8px}.challenge-awena{right:8px;width:44px;height:44px}.config-wrap{width:min(1180px,100%);max-width:1180px;flex:1 1 auto;min-height:0;overflow-y:auto;overflow-x:hidden;padding:4px 8px 8px}.config-overview{padding:9px 11px;margin-bottom:7px}.config-overview p{margin-top:4px}.mode-row{margin-top:5px}.mode-row button{padding:7px 11px}.summary b{font-size:20px}.summary span{font-size:8px}.quick-presets{margin-bottom:7px}.quick-preset{min-height:62px}.progress-card{padding:7px 10px;margin-bottom:7px}.steps button{height:30px}.config-card{padding:10px;margin-bottom:7px}.section-title{margin-bottom:7px;padding-bottom:6px}.match-mode button{min-height:58px}.match-mode button b{font-size:15px}.team-carousel{padding-bottom:8px}.team-choice{flex-basis:176px;min-height:118px;padding:8px}.team-choice>img,.team-fallback,.team-logo-slot{width:54px;height:54px}.target-grid{grid-template-columns:repeat(11,minmax(0,1fr))}.target-btn{height:42px;min-height:42px}.exercise-grid{grid-template-columns:repeat(5,minmax(0,1fr))}.rule-grid{grid-template-columns:repeat(3,minmax(0,1fr))}.complete-grid{grid-template-columns:repeat(2,minmax(0,1fr));align-items:start}.complete-grid .config-card:nth-child(1),.complete-grid .config-card:nth-child(2){grid-column:1/-1}.config-actions{bottom:0;margin-top:4px;padding:5px}.config-actions button{min-height:36px;padding:7px 11px}.team-player-grid{grid-template-columns:repeat(4,minmax(0,1fr))}.team-player-card{min-height:126px}.team-player-avatar{width:66px;height:66px}}
@media(max-width:760px){.challenge-head{height:72px;margin-bottom:5px;border-radius:0 0 14px 14px}.challenge-head>img{object-fit:cover}.challenge-back{left:7px;transform:translateY(-50%) scale(.92)}.challenge-awena{right:7px;width:44px;height:44px}.config-wrap{padding:6px 8px 12px}.config-overview{grid-template-columns:1fr auto;padding:10px}.config-overview p{font-size:9px}.summary{min-width:118px;padding-left:9px}.summary b{font-size:17px}.summary span{font-size:7.5px}.quick-presets{grid-template-columns:1fr}.quick-preset{min-height:68px}.progress-card{grid-template-columns:1fr;padding:9px;gap:7px}.progress-card>div:first-child{min-width:0}.steps button{height:30px}.steps button span{display:none}.config-card{padding:10px}.section-title{align-items:flex-start;flex-direction:column;gap:3px}.section-title p{max-width:100%;text-align:left;font-size:8.5px}.match-mode{gap:5px}.match-mode button{min-height:60px}.match-mode button b{font-size:14px}.match-mode button span{font-size:7.5px}.target-grid{grid-template-columns:repeat(5,minmax(0,1fr))}.target-btn{height:52px;min-height:52px}.target-btn b{font-size:10px}.target-btn.family b{font-size:8px}.target-thumb{inset:-14px}.exercise-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.exercise-card{min-height:78px}.advanced-grid,.grouping-config{grid-template-columns:1fr}.sequence-add{grid-template-columns:1fr 1fr}.sequence-add select{grid-column:1/-1}.grouping-example{grid-template-columns:1fr}.visit-grid{grid-template-columns:repeat(4,minmax(0,1fr))}.rule-grid{grid-template-columns:1fr 1fr}.audio-toggle-row{grid-template-columns:1fr 1fr}.config-actions{bottom:calc(74px + env(safe-area-inset-bottom,0px));padding:5px}.config-actions button{flex:1;min-width:0!important;padding:9px 8px;font-size:10px!important}.team-player-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.team-choice{flex-basis:min(62vw,210px)}.preset-actions{align-items:flex-start;flex-direction:column}}
@media(max-width:430px){.custom-visits{grid-template-columns:1fr 86px}.custom-visits small{display:none}.launch-preview>strong{font-size:18px}.exercise-grid{grid-template-columns:1fr}.binary-row{grid-template-columns:1fr 1fr}.sequence-add{grid-template-columns:1fr}.sequence-add select{grid-column:auto}.summary{display:none}.config-overview{grid-template-columns:1fr}.source-row{grid-template-columns:1fr 1fr}.rule-grid{grid-template-columns:1fr}.audio-toggle-row{grid-template-columns:1fr}.match-mode button span{max-width:90px;text-align:center}.target-grid{grid-template-columns:repeat(5,minmax(0,1fr))}.team-picker-card{width:100%}.team-player-card{min-height:124px}.team-player-avatar{width:64px;height:64px}.quick-preset{grid-template-columns:34px minmax(0,1fr)}.quick-preset>strong{grid-column:2;justify-self:start}.quick-preset>i{width:34px;height:34px}}
`;
