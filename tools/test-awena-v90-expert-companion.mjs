#!/usr/bin/env node
import fs from "node:fs";
const read=(p)=>fs.readFileSync(p,"utf8");
const must=(ok,msg)=>{ if(!ok){console.error(`❌ ${msg}`);process.exit(1)} console.log(`✅ ${msg}`); };
const expert=read("src/awena/AwenaExpertCompanionV90.ts");
const diag=read("src/awena/AwenaDiagnosticV90.ts");
const proc=read("src/awena/AwenaProceduralV90.ts");
const academy=read("src/awena/AwenaProceduralAcademy.ts");
const core=read("src/awena/AwenaCore.ts");
const overlay=read("src/awena/components/AwenaOverlay.tsx");
const pkg=JSON.parse(read("package.json"));

const topics=[...expert.matchAll(/\n\s*id:\s*"(v90-[^"]+)"/g)].map(m=>m[1]);
const domains=[...expert.matchAll(/domain:\s*"([^"]+)"/g)].map(m=>m[1]);
const aliases=[...expert.matchAll(/aliases:\s*(\[[^\n]+\])/g)].reduce((n,m)=>{try{return n+JSON.parse(m[1]).length}catch{return n}},0);

const diags=[...diag.matchAll(/\n\s*id:\s*"(v90-[^"]+)"/g)].map(m=>m[1]);
const checks=[...diag.matchAll(/checks:\s*(\[[^\n]+\])/g)].reduce((n,m)=>{try{return n+JSON.parse(m[1]).length}catch{return n}},0);
const fixes=[...diag.matchAll(/fixes:\s*(\[[^\n]+\])/g)].reduce((n,m)=>{try{return n+JSON.parse(m[1]).length}catch{return n}},0);

const procedures=[...proc.matchAll(/\n\s*id:\s*"(v90-[^"]+)"/g)].map(m=>m[1]);
const steps=[...proc.matchAll(/steps:\s*(\[[^\n]+\])/g)].reduce((n,m)=>{try{return n+JSON.parse(m[1]).length}catch{return n}},0);
const trouble=[...proc.matchAll(/troubleshooting:\s*(\[[^\n]+\])/g)].reduce((n,m)=>{try{return n+JSON.parse(m[1]).length}catch{return n}},0);

must(topics.length >= 300, `V9.0 Expert Companion depth: ${topics.length} topics`);
must(new Set(domains).size >= 15, `V9.0 Expert Companion breadth: ${new Set(domains).size} domains`);
must(aliases >= 850, `V9.0 vocabulary: ${aliases} aliases/phrasings`);
must(diags.length >= 45, `V9.0 diagnostic playbooks: ${diags.length}`);
must(checks >= 130, `V9.0 diagnostic checks: ${checks}`);
must(fixes >= 130, `V9.0 diagnostic fixes: ${fixes}`);
must(procedures.length >= 65, `V9.0 procedural extension: ${procedures.length} tutorials`);
must(steps >= 450, `V9.0 guided procedural steps: ${steps}`);
must(trouble >= 120, `V9.0 troubleshooting branches: ${trouble}`);

for (const needle of ["Arbre de décision","Transaction atomique","Homographie","Isolation AP","Play App Signing","Render storm","Variance intra-joueur","Expected Goals","Break of throw","Lecture de terrain"]) {
  must(expert.includes(`title: "${needle}"`), `Critical V9.0 topic: ${needle}`);
}
for (const needle of ["Google Play installe une ancienne version","Cast connecté mais score figé","Profils visibles puis disparus","Permission microphone refusée","Deux appareils ont modifié les mêmes données"]) {
  must(diag.includes(`title: "${needle}"`), `Critical V9.0 diagnostic: ${needle}`);
}
for (const needle of ["Préparer un Cast TV pour la première fois","Créer un point de retour avant une mise à jour importante","Faire un contrôle pré-publication Android","Profiler une page lente avant de la modifier","Appliquer un patch sur le bon ZIP de référence"]) {
  must(proc.includes(`title: "${needle}"`), `Critical V9.0 tutorial: ${needle}`);
}

must(academy.includes('import { AWENA_V90_PROCEDURES } from "./AwenaProceduralV90";') && academy.includes("...AWENA_V90_PROCEDURES"),"V9.0 procedures wired into Procedural Academy");
must(core.includes("answerAwenaExpertCompanionV90") && core.includes("answerAwenaDiagnosticV90"),"V9.0 expert + diagnostic layers wired into AwenaCore");
must(core.includes("awenaExpertCompanionV90Count") && core.includes("awenaDiagnosticV90Count"),"V9.0 capability counters wired into AwenaCore");
must(/LOCAL V9\.0/.test(overlay) && overlay.includes("EXPERT COMPANION"),"Overlay advertises V9.0 Expert Companion");
must(pkg.scripts["test:awena:v90"] === "node tools/test-awena-v90-expert-companion.mjs","package V9.0 test script present");
console.log(`\n✅ AWENA V9.0 EXPERT COMPANION: OK`);
console.log(`   ${topics.length} new expert topics / ${aliases} phrasings`);
console.log(`   ${diags.length} diagnostic playbooks / ${checks} checks / ${fixes} fixes`);
console.log(`   ${procedures.length} new tutorials / ${steps} steps / ${trouble} troubleshooting branches`);
