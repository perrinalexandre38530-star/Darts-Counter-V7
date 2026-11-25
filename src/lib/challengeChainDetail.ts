import {chainImpactKeys, type ChainImpact} from './challengeChains.ts';

/** A complete ordered journal only. Never manufacture impacts from aggregate counts. */
export function chainDetailJournal(stats: any, darts: number, category: string) {
 const raw=stats?.entries;
 if(!Array.isArray(raw)||!Number.isInteger(darts)||darts<1||raw.length!==darts)return null;
 const rows=[];
 let current=0;
 for(const item of raw){
  const zone=String(item?.zone||'');
  const segment=item?.segment??null;
  if(['G','P','S','D','T'].includes(zone)){
   if(!Number.isInteger(segment)||segment<1||segment>20)return null;
  }else if(!['BULL','DBULL','MISS'].includes(zone)||segment!==null)return null;
  const impact:ChainImpact={zone,segment};
  const success=chainImpactKeys(impact).includes(category);
  current=success?current+1:0;
  const label=zone==='BULL'?'25':zone==='DBULL'?'50':zone==='MISS'?'MISS':`${zone==='G'||zone==='P'?'S':zone}${segment}`;
  rows.push({label,success,current});
 }
 return rows;
}
