import fs from 'node:fs';
function read(file) { return fs.readFileSync(file, 'utf8'); }
function assert(cond, msg) { if (!cond) throw new Error(msg); }
const engine = read('src/lib/gameEngines/wave61Engine.ts');
const play = read('src/pages/Wave61Play.tsx');
const panels = read('src/pages/wave61/Wave61PartyArcadePanels.tsx');
const families = read('src/games/dartsWave61Families.ts');
assert(engine.includes('WAVE61_ENGINE_VERSION = 9'), 'Wave61 V9 absent');
for (const fn of ['processFinalBuzzer','processJackpot','processMafia','resolveMafiaDay','wave61MafiaPhase','wave61FinalBuzzerChallenge','wave61JackpotSymbol']) assert(engine.includes(fn), `${fn} absent`);
for (const stateKey of ['finalBuzzerCutoffs','jackpotPot','jackpotLastSpinByPlayer','mafiaRoleByPlayer','mafiaVotesByPlayer','mafiaIntel']) assert(engine.includes(stateKey), `${stateKey} absent`);
assert(/final_buzzer:\s*"rhythm"/.test(families), 'FINAL BUZZER doit rester rhythm');
assert(/jackpot:\s*"score"/.test(families), 'JACKPOT doit rester score');
assert(/mafia:\s*"deduction"/.test(families), 'MAFIA doit rester deduction');
for (const panel of ['FinalBuzzerPanel','JackpotPanel','MafiaPanel']) { assert(panels.includes(`export function ${panel}`), `${panel} absent`); assert(play.includes(`<${panel}`), `${panel} non rendu`); }
assert(play.includes('passe V9'), 'Texte V9 absent');
console.log('✅ Wave61 V9 — Party / Arcade / Rôles cachés');
console.log('✅ FINAL BUZZER / JACKPOT / MAFIA spécialisés');
