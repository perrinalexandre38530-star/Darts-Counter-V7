import fs from 'node:fs/promises';
import fssync from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawnSync } from 'node:child_process';

function arg(name, fallback='') {
  const i = process.argv.indexOf(name);
  return i >= 0 ? (process.argv[i+1] ?? fallback) : fallback;
}
function flag(name){ return process.argv.includes(name); }

const promptId = arg('--prompt').trim();
const assetKey = arg('--asset').trim();
const server = arg('--server', process.env.COMFYUI_URL || 'http://127.0.0.1:8188').replace(/\/$/, '');
const outputRoot = path.resolve(arg('--output-root', 'public/fit/awena-library'));
const fps = Math.max(1, Number(arg('--fps', '16')) || 16);
const invertMask = flag('--invert-mask');

if (!promptId) throw new Error('Argument obligatoire: --prompt <ComfyUI prompt_id>');
if (!assetKey) throw new Error('Argument obligatoire: --asset <assetKey>, ex: bench');

function run(cmd,args,label){
  const r=spawnSync(cmd,args,{encoding:'utf8',stdio:['ignore','pipe','pipe']});
  if(r.error) throw new Error(`${label}: ${r.error.message}`);
  if(r.status!==0) throw new Error(`${label}: ${r.stderr || r.stdout || `code ${r.status}`}`);
  return r;
}
function collectFiles(value,out=[]){
  if(Array.isArray(value)){ for(const v of value) collectFiles(v,out); return out; }
  if(value && typeof value==='object'){
    if(typeof value.filename==='string') out.push({filename:value.filename, subfolder:String(value.subfolder||''), type:String(value.type||'output')});
    for(const v of Object.values(value)) collectFiles(v,out);
  }
  return out;
}
function key(ref){ return `${ref.subfolder||''}/${ref.filename||''}`.replace(/^\//,'').toLowerCase(); }
async function materialize(ref,dst){
  const qs=new URLSearchParams({filename:ref.filename,type:ref.type||'output'});
  if(ref.subfolder) qs.set('subfolder',ref.subfolder);
  const res=await fetch(`${server}/view?${qs.toString()}`);
  if(!res.ok) throw new Error(`ComfyUI /view ${res.status}: ${ref.subfolder}/${ref.filename}`);
  await fs.writeFile(dst,Buffer.from(await res.arrayBuffer()));
}
function alphaInfo(file){
  const r=run('ffprobe',['-v','error','-show_entries','stream=pix_fmt:stream_tags=alpha_mode','-of','json',file],'ffprobe alpha');
  const raw=r.stdout||'';
  return {verified:/yuva|alpha_mode"\s*:\s*"?1/i.test(raw),raw};
}
function makeAlphaVideo(rgbPattern,maskPattern,dst){
  const maskFilter=invertMask?'[1:v]format=gray,negate[alpha]':'[1:v]format=gray[alpha]';
  run('ffmpeg',['-y','-framerate',String(fps),'-i',rgbPattern,'-framerate',String(fps),'-i',maskPattern,'-filter_complex',`${maskFilter};[0:v][alpha]alphamerge`,'-c:v','libvpx-vp9','-pix_fmt','yuva420p','-auto-alt-ref','0','-b:v','0','-crf','28',dst],'Encodage WebM alpha');
}
function makeAlphaStill(rgb,mask,dst){
  const maskFilter=invertMask?'[1:v]format=gray,negate[alpha]':'[1:v]format=gray[alpha]';
  run('ffmpeg',['-y','-i',rgb,'-i',mask,'-filter_complex',`${maskFilter};[0:v][alpha]alphamerge`,'-frames:v','1','-c:v','libwebp','-quality','90',dst],'Création WebP alpha');
}

// Verify media tools now, before downloading hundreds of frames.
run('ffmpeg',['-version'],'ffmpeg');
run('ffprobe',['-version'],'ffprobe');

const res = await fetch(`${server}/history/${promptId}`);
if(!res.ok) throw new Error(`Historique ComfyUI inaccessible (${res.status}) pour ${promptId}`);
const all = await res.json();
const h = all?.[promptId];
if(!h) throw new Error(`Prompt ${promptId} absent de l'historique ComfyUI.`);
const status = h?.status?.status_str || h?.status?.completed;
if(!(h?.status?.completed === true || status === 'success')){
  throw new Error(`Le prompt n'est pas terminé avec succès. status=${JSON.stringify(h?.status||null)}`);
}

const refs = collectFiles(h?.outputs || h);
const rgbRefs = refs.filter(r=>key(r).includes('awena-rgb') && r.filename.toLowerCase().endsWith('.png')).sort((a,b)=>key(a).localeCompare(key(b),'en',{numeric:true}));
const maskRefs = refs.filter(r=>key(r).includes('awena-mask') && r.filename.toLowerCase().endsWith('.png')).sort((a,b)=>key(a).localeCompare(key(b),'en',{numeric:true}));

console.log(`Prompt ComfyUI SUCCESS: ${promptId}`);
console.log(`Frames RGB trouvées : ${rgbRefs.length}`);
console.log(`Masques trouvés     : ${maskRefs.length}`);
if(rgbRefs.length < 8) throw new Error(`Seulement ${rgbRefs.length} frames RGB. Impossible de reconstruire proprement la vidéo.`);
if(maskRefs.length !== rgbRefs.length) throw new Error(`Incohérence RGB/masques: ${rgbRefs.length}/${maskRefs.length}`);

const tempDir = await fs.mkdtemp(path.join(os.tmpdir(),`fit-awena-recover-${assetKey}-`));
const outDir = path.join(outputRoot,assetKey);
await fs.mkdir(outDir,{recursive:true});
try {
  const rgbFiles=[], maskFiles=[];
  for(let i=0;i<rgbRefs.length;i++){
    const n=String(i+1).padStart(6,'0');
    const rgb=path.join(tempDir,`rgb_${n}.png`);
    const mask=path.join(tempDir,`mask_${n}.png`);
    await Promise.all([materialize(rgbRefs[i],rgb), materialize(maskRefs[i],mask)]);
    rgbFiles.push(rgb); maskFiles.push(mask);
    if((i+1)%25===0 || i===rgbRefs.length-1) console.log(`Téléchargement frames: ${i+1}/${rgbRefs.length}`);
  }

  const videoDst=path.join(outDir,'awena-preview.webm');
  makeAlphaVideo(path.join(tempDir,'rgb_%06d.png'),path.join(tempDir,'mask_%06d.png'),videoDst);
  const alpha=alphaInfo(videoDst);
  if(!alpha.verified) throw new Error(`La vidéo a été créée mais le canal alpha VP9 n'est pas vérifiable: ${videoDst}`);

  const max=rgbFiles.length-1;
  const posterIndex=Math.max(0,Math.min(max,Math.round(max*0.10)));
  const stepIndices=[0,.33,.66,1].map(v=>Math.max(0,Math.min(max,Math.round(max*v))));
  makeAlphaStill(rgbFiles[posterIndex],maskFiles[posterIndex],path.join(outDir,'awena-poster.webp'));
  for(let i=0;i<4;i++) makeAlphaStill(rgbFiles[stepIndices[i]],maskFiles[stepIndices[i]],path.join(outDir,`awena-step-${String(i+1).padStart(2,'0')}.webp`));

  const metadata={
    exerciseId:assetKey,
    assetKey,
    recoveredFromPromptId:promptId,
    recoveredAt:new Date().toISOString(),
    transparentVideo:true,
    alphaVerified:true,
    alphaSource:'SAM2 final-frame matte',
    frames:rgbFiles.length,
    fps,
    stepFrameIndices:stepIndices,
    posterFrameIndex:posterIndex,
  };
  await fs.writeFile(path.join(outDir,'metadata.json'),JSON.stringify(metadata,null,2));

  console.log('\nRECOVERY OK');
  console.log(`Dossier: ${outDir}`);
  console.log('Créés: awena-preview.webm, awena-poster.webp, awena-step-01..04.webp, metadata.json');
} finally {
  await fs.rm(tempDir,{recursive:true,force:true}).catch(()=>{});
}
