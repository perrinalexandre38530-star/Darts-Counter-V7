import fs from 'node:fs';
const read=(p)=>fs.readFileSync(p,'utf8');
const assert=(c,m)=>{if(!c)throw new Error(m)};
const play=read('src/pages/Wave61SharedPlay.tsx');
const end=read('src/pages/wave61/Wave61EndSummary.tsx');
const engine=read('src/lib/gameEngines/wave61Engine.ts');
const catalog=read('src/games/dartsWave61.ts');
const ids=[...catalog.matchAll(/\{ id: "([a-z0-9_]+)", label:/g)].map(m=>m[1]);
assert(ids.length===65,`Catalogue ${ids.length}/65`);
for(const token of [
  'if (state.phase !== "playing" || !state.players.length) return state',
  'state.phase = "finished"',
  'state.winnerId = playerId',
  'state.winnerTeamId = state.config.participantMode === "teams"',
  'state.finishedAt = Date.now()'
]) assert(engine.includes(token),`Engine V29: ${token}`);
for(const token of [
  'const winnerIds = rankings.filter((row: any) => row.winner).map((row: any) => row.id)',
  'winnerIds,',
  'winnerTeamId: s.winnerTeamId',
  'status === "finished" ? (s.finishedAt || Date.now()) : undefined',
  'if (finishedRef.current) return',
  'state.phase === "finished" || activeIsBot',
  'onStats={() => go?.("darts_mode_summary"',
  'onHistory={() => go?.("statsHub"',
  'onReplay={replay}',
  'onConfig={() => go?.("wave61_config"'
]) assert(play.includes(token),`Play V29: ${token}`);
for(const token of [
  'winner: state?.winnerTeamId',
  'String(state?.config?.teamByPlayer?.[id] || "") === String(state.winnerTeamId)',
  ': String(state?.winnerId || "") === id',
  'winner: String(state?.winnerTeamId || "") === String(id)'
]) assert(end.includes(token),`End V29: ${token}`);
for(const id of ['mistigri','radin','corbeau_renard','darts_impossible']) assert(ids.includes(id),`${id}: absent`);
console.log('✅ Wave61 V29 — intégrité fin de partie 65/65');
console.log('✅ verrouillage post-victoire · winner team complet · winnerIds historique/stats · Replay/Stats/Historique/Config');
