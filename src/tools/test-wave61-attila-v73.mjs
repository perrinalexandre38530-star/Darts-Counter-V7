import fs from "node:fs";
const engine = fs.readFileSync(new URL("../src/lib/gameEngines/wave61Engine.ts", import.meta.url), "utf8");
const catalogue = fs.readFileSync(new URL("../src/games/dartsWave61.ts", import.meta.url), "utf8");
const required = ["CONQUEST_PROFILES", "attila: {", "state.modeId === \"attila\" && hits >= 3", "finishWith(state, playerId, state.config.participantMode === \"teams\" ? actor : null)"];
for (const needle of required) if (!engine.includes(needle)) throw new Error(`V73 attila: contrat absent: ${needle}`);
const modeLine = catalogue.split("\n").find((line) => line.includes('id: "attila"')) || "";
if (!modeLine) throw new Error("V73: mode absent du catalogue");
if (!modeLine.includes("supportsBots: true") || !modeLine.includes("supportsTeams: true")) throw new Error("V73: Teams/Bots non déclarés");
console.log("✅ Wave61 V73 — ATTILA finalisé · moteur spécialisé · Teams/Bots");
