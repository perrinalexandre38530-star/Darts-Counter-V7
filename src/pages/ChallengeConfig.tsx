import NativeStartOrderConfig from '../components/NativeStartOrderConfig';
import React from 'react';
import { BottomNavIcon } from '../components/BottomNav';
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
import { DEFAULT_CUSTOM_SEQUENCE, DEFAULT_HALF_IT_SEQUENCE, DOUBLES_8_TARGETS, exerciseTitle, objectiveLabel, type ChallengeExerciseType, type ChallengeObjectiveToken, type ChallengeScoreMode } from '../lib/challengeExercises';
import {getArcadeChallenge,isArcadeChallengePlayable} from '../lib/challengeArcadeCatalog';
import {CHALLENGE_MODE_OPTIONS,CHALLENGE_MODE_FAMILIES,selectedChallengeMode, type UnifiedChallengeMode} from '../lib/challengeUnifiedCatalog';
import { ChallengeInsightsPage, type ChallengeInsightView } from '../components/challenge/ChallengeInsightsPage';
import { ChallengeGuideInfo, ChallengeGuideTiles } from '../components/challenge/ChallengeGuideInfo';
import { buildChallengeGuide } from '../lib/challengeGuideContent';
import {arcadeRuleDetails,arcadeRuleDescription, type ArcadeVariant, type ArcadePlayConfig} from '../lib/challengeArcadeEngine';
import { getChallengeTrainingPreset, CHALLENGE_TRAINING_ARCADE_CATALOG } from '../training/catalog/challengeTrainingCatalog';

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
  trainingOrigin?: 'training_lab';
  trainingCatalogPresetId?: string;
  trainingOwnerId?: string;
  exerciseType?:ChallengeExerciseType;
  catalogChallengeId?:string;
  catalogLine?:number;
  catalogVariant?:ArcadeVariant;
  catalogRounds?:number;
 catalogTarget?:number;catalogStep?:number;catalogMin?:number;catalogMax?:number;catalogLives?:number;catalogSeed?:number;
  clockIncludeBull?:boolean;
  clockScoreMode?:ChallengeScoreMode;
  halfItStartScore?:number;
  sequenceObjectives?:ChallengeObjectiveToken[];
  sequenceScoreMode?:ChallengeScoreMode;
  groupingMin?:number;
  groupingMax?:number;
  groupingHits?:2|3;
  doublesBonusTarget?:number;
  doublesTargets?:number[];
  doublesTargetMode?:'official'|'custom';
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
 catalogChallengeId?:string;
 catalogLine?:number;
 catalogVariant?:ArcadeVariant;
 catalogRounds?:number;
 catalogTarget?:number;catalogStep?:number;catalogMin?:number;catalogMax?:number;catalogLives?:number;catalogSeed?:number;
 clockIncludeBull:boolean;
 clockScoreMode:ChallengeScoreMode;
 halfItStartScore:number;
 sequenceObjectives:ChallengeObjectiveToken[];
 sequenceScoreMode:ChallengeScoreMode;
 groupingMin:number;
 groupingMax:number;
 groupingHits:2|3;
 doublesBonusTarget:number;
 doublesTargets:number[];
 doublesTargetMode:'official'|'custom';
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
 if(type==='arcade')return `${getArcadeChallenge(preset.catalogChallengeId).title} · ${preset.catalogRounds||5} ${arcadeRuleDetails({catalogChallengeId:preset.catalogChallengeId||'perfect-line',catalogLine:preset.catalogLine||20,catalogRounds:preset.catalogRounds||5,catalogVariant:preset.catalogVariant||'classic'}).roundUnit}`;
 if(type==='classic')return `${targetText(preset.target||'20')} · ${preset.visits||30} TOURS`;
 if(type==='clock')return `${preset.clockIncludeBull?'1 → 20 + BULL':'1 → 20'} · ${preset.clockScoreMode==='real'?'VALEUR RÉELLE':'S1 / D2 / T3'}`;
 if(type==='half-it')return `HALF-IT · DÉPART ${preset.halfItStartScore||40}`;
 if(type==='sequence')return `SÉQUENCE · ${Math.max(1,preset.sequenceObjectives?.length||0)} OBJECTIFS`;
 if(type==='jdc')return 'JDC CHALLENGE · 3 PHASES · 19 VOLÉES';
 if(type==='doubles8'){const targets=Array.isArray(preset.doublesTargets)&&preset.doublesTargets.length?preset.doublesTargets:[...DOUBLES_8_TARGETS];return `${preset.doublesTargetMode==='custom'?'PERSONNALISÉ':'8 DOUBLES'} · ${targets.map(n=>`D${n}`).join(' · ')} · BONUS AU CHOIX`;}
 return `GROUPEMENT ${Math.min(preset.groupingMin||15,preset.groupingMax||20)}–${Math.max(preset.groupingMin||15,preset.groupingMax||20)} · ×${preset.groupingHits||2}`;
};


function TeamLogoView({team,className='',alt=''}:{team:any;className?:string;alt?:string}){
 const direct=teamLogo(team);
 const [src,setSrc]=React.useState(direct);
 React.useEffect(()=>{let alive=true;setSrc(direct);if(!team?.id)return()=>{alive=false};void resolveTeamLogo(team,true).then(v=>{if(alive&&v)setSrc(v)}).catch(()=>{});return()=>{alive=false}},[team?.id,team?.logoMediaKey,team?.logoLibraryId,team?.logoLibraryFileName,direct]);
 if(!src) return null;
 return <img className={className} src={src} alt={alt||team?.name||''} onError={()=>{const fallback=resolveTeamLogoSrc(team?.logoLibraryId||team?.logoLibraryFileName||null)||'';if(fallback&&fallback!==src)setSrc(fallback)}}/>;
}

