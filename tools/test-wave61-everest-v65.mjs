import fs from "node:fs";
const engine = fs.readFileSync(new URL("../src/lib/gameEngines/wave61Engine.ts", import.meta.url), "utf8");
const catalogue = fs.readFileSync(new URL("../src/games/dartsWave61.ts", import.meta.url), "utf8");
const required = ["function processAscentMode", "ascentOxygenByPlayer", "requiredAcclimation", "state.modeId === \"everest\""];
for (const needle of required) if (!engine.includes(needle)) throw new Error(`V65 everest: contrat absent: ${needle}`);
if (!catalogue.includes('id: "everest"') && !catalogue.includes("id: 'everest'")) throw new Error("V65: mode absent du catalogue");
console.log("✅ Wave61 V65 — EVEREST finalisé");
