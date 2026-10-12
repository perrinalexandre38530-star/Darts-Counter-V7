import fs from "node:fs";
const engine = fs.readFileSync(new URL("../src/lib/gameEngines/wave61Engine.ts", import.meta.url), "utf8");
const catalogue = fs.readFileSync(new URL("../src/games/dartsWave61.ts", import.meta.url), "utf8");
const required = ["menhir_mayhem: { icon:", "state.modeId === \"menhir_mayhem\"", "MENHIR GÉANT", "processConquestMode"];
for (const needle of required) if (!engine.includes(needle)) throw new Error(`V72 menhir-mayhem: contrat absent: ${needle}`);
if (!catalogue.includes('id: "menhir_mayhem"') && !catalogue.includes("id: 'menhir_mayhem'")) throw new Error("V72: mode absent du catalogue");
console.log("✅ Wave61 V72 — MENHIR-MAYHEM finalisé");
