/** V254: bounded, resumable, source-partitioned public score archive.
 * No browser scraping or source-directory entries are ingested here.
 * Objects live in a separate namespace from personal backups and LIVE v1.
 */
export const DARTS_ARCHIVE_V2_PREFIX = "sports-live-results/v2/darts";
export const DARTS_ARCHIVE_V2_JOB_PREFIX = "sports-live-results/v2/jobs/dartsapi";

export type VerifiedDartsScore = {
  id: string;
  playedOn?: string | null;
  competition?: string | null;
  round?: string | null;
  winner: { name: string; score?: number | null };
  loser: { name: string; score?: number | null };
  sourceName?: string | null;
  sourceUrl?: string | null;
  competitionMeta?: { countryCode?: string | null; level?: string | null } | null;
};
export type DartsArchiveFilters = { q:string; year:string; competition:string; country:string; level:string; source:string };
export type DartsSyncJob = { mode:"recent"|"backfill"; period:string; nextCursor:string|null; completed:boolean; totalFetched:number; updatedAt:string; lastError?:string|null };

type ArchiveDocument<T> = {version:2;sport:"darts";sourceId:string;period:string;updatedAt:string;results:T[]};
const PERIOD_REGEX = /^(19[7-9]\d|20\d\d)-(0[1-9]|1[0-2])$/;
const DATE_REGEX = /^(19[7-9]\d|20\d\d)-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

export function archivePeriod(date: string): string | null {
  const value = String(date || "").slice(0,10);
  if (!DATE_REGEX.test(value)) return null;
  const parsed=new Date(`${value}T00:00:00Z`);
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0,10)!==value) return null;
  return value.slice(0,7);
}
export function previousArchiveMonth(period: string): string {
  if (!PERIOD_REGEX.test(period)) throw new Error("invalid_period");
  const [year,month] = period.split("-").map(Number);
  return month > 1 ? `${year}-${String(month-1).padStart(2,"0")}` : `${year-1}-12`;
}
export function monthQueryRange(period: string): {from:string;to:string} {
  if (!PERIOD_REGEX.test(period)) throw new Error("invalid_period");
  const [year,month] = period.split("-").map(Number);
  const last = new Date(Date.UTC(year,month,0)).getUTCDate();
  return {from:`${period}-01`,to:`${period}-${String(last).padStart(2,"0")}`};
}
export function archivePartitionKey(period: string, sourceId: string): string {
  if (!PERIOD_REGEX.test(period) || !/^[a-z0-9_-]{2,64}$/.test(sourceId)) throw new Error("invalid_partition");
  return `${DARTS_ARCHIVE_V2_PREFIX}/${period.replace("-","/")}/${sourceId}.json`;
}
export function syncJobKey(mode: DartsSyncJob["mode"]): string { return `${DARTS_ARCHIVE_V2_JOB_PREFIX}/${mode}.json`; }

function valueKey(value: unknown): string {
  return String(value || "").toLocaleLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^\p{L}\p{N}]+/gu," ").trim();
}
function scoreIdentity(row: VerifiedDartsScore): string {
  // Match IDs are stable at the source. Otherwise use date, competition and participants,
  // independent of the score, so corrected scores replace earlier publications.
  if (row.id && !/^darts-result-\d+$/.test(row.id)) return row.id;
  const players = [valueKey(row.winner?.name),valueKey(row.loser?.name)].sort().join("|");
  return `${row.playedOn}|${valueKey(row.competition)}|${valueKey(row.round)}|${players}`;
}
function validVerifiedResult(row: VerifiedDartsScore): boolean {
  return !!(archivePeriod(String(row.playedOn || "")) && row.competition &&
    row.winner?.name?.trim() && row.loser?.name?.trim() && row.winner.name !== row.loser.name &&
    Number.isFinite(row.winner.score) && Number.isFinite(row.loser.score) &&
    Number(row.winner.score) > Number(row.loser.score) && Number(row.loser.score) >= 0);
}
export function dartsArchiveMatches(row: VerifiedDartsScore, filters: DartsArchiveFilters) {
  if (filters.year && !String(row.playedOn || "").startsWith(filters.year)) return false;
  if (filters.q && !valueKey(`${row.winner.name} ${row.loser.name} ${row.competition} ${row.round || ""} ${row.sourceName || ""}`).includes(valueKey(filters.q))) return false;
  if (filters.competition && !valueKey(row.competition).includes(valueKey(filters.competition))) return false;
  if (filters.country && filters.country !== String(row.competitionMeta?.countryCode || "").toUpperCase()) return false;
  if (filters.level && filters.level !== String(row.competitionMeta?.level || "")) return false;
  if (filters.source && !valueKey(row.sourceName).includes(valueKey(filters.source))) return false;
  return true;
}

