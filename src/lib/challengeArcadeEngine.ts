/** CHALLENGE : moteur d'arcade pur et déterministe.
 * L'unique source du score est le journal des impacts exacts (avec G/P distincts).
 * Le même journal sert à ANNULER, reprendre, enregistrer et analyser le résultat.
 */
export type ArcadeZone='G'|'P'|'D'|'T'|'BULL'|'DBULL'|'MISS';
export type ArcadeHit={pid:string;zone:ArcadeZone;segment:number|null;choice?:ArcadeVariant;intendedSegment?:number|null;intendedZone?:ArcadeZone};
export type ArcadeVariant='classic'|'doubles'|'triples';
export type ArcadePlayConfig={
 catalogChallengeId:string;catalogLine:number;catalogVariant:ArcadeVariant;catalogRounds:number;
 catalogTarget?:number;catalogStep?:number;catalogMin?:number;catalogMax?:number;catalogLives?:number;
 catalogSeed?:number;catalogAssignments?:Record<string,ArcadeObjective[]>;catalogGhost?:number[];
};
export type ArcadeObjective={zone:ArcadeZone|'S'|'ANY'|'NUMBER';segment:number|null;label:string};
export type ArcadeProgress={
 attempts:number;successes:number;index:number;score:number;complete:boolean;remaining:number;
 accuracy:number;current:ArcadeObjective|null;hitResults:boolean[];streak:number;bestStreak:number;
 lives:number;visitScores:number[];scoreHistory:number[];message:string;totalObjectives:number;
};
export const BOARD_CLOCKWISE=[20,1,18,4,13,6,10,15,2,17,3,19,7,16,8,11,14,9,12,5] as const;
export const clampArcadeNumber=(value:number)=>Math.max(1,Math.min(20,Math.round(Number(value)||20)));
export const oppositeSector=(segment:number):number=>BOARD_CLOCKWISE[(BOARD_CLOCKWISE.indexOf(clampArcadeNumber(segment) as typeof BOARD_CLOCKWISE[number])+10)%20]!;
const cap=(v:number,min:number,max:number)=>Math.max(min,Math.min(max,Math.round(Number(v)||min)));
const S=(n:number):ArcadeObjective=>({zone:'S',segment:n,label:`S${n}`});
const Z=(zone:ArcadeObjective['zone'],segment:number|null):ArcadeObjective=>({zone,segment,label:segment===null?zone==='DBULL'?'DBULL 50':zone==='BULL'?'BULL 25':zone==='D'?'DOUBLES':zone==='T'?'TRIPLES':zone==='S'?'SIMPLES':String(zone):`${zone}${segment}`});
const wheel=(start:number,shift:number)=>BOARD_CLOCKWISE[(BOARD_CLOCKWISE.indexOf(clampArcadeNumber(start) as typeof BOARD_CLOCKWISE[number])+shift+200)%20]!;
const mode=(c:ArcadePlayConfig)=>String(c.catalogChallengeId||'perfect-line');
const rounds=(c:ArcadePlayConfig)=>cap(c.catalogRounds,1,20);
const starting=(c:ArcadePlayConfig)=>clampArcadeNumber(c.catalogLine);
const goal=(c:ArcadePlayConfig)=>cap(c.catalogTarget||100,1,180);
export const arcadeHitValue=(h:ArcadeHit):number=>h.zone==='MISS'?0:h.zone==='BULL'?25:h.zone==='DBULL'?50:(h.segment||0)*(h.zone==='D'?2:h.zone==='T'?3:1);
export const formatArcadeHit=(h:ArcadeHit)=>h.zone==='MISS'?'MISS':h.zone==='BULL'?'BULL25':h.zone==='DBULL'?'DBULL50':`${h.zone}${h.segment||0}`;
export const isArcadeObjectiveHit=(objective:ArcadeObjective|null|undefined,hit:ArcadeHit):boolean=>{
 if(!objective||hit.zone==='MISS')return false;
 if(objective.zone==='ANY')return true;
 if(objective.zone==='NUMBER')return objective.segment===hit.segment;
 if(objective.zone==='BULL'||objective.zone==='DBULL')return objective.zone===hit.zone;
 return objective.segment===hit.segment&&(objective.zone==='S'?(hit.zone==='G'||hit.zone==='P'):objective.zone===hit.zone);
};
const numeric=(hit:ArcadeHit)=>hit.zone==='MISS'||hit.segment===null?null:hit.segment;
const sameNumber=(hit:ArcadeHit,n:number)=>numeric(hit)===n;
const isSingle=(hit:ArcadeHit)=>hit.zone==='G'||hit.zone==='P';
const visitOf=(hits:readonly ArcadeHit[],index:number)=>hits.slice(index*3,index*3+3);
const checksum=(c:ArcadePlayConfig,i:number)=>wheel(starting(c),i*7+cap(c.catalogSeed||1,1,1000)%7);

