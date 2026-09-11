import fs from "node:fs/promises";
import path from "node:path";

function arg(name,fallback=""){const i=process.argv.indexOf(name);return i>=0?(process.argv[i+1]??fallback):fallback;}
const file=path.resolve(arg("--workflow","tools/comfyui/awena-image-api.json"));
function refs(value,out=[]){
  if(Array.isArray(value)){
    if(value.length===2&&(typeof value[0]==="string"||typeof value[0]==="number")&&typeof value[1]==="number")out.push(String(value[0]));
    else for(const v of value)refs(v,out);
  } else if(value&&typeof value==="object")for(const v of Object.values(value))refs(v,out);
  return out;
}
function ancestors(wf,start){const keep=new Set(),stack=[String(start)];while(stack.length){const id=stack.pop();if(keep.has(id)||!wf[id])continue;keep.add(id);for(const r of refs(wf[id].inputs||{}))stack.push(r);}return keep;}
const raw=JSON.parse(await fs.readFile(file,"utf8"));const wf=raw.prompt||raw;
const saves=Object.entries(wf).filter(([,n])=>n?.class_type==="SaveImage");
const report=saves.map(([id,n])=>{const ids=ancestors(wf,id);const loads=[...ids].filter(x=>wf[x]?.class_type==="LoadImage");return {saveImageNode:id,loadImages:loads.length,loadImageNodes:loads};}).sort((a,b)=>b.loadImages-a.loadImages);
const best=report[0]||null;
const status=best?.loadImages>=2?"READY_TWO_REFERENCES":"SINGLE_REFERENCE_ONLY";
console.log(JSON.stringify({workflow:file,status,saveBranches:report},null,2));
if(status!=="READY_TWO_REFERENCES"){
  console.error("\nAWENA PILOT BLOQUÉ AVANT GÉNÉRATION: le JSON API n’expose pas une branche active à 2 images. Active dans le template FLUX.2 Klein 4B Distillé le groupe « Multiple input example » (2 Charger Image), désactive l’exemple simple, puis réexporte ce même fichier API.");
  process.exitCode=2;
}
