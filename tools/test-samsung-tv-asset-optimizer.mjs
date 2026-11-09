import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const script=path.join(root,'tools','optimize-samsung-tv-assets.mjs');
const build=fs.readFileSync(path.join(root,'tools','build-samsung-tv.mjs'),'utf8');
assert.match(build,/optimize-samsung-tv-assets\.mjs/);
assert.match(build,/if \(optimize\.status !== 0\)/);
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'mss-tv-opt-test-'));
try {
  const js=path.join(dir,'game-mode-data.js');
  const content='// test; this file must never be changed\n';
  fs.writeFileSync(js,content);
  let result=spawnSync(process.execPath,[script,`--dir=${dir}`],{
    encoding:'utf8',env:{...process.env,MSS_TV_IMAGE_OPTIMIZE:'0',MSS_TV_VIDEO_OPTIMIZE:'0'}
  });
  assert.equal(result.status,0,result.stderr);
  assert.equal(fs.readFileSync(js,'utf8'),content);
  assert.match(result.stdout,/Samsung TV assets:/);
  // Test image compression and ensure NO .mss-tmp ever appears under watched assets.
  let sharp;
  try {sharp=(await import('sharp')).default;}catch{}
  if(sharp) {
    const png=path.join(dir,'test-banner.png');
    await sharp({create:{width:700,height:700,channels:4,background:{r:80,g:120,b:180,alpha:1}}}).png({compressionLevel:0}).toFile(png);
    const before=fs.statSync(png).size;
    assert.ok(before>120*1024,`test image too small: ${before}`);
    result=spawnSync(process.execPath,[script,`--dir=${dir}`],{
      encoding:'utf8',env:{...process.env,MSS_TV_VIDEO_OPTIMIZE:'0'}
    });
    assert.equal(result.status,0,result.stderr);
    assert.ok(fs.statSync(png).size<before,'image was not compressed');
    const metadata=await sharp(png).metadata();
    assert.equal(metadata.width,700);
  }
  assert.equal(fs.readdirSync(dir).some(name=>name.includes('.mss-tmp-')),false);
  assert.equal(fs.readFileSync(js,'utf8'),content);
  console.log('✅ TV optimizer OK: no temp files in Tizen assets; assets preserved.');
} finally {fs.rmSync(dir,{recursive:true,force:true});}
