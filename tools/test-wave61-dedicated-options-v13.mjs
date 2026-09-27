import fs from "node:fs";

function read(file) { return fs.readFileSync(file, "utf8"); }
function assert(cond, msg) { if (!cond) throw new Error(msg); }

const engine = read("src/lib/gameEngines/wave61Engine.ts");
const sharedPlay = read("src/pages/Wave61SharedPlay.tsx");

assert(/WAVE61_ENGINE_VERSION = (?:11|1[2-9]|[2-9][0-9]);/.test(engine), "Wave61 V11 ou supérieur attendu");

const modes = {
  mafia: ["nightDamage", "dayVoteMultiplier", "medicShield"],
  vikings: ["captureThreshold", "territoryGoal", "resourceBoost"],
  black_flag: ["captureThreshold", "territoryGoal", "resourceBoost"],
  menhir_mayhem: ["captureThreshold", "territoryGoal", "baseFort"],
  attila: ["captureThreshold", "territoryGoal", "resourceBoost"],
  pyramides: ["torchStart", "torchDrain", "chamberNeed"],
  mont_blanc: ["weatherSeverity", "oxygenReserve", "climbPower"],
  everest: ["weatherSeverity", "oxygenReserve", "climbPower"],
  summit_14: ["weatherSeverity", "oxygenReserve", "peakThreshold"],
  codebreaker: ["codeLength", "allowRepeats", "cluesPerMiss"],
};

for (const [modeId, keys] of Object.entries(modes)) {
  const cfg = read(`src/pages/wave61/modes/${modeId}Config.tsx`);
  const play = read(`src/pages/wave61/modes/${modeId}Play.tsx`);
  assert(cfg.includes("dedicatedOptions={DEDICATED_OPTIONS}"), `${modeId}: options dédiées absentes`);
  assert(play.includes("dedicatedPlayHint="), `${modeId}: hint Play absent`);
  for (const key of keys) {
    assert(cfg.includes(`key: "${key}"`), `${modeId}: option ${key} absente`);
    assert(engine.includes(`"${key}"`), `moteur: ${key} absent`);
    assert(sharedPlay.includes(key), `HUD Play: ${key} absent`);
  }
  assert(fs.existsSync(`src/assets/tickers/ticker_${modeId}.webp`), `${modeId}: ticker manquant`);
}

for (const token of ["conquestVictoryGoal", "conquestCaptureThreshold", "conquestResourceFactor", "conquestBaseFort", "ascentStartingOxygen", "ascentClimbFactor"]) {
  assert(engine.includes(token), `helper ${token} absent`);
}

console.log("✅ Wave61 V13 — deuxième lot de finitions individuelles");
console.log("✅ Mafia / Vikings / Black Flag / Menhir Mayhem / Attila");
console.log("✅ Mont Blanc / Everest / Summit 14 / Pyramides / Codebreaker+");
console.log("✅ Tickers branchés + options dédiées + moteur V11");
