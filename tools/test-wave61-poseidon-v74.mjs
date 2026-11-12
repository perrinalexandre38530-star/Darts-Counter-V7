import fs from "node:fs";
const read = (file) => fs.readFileSync(file, "utf8");
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const spec = {"id":"poseidon","keys":["captureThreshold","territoryGoal","resourceBoost"],"engine":["poseidon: { icon:","state.modeId === \"poseidon\"","processConquestMode","TRIDENT"],"panel":null,"title":"POSÉIDON"};
const catalog = read("src/games/dartsWave61.ts");
const engine = read("src/lib/gameEngines/wave61Engine.ts");
const config = read(`src/pages/wave61/modes/${spec.id}Config.tsx`);
const play = read(`src/pages/wave61/modes/${spec.id}Play.tsx`);
const sharedPlay = read("src/pages/Wave61SharedPlay.tsx");
assert(catalog.includes(`id: "${spec.id}"`), `${spec.title}: absent du catalogue`);
assert(config.includes(`WAVE61_MODE_ID = "${spec.id}"`), `${spec.title}: ID configuration absent`);
assert(play.includes(`WAVE61_MODE_ID = "${spec.id}"`), `${spec.title}: ID Play absent`);
assert(config.includes("dedicatedOptions={DEDICATED_OPTIONS}"), `${spec.title}: options non reliées`);
assert(play.includes("dedicatedPlayHint=") && play.includes("forcedModeId={WAVE61_MODE_ID}"), `${spec.title}: vue Play non reliée`);
for (const key of spec.keys) {
  assert(config.includes(`key: "${key}"`), `${spec.title}: option ${key} manquante`);
  assert(engine.includes(key), `${spec.title}: option ${key} non utilisée par le moteur`);
}
for (const token of spec.engine) assert(engine.includes(token), `${spec.title}: contrat moteur absent: ${token}`);
if (spec.panel) {
  const panelSource = read(spec.panel[0]);
  assert(panelSource.includes(spec.panel[1]), `${spec.title}: panneau dédié absent`);
  assert(sharedPlay.includes(spec.panel[1]), `${spec.title}: panneau dédié non connecté au Play`);
}
console.log(`✅ Wave61 ${spec.title}: catalogue, configuration, moteur, écran Play`);
