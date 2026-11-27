/** ENGLISH CRICKET — Batters & Bowlers (règles MSS publiées).
 * Deux manches : chacun bat puis lance. Le batteur cumule les surplus au-delà
 * de 40 points par volée de trois fléchettes ; le lanceur retire 1 guichet
 * au BULL25 ou 2 au DBULL50. Une manche se termine à 0 guichet.
 */
export type EnglishCricketHit = { sector:number; multiplier:1|2|3 };
export type EnglishCricketSnapshot = Omit<EnglishCricketState,'history'>;
export type EnglishCricketState = {
  players: [{id:string;name:string},{id:string;name:string}];
  innings:0|1|2;
  currentRole:'batter'|'bowler';
  dartsLeft:number;
  visitScore:number;
  wicketsLeft:number;
  runs:[number,number];
  visits:[number,number];
  winnerId:string|null;
  tied:boolean;
  history:EnglishCricketSnapshot[];
};
export function newEnglishCricket(players:{id:string;name:string}[]):EnglishCricketState {
  if(players.length!==2)throw new Error('English Cricket requiert exactement deux participants.');
  return {players:players.slice(0,2) as EnglishCricketState['players'],innings:0,currentRole:'batter',dartsLeft:3,visitScore:0,wicketsLeft:10,runs:[0,0],visits:[0,0],winnerId:null,tied:false,history:[]};
}
export function englishCricketCurrentPlayer(state:EnglishCricketState){
  if(state.innings>=2)return null;
  const idx=state.innings as 0|1;
  return state.currentRole==='batter'?state.players[idx]:state.players[1-idx];
}
export function englishCricketThrow(state:EnglishCricketState,hit:EnglishCricketHit):EnglishCricketState {
  if(state.innings>=2)return state;
  const {history:_history,...rest}=state;
  const before:EnglishCricketSnapshot={...rest,runs:[...state.runs] as [number,number],visits:[...state.visits] as [number,number]};
  const next:EnglishCricketState={...state,runs:[...state.runs] as [number,number],visits:[...state.visits] as [number,number],history:[...state.history,before]};
  const sector=Math.max(0,Math.min(25,Number(hit.sector)||0));
  const multiplier=hit.multiplier===3?3:hit.multiplier===2?2:1;
  if(next.currentRole==='batter') next.visitScore+=(sector===25?25:sector)* (sector===25?Math.min(multiplier,2):multiplier);
  else if(sector===25) next.wicketsLeft=Math.max(0,next.wicketsLeft-(multiplier===2?2:1));
  next.dartsLeft-=1;
  if(next.currentRole==='bowler' && next.wicketsLeft===0){
    if(next.innings===1){next.innings=2;next.tied=next.runs[0]===next.runs[1];next.winnerId=next.tied?null:next.players[next.runs[0]>next.runs[1]?0:1].id;return next;}
    next.innings=1;next.currentRole='batter';next.dartsLeft=3;next.visitScore=0;next.wicketsLeft=10;return next;
  }
  if(next.dartsLeft===0){
    if(next.currentRole==='batter'){
      next.runs[next.innings as 0|1]+=Math.max(0,next.visitScore-40);
      next.visits[next.innings as 0|1]+=1;
      next.currentRole='bowler';
    }else next.currentRole='batter';
    next.visitScore=0;next.dartsLeft=3;
  }
  return next;
}
export function englishCricketUndo(state:EnglishCricketState):EnglishCricketState {
  if(!state.history.length)return state;
  const old=state.history[state.history.length-1];
  return {...old,history:state.history.slice(0,-1)};
}
