import fs from "node:fs";
const engine = fs.readFileSync(new URL("../src/lib/gameEngines/wave61Engine.ts", import.meta.url), "utf8");
const catalogue = fs.readFileSync(new URL("../src/games/dartsWave61.ts", import.meta.url), "utf8");
const required = ["function processTyrolien", "tyrolienSpeedByPlayer", "currentTyrolienStage", "if (pos >= state.config.goal) finishWith(state, playerId)"];
for (const needle of required) if (!engine.includes(needle)) throw new Error(`V63 tyrolien: contrat absent: ${needle}`);
if (!catalogue.includes('id: "tyrolien"') && !catalogue.includes("id: 'tyrolien'")) throw new Error("V63: mode absent du catalogue");
console.log("✅ Wave61 V63 — TYROLIEN finalisé");
