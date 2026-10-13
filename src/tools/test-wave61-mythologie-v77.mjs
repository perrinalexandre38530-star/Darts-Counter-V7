import fs from "node:fs";
const engine = fs.readFileSync(new URL("../src/lib/gameEngines/wave61Engine.ts", import.meta.url), "utf8");
const catalogue = fs.readFileSync(new URL("../src/games/dartsWave61.ts", import.meta.url), "utf8");
const required = ["function processMythologie", "mythTrialByPlayer", "favorThreshold", "trialNeed", "if (trial >= MYTH_GODS.length) finishWith"];
for (const needle of required) if (!engine.includes(needle)) throw new Error(`V77 mythologie: contrat absent: ${needle}`);
const modeLine = catalogue.split("\n").find((line) => line.includes('id: "mythologie"')) || "";
if (!modeLine) throw new Error("V77: mode absent du catalogue");
if (!modeLine.includes("supportsBots: true") || !modeLine.includes("supportsTeams: true")) throw new Error("V77: Teams/Bots non déclarés");
console.log("✅ Wave61 V77 — MYTHOLOGIE finalisé · moteur spécialisé · Teams/Bots");
