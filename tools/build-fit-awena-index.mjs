import fs from "node:fs/promises";
import path from "node:path";
import { AWENA_APPROVED_ROOT, AWENA_ROOT, AWENA_STATUS, ensureAwenaRegistryDirectories } from "./fit-awena-registry.mjs";

async function exists(p){try{await fs.access(p);return true;}catch{return false;}}
await ensureAwenaRegistryDirectories();
const dirs=(await fs.readdir(AWENA_APPROVED_ROOT,{withFileTypes:true})).filter(d=>d.isDirectory());
const entries=[];
for(const dirent of dirs){
  const dir=path.join(AWENA_APPROVED_ROOT,dirent.name); const metaFile=path.join(dir,"metadata.json"); let meta={}; try{meta=JSON.parse(await fs.readFile(metaFile,"utf8"));}catch{}
  const video=await exists(path.join(dir,"awena-preview.webm")); const poster=await exists(path.join(dir,"awena-poster.webp"));
  const steps=[]; for(let i=1;i<=8;i++){const file=`awena-step-${String(i).padStart(2,"0")}.webp`;if(await exists(path.join(dir,file)))steps.push(`/fit/awena-library/approved/${dirent.name}/${file}`);}
  if(!video&&!poster&&!steps.length)continue;
  entries.push({assetKey:dirent.name,exerciseId:meta.exerciseId||null,name:meta.name||null,status:AWENA_STATUS.APPROVED,videoUrl:video?`/fit/awena-library/approved/${dirent.name}/awena-preview.webm`:null,posterUrl:poster?`/fit/awena-library/approved/${dirent.name}/awena-poster.webp`:null,stepImages:steps,transparentVideo:Boolean(meta.transparentVideo),generatedAt:meta.generatedAt||null,approvedAt:meta.approvedAt||meta.statusChangedAt||null});
}
const index={version:2,generatedAt:new Date().toISOString(),count:entries.length,policy:"Only human-approved generated AWENA media is exposed to the application",entries:entries.sort((a,b)=>a.assetKey.localeCompare(b.assetKey))};
await fs.writeFile(path.join(AWENA_ROOT,"index.json"),JSON.stringify(index,null,2));
console.log(`Index AWENA APPROVED: ${entries.length} dossiers -> public/fit/awena-library/index.json`);
