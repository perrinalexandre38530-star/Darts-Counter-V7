import { readFileSync, existsSync, realpathSync, lstatSync } from 'node:fs';
import { resolve, relative, dirname, sep } from 'node:path';
import { createHash } from 'node:crypto';

const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const MAX_FILES = 40, MAX_EACH = 250_000, MAX_TOTAL = 2_000_000;
export function checkProposal(root, input) {
  if (!input || input.schema !== 'mss.dev.proposal.v1' || !Array.isArray(input.files)) throw Error('Format mss.dev.proposal.v1 requis');
  if (!input.files.length || input.files.length > MAX_FILES) throw Error('Nombre de fichiers interdit');
  if (typeof input.missionId !== 'string' || !/^dev-[a-f0-9]{16}$/.test(input.missionId)) throw Error('Identifiant de mission invalide');
  const base = realpathSync(root), seen = new Set(); let total = 0;
  const files = input.files.map((item) => {
    const path = item?.path;
    if (typeof path !== 'string' || path.length > 200 || !/^(src|tools)\/[A-Za-z0-9_./-]+\.(ts|tsx|js|jsx|mjs|json|css)$/.test(path) || path.split('/').some(x => x === '.' || x === '..') || path.includes('//')) throw Error('Chemin de projet interdit');
    if (seen.has(path)) throw Error('Doublon de fichier'); seen.add(path);
    const absolute = resolve(base, ...path.split('/'));
    if (!absolute.startsWith(base + sep)) throw Error('Sortie du projet refusée');
    if (!existsSync(absolute)) return {path,status:'REFUS',reason:'Fichier absent : création non prise en charge'};
    // Refuse symbolic links at every step; never follow paths outside the repository.
    let parent = base;
    for (const part of path.split('/')) { parent = resolve(parent,part); if (lstatSync(parent).isSymbolicLink()) return {path,status:'REFUS',reason:'Lien symbolique interdit'}; }
    const original = readFileSync(absolute);
    const originalSha = sha(original);
    if (!/^[a-f0-9]{64}$/.test(item.baseSha256 || '')) return {path,status:'REFUS',reason:'Empreinte de départ absente/invalide'};
    if (item.baseSha256 !== originalSha) return {path,status:'CONFLIT',reason:'Fichier modifié depuis le point de départ',currentSha256:originalSha};
    if (typeof item.contentBase64 !== 'string' || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(item.contentBase64)) return {path,status:'REFUS',reason:'Contenu base64 invalide'};
    const data = Buffer.from(item.contentBase64,'base64'); total += data.length;
    if (data.length > MAX_EACH || total > MAX_TOTAL) throw Error('Proposition trop volumineuse');
    if (data.includes(0)) return {path,status:'REFUS',reason:'Contenu binaire interdit'};
    if (sha(data) === originalSha) return {path,status:'IDENTIQUE',baseSha256:originalSha};
    return {path,status:'PRET_A_REVOIR',baseSha256:originalSha,newSha256:sha(data),bytes:data.length,content:data};
  });
  const blocked = files.some(f => f.status === 'REFUS' || f.status === 'CONFLIT');
  return {schema:'mss.dev.review.v1',missionId:input.missionId,decision:blocked?'BLOQUE':'REVISION_HUMAINE_REQUISE',files};
}
function crc32(buf){let c=0xffffffff;for(const b of buf){c^=b;for(let i=0;i<8;i++)c=(c>>>1)^((c&1)?0xedb88320:0)}return (c^0xffffffff)>>>0}
export function zipFiles(entries) {
 const chunks=[], directory=[];let off=0;
 for(const [name,bytes] of entries){
  if(!/^(src|tools)\/[A-Za-z0-9_./-]+$|^MSS_DEV_REVIEW\.json$/.test(name)||name.split('/').includes('..'))throw Error('Nom ZIP interdit');
  const file=Buffer.from(name),data=Buffer.from(bytes),crc=crc32(data);
  const h=Buffer.alloc(30);h.writeUInt32LE(0x04034b50,0);h.writeUInt16LE(20,4);h.writeUInt16LE(0x800,6);h.writeUInt32LE(crc,14);h.writeUInt32LE(data.length,18);h.writeUInt32LE(data.length,22);h.writeUInt16LE(file.length,26);
  chunks.push(h,file,data);
  const c=Buffer.alloc(46);c.writeUInt32LE(0x02014b50,0);c.writeUInt16LE(20,4);c.writeUInt16LE(20,6);c.writeUInt16LE(0x800,8);c.writeUInt32LE(crc,16);c.writeUInt32LE(data.length,20);c.writeUInt32LE(data.length,24);c.writeUInt16LE(file.length,28);c.writeUInt32LE(off,42);directory.push(c,file);off+=h.length+file.length+data.length;
 }
 const dirSize=directory.reduce((s,b)=>s+b.length,0),end=Buffer.alloc(22);end.writeUInt32LE(0x06054b50,0);end.writeUInt16LE(entries.length,8);end.writeUInt16LE(entries.length,10);end.writeUInt32LE(dirSize,12);end.writeUInt32LE(off,16);return Buffer.concat([...chunks,...directory,end]);
}
export function makeReviewZip(review){
 if(review.decision!=='REVISION_HUMAINE_REQUISE')throw Error('Proposition bloquée');
 const changed=review.files.filter(f=>f.status==='PRET_A_REVOIR');if(!changed.length)throw Error('Aucune modification à exporter');
 const manifest={schema:review.schema,missionId:review.missionId,decision:review.decision,files:review.files.map(({content,...rest})=>rest),notice:'ZIP de proposition NON TESTEE, NON INSTALLEE. Relecture humaine et QA obligatoires. AUCUN push Git.'};
 return zipFiles([...changed.map(f=>[f.path,f.content]),['MSS_DEV_REVIEW.json',Buffer.from(JSON.stringify(manifest,null,2))]]);
}
