import fs from 'node:fs';
const modes=['bim_bam_boum','saute_moutons','troupeau_en_danger'];
function ok(cond,msg){if(!cond) throw new Error(msg); console.log('✅',msg)}
const cat=fs.readFileSync('src/games/dartsWave61.ts','utf8');
const fam=fs.readFileSync('src/games/dartsWave61Families.ts','utf8');
const eng=fs.readFileSync('src/lib/gameEngines/wave61Engine.ts','utf8');
const pub=fs.readFileSync('src/pages/PublicLandingPage.tsx','utf8');
const audit=fs.readFileSync('src/games/dartsPublicRulesAudit.ts','utf8');
for(const id of modes){
 ok(cat.includes(`id: "${id}"`),`${id} présent dans le catalogue Wave61`);
 ok(fam.includes(`${id}:`),`${id} classé dans une famille moteur`);
 ok(eng.includes(`state.modeId === "${id}"`),`${id} possède une branche de gameplay`);
 ok(fs.existsSync(`src/pages/wave61/modes/${id}Config.tsx`),`${id} Config dédiée`);
 ok(fs.existsSync(`src/pages/wave61/modes/${id}Play.tsx`),`${id} Play dédié`);
 ok(pub.includes(id),`${id} référencé sur la page publique`);
 ok(audit.includes(`"${id}"`),`${id} audité comme règle publique`);
 for(const lang of ['fr','en']) ok(fs.existsSync(`src/assets/tickers/ticker_${id}_${lang}.webp`),`${id} ticker ${lang.toUpperCase()}`);
}
console.log('\n✅ NOUVEAUX MODES V104 — intégration contractuelle OK');
