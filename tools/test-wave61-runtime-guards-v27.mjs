import fs from 'node:fs';
const read=(p)=>fs.readFileSync(p,'utf8');
const assert=(c,m)=>{if(!c)throw new Error(m)};
const play=read('src/pages/Wave61SharedPlay.tsx');
const engine=read('src/lib/gameEngines/wave61Engine.ts');
const catalog=read('src/games/dartsWave61.ts');
const ids=[...catalog.matchAll(/\{ id: "([a-z0-9_]+)", label:/g)].map(m=>m[1]);
assert(ids.length===65,`Catalogue ${ids.length}/65`);
const duplicate='}, [state, spec.label, persist, wave61SfxEnabled, awenaCommentaryEnabled, awena]);\n  }, [state, spec.label, persist, wave61SfxEnabled, awenaCommentaryEnabled, awena]);';
assert(!play.includes(duplicate),'Wave61SharedPlay: fermeture commit dupliquée');
for(const token of [
  'if (!currentThrow.length || state.phase === "finished" || activeIsBot) return',
  'setUndo((u) => [...u.slice(-39), cloneWave61State(previous)])',
  'finishedRef.current = false',
  'persist(prev)',
  'if (!activeIsBot || state.phase === "finished" || botBusy.current) return',
  'window.clearTimeout(timer)',
  'resumeRecord?.resume?.state || resumeRecord?.payload?.stateSnapshot',
  'History.upsert(buildRecord(s, "finished"))',
  'onReplay={replay}',
  'onConfig={() => go?.("wave61_config", { gameId: spec.id })}'
]) assert(play.includes(token),`Play: garde V27 manquante ${token}`);
for(const token of [
  'if (state.phase !== "playing" || !state.players.length) return state',
  'const darts = (dartsRaw || []).slice(0, 3)',
  'if (!player || state.eliminated[player.id]) return advanceWave61Turn(state)',
  'state.phase = "finished"',
  'state.finishedAt = Date.now()',
  'export function pickWave61BotDarts'
]) assert(engine.includes(token),`Engine: garde V27 manquante ${token}`);
for(const id of ids){
  assert(fs.existsSync(`src/pages/wave61/modes/${id}Config.tsx`),`${id}: Config absent`);
  assert(fs.existsSync(`src/pages/wave61/modes/${id}Play.tsx`),`${id}: Play absent`);
}
console.log('✅ Wave61 V27 — gardes runtime/play 65/65');
console.log('✅ commit/Undo · bots · finished gate · save/resume · Replay/Config · duplication callback interdite');
