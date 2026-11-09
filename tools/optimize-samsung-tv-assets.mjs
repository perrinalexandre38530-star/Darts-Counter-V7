/**
 * Samsung TV production assets optimizer. Operates ONLY on generated assets.
 * Keeps filenames/extensions unchanged and never removes game assets.
 * Optional image pipeline uses devDependency sharp; optional H.264 pipeline uses ffmpeg.
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const defaultDir = path.join(projectRoot, 'MULTISPORTSSCORINGTV', 'assets');
const assetDir = path.resolve(process.argv.find(x => x.startsWith('--dir='))?.slice(6) || defaultDir);
const MAX_DIM = Math.max(720, Number(process.env.MSS_TV_IMAGE_MAX_DIM || 2560));
const ffmpegEnabled = process.env.MSS_TV_VIDEO_OPTIMIZE !== '0';
const imageEnabled = process.env.MSS_TV_IMAGE_OPTIMIZE !== '0';
const MIN_WIN = 0.06;

if (!fs.existsSync(assetDir) || !fs.statSync(assetDir).isDirectory()) {
  console.error(`❌ Samsung TV assets missing: ${assetDir}`);
  process.exit(1);
}
function collect(dir, acc=[]) {
  for(const entry of fs.readdirSync(dir, {withFileTypes:true})) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) collect(full,acc);
    else if (entry.isFile()) acc.push(full);
  }
  return acc;
}
const files = collect(assetDir);
const bytes = (items) => items.reduce((a,f) => a + fs.statSync(f).size, 0);
const before = bytes(files);
let sharp = null;
if (imageEnabled) {
  try { sharp = (await import('sharp')).default; }
  catch { console.warn('⚠️ sharp unavailable: image compression skipped (run npm install).'); }
}
const videoPaths = files.filter(f => /\.mp4$/i.test(f) && fs.statSync(f).size >= 1024*1024);
let ffmpegAvailable = false;
if (ffmpegEnabled && videoPaths.length) {
  const probe = spawnSync('ffmpeg', ['-version'], {encoding:'utf8', windowsHide:true});
  ffmpegAvailable = probe.status === 0;
  if (!ffmpegAvailable) console.warn('⚠️ ffmpeg unavailable: MP4 compression skipped; no media removed.');
}
let optimized = 0, saved = 0, failed = 0;
const counts={image:0,video:0};
async function commitIfSmaller(file, temporary, oldSize, kind) {
  if (!fs.existsSync(temporary)) return;
  const newSize=fs.statSync(temporary).size;
  if (newSize > 0 && newSize <= oldSize*(1-MIN_WIN)) {
    // Windows cannot always rename over an existing file; write in-place only after result validated.
    const content=fs.readFileSync(temporary);
    fs.writeFileSync(file,content);
    saved+=oldSize-newSize;
    optimized++; counts[kind]++;
  }
}
for(const file of files) {
  const ext=path.extname(file).toLowerCase();
  const originalSize=fs.statSync(file).size;
  if (!originalSize) continue;
  const tmp=path.join(path.dirname(file), `.${path.basename(file)}.mss-tmp-${process.pid}${ext}`);
  try {
    if (sharp && originalSize >= 120*1024 && ['.png','.jpg','.jpeg','.webp'].includes(ext)) {
      const meta=await sharp(file).metadata();
      const pipeline=sharp(file, {limitInputPixels:160000000}).rotate();
      const shouldResize=Boolean(meta.width && meta.height && Math.max(meta.width,meta.height)>MAX_DIM);
      if (shouldResize) pipeline.resize({width:MAX_DIM,height:MAX_DIM,fit:'inside',withoutEnlargement:true});
      if (ext==='.png') await pipeline.png({compressionLevel:9, effort:7, adaptiveFiltering:true}).toFile(tmp);
      else if (ext==='.webp') await pipeline.webp({quality:82,effort:5,alphaQuality:95}).toFile(tmp);
      else await pipeline.jpeg({quality:82,mozjpeg:true}).toFile(tmp);
      await commitIfSmaller(file,tmp,originalSize,'image');
    } else if(ffmpegAvailable && ext==='.mp4' && originalSize>=1024*1024) {
      const result=spawnSync('ffmpeg',[
        '-hide_banner','-loglevel','error','-nostdin','-y','-i',file,
        '-map','0:v:0','-map','0:a?','-vf','scale=min(1920\\,iw):min(1080\\,ih):force_original_aspect_ratio=decrease',
        '-c:v','libx264','-preset','medium','-crf','29','-pix_fmt','yuv420p',
        '-c:a','aac','-b:a','96k','-movflags','+faststart',tmp
      ], {windowsHide:true,timeout:180000});
      if(result.status===0) await commitIfSmaller(file,tmp,originalSize,'video');
      else failed++;
    }
  } catch (err) {
    failed++;
    console.warn(`⚠️ Optimization skipped (${path.basename(file)}): ${err.message}`);
  } finally {
    try{fs.rmSync(tmp,{force:true});}catch{}
  }
}
const after=bytes(files);
const mb=(n)=>(n/1048576).toFixed(2);
console.log(`📺 Samsung TV assets: ${files.length} files; ${mb(before)} MiB → ${mb(after)} MiB; saved ${mb(saved)} MiB (${optimized} optimized: ${counts.image} images, ${counts.video} videos; ${failed} skipped errors).`);
if(after>250*1048576) console.warn('⚠️ TV assets remain >250 MiB; WGT installation may require more free TV storage.');