/** Paramètres et aides affichés par le configurateur partagé. */
export type ArcadeRuleDetails={kind:'path'|'score'|'streak'|'team';roundUnit:'OBJECTIFS'|'VOLÉES'|'PAIRES'|'TOURS';
 minPlayers:number;hint:string;usesLine:boolean;usesRounds:boolean;usesTarget:boolean;usesRange:boolean;usesStep:boolean;usesLives:boolean;usesVariant:boolean};
const PATH_IDS=new Set(['perfect-line','opposites','sniper','razor-edge','four-in-row','lock','snake','zigzag','spiral','compass','crazy-wheel','bull-sandwich','safe','collector','architects-duel','perfect-relay']);
const STREAK_IDS=new Set(['ping-pong','odd-even','ascension','hundred-streak','no-safety-net','three-lives']);
const MULTI_IDS=new Set(['architects-duel','exact-copy','perfect-relay','territory-war','revenge']);
const NO_ROUNDS=new Set(['perfect-line','compass','collector','contracts','bounty-hunt']);
export function arcadeRuleDetails(c:ArcadePlayConfig):ArcadeRuleDetails{
 const id=mode(c);
 const kind=id==='perfect-relay'?'team':PATH_IDS.has(id)?'path':STREAK_IDS.has(id)?'streak':'score';
 const usesTarget=['exact-count','upper-limit','milestones','hundred-streak','green-zone','controlled-roulette'].includes(id);
 return {kind,roundUnit:id==='opposites'||id==='zigzag'?'PAIRES':kind==='path'?'OBJECTIFS':'VOLÉES',
  minPlayers:MULTI_IDS.has(id)?2:1,
  hint:arcadeRuleDescription(c),
  usesLine:!['compass','winning-trio','double-impact','odd-even','three-kings','ascension','exact-count','green-zone','three-sectors','hundred-streak','upper-limit','collector','exact-copy','territory-war','ghost-challenge','revenge'].includes(id),
  usesRounds:!NO_ROUNDS.has(id),usesTarget,
  usesRange:id==='green-zone',usesStep:id==='crazy-wheel',usesLives:id==='three-lives'||id==='forbidden-zone',
  usesVariant:['opposites','three-kings','kings-choice','controlled-roulette','triple-precision'].includes(id)};
}
export function arcadeRuleDescription(c:ArcadePlayConfig):string{
 const id=mode(c),n=starting(c),r=rounds(c),target=goal(c);
 const overrides:Record<string,string>={
  'perfect-line':`D${n} → G${n} → T${n} → P${n} → BULL25 → DBULL50. Chaque bonne touche avance immédiatement.`,
  opposites:`${r} paires de secteurs diamétralement opposés, ${c.catalogVariant==='doubles'?'uniquement en double':c.catalogVariant==='triples'?'uniquement en triple':'en simple'}, au minimum de fléchettes.`,
  sniper:`${r} cibles exactes (G/P/D/T). Une bonne touche avance, une erreur garde la cible.`,
  'razor-edge':`Toucher ${r} petits simples (P) imposés : un grand simple (G) ne compte jamais.`,
  'four-in-row':`Sur chaque ligne : G → P → T → D, dans l'ordre. ${r} ligne(s) à réussir.`,
  lock:`Ouvrir en simple S${n}, puis refermer en double D${n}. Trois erreurs sur le double réinitialisent la serrure.`,
  'triple-precision':'Trois triples distincts T20, T19, T18, dans l’ordre, sur une seule volée. Chaque volée réussie = 300 points.',
  'forbidden-zone':`Atteindre T${n}. Toute autre zone du numéro ${n} fait perdre une vie.`,
  snake:`Parcourir ${Math.min(20,r)} secteurs dans l'ordre réel de la cible (20 → 1 → 18 → 4…).`,
  zigzag:`${r} allers-retours entre un secteur et son opposé.`,
  spiral:`${r} tours sur des couronnes alternées D, G, T, P et des numéros qui tournent.`,
  compass:'20 (Nord) → 6 (Est) → 3 (Sud) → 11 (Ouest) → BULL25.',
  'ping-pong':`Alterner S${n} et S${oppositeSector(n)} le plus longtemps possible sans faute.`,
  'crazy-wheel':`Après chaque cible, avancer de ${cap(c.catalogStep||3,1,19)} secteurs dans le sens horaire.`,
  'winning-trio':'En une volée, toucher un simple, puis un double, puis un triple, sur des numéros libres.',
  'double-impact':'Deux doubles distincts minimum dans une volée ; trois doubles distincts donnent un bonus.',
  'odd-even':'Alterner numéro pair, puis impair, en conservant la plus longue série de touches.',
  'three-kings':`20 → 19 → 18 en trois fléchettes, ${c.catalogVariant==='triples'?'uniquement en triples':'toutes couronnes autorisées'}.`,
  ascension:'Chaque numéro doit être strictement supérieur au précédent. La série repart à zéro après une erreur.',
  'bull-sandwich':`BULL25 → S${n} → DBULL50, dans cet ordre.`,
  'exact-count':`Atteindre exactement ${target} points en trois fléchettes. Dépassement = volée ratée.`,
  milestones:`Atteindre au moins ${Math.max(10,target-40)} points, puis augmenter le palier de 20 points à chaque réussite.`,
  'green-zone':`Marquer entre ${cap(c.catalogMin||60,0,180)} et ${cap(c.catalogMax||80,1,180)} points par volée, sans dépasser.`,
  'three-sectors':'Trois numéros tous différents dans une même volée. Seules les volées complètes comptent.',
  'hundred-streak':`Enchaîner le plus de volées à ${target} points ou plus, sans descendre sous le seuil.`,
  'upper-limit':`Se rapprocher au maximum de ${target} points sans dépasser ce plafond.`,
  'all-or-nothing':'Trois cibles imposées à toucher dans l’ordre. Une erreur annule les points de la volée.',
  'no-safety-net':`Toucher sans erreur la cible imposée (S${n}, puis la suivante). Première faute = fin immédiate.`,
  'three-lives':`Objectifs annoncés avec ${cap(c.catalogLives||3,1,10)} vies. Chaque échec enlève une vie.`,
  minefield:'Les numéros récompensés sont indiqués. Les numéros piégés (opposés) retirent 100 points.',
  rescue:'Après deux échecs, la troisième fléchette doit toucher la cible imposée pour marquer 100 points.',
  'armored-streak':'Chaque touche valide rapporte dans une cagnotte ; elle est sécurisée après trois touches consécutives.',
  safe:`Ouvrir une combinaison de ${r} segments précis générés à partir du numéro ${n}.`,
  'kings-choice':`Avant de lancer, choisir ${c.catalogVariant==='doubles'?'les doubles':c.catalogVariant==='triples'?'les triples':'les simples'} : le multiplicateur dépend du risque.`,
  'bounty-hunt':'Récolter les primes de 10 numéros distincts. Une même prime ne peut être gagnée qu’une fois.',
  contracts:'Réussir au moins deux doubles différents, un BULL25 et un triple en neuf fléchettes.',
  'controlled-roulette':`Le numéro change à chaque volée. Le joueur doit toucher la zone ${c.catalogVariant==='doubles'?'double':c.catalogVariant==='triples'?'triple':'simple'} annoncée.`,
  collector:'Collectionner G, P, D, T, BULL25 et DBULL50, dans n’importe quel ordre.',
  'architects-duel':'Chaque adversaire impose trois numéros cibles à l’autre. Terminer ses cibles en un minimum de fléchettes.',
  'exact-copy':'Le premier joueur crée une combinaison de trois impacts. Le suivant doit les reproduire exactement.',
  'perfect-relay':'Chaque coéquipier doit réaliser l’objectif assigné dans un parcours commun, à tour de rôle.',
  'territory-war':'Simple : conquérir un territoire libre ; double : voler ; triple : protéger un territoire possédé.',
  'ghost-challenge':'Affronter ses performances précédentes sur le même challenge, volée après volée.',
  revenge:'Les objectifs ratés du joueur précédent deviennent des occasions de points doubles.',
 };
 return overrides[id]||'Objectifs et score calculés selon la règle du défi.';
}
export const arcadeBountyNumbers=(c:ArcadePlayConfig):number[]=>Array.from({length:10},(_,i)=>wheel(starting(c),i));
export function arcadeObjectives(c:ArcadePlayConfig,playerId?:string):ArcadeObjective[]{
 const id=mode(c),n=starting(c),r=rounds(c);
 if(id==='perfect-line')return [Z('D',n),Z('G',n),Z('T',n),Z('P',n),Z('BULL',null),Z('DBULL',null)];
 if(id==='opposites'||id==='zigzag'){
  const zone=id==='opposites'?(c.catalogVariant==='doubles'?'D':c.catalogVariant==='triples'?'T':'S'):'S';
  return Array.from({length:r},(_,i)=>{const value=wheel(n,i);return [Z(zone,value),Z(zone,oppositeSector(value))]}).flat();
 }
 if(id==='sniper')return Array.from({length:r},(_,i)=>Z((['D','T','P','G'] as const)[i%4]!,wheel(n,i*3)));
 if(id==='razor-edge')return Array.from({length:r},(_,i)=>Z('P',wheel(n,i)));
 if(id==='four-in-row')return Array.from({length:r},(_,i)=>['G','P','T','D'].map(zone=>Z(zone as ArcadeZone,wheel(n,i)))).flat();
 if(id==='lock')return Array.from({length:r},(_,i)=>[S(wheel(n,i)),Z('D',wheel(n,i))]).flat();
 if(id==='snake')return Array.from({length:Math.min(20,r)},(_,i)=>S(wheel(n,i)));
 if(id==='spiral')return Array.from({length:r*4},(_,i)=>Z((['D','G','T','P'] as const)[i%4]!,wheel(n,i)));
 if(id==='compass')return [S(20),S(6),S(3),S(11),Z('BULL',null)];
 if(id==='crazy-wheel')return Array.from({length:r},(_,i)=>S(wheel(n,i*cap(c.catalogStep||3,1,19))));
 if(id==='bull-sandwich')return Array.from({length:r},()=>[Z('BULL',null),S(n),Z('DBULL',null)]).flat();
 if(id==='safe')return Array.from({length:r},(_,i)=>Z((['D','T','P','G','D'] as const)[i%5]!,checksum(c,i)));
 if(id==='perfect-relay')return Array.from({length:r},(_,i)=>Z((['D','S','T','S','BULL'] as const)[i%5]!,i%5===4?null:wheel(n,i)));
 if(id==='architects-duel')return c.catalogAssignments?.[playerId||'']?.length?c.catalogAssignments[playerId||'']!:Array.from({length:3},(_,i)=>S(wheel(n,i*3)));
 if(id==='collector')return [Z('G',null),Z('P',null),Z('D',null),Z('T',null),Z('BULL',null),Z('DBULL',null)];
 return [];
}
const baseProgress=():ArcadeProgress=>({attempts:0,successes:0,index:0,score:0,complete:false,remaining:0,accuracy:0,current:null,hitResults:[],streak:0,bestStreak:0,lives:3,visitScores:[],scoreHistory:[],message:'',totalObjectives:0});
const finalise=(p:ArcadeProgress):ArcadeProgress=>({...p,accuracy:p.attempts?Math.round(p.successes/p.attempts*1000)/10:0,remaining:Math.max(0,p.totalObjectives-p.index)});
const streakTick=(p:ArcadeProgress,success:boolean)=>{p.hitResults.push(success);if(success){p.successes++;p.streak++;p.bestStreak=Math.max(p.bestStreak,p.streak);}else p.streak=0;};
const pathScore=(p:ArcadeProgress)=>{p.score=p.successes*100;};
function evaluatePath(hits:readonly ArcadeHit[],c:ArcadePlayConfig,playerId?:string):ArcadeProgress{
 const objectives=arcadeObjectives(c,playerId),id=mode(c),p=baseProgress();
 p.totalObjectives=objectives.length;p.lives=cap(c.catalogLives||3,1,10);
 if(id==='collector'){
  const collected=new Set<string>();
  for(const h of hits){if(collected.size===6)break;p.attempts++;
   const ok=h.zone!=='MISS'&&!collected.has(h.zone);streakTick(p,ok);if(ok)collected.add(h.zone);
   p.scoreHistory.push(p.successes*100);
  }
  p.index=collected.size;p.complete=collected.size===6;p.current=objectives.find(x=>!collected.has(x.zone))||null;
  p.message='Zones restant à collectionner : '+(['G','P','D','T','BULL','DBULL'].filter(x=>!collected.has(x)).join(' · ')||'Aucune');
  return finalise(p);
 }
 let failedDouble=0;
 for(const h of hits){if(p.index>=objectives.length)break;
  p.attempts++;
  const ok=isArcadeObjectiveHit(objectives[p.index],h);
  streakTick(p,ok);
  if(ok){p.index++;failedDouble=0;}
  else if(id==='lock'&&p.index%2===1&&++failedDouble>=3){p.index--;failedDouble=0;}
  p.scoreHistory.push(p.successes*100);
 }
 pathScore(p);p.complete=objectives.length>0&&p.index===objectives.length;p.current=objectives[p.index]||null;
 p.message=p.complete?'PARCOURS TERMINÉ':`Étape ${p.index+1}/${objectives.length} · fléchettes ${p.attempts}`;
 return finalise(p);
}
const isValidForBase=(h:ArcadeHit,c:ArcadePlayConfig,position:number)=>isArcadeObjectiveHit(S(wheel(starting(c),position)),h);
/** Evaluation indépendante pour chaque défi à score/séries, sur un maximum de N volées. */
function evaluateScoring(hits:readonly ArcadeHit[],c:ArcadePlayConfig,globalHits:readonly ArcadeHit[]=hits,playerId?:string):ArcadeProgress{
 const id=mode(c),r=rounds(c),p=baseProgress(),limit=(id==='contracts'?3:id==='bounty-hunt'?5:r)*3;
 const livesStart=cap(c.catalogLives||3,1,10);let lives=livesStart,pairTarget=starting(c),previousNumber=0,expectedParity=0;
 let bank=0,unbanked=0,contractDouble=new Set<number>(),collected=new Set<number>(),captured=new Set<number>();
 let consecutive=0,step=0;
 const visitValues:number[]=[];
 p.totalObjectives=id==='contracts'?3:id==='bounty-hunt'?10:id==='territory-war'?20:Math.ceil(limit/3);
 for(let i=0;i<Math.min(limit,hits.length);i++){
  const h=hits[i]!,visit=Math.floor(i/3),slot=i%3,number=numeric(h),value=arcadeHitValue(h);
  const before=p.score;let valid=false;let points=0;let stop=false;
  p.attempts++;
  switch(id){
   case 'triple-precision': valid=h.zone==='T'&&number===[20,19,18][slot];break;
   case 'forbidden-zone':valid=h.zone==='T'&&sameNumber(h,pairTarget);if(!valid&&sameNumber(h,pairTarget)){lives--;if(lives===0)stop=true;}if(valid)points=100;break;
   case 'winning-trio':valid=(slot===0?isSingle(h):slot===1?h.zone==='D':h.zone==='T');break;
   case 'double-impact':valid=h.zone==='D';break;
   case 'odd-even': valid=number!==null&&number%2===expectedParity; if(valid)expectedParity=1-expectedParity;else expectedParity=0;points=valid?10*p.bestStreak+10:0;break;
   case 'three-kings':valid=number===[20,19,18][slot]&&(c.catalogVariant!=='triples'||h.zone==='T');break;
   case 'ascension':valid=number!==null&&number>previousNumber;previousNumber=valid?(number??0):0;points=valid?20:0;break;
   case 'ping-pong': valid=isArcadeObjectiveHit(S(step%2===0?pairTarget:oppositeSector(pairTarget)),h);if(valid)step++;else step=0;points=valid?20:0;break;
   case 'exact-count': valid=value>0;break;
   case 'milestones': valid=value>0;break;
   case 'green-zone':valid=value>0;break;
   case 'three-sectors':valid=number!==null;break;
   case 'hundred-streak':valid=value>0;break;
   case 'upper-limit':valid=value>0;break;
   case 'all-or-nothing':valid=isArcadeObjectiveHit(Z((['D','S','T'] as const)[slot]!,wheel(pairTarget,visit)),h);break;
   case 'no-safety-net':valid=isValidForBase(h,c,step);if(valid)step++;else stop=true;points=valid?100:0;break;
   case 'three-lives':valid=isValidForBase(h,c,step);if(valid)step++;else{lives--;stop=lives===0;}points=valid?100:0;break;
   case 'minefield':valid=number!==null&&(number===wheel(pairTarget,visit)||number===wheel(pairTarget,visit+1));points=valid?value*2:(number===oppositeSector(wheel(pairTarget,visit))?-100:0);break;
   case 'rescue':valid=slot===2?isArcadeObjectiveHit(S(wheel(pairTarget,visit)),h):h.zone==='MISS';break;
   case 'armored-streak':valid=h.zone!=='MISS'&&sameNumber(h,pairTarget);if(valid){unbanked+=value;if((consecutive+1)%3===0){bank+=unbanked;unbanked=0;}}else{unbanked=0;consecutive=-1;}consecutive++;break;
   case 'kings-choice':{const selected=h.choice||c.catalogVariant;valid=selected==='doubles'?h.zone==='D':selected==='triples'?h.zone==='T':isSingle(h);points=valid?(selected==='doubles'?3:selected==='triples'?5:1)*10:0;break;}
   case 'bounty-hunt':valid=number!==null&&arcadeBountyNumbers(c).includes(number)&&!collected.has(number);if(valid&&number!==null){collected.add(number);points=number*10;}break;
   case 'contracts': valid=(h.zone==='D'&&!contractDouble.has(number||0))||h.zone==='BULL'||h.zone==='T';if(h.zone==='D'&&number!==null)contractDouble.add(number);if(h.zone==='BULL')captured.add(25);if(h.zone==='T')captured.add(50);break;
   case 'controlled-roulette':{const selected=h.choice||c.catalogVariant;valid=sameNumber(h,checksum(c,visit))&&(selected==='doubles'?h.zone==='D':selected==='triples'?h.zone==='T':isSingle(h));points=valid?value*2:0;break;}
   case 'exact-copy':{
    const position=globalHits.indexOf(h);
    const preceding=globalHits.slice(0,Math.max(0,position)).filter(row=>row.pid!==playerId).slice(-3);
    const reference=preceding[slot];
    valid=reference?reference.zone===h.zone&&reference.segment===h.segment:(h.zone!=='MISS');points=valid?100:0;break;
   }
   case 'ghost-challenge':valid=h.zone!=='MISS';points=value;break;
   case 'revenge':{
    const position=globalHits.indexOf(h);
    const precedent=globalHits.slice(0,Math.max(0,position)).filter(row=>row.pid!==playerId).slice(-3);
    const misses=precedent.filter(row=>row.zone==='MISS'&&row.intendedSegment!==undefined);
    const matched=misses.some(row=>row.intendedSegment===h.segment&&(row.intendedZone===h.zone||(row.intendedZone==='G'||row.intendedZone==='P')&&isSingle(h)));
    valid=h.zone!=='MISS';points=valid?value*(matched?2:1):0;break;
   }
   default:valid=h.zone!=='MISS';points=valid?value:0;
  }
  streakTick(p,valid);
  if(points)p.score+=points;
  if(id==='no-safety-net'||id==='three-lives'||id==='forbidden-zone')p.lives=lives;
  const partial=hits.slice(visit*3,visit*3+slot+1);
  if(slot===2){
   const values=partial.map(arcadeHitValue),sum=values.reduce((a,b)=>a+b,0);
   const allValid=p.hitResults.slice(-3).every(Boolean);
   switch(id){
    case 'triple-precision':case 'winning-trio':case 'three-kings':
      if(allValid)p.score+=id==='triple-precision'?300:id==='three-kings'?200:150;break;
    case 'double-impact':{
     const doubles=partial.filter(row=>row.zone==='D'&&row.segment!==null);
     const distinct=new Set(doubles.map(row=>row.segment)).size;
     if(distinct>=2)p.score+=distinct===3?250:100;break;
    }
    case 'exact-count':if(sum===goal(c))p.score+=100;break;
    case 'milestones':{const threshold=Math.min(180,Math.max(10,goal(c)-40)+p.index*20);if(sum>=threshold){p.index++;p.score+=100;}break;}
    case 'green-zone':{let low=cap(c.catalogMin||60,1,180),high=cap(c.catalogMax||80,1,180);if(low>high)[low,high]=[high,low];if(sum>=low&&sum<=high)p.score+=100+Math.max(0,sum-low);break;}
    case 'three-sectors':{const ns=partial.map(numeric);if(ns.every(n=>n!==null)&&new Set(ns).size===3)p.score+=sum;break;}
    case 'hundred-streak':if(sum>=goal(c)){p.index++;p.score+=100;}else stop=true;break;
    case 'upper-limit':if(sum<=goal(c))p.score+=sum;break;
    case 'all-or-nothing':if(allValid)p.score+=300;break;
    case 'rescue':if(partial[0]?.zone==='MISS'&&partial[1]?.zone==='MISS'&&p.hitResults[i])p.score+=100;break;
   }
   p.visitScores.push(p.score-(visitValues[visit]??0));p.scoreHistory.push(p.score);visitValues[visit+1]=p.score;
  }
  if(id==='armored-streak')p.score=bank;
  if(id==='contracts')p.index=Math.min(3,(contractDouble.size>=2?1:0)+(captured.has(25)?1:0)+(captured.has(50)?1:0));
  if(id==='bounty-hunt')p.index=collected.size;
  if(id==='no-safety-net'||id==='three-lives'||id==='hundred-streak')p.index=Math.max(p.index,p.bestStreak);
  if(stop){p.complete=true;break;}
 }
 if(!p.complete)p.complete=p.attempts>=limit||(id==='contracts'&&p.index>=3)||(id==='bounty-hunt'&&p.index>=10);
 if(id==='minefield')p.message=`PRIMES : ${wheel(starting(c),Math.floor(p.attempts/3))} / ${wheel(starting(c),Math.floor(p.attempts/3)+1)} · MINE : ${oppositeSector(wheel(starting(c),Math.floor(p.attempts/3)))}`;
 else if(id==='ghost-challenge'&&c.catalogGhost?.length){const ghost=c.catalogGhost[Math.min(Math.floor(p.attempts/3),c.catalogGhost.length-1)]||0;p.message=`FANTÔME : ${ghost} pts · ${p.score>=ghost?'EN AVANCE':'EN RETARD'} de ${Math.abs(p.score-ghost)} pts`;}
 else if(id==='contracts')p.message=`Contrats : ${p.index}/3 · 2 doubles distincts / BULL / triple`;
 else if(id==='bounty-hunt')p.message=`Primes récupérées : ${collected.size}/10`;
 else if(id==='three-lives'||id==='forbidden-zone')p.message=`${lives} vie(s) restante(s)`;
 else p.message=`${p.bestStreak} touches de suite · ${p.score} pts`;
 p.lives=lives;
 if(!['milestones','hundred-streak','contracts','bounty-hunt'].includes(id))p.index=Math.min(p.totalObjectives,Math.floor(p.attempts/3));
 const upcoming=checksum(c,Math.floor(p.attempts/3));
 p.current=['controlled-roulette'].includes(id)?Z(c.catalogVariant==='doubles'?'D':c.catalogVariant==='triples'?'T':'S',upcoming):
  ['no-safety-net','three-lives'].includes(id)?S(wheel(starting(c),step)):
  ['minefield','rescue','armored-streak','forbidden-zone'].includes(id)?S(id==='forbidden-zone'?starting(c):wheel(starting(c),Math.floor(p.attempts/3))):
  id==='ping-pong'?S(step%2===0?starting(c):oppositeSector(starting(c))):
  id==='milestones'?Z('ANY',null):
  id==='triple-precision'?Z('T',[20,19,18][p.attempts%3]||20):
  id==='winning-trio'?Z((['S','D','T'] as const)[p.attempts%3]!,null):
  id==='three-kings'?Z(c.catalogVariant==='triples'?'T':'NUMBER',[20,19,18][p.attempts%3]||20):
  id==='all-or-nothing'?Z((['D','S','T'] as const)[p.attempts%3]!,wheel(starting(c),Math.floor(p.attempts/3))):
  id==='exact-count'?{zone:'ANY',segment:null,label:`RESTE ${Math.max(0,goal(c)-hits.slice(Math.floor(p.attempts/3)*3,p.attempts).reduce((sum,h)=>sum+arcadeHitValue(h),0))} PTS`}:
  id==='green-zone'?{zone:'ANY',segment:null,label:`${Math.min(c.catalogMin||60,c.catalogMax||80)}–${Math.max(c.catalogMin||60,c.catalogMax||80)} PTS`}:
  id==='upper-limit'?{zone:'ANY',segment:null,label:`PLAFOND ${goal(c)} PTS`}:
  id==='hundred-streak'?{zone:'ANY',segment:null,label:`MINIMUM ${goal(c)} PTS`}:
  id==='double-impact'?{zone:'D',segment:null,label:'2 DOUBLES DISTINCTS'}:
  id==='three-sectors'?{zone:'NUMBER',segment:null,label:'3 NUMÉROS DISTINCTS'}:
  id==='rescue'?p.attempts%3===2?S(wheel(starting(c),Math.floor(p.attempts/3))):{zone:'ANY',segment:null,label:'MISS (PRÉPARATION)'}:
  id==='kings-choice'?{zone:c.catalogVariant==='doubles'?'D':c.catalogVariant==='triples'?'T':'S',segment:null,label:'VISER '+(c.catalogVariant==='doubles'?'DOUBLES':c.catalogVariant==='triples'?'TRIPLES':'SIMPLES')}:
  null;
 return finalise(p);
}

