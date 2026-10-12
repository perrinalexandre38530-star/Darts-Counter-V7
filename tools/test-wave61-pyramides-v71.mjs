import fs from "node:fs";
const engine = fs.readFileSync(new URL("../src/lib/gameEngines/wave61Engine.ts", import.meta.url), "utf8");
const catalogue = fs.readFileSync(new URL("../src/games/dartsWave61.ts", import.meta.url), "utf8");
const required = ["function processPyramides", "pyramidTorchByPlayer", "Torche éteinte", "PYRAMID_CHAMBERS"];
for (const needle of required) if (!engine.includes(needle)) throw new Error(`V71 pyramides: contrat absent: ${needle}`);
if (!catalogue.includes('id: "pyramides"') && !catalogue.includes("id: 'pyramides'")) throw new Error("V71: mode absent du catalogue");
console.log("✅ Wave61 V71 — PYRAMIDES finalisé");
