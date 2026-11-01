import fs from 'node:fs';
const seven=['black_vs_white','three_colors','la_suite','color_call','bim_bam_boum','saute_moutons','troupeau_en_danger'];
const pub=fs.readFileSync('src/pages/PublicLandingPage.tsx','utf8');
const fr=fs.readFileSync('src/i18n/fr.ts','utf8');
const en=fs.readFileSync('src/i18n/en.ts','utf8');
const cat=fs.readFileSync('src/games/dartsWave61.ts','utf8');
for(const id of seven){
  if(!cat.includes(`id: "${id}"`)) throw new Error(`catalog missing ${id}`);
  if(!pub.includes(id)) throw new Error(`public page missing ${id}`);
  if(!fr.includes(`landing.game.${id}.label`)) throw new Error(`FR public i18n missing ${id}`);
  if(!en.includes(`landing.game.${id}.label`)) throw new Error(`EN public i18n missing ${id}`);
}
console.log('✅ V107 — 7 modes variantes/nouveaux présents catalogue + page publique FR/EN.');
