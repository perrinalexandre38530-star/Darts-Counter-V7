import fs from "node:fs/promises";
import path from "node:path";
import { assetKey, loadCatalog } from "./fit-awena-catalog-source.mjs";
import { AWENA_STATUS, resolveAwenaRegistryState } from "./fit-awena-registry.mjs";

const refresh=process.argv.includes("--refresh");
const catalog=await loadCatalog({refresh,allowCache:true});
const outDir=path.resolve("var/fit-awena"); await fs.mkdir(outDir,{recursive:true});
const rows=[];
for(const ex of catalog.exercises){
  const key=assetKey(ex); const state=await resolveAwenaRegistryState(ex,key); const coverage=state.coverage||{};
  rows.push({
    id:ex.id,name:ex.name,muscle:ex.muscle,equipment:ex.equipment,source:ex.source,assetKey:key,
    referencePhotos:(ex.imagePaths||[]).length,referenceVideos:(ex.videoUrls||[]).length,
    awenaStatus:state.status,awenaOrigin:state.origin,manualKey:state.manualKey||"",
    awenaVideo:Boolean(coverage.video),awenaPoster:Boolean(coverage.poster),awenaFrames:Number(coverage.frames||0),awenaSteps:Number(coverage.steps||0),
    renderable:state.status===AWENA_STATUS.APPROVED,
    humanReviewRequired:state.status===AWENA_STATUS.REVIEW,
    rejected:state.status===AWENA_STATUS.REJECTED,
  });
}
const count=(status)=>rows.filter(r=>r.awenaStatus===status).length;
const summary={
  generatedAt:new Date().toISOString(),catalogCount:rows.length,
  approved:count(AWENA_STATUS.APPROVED),review:count(AWENA_STATUS.REVIEW),missing:count(AWENA_STATUS.MISSING),rejected:count(AWENA_STATUS.REJECTED),
  approvedManual:rows.filter(r=>r.awenaStatus===AWENA_STATUS.APPROVED&&r.awenaOrigin==="manual").length,
  approvedGenerated:rows.filter(r=>r.awenaStatus===AWENA_STATUS.APPROVED&&r.awenaOrigin==="generated").length,
  reviewGenerated:rows.filter(r=>r.awenaStatus===AWENA_STATUS.REVIEW).length,
  withApprovedVideo:rows.filter(r=>r.renderable&&r.awenaVideo).length,
  withApprovedPoster:rows.filter(r=>r.renderable&&r.awenaPoster).length,
  withApprovedFourSteps:rows.filter(r=>r.renderable&&r.awenaSteps>=4).length,
  withReferencePhotos:rows.filter(r=>r.referencePhotos>0).length,withoutReferencePhotos:rows.filter(r=>r.referencePhotos===0).length,withReferenceVideos:rows.filter(r=>r.referenceVideos>0).length,
  policy:{onlyApprovedRenderable:true,manualAuthoritative:true,reviewNeverPublished:true,rejectedNeverPublished:true},
  sources:catalog.sources,sourceErrors:catalog.errors||[]
};
await fs.writeFile(path.join(outDir,"awena-media-audit.json"),JSON.stringify({summary,rows},null,2));
const headers=Object.keys(rows[0]||{id:"",name:""}); const esc=v=>`"${String(v??"").replaceAll('"','""')}"`; const csv=[headers.map(esc).join(";"),...rows.map(r=>headers.map(h=>esc(r[h])).join(";"))].join("\n"); await fs.writeFile(path.join(outDir,"awena-media-audit.csv"),csv);
console.log(JSON.stringify(summary,null,2));
console.log("Rapports: var/fit-awena/awena-media-audit.json + .csv");
