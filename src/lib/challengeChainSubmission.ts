import { CHAIN_ID, CHAIN_VARIANTS, chainFormat, chainOnlinePerformances, parseChainOnlineTarget, chainConfigKey, type ChainConfig, type ChainImpact } from './challengeChains.ts';

export const CHAIN_ONLINE_BATCH_SIZE = 8;
export const CHAIN_ONLINE_MAX_DARTS = 100000;
const invalid = (message: string): never => { throw Object.assign(new Error(message), {status:400,code:'invalid_chain_evidence'}); };

/** Shared client/server contract. No client-provided aggregate is authoritative. */
export function chainSubmissionBatch(input: any) {
 const raw = input?.config;
 if (!raw || typeof raw !== 'object') return invalid('Configuration de chaîne manquante.');
 if (raw.chainVariant!==undefined&&!CHAIN_VARIANTS.some(([key])=>key===raw.chainVariant)) return invalid('Variante invalide.');
 if (raw.chainFormat!==undefined&&!['rounds','free','single','goal'].includes(raw.chainFormat)) return invalid('Format invalide.');
 if(raw.chainVariant==='hybrid'&&raw.chainFormat==='single') return invalid('Format incompatible.');
 const parsed = parseChainOnlineTarget(chainConfigKey(raw));
 if (!parsed) return invalid('Configuration de chaîne invalide.');
 const config: ChainConfig = {...parsed.config, chainEnded: chainFormat(parsed.config)==='free' && raw.chainEnded===true};
 if (!Array.isArray(input.entries) || !input.entries.length || input.entries.length>CHAIN_ONLINE_MAX_DARTS) return invalid('Journal de chaîne absent ou trop long.');
 const entries: ChainImpact[] = input.entries.map((hit: any) => {
  if (!hit || typeof hit.zone!=='string') return invalid('Impact invalide.');
  if (['G','P','S','D','T'].includes(hit.zone)) {
   if (!Number.isInteger(hit.segment)||hit.segment<1||hit.segment>20) return invalid('Secteur invalide.');
   return {zone:hit.zone,segment:hit.segment};
  }
  if (!['BULL','DBULL','MISS'].includes(hit.zone)||hit.segment!=null) return invalid('Zone invalide.');
  return {zone:hit.zone,segment:null};
 });
 // Preserve the validated, ordered evidence for the public detail screen.
 const journal=entries.map(({zone,segment})=>({zone,segment,hit:zone==='G'||zone==='P'||zone==='S'?'S':zone==='BULL'?'25':zone==='DBULL'?'50':zone}));
 const keys = input.keys;
 if (!Array.isArray(keys)||!keys.length||keys.length>CHAIN_ONLINE_BATCH_SIZE||new Set(keys).size!==keys.length||keys.some(k=>typeof k!=='string')) return invalid('Lot de chaînes invalide.');
 const performances = chainOnlinePerformances(entries, config);
 if (!performances.length||performances[0]?.darts!==entries.length) return invalid('Session incomplète ou impacts après la fin.');
 const byKey = new Map(performances.map(p=>[p.key,p]));
 if (keys.some(k=>!byKey.has(k))) return invalid('Catégorie incompatible avec la variante.');
 return keys.map((key:string)=>{
  const p=byKey.get(key)!;
  return {target:p.target,rule:p.rule,visits:p.visits,score:p.score,darts:p.darts,bestStreak:p.bestStreak,accuracy:p.accuracy,
   stats:{exerciseConfig:{...config,catalogChallengeId:CHAIN_ID,exerciseType:'arcade',rule:'arcade',visits:p.visits},chainCategory:p.key,chainStats:{[p.key]:p.stat},chainEvidenceVersion:1,entries:journal,score:p.score,darts:p.darts,bestStreak:p.bestStreak,accuracy:p.accuracy}};
 });
}
