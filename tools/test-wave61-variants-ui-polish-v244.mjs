import fs from 'node:fs';
const play = fs.readFileSync(new URL('../src/pages/Wave61SharedPlay.tsx', import.meta.url), 'utf8');
const must = [
  'data-wave61-bot-recap-continue="1"',
  'if (!visitRecap || visitRecap.isBot) return;',
  'data-variant-active-counters="three_colors"',
  'data-variant-active-counters={spec.id}',
  'data-variant-live-stack={spec.id}',
  '<GreenRedDartIcon color={accent} size={12}/>',
  '<GreenRedVisitIcon color={accent} size={12}/>',
  '<GreenRedDartIcon color={tone} size={12}/>',
  '<GreenRedVisitIcon color={tone} size={12}/>',
  'spec.id === "three_colors"',
  'spec.id === "la_suite"',
  'spec.id === "color_call"',
];
for (const token of must) {
  if (!play.includes(token)) throw new Error(`V244 missing UI contract: ${token}`);
}
if (!play.includes('manualContinue = !!recap.isBot')) throw new Error('BOT recap must be manual in V244');
console.log('✅ V244 — parité bloc joueur actif, stack SITUATION/PERFORMANCE et récap BOT manuel pour les 4 variantes.');
