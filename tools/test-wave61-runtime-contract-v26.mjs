import fs from 'node:fs';
const read=(p)=>fs.readFileSync(p,'utf8'); const assert=(c,m)=>{if(!c)throw new Error(m)};
const play=read('src/pages/Wave61SharedPlay.tsx');
const engine=read('src/lib/gameEngines/wave61Engine.ts');
const catalog=read('src/games/dartsWave61.ts');
const ids=[...catalog.matchAll(/\{ id: "([a-z0-9_]+)", label:/g)].map(m=>m[1]);
assert(ids.length===65,`Catalogue ${ids.length}/65`);
for(const id of ids){assert(fs.existsSync(`src/pages/wave61/modes/${id}Config.tsx`),`${id}: Config absent`);assert(fs.existsSync(`src/pages/wave61/modes/${id}Play.tsx`),`${id}: Play absent`)}
for(const token of ['resumeRecord?.resume?.state','resumeRecord?.payload?.stateSnapshot','cloneWave61State(restored)','resume: { mode: "wave61"','stateSnapshot: cloneWave61State(s)','setUndo((u) => [...u.slice(-39), cloneWave61State(previous)])','persist(prev)','state.phase === "finished"','History.upsert(buildRecord(s, "finished"))','pickWave61BotDarts']) assert(play.includes(token),`Play: contrat manquant ${token}`);
for(const token of ['if (state.phase !== "playing" || !state.players.length) return state','config?.modeOptions','special: {','finishWith(','advanceWave61Turn(state)']) assert(engine.includes(token),`Engine: invariant manquant ${token}`);
for(const id of ['mistigri','radin','corbeau_renard','darts_impossible']){assert(ids.includes(id),`${id}: catalogue absent`);assert(engine.includes(`state.modeId === "${id}"`)||engine.includes(`modeId === "${id}"`),`${id}: moteur spécifique absent`)}
console.log('✅ Wave61 V26 — contrat runtime/gameplay 65/65');
console.log('✅ Config/Play · Undo · save/resume · finished gate · bots · nouveaux modes');
