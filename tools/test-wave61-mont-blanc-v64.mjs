import fs from "node:fs";
const engine = fs.readFileSync(new URL("../src/lib/gameEngines/wave61Engine.ts", import.meta.url), "utf8");
const catalogue = fs.readFileSync(new URL("../src/games/dartsWave61.ts", import.meta.url), "utf8");
const required = ["function processAscentMode", "ascentAltitudeByPlayer", "ascentSummitAltitude", "state.modeId === \"mont_blanc\""];
for (const needle of required) if (!engine.includes(needle)) throw new Error(`V64 mont-blanc: contrat absent: ${needle}`);
if (!catalogue.includes('id: "mont_blanc"') && !catalogue.includes("id: 'mont_blanc'")) throw new Error("V64: mode absent du catalogue");
console.log("✅ Wave61 V64 — MONT-BLANC finalisé");
