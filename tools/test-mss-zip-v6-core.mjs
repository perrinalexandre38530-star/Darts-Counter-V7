import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';
import {SafeZip,cleanPath,digest,contained} from './mss-zip-v6-core.mjs';
const d=mkdtempSync(join(tmpdir(),'mss-v6-'));
try{
const z=join(d,'test.zip');execFileSync('python',['-c',`import zipfile,sys;z=zipfile.ZipFile(sys.argv[1],'w',compression=zipfile.ZIP_DEFLATED);z.writestr('tools/demo.txt','bonjour');z.writestr('new/readme.txt','salut');z.close()`,z]);
const zip=new SafeZip(z);assert.equal(zip.entries.length,2);assert.equal(zip.extract(zip.entries[0]).toString(),'bonjour');zip.close();
for(const p of ['../a','C:/foo','/abs','a\\b','a/./b','a//b','a:<bad>'])assert.equal(cleanPath(p),false,p);
assert.equal(cleanPath('src/components/Hello.tsx'),true);assert.throws(()=>contained(d,'../outside'));assert.equal(digest(Buffer.from('a')).length,64);
console.log('MSS V6 : 12 assertions validées');
}finally{rmSync(d,{recursive:true,force:true})}
