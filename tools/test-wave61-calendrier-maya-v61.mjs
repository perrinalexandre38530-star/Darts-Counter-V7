import fs from "node:fs";

const src = fs.readFileSync(new URL("../src/lib/gameEngines/wave61Engine.ts", import.meta.url), "utf8");
const required = [
  'function processMaya',
  'mayaDoomByPlayer',
  'if (doom >= 100)',
  'Math.min(seal, MAYA_CYCLES.length) - 1',
  'if (seal >= MAYA_CYCLES.length) finishWith'
];
for (const token of required) {
  if (!src.includes(token)) throw new Error(`Wave61 V61 calendrier-maya: contrat manquant: ${token}`);
}
console.log("✅ Wave61 V61 — CALENDRIER-MAYA finalisé individuellement");
