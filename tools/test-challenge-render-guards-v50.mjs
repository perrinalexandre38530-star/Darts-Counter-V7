import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const file = path.join(root, 'src/pages/ChallengePlay.tsx');
const source = fs.readFileSync(file, 'utf8');

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

assert(/const\s+targetBoards\s*:\s*Record<string,string>\s*=/.test(source), 'ChallengePlay: targetBoards doit être déclaré');
assert(/const\s+isBullMode\s*=/.test(source), 'ChallengePlay: isBullMode doit être déclaré');
assert(/const\s+ruleLabel\s*=/.test(source), 'ChallengePlay: ruleLabel doit être déclaré');

for (let n = 1; n <= 20; n += 1) {
  assert(new RegExp(`['"]${n}['"]\\s*:\\s*target${n}(?=[,}])`).test(source), `ChallengePlay: image cible ${n} absente de targetBoards`);
}
for (const [key, symbol] of [
  ['any-double', 'targetAnyDouble'],
  ['any-triple', 'targetAnyTriple'],
  ['bull', 'targetBull50'],
  ['bull25', 'targetBull25'],
  ['bull50', 'targetBull50'],
]) {
  assert(new RegExp(`${key.includes('-') ? `'${key}'` : key}\\s*:\\s*${symbol}(?=[,}])`).test(source), `ChallengePlay: mapping ${key} absent`);
}

assert(source.includes('targetBoards[currentBoardKey]||target20'), 'ChallengePlay: le rendu doit résoudre la cible dynamique avec fallback target20');

console.log('✅ CHALLENGE RENDER GUARDS V50 — targetBoards, bull mode, rule labels et mappings visuels OK');
