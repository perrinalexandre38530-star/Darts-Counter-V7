import fs from "node:fs/promises";
import fssync from "node:fs";
import path from "node:path";
function arg(name,fallback=""){const i=process.argv.indexOf(name);return i>=0?(process.argv[i+1]??fallback):fallback;}
function flag(name){return process.argv.includes(name);}
const asset=arg("--asset","").trim();const approve=flag("--approve");const reject=flag("--reject");const force=flag("--force");
if(!asset||Number(approve)+Number(reject)!==1)throw new Error("Usage: npm run fit:awena:pilot:review -- --asset <assetKey> --approve|--reject [--force]");
const dir=path.resolve("var/fit-awena/pilot/generated",asset);const metaFile=path.join(dir,"metadata.json");if(!fssync.existsSync(metaFile))throw new Error(`Metadata pilote absente: ${metaFile}`);const meta=JSON.parse(await fs.readFile(metaFile,"utf8"));
if(approve){if(meta?.technicalQuality?.pass!==true&&!force)throw new Error(`QC technique en échec pour ${asset}. Utilise --force uniquement après vérification volontaire.`);for(let i=1;i<=4;i++){const f=path.join(dir,`raw-step-${String(i).padStart(2,"0")}.webp`);if(!fssync.existsSync(f))throw new Error(`Step manquant: ${f}`);}meta.visualReview={status:"APPROVED_FOR_VIDEO",required:true,reviewedAt:new Date().toISOString(),humanReviewed:true};meta.videoGate={allowed:true,reason:"FOUR_STILLS_TECHNICAL_AND_HUMAN_REVIEW_OK"};console.log(`${asset}: STILLS -> APPROVED_FOR_VIDEO`);}else{meta.visualReview={status:"REJECTED",required:true,reviewedAt:new Date().toISOString(),humanReviewed:true};meta.videoGate={allowed:false,reason:"HUMAN_REJECTED_STILLS"};console.log(`${asset}: STILLS -> REJECTED`);}await fs.writeFile(metaFile,JSON.stringify(meta,null,2));
