// Vérification des fichiers TS / TSX touchés, sans installation de dépendances.
const path=require('node:path');
const {execFileSync}=require('node:child_process');
let ts;
try { ts=require('typescript'); }
catch {
  try { ts=require(path.join(execFileSync('npm',['root','-g'],{encoding:'utf8'}).trim(),'typescript','lib','typescript.js')); }
  catch { console.error('TypeScript introuvable : npm install requis.'); process.exit(1); }
}
const fs=require('fs');
const files=[
'src/App.tsx','src/pages/Games.tsx','src/pages/FiveLivesConfig.tsx','src/pages/FiveLivesPlay.tsx',
'src/pages/HalveItConfig.tsx','src/pages/HalveItPlay.tsx','src/pages/PublicLandingPage.tsx',
'src/games/dartsGameRegistry.ts','src/games/dartsPublicRulesAudit.ts','src/config/androidStoreV1.ts',
'src/lib/gameEngines/halveItEngine.ts','src/i18n/fr.ts','src/i18n/en.ts',
'src/pages/StatsHub.tsx','src/components/stats/HalveItStatsTabFull.tsx'];
let errors=0;
for (const f of files) {
 const text=fs.readFileSync(f,'utf8');
 const out=ts.transpileModule(text,{fileName:f,reportDiagnostics:true, compilerOptions:{target:ts.ScriptTarget.ES2022, module:ts.ModuleKind.ESNext, jsx:ts.JsxEmit.ReactJSX}});
 const bad=(out.diagnostics||[]).filter(d=>d.category===ts.DiagnosticCategory.Error);
 for(const d of bad){ console.error(f,'TS'+d.code,ts.flattenDiagnosticMessageText(d.messageText,'\n'));errors++;}
}
if (errors) process.exit(1);
console.log('OK — Syntaxe TypeScript/TSX valide sur '+files.length+' fichiers.');
