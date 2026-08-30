import fs from "node:fs/promises";
import path from "node:path";

const root=path.resolve("public/fit/awena-library");
async function exists(p){try{await fs.access(p);return true;}catch{return false;}}
await fs.mkdir(root,{recursive:true});
const dirs=(await fs.readdir(root,{withFileTypes:true})).filter(d=>d.isDirectory());
const entries=[];
for(const dirent of dirs){
  const dir=path.join(root,dirent.name); const metaFile=path.join(dir,"metadata.json"); let meta={}; try{meta=JSON.parse(await fs.readFile(metaFile,"utf8"));}catch{}
  const video=await exists(path.join(dir,"awena-preview.webm")); const poster=await exists(path.join(dir,"awena-poster.webp"));
  const steps=[]; for(let i=1;i<=8;i++){const file=`awena-step-${String(i).padStart(2,"0")}.webp`;if(await exists(path.join(dir,file)))steps.push(`/fit/awena-library/${dirent.name}/${file}`);}
  entries.push({assetKey:dirent.name,exerciseId:meta.exerciseId||null,name:meta.name||null,videoUrl:video?`/fit/awena-library/${dirent.name}/awena-preview.webm`:null,posterUrl:poster?`/fit/awena-library/${dirent.name}/awena-poster.webp`:null,stepImages:steps,transparentVideo:Boolean(meta.transparentVideo),generatedAt:meta.generatedAt||null});
}
const index={version:1,generatedAt:new Date().toISOString(),count:entries.length,entries:entries.sort((a,b)=>a.assetKey.localeCompare(b.assetKey))};
await fs.writeFile(path.join(root,"index.json"),JSON.stringify(index,null,2));
console.log(`Index AWENA: ${entries.length} dossiers -> public/fit/awena-library/index.json`);
