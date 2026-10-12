import fs from "node:fs";
const engine = fs.readFileSync(new URL("../src/lib/gameEngines/wave61Engine.ts", import.meta.url), "utf8");
const catalogue = fs.readFileSync(new URL("../src/games/dartsWave61.ts", import.meta.url), "utf8");
const required = ["function processMafia", "orderedTeams", "mafiaTeam", "mafiaVotesByPlayer"];
for (const needle of required) if (!engine.includes(needle)) throw new Error(`V67 mafia: contrat absent: ${needle}`);
if (!catalogue.includes('id: "mafia"') && !catalogue.includes("id: 'mafia'")) throw new Error("V67: mode absent du catalogue");
console.log("✅ Wave61 V67 — MAFIA finalisé");
