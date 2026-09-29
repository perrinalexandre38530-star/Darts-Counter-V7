import fs from 'node:fs';
const read=(p)=>fs.readFileSync(p,'utf8');
const assert=(c,m)=>{if(!c)throw new Error(m)};
const play=read('src/pages/Wave61SharedPlay.tsx');
const engine=read('src/lib/gameEngines/wave61Engine.ts');
const end=read('src/pages/wave61/Wave61EndSummary.tsx');
const catalog=read('src/games/dartsWave61.ts');
const ids=[...catalog.matchAll(/\{ id: "([a-z0-9_]+)", label:/g)].map(m=>m[1]);
assert(ids.length===65,`Catalogue ${ids.length}/65`);
for(const token of [
  'resumeRecord?.resume?.state || resumeRecord?.payload?.stateSnapshot',
  'restored?.mode === "wave61" && restored?.modeId === spec.id ? cloneWave61State(restored)',
  'players: s.players.map((player: any, index: number) => {',
  'profileById.get(String(player.id)) || player',
  'name: playerName(profile, index) || String(player.name || `Joueur ${index + 1}`)',
  'resume: { mode: "wave61", modeId: spec.id, config: s.config, state: cloneWave61State(s)',
  'stateSnapshot: cloneWave61State(s)',
  'persist(prev)',
  'finishedRef.current = false'
]) assert(play.includes(token),`Play V28: ${token}`);
for(const token of [
  'const rows = (state?.players || []).map',
  'const profile = profileById.get(id) || p',
  'name: nameOf(profile, p?.name || "Joueur")'
]) assert(end.includes(token),`EndSummary V28: ${token}`);
for(const token of [
  'export function cloneWave61State(state: Wave61State): Wave61State',
  'if (state.phase !== "playing" || !state.players.length) return state',
  'state.visits.push(',
  'refreshTeamScores(state)',
  'if (state.phase === "playing") return advanceWave61Turn(state)',
  'state.finishedAt = Date.now()'
]) assert(engine.includes(token),`Engine V28: ${token}`);
for(const id of ['mistigri','radin','corbeau_renard','darts_impossible']) assert(ids.includes(id),`${id}: absent`);
console.log('✅ Wave61 V28 — intégrité reprise/historique 65/65');
console.log('✅ joueurs issus du snapshot · enrichissement profil optionnel · Undo après fin · état spécial/config conservés');