/** Replace same-source matches by identity. NEVER truncate an archive silently. */
export async function appendDartsArchiveMonth(bucket:R2Bucket, period:string, sourceId:string, incoming:VerifiedDartsScore[]) {
  const key = archivePartitionKey(period,sourceId);
  const valid = incoming.filter(row => archivePeriod(String(row.playedOn || "")) === period && validVerifiedResult(row));
  // R2's conditional put is atomic: a concurrent collector/import cannot erase
  // results appended by another process. Read, merge, compare ETag, retry.
  for (let attempt=0;attempt<4;attempt++) {
    const oldObject = await bucket.get(key);
    const prior = oldObject ? await oldObject.json().catch(()=>null) as ArchiveDocument<VerifiedDartsScore>|null : null;
    if (prior && (prior.version !== 2 || prior.sourceId !== sourceId || prior.period !== period || !Array.isArray(prior.results))) throw new Error("invalid_existing_archive");
    if (!prior && !valid.length) return {period,sourceId,received:incoming.length,accepted:0,stored:0,added:0};
    const map = new Map<string,VerifiedDartsScore>();
    for (const row of prior?.results || []) if (validVerifiedResult(row)) map.set(scoreIdentity(row),row);
    for (const row of valid) map.set(scoreIdentity(row),row);
    if (map.size > 25000) throw new Error("month_partition_limit_exceeded; refine_partitioning_before_sync");
    const results = Array.from(map.values()).sort((a,b)=>String(b.playedOn).localeCompare(String(a.playedOn)));
    const doc:ArchiveDocument<VerifiedDartsScore> = {version:2,sport:"darts",sourceId,period,updatedAt:new Date().toISOString(),results};
    const written = await bucket.put(key,JSON.stringify(doc),{
      onlyIf:oldObject ? {etagMatches:oldObject.etag} : {etagDoesNotMatch:"*"},
      httpMetadata:{contentType:"application/json; charset=utf-8"},
      customMetadata:{kind:"sports-live-result-month",source:sourceId,period,count:String(results.length)},
    });
    if (written) return {period,sourceId,received:incoming.length,accepted:valid.length,stored:results.length,added:results.length-(prior?.results?.length || 0)};
  }
  throw new Error("concurrent_archive_write_conflict; safe_to_retry");
}
export async function appendDartsArchiveBatch(bucket:R2Bucket, sourceId:string, rows:VerifiedDartsScore[], maxMonths=24) {
  const byPeriod=new Map<string,VerifiedDartsScore[]>();
  for (const row of rows) {
    const period=archivePeriod(String(row.playedOn || ""));
    if (!period || !validVerifiedResult(row)) continue;
    const group=byPeriod.get(period)||[];group.push(row);byPeriod.set(period,group);
  }
  if (byPeriod.size > maxMonths) throw new Error("too_many_periods_in_import; split_feed_by_month");
  const partitions=[];
  for (const [period,group] of byPeriod) partitions.push(await appendDartsArchiveMonth(bucket,period,sourceId,group));
  return partitions;
}
export async function loadDartsSyncJob(bucket:R2Bucket,mode:DartsSyncJob["mode"]):Promise<DartsSyncJob|null> {
  const object=await bucket.get(syncJobKey(mode));
  if (!object) return null;
  const data=await object.json().catch(()=>null) as DartsSyncJob|null;
  return data && data.mode===mode && PERIOD_REGEX.test(data.period) && (data.nextCursor===null || typeof data.nextCursor==="string") ? data:null;
}
export async function saveDartsSyncJob(bucket:R2Bucket,job:DartsSyncJob) {
  if (!PERIOD_REGEX.test(job.period)) throw new Error("invalid_job_period");
  await bucket.put(syncJobKey(job.mode),JSON.stringify(job),{httpMetadata:{contentType:"application/json; charset=utf-8"}});
}

