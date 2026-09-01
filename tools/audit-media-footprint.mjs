import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const roots = ['public', path.join('src','assets')];
const mediaExt = /\.(png|jpe?g|webp|avif|gif|svg|mp4|webm|m4a|aac|mp3|wav|bvh)$/i;
const rows = [];
function walk(dir) {
  if (!fs.existsSync(dir)) return;
  const stack=[dir];
  while(stack.length){
    const current=stack.pop();
    for(const name of fs.readdirSync(current)){
      const full=path.join(current,name); const st=fs.statSync(full);
      if(st.isDirectory()) stack.push(full);
      else if(mediaExt.test(name)) rows.push({file:path.relative(root,full).split(path.sep).join('/'),bytes:st.size});
    }
  }
}
for(const dir of roots) walk(path.join(root,dir));
rows.sort((a,b)=>b.bytes-a.bytes);
const total=rows.reduce((n,r)=>n+r.bytes,0);
const byExt=new Map();
for(const row of rows){ const ext=path.extname(row.file).toLowerCase(); byExt.set(ext,(byExt.get(ext)||0)+row.bytes); }
console.log(`MEDIA SOURCE TOTAL: ${(total/1024/1024).toFixed(2)} MB / ${rows.length} files`);
console.log('\nBy format:');
for(const [ext,bytes] of [...byExt.entries()].sort((a,b)=>b[1]-a[1])) console.log(`${ext.padEnd(6)} ${(bytes/1024/1024).toFixed(2).padStart(8)} MB`);
console.log('\nLargest 40 media files:');
for(const row of rows.slice(0,40)) console.log(`${(row.bytes/1024/1024).toFixed(2).padStart(7)} MB  ${row.file}`);

const pngJpg=rows.filter((r)=>/\.(png|jpe?g)$/i.test(r.file));
const legacyBytes=pngJpg.reduce((n,r)=>n+r.bytes,0);
console.log(`\nPNG/JPEG candidates: ${pngJpg.length} files / ${(legacyBytes/1024/1024).toFixed(2)} MB`);
console.log('Policy: keep only mandatory store/app icons local; move optional media to Cloudflare content packs and prefer WebP/Opus.');