/** Territoires partagés : calculés sur le journal global, jamais indépendamment par joueur. */
export type ArcadeTerritory={owner:string;protectedUntil:number};
export function arcadeTerritories(hits:readonly ArcadeHit[]):Record<number,ArcadeTerritory>{
 const board:Record<number,ArcadeTerritory>={};
 hits.forEach((h,i)=>{
  const n=numeric(h);if(n===null)return;
  const found=board[n];
  if(isSingle(h)){if(!found)board[n]={owner:h.pid,protectedUntil:0};}
  if(h.zone==='D'){if(!found||found.owner===h.pid||found.protectedUntil<=Math.floor(i/3))board[n]={owner:h.pid,protectedUntil:0};}
  if(h.zone==='T'&&found?.owner===h.pid)board[n]={...found,protectedUntil:Math.floor(i/3)+2};
 });return board;
}
export function evaluateArcadeProgress(hits:readonly ArcadeHit[],config:ArcadePlayConfig,globalHits:readonly ArcadeHit[]=hits,playerId?:string):ArcadeProgress{
 const id=mode(config);
 if(id==='perfect-relay'){
  const objectives=arcadeObjectives(config),p=baseProgress();let index=0;
  const all=globalHits;
  p.totalObjectives=objectives.length;
  for(const h of all){if(index>=objectives.length)break;const valid=isArcadeObjectiveHit(objectives[index],h);p.attempts++;streakTick(p,valid);if(valid)index++;p.scoreHistory.push(p.successes*100);}
  p.index=index;p.score=p.successes*100;p.complete=index>=objectives.length;p.current=objectives[index]||null;p.message='RELAIS COMMUN · chaque étape appartient à un équipier différent';return finalise(p);
 }
 if(id==='territory-war'){
  const board=arcadeTerritories(globalHits),p=baseProgress();p.totalObjectives=20;p.attempts=hits.length;p.successes=hits.filter(h=>h.zone!=='MISS').length;p.hitResults=hits.map(h=>h.zone!=='MISS');p.index=Object.values(board).filter(t=>t.owner===playerId).length;p.score=p.index*100;
  p.complete=hits.length>=rounds(config)*3;p.message=`${p.index} territoires conquis / 20`;return finalise(p);
 }
 if(PATH_IDS.has(id))return evaluatePath(hits,config,playerId);
 return evaluateScoring(hits,config,globalHits,playerId);
}
export function currentArcadePlayer(hits:readonly ArcadeHit[],ids:readonly string[],config:ArcadePlayConfig):string|null{
 if(!ids.length)return null;
 const id=mode(config);
 if(id==='perfect-relay'){
  const p=evaluateArcadeProgress(hits,config,hits,ids[0]);
  if(p.complete)return null;
  return ids[p.index%ids.length]!;
 }
 const done=new Set(ids.filter(pid=>evaluateArcadeProgress(hits.filter(h=>h.pid===pid),config,hits,pid).complete));
 if(done.size===ids.length)return null;
 if(!hits.length)return ids[0]!;
 const last=hits[hits.length-1]!,index=ids.indexOf(last.pid),individual=hits.filter(h=>h.pid===last.pid).length;
 if(!done.has(last.pid)&&individual%3!==0)return last.pid;
 for(let i=1;i<=ids.length;i++){const next=ids[(Math.max(0,index)+i)%ids.length]!;if(!done.has(next))return next;}
 return null;
}
export const compareArcadeRanks=(a:ArcadeProgress,b:ArcadeProgress,c:ArcadePlayConfig)=>{
 const lower=arcadeRuleDetails(c).kind==='path'||arcadeRuleDetails(c).kind==='team';
 if(lower)return Number(b.complete)-Number(a.complete)||b.index-a.index||a.attempts-b.attempts||b.accuracy-a.accuracy;
 return b.score-a.score||b.bestStreak-a.bestStreak||b.accuracy-a.accuracy||a.attempts-b.attempts;
};
