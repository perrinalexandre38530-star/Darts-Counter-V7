import fs from 'node:fs';

const read = (p) => fs.readFileSync(p, 'utf8');
const moduleSrc = read('./src/pages/fit/FitPerfModule.tsx');
const planSrc = read('./src/pages/fit/FitPerfPlan.tsx');
const navSrc = read('./src/components/BottomNav.tsx');
const welcomeSrc = read('./src/components/home/SportWelcomeWatermark.tsx');
const fitHome = read('./src/pages/fit/FitPerfHome.tsx');

const checks = [
  ['program randomizer', moduleSrc.includes('randomizeProgram') && moduleSrc.includes('NOUVEAU TIRAGE')],
  ['program image ticker', moduleSrc.includes('TemplateTicker') && moduleSrc.includes('fitProgramTicker')],
  ['workout exercise thumbnails', moduleSrc.includes('exercisePreviewUrl(exercise.id)') && moduleSrc.includes('gridTemplateColumns: "54px 1fr auto auto"')],
  ['isolated muscle icons', planSrc.includes('case "Pectoraux"') && planSrc.includes('case "Quadriceps"') && !planSrc.includes('const backOnly =')],
  ['selected filter removed from zone choices', planSrc.includes('item !== muscle')],
  ['selected filter removed from equipment choices', planSrc.includes('item !== equipment')],
  ['selected filter removed from level choices', planSrc.includes('item !== level')],
  ['fit/running profiles second', navSrc.includes('sportLc === "running"') && navSrc.includes('{ k: "profiles"') && navSrc.indexOf('{ k: "profiles"') > navSrc.indexOf('{ k: "home"')],
  ['shared sport welcome watermark', welcomeSrc.includes('grayscale(1)') && welcomeSrc.includes('logoMolkky') && welcomeSrc.includes('logoFoot')],
  ['fit welcome grayscale', fitHome.includes('grayscale(1) saturate(0)')],
];

const failed = checks.filter(([, ok]) => !ok);
if (failed.length) {
  console.error('❌ FIT PERF V95 UI checks failed:', failed.map(([name]) => name).join(', '));
  process.exit(1);
}
console.log('✅ FIT PERF V95 UI CHECK OK');
console.log('   welcome watermarks · nav order · isolated filters · random programs · ticker backgrounds · workout thumbnails');
