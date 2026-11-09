// V182 — Résultats mobile, équipes, journal des volées et écriture History sûre.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createHalveItState, playHalveItVisit } from '../src/lib/gameEngines/halveItEngine.ts';
const root = resolve(import.meta.dirname, '..');
const read = path => readFileSync(resolve(root,path), 'utf8');
const halve = read('src/pages/HalveItPlay.tsx');
const five = read('src/pages/FiveLivesPlay.tsx');
const css = read('src/pages/HalveItPlayResponsive.css');
const targetIds = ['n15','n16','double_any','n17','n18','triple_any','n19','n20','bull'];
const players = [
  { id:'a1',name:'A1' },{ id:'a2',name:'A2' },
  { id:'b1',name:'B1' },{ id:'b2',name:'B2' },
];
const teams = [
  { id:'team-a',name:'Rouges',playerIds:['a1','a2'] },
  { id:'team-b',name:'Bleus',playerIds:['b1','b2'] },
];
let match = createHalveItState(players, {
  participantMode:'teams', sequencePreset:'extended9', customTargets:targetIds,
  startMode:'fixed', fixedStartingScore:40, rounding:'floor',
},teams);
for (const target of match.targets) {
  for (const p of players) {
    const winningDart = target.kind === 'number' ? {bed:'S',number:target.value} :
      target.kind === 'double' ? {bed:'D',number:20} :
      target.kind === 'triple' ? {bed:'T',number:20} : {bed:'IB'};
    const visit = p.id.startsWith('a') ? [winningDart,{bed:'MISS'},{bed:'MISS'}] :
      [{bed:'MISS'},{bed:'MISS'},{bed:'MISS'}];
    match=playHalveItVisit(match,visit);
  }
}
assert.equal(match.finished,true,'SPLIT SCORE terminé après 9 manches');
assert.equal(match.history.length,36,'historique indépendant de chaque membre');
assert.equal(match.standings.length,2,'classement des équipes, pas des individus');
assert.equal(match.standings[0].id,'team-a','victoire équipe A');
assert.equal(match.winnerIds[0],'team-a');
assert.equal(match.standings[0].score,match.scoresByPlayer.a1 + match.scoresByPlayer.a2,'score de l’équipe = somme des membres');
assert.ok(match.statsByPlayer.b1.halvingEvents > 0,'pénalités conservées');
assert.match(halve,/const standings = Array\.isArray\(state\.standings\)/,'classement tiré du moteur');
assert.match(halve,/winnerIds = new Set<string>/,'vainqueurs du moteur plutôt que tri individuel');
assert.match(halve,/teamsMode \? <TeamLogo/,'équipes présentées avec leur logo');
assert.match(halve,/PERFORMANCES PAR JOUEUR/,'stats individuelles séparées des équipes');
assert.match(halve,/DERNIÈRES VOLÉES/,'journal des manches du mode');
assert.match(halve,/\$\{stat\.validHits\}\/\$\{stat\.darts\}/,'dénominateur basé sur le vrai nombre de darts');
assert.doesNotMatch(halve,/minWidth: 790/,'plus de tableau rigide de 790px dans les résultats');
assert.match(css,/msc-halveit-end-actions/,'actions adaptées aux petits écrans');
assert.match(five,/finalMatch\.payload\.visitHistory\.slice\(-8\)/,'huit dernières volées 5 VIES et CHASE');
assert.match(five,/if \(!finalMatch \|\| typeof onFinish !== "function"\)/,'pas de confirmation de sauvegarde sans onFinish');
assert.match(five,/const confirmed = await saveGateRef\.current\.save/,'drapeau confirmé après écriture');
assert.match(five,/Sauvegarde locale échouée/,'message de récupération en cas d’erreur');
console.log('PASS V182 — équipes, scoring 9 manches, stats et journaux, fin de partie responsive, History protégé.');
