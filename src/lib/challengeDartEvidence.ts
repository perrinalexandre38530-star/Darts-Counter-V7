/** CHALLENGE · Evidence for a player's precise number of thrown darts.
 * A game's journal contains individual dart inputs, including MISS. Do not infer
 * a participant's throws from a match-wide total or from anonymised multiplayer
 * entries. This is a read-only adapter, never a backup migration.
 */
export type ChallengeDartEvidence={darts:number;source:'tagged-journal'|'solo-journal'};
const clean=(value:unknown)=>String(value??'').trim().replace(/^online:/i,'');
const validHits=new Set(['S','G','P','D','T','25','50','BULL','DBULL','BULL25','DBULL50','MISS']);
const isDart=(row:any)=>Boolean(row&&typeof row==='object'&&validHits.has(String(row.hit??row.zone??'').trim().toUpperCase()));
const owner=(row:any)=>clean(row?.pid??row?.playerId??row?.profileId??row?.userId??row?.onlineUserId);
const playersOf=(rec:any):any[]=>{
 const sources=[rec?.summary?.perPlayer,rec?.payload?.summary?.perPlayer,rec?.decoded?.summary?.perPlayer,rec?.players];
 return sources.find(value=>Array.isArray(value)&&value.length>0)||[];
};
export function getChallengeDartEvidence(rec:any,playerId:string):ChallengeDartEvidence|null{
 const id=clean(playerId);
 if(!id)return null;
 const roster=playersOf(rec);
 const multiDeclared=[rec?.summary?.perPlayer,rec?.payload?.summary?.perPlayer,rec?.decoded?.summary?.perPlayer,rec?.players].some(value=>Array.isArray(value)&&value.length>1);
 const solo=!multiDeclared&&roster.length===1&&[roster[0]?.id,roster[0]?.playerId,roster[0]?.profileId,roster[0]?.userId,roster[0]?.onlineUserId].some(value=>clean(value)===id);
 const status=String(rec?.status??rec?.payload?.status??rec?.summary?.status??'').trim().toLowerCase();
 const finished=['finished','complete','completed','done'].includes(status)||rec?.summary?.finished===true||rec?.payload?.summary?.finished===true;
 // A resume checkpoint may contain only the first few throws of a completed
 // match. For records we require the final payload/decoded journal instead.
 const sources=[rec?.payload?.state?.hits,rec?.decoded?.state?.hits,
  rec?.payload?.entries,rec?.decoded?.entries,rec?.payload?.state?.log,rec?.decoded?.state?.log,
  ...(!finished?[rec?.resume?.state?.hits,rec?.resume?.state?.log,rec?.resume?.state?.entries,rec?.resume?.livePayload?.entries]:[])];
 for(const rows of sources){
  if(!Array.isArray(rows)||!rows.length||!rows.every(isDart))continue;
  const named=rows.filter(row=>owner(row)===id);
  const unnamed=rows.some(row=>!owner(row));
  // Any unlabelled throw in a DUO/MULTI log could belong to this player.
  if(unnamed&&!solo)continue;
  if(named.length>0)return {darts:named.length+(solo?rows.filter(row=>!owner(row)).length:0),source:'tagged-journal'};
  if(solo&&rows.every(row=>!owner(row)))return {darts:rows.length,source:'solo-journal'};
 }
 return null;
}
