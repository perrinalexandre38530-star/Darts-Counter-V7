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
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'mss-tv-opt-'));
try {
  const file=path.join(dir,'game-mode-data.js');
  const content='// test; this file must never be changed\n';
  fs.writeFileSync(file,content);
  const result=spawnSync(process.execPath,[script,`--dir=${dir}`],{
    encoding:'utf8',env:{...process.env,MSS_TV_IMAGE_OPTIMIZE:'0',MSS_TV_VIDEO_OPTIMIZE:'0'}
  });
  assert.equal(result.status,0,result.stderr);
  assert.equal(fs.readFileSync(file,'utf8'),content);
  assert.match(result.stdout,/Samsung TV assets:/);
  console.log('✅ TV asset optimizer contract OK; JavaScript/game assets preserved.');
} finally {fs.rmSync(dir,{recursive:true,force:true});}
