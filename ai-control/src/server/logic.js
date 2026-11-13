// Logique vérifiable sans accès GitHub.
export const AGENTS = Object.freeze(['directeur','developpeur','debogueur','data-cloud','designer','mobile-tv','qa','auditeur','live-online','marketing','monetisation','integrateur']);
export const PRIORITIES = Object.freeze(['low','normal','high']);
export const STATUS_LABELS = Object.freeze({ approved:'mss:approved', paused:'mss:blocked', mission:'mss:mission' });
const lowerLabels = (issue) => (Array.isArray(issue?.labels)?issue.labels:[]).map(x=>typeof x==='string'?x:x?.name).filter(Boolean).map(x=>x.toLowerCase());
export function isMission(issue) {
  if(!issue || issue.pull_request || issue.state!=='open') return false;
  return lowerLabels(issue).includes('mss:mission') || /^\[(?:AGENT|AI TEAM|MSS AI CONTROL)\]/i.test(issue.title??'');
}
export function missionStatus(issue){const labels=lowerLabels(issue);if(labels.includes('mss:blocked'))return 'BLOQUÉE';if(labels.includes('mss:review'))return 'REVUE HUMAINE';if(labels.includes('mss:running'))return 'EN COURS';if(labels.includes('mss:approved'))return 'APPROUVÉE';if(labels.includes('mss:queued'))return 'EN ATTENTE';if(labels.includes('mss:draft'))return 'BROUILLON';return 'À QUALIFIER';}
const trim = (str)=>typeof str==='string'?str.trim():'';
export function validateMission(input){
  if(!input || typeof input!=='object' || Array.isArray(input)) throw new Error('Formulaire invalide.');
  const obj={title:trim(input.title),agent:trim(input.agent),priority:trim(input.priority)||'normal',goal:trim(input.goal),success:trim(input.success),boundaries:trim(input.boundaries)};
  if(obj.title.length<4||obj.title.length>110)throw new Error('Le nom de la mission doit contenir entre 4 et 110 caractères.');
  if(!AGENTS.includes(obj.agent))throw new Error('Choisis un robot parmi les 12 spécialités.');
  if(!PRIORITIES.includes(obj.priority))throw new Error('Priorité non reconnue.');
  if(obj.goal.length<12||obj.goal.length>2500)throw new Error('La directive doit contenir entre 12 et 2500 caractères.');
  if(obj.success.length<10||obj.success.length>2000)throw new Error('Précise les critères de réussite (10 à 2000 caractères).');
  if(obj.boundaries.length>1500)throw new Error('Les restrictions sont trop longues.');
  for(const key of ['title','goal','success','boundaries'])if(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(obj[key]))throw new Error('Le texte contient des caractères interdits.');
  return obj;
}
export function formatIssueBody(m){
  return `## Mission confiée depuis MSS AI CONTROL\n\n**Robot :** ${m.agent}\n**Priorité :** ${m.priority}\n**Statut de départ :** à qualifier — ne déclenche aucune exécution\n\n### Objectif\n${m.goal}\n\n### Critères de réussite\n${m.success}\n\n### Limites / interdictions\n${m.boundaries||'Respecter strictement AGENTS.md, les skills et le périmètre métier.'}\n\n### Contrôles obligatoires\n- [ ] Définir les fichiers autorisés et vérifier les conflits de branches\n- [ ] Tester sur une branche isolée, pas sur main\n- [ ] Revue QA indépendante, audit si nécessaire\n- [ ] Présenter les preuves avant intégration\n- [ ] Aucun merge, déploiement, dépense ou publication sans accord du propriétaire\n\n> Ce ticket est visible publiquement puisque le dépôt GitHub est public. Ne jamais écrire de données personnelles, mots de passe ou secrets.\n`;
}
export function parseAgent(body){const match=String(body??'').match(/\*\*Robot :\*\*\s*([\w-]+)/i);return AGENTS.includes(match?.[1])?match[1]:null;}
export function mapIssue(issue){return {number:Number(issue.number),title:String(issue.title??''),body:String(issue.body??'').slice(0,12000),status:missionStatus(issue),agent:parseAgent(issue.body),createdAt:issue.created_at??null,url:issue.html_url??null};}
export function mapPr(pr){return {number:Number(pr.number),title:String(pr.title??''),draft:Boolean(pr.draft),url:pr.html_url??null};}
export function mapRun(run){return {id:Number(run.id),name:String(run.name??''),status:run.status,conclusion:run.conclusion,url:run.html_url??null};}
