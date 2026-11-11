/** Brouillons locaux des deux aperçus Arcade disponibles depuis le Centre.
 * Jamais confondus avec une partie Challenge ou l'Historique compétitif. */
import type { ArcadeHit, ArcadeObjective } from '../../lib/challengeArcadeEngine';
import type { ChallengeConfigData } from '../../pages/ChallengeConfig';
const STORAGE_KEY='dc_training_challenge_arcade_drafts_v1';
export type TrainingArcadeDraft={participantId:string;presetId:string;savedAt:number;hits:ArcadeHit[];config?:ChallengeConfigData;assignments?:Record<string,ArcadeObjective[]>;ghost?:number[]};
const keyFor=(participantId:string,presetId:string)=>`${participantId}::${presetId}`;
const read=():Record<string,TrainingArcadeDraft>=>{
 try{
  const data=JSON.parse(localStorage.getItem(STORAGE_KEY)||'{}');
  return data&&typeof data==='object'&&!Array.isArray(data)?data:{};
 }catch{return {}}
};
const write=(data:Record<string,TrainingArcadeDraft>)=>{try{localStorage.setItem(STORAGE_KEY,JSON.stringify(data))}catch{}};
export function loadTrainingArcadeDraft(participantId:string,presetId:string):TrainingArcadeDraft|null{
 if(!participantId||!presetId)return null;
 const d=read()[keyFor(participantId,presetId)];
 return d?.participantId===participantId&&d.presetId===presetId&&Array.isArray(d.hits)&&d.hits.length>0?d:null;
}
export function saveTrainingArcadeDraft(draft:TrainingArcadeDraft):void{
 if(!draft.participantId||!draft.presetId||!Array.isArray(draft.hits)||!draft.hits.length)return;
 const all=read();
 const valid=draft.hits.filter(h=>Boolean(h?.pid)&&['G','P','D','T','BULL','DBULL','MISS'].includes(h.zone)).slice(-2000);
 if(!valid.length)return;
 all[keyFor(draft.participantId,draft.presetId)]={...draft,savedAt:Date.now(),hits:valid};
 const keys=Object.keys(all).sort((a,b)=>Number(all[b]?.savedAt||0)-Number(all[a]?.savedAt||0));
 for(const key of keys.slice(24))delete all[key];
 write(all);
}
export function clearTrainingArcadeDraft(participantId:string,presetId:string):void{
 const data=read();const key=keyFor(participantId,presetId);
 if(Object.prototype.hasOwnProperty.call(data,key)){delete data[key];write(data)}
}
