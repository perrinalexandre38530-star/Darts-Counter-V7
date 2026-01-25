import type { DefiMode } from "../engine/DefiTypes";

const Bobs27: DefiMode = {
  id: "bobs27",
  label: "BOB'S 27",
  init(players) {
    return { players: players.map(p => ({ ...p, score: 27 })), turnIndex: 0, finished: false };
  },
  onThrow(state) { return state; },
  isFinished(state) { return state.players.some(p => p.score <= 0); },
  getRanking(state) { return [...state.players].sort((a,b)=>b.score-a.score); },
  getDisplay() { return { type: "score" }; }
};
export default Bobs27;
