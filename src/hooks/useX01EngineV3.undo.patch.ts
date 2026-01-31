
export type DartInput = { playerId: string; segment: number; multiplier: number };

export function rebuildFromHistory(
  config: any,
  baseState: any,
  history: DartInput[],
  applyDart: (cfg:any, st:any, d:any)=>void
) {
  const state = structuredClone(baseState);
  state.history = [];
  for (const d of history) {
    applyDart(config, state, d);
    state.history.push(d);
  }
  return state;
}
