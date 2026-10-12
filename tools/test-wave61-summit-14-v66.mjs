import fs from "node:fs";
const engine = fs.readFileSync(new URL("../src/lib/gameEngines/wave61Engine.ts", import.meta.url), "utf8");
const catalogue = fs.readFileSync(new URL("../src/games/dartsWave61.ts", import.meta.url), "utf8");
const required = ["summit14PeakByPlayer", "const forcedRetreat = fatigue >= 100 || oxygen <= 0", "!forcedRetreat && marks >= threshold", "SUMMIT_14_PEAKS"];
for (const needle of required) if (!engine.includes(needle)) throw new Error(`V66 summit-14: contrat absent: ${needle}`);
if (!catalogue.includes('id: "summit_14"') && !catalogue.includes("id: 'summit_14'")) throw new Error("V66: mode absent du catalogue");
console.log("✅ Wave61 V66 — SUMMIT-14 finalisé");
