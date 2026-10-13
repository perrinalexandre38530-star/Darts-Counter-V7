import fs from "node:fs";
const engine = fs.readFileSync(new URL("../src/lib/gameEngines/wave61Engine.ts", import.meta.url), "utf8");
const catalogue = fs.readFileSync(new URL("../src/games/dartsWave61.ts", import.meta.url), "utf8");
const required = ["function processCosmoKnights", "cosmoChargeByPlayer", "cosmoShieldByPlayer", "COSMO BURST", "damageWithLayer"];
for (const needle of required) if (!engine.includes(needle)) throw new Error(`V75 cosmo-knights: contrat absent: ${needle}`);
const modeLine = catalogue.split("\n").find((line) => line.includes('id: "cosmo_knights"')) || "";
if (!modeLine) throw new Error("V75: mode absent du catalogue");
if (!modeLine.includes("supportsBots: true") || !modeLine.includes("supportsTeams: true")) throw new Error("V75: Teams/Bots non déclarés");
console.log("✅ Wave61 V75 — COSMO-KNIGHTS finalisé · moteur spécialisé · Teams/Bots");