/** Results search traverses recorded R2 monthly partitions in descending date order.
 * The cursor identifies a partition and row index; totals are explicitly non-exhaustive.
 */
export async function searchDartsV2Archive(bucket:R2Bucket|null|undefined,filters:DartsArchiveFilters,cursor="",limit=80,maxPartitionsPerPage=24) {
  const empty={results:[] as VerifiedDartsScore[],nextCursor:null as string|null,archivePartitions:0,partitionsScanned:0,archivePartial:false,latestPartition:null as string|null,earliestPartition:null as string|null};
  if (!bucket) return empty;
  const prefix=`${DARTS_ARCHIVE_V2_PREFIX}/${filters.year ? `${filters.year}/` : ""}`;
  const keys:string[]=[];
  let marker:string|undefined;
  let truncated=false;
  // R2 listing is bounded; never claim it is complete when more pages exist.
  for (let i=0;i<10;i++) {
    const listing=await bucket.list({prefix,limit:1000,...(marker?{cursor:marker}:{})});
    keys.push(...listing.objects.map((o)=>o.key).filter((key)=>/\/\d{4}\/\d{2}\/[a-z0-9_-]+\.json$/.test(key)));
    if (!listing.truncated || !listing.cursor) break;
    if (i===9) {truncated=true;break;}
    marker=listing.cursor;
  }
  const sorted=keys.sort((a,b)=>b.localeCompare(a));
  // Group all providers by month before sorting matches. Otherwise alphabetical
  // source names can incorrectly place an old result ahead of a newer one.
  const groups=new Map<string,string[]>();
  for (const key of sorted) {
    const period=key.match(/\/(\d{4}\/\d{2})\/[^/]+\.json$/)?.[1];
    if (!period) continue;
    const group=groups.get(period)||[];group.push(key);groups.set(period,group);
  }
  const periods=[...groups.keys()].sort((a,b)=>b.localeCompare(a));
  const matchCursor=/^(\d{1,5})\.(\d{1,6})$/.exec(cursor);
  let part=matchCursor ? Math.min(Number(matchCursor[1]),periods.length) : 0;
  let rowIndex=matchCursor ? Number(matchCursor[2]):0;
  const results:VerifiedDartsScore[]=[];
  let inspected=0;
  let months=0;
  while(part<periods.length && months<maxPartitionsPerPage && results.length<limit){
    const matchingKeys=groups.get(periods[part])||[];
    // This bounded parallel read joins scores from all authorized providers of
    // the same month before paging, without fetching any external source.
    const objects=await Promise.all(matchingKeys.map(key=>bucket.get(key)));
    inspected+=matchingKeys.length;months++;
    const documents=await Promise.all(objects.map(obj=>obj ? obj.json().catch(()=>null) : Promise.resolve(null))) as (ArchiveDocument<VerifiedDartsScore>|null)[];
    const ordered=documents.flatMap(doc=>doc?.version===2 && Array.isArray(doc.results) ? doc.results:[])
      .sort((a,b)=>String(b.playedOn).localeCompare(String(a.playedOn)) || a.id.localeCompare(b.id));
    for(let i=rowIndex;i<ordered.length;i++) {
      const row=ordered[i];
      if(!dartsArchiveMatches(row,filters)) continue;
      results.push(row);
      if(results.length===limit){
        const nextCursor = i+1<ordered.length ? `${part}.${i+1}` : part+1<periods.length ? `${part+1}.0` : null;
        return {...empty,results,nextCursor,archivePartitions:sorted.length,partitionsScanned:inspected,
          archivePartial:truncated || !!nextCursor,latestPartition:sorted[0]||null,earliestPartition:sorted.at(-1)||null};
      }
    }
    part++;rowIndex=0;
  }
  return {...empty,results,nextCursor:part<periods.length?`${part}.0`:null,archivePartitions:sorted.length,
    partitionsScanned:inspected,archivePartial:truncated || part<periods.length,
    latestPartition:sorted[0]||null,earliestPartition:sorted.at(-1)||null};
}
