/**
 * MSS V18 local QA gates, read-only. No Git operations, no deployment.
 * These are deterministic review roles, not remote autonomous GitHub agents.
 */
import { createHash } from 'node:crypto';
const hash=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const BAD=new Set(['FAIL','TIMEOUT','BLOQUE']);
const UNCERTAIN=new Set(['NON_EXECUTE','BASELINE_ERRORS','SKIP','UNKNOWN']);
const good=new Set(['PASS']);
const limits={maxTests:100,maxChanged:25};
export function evaluateQaGates(report,{zipAvailable=false}={}){
  if(!report||typeof report!=='object'||!Array.isArray(report.tests)||!Array.isArray(report.changed))throw Error('Rapport de régression invalide');
  if(report.tests.length>limits.maxTests||report.changed.length>limits.maxChanged)throw Error('Rapport trop volumineux');
  const tests=report.tests.map(t=>({id:String(t.id||''),status:String(t.status||'UNKNOWN')}));
  const problems=[];
  if(new Set(tests.map(t=>t.id)).size!==tests.length)problems.push('Identifiants de tests dupliqués');
  if(tests.some(t=>!t.id || !/^[\w:./-]{1,180}$/.test(t.id)))problems.push('Identifiants de tests invalides');
  if(tests.some(t=>!good.has(t.status)&&!BAD.has(t.status)&&!UNCERTAIN.has(t.status)))problems.push('Statuts de tests inconnus');
  if(!report.changed.length)problems.push('Aucun fichier modifié');
  if(!tests.some(t=>t.id==='typecheck-global'))problems.push('Typecheck global absent');
  const targeted=tests.filter(t=>!t.id.startsWith('syntax:')&&t.id!=='typecheck-global');
  if(!targeted.length)problems.push('Aucun test ciblé déclaré');
  const failures=tests.filter(t=>BAD.has(t.status));
  const uncertain=tests.filter(t=>UNCERTAIN.has(t.status));
  const pilot={role:'PILOTE_QA_LOCAL',verdict:failures.length?'ECHEC':problems.length||uncertain.length?'INCOMPLET':'PASS',failures:failures.map(t=>t.id),unverified:uncertain.map(t=>t.id),coverage:tests.map(t=>t.id)};
  // Independent audit of evidence and consistency, not another execution of the tests.
  const auditorIssues=[...problems];
  if(report.qualification==='BLOQUE')auditorIssues.push('Qualification V13/V14 bloquée');
  if(['BLOQUE','ECHEC_QA'].includes(report.decision) && !failures.length)auditorIssues.push('Verdict régression bloqué sans preuve de test en échec');
  if(tests.find(t=>t.id==='typecheck-global')?.status!=='PASS')auditorIssues.push('Typecheck global non pleinement validé');
  if(!targeted.some(t=>t.status==='PASS'))auditorIssues.push('Aucun test ciblé réussi');
  if(!zipAvailable)auditorIssues.push('Aucun ZIP produit par le moteur V16/V17');
  const auditor={role:'AUDITEUR_QA_LOCAL',verdict:auditorIssues.length||failures.length||uncertain.length?'RESERVES':'PASS',issues:auditorIssues};
  const approved=pilot.verdict==='PASS'&&auditor.verdict==='PASS'&&report.decision==='TESTS_CIBLES_OK_REVISION_HUMAINE'&&zipAvailable;
  return {schema:'mss.dev.qa.gate.v18',missionId:report.missionId||null,createdAt:new Date().toISOString(),pilot,auditor,decision:approved?'ZIP_POUR_REVUE_HUMAINE':'BLOQUE_POUR_REVUE',zipPermitted:approved,reportSha256:hash({missionId:report.missionId,changed:report.changed,tests,decision:report.decision}),notice:'Avis locaux automatisés sur les preuves fournies. Pas de robots GitHub exécutés, pas de certification fonctionnelle, pas de publication ni installation.'};
}
