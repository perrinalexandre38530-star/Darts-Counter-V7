import fs from "node:fs/promises";
import fssync from "node:fs";
import path from "node:path";
import { AWENA_REVIEW_ROOT, AWENA_STATUS, moveGeneratedPack, ensureAwenaRegistryDirectories } from "./fit-awena-registry.mjs";

await ensureAwenaRegistryDirectories();
if(!fssync.existsSync(AWENA_REVIEW_ROOT)){console.log("Legacy step REVIEW quarantine: 0");process.exit(0);}
const dirs=(await fs.readdir(AWENA_REVIEW_ROOT,{withFileTypes:true})).filter(e=>e.isDirectory());
let moved=0;
for(const entry of dirs){
  const key=entry.name;const metaFile=path.join(AWENA_REVIEW_ROOT,key,"metadata.json");let meta={};
  try{meta=JSON.parse(await fs.readFile(metaFile,"utf8"));}catch{continue;}
  const legacy=["APPROVED_MANUAL_FRAMES","APPROVED_VIDEO_PHASE_FRAMES"].includes(meta.stepStrategy);
  if(!legacy)continue;
  await moveGeneratedPack(key,AWENA_STATUS.REVIEW,AWENA_STATUS.REJECTED,{
    rejectedAt:new Date().toISOString(),reviewDecision:AWENA_STATUS.REJECTED,humanReviewed:false,
    rejectionReason:"V117_UNSAFE_LEGACY_STEP_REUSE",
    rejectionDetail:"Legacy approved frames/video may be used as pose references only; they are no longer publishable pedagogical steps, especially when exercise equipment must remain complete.",
  });
  moved++;console.log(`QUARANTINE ${key}: REVIEW -> REJECTED (legacy step reuse)`);
}
console.log(`Legacy step REVIEW quarantine: ${moved}`);
