import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const sourcePath = path.join(root, 'src/stats/X01MultiStatsTabFull.tsx');
const source = fs.readFileSync(sourcePath, 'utf8');
const componentStart = source.indexOf('export default function X01MultiStatsTabFull');
if (componentStart < 0) throw new Error('Composant X01MultiStatsTabFull introuvable.');
const component = source.slice(componentStart);

const failures = [];
if (/React\.useMemo\s*\(/.test(component)) {
  failures.push('Le composant contient encore un React.useMemo : risque React #310 non éliminé.');
}
if (!component.includes('const filtered = memoFilteredX01Sessions(')) {
  failures.push('La mémoïsation pure des sessions filtrées est absente.');
}
if (!component.includes('const x01DartsAll: UIDart[] = memoX01DartsForStats(')) {
  failures.push('La reconstruction pure/mémoïsée des darts est absente.');
}
if (!component.includes('const multiRanks = memoMultiRanks(')) {
  failures.push('La mémoïsation pure des classements multi est absente.');
}
if (!source.includes('buildX01SamplesForProfileFromRecords')) {
  failures.push('La source canonique X01 a été retirée par erreur.');
}
if (!source.includes('History.list()')) {
  failures.push('La lecture canonique History a été retirée par erreur.');
}

const firstCalculation = component.indexOf('// Sessions filtrées');
const hookMatches = [...component.matchAll(/React\.(useState|useEffect|useReducer|useRef|useCallback|useLayoutEffect)\s*(?:<[^;\n]+>)?\s*\(/g)];
for (const match of hookMatches) {
  if (firstCalculation >= 0 && match.index > firstCalculation) {
    failures.push(`Hook React placé après les calculs: ${match[0]}`);
  }
}

if (failures.length) {
  console.error('❌ X01 hooks hardfix V18');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('✅ X01 hooks hardfix V18');
console.log(`Hooks fixes contrôlés: ${hookMatches.length}`);
console.log('React.useMemo dans le composant: 0');
console.log('Source canonique History/X01 conservée.');
