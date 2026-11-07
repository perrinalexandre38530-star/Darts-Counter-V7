/** V193 — vérification de cohérence des manches restaurées depuis History V4.
 * Ne modifie aucune partie ni aucun format de sauvegarde. */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import { newMorpionGrid, morpionWinner, morpionIsDraw } from '../src/lib/morpionEngine.ts';
import { resolveMorpionFormat } from '../src/lib/morpionMatchFormat.ts';

const require = createRequire(import.meta.url);
const ts = require(process.env.TYPESCRIPT_PATH || 'typescript');
const path = 'src/lib/recoverTop10Morpion.ts';
const source = readFileSync(path, 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  reportDiagnostics: true,
});
assert.equal(compiled.diagnostics?.length ?? 0, 0, 'module compilable');
const exports = {};
runInNewContext(compiled.outputText, {
  exports,
  require: (specifier) => {
    if (specifier === './morpionEngine') return { morpionWinner, morpionIsDraw };
    if (specifier === './morpionMatchFormat') return { resolveMorpionFormat };
    throw Error(`Import inattendu: ${specifier}`);
  },
  Date, Number, String, Math, Object, Array, Set,
});
const { recoverMorpion } = exports;
const players = [
  { id:'a', name:'Alice', isBot:false },
  { id:'b', name:'Bob', isBot:false },
];
const blank = newMorpionGrid(2, () => .41);
const won = structuredClone(blank);
for (const i of [0,1,2]) { won.owners[i] = 0; won.marks[i][0] = 4; }

function state({ format=3, round=1, wins=[1,0], grid=blank, result=null,
    status='in_progress', winnerId=null, config={ rounds: 3 }, visits=[] }={}) {
  const payload = {
    config: { ...config, players }, grid, matchWins:wins, roundIdx:round,
    currentPlayerIndex:0, roundResult:result, visitHistory:visits,
  };
  return {
    id:'morpion-integrity',matchId:'morpion-integrity',kind:'tic_tac_toe',
    status, finishedAt:status==='finished'?101:undefined, winnerId, players,
    game:{ mode:'tic_tac_toe',maxRounds:format },
    resume:{ livePayload:payload },payload,
  };
}
const recover = (opts, preview=false) => recoverMorpion(state(opts), {preview});

// Les cas cohérents restent récupérables, y compris format enregistré et config obsolète.
assert.ok(recover(), 'partie active avec 1 manche gagnée / manche 2');
assert.ok(recover({format:5, round:3, wins:[2,0],config:{rounds:3}}), 'BO5 actif malgré la configuration ancienne');
assert.ok(recover({format:5, round:3, wins:[2,0], grid:won,
  result:{winner:0,draw:false}}), 'BO5 gagnant de manche, mais sans match terminé');
assert.ok(recover({format:3, round:1, wins:[2,0],grid:won,
  result:{winner:0,draw:false},status:'finished',winnerId:'a'}, true), 'BO3 terminé : prévisualisation autorisée');
assert.ok(recover({format:3, round:2, wins:[1,0],grid:won,
  result:{winner:0,draw:false},status:'finished',winnerId:'a'}, true), 'BO3 terminé au dernier tour avec manches nulles');
assert.ok(recover({format:3, round:1, wins:[2,0],grid:won,
  result:{winner:0,draw:false},status:'finished'}, true), 'ancienne partie sans winnerId');

// Ne jamais permettre un match censé être terminé de reprendre comme « en cours ».
assert.equal(recover({round:2,wins:[2,0]}), null, 'BO3 déjà gagné : reprise jouable refusée');
assert.equal(recover({format:5, round:4,wins:[3,0],config:{bestOf:3}}), null, 'BO5 déjà gagné : reprise jouable refusée');
assert.equal(recover({round:2,wins:[1,0],grid:won,result:{winner:0,draw:false}}), null,
  'dernière manche terminée : statut in_progress impossible');

// Ne pas valider des compteurs impossibles ou un mauvais vainqueur enregistré.
assert.equal(recover({round:1,wins:[1,1]}), null, 'deux victoires pour une seule manche achevée');
assert.equal(recover({round:2,wins:[2,1],grid:won,result:{winner:0,draw:false}}), null,
  'trois victoires pour seulement trois manches dont la dernière est déjà terminée et en cours (statut impossible)');
assert.equal(recover({format:5,round:2,wins:[2,2],grid:won,result:{winner:0,draw:false}}), null,
  'quatre victoires alors que seules trois manches ont été jouées');
assert.equal(recover({format:3,round:1,wins:[2,0],grid:won,result:{winner:0,draw:false},status:'finished',winnerId:'b'},true), null,
  'vainqueur enregistré différent de celui des manches');
assert.equal(recover({format:3,round:1,wins:[0,0],grid:won,result:{winner:0,draw:false}}),null,
  'case gagnante sans manche attribuée');
assert.equal(recover({format:3,round:1,wins:[2,0],grid:won,result:{winner:0,draw:false},status:'finished',winnerId:'a'}),null,
  'une partie terminée ne s’ouvre jamais en mode édition');

console.log('OK V193: cohérence manches / résultat / statut / vainqueur, lecture seule, formats anciens');
