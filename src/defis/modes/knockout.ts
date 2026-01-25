import type { DefiMode } from "../engine/DefiTypes";

const Knockout: DefiMode = {
  id: "knockout",
  label: "KNOCKOUT",
  init(players) {
    return { players: players.map(p => ({ ...p, eliminated: false })), turnIndex: 0, finished: false };
  },
  onThrow(state) { return state; },
  isFinished(state) { return state.players.filter(p=>!p.eliminated).length <= 1; },
  getRanking(state) { return state.players; },
  getDisplay() { return { type: "elimination" }; }
};
export default Knockout;