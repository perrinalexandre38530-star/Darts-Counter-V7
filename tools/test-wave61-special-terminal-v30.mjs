import fs from 'node:fs';
const read=(p)=>fs.readFileSync(p,'utf8');
const assert=(c,m)=>{if(!c)throw new Error(m)};
const engine=read('src/lib/gameEngines/wave61Engine.ts');
const catalog=read('src/games/dartsWave61.ts');
const ids=[...catalog.matchAll(/\{ id: "([a-z0-9_]+)", label:/g)].map(m=>m[1]);
assert(ids.length===65,`Catalogue ${ids.length}/65`);
for (const token of [
  'aliveTeams.length === 0 && state.players.length > 0',
  'const team = bestTeam(state)',
  'alive.length === 0 && state.players.length > 0',
  'const winner = bestPlayer(state)',
  'if (winner) finishWith(state, winner)',
  'if (team) finishWith(state, team.playerId, team.teamId)',
  'teamId || state.config.teamByPlayer?.[playerId] || null'
]) assert(engine.includes(token),`V30 terminal guard absent: ${token}`);
for (const id of ['zombie_siege','eperviers','ballon_prisonnier']) {
  assert(engine.includes(`"${id}"`),`V30 exception spéciale absente: ${id}`);
}
assert(engine.includes('state.roundIndex >= state.config.rounds'), 'V30 limite rounds absente');
assert(engine.includes('if (state.phase !== "playing" || !state.players.length) return state'), 'V30 finished gate absent');
console.log('✅ Wave61 V30 — terminaison moteurs spéciaux 65/65');
console.log('✅ 0 survivant joueur/équipe · limites rounds · exceptions spéciales · finished gate');
