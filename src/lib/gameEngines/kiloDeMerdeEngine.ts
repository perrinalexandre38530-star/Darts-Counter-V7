/** KILO DE MERDE — jeu de cartes autonome, distinct du Président.
 * Règles Ducale : 4 cartes, échanges simultanés vers la gauche, 4 identiques,
 * dernier à taper = pénalité, 7 du tas = chasse d'eau intégrale.
 */
export type KiloCard = { value: number; suit: number };
export type KiloRound = { number: number; loserId: string; card: KiloCard; delta: number; flushed: boolean; premature?: boolean };
export type KiloState = {
  playerIds: string[];
  hands: Record<string, KiloCard[]>;
  pile: KiloCard[];
  kilos: Record<string, number>;
  awarded: Record<string, KiloCard[]>;
  selections: Record<string, number>;
  phase: 'select' | 'slap' | 'result' | 'finished';
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
  return {playerIds:ids,hands,pile,kilos:Object.fromEntries(ids.map(id=>[id,0])),awarded:Object.fromEntries(ids.map(id=>[id,[]])),selections:{},selectorIndex:0,exchangeEpoch:0,phase:ids.some(id=>kiloHasFour(hands[id]))?'slap':'select',rounds:[],maxRounds:Math.max(1,Math.floor(maxRounds)),winnerId:null,notice:ids.some(id=>kiloHasFour(hands[id]))?'Un joueur a déjà quatre cartes identiques : tout le monde tape sur le tas !':'Chaque joueur choisit secrètement une carte à passer au voisin de gauche.'};
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
  return {...state,hands,selections:{},selectorIndex:0,exchangeEpoch:state.exchangeEpoch+1,phase:four?'slap':'select',notice:four?'QUATRE CARTES IDENTIQUES ! Tout le monde tape sur le tas.':'Échange terminé : chaque joueur possède toujours quatre cartes. Recommencez.'};
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
  if((premature ? state.phase!=='select' : state.phase!=='slap') || !state.playerIds.includes(loserId)) return state;
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
  const rounds=[...state.rounds,{number:state.rounds.length+1,loserId,card,delta:flushed?-before:kiloCardPenalty(card.value),flushed,premature}];
  const finished=rounds.length>=state.maxRounds||pile.length===0;
  const lowest=Math.min(...state.playerIds.map(id=>kilos[id]));
  const leaders=state.playerIds.filter(id=>kilos[id]===lowest);
  const winnerId=finished&&leaders.length===1?leaders[0]:null; // Ex æquo : pas de gagnant arbitraire.
  const noticePrefix=premature?'TAPE PRÉMATURÉE · ':'';
  const notice=noticePrefix+(flushed?`CHASSE D'EAU ! ${before} kg effacés. Les cartes de pénalité retournent au tas.`:`${kiloCardLabel(card.value)} : +${kiloCardPenalty(card.value)} kg pour le joueur pénalisé.`);
  return {...state,kilos,awarded,pile,rounds,winnerId,selections:{},selectorIndex:0,exchangeEpoch:state.exchangeEpoch+1,phase:finished?'finished':'result',notice};
}
export function kiloContinue(state:KiloState):KiloState {
  if(state.phase!=='result') return state;
  const last=state.rounds[state.rounds.length-1];
  // Une tape prématurée n'interrompt que les sélections en cours :
  // les joueurs conservent leurs quatre cartes physiques.
  if(last?.premature) return {...state,selections:{},phase:'select',selectorIndex:0,exchangeEpoch:state.exchangeEpoch+1,
    notice:'Tape prématurée sanctionnée. Les mains sont conservées : reprenez les échanges.'};
  // Après un carré, ne pas rejouer indéfiniment avec le même carré.
  // On redistribue uniquement les cartes déjà dans les mains, jamais les cartes
  // de pénalité ni celles du tas. Chaque carte conserve sa valeur et son enseigne.
  const inHands=shuffle(state.playerIds.flatMap(id=>state.hands[id]||[]));
  const hands:Record<string,KiloCard[]>={};
  state.playerIds.forEach((id,i)=>{
    hands[id]=inHands.slice(i*4,i*4+4).sort((a,b)=>a.value-b.value||a.suit-b.suit);
  });
  const four=state.playerIds.some(id=>kiloHasFour(hands[id]));
  return {...state,hands,selections:{},phase:four?'slap':'select',selectorIndex:0,exchangeEpoch:state.exchangeEpoch+1,
    notice:four?'NOUVEAU CARRÉ À LA DISTRIBUTION ! Tout le monde tape sur le tas.':'Nouvelle donne : les kilos sont conservés. Chaque joueur choisit une carte à passer à gauche.'};
}
export function kiloTotalCards(state:KiloState):number {
  return state.playerIds.reduce((n,id)=>n+state.hands[id].length+state.awarded[id].length,0)+state.pile.length;
}
