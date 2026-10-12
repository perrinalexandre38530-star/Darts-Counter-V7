import fs from "node:fs";
const engine = fs.readFileSync(new URL("../src/lib/gameEngines/wave61Engine.ts", import.meta.url), "utf8");
const catalogue = fs.readFileSync(new URL("../src/games/dartsWave61.ts", import.meta.url), "utf8");
const required = ["vikings: { icon:", "function processConquestMode", "conquestVictoryGoal", "syncConquestProgress"];
for (const needle of required) if (!engine.includes(needle)) throw new Error(`V68 vikings: contrat absent: ${needle}`);
if (!catalogue.includes('id: "vikings"') && !catalogue.includes("id: 'vikings'")) throw new Error("V68: mode absent du catalogue");
console.log("✅ Wave61 V68 — VIKINGS finalisé");
