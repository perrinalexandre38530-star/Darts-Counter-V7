/** MSS AI CONTROL V5 — pure, conservative ZIP patch analysis. No writes. */
import { createHash } from 'node:crypto';
import { posix } from 'node:path';
export const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
export function validateZipPath(name) {
  if (!name || name.includes('\\') || name.includes('\0') || /[\x00-\x1f]/.test(name) || name.startsWith('/') || /^[A-Za-z]:/.test(name)) return false;
  const parts=name.split('/');
  return !parts.some(p=>p==='..'||p==='.'||p==='') && posix.normalize(name)===name;
}
export function reviewFiles(entries, existing, options={}) {
  // existing: Map<path, {exists, tracked, dirty, bytes}>; entries: Map<path, Buffer>.
  const rows=[], warnings=[];
  const manifest=options.manifest;
  for (const [path, bytes] of entries) {
    const current=existing.get(path)||{exists:false,tracked:false,dirty:false};
    const incomingSha=sha256(bytes);
    let status,reason;
    if (!current.exists) { status='AJOUT'; reason='Fichier absent du projet'; }
    else if (sha256(current.bytes)===incomingSha) {status='IDENTIQUE';reason='Aucun remplacement nécessaire';}
    else if (current.dirty) {status='CONFLIT';reason='Fichier local modifié : ne pas écraser';}
    else if (!current.tracked) {status='CONFLIT';reason='Fichier présent mais non suivi par Git';}
    else {status='REVISION';reason='Remplacement à vérifier : la provenance du ZIP ne prouve pas la compatibilité';}
    if (manifest?.files?.[path]?.sha256 && manifest.files[path].sha256!==incomingSha) {
      status='CONFLIT';reason='Empreinte du manifeste différente du contenu ZIP';
    }
    rows.push({path,status,reason,incomingSha,tracked:current.tracked});
  }
  if (!manifest) warnings.push('ZIP sans manifeste de base : impossible de prouver que ses remplacements sont compatibles avec main.');
  else if (!manifest.baseCommit) warnings.push('Manifeste sans commit de référence : contrôle de provenance incomplet.');
  else if (options.localCommit && manifest.baseCommit!==options.localCommit) warnings.push(`ZIP préparé depuis ${manifest.baseCommit.slice(0,12)}, main local ${options.localCommit.slice(0,12)} : validation manuelle requise.`);
  const blocked=rows.some(r=>r.status==='CONFLIT');
  const review=rows.some(r=>r.status==='REVISION')||warnings.length>0;
  return {status:blocked?'BLOQUE':review?'REVISION_REQUISE':'OK',rows,warnings,counts:Object.fromEntries(['AJOUT','IDENTIQUE','REVISION','CONFLIT'].map(k=>[k,rows.filter(r=>r.status===k).length]))};
}
