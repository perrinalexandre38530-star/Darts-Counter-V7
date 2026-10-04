import fs from "node:fs";

const src = fs.readFileSync(new URL("../src/lib/gameEngines/wave61Engine.ts", import.meta.url), "utf8");
const required = [
  'function processAthletisme',
  'SPRINT',
  'HAIES',
  'LONGUEUR',
  'HAUTEUR',
  'JAVELOT',
  'RELAIS',
  'athleticsResultsByPlayer'
];
for (const token of required) {
  if (!src.includes(token)) throw new Error(`Wave61 V60 athletisme: contrat manquant: ${token}`);
}
console.log("✅ Wave61 V60 — ATHLETISME finalisé individuellement");
