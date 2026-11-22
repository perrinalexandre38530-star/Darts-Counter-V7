/** LE MEXICAIN — MARIACHI contracts and TORTILLA / ENCHILADAS bonuses.
 * Pure, deterministic rules shared by the engine, keypad, bots and live score.
 * Contract selection is per completed RONDA, never per player.
 */
import type { GameDart } from '../types-game';

export type MariachiColor = 'RED' | 'GREEN' | 'BLACK' | 'WHITE';
export type MariachiContract = {
  kind: string;
  label: string;
  sectors: number[];
  beds: Array<'S' | 'D' | 'T'>;
  colors: MariachiColor[];
  parity: 'even' | 'odd' | 'all';
  allowBull: boolean;
  enabled: boolean;
};
const allNumbers = Array.from({length:20},(_,i)=>i+1);
const greenSegments = new Set([1,4,6,15,17,19,16,11,9,5]);
function hash(seed:string):number { let h=2166136261; for(const c of seed) { h^=c.charCodeAt(0);h=Math.imul(h,16777619); }return h>>>0; }
export function mariachiSelectedNumbers(value: unknown): number[] {
  const entries = Array.isArray(value) ? value : String(value ?? '').split(/[\s,;|/-]+/);
  return [...new Set(entries.map(Number).filter(n=>Number.isInteger(n)&&n>=1&&n<=20))].sort((a,b)=>a-b);
}
function shuffled(count:number,seed:string):number[]{
  const pool=[...allNumbers];let n=hash(seed)||1;
  for(let i=pool.length-1;i>0;i--){n=(Math.imul(n,1664525)+1013904223)>>>0;const j=n%(i+1);[pool[i],pool[j]]=[pool[j],pool[i]];}
  return pool.slice(0,Math.max(1,Math.min(20,count))).sort((a,b)=>a-b);
}
export function mariachiBoardColor(d:GameDart):MariachiColor|null {
  if(!d||d.bed==='MISS')return null;
  if(d.bed==='IB')return 'RED';
  if(d.bed==='OB')return 'GREEN';
  const n=Number(d.number||0);if(n<1||n>20)return null;
  const isGreen=greenSegments.has(n);
  return d.bed==='S'?(isGreen?'WHITE':'BLACK'):(isGreen?'GREEN':'RED');
}
function bedsFor(raw:unknown):Array<'S'|'D'|'T'>{
  const v=String(raw||'all').toLowerCase();
  if(v==='double')return ['D']; if(v==='triple')return ['T'];if(v==='dt')return ['D','T'];if(v==='single')return ['S'];
  return ['S','D','T'];
}
export function mariachiContract(options:any, seedText:string, round:number):MariachiContract {
  if(options?.mariachiEnabled!=='yes')return {enabled:false,kind:'classic',label:'',sectors:[],beds:['S','D','T'],colors:[],parity:'all',allowBull:false};
  const selected=String(options?.mariachiMode||'multisectors');
  // A new target each RONDA is NOT a new contract family. The family rotation
  // must be explicitly chosen (or the FIESTA preset) so manually configured
  // MULTISECTEURS / COULEURS / PAIRS games keep their rules.
  // In legacy V195–V250 configuration, 'round' was labelled as renewing
  // the *contract*, yet silently kept MULTISECTEURS. Treat it as full family
  // rotation for NEW games. Old active games keep their cached round contracts.
  const familyRotation=selected==='fiesta' || options?.mariachiRotation==='families'
    || options?.mariachiRotation==='round'
    || (!options?.mariachiRotation && selected==='multisectors');
  const index=options?.mariachiRotation==='fixed' && !familyRotation ? 0 : Math.max(0,round);
  const types=['multisectors','doubles','triples','colors','parity'];
  // A complete cycle contains every family exactly once. No two consecutive
  // RONDAS are the same family; cycles and order are deterministic on restore.
  const familyOffset=hash(`${seedText}:mariachi:fiesta`) % types.length;
  const kind=familyRotation ? types[(familyOffset+index)%types.length] : selected;
  const count=Math.max(1,Math.min(20,Math.round(Number(options?.mariachiSegmentCount||3))));
  const manual=mariachiSelectedNumbers(options?.mariachiNumbers);
  const useManual=options?.mariachiPick==='manual';
  const sectors=useManual?manual:shuffled(count,`${seedText}:mariachi:sectors:${index}`);
  const wantedColors=String(options?.mariachiColors ?? 'RED,GREEN').toUpperCase().split(',').filter((x:any)=>['RED','GREEN','BLACK','WHITE'].includes(x)) as MariachiColor[];
  // During FIESTA the color contract changes among the selected target colors,
  // and a PAIRS contract alternates with IMPAIRS on the following family cycle.
  // Outside FIESTA, user-selected colors/parity remain unchanged.
  const familyCycle=Math.floor(index/types.length);
  const colors=(kind==='colors'||kind==='custom')
    ? (familyRotation && kind==='colors' && wantedColors.length
      ? [wantedColors[(hash(`${seedText}:colors`)+familyCycle)%wantedColors.length]]
      : [...new Set(wantedColors)]) : [];
  const parityRaw=String(options?.mariachiParity||'even');
  const requestedParity=parityRaw==='odd'?'odd':parityRaw==='all'?'all':'even';
  const parity=(kind==='parity'||kind==='custom')
    ? (familyRotation && kind==='parity'
      ? (familyCycle%2 ? (requestedParity==='odd'?'even':'odd') : (requestedParity==='all'?'even':requestedParity))
      : requestedParity) : 'all';
  const beds=kind==='doubles'?['D'] as Array<'S'|'D'|'T'>:kind==='triples'?['T'] as Array<'S'|'D'|'T'>:bedsFor(options?.mariachiBeds);
  const restrictSectors=['multisectors','doubles','triples','custom'].includes(kind);
  const validSectors=restrictSectors?sectors:allNumbers;
  const allowBull=kind==='colors' && options?.bullEnabled!=='no';
  const name:Record<string,string>={multisectors:'MULTISECTEURS',doubles:'DOUBLES',triples:'TRIPLES',colors:'COULEURS',parity:'PAIRS / IMPAIRS',custom:'PERSONNALISÉ'};
  const details=[restrictSectors?validSectors.join(' · '):'',kind==='parity'?(parity==='odd'?'IMPAIRS':parity==='even'?'PAIRS':'PAIRS / IMPAIRS'):'',colors.length?colors.map(c=>({RED:'ROUGE',GREEN:'VERT',BLACK:'NOIR',WHITE:'BLANC'}[c])).join(' / '):'',beds.length!==3?beds.join(' / '):''].filter(Boolean).join(' · ');
  return {enabled:true,kind,label:`${name[kind]||'MARIACHI'}${details?' · '+details:''}`,sectors:validSectors,beds,colors,parity,allowBull};
}
export function mariachiAccepts(d:GameDart, contract:MariachiContract):boolean {
  if(!contract?.enabled||!d||d.bed==='MISS')return false;
  if(['colors','custom'].includes(contract.kind)&&!contract.colors.length)return false;
  // Les BULL suivent aussi le contrat de multiplicateurs : BULL25 est un
  // simple, BULL50 un double. Un contrat TRIPLES ne peut donc pas scorer un
  // BULL50 rouge, même si ROUGE est une couleur autorisée.
  if(d.bed==='OB'||d.bed==='IB')return contract.allowBull
    && contract.beds.includes(d.bed==='OB'?'S':'D')
    && contract.colors.includes(mariachiBoardColor(d)!);
  const n=Number(d.number||0);
  if(!contract.sectors.includes(n)||!contract.beds.includes(d.bed as any))return false;
  if(contract.parity==='even'&&n%2!==0)return false;
  if(contract.parity==='odd'&&n%2!==1)return false;
  if(contract.colors.length&&!contract.colors.includes(mariachiBoardColor(d)!))return false;
  return true;
}
export function mariachiLegalDarts(contract:MariachiContract):GameDart[]{
  const all:GameDart[]=[];
  for(let n=1;n<=20;n++)for(const bed of ['S','D','T'] as const){const dart={number:n,bed};if(mariachiAccepts(dart,contract))all.push(dart);}
  if(mariachiAccepts({bed:'OB'},contract))all.push({bed:'OB'});
  if(mariachiAccepts({bed:'IB'},contract))all.push({bed:'IB'});
  return all;
}
export type MexicainScoredVisit = {base:number;bonus:number;total:number;hits:number;bonusName:''|'TORTILLA'|'ENCHILADAS';validDarts:GameDart[]};
export function mexicainScoreDarts(darts:GameDart[], target:number, contract:MariachiContract|null, enableBonus:boolean):MexicainScoredVisit {
  const validDarts=darts.filter(d=>contract?.enabled?mariachiAccepts(d,contract):(target===21?d?.bed==='IB'||d?.bed==='OB':Number(d?.number||0)===target&&['S','D','T'].includes(String(d?.bed))));
  const value=(d:GameDart)=>d.bed==='IB'?50:d.bed==='OB'?25:Number(d.number||0)*(d.bed==='T'?3:d.bed==='D'?2:1);
  const base=validDarts.reduce((sum,d)=>sum+value(d),0);
  let bonus=0;let bonusName:MexicainScoredVisit['bonusName']='';
  if(enableBonus){
    const groups=new Map<number,Set<string>>();
    for(const dart of validDarts){if(!['S','D','T'].includes(String(dart?.bed)))continue;const n=Number(dart.number||0);if(!groups.has(n))groups.set(n,new Set());groups.get(n)!.add(dart.bed);}
    // Bonuses are mutually exclusive; one valid same-sector combination per visit.
    for(const [n,beds] of groups){
      if(beds.has('S')&&beds.has('D')&&beds.has('T')){bonus=4*n;bonusName='ENCHILADAS';break;}
      if(beds.has('D')&&beds.has('T')&&bonus< n){bonus=n;bonusName='TORTILLA';}
    }
  }
  return {base,bonus,total:base+bonus,hits:validDarts.length,bonusName,validDarts};
}
