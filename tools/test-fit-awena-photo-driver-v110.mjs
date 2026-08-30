import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { buildMotionDriverFromImages, resolveCatalogImageUrl } from "./fit-awena-driver-utils.mjs";

function ffmpeg(args){const r=spawnSync("ffmpeg",["-y","-loglevel","error",...args],{encoding:"utf8"});if(r.status!==0)throw new Error(r.stderr||`ffmpeg ${r.status}`);}
function ffprobe(file){const r=spawnSync("ffprobe",["-v","error","-show_entries","format=duration","-of","default=nw=1:nk=1",file],{encoding:"utf8"});if(r.status!==0)throw new Error(r.stderr||`ffprobe ${r.status}`);return Number(String(r.stdout||"").trim())||0;}
function assert(cond,msg){if(!cond)throw new Error(msg);}

assert(resolveCatalogImageUrl({source:"free-exercise-db"},"Foo_Bar/0.jpg").includes("raw.githubusercontent.com/yuhonas/free-exercise-db"),"FreeDB relative image URL not resolved");
assert(resolveCatalogImageUrl({source:"wger"},"https://wger.de/media/exercise-images/1/x.jpg") === "https://wger.de/media/exercise-images/1/x.jpg","Absolute wger URL changed");

const temp=await fs.mkdtemp(path.join(os.tmpdir(),"fit-awena-driver-test-"));
try{
  const a=path.join(temp,"a.png"), b=path.join(temp,"b.png"), out=path.join(temp,"drivers");
  ffmpeg(["-f","lavfi","-i","color=c=black:s=640x368:d=0.1","-vf","drawbox=x=110:y=120:w=120:h=120:color=white:t=fill","-frames:v","1",a]);
  ffmpeg(["-f","lavfi","-i","color=c=black:s=640x368:d=0.1","-vf","drawbox=x=390:y=120:w=120:h=120:color=white:t=fill","-frames:v","1",b]);
  const result=await buildMotionDriverFromImages({assetKey:"test-exercise",imageCandidates:[a,b],outputDir:out,overwrite:true});
  assert(result.ok,"Photo driver builder returned !ok");
  const stat=await fs.stat(result.path);
  assert(stat.size>1000,"Generated driver is empty");
  assert(ffprobe(result.path)>1,"Generated driver duration too short");
  console.log("FIT AWENA photo-driver V110: OK");
}finally{await fs.rm(temp,{recursive:true,force:true}).catch(()=>{});}
