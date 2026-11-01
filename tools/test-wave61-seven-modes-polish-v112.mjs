import fs from 'node:fs';
const read=(p)=>fs.readFileSync(p,'utf8');
const play=read('src/pages/Wave61SharedPlay.tsx');
const engine=read('src/lib/gameEngines/wave61Engine.ts');
const end=read('src/pages/wave61/Wave61EndSummary.tsx');
const ids=['black_vs_white','three_colors','la_suite','color_call','bim_bam_boum','saute_moutons','troupeau_en_danger'];
for(const id of ids){if(!play.includes(id)) throw new Error(`Play missing ${id}`)}
for(const needle of ['bimBamBoumFailedByPlayer','bimBamBoumSuperByPlayer','sauteMoutonsLeapfrogsByPlayer','sauteMoutonsBestJumpByPlayer','troupeauWavesRepelledByPlayer','troupeauSheepSavedByPlayer','troupeauBestDefenseByPlayer']) if(!engine.includes(needle)) throw new Error(`Engine stat missing ${needle}`);
for(const needle of ['data-bim-bam-boum-final-table','data-saute-moutons-final-table','data-troupeau-danger-final-table']) if(!end.includes(needle)) throw new Error(`Final table missing ${needle}`);
for(const needle of ['modeId==="bim_bam_boum"','modeId==="saute_moutons"','modeId==="troupeau_en_danger"']) if(!play.includes(needle)) throw new Error(`Performance block missing ${needle}`);
if(!play.includes('id === "bim_bam_boum" || id === "saute_moutons" || id === "troupeau_en_danger"')) throw new Error('New modes not promoted to V244 polished layout');
console.log('✅ V112 — 7 modes: V244 preserved + performance/final stats for BIM BAM BOUM, SAUTE-MOUTONS, TROUPEAU EN DANGER.');
