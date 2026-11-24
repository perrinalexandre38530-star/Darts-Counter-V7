import {readFileSync,writeFileSync,renameSync,existsSync} from 'node:fs';
import {createHash,randomUUID} from 'node:crypto';
import {dirname,resolve,join} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
export const root=resolve(dirname(fileURLToPath(import.meta.url)),'output');
export const read=(name,fallback)=>existsSync(join(root,name))?JSON.parse(readFileSync(join(root,name),'utf8')):fallback;
export function save(name,value){const temp=join(root,`.${name}.${randomUUID()}.tmp`);writeFileSync(temp,JSON.stringify(value,null,2));renameSync(temp,join(root,name));}
export const entries=()=>read('catalog.json',{entries:[]}).entries;
export const approvals=()=>read('approvals.json',{});
export function locate(id){
 if(!/^[a-z]{2}\/campaign_0[123]$/.test(id))throw Error('Identifiant refusé');
 const e=entries().find(e=>e.id===id);
 if(!e||e.file!==id+'.png'||e.qa!=='PASS_LAYOUT_GLYPHS_QR'||e.template_version!==2)throw Error('Média V2 non qualifié');
 const path=join(root,e.file);const sha=createHash('sha256').update(readFileSync(path)).digest('hex');
 if(sha!==e.sha256)throw Error('SHA différent');return {...e,absolute_path:path};
}
export function selectMedia(locale,campaign){const e=locate(locale+'/'+campaign), a=approvals()[e.id];if(a?.decision!=='approved'||a.sha256!==e.sha256)throw Error('Validation visuelle requise');return e;}
export function decideMany(items,decision){if(!['approved','rejected'].includes(decision)||!Array.isArray(items)||!items.length||items.length>66||new Set(items.map(i=>i.id)).size!==items.length)throw Error('Sélection invalide');const checked=items.map(({id,sha})=>{const e=locate(id);if(e.sha256!==sha)throw Error('Version invalide : '+id);return e;});const a=approvals();for(const e of checked)a[e.id]={decision,sha256:e.sha256,at:new Date().toISOString()};save('approvals.json',a);return checked.length;}
export function decide(id,sha,decision){decideMany([{id,sha}],decision);return approvals()[id];}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){try{console.log(JSON.stringify(selectMedia(process.argv[2],process.argv[3])));}catch(e){console.error(e.message);process.exitCode=1;}}
