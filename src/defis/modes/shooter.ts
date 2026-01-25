import type { DefiMode } from "../engine/DefiTypes";

const Shooter: DefiMode = {
  id: "shooter",
  label: "SHOOTER",
  init(players) {
    return { players: players.map(p => ({ ...p, score: 0 })), turnIndex: 0, finished: false };
  },
  onThrow(state) { return state; },
  isFinished() { return false; },
  getRanking(state) { return state.players; },
  getDisplay() { return { type: "target" }; }
};
export default Shooter;
