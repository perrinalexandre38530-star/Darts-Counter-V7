import fs from "node:fs";
const engine = fs.readFileSync(new URL("../src/lib/gameEngines/wave61Engine.ts", import.meta.url), "utf8");
const catalogue = fs.readFileSync(new URL("../src/games/dartsWave61.ts", import.meta.url), "utf8");
const required = ["function processCodebreaker", "secretCode", "scoreCodeGuess", "CODE DÉVERROUILLÉ"];
for (const needle of required) if (!engine.includes(needle)) throw new Error(`V69 codebreaker: contrat absent: ${needle}`);
if (!catalogue.includes('id: "codebreaker"') && !catalogue.includes("id: 'codebreaker'")) throw new Error("V69: mode absent du catalogue");
console.log("✅ Wave61 V69 — CODEBREAKER finalisé");