export default function ChallengeConfig({go,params,profiles=[],activeProfileId=null}:{go:(tab:any,params?:any)=>void;params?:any;profiles?:Profile[];activeProfileId?:string|null}){
 const fromTrainingLab = params?.fromTrainingLab === true;
 const trainingPresetId = fromTrainingLab ? String(params?.trainingChallengePresetId || '') : '';
 const trainingOwnerId = fromTrainingLab ? String(params?.trainingParticipantId || activeProfileId || '') : '';
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
 const [catalogChallengeId,setCatalogChallengeId]=React.useState('perfect-line');
 const [previewChoiceId,setPreviewChoiceId]=React.useState<string|null>(null);
 const [insightView,setInsightView]=React.useState<ChallengeInsightView|null>(null);
 const [focusedChoiceId,setFocusedChoiceId]=React.useState<string|null>(null);
 const [catalogLine,setCatalogLine]=React.useState(20);
 const [catalogVariant,setCatalogVariant]=React.useState<ArcadeVariant>('classic');
 const [catalogRounds,setCatalogRounds]=React.useState(5);
 const [catalogTarget,setCatalogTarget]=React.useState(100);
 const [catalogStep,setCatalogStep]=React.useState(3);
 const [catalogMin,setCatalogMin]=React.useState(60);
 const [catalogMax,setCatalogMax]=React.useState(80);
 const [catalogLives,setCatalogLives]=React.useState(3);
 const [catalogFamily,setCatalogFamily]=React.useState('TOUS');
 const [catalogSearch,setCatalogSearch]=React.useState('');
 const [clockIncludeBull,setClockIncludeBull]=React.useState(true);
 const [clockScoreMode,setClockScoreMode]=React.useState<ChallengeScoreMode>('challenge');
 const [halfItStartScore,setHalfItStartScore]=React.useState(40);
 const [sequenceObjectives,setSequenceObjectives]=React.useState<ChallengeObjectiveToken[]>([...DEFAULT_CUSTOM_SEQUENCE]);
 const [sequenceScoreMode,setSequenceScoreMode]=React.useState<ChallengeScoreMode>('real');
 const [sequencePicker,setSequencePicker]=React.useState<ChallengeObjectiveToken>('20');
 const [groupingMin,setGroupingMin]=React.useState(15);
 const [groupingMax,setGroupingMax]=React.useState(20);
 const [groupingHits,setGroupingHits]=React.useState<2|3>(2);
 const [doublesBonusTarget,setDoublesBonusTarget]=React.useState(20);
 const [doublesTargets,setDoublesTargets]=React.useState<number[]>([...DOUBLES_8_TARGETS]);
 const [doublesTargetMode,setDoublesTargetMode]=React.useState<'official'|'custom'>('official');
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
  setCatalogChallengeId(String(preset.catalogChallengeId||'perfect-line'));
  setCatalogLine(Math.max(1,Math.min(20,Number(preset.catalogLine)||20)));
  setCatalogVariant(preset.catalogVariant==='doubles'?'doubles':preset.catalogVariant==='triples'?'triples':'classic');
  setCatalogRounds(Math.max(1,Math.min(20,Number(preset.catalogRounds)||5)));
  setCatalogTarget(Number(preset.catalogTarget)||100);setCatalogStep(Number(preset.catalogStep)||3);
  setCatalogMin(Number(preset.catalogMin)||60);setCatalogMax(Number(preset.catalogMax)||80);
  setCatalogLives(Number(preset.catalogLives)||3);
  setClockIncludeBull(preset.clockIncludeBull!==false);
  setClockScoreMode((preset.clockScoreMode||'challenge') as ChallengeScoreMode);
  setHalfItStartScore(Math.max(0,Number(preset.halfItStartScore??40)||40));
  setSequenceObjectives(Array.isArray(preset.sequenceObjectives)&&preset.sequenceObjectives.length?[...preset.sequenceObjectives]:[...DEFAULT_CUSTOM_SEQUENCE]);
  setSequenceScoreMode((preset.sequenceScoreMode||'real') as ChallengeScoreMode);
  setGroupingMin(Math.max(1,Math.min(20,Number(preset.groupingMin||15))));
  setGroupingMax(Math.max(1,Math.min(20,Number(preset.groupingMax||20))));
  setGroupingHits(preset.groupingHits===3?3:2);
  setDoublesBonusTarget(Math.max(1,Math.min(20,Number(preset.doublesBonusTarget||20))));
  setDoublesTargets(Array.isArray(preset.doublesTargets)&&preset.doublesTargets.length?Array.from(new Set(preset.doublesTargets.map(n=>Math.max(1,Math.min(20,Math.round(Number(n)||20)))))):[...DOUBLES_8_TARGETS]);
  setDoublesTargetMode(preset.doublesTargetMode==='custom'?'custom':'official');
  setSoundsEnabled(preset.soundsEnabled!==false);
  setMatchMode(nextMatch);
  setParticipantSource(preset.participantSource==='team'?'team':'direct');
  setMode(opts?.jumpToPlayers?'guided':preset.configMode==='complete'?'complete':'guided');
  if(opts?.resetPlayers){setDirectPlayerIds([]);setTeamSelections({});setTeamPicker(null);setTeamPickerPlayerIds([])}
  if(opts?.jumpToPlayers)setStep(nextMatch?1:0);
 },[]);

 React.useEffect(()=>{
  const trainingPreset = fromTrainingLab ? getChallengeTrainingPreset(trainingPresetId) : null;
  if (trainingPreset) {
    applyPreset({
      target:'20',visits:10,rule:'all',configMode:'complete',matchMode:'solo',
      participantSource:'direct',soundsEnabled:true,exerciseType:'classic',
      clockIncludeBull:true,clockScoreMode:'challenge',halfItStartScore:40,
      sequenceObjectives:[...DEFAULT_CUSTOM_SEQUENCE],sequenceScoreMode:'real',
      groupingMin:15,groupingMax:20,groupingHits:2,
      doublesBonusTarget:20,doublesTargets:[...DOUBLES_8_TARGETS],doublesTargetMode:'official',
      ...trainingPreset.config,
      matchMode:(trainingPreset.minPlayers || 1) > 1 ? 'duo' : 'solo',
    } as ChallengePreset);
    setDirectPlayerIds(trainingOwnerId ? [trainingOwnerId] : []);
    setMode('complete');
  } else if (!fromTrainingLab) {
    const draft=readChallengePreset(CHALLENGE_DRAFT_KEY);
    if(draft)applyPreset(draft,{jumpToPlayers:false,resetPlayers:false});
  }
  setPresetHydrated(true);
 },[applyPreset,fromTrainingLab,trainingPresetId,trainingOwnerId]);

 React.useEffect(()=>{
  if(target==='bull'||target==='bull25'||target==='bull50'){ if(target!=='bull') setTarget('bull'); if(rule!=='bull') setRule('bull'); return; }
  if(target==='any-double'){ if(rule!=='double') setRule('double'); return; }
  if(target==='any-triple'){ if(rule!=='triple') setRule('triple'); return; }
  if(rule==='bull'||rule==='bull25'||rule==='bull50') setRule('all');
 },[target,rule]);

 const currentPreset=React.useMemo<ChallengePreset>(()=>({
  target,visits,rule,configMode:mode,matchMode,participantSource,soundsEnabled,exerciseType,
  catalogChallengeId,catalogLine,catalogVariant,catalogRounds,catalogTarget,catalogStep,catalogMin,catalogMax,catalogLives,
  clockIncludeBull,clockScoreMode,halfItStartScore,sequenceObjectives:[...sequenceObjectives],sequenceScoreMode,
  groupingMin,groupingMax,groupingHits,doublesBonusTarget,doublesTargets:[...doublesTargets],doublesTargetMode
 }),[target,visits,rule,mode,matchMode,participantSource,soundsEnabled,exerciseType,catalogChallengeId,catalogLine,catalogVariant,catalogRounds,catalogTarget,catalogStep,catalogMin,catalogMax,catalogLives,clockIncludeBull,clockScoreMode,halfItStartScore,sequenceObjectives,sequenceScoreMode,groupingMin,groupingMax,groupingHits,doublesBonusTarget,doublesTargets,doublesTargetMode]);

 React.useEffect(()=>{if(presetHydrated && !fromTrainingLab)writeChallengePreset(CHALLENGE_DRAFT_KEY,currentPreset)},[presetHydrated,currentPreset,fromTrainingLab]);

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
 const resolvedDoublesTargets=(doublesTargetMode==='official'?[...DOUBLES_8_TARGETS]:doublesTargets).filter((n,index,self)=>n>=1&&n<=20&&self.indexOf(n)===index);
 const resolvedVisits=exerciseType==='arcade'?Math.max(1,catalogRounds):exerciseType==='jdc'?19:exerciseType==='clock'?(clockIncludeBull?21:20):exerciseType==='doubles8'?(resolvedDoublesTargets.length*3+1):(exerciseType==='half-it'||exerciseType==='sequence'?Math.max(1,resolvedSequence.length):visits);
 const resolvedTarget:ChallengeTarget=exerciseType==='arcade'?String(catalogLine) as ChallengeTarget:exerciseType==='jdc'?'10':exerciseType==='classic'?target:exerciseType==='grouping'?String(Math.min(groupingMin,groupingMax)) as ChallengeTarget:exerciseType==='doubles8'?String(resolvedDoublesTargets[0]||20) as ChallengeTarget:(resolvedSequence[0]&&/^([1-9]|1[0-9]|20)$/.test(String(resolvedSequence[0]))?resolvedSequence[0] as ChallengeTarget:'20');
 const resolvedRule:ChallengeRule=exerciseType==='classic'?rule:exerciseType==='doubles8'?'double':'all';
 const exerciseValid=(exerciseType!=='arcade'||(isArcadeChallengePlayable(catalogChallengeId)&&playerIds.length>=arcadeRuleDetails({catalogChallengeId,catalogLine,catalogVariant,catalogRounds}).minPlayers))&&(exerciseType!=='sequence'||sequenceObjectives.length>0)&&(exerciseType!=='doubles8'||resolvedDoublesTargets.length>0);
 const exerciseSummary=exerciseType==='arcade'?getArcadeChallenge(catalogChallengeId).title:exerciseType==='classic'?`OBJECTIF ${targetText(target)}`:exerciseTitle({target:resolvedTarget,rule:resolvedRule,visits:resolvedVisits,exerciseType,doublesTargets:resolvedDoublesTargets,doublesBonusTarget});
 const arcadeConfig:ArcadePlayConfig={catalogChallengeId,catalogLine,catalogVariant,catalogRounds,catalogTarget,catalogStep,catalogMin,catalogMax,catalogLives};
 const arcadeRule=arcadeRuleDetails(arcadeConfig);
 const exerciseRuleSummary=exerciseType==='arcade'?arcadeRuleDescription(arcadeConfig):exerciseType==='jdc'?'Phase 1 : 10–15 · Phase 2 : D1→D20 + BULL · Phase 3 : 15–20 · SHANGHAI +100':exerciseType==='classic'
  ? `${targetText(target)} · ${resolvedVisits} tours`
  : exerciseType==='clock'
   ? `${clockIncludeBull?'1 → 20 + BULL':'1 → 20'} · ${clockScoreMode==='real'?'valeur réelle':'S=1 · D=2 · T=3'}`
   : exerciseType==='half-it'
    ? `Départ ${halfItStartScore} · échec de volée = score ÷2`
    : exerciseType==='sequence'
     ? `${sequenceObjectives.length} objectifs · ${sequenceScoreMode==='real'?'valeur réelle':'S=1 · D=2 · T=3'}`
     : exerciseType==='doubles8'
      ? `${resolvedDoublesTargets.map(n=>`D${n}`).join(' · ')} · 3 volées chacun · bonus au choix en fin de parcours`
     : `${Math.min(groupingMin,groupingMax)}–${Math.max(groupingMin,groupingMax)} · ${groupingHits} fléchettes minimum sur le même secteur · ${visits} tours`;

 const chooseExercise=(next:ChallengeExerciseType)=>{
  setExerciseType(next);
  if(next==='arcade'){setRule('all');setTarget('20');}
  if(next==='jdc'){setRule('all');setTarget('10');}
  if(next==='clock'){setClockIncludeBull(true);setClockScoreMode('challenge');}
  if(next==='half-it'){setHalfItStartScore(40);}
  if(next==='sequence'&&!sequenceObjectives.length)setSequenceObjectives([...DEFAULT_CUSTOM_SEQUENCE]);
  if(next==='grouping'){setRule('all');}
  if(next==='doubles8'){setRule('double');setDoublesBonusTarget(20);setDoublesTargetMode('official');setDoublesTargets([...DOUBLES_8_TARGETS]);}
 };

 const chooseUnifiedMode=(choice:UnifiedChallengeMode)=>{
  if(choice.exerciseType==='arcade'){setCatalogChallengeId(choice.arcadeId||'perfect-line');setCatalogRounds(choice.arcadeId==='snake'?20:choice.arcadeId==='contracts'?3:choice.arcadeId==='bounty-hunt'?5:5);setCatalogVariant('classic');}
  chooseExercise(choice.exerciseType);
 };
 const activeChoice=selectedChallengeMode(exerciseType,catalogChallengeId);
 const previewChoice=CHALLENGE_MODE_OPTIONS.find(choice=>choice.id===previewChoiceId)||null;
 const previewGuide=previewChoice?buildChallengeGuide(previewChoice,{target,rule,visits,clockIncludeBull,clockScoreMode,halfItStartScore,sequenceObjectives,sequenceScoreMode,groupingMin,groupingMax,groupingHits,doublesBonusTarget,doublesTargets,doublesTargetMode,arcadeConfig:previewChoice.exerciseType==='arcade'?{...arcadeConfig,catalogChallengeId:previewChoice.arcadeId||arcadeConfig.catalogChallengeId}:arcadeConfig}):null;
 const focusedChoice=CHALLENGE_MODE_OPTIONS.find(choice=>choice.id===focusedChoiceId)||null;
 const archiveProfileId=playerIds.length===1?playerIds[0]:(activeProfileId||null);
 const archiveProfileName=profiles.find(p=>String(p.id)===String(archiveProfileId))?.name||null;
 const searchTerm=catalogSearch.trim().toLocaleLowerCase();
 const filteredChoices=CHALLENGE_MODE_OPTIONS.filter(choice=>
  (catalogFamily==='TOUS'||choice.family===catalogFamily) &&
  (!searchTerm||[choice.title,choice.description,choice.family].join(' ').toLocaleLowerCase().includes(searchTerm))
 );

 const replayPreset=(preset:ChallengePreset|null)=>{setFocusedChoiceId(null);setPreviewChoiceId(null);applyPreset(preset,{jumpToPlayers:true,resetPlayers:true});};
 const saveFavorite=()=>{writeChallengePreset(CHALLENGE_FAVORITE_KEY,currentPreset);setFavoritePreset(currentPreset)};

 const start=()=>{
  if(!matchMode||!selectionValid||!exerciseValid||(exerciseType==='arcade'&&playerIds.length<arcadeRule.minPlayers)) return;
  if (!fromTrainingLab) {
    writeChallengePreset(CHALLENGE_LAST_PLAYED_KEY,currentPreset);
    setLastPlayedPreset(currentPreset);
    try{recordProfileUsageForMode('challenge',playerIds)}catch{}
  }
  go('challenge_play',{config:{
   target:resolvedTarget,visits:resolvedVisits,rule:resolvedRule,
   exerciseType,
   catalogChallengeId,catalogLine,catalogVariant,catalogRounds,catalogTarget,catalogStep,catalogMin,catalogMax,catalogLives,
   clockIncludeBull,
   clockScoreMode,
   halfItStartScore,
   sequenceObjectives:resolvedSequence,
   sequenceScoreMode,
   groupingMin:Math.min(groupingMin,groupingMax),
   groupingMax:Math.max(groupingMin,groupingMax),
   groupingHits,
   doublesBonusTarget,
   doublesTargets:resolvedDoublesTargets,
   doublesTargetMode,
   playerIds,
   teamIds:participantSource==='team'?teamIds:[],
   participantMode:'players',
   participantSource,
   configMode:mode,
   matchMode,
   soundsEnabled,
   ...(fromTrainingLab ? { trainingOrigin:'training_lab' as const, trainingCatalogPresetId:exerciseType==='arcade' ? (CHALLENGE_TRAINING_ARCADE_CATALOG.find(row => row.arcadeId === catalogChallengeId)?.id || trainingPresetId) : trainingPresetId, trainingOwnerId } : {})
  } satisfies ChallengeConfigData, ...(fromTrainingLab ? { fromTrainingLab:true } : {})});
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

 const exerciseStage=<Section title="CHOISIR UN CHALLENGE" subtitle="Tous les challenges, anciens et nouveaux, réunis par catégorie. Sélectionnez une carte pour afficher ses réglages et ses règles." key="exercise">
  {focusedChoice ? <div className="challenge-unified-focused" aria-live="polite">
    <button type="button" className="challenge-focused-back" onClick={()=>setFocusedChoiceId(null)}>← RETOUR AUX DÉFIS</button>
    <div className="challenge-focused-heading"><span aria-hidden="true">{focusedChoice.icon}</span><div><small>{focusedChoice.family} · CHALLENGE RETENU</small><h3>{focusedChoice.title}</h3><p>{focusedChoice.description}</p></div></div>
    <button type="button" className="challenge-focused-records" onClick={()=>setPreviewChoiceId(focusedChoice.id)}>🏆 DERNIERS SCORES · RECORDS · PARTIES JOUÉES</button>
    <p className="challenge-focused-hint">Les autres cartes sont masquées. Poursuis avec les réglages de ce défi ou reviens à la liste.</p>
   </div> : <>
  <div className="challenge-unified-tools">
   <label className="challenge-unified-search"><span>RECHERCHER UN DÉFI</span><input type="search" placeholder="Nom, règle ou catégorie…" value={catalogSearch} onChange={e=>setCatalogSearch(e.target.value)} aria-label="Rechercher un challenge"/></label>
   <div className="challenge-unified-filters" role="group" aria-label="Filtrer par catégorie">
    {(['TOUS',...CHALLENGE_MODE_FAMILIES] as string[]).map(family=><button type="button" key={family} className={catalogFamily===family?'on':''} aria-pressed={catalogFamily===family} onClick={()=>setCatalogFamily(family)}>{family==='TOUS'?'TOUS LES DÉFIS':family}</button>)}
   </div>
   <div className="challenge-unified-count"><b>{filteredChoices.length}</b> CHALLENGE{filteredChoices.length>1?'S':''} AFFICHÉ{filteredChoices.length>1?'S':''}<span>DISPONIBLE · APERÇU · À VENIR</span></div>
  </div>
  <div className="challenge-unified-families">
   {CHALLENGE_MODE_FAMILIES.map(family=>{
    const choices=filteredChoices.filter(item=>item.family===family);
    if(!choices.length)return null;
    return <section className="challenge-unified-family" key={family} aria-label={family}>
     <div className="challenge-family-heading"><h3>{family}</h3><span>{choices.length} DÉFI{choices.length>1?'S':''}</span></div>
     <div className="challenge-unified-grid">
      {choices.map(choice=>{
       const selected=exerciseType===choice.exerciseType&&(choice.exerciseType!=='arcade'||catalogChallengeId===choice.arcadeId);
       const stateLabel=choice.state==='available'?'DISPONIBLE':choice.state==='preview'?'APERÇU JOUABLE':'À VENIR';
       return <button type="button" key={choice.id} className={'challenge-unified-tile '+(selected?'on ':'')+choice.state} aria-pressed={selected} onClick={()=>setPreviewChoiceId(choice.id)} title={'Voir la fiche et les records de '+choice.title}>
        <i aria-hidden="true">{choice.icon}</i><span className="challenge-unified-tile-text"><b>{choice.title}</b><small>{choice.description}</small><em>{stateLabel}</em></span>
       </button>;
      })}
     </div>
    </section>;
   })}
   {!filteredChoices.length&&<div className="locked-hint">Aucun challenge trouvé. Effacez la recherche ou choisissez une autre catégorie.</div>}
  </div>
  {activeChoice&&<div className="challenge-unified-selection">
    <div><small>CHALLENGE SÉLECTIONNÉ</small><b>{activeChoice.title}</b><span>{activeChoice.family} · {activeChoice.state==='available'?'DISPONIBLE':activeChoice.state==='preview'?'APERÇU JOUABLE':'EN DÉVELOPPEMENT'}</span></div>
    {activeChoice.state==='planned'&&<p>Ce défi est présenté pour découvrir ses règles, mais son moteur n'est pas encore jouable.</p>}
  </div>}
  </>}
 </Section>;

 const targetStage=<Section title="CIBLE" subtitle="Choisissez un secteur précis ou un Challenge sur tous les doubles / triples." key="target"><div className="target-grid"><button type="button" className={'target-btn family '+(target==='any-double'?'on':'')} onClick={()=>{setTarget('any-double');setRule('double')}}><span className="target-thumb"><img src={getChallengeObjectiveImage('any-double')} alt=""/></span><b>DOUBLES</b></button><button type="button" className={'target-btn family '+(target==='any-triple'?'on':'')} onClick={()=>{setTarget('any-triple');setRule('triple')}}><span className="target-thumb"><img src={getChallengeObjectiveImage('any-triple')} alt=""/></span><b>TRIPLES</b></button>{[...Array.from({length:20},(_,i)=>String(i+1)),'bull'].map(x=><button type="button" key={x} className={'target-btn '+(target===x?'on':'')} onClick={()=>{setTarget(x as ChallengeTarget);if(x==='bull')setRule('bull')}}><span className="target-thumb"><img src={getChallengeObjectiveImage(x)} alt=""/></span><b>{x==='bull'?'BULL':x}</b></button>)}</div>{familyMode&&<div className="locked-hint">KEYPAD X01 DÉTAILLÉ · chaque D1–D20 / T1–T20 est enregistré · égalité départagée par la somme des numéros touchés.</div>}</Section>;
 const visitsStage=<Section title="NOMBRE DE TOURS" subtitle="Chaque tour comprend jusqu’à 3 fléchettes par joueur." key="visits"><div className="visit-grid">{[5,10,15,20,30,50,100].map(n=><button type="button" key={n} className={'arcade-choice '+(visits===n?'on':'')} onClick={()=>setVisits(n)}>{n}</button>)}</div><label className="custom-visits"><span>PERSONNALISÉ</span><input type="number" min={1} max={999} inputMode="numeric" value={visits} onChange={e=>setVisits(Math.max(1,Math.min(999,Number(e.target.value)||1)))}/><small>1 à 999 tours</small></label><div className="hint">{visits} tours • {visits*3} fléchettes maximum par joueur</div></Section>;
 const ruleStage=<Section title="OBJECTIF" subtitle="Déterminez quels impacts rapportent des points." key="rule">{target==='bull'?<div className="locked-hint"><b>BULL</b> · Bull 25 = 1 point · Bull 50 = 2 points · MISS = 0</div>:familyMode?<div className="locked-hint"><b>{target==='any-double'?'DOUBLES':'TRIPLES'}</b> · chaque touche valide rapporte 1 point, le numéro sert au départage.</div>:<div className="rule-grid">{rules.map(([id,label,detail])=><button type="button" key={id} className={'rule-btn '+(rule===id?'on':'')} onClick={()=>setRule(id)}><b>{label}</b><span>{detail}</span></button>)}</div>}</Section>;

 const clockStage=<Section title="HORLOGE 1 → 20" subtitle="Chaque volée avance automatiquement au secteur suivant." key="clock"><div className="advanced-grid"><div className="advanced-block"><h3>FIN DE PARCOURS</h3><div className="binary-row"><button type="button" className={clockIncludeBull?'on':''} onClick={()=>setClockIncludeBull(true)}>1 → 20 + BULL</button><button type="button" className={!clockIncludeBull?'on':''} onClick={()=>setClockIncludeBull(false)}>1 → 20</button></div></div><div className="advanced-block"><h3>CALCUL DES POINTS</h3><div className="binary-row"><button type="button" className={clockScoreMode==='challenge'?'on':''} onClick={()=>setClockScoreMode('challenge')}><b>CHALLENGE</b><small>S=1 · D=2 · T=3</small></button><button type="button" className={clockScoreMode==='real'?'on':''} onClick={()=>setClockScoreMode('real')}><b>VALEUR RÉELLE</b><small>S20=20 · D20=40 · T20=60</small></button></div></div></div><div className="locked-hint">{clockIncludeBull?'21':'20'} tours · l’objectif change automatiquement après chaque volée.</div></Section>;

 const halfItStage=<Section title="HALF-IT" subtitle="Le parcours de l’exercice est prêt à jouer ; seuls le score de départ et les joueurs restent à choisir." key="halfit"><div className="sequence-preview">{DEFAULT_HALF_IT_SEQUENCE.map((item,i)=><span key={`${item}-${i}`}><b>{i+1}</b>{objectiveLabel(item)}</span>)}</div><div className="advanced-block compact"><h3>SCORE DE DÉPART</h3><div className="visit-grid half-start">{[20,40,60,80,100].map(n=><button type="button" key={n} className={'arcade-choice '+(halfItStartScore===n?'on':'')} onClick={()=>setHalfItStartScore(n)}>{n}</button>)}</div></div><div className="locked-hint">À chaque tour : si aucune des 3 fléchettes ne valide l’objectif, le score est divisé par 2 et arrondi au supérieur. Les touches valides utilisent leur valeur réelle.</div></Section>;

 const sequenceStage=<Section title="SÉQUENCE PERSONNALISÉE" subtitle="Ajoutez les objectifs dans l’ordre où ils devront être joués." key="sequence"><div className="sequence-editor"><div className="sequence-preview editable">{sequenceObjectives.map((item,i)=><span key={`${item}-${i}`}><b>{i+1}</b>{objectiveLabel(item)}<button type="button" aria-label="Retirer" onClick={()=>setSequenceObjectives(prev=>prev.filter((_,index)=>index!==i))}>×</button></span>)}</div><div className="sequence-add"><select value={sequencePicker} onChange={e=>setSequencePicker(e.target.value as ChallengeObjectiveToken)}>{Array.from({length:20},(_,i)=>String(i+1)).map(x=><option key={x} value={x}>SECTEUR {x}</option>)}<option value="any-double">DOUBLE LIBRE</option><option value="any-triple">TRIPLE LIBRE</option><option value="bull">BULL</option></select><button type="button" onClick={()=>setSequenceObjectives(prev=>[...prev,sequencePicker])}>+ AJOUTER</button><button type="button" onClick={()=>setSequenceObjectives([...DEFAULT_CUSTOM_SEQUENCE])}>PRESET</button><button type="button" className="danger" onClick={()=>setSequenceObjectives([])}>VIDER</button></div></div><div className="advanced-block compact"><h3>CALCUL DES POINTS</h3><div className="binary-row"><button type="button" className={sequenceScoreMode==='real'?'on':''} onClick={()=>setSequenceScoreMode('real')}>VALEUR RÉELLE</button><button type="button" className={sequenceScoreMode==='challenge'?'on':''} onClick={()=>setSequenceScoreMode('challenge')}>S=1 · D=2 · T=3</button></div></div>{!sequenceObjectives.length&&<div className="selection-status ko"><span>!</span><b>Ajoutez au moins un objectif à la séquence.</b></div>}</Section>;

 const doubles8Stage=<Section title="DOUBLES · 9 FLÉCHETTES PAR CIBLE" subtitle="Pour chaque double : 3 volées de 3 fléchettes. Barème par volée : 1 touche = 10 pts · 2 = 30 pts · 3 = 100 pts." key="doubles8"><div className="advanced-block"><h3>VARIANTE</h3><div className="binary-row"><button type="button" className={doublesTargetMode==='official'?'on':''} onClick={()=>{setDoublesTargetMode('official');setDoublesTargets([...DOUBLES_8_TARGETS])}}><b>OFFICIEL · 8 DOUBLES</b><small>D20 · D18 · D16 · D12 · D10 · D8 · D4 · D2</small></button><button type="button" className={doublesTargetMode==='custom'?'on':''} onClick={()=>setDoublesTargetMode('custom')}><b>PERSONNALISÉ</b><small>Choisissez librement vos doubles et leur ordre</small></button></div></div>{doublesTargetMode==='custom'&&<div className="advanced-block compact"><h3>DOUBLES À JOUER · APPUYEZ DANS L’ORDRE DU PARCOURS</h3><div className="double-target-grid">{Array.from({length:20},(_,i)=>i+1).map(n=>{const index=doublesTargets.indexOf(n);return <button type="button" key={n} className={index>=0?'on':''} onClick={()=>setDoublesTargets(prev=>prev.includes(n)?prev.filter(x=>x!==n):[...prev,n])}><b>D{n}</b>{index>=0?<small>#{index+1}</small>:null}</button>})}</div><div className="double-target-actions"><button type="button" onClick={()=>setDoublesTargets([...DOUBLES_8_TARGETS])}>PRESET 8 DOUBLES</button><button type="button" className="danger" onClick={()=>setDoublesTargets([])}>VIDER</button></div></div>}<div className="sequence-preview">{resolvedDoublesTargets.map((item,i)=><span key={`${item}-${i}`}><b>{i+1}</b>D{item}</span>)}</div>{!resolvedDoublesTargets.length&&<div className="selection-status ko"><span>!</span><b>Choisissez au moins un double.</b></div>}<div className="advanced-block compact"><h3>VOLÉE BONUS</h3><div className="locked-hint">Le double bonus n’est plus fixé ici. Après la dernière volée du parcours, chaque joueur choisit son double bonus parmi les doubles réellement joués.</div></div><div className="grouping-example"><b>BONUS FINAL</b><span>1 seule volée sur le double choisi en fin de parcours → <strong>+50 pts par touche</strong></span><small>{resolvedDoublesTargets.length*3} volées sur {resolvedDoublesTargets.length} double{resolvedDoublesTargets.length>1?'s':''} + 1 bonus = {resolvedVisits*3} fléchettes maximum. Score théorique maximal : {resolvedDoublesTargets.length*300+150} points.</small></div></Section>;

 const groupingStage=<Section title="GROUPEMENT" subtitle="Une volée ne marque que si le même secteur autorisé reçoit le nombre minimal de fléchettes." key="grouping"><div className="grouping-presets"><button type="button" onClick={()=>{setGroupingMin(15);setGroupingMax(20);setGroupingHits(2)}}>15–20 · ×2</button><button type="button" onClick={()=>{setGroupingMin(1);setGroupingMax(20);setGroupingHits(2)}}>1–20 · ×2</button><button type="button" onClick={()=>{setGroupingMin(15);setGroupingMax(20);setGroupingHits(3)}}>15–20 · ×3</button></div><div className="grouping-config"><div className="advanced-block"><h3>FOURCHETTE DE SECTEURS</h3><div className="range-select"><label>DE <select value={groupingMin} onChange={e=>setGroupingMin(Number(e.target.value))}>{Array.from({length:20},(_,i)=>i+1).map(n=><option key={n} value={n}>{n}</option>)}</select></label><span>→</span><label>À <select value={groupingMax} onChange={e=>setGroupingMax(Number(e.target.value))}>{Array.from({length:20},(_,i)=>i+1).map(n=><option key={n} value={n}>{n}</option>)}</select></label></div></div><div className="advanced-block"><h3>VALIDATION DE LA VOLÉE</h3><div className="binary-row"><button type="button" className={groupingHits===2?'on':''} onClick={()=>setGroupingHits(2)}><b>2 FLÉCHETTES</b><small>minimum dans le même secteur</small></button><button type="button" className={groupingHits===3?'on':''} onClick={()=>setGroupingHits(3)}><b>3 FLÉCHETTES</b><small>triplet obligatoire</small></button></div></div></div><div className="grouping-example"><b>EXEMPLE</b><span>D18 + S18 + T20 → <strong>54 pts</strong></span><small>Le D18 et le S18 valident le secteur 18. Le T20 isolé ne compte pas.</small></div></Section>;

 const audioStage=<Section title="SONS CHALLENGE" subtitle="Jingle d’intro, impacts S / D / T / MISS et musique de fin de partie." key="audio"><div className="audio-toggle-row"><button type="button" className={soundsEnabled?'on':''} onClick={()=>toggleChallengeSounds(true)}><b>SONS ON</b><span>Jingles et impacts activés</span></button><button type="button" className={!soundsEnabled?'on off':''} onClick={()=>toggleChallengeSounds(false)}><b>SONS OFF</b><span>Challenge totalement silencieux</span></button></div></Section>;

 const jdcStage=<Section title="LE JDC CHALLENGE" subtitle="3 phases · 19 volées · 57 fléchettes" key="jdc">
  <div className="jdc-guide" aria-label="Règles et déroulement du JDC Challenge">
   <div className="jdc-guide-intro">
    <span className="jdc-guide-intro-title"><span className="jdc-guide-intro-symbol" aria-hidden="true"><BottomNavIcon name="tournaments" size={20}/></span><span>PARCOURS DU CHALLENGE</span></span>
    <div className="jdc-guide-metrics" aria-label="3 phases, 19 volées, 57 fléchettes">
     <span><b>03</b><small>PHASES</small></span>
     <span><b>19</b><small>VOLÉES</small></span>
     <span><b>57</b><small>FLÉCHETTES</small></span>
    </div>
   </div>
   <div className="jdc-guide-steps">
    <article className="jdc-guide-phase jdc-guide-phase--blue">
     <div className="jdc-guide-phase-head">
      <span className="jdc-guide-index" aria-label="Phase 1"><BottomNavIcon name="games" size={20}/><small>01</small></span>
      <div className="jdc-guide-phase-heading"><span className="jdc-guide-eyebrow">PHASE 1 · PRÉCISION</span><h3>LES SECTEURS 10 À 15</h3></div>
      <span className="jdc-guide-count">6 VOLÉES</span>
     </div>
     <div className="jdc-guide-targets" aria-label="Une volée par secteur de 10 à 15">{[10,11,12,13,14,15].map(value=><span key={value}>{value}</span>)}</div>
     <div className="jdc-guide-rule"><span className="jdc-guide-rule-icon" aria-hidden="true"><BottomNavIcon name="games" size={18}/></span><p><strong>3 fléchettes par secteur.</strong> Chaque S, D ou T rapporte sa <strong>valeur réelle</strong>.</p></div>
     <div className="jdc-guide-bonus"><span className="jdc-guide-bonus-icon" aria-hidden="true"><BottomNavIcon name="tournaments" size={18}/></span><div><b>SHANGHAI <strong>+100 PTS</strong></b><small>Un simple + un double + un triple du secteur dans la même volée.</small></div></div>
    </article>
    <div className="jdc-guide-connector" aria-hidden="true"><span><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M12 4v16m-6-6 6 6 6-6"/></svg></span></div>
    <article className="jdc-guide-phase jdc-guide-phase--red">
     <div className="jdc-guide-phase-head">
      <span className="jdc-guide-index" aria-label="Phase 2"><BottomNavIcon name="tournaments" size={20}/><small>02</small></span>
      <div className="jdc-guide-phase-heading"><span className="jdc-guide-eyebrow">PHASE 2 · ADRESSE</span><h3>LE TOUR DES DOUBLES</h3></div>
      <span className="jdc-guide-count">7 VOLÉES</span>
     </div>
     <div className="jdc-guide-path" aria-label="D1 à D20 puis Bull rouge"><span>D1</span><i>→</i><span>D2</span><i>→</i><span className="jdc-guide-ellipsis">···</span><i>→</i><span>D20</span><i>→</i><span className="jdc-guide-bull">BULL</span></div>
     <div className="jdc-guide-rule"><span className="jdc-guide-rule-icon" aria-hidden="true"><BottomNavIcon name="games" size={18}/></span><p><strong>1 seule fléchette par double</strong>, dans l’ordre. La cible change après chaque lancer. Termine par le <strong>Bull rouge (50)</strong>.</p></div>
     <div className="jdc-guide-payouts"><span><strong>+50</strong><small>PAR DOUBLE TOUCHÉ</small></span><span className="jdc-guide-payouts-bull"><strong>+100</strong><small>SI BULL ROUGE</small></span></div>
    </article>
    <div className="jdc-guide-connector" aria-hidden="true"><span><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M12 4v16m-6-6 6 6 6-6"/></svg></span></div>
    <article className="jdc-guide-phase jdc-guide-phase--blue">
     <div className="jdc-guide-phase-head">
      <span className="jdc-guide-index" aria-label="Phase 3"><BottomNavIcon name="stats" size={20}/><small>03</small></span>
      <div className="jdc-guide-phase-heading"><span className="jdc-guide-eyebrow">PHASE 3 · FINISH</span><h3>LES SECTEURS 15 À 20</h3></div>
      <span className="jdc-guide-count">6 VOLÉES</span>
     </div>
     <div className="jdc-guide-targets" aria-label="Une volée par secteur de 15 à 20">{[15,16,17,18,19,20].map(value=><span key={value}>{value}</span>)}</div>
     <div className="jdc-guide-rule"><span className="jdc-guide-rule-icon" aria-hidden="true"><BottomNavIcon name="games" size={18}/></span><p><strong>3 fléchettes par secteur.</strong> Même règle que la phase 1 : points réels pour S, D et T.</p></div>
     <div className="jdc-guide-bonus"><span className="jdc-guide-bonus-icon" aria-hidden="true"><BottomNavIcon name="tournaments" size={18}/></span><div><b>SHANGHAI <strong>+100 PTS</strong></b><small>Simple + double + triple sur le même secteur.</small></div></div>
    </article>
   </div>
   <div className="jdc-guide-finale"><span className="jdc-guide-finale-icon" aria-hidden="true"><BottomNavIcon name="stats" size={22}/></span><div><small>CLASSEMENT FINAL · TOTAL DES TROIS PHASES</small><strong>À TOI DE BATTRE LE RECORD !</strong></div><span className="jdc-guide-max"><b>3 380</b><small>PTS MAX</small></span></div>
  </div>
 </Section>;
 const arcadeStage=<Section title="RÈGLES ET PARAMÈTRES" subtitle="Mêmes étapes de configuration que les autres challenges, adaptées à chaque règle." key="arcade">
  <div className="challenge-catalog-options">
   <h3>{getArcadeChallenge(catalogChallengeId).title}</h3>
   <p>{arcadeRuleDescription(arcadeConfig)}</p>
   <div className="challenge-catalog-config">
    {arcadeRule.usesLine&&<label>NUMÉRO INITIAL<select value={catalogLine} onChange={e=>setCatalogLine(Number(e.target.value))}>{Array.from({length:20},(_,i)=><option key={i+1} value={i+1}>{i+1}</option>)}</select></label>}
    {arcadeRule.usesRounds&&<label>{arcadeRule.roundUnit}<select value={catalogRounds} onChange={e=>setCatalogRounds(Number(e.target.value))}>{[1,2,3,5,7,10,15,20].map(n=><option value={n} key={n}>{n}</option>)}</select></label>}
    {arcadeRule.usesVariant&&<label>DIFFICULTÉ / ZONE<select value={catalogVariant} onChange={e=>setCatalogVariant(e.target.value as ArcadeVariant)}><option value="classic">SIMPLES / CLASSIQUE</option><option value="doubles">DOUBLES</option><option value="triples">TRIPLES / EXPERT</option></select></label>}
    {arcadeRule.usesTarget&&<label>SCORE CIBLE<select value={catalogTarget} onChange={e=>setCatalogTarget(Number(e.target.value))}>{[20,40,50,60,70,80,90,100,110,120,130,140,150,160,170,180].map(n=><option value={n} key={n}>{n} PTS</option>)}</select></label>}
    {arcadeRule.usesRange&&<><label>SCORE MINIMUM<select value={catalogMin} onChange={e=>setCatalogMin(Number(e.target.value))}>{[20,40,50,60,70,80,90,100,110,120].map(n=><option value={n} key={n}>{n} PTS</option>)}</select></label><label>SCORE MAXIMUM<select value={catalogMax} onChange={e=>setCatalogMax(Number(e.target.value))}>{[30,40,50,60,70,80,90,100,110,120,140,160,180].map(n=><option value={n} key={n}>{n} PTS</option>)}</select></label></>}
    {arcadeRule.usesStep&&<label>SECTEURS À SAUTER<select value={catalogStep} onChange={e=>setCatalogStep(Number(e.target.value))}>{Array.from({length:10},(_,i)=><option key={i+1} value={i+1}>{i+1}</option>)}</select></label>}
    {arcadeRule.usesLives&&<label>VIES<select value={catalogLives} onChange={e=>setCatalogLives(Number(e.target.value))}>{[1,3,5,7,10].map(n=><option key={n} value={n}>{n} VIES</option>)}</select></label>}
   </div>
   {arcadeRule.minPlayers>1&&<div className="locked-hint">MODE MULTIJOUEURS · {arcadeRule.minPlayers} JOUEURS MINIMUM. Sélectionne DUO ou MULTI à l’étape FORMAT.</div>}
   {!isArcadeChallengePlayable(catalogChallengeId)&&<div className="locked-hint">Défi en développement — lancement verrouillé.</div>}
   <div className="locked-hint"><b>RÈGLE :</b> {arcadeRule.hint}</div>
  </div>
 </Section>;
 const exerciseSettings=exerciseType==='arcade'?[arcadeStage]:exerciseType==='jdc'?[jdcStage]:exerciseType==='classic'?[targetStage,visitsStage,ruleStage]:exerciseType==='clock'?[clockStage]:exerciseType==='half-it'?[halfItStage]:exerciseType==='sequence'?[sequenceStage]:exerciseType==='doubles8'?[doubles8Stage]:[visitsStage,groupingStage];
 const stages=[formatStage,playersStage,exerciseStage,...exerciseSettings,audioStage];
 const stepLabels=['FORMAT','JOUEURS','EXERCICE',...(exerciseType==='arcade'?['RÈGLES']:exerciseType==='classic'?['CIBLE','TOURS','OBJECTIF']:exerciseType==='clock'?['HORLOGE']:exerciseType==='half-it'?['HALF-IT']:exerciseType==='sequence'?['SÉQUENCE']:exerciseType==='doubles8'?['8 DOUBLES']:exerciseType==='jdc'?['JDC']: ['TOURS','GROUPEMENT']),'SONS'];
 const currentStepValid=step===0?Boolean(matchMode):step===1?selectionValid&&!(exerciseType==='arcade'&&playerIds.length<arcadeRule.minPlayers):(step===3&&exerciseType==='arcade'&&!isArcadeChallengePlayable(catalogChallengeId))?false:(exerciseType==='sequence'&&step===3?sequenceObjectives.length>0:true);
 React.useEffect(()=>{setStep(prev=>Math.min(prev,Math.max(0,stages.length-1)))},[exerciseType,stages.length]);
 const shown=mode==='complete'?stages:[stages[step]];
 const pickerMembers=teamPicker?(Array.isArray(teamPicker.playerIds)?teamPicker.playerIds.map(String):[]):[];


 // La fiche est un écran à part entière : ne jamais la rendre après la configuration.
 if(previewChoice) return <div className="challenge-config challenge-preview-screen" style={{background:theme.bg,color:theme.text}}>
  <header className="challenge-head">
   <img src="/challenge/ticker_challenge.png" alt="Challenge"/>
   <div className="challenge-back"><BackDot onClick={()=>{setInsightView(null);setPreviewChoiceId(null)}} size={44} color="#36e9ff" glow="#36e9ff77"/></div>
   <button className="challenge-awena" type="button" aria-label="Ouvrir Awena" title="Awena" onClick={()=>awena?.openPanel?.()}><span><img src="/awena/awena-avatar.webp" alt="Awena"/></span><i aria-hidden>🎙</i></button>
  </header>
  <main className="challenge-preview-main">
   <section className="challenge-preview-card" aria-labelledby="mss-challenge-preview-title">
    <header className="challenge-preview-heading">
     <div><small>{previewChoice.family} · FICHE CHALLENGE</small><h1 id="mss-challenge-preview-title">{previewChoice.title}</h1></div>
     <button type="button" className="challenge-preview-return" onClick={()=>{setInsightView(null);setPreviewChoiceId(null)}}>← RETOUR AUX DÉFIS</button>
    </header>
    <p className="mss-challenge-preview-intro">{previewChoice.description}</p>
    {previewGuide&&<div className="mss-cg-guide" aria-label="Détail du challenge">
      <ChallengeGuideInfo badges={previewGuide.badges} title={previewChoice.title} intro={previewGuide.intro}
       onAskAwena={()=>{const configured=previewGuide.badges.join(' ; ');awena?.openPanel?.();void awena?.ask?.(`Explique les règles du challenge « ${previewChoice.title} » avec ces réglages : ${configured}.`,{canonicalFrench:true,modeTopic:'rules',speak:true});}}/>
      <div className="mss-cg-timeline">
       {previewGuide.steps.map((item,index)=><article className="mss-cg-step" key={item.eyebrow+item.title}>
        <span className="mss-cg-index" aria-hidden="true">{index+1}</span>
        <div className="mss-cg-step-body">
         <small>{item.eyebrow}</small>
         <h3>{item.title}</h3>
         <p>{item.text}</p>
         {item.bullets?.length?<ChallengeGuideTiles badges={item.bullets} compact/>:null}
        </div>
       </article>)}
      </div>
      <div className="mss-cg-footer">
       <span aria-hidden="true">🏁</span>
       <div><small>OBJECTIF DU DÉFI</small><b>{previewGuide.footer}</b></div>
      </div>
    </div>}
    <div className="mss-cg-insight-actions" aria-label="Voir les données du challenge">
     <button type="button" onClick={()=>setInsightView('stats')}><BottomNavIcon name="stats" size={24}/><span><b>STATISTIQUES</b><small>Courbes, précision, évolution et dernières parties</small></span></button>
     <button type="button" onClick={()=>setInsightView('records')}><BottomNavIcon name="tournaments" size={24}/><span><b>RECORDS</b><small>Records par configuration et progression personnelle</small></span></button>
    </div>
    <div className="mss-ca-actions"><button type="button" onClick={()=>setPreviewChoiceId(null)}>← RETOUR AUX DÉFIS</button><button type="button" className="primary" disabled={previewChoice.state==='planned'} onClick={()=>{const choice=previewChoice;chooseUnifiedMode(choice);setFocusedChoiceId(choice.id);setPreviewChoiceId(null);if(mode==='guided')setStep(2);}}>▶ RELEVER LE DÉFI</button></div>
    {previewChoice.state==='planned'&&<p className="mss-ca-muted">Défi en développement : impossible à lancer tant que son moteur n'est pas validé.</p>}

   </section>
  </main>
  {insightView&&previewChoice&&<ChallengeInsightsPage modeId={previewChoice.id} modeTitle={previewChoice.title}
   playerId={archiveProfileId} playerName={archiveProfileName} initialView={insightView} onClose={()=>setInsightView(null)}/>}
  <style>{css(primary)}</style>
 </div>;

 return <div className="challenge-config" style={{background:theme.bg,color:theme.text}}>
  <header className="challenge-head">
   <img src="/challenge/ticker_challenge.png" alt="Challenge"/>
   <div className="challenge-back"><BackDot onClick={()=>fromTrainingLab?go('training_mode',{modeId:'training_lab',challengeCatalog:true}):go('games')} size={44} color="#36e9ff" glow="#36e9ff77"/></div>
   <button className="challenge-awena" type="button" aria-label="Ouvrir Awena" title="Awena" onClick={()=>awena?.openPanel?.()}><span><img src="/awena/awena-avatar.webp" alt="Awena"/></span><i aria-hidden>🎙</i></button>
  </header>
  <main className="config-wrap">
   <section className="config-overview">
    <div className="overview-copy"><small>CONFIGURATION CHALLENGE</small><div className="mode-row"><button type="button" className={mode==='guided'?'on':''} onClick={()=>{setMode('guided');setStep(0)}}>GUIDÉE</button><button type="button" className={mode==='complete'?'on':''} onClick={()=>setMode('complete')}>COMPLÈTE</button></div><p>{mode==='guided'?'Configuration compacte, étape par étape, dans le même esprit que X01.':'Tous les réglages sont accessibles sur une seule page.'}</p>{!fromTrainingLab && <button type="button" className="challenge-leaderboard-access" onClick={()=>go('challenge_leaderboard',{from:'challenge_config'})}><span>🏆</span><b>CLASSEMENTS ONLINE</b><small>Meilleurs scores · filtres · équipes officielles</small></button>}</div>
    <div className="summary"><b>{matchMode?matchMode.toUpperCase():'—'}</b><span>{playerIds.length} JOUEUR{playerIds.length>1?'S':''}</span><span>{exerciseSummary}</span><span>{exerciseType==='arcade'?arcadeRule.roundUnit+' · '+catalogRounds:resolvedVisits+' TOURS'}</span><span>SONS {soundsEnabled?'ON':'OFF'}</span></div>
   </section>
   {(lastPlayedPreset||favoritePreset)&&<section className="quick-presets" aria-label="Raccourcis Challenge">
    {lastPlayedPreset&&<button type="button" className="quick-preset last" onClick={()=>replayPreset(lastPlayedPreset)}><i>↻</i><span><small>DERNIER CHALLENGE</small><b>{presetDescriptor(lastPlayedPreset)}</b><em>Réglages chargés · choisissez joueurs ou équipes</em></span><strong>REJOUER</strong></button>}
    {favoritePreset&&<button type="button" className="quick-preset favorite" onClick={()=>replayPreset(favoritePreset)}><i>★</i><span><small>CHALLENGE PRÉFÉRÉ</small><b>{presetDescriptor(favoritePreset)}</b><em>Configuration favorite · choisissez les participants</em></span><strong>PRÉPARER</strong></button>}
   </section>}
   {mode==='guided'&&<section className="progress-card"><div><strong>CONFIGURATION GUIDÉE</strong><span>Étape {step+1}/{stages.length} • {stepLabels[step]}</span></div><div className="steps">{stepLabels.map((label,i)=><button type="button" onClick={()=>{if(i<=step||currentStepValid)setStep(i)}} className={i===step?'on':i<step?'done':''} key={label}><b>{i+1}</b><span>{label}</span></button>)}</div></section>}
   <div className={mode==='complete'?'complete-grid':'guided-stage'}>{shown}</div>
   <section className="launch-preview" aria-label="Résumé du challenge"><span><small>{exerciseValid?'PRÊT À JOUER':'EN DÉVELOPPEMENT'}</small><b>{exerciseSummary}</b><em>{exerciseRuleSummary}</em></span><strong>{exerciseType==='arcade'?catalogRounds:resolvedVisits}<small>{exerciseType==='arcade'?arcadeRule.roundUnit:'TOURS'}</small></strong></section>
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
 
      <NativeStartOrderConfig />
      </div>;
}

function Section({title,subtitle,children}:{title:string;subtitle?:string;children:any}){return <section className="config-card"><div className="section-title"><h2>{title}</h2>{subtitle?<p>{subtitle}</p>:null}</div>{children}</section>}

const css=(p:string)=>`

/* Fiche Challenge : écran dédié, sans fond de formulaire ni fenêtre flottante. */
.challenge-preview-screen{height:100dvh;min-height:0!important;padding:0!important;display:flex;flex-direction:column;overflow:hidden!important}
.challenge-preview-screen .challenge-head{width:min(1180px,100%);flex:0 0 clamp(72px,10vw,96px);margin:0 auto 6px;box-sizing:border-box}
.challenge-preview-main{width:min(1040px,100%);flex:1 1 auto;min-height:0;margin:0 auto;overflow-y:auto;overscroll-behavior:contain;-webkit-overflow-scrolling:touch;box-sizing:border-box;padding:10px 14px calc(108px + env(safe-area-inset-bottom,0px))}
.challenge-preview-card{min-width:0;padding:clamp(14px,3vw,24px);border:1px solid #344960;border-radius:18px;background:linear-gradient(145deg,#0f1b2c,#080d15 66%);box-shadow:0 14px 36px #0007}
.challenge-preview-heading{display:flex;align-items:center;justify-content:space-between;gap:14px;padding-bottom:16px;margin-bottom:16px;border-bottom:1px solid #2d4055}
.challenge-preview-heading>div{min-width:0}
.challenge-preview-heading small{display:block;font-size:10px;font-weight:950;letter-spacing:1.2px;color:#ff7785}
.challenge-preview-heading h1{font-size:clamp(24px,5vw,38px);font-weight:1000;line-height:1.13;color:#fff;margin:6px 0 0;overflow-wrap:anywhere}
.challenge-preview-return,.challenge-preview-card .mss-ca-actions button{border:1px solid #516a81;background:linear-gradient(160deg,#172738,#0b1421);color:#fff;border-radius:12px;padding:11px 14px;font-size:11px;font-weight:950;cursor:pointer}
.challenge-preview-return{flex:0 0 auto}
.challenge-preview-card .mss-ca-actions{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-top:22px;padding-top:16px;border-top:1px solid #304356}
.challenge-preview-card .mss-ca-actions button{min-height:49px}
.challenge-preview-card .mss-ca-actions .primary{border-color:#47d582;background:linear-gradient(180deg,#1dd76c,#0b8b43);box-shadow:0 0 20px #0acf5b22;color:#fff}
.challenge-preview-card .mss-ca-actions button:disabled{opacity:.48;cursor:not-allowed}
.challenge-preview-card .mss-ca-muted{color:#ffb9c0;font-size:11px;line-height:1.55}
.challenge-preview-card .mss-challenge-preview-intro{font-size:clamp(12px,1.8vw,15px);line-height:1.6}
@media(max-width:600px){.challenge-preview-main{padding:6px 8px calc(108px + env(safe-area-inset-bottom,0px))}.challenge-preview-card{padding:13px;border-radius:14px}.challenge-preview-heading{align-items:flex-start;flex-direction:column;gap:10px}.challenge-preview-return{align-self:flex-start}.challenge-preview-card .mss-ca-actions{grid-template-columns:1fr}}
@media(orientation:landscape){.challenge-preview-screen{padding:6px 8px!important}.challenge-preview-screen .challenge-head{flex-basis:64px;height:64px;min-height:64px}.challenge-preview-main{padding:6px 12px 22px}}

.challenge-unified-focused{display:grid;gap:12px;min-height:195px;padding:14px;border:1px solid #b94b5b;border-radius:15px;background:linear-gradient(140deg,#371721,#0d141e)}
.challenge-focused-back{justify-self:start;background:#142237;color:#fff;border:1px solid #607087;border-radius:9px;padding:9px 12px;font-size:11px;font-weight:900;cursor:pointer}
.challenge-focused-heading{display:flex;gap:12px;align-items:center}.challenge-focused-heading>span{font-size:32px;padding:14px;background:#171e2b;border-radius:13px;border:1px solid #627085}.challenge-focused-heading small{font-size:10px;color:#ff8189;font-weight:900}.challenge-focused-heading h3{font-size:19px;margin:5px 0;color:#fff}.challenge-focused-heading p{font-size:11px;margin:0;color:#b5c4d7;line-height:1.5}
.challenge-focused-records{justify-self:start;background:#361923;color:#ffdde1;border:1px solid #dc6976;border-radius:10px;padding:11px;font-size:11px;font-weight:900;cursor:pointer}
.challenge-focused-hint{font-size:10px;color:#a3b8cb;margin:0}.mss-challenge-preview-intro{font-size:12px;color:#b9c7d8;line-height:1.55;margin:0 0 12px}.mss-ca-actions button:disabled{opacity:.45;cursor:not-allowed}
.mss-cg-guide{display:grid;gap:12px;margin:0 0 14px}.mss-cg-insight-actions{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px;margin:6px 0 14px}.mss-cg-insight-actions button{display:flex;gap:11px;align-items:center;min-width:0;text-align:left;border:1px solid #476078;border-radius:14px;padding:13px;color:#eaf6ff;background:linear-gradient(135deg,#152a3c,#0a1422);cursor:pointer}.mss-cg-insight-actions button:first-child{color:#7be5ff}.mss-cg-insight-actions button:nth-child(2){color:#ffcb72}.mss-cg-insight-actions button span{display:grid;gap:3px;min-width:0}.mss-cg-insight-actions button b{font-size:12px;color:#fff}.mss-cg-insight-actions button small{font-size:9px;color:#b3c1d0;line-height:1.45}@media(max-width:450px){.mss-cg-insight-actions{grid-template-columns:1fr}}
.mss-cg-timeline{position:relative;display:flex;flex-direction:column;gap:16px;padding-left:0}.mss-cg-step{position:relative;display:grid;grid-template-columns:56px minmax(0,1fr);gap:12px;align-items:flex-start}.mss-cg-step::before{content:'';position:absolute;left:27px;top:51px;bottom:-26px;width:2px;background:#ef3c4b}.mss-cg-index{position:relative;z-index:1;width:44px;height:44px;margin:2px auto 0;border:2px solid rgba(255,65,72,.75);border-radius:50%;background:linear-gradient(180deg,#171f2d,#0b1018);display:grid;place-items:center;font-weight:1000;font-size:20px;color:${p};box-shadow:0 0 0 4px #09111b}.mss-cg-step-body{min-width:0;padding-bottom:10px}.mss-cg-step-body small{display:block;font-size:9px;color:${p};font-weight:1000;letter-spacing:1px}.mss-cg-step-body h3{margin:5px 0 0;color:#fff;font-size:clamp(13px,2.3vw,18px);line-height:1.2}.mss-cg-step-body p{margin:8px 0 0;color:#b5c4d7;font-size:11px;line-height:1.6}.mss-cg-timeline>.mss-cg-step:last-child::before{display:none}.mss-cg-footer{display:grid;grid-template-columns:42px minmax(0,1fr);gap:10px;align-items:center;padding:12px 13px;border-radius:15px;border:1px solid #314358;background:linear-gradient(112deg,#0d1622,#070d15)}.mss-cg-footer>span{width:42px;height:42px;border-radius:12px;display:grid;place-items:center;background:#1b2636;border:1px solid #516277;font-size:20px}.mss-cg-footer small{display:block;font-size:9px;color:#9cb4c8;font-weight:1000;letter-spacing:1px}.mss-cg-footer b{display:block;margin-top:4px;font-size:12px;line-height:1.45;color:#fff}@media(max-width:560px){.mss-cg-step{grid-template-columns:46px minmax(0,1fr);gap:10px}.mss-cg-step::before{left:22px;top:46px}.mss-cg-index{width:38px;height:38px;font-size:17px}}
.challenge-unified-tools{display:flex;flex-direction:column;gap:10px;margin-bottom:15px}
.challenge-unified-search{display:flex;flex-direction:column;gap:6px;font-size:10px;color:#a9bed0;font-weight:900;letter-spacing:.65px}
.challenge-unified-search input{width:100%;min-width:0;border:1px solid #4e6077;border-radius:11px;background:#0a1220;color:#fff;padding:12px 14px;font-size:13px;outline:none;box-sizing:border-box}
.challenge-unified-search input:focus{border-color:${p};box-shadow:0 0 0 2px #ff414822}
.challenge-unified-filters{display:flex;gap:6px;flex-wrap:wrap}
.challenge-unified-filters button{border:1px solid #415268;background:#111a28;border-radius:999px;padding:7px 11px;color:#c2d0e0;font-size:10px;font-weight:900;cursor:pointer;transition:border .15s}
.challenge-unified-filters button.on{background:#51161d;border-color:${p};color:#fff}
.challenge-unified-count{font-size:10px;font-weight:900;color:#e2e8f1;display:flex;gap:6px;align-items:center}.challenge-unified-count b{font-size:18px;color:#ff727b}
.challenge-unified-count span{margin-left:auto;color:#8f9eae;font-size:9px;letter-spacing:.3px}
.challenge-unified-families{display:flex;flex-direction:column;gap:14px}
.challenge-unified-family{min-width:0;border:1px solid #2b3b50;background:linear-gradient(150deg,#0c1420,#080e16);padding:11px;border-radius:14px}
.challenge-family-heading{display:flex;gap:10px;justify-content:space-between;align-items:center;margin-bottom:10px;padding:0 2px 8px;border-bottom:1px solid #354359}
.challenge-family-heading h3{margin:0;color:#fff;font-size:12px;font-weight:950;letter-spacing:1px}
.challenge-family-heading span{font-size:9px;color:#9caec0;font-weight:900}
.challenge-unified-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}
.challenge-unified-tile{min-width:0;display:grid;grid-template-columns:37px minmax(0,1fr);align-items:start;gap:9px;text-align:left;padding:12px;background:linear-gradient(145deg,#172232,#0b111a);border:1px solid #45566e;border-radius:13px;color:#fff;cursor:pointer;box-shadow:inset 0 0 12px #0005}
.challenge-unified-tile:hover{border-color:#91a6ba}.challenge-unified-tile.on{border-color:${p};background:linear-gradient(145deg,#4d1921,#150b11);box-shadow:0 0 17px #ff465433}
.challenge-unified-tile>i{width:37px;height:37px;border-radius:11px;display:grid;place-items:center;background:#132236;border:1px solid #50647b;font-size:18px;font-weight:950;font-style:normal;color:#e0edff}
.challenge-unified-tile.on>i{background:#30141c;border-color:#ff6671;color:#ff8e95}
.challenge-unified-tile-text{min-width:0;display:flex;flex-direction:column;gap:5px}.challenge-unified-tile b{font-size:11px;line-height:1.35;letter-spacing:.25px}.challenge-unified-tile small{font-size:10px;color:#a4b5c7;line-height:1.35;min-height:26px}
.challenge-unified-tile em{margin-top:3px;align-self:flex-start;font-style:normal;font-size:9px;font-weight:900;letter-spacing:.3px;color:#77f0bb}
.challenge-unified-tile.preview em{color:#84cbff}.challenge-unified-tile.planned em{color:#93a0b3}
.challenge-unified-tile.planned{opacity:.76}.challenge-unified-tile.planned.on{opacity:1}
.challenge-unified-selection{display:flex;flex-wrap:wrap;gap:10px;align-items:center;justify-content:space-between;margin-top:13px;padding:12px;background:#0a111b;border:1px solid #ff626d6a;border-radius:12px}
.challenge-unified-selection>div{display:flex;flex-direction:column;gap:4px}.challenge-unified-selection small{font-size:9px;color:#ff7c85;font-weight:950}.challenge-unified-selection b{font-size:14px}.challenge-unified-selection span{font-size:10px;color:#aab9c9;font-weight:800}
.challenge-unified-selection p{font-size:10px;color:#ecb6bf;max-width:290px;margin:0;line-height:1.5}
@media(max-width:850px){.challenge-unified-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(max-width:520px){.challenge-unified-grid{grid-template-columns:1fr}.challenge-unified-count{flex-wrap:wrap}.challenge-unified-count span{margin-left:0;width:100%}.challenge-unified-tile{padding:10px}.challenge-unified-tile small{min-height:0}}
.challenge-catalog-tools{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px}
.challenge-catalog-tools input,.challenge-catalog-tools select,.challenge-catalog-config select{background:#101a28;color:#f0f5fc;border:1px solid #4c5b70;border-radius:9px;padding:10px;font-size:11px;font-weight:800;min-width:0}
.challenge-catalog-tools input{flex:1 1 220px}.challenge-catalog-tools select{flex:1 1 160px}
.challenge-catalog-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(190px,1fr));gap:8px;max-height:330px;overflow-y:auto;padding:3px}
.challenge-catalog-tile{display:flex;flex-direction:column;align-items:flex-start;gap:6px;text-align:left;background:linear-gradient(150deg,#151f30,#0a101a);border:1px solid #425168;border-radius:12px;padding:12px;color:white;cursor:pointer}
.challenge-catalog-tile.selected{border-color:#ff626e;background:linear-gradient(145deg,#442029,#0e121c);box-shadow:0 0 12px #ff3a4c22}
.challenge-catalog-tile small{font-size:9px;color:#ff8a91;font-weight:900;letter-spacing:1px}.challenge-catalog-tile b{font-size:13px}.challenge-catalog-tile span{font-size:10px;color:#b3c0d1;line-height:1.45;flex:1}
.challenge-catalog-tile em{font-size:9px;font-weight:950;font-style:normal;color:#8c9db0}.challenge-catalog-tile em.ready{color:#75f3b3}
.challenge-catalog-options{margin-top:12px;background:#0a111e;border-radius:13px;border:1px solid #3f4f66;padding:14px}
.challenge-catalog-options h3{font-size:16px;margin:0 0 6px;color:white}.challenge-catalog-options p{font-size:12px;line-height:1.5;color:#aebdd0;margin:0 0 11px}
.challenge-catalog-config{display:flex;gap:10px;flex-wrap:wrap}.challenge-catalog-config label{flex:1 1 160px;font-size:10px;font-weight:950;color:#a9bfd3;display:flex;flex-direction:column;gap:6px}
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
.target-grid{display:grid;grid-template-columns:repeat(11,minmax(0,1fr));gap:6px}.target-btn{position:relative;isolation:isolate;height:52px;min-height:52px;padding:3px 6px;font-size:11px;display:flex;align-items:center;justify-content:center;overflow:hidden}.target-btn:after{content:'';position:absolute;inset:0;z-index:1;background:linear-gradient(180deg,rgba(4,8,13,.22),rgba(4,8,13,.72));pointer-events:none}.target-btn b{position:relative;z-index:2;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:11px;line-height:1;font-weight:1000;text-shadow:0 2px 7px #000,0 0 12px #000}.target-btn.family b{font-size:9px}.target-thumb{position:absolute;z-index:0;inset:-18px;display:flex;align-items:center;justify-content:center;opacity:.34;pointer-events:none}.target-thumb img{display:block;width:100%;height:100%;object-fit:cover;object-position:center;filter:saturate(1.08) contrast(1.06);transform:scale(1.22)}.target-btn.family .target-thumb{opacity:.32}.target-btn.family .target-thumb img{transform:scale(1.18)}.target-btn.on .target-thumb{opacity:.52}.target-btn.on:after{background:linear-gradient(180deg,rgba(42,5,9,.08),rgba(17,4,7,.52))}.target-btn.on b{color:#fff;text-shadow:0 0 10px #ff3d47,0 2px 7px #000}
.visit-grid{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:7px}.arcade-choice{min-height:42px;font-size:13px}.rule-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:7px}.rule-btn{min-height:58px;text-align:left;display:flex;flex-direction:column;justify-content:center;padding:9px 10px}.rule-btn b{font-size:10px}.rule-btn span{font-size:8.5px;color:#98a5b6;margin-top:3px}.rule-btn.on b{color:#ff555b}
.exercise-grid{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:8px}.exercise-card{min-height:92px;border:1px solid #465466;border-radius:14px;background:linear-gradient(180deg,#111a27,#070c13);color:#fff;padding:10px;display:grid;grid-template-columns:34px minmax(0,1fr);gap:8px;align-items:center;text-align:left;box-shadow:inset 0 0 16px #0008}.exercise-card>i{width:34px;height:34px;border-radius:11px;display:grid;place-items:center;background:#111d2a;border:1px solid #536174;color:#d7e4f4;font-size:18px;font-style:normal;font-weight:1000}.exercise-card span{min-width:0}.exercise-card b{display:block;font-size:10px;letter-spacing:.35px}.exercise-card small{display:block;margin-top:4px;color:#94a2b3;font-size:7.5px;line-height:1.28}.exercise-card.on{border-color:${p};background:linear-gradient(180deg,#51141a,#17090c);box-shadow:0 0 18px ${p}33,inset 0 0 18px ${p}18}.exercise-card.on>i{border-color:${p};color:#ff6870;background:#2a0d11}
.advanced-grid,.grouping-config{display:grid;grid-template-columns:1fr 1fr;gap:9px}.double-target-grid{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:6px;margin-top:2px}.double-target-grid button{position:relative;min-height:42px;border:1px solid #3d4b5d;border-radius:9px;background:#09111a;color:#fff;font-size:9px;font-weight:1000}.double-target-grid button.on{border-color:${p};background:linear-gradient(180deg,#4c1218,#17090c);box-shadow:0 0 12px ${p}26}.double-target-grid button small{position:absolute;right:4px;top:4px;width:15px;height:15px;border-radius:50%;display:grid;place-items:center;background:${p};color:#fff;font-size:6px}.double-target-actions{display:flex;justify-content:flex-end;gap:6px;margin-top:7px}.double-target-actions button{min-height:34px;border:1px solid #526175;border-radius:8px;background:#0b141e;color:#fff;padding:6px 9px;font-size:7.5px;font-weight:1000}.double-target-actions .danger{border-color:#7a3338;color:#ff7e84}.advanced-block{border:1px solid #334256;border-radius:13px;background:#081019;padding:10px}.advanced-block.compact{margin-top:9px}.advanced-block h3{margin:0 0 7px;font-size:8px;color:#9cabbc;letter-spacing:.9px}.binary-row{display:grid;grid-template-columns:1fr 1fr;gap:7px}.binary-row button{min-height:48px;border:1px solid #49586b;border-radius:10px;background:linear-gradient(180deg,#111925,#080d14);color:#fff;padding:8px;font-size:9px;font-weight:950;display:flex;flex-direction:column;align-items:flex-start;justify-content:center}.binary-row button small{margin-top:2px;color:#93a1b2;font-size:7.5px}.binary-row button.on{border-color:${p};background:linear-gradient(180deg,#4c1218,#17090c);box-shadow:0 0 14px ${p}2f}.sequence-preview{display:flex;gap:6px;overflow-x:auto;padding:3px 1px 9px}.sequence-preview>span{position:relative;flex:0 0 auto;min-width:76px;min-height:45px;border:1px solid #3a485a;border-radius:10px;background:#09111a;color:#fff;display:flex;align-items:center;justify-content:center;padding:8px 8px 8px 28px;font-size:8px;font-weight:950;white-space:nowrap}.sequence-preview>span>b{position:absolute;left:7px;width:16px;height:16px;border-radius:50%;display:grid;place-items:center;background:#1b2735;color:#ff6970;font-size:7px}.sequence-preview.editable>span{padding-right:27px}.sequence-preview>span>button{position:absolute;right:5px;width:18px;height:18px;border:0;border-radius:50%;background:#301015;color:#ff747a;font-weight:1000}.sequence-add{display:grid;grid-template-columns:minmax(150px,1fr) auto auto auto;gap:6px}.sequence-add select,.range-select select{min-height:39px;border:1px solid #48586b;border-radius:9px;background:#08111a;color:#fff;padding:7px;font-weight:900}.sequence-add button{min-height:39px;border:1px solid #526175;border-radius:9px;background:#0b141e;color:#fff;padding:7px 10px;font-size:8px;font-weight:1000}.sequence-add button:first-of-type{border-color:${p};background:#351016}.sequence-add .danger{border-color:#7a3338;color:#ff7e84}.half-start{grid-template-columns:repeat(5,minmax(0,1fr))}.range-select{display:flex;align-items:center;justify-content:center;gap:9px}.range-select label{display:flex;align-items:center;gap:6px;color:#93a2b4;font-size:8px;font-weight:1000}.range-select select{min-width:72px}.range-select>span{color:${p};font-weight:1000}.grouping-example{margin-top:9px;border:1px solid #3c4a5c;border-radius:12px;background:linear-gradient(90deg,#08111a,#0b151f);padding:9px 11px;display:grid;grid-template-columns:auto auto 1fr;gap:7px 12px;align-items:center}.grouping-example>b{font-size:8px;color:${p}}.grouping-example>span{font-size:10px;font-weight:900}.grouping-example strong{color:#65f192}.grouping-example small{font-size:8px;color:#93a1b2}.audio-toggle-row{display:grid;grid-template-columns:1fr 1fr;gap:8px}.audio-toggle-row button{min-height:66px;border:1px solid #4e5d70;border-radius:12px;background:linear-gradient(180deg,#111a27,#080d14);color:#fff;display:flex;flex-direction:column;align-items:flex-start;justify-content:center;padding:10px 12px;box-shadow:inset 0 0 14px #0007}.audio-toggle-row button b{font-size:12px}.audio-toggle-row button span{margin-top:3px;color:#95a3b4;font-size:8.5px;font-weight:800}.audio-toggle-row button.on{border-color:#4dff83;background:linear-gradient(180deg,#0e421f,#07170d);box-shadow:0 0 18px #25e66033}.audio-toggle-row button.off.on{border-color:#ff5960;background:linear-gradient(180deg,#4b1218,#19090c);box-shadow:0 0 18px #ff293333}.audio-toggle-row button.on b{color:#72ff9e}.audio-toggle-row button.off.on b{color:#ff7379}
.custom-visits{margin-top:8px;min-height:44px;display:grid;grid-template-columns:auto 90px auto;gap:8px;align-items:center;padding:7px 9px;border:1px solid #344255;border-radius:11px;background:#08111a}.custom-visits>span{font-size:8px;color:#9aa8b9;font-weight:1000;letter-spacing:.7px}.custom-visits input{width:100%;box-sizing:border-box;min-height:32px;border:1px solid #59697c;border-radius:8px;background:#050a10;color:#fff;text-align:center;font-size:14px;font-weight:1000}.custom-visits small{font-size:7px;color:#7f8da0}.grouping-presets{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px}.grouping-presets button{min-height:32px;border:1px solid #4e5e72;border-radius:999px;background:#0a121c;color:#dce5ef;padding:6px 11px;font-size:8px;font-weight:1000}.grouping-presets button:hover{border-color:${p};color:#fff}.launch-preview{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:10px;margin-top:8px;padding:9px 11px;border:1px solid #39495c;border-left:3px solid ${p};border-radius:13px;background:linear-gradient(90deg,#0a121c,#080d14);box-shadow:inset 0 0 18px #0008}.launch-preview>span{min-width:0;display:flex;flex-direction:column}.launch-preview small{font-size:7px;color:${p};font-weight:1000;letter-spacing:.8px}.launch-preview b{margin-top:2px;font-size:11px;color:#fff}.launch-preview em{margin-top:2px;font-size:8px;color:#9ba9ba;font-style:normal;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.launch-preview>strong{font-size:22px;color:#ff5a61;display:flex;align-items:baseline;gap:4px}.launch-preview>strong small{font-size:7px;color:#a0adbb}
.preset-actions{display:flex;align-items:center;gap:9px;margin-top:7px;padding:0 3px}.preset-actions small{color:#7f8c9e;font-size:7.5px}.favorite-set{min-height:34px;border:1px solid #4d5b6e;border-radius:999px;background:#0a1119;color:#d9e2ed;padding:6px 11px;display:flex;align-items:center;gap:6px;font-size:8px;font-weight:1000}.favorite-set span{font-size:15px;color:#ffd85c}.favorite-set.on{border-color:#9c7a2d;background:#211a09;color:#fff}
.config-actions{position:sticky;bottom:calc(82px + env(safe-area-inset-bottom,0px));z-index:8;display:flex;justify-content:flex-end;gap:8px;margin-top:6px;padding:7px;border-radius:14px;background:linear-gradient(180deg,#06090eda,#040609f2);backdrop-filter:blur(10px);border:1px solid #293544}.config-actions button{min-height:42px}.config-actions .launch{min-width:220px;background:linear-gradient(180deg,#2be15e,#07852e);border-color:#69ff8d;box-shadow:inset 0 0 14px #aaffb433,0 0 22px #23e75c44;font-size:12px}.config-actions button:disabled{opacity:.38;filter:grayscale(.6);cursor:not-allowed;box-shadow:none}
.team-picker-overlay{position:fixed;inset:0;z-index:10040;display:grid;place-items:center;padding:max(12px,env(safe-area-inset-top,0px)) 12px max(14px,env(safe-area-inset-bottom,0px));background:#000d;backdrop-filter:blur(8px)}.team-picker-card{width:min(720px,96vw);max-height:min(88dvh,760px);display:flex;flex-direction:column;overflow:hidden;border:1px solid ${p}99;border-radius:22px;background:linear-gradient(180deg,#0d1622,#05080e);box-shadow:0 28px 80px #000,0 0 32px ${p}33}.team-picker-head{flex:0 0 auto;display:flex;align-items:center;justify-content:space-between;gap:10px;padding:11px 12px;border-bottom:1px solid ${p}55}.team-picker-identity{min-width:0;display:grid;grid-template-columns:50px minmax(0,1fr);gap:9px;align-items:center}.team-picker-identity>img,.team-picker-identity>span{width:50px;height:50px;border-radius:50%;object-fit:cover;display:grid;place-items:center;background:#101722;border:1px solid #59687b;font-weight:1000}.team-picker-identity>div{min-width:0}.team-picker-identity small,.team-picker-identity b,.team-picker-identity em{display:block}.team-picker-identity small{font-size:8px;color:${p};font-weight:1000;letter-spacing:1px}.team-picker-identity b{font-size:16px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.team-picker-identity em{font-size:9px;color:#9aa7b8;font-style:normal}.team-picker-close{width:40px;height:40px;border-radius:12px;border:1px solid #566477;background:#0c121b;color:#fff;font-size:21px}.team-picker-body{min-height:0;overflow:auto;padding:12px}.team-player-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px}.team-player-card{min-width:0;min-height:142px;border:1px solid #3d4a5d;border-radius:16px;background:linear-gradient(180deg,#101722,#080d14);color:#fff;padding:9px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px}.team-player-card.on{border-color:${p};background:linear-gradient(180deg,#471319,#17090c);box-shadow:0 0 18px ${p}44}.team-player-card:disabled{opacity:.36}.team-player-avatar{width:78px;height:78px;border-radius:50%;overflow:hidden;display:grid;place-items:center;border:2px solid #59687b;background:#101722}.team-player-avatar>*{width:100%!important;height:100%!important}.team-player-fallback{font-size:28px;font-weight:1000}.team-player-card b{width:100%;font-size:11px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.team-player-card small{font-size:7px;color:#97a4b4;font-weight:900}.team-picker-actions{flex:0 0 auto;display:flex;justify-content:flex-end;gap:8px;padding:10px 12px;border-top:1px solid #273545}.team-picker-actions button{min-height:40px;border:1px solid #4f5d6e;border-radius:11px;background:#0a1018;color:#fff;padding:8px 14px;font-weight:1000}.team-picker-actions .validate{border-color:${p};background:linear-gradient(180deg,#5a141b,#1a090c);color:#fff}.team-picker-actions button:disabled{opacity:.4}
/* JDC guided rules — self-contained; never changes the other challenge screens. */
.jdc-guide{min-width:0;display:grid;gap:12px;color:#e8f1fc}
.jdc-guide-intro{min-width:0;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;padding:12px 13px;border-radius:15px;background:linear-gradient(112deg,#122338,#090f1b 72%);border:1px solid #2c4d66}
.jdc-guide-intro-title{display:flex;align-items:center;gap:8px;font-size:12px;font-weight:1000;letter-spacing:.65px;color:#fff}
.jdc-guide-intro-title>span{font-size:22px}
.jdc-guide-metrics{display:flex;gap:3px;flex-wrap:wrap}
.jdc-guide-metrics>span{display:flex;align-items:baseline;gap:5px;padding:5px 8px;border-radius:9px;background:#08101b;border:1px solid #314358}
.jdc-guide-metrics b{font-size:17px;font-weight:1000;line-height:1;color:#fff}
.jdc-guide-metrics small{font-size:8px;letter-spacing:.4px;color:#91afc8;font-weight:900}
.jdc-guide-steps{min-width:0;display:grid;gap:0}
.jdc-guide-phase{--jdc-accent:#3ebdff;--jdc-soft:rgba(62,189,255,.16);position:relative;min-width:0;padding:14px;border:1px solid rgba(78,150,196,.55);border-left:3px solid var(--jdc-accent);border-radius:16px;background:radial-gradient(circle at 0 0,var(--jdc-soft),transparent 46%),linear-gradient(145deg,#111d2b,#070d16 80%);box-shadow:inset 0 1px rgba(255,255,255,.045),0 9px 25px #0004}
.jdc-guide-phase--red{--jdc-accent:#ff636c;--jdc-soft:rgba(255,86,95,.16);border-color:rgba(210,84,99,.5);border-left-color:var(--jdc-accent)}
.jdc-guide-phase-head{min-width:0;display:flex;align-items:center;gap:10px}
.jdc-guide-index{flex:0 0 43px;height:43px;border:1px solid color-mix(in srgb,var(--jdc-accent) 60%,transparent);border-radius:13px;background:var(--jdc-soft);display:grid;place-items:center;font-weight:1000;font-size:20px;color:var(--jdc-accent)}
.jdc-guide-phase-heading{min-width:0;flex:1 1 auto}
.jdc-guide-eyebrow{display:block;color:var(--jdc-accent);font-size:9px;font-weight:1000;letter-spacing:.9px}
.jdc-guide-phase .jdc-guide-phase-heading h3{margin:4px 0 0;color:#fff;font-size:clamp(12px,2.5vw,16px);line-height:1.22;letter-spacing:.15px;font-weight:1000}
.jdc-guide-count{flex:0 0 auto;font-size:9px;font-weight:1000;letter-spacing:.2px;color:#e1efff;border:1px solid #3a5066;background:#0a1420;border-radius:999px;padding:7px 9px;white-space:nowrap}
.jdc-guide-targets{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:5px;margin-top:15px}
.jdc-guide-targets>span{min-width:0;display:grid;place-items:center;min-height:35px;font-size:clamp(12px,3vw,17px);font-weight:1000;color:#fff;border:1px solid #405467;border-radius:9px;background:linear-gradient(180deg,#233549,#101b2a);box-shadow:inset 0 -2px var(--jdc-accent)}
.jdc-guide-rule{display:flex;align-items:center;gap:10px;padding:11px 0 0}
.jdc-guide-rule-icon{flex:0 0 28px;height:28px;display:grid;place-items:center;border-radius:9px;background:var(--jdc-soft);font-size:16px;color:var(--jdc-accent);font-weight:1000}
.jdc-guide-rule p{min-width:0;margin:0;color:#acbbce;font-size:11.5px;line-height:1.5}
.jdc-guide-rule strong{color:#eef6ff;font-weight:900}
.jdc-guide-bonus{display:flex;align-items:center;gap:11px;margin-top:12px;padding:10px 12px;border-radius:12px;background:linear-gradient(100deg,rgba(47,142,190,.2),rgba(29,62,90,.15));border:1px solid rgba(80,171,222,.44)}
.jdc-guide-bonus-icon{flex:0 0 30px;height:30px;display:grid;place-items:center;border-radius:10px;background:#113348;color:#57dfff;font-size:19px}
.jdc-guide-bonus>div{min-width:0;display:grid;gap:3px}
.jdc-guide-bonus b{color:#e6f7ff;font-size:11px;font-weight:1000;letter-spacing:.4px}
.jdc-guide-bonus b strong{color:#62eaff;font-size:12px}
.jdc-guide-bonus small{font-size:10px;line-height:1.4;color:#a7c5d8}
.jdc-guide-connector{height:23px;display:grid;place-items:center;position:relative}
.jdc-guide-connector::before{content:'';position:absolute;height:100%;width:1px;background:linear-gradient(180deg,#3b7897,#c44956)}
.jdc-guide-connector>span{z-index:1;width:17px;height:17px;display:grid;place-items:center;border:1px solid #43556b;background:#0a121d;border-radius:50%;font-size:11px;color:#d8eaff}
.jdc-guide-path{display:flex;align-items:center;justify-content:space-between;gap:4px;min-width:0;margin-top:15px}
.jdc-guide-path span{min-width:0;flex:1 1 0;padding:9px 3px;border:1px solid #6c3e4c;border-radius:9px;background:linear-gradient(180deg,#3a1921,#1a1119);color:#fff;font-weight:1000;text-align:center;font-size:clamp(10px,2.6vw,15px)}
.jdc-guide-path i{flex:0 0 auto;color:#f78489;font-size:11px;font-style:normal;font-weight:900}
.jdc-guide-path .jdc-guide-bull{border-color:#ff5762;background:linear-gradient(180deg,#a0202f,#411019)}
.jdc-guide-path .jdc-guide-ellipsis{letter-spacing:2px}
.jdc-guide-payouts{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin-top:13px}
.jdc-guide-payouts>span{min-width:0;display:flex;align-items:center;justify-content:center;flex-wrap:wrap;gap:4px 9px;text-align:center;padding:10px 8px;border:1px solid #88404c;border-radius:11px;background:linear-gradient(145deg,#3e141d,#1b1016)}
.jdc-guide-payouts strong{font-size:21px;color:#ff7b81;line-height:1;font-weight:1000}
.jdc-guide-payouts small{font-size:9px;color:#eed8db;font-weight:1000;line-height:1.35}
.jdc-guide-payouts .jdc-guide-payouts-bull{border-color:#ac5d3d;background:linear-gradient(145deg,#3b2118,#1d1112)}
.jdc-guide-payouts-bull strong{color:#ffb27c}
.jdc-guide-finale{min-width:0;display:flex;align-items:center;gap:9px;padding:12px;border-radius:14px;background:linear-gradient(105deg,#291316,#0e141e);border:1px solid #914954}
.jdc-guide-finale>span:first-child{font-size:25px}
.jdc-guide-finale>div{min-width:0;flex:1 1 auto;display:grid;gap:4px}
.jdc-guide-finale>div small{font-size:9px;line-height:1.3;color:#ff999d;font-weight:900}
.jdc-guide-finale>div strong{font-size:11px;line-height:1.4;color:#fff;font-weight:1000}
.jdc-guide-max{flex:0 0 auto;display:grid;text-align:center;gap:2px;border-left:1px solid #78454f;padding-left:11px}
.jdc-guide-max b{color:#ff777e;font-size:21px;line-height:1.05;white-space:nowrap}
.jdc-guide-max small{color:#eab6bc;font-size:9px;font-weight:900}
@media(max-width:480px){.jdc-guide{gap:10px}.jdc-guide-intro{padding:10px;gap:9px}.jdc-guide-intro-title{font-size:11px}.jdc-guide-metrics{width:100%;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:5px}.jdc-guide-metrics>span{justify-content:center;padding:8px 3px;gap:4px}.jdc-guide-metrics b{font-size:17px}.jdc-guide-metrics small{font-size:7px}.jdc-guide-phase{padding:11px}.jdc-guide-phase-head{gap:7px;flex-wrap:wrap}.jdc-guide-index{flex-basis:36px;height:36px;font-size:17px}.jdc-guide-phase .jdc-guide-phase-heading h3{font-size:12px}.jdc-guide-eyebrow{font-size:8px}.jdc-guide-count{font-size:8px;padding:6px 8px;margin-left:43px}.jdc-guide-targets{margin-top:11px;gap:4px}.jdc-guide-targets>span{min-height:31px;font-size:13px}.jdc-guide-rule p{font-size:10.5px}.jdc-guide-bonus{padding:9px}.jdc-guide-bonus b{font-size:10px}.jdc-guide-bonus small{font-size:9.5px}.jdc-guide-payouts strong{font-size:18px}.jdc-guide-payouts small{font-size:8px}.jdc-guide-finale{padding:10px}.jdc-guide-finale>div small{font-size:8px}.jdc-guide-finale>div strong{font-size:10px}.jdc-guide-max b{font-size:18px}.jdc-guide-max small{font-size:8px}}
@media(max-width:350px){.jdc-guide-count{margin-left:0}.jdc-guide-path{gap:2px}.jdc-guide-path span{padding:8px 2px}.jdc-guide-path i{font-size:9px}.jdc-guide-phase{padding:9px}.jdc-guide-finale>span:first-child{display:none}}

/* JDC premium finish — icons are the same SVG family as the BottomNav. */
.jdc-guide{gap:14px;isolation:isolate}
.jdc-guide-intro{padding:13px 15px;border-radius:16px;border-color:rgba(85,130,160,.45);background:linear-gradient(120deg,rgba(36,66,94,.45),rgba(8,15,26,.95) 56%);box-shadow:inset 0 1px rgba(255,255,255,.055)}
.jdc-guide-intro-title{gap:10px;letter-spacing:.9px;color:#e9f5ff;font-size:11px}
.jdc-guide-intro-symbol{width:36px;height:36px;display:grid;place-items:center;flex:0 0 36px;border-radius:11px;border:1px solid rgba(87,178,221,.45);background:linear-gradient(145deg,rgba(52,137,187,.26),rgba(23,54,81,.25));color:#70cefa}
.jdc-guide-intro-title>span:first-child{font-size:initial}
.jdc-guide-metrics{gap:5px}
.jdc-guide-metrics>span{border-color:rgba(107,151,181,.35);background:rgba(5,14,25,.65);padding:8px 9px}
.jdc-guide-metrics b{font-size:18px;font-variant-numeric:tabular-nums}
.jdc-guide-phase{padding:16px;border-radius:17px;border-left-width:2px;border-color:rgba(58,119,164,.52);border-left-color:var(--jdc-accent);background:linear-gradient(150deg,rgba(24,48,68,.78),rgba(7,14,24,.97) 60%),radial-gradient(circle at 0 0,var(--jdc-soft),transparent 60%);box-shadow:0 10px 24px rgba(0,0,0,.2),inset 0 1px rgba(255,255,255,.035);overflow:hidden}
.jdc-guide-phase::before{content:"";position:absolute;left:16px;right:16px;top:0;height:1px;background:linear-gradient(90deg,var(--jdc-accent),transparent 85%);opacity:.6}
.jdc-guide-phase--red{border-color:rgba(164,69,83,.54);border-left-color:var(--jdc-accent);background:linear-gradient(155deg,rgba(53,24,36,.69),rgba(9,14,24,.98) 56%)}
.jdc-guide-phase-head{gap:10px}
.jdc-guide-index{flex:0 0 43px;width:43px;height:50px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;border-radius:12px;border-color:color-mix(in srgb,var(--jdc-accent) 40%,transparent);background:linear-gradient(155deg,var(--jdc-soft),rgba(10,18,29,.55));box-shadow:inset 0 1px rgba(255,255,255,.04);color:var(--jdc-accent)}
.jdc-guide-index svg{flex:0 0 auto;display:block}
.jdc-guide-index small{font-size:9px;font-weight:1000;line-height:1;letter-spacing:1.25px}
.jdc-guide-eyebrow{letter-spacing:1.2px;font-size:9px}
.jdc-guide-phase .jdc-guide-phase-heading h3{font-weight:950;letter-spacing:.2px}
.jdc-guide-count{border-color:color-mix(in srgb,var(--jdc-accent) 36%,#284053);background:color-mix(in srgb,var(--jdc-accent) 11%,#101820);color:#eaf6ff;letter-spacing:.7px;font-size:9px}
.jdc-guide-targets{gap:5px;margin-top:16px}
.jdc-guide-targets>span{border:1px solid rgba(106,149,173,.36);border-bottom:2px solid var(--jdc-accent);border-radius:10px;background:linear-gradient(180deg,rgba(38,62,82,.74),rgba(10,22,34,.9));box-shadow:inset 0 1px rgba(255,255,255,.05)}
.jdc-guide-rule{margin-top:13px;padding-top:12px;align-items:flex-start;border-top:1px solid rgba(101,137,157,.18)}
.jdc-guide-rule-icon{flex:0 0 32px;width:32px;height:32px;border:1px solid color-mix(in srgb,var(--jdc-accent) 26%,transparent);border-radius:10px;color:var(--jdc-accent);background:var(--jdc-soft)}
.jdc-guide-rule p{font-size:11.5px;line-height:1.55}
.jdc-guide-bonus{margin-top:13px;gap:10px;padding:11px;border-color:rgba(71,159,204,.45);background:linear-gradient(115deg,rgba(22,81,117,.27),rgba(10,28,45,.57));box-shadow:inset 0 1px rgba(255,255,255,.045)}
.jdc-guide-bonus-icon{width:34px;height:34px;flex:0 0 34px;border:1px solid rgba(89,191,237,.36);color:#67d8ff;background:rgba(48,132,178,.18)}
.jdc-guide-bonus>div{width:100%;gap:5px}
.jdc-guide-bonus b{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:3px 7px;font-size:10px;letter-spacing:.6px}
.jdc-guide-bonus b strong{padding:4px 7px;border-radius:7px;background:rgba(61,165,216,.18);border:1px solid rgba(85,201,244,.34);font-size:11px;white-space:nowrap}
.jdc-guide-bonus small{color:#a8c4d7;font-size:10px;line-height:1.5}
.jdc-guide-connector{height:24px}
.jdc-guide-connector::before{opacity:.65}
.jdc-guide-connector>span{width:20px;height:20px;color:#9bc4dd;border:1px solid #34526b;box-shadow:0 0 0 3px #080f1a}
.jdc-guide-path{gap:4px;margin-top:16px}
.jdc-guide-path span{border-radius:10px;padding:10px 3px;border-color:rgba(215,93,111,.44);background:linear-gradient(180deg,rgba(78,29,42,.79),rgba(25,16,25,.9));box-shadow:inset 0 1px rgba(255,255,255,.035)}
.jdc-guide-path i{color:#ff9aa3}
.jdc-guide-path .jdc-guide-bull{border-color:#fe5b69;background:linear-gradient(170deg,#9e273b,#44121f);box-shadow:inset 0 1px rgba(255,255,255,.09)}
.jdc-guide-payouts{gap:8px}
.jdc-guide-payouts>span{min-height:61px;border-radius:12px;border-color:rgba(244,105,122,.4);background:linear-gradient(125deg,rgba(83,25,40,.68),rgba(34,17,27,.87))}
.jdc-guide-payouts-bull{border-color:rgba(240,147,86,.5)!important}
.jdc-guide-finale{padding:13px 14px;gap:11px;border-color:rgba(196,81,99,.58);background:linear-gradient(120deg,rgba(73,23,37,.82),rgba(18,24,35,.93));box-shadow:inset 0 1px rgba(255,255,255,.05)}
.jdc-guide-finale-icon{width:38px;height:38px;flex:0 0 38px;display:grid;place-items:center;border:1px solid rgba(252,127,142,.5);border-radius:11px;color:#ff919e;background:rgba(209,57,76,.12)}
.jdc-guide-finale>div small{font-size:9px;letter-spacing:.35px}
.jdc-guide-finale>div strong{font-size:11.5px}
.jdc-guide-max{padding-left:12px;border-color:rgba(254,136,153,.27)}
.jdc-guide-max b{font-variant-numeric:tabular-nums;font-size:22px}
@media(max-width:480px){.jdc-guide{gap:11px}.jdc-guide-intro{padding:11px}.jdc-guide-intro-symbol{width:33px;height:33px;flex-basis:33px}.jdc-guide-phase{padding:12px}.jdc-guide-phase-head{gap:7px}.jdc-guide-index{flex:0 0 38px;width:38px;height:44px}.jdc-guide-index svg{width:18px;height:18px}.jdc-guide-count{margin-left:0;font-size:8px;padding:7px 9px}.jdc-guide-targets{margin-top:13px;gap:4px}.jdc-guide-rule{margin-top:10px;padding-top:10px}.jdc-guide-rule p{font-size:10.5px}.jdc-guide-bonus{padding:9px}.jdc-guide-bonus small{font-size:9.5px}.jdc-guide-finale{padding:11px}.jdc-guide-finale-icon{width:32px;height:32px;flex-basis:32px}.jdc-guide-finale-icon svg{width:19px;height:19px}.jdc-guide-finale>div strong{font-size:10.5px}.jdc-guide-max b{font-size:18px}}
@media(max-width:350px){.jdc-guide-phase{padding:10px}.jdc-guide-phase-head{flex-wrap:wrap}.jdc-guide-count{margin-left:45px}.jdc-guide-finale{gap:7px}.jdc-guide-finale-icon{display:none}}

@media(orientation:landscape){.challenge-config{height:100dvh;min-height:0;padding:6px 8px 6px;overflow:hidden;display:flex;flex-direction:column}.challenge-head{flex:0 0 64px;width:min(1180px,100%);height:64px;min-height:64px;margin:0 auto 6px;border-radius:14px}.challenge-head>img{object-fit:contain;background:#05080d}.challenge-back{left:8px}.challenge-awena{right:8px;width:44px;height:44px}.config-wrap{width:min(1180px,100%);max-width:1180px;flex:1 1 auto;min-height:0;overflow-y:auto;overflow-x:hidden;padding:4px 8px 8px}.config-overview{padding:9px 11px;margin-bottom:7px}.config-overview p{margin-top:4px}.mode-row{margin-top:5px}.mode-row button{padding:7px 11px}.summary b{font-size:20px}.summary span{font-size:8px}.quick-presets{margin-bottom:7px}.quick-preset{min-height:62px}.progress-card{padding:7px 10px;margin-bottom:7px}.steps button{height:30px}.config-card{padding:10px;margin-bottom:7px}.section-title{margin-bottom:7px;padding-bottom:6px}.match-mode button{min-height:58px}.match-mode button b{font-size:15px}.team-carousel{padding-bottom:8px}.team-choice{flex-basis:176px;min-height:118px;padding:8px}.team-choice>img,.team-fallback,.team-logo-slot{width:54px;height:54px}.target-grid{grid-template-columns:repeat(11,minmax(0,1fr))}.target-btn{height:42px;min-height:42px}.exercise-grid{grid-template-columns:repeat(5,minmax(0,1fr))}.rule-grid{grid-template-columns:repeat(3,minmax(0,1fr))}.complete-grid{grid-template-columns:repeat(2,minmax(0,1fr));align-items:start}.complete-grid .config-card:nth-child(1),.complete-grid .config-card:nth-child(2){grid-column:1/-1}.config-actions{bottom:0;margin-top:4px;padding:5px}.config-actions button{min-height:36px;padding:7px 11px}.team-player-grid{grid-template-columns:repeat(4,minmax(0,1fr))}.team-player-card{min-height:126px}.team-player-avatar{width:66px;height:66px}}
@media(max-width:760px){.challenge-head{height:72px;margin-bottom:5px;border-radius:0 0 14px 14px}.challenge-head>img{object-fit:cover}.challenge-back{left:7px;transform:translateY(-50%) scale(.92)}.challenge-awena{right:7px;width:44px;height:44px}.config-wrap{padding:6px 8px 12px}.config-overview{grid-template-columns:1fr auto;padding:10px}.config-overview p{font-size:9px}.summary{min-width:118px;padding-left:9px}.summary b{font-size:17px}.summary span{font-size:7.5px}.quick-presets{grid-template-columns:1fr}.quick-preset{min-height:68px}.progress-card{grid-template-columns:1fr;padding:9px;gap:7px}.progress-card>div:first-child{min-width:0}.steps button{height:30px}.steps button span{display:none}.config-card{padding:10px}.section-title{align-items:flex-start;flex-direction:column;gap:3px}.section-title p{max-width:100%;text-align:left;font-size:8.5px}.match-mode{gap:5px}.match-mode button{min-height:60px}.match-mode button b{font-size:14px}.match-mode button span{font-size:7.5px}.target-grid{grid-template-columns:repeat(5,minmax(0,1fr))}.target-btn{height:62px;min-height:62px}.target-btn b{font-size:12px}.target-btn.family b{font-size:9px}.target-thumb{inset:-20px}.exercise-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.exercise-card{min-height:78px}.advanced-grid,.grouping-config{grid-template-columns:1fr}.sequence-add{grid-template-columns:1fr 1fr}.sequence-add select{grid-column:1/-1}.grouping-example{grid-template-columns:1fr}.visit-grid{grid-template-columns:repeat(4,minmax(0,1fr))}.rule-grid{grid-template-columns:1fr 1fr}.audio-toggle-row{grid-template-columns:1fr 1fr}.config-actions{bottom:calc(74px + env(safe-area-inset-bottom,0px));padding:5px}.config-actions button{flex:1;min-width:0!important;padding:9px 8px;font-size:10px!important}.team-player-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.team-choice{flex-basis:min(62vw,210px)}.preset-actions{align-items:flex-start;flex-direction:column}}
@media(max-width:430px){.double-target-grid{grid-template-columns:repeat(4,minmax(0,1fr))}.custom-visits{grid-template-columns:1fr 86px}.custom-visits small{display:none}.launch-preview>strong{font-size:18px}.exercise-grid{grid-template-columns:1fr}.binary-row{grid-template-columns:1fr 1fr}.sequence-add{grid-template-columns:1fr}.sequence-add select{grid-column:auto}.summary{display:none}.config-overview{grid-template-columns:1fr}.source-row{grid-template-columns:1fr 1fr}.rule-grid{grid-template-columns:1fr}.audio-toggle-row{grid-template-columns:1fr}.match-mode button span{max-width:90px;text-align:center}.target-grid{grid-template-columns:repeat(5,minmax(0,1fr))}.team-picker-card{width:100%}.team-player-card{min-height:124px}.team-player-avatar{width:64px;height:64px}.quick-preset{grid-template-columns:34px minmax(0,1fr)}.quick-preset>strong{grid-column:2;justify-self:start}.quick-preset>i{width:34px;height:34px}}
`;
