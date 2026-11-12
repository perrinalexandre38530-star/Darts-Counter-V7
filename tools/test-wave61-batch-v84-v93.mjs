import fs from "node:fs";
const root=new URL("../src/pages/wave61/",import.meta.url);
const read=n=>fs.readFileSync(new URL(n,root),"utf8");
const shared=fs.readFileSync(new URL("../src/pages/Wave61SharedPlay.tsx",import.meta.url),"utf8"),conquest=read("Wave61ConquestPanels.tsx"),mission=read("Wave61MissionAdventurePanels.tsx"),survival=read("Wave61SurvivalCombatPanels.tsx"),fable=read("Wave61FablePartyPanels.tsx");
const checks=[["SPARTACUS",survival,"ARÈNE DES GLADIATEURS"],["CHEVAL",conquest,"OPÉRATION EN 5 PHASES"],["SNIPER",shared,"SNIPER · CONTRATS"],["PETIT BAC",mission,"GRILLE EN DIRECT"],["LUCIOLE",shared,"LUCIOLE · FLASH MÉMOIRE"],["SABAUDIA",conquest,"Fortifie les cols contrôlés"],["GALAXIES",conquest,"Hyperdrive à 100%"],["APOCALYPSE",survival,"SURVIE DU REFUGE"],["MISTIGRI",fable,"CARTE MAUDITE EN DIRECT"],["RADIN",fable,"CAISSE & DÉPENSES"],["MISTIGRI WIRED",shared,'spec.id === "mistigri"'],["RADIN WIRED",shared,'spec.id === "radin"']];
for(const [l,s,n] of checks)if(!s.includes(n))throw new Error(`${l}: missing ${n}`);
console.log("✅ Wave61 batch V84–V93 · 10 modes finalisés · Mistigri/Radin câblés");
