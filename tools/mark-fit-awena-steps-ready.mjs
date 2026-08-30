import fs from "node:fs/promises";
import fssync from "node:fs";
import path from "node:path";
import { AWENA_STATUS, generatedDirectory } from "./fit-awena-registry.mjs";
function arg(name,fallback=""){const i=process.argv.indexOf(name);return i>=0?(process.argv[i+1]??fallback):fallback;}
const asset=String(arg("--asset")).trim(); if(!asset)throw new Error("Usage: npm run fit:awena:steps:ready -- --asset <assetKey>");
const dir=generatedDirectory(AWENA_STATUS.REVIEW,asset); if(!fssync.existsSync(dir))throw new Error(`Pack REVIEW absent: ${dir}`);
const required=Array.from({length:4},(_,i)=>path.join(dir,`awena-step-${String(i+1).padStart(2,"0")}.webp`));
const missing=required.filter(file=>!fssync.existsSync(file)); if(missing.length)throw new Error(`Étapes manquantes: ${missing.map(path.basename).join(", ")}`);
const metaFile=path.join(dir,"metadata.json");let meta={};try{meta=JSON.parse(await fs.readFile(metaFile,"utf8"));}catch{}
meta.stepGuide={...(meta.stepGuide||{}),status:"READY",requiredSteps:4,validatedAt:new Date().toISOString(),policy:"Dedicated pedagogical AWENA stills; not arbitrary video frame extraction."};
await fs.writeFile(metaFile,JSON.stringify(meta,null,2));console.log(`${asset}: stepGuide READY`);
