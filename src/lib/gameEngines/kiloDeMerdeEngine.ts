/** KILO DE MERDE — jeu de cartes autonome, distinct du Président.
 * Règles Ducale : 4 cartes, échanges simultanés vers la gauche, 4 identiques,
 * défi BULL aux fléchettes quand un carré apparaît, 7 = chasse d'eau.
 */
export type KiloCard = { value: number; suit: number };
export type KiloRound = { number: number; loserId: string; card: KiloCard; delta: number; flushed: boolean; premature?: boolean; dartScores?: Record<string,number>; dartSeries?: number };
export type KiloDarts = { participants:string[]; scores:Record<string,number>; hits:Record<string,number[]>; index:number; series:number };
export type KiloState = {
  playerIds: string[];
  hands: Record<string, KiloCard[]>;
  pile: KiloCard[];
  kilos: Record<string, number>;
  awarded: Record<string, KiloCard[]>;
  selections: Record<string, number>;
  phase: 'select' | 'shootout' | 'result' | 'finished';
  darts: KiloDarts | null;
  selectorIndex: number;
  /** Révision de distribution/échange : empêche la réutilisation d’anciens boutons. */
  exchangeEpoch: number;
  rounds: KiloRound[];
  maxRounds: number;
  winnerId: string | null;
  notice: string;
};
const RANKS_BY_PLAYERS: Record<number,number[]> = {
  3:[11,12,13], 4:[2,11,12,13], 5:[2,3,11,12,13],
  6:[2,3,4,11,12,13], 7:[2,3,4,5,11,12,13],
  8:[2,3,4,5,6,11,12,13], 9:[2,3,4,5,6,8,11,12,13],
  10:[2,3,4,5,6,8,9,11,12,13],
};
export const kiloCardLabel = (v:number) => ({11:'V',12:'D',13:'R',14:'A'} as Record<number,string>)[v] || String(v);
export const kiloCardPenalty = (v:number) => v===14?100:v;
function shuffle<T>(arr:T[]):T[]{const a=[...arr];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
function beginBullChallenge(ids:string[], series=1):KiloDarts {
  return {participants:[...ids],scores:Object.fromEntries(ids.map(id=>[id,0])),hits:Object.fromEntries(ids.map(id=>[id,[]])),index:0,series};
}
/** Défi BULL : trois fléchettes par joueur, MISS 0, BULL25 25, DBULL 50.
 * Le plus faible score prend la pénalité. Égalité : nouveau barrage entre ex æquo.
 * expectedPlayerId/epoch protègent le téléphone partagé et les anciens boutons.
 */
export function kiloThrowBull(state:KiloState, value:0|25|50, expectedPlayerId?:string, expectedEpoch?:number):KiloState {
  if(state.phase!=='shootout'||!state.darts||![0,25,50].includes(value)) return state;
  if(expectedEpoch!==undefined&&expectedEpoch!==state.exchangeEpoch) return state;
  const d=state.darts;
  const id=d.participants[d.index];
  if(expectedPlayerId!==undefined&&expectedPlayerId!==id)return state;
  if((d.hits[id]||[]).length>=3)return state;
  const hits={...d.hits,[id]:[...d.hits[id],value]};
  const scores={...d.scores,[id]:d.scores[id]+value};
  const nextIndex=hits[id].length>=3?d.index+1:d.index;
  if(nextIndex<d.participants.length){
    const nextId=d.participants[nextIndex];
    return {...state,darts:{...d,hits,scores,index:nextIndex},exchangeEpoch:state.exchangeEpoch+1,
      notice:nextIndex!==d.index?'Volée terminée : passez le téléphone au tireur suivant.':`Fléchette ${hits[id].length}/3 enregistrée.`};
  }
  const minimum=Math.min(...d.participants.map(pid=>scores[pid]));
  const tied=d.participants.filter(pid=>scores[pid]===minimum);
  if(tied.length>1){
    return {...state,darts:beginBullChallenge(tied,d.series+1),exchangeEpoch:state.exchangeEpoch+1,
      notice:`ÉGALITÉ À ${minimum} POINTS : barrage BULL entre ${tied.length} joueurs, trois nouvelles fléchettes chacun.`};
  }
  const finishedDarts={...d,scores,hits,index:nextIndex};
  return kiloPenalty({...state,darts:finishedDarts},tied[0],false,state.rounds.length,'shootout',state.exchangeEpoch);
}
export function createKiloState(playerIds:string[], maxRounds:number):KiloState {
  const ids=[...new Set(playerIds)].slice(0,10);
  if(ids.length<3) throw new Error('Kilo de merde demande 3 à 10 joueurs.');
  const selected=new Set(RANKS_BY_PLAYERS[ids.length]);
  const cards:KiloCard[]=[];
  for(let value=2;value<=14;value++) for(let suit=0;suit<4;suit++) cards.push({value,suit});
  const distribution=shuffle(cards.filter(c=>selected.has(c.value)));
  const pile=shuffle(cards.filter(c=>!selected.has(c.value)));
  const hands:Record<string,KiloCard[]>={};
  ids.forEach((id,i)=>hands[id]=distribution.slice(i*4,i*4+4).sort((a,b)=>a.value-b.value||a.suit-b.suit));
  return {playerIds:ids,hands,pile,kilos:Object.fromEntries(ids.map(id=>[id,0])),awarded:Object.fromEntries(ids.map(id=>[id,[]])),selections:{},selectorIndex:0,exchangeEpoch:0,phase:ids.some(id=>kiloHasFour(hands[id]))?'shootout':'select',darts:ids.some(id=>kiloHasFour(hands[id]))?beginBullChallenge(ids):null,rounds:[],maxRounds:Math.max(1,Math.floor(maxRounds)),winnerId:null,notice:ids.some(id=>kiloHasFour(hands[id]))?'Carré dès la distribution : défi BULL ! Trois fléchettes par joueur.':'Chaque joueur choisit secrètement une carte à passer au voisin de gauche.'};
}
export function kiloHasFour(hand:KiloCard[]) {return hand.length===4 && hand.every(c=>c.value===hand[0].value);}
export function kiloSelectCard(state:KiloState, cardIndex:number, expectedPlayerId?:string, expectedExchangeEpoch?:number):KiloState {
  if(state.phase!=='select') return state;
  if(expectedExchangeEpoch !== undefined && expectedExchangeEpoch !== state.exchangeEpoch) return state;
  const id=state.playerIds[state.selectorIndex];
  // Un clic différé / double clic ne doit jamais sélectionner une carte dans
  // la main du joueur suivant sur un téléphone partagé.
  if(expectedPlayerId !== undefined && expectedPlayerId !== id) return state;
  if(cardIndex<0||cardIndex>=state.hands[id].length) return state;
  const selections={...state.selections,[id]:cardIndex};
  const nextIndex=state.selectorIndex+1;
  if(nextIndex<state.playerIds.length) return {...state,selections,selectorIndex:nextIndex,notice:'Carte choisie. Passe le téléphone au joueur suivant.'};
  // Échange simultané : chacun passe sa carte au voisin à sa gauche (ordre affiché).
  const outgoing=state.playerIds.map(pid=>state.hands[pid][selections[pid]]);
  const hands:Record<string,KiloCard[]>={};
  state.playerIds.forEach((pid,i)=>{
    const without=state.hands[pid].filter((_,j)=>j!==selections[pid]);
    const fromRight=outgoing[(i - 1 + state.playerIds.length)%state.playerIds.length];
    hands[pid]=[...without,fromRight].sort((a,b)=>a.value-b.value||a.suit-b.suit);
  });
  const four=state.playerIds.some(pid=>kiloHasFour(hands[pid]));
  return {...state,hands,selections:{},selectorIndex:0,exchangeEpoch:state.exchangeEpoch+1,phase:four?'shootout':'select',darts:four?beginBullChallenge(state.playerIds):null,notice:four?'QUATRE CARTES IDENTIQUES ! Défi BULL : trois fléchettes par joueur.':'Échange terminé : chaque joueur possède toujours quatre cartes. Recommencez.'};
}
export function kiloPenalty(
  state:KiloState, loserId:string, premature=false,
  expectedRound?:number, expectedPhase?:KiloState["phase"], expectedExchangeEpoch?:number
):KiloState {
  // Empêcher les anciens boutons de pénalité (double tape / transition) de
  // sanctionner un autre pli ou une phase ultérieure.
  if(expectedRound !== undefined && expectedRound !== state.rounds.length) return state;
  if(expectedPhase !== undefined && expectedPhase !== state.phase) return state;
  if(expectedExchangeEpoch !== undefined && expectedExchangeEpoch !== state.exchangeEpoch) return state;
  // Une tape prématurée est sanctionnée même avant la formation d'un carré.
  // Aucune carte en cours de sélection ne doit être échangée dans ce cas.
  if(premature || state.phase!=='shootout' || !state.darts || !state.playerIds.includes(loserId)) return state;
  // Un pénalisé ne peut être déterminé qu'après une volée complète de chaque joueur.
  if(state.darts.index!==state.darts.participants.length || state.darts.participants.some(id=>(state.darts!.hits[id]||[]).length!==3))return state;
  const minScore=Math.min(...state.darts.participants.map(id=>state.darts!.scores[id]));
  if(state.darts.participants.filter(id=>state.darts!.scores[id]===minScore).length!==1 || state.darts.scores[loserId]!==minScore)return state;
  const card=state.pile[0];
  if(!card) {
    const min = Math.min(...state.playerIds.map(id=>state.kilos[id]));
    const leaders = state.playerIds.filter(id=>state.kilos[id]===min);
    return {...state,phase:'finished',winnerId:leaders.length===1?leaders[0]:null,exchangeEpoch:state.exchangeEpoch+1,
      notice:'Le tas de kilos est vide : partie terminée.'};
  }
  const flushed=card.value===7;
  const before=state.kilos[loserId];
  const kilos={...state.kilos,[loserId]:flushed?0:before+kiloCardPenalty(card.value)};
  // La chasse d'eau remet toutes les cartes de pénalité du joueur dans le tas.
  const returned=flushed?state.awarded[loserId]:[];
  const awarded={...state.awarded,[loserId]:flushed?[]:[...state.awarded[loserId],card]};
  const pile=shuffle([...state.pile.slice(1),...returned,...(flushed ? [card] : [])]); // Le 7 de chasse d’eau reste dans le tas après activation.
  const rounds=[...state.rounds,{number:state.rounds.length+1,loserId,card,delta:flushed?-before:kiloCardPenalty(card.value),flushed,premature:false,dartScores:{...state.darts!.scores},dartSeries:state.darts!.series}];
  const finished=rounds.length>=state.maxRounds||pile.length===0;
  const lowest=Math.min(...state.playerIds.map(id=>kilos[id]));
  const leaders=state.playerIds.filter(id=>kilos[id]===lowest);
  const winnerId=finished&&leaders.length===1?leaders[0]:null; // Ex æquo : pas de gagnant arbitraire.
  const noticePrefix=`DÉFI BULL · ${loserId} : ${state.darts!.scores[loserId]} pts · `;
  const notice=noticePrefix+(flushed?`CHASSE D'EAU ! ${before} kg effacés. Les cartes de pénalité retournent au tas.`:`${kiloCardLabel(card.value)} : +${kiloCardPenalty(card.value)} kg pour le joueur pénalisé.`);
  return {...state,kilos,awarded,pile,rounds,winnerId,selections:{},selectorIndex:0,exchangeEpoch:state.exchangeEpoch+1,phase:finished?'finished':'result',darts:null,notice};
}
export function kiloContinue(state:KiloState):KiloState {
  if(state.phase!=='result') return state;
  const last=state.rounds[state.rounds.length-1];
  // Après un carré, ne pas rejouer indéfiniment avec le même carré.
  // On redistribue uniquement les cartes déjà dans les mains, jamais les cartes
  // de pénalité ni celles du tas. Chaque carte conserve sa valeur et son enseigne.
  const inHands=shuffle(state.playerIds.flatMap(id=>state.hands[id]||[]));
  const hands:Record<string,KiloCard[]>={};
  state.playerIds.forEach((id,i)=>{
    hands[id]=inHands.slice(i*4,i*4+4).sort((a,b)=>a.value-b.value||a.suit-b.suit);
  });
  const four=state.playerIds.some(id=>kiloHasFour(hands[id]));
  return {...state,hands,selections:{},phase:four?'shootout':'select',darts:four?beginBullChallenge(state.playerIds):null,selectorIndex:0,exchangeEpoch:state.exchangeEpoch+1,
    notice:four?'NOUVEAU CARRÉ ! Défi BULL : trois fléchettes par joueur.':'Nouvelle donne : les kilos sont conservés. Chaque joueur choisit une carte à passer à gauche.'};
}
export function kiloTotalCards(state:KiloState):number {
  return state.playerIds.reduce((n,id)=>n+state.hands[id].length+state.awarded[id].length,0)+state.pile.length;
}
