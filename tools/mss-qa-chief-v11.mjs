// MSS AI CONTROL — deterministic QA triage, no arbitrary command execution.
export const CATEGORIES = Object.freeze({
  history: [/histor/i,/partie/i,/doublon/i,/restaur/i,/history/i],
  backup: [/sauvegard/i,/nas\b/i,/cloud/i,/drive/i,/r2\b/i,/sync/i,/backup/i],
  stats: [/stat/i,/x0?1/i,/avg/i,/moyenn/i,/501/i,/dashboard/i],
  navigation: [/navig/i,/page/i,/menu/i,/clic/i,/bouton/i,/ticker/i,/affich/i,/route/i],
  types: [/typescript/i,/compil/i,/build/i,/erreur/i,/crash/i,/referenceerror/i,/typeerror/i]
});
const fileRules=[
 ['history',/(history|histor|restore|restaur)/i],
 ['backup',/(backup|cloud|sync|storage|nas|drive)/i],
 ['stats',/(stats|x01|dashboard|avg)/i],
 ['navigation',/(navigation|routes|pages|components)/i]
];
export function planQa({description='',changedFiles=[]}={}) {
 if(typeof description!=='string'||description.length>2000||!Array.isArray(changedFiles)||changedFiles.length>20000)throw new Error('Entrée non valide');
 const suggested=new Set();const reasons=[];
 for(const [category,patterns] of Object.entries(CATEGORIES))if(patterns.some(p=>p.test(description))){suggested.add(category);reasons.push('Description : '+category);}
 for(const p of changedFiles){if(typeof p!=='string')continue;for(const [cat,pattern] of fileRules){if(pattern.test(p)){suggested.add(cat);break;}}}
 if(changedFiles.some(p=>/\.(ts|tsx|js|jsx|mjs)$/.test(p)))suggested.add('types');
 if(changedFiles.length)reasons.push(changedFiles.length+' fichier(s) modifié(s) ou ajouté(s)');
 if(!suggested.size){suggested.add('qa-complet');reasons.push('Aucun domaine identifié : audit transversal proposé');}
 const order=['history','backup','stats','navigation','types','qa-complet'];
 return {missions:order.filter(x=>suggested.has(x)), reasons, source:'rules-v11', autonomous:false, note:'Suggestion fondée sur des règles. Les contrôles ne réparent pas le code et ne vérifient pas StackBlitz.'};
}
