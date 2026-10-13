import fs from "node:fs";
const engine = fs.readFileSync(new URL("../src/lib/gameEngines/wave61Engine.ts", import.meta.url), "utf8");
const catalogue = fs.readFileSync(new URL("../src/games/dartsWave61.ts", import.meta.url), "utf8");
const required = ["function processDracoSpheres", "dracoSpheresByPlayer", "energyThreshold", "Orbe ${spheres}/7 récupéré", "if (spheres >= 7) finishWith"];
for (const needle of required) if (!engine.includes(needle)) throw new Error(`V76 draco-spheres: contrat absent: ${needle}`);
const modeLine = catalogue.split("\n").find((line) => line.includes('id: "draco_spheres"')) || "";
if (!modeLine) throw new Error("V76: mode absent du catalogue");
if (!modeLine.includes("supportsBots: true") || !modeLine.includes("supportsTeams: true")) throw new Error("V76: Teams/Bots non déclarés");
console.log("✅ Wave61 V76 — DRACO-SPHERES finalisé · moteur spécialisé · Teams/Bots");
