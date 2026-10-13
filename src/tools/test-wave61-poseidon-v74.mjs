import fs from "node:fs";
const engine = fs.readFileSync(new URL("../src/lib/gameEngines/wave61Engine.ts", import.meta.url), "utf8");
const catalogue = fs.readFileSync(new URL("../src/games/dartsWave61.ts", import.meta.url), "utf8");
const required = ["poseidon: {", "state.modeId === \"poseidon\" && bulls > 0", "state.modeId === \"poseidon\" ? 4 : 3", "processConquestMode"];
for (const needle of required) if (!engine.includes(needle)) throw new Error(`V74 poseidon: contrat absent: ${needle}`);
const modeLine = catalogue.split("\n").find((line) => line.includes('id: "poseidon"')) || "";
if (!modeLine) throw new Error("V74: mode absent du catalogue");
if (!modeLine.includes("supportsBots: true") || !modeLine.includes("supportsTeams: true")) throw new Error("V74: Teams/Bots non déclarés");
console.log("✅ Wave61 V74 — POSEIDON finalisé · moteur spécialisé · Teams/Bots");
