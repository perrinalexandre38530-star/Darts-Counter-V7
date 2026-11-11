/** Thin History V4 reader for the separate CHALLENGE archive. */
import { History } from './history';
import { isChallengeMatchRecord, challengeRecordModeId } from './challengeArchiveCore';
export * from './challengeArchiveCore';
const txt=(value:unknown)=>String(value??'').trim();
/** Reads only CHALLENGE matches. Existing records are never rewritten. */
export async function loadChallengeArchive({hydrate=false,modeId}:{hydrate?:boolean;modeId?:string|null}={}):Promise<any[]>{
 const rows=(await History.list()).filter(isChallengeMatchRecord)
  .filter(row=>!modeId||challengeRecordModeId(row)===modeId);
 if(!hydrate)return rows;
 const result:any[]=[];
 // Limit concurrent IDB reads and decode work on Android.
 for(let pos=0;pos<rows.length;pos+=6){
  const batch=rows.slice(pos,pos+6);
  result.push(...await Promise.all(batch.map(async row=>{
   try {return (await History.get(txt(row?.id||row?.matchId)))||row;}catch{return row;}
  })));
 }
 return result;
}
