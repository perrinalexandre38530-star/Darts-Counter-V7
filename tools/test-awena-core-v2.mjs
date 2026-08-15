import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const assert = (cond, msg) => { if (!cond) throw new Error(msg); };

const app = read('src/App.tsx');
const core = read('src/awena/AwenaCore.ts');
const knowledge = read('src/awena/AwenaKnowledge.ts');
const provider = read('src/awena/AwenaProvider.tsx');
const overlay = read('src/awena/components/AwenaOverlay.tsx');
const bridge = read('src/awena/AwenaContextBridge.ts');
const x01 = read('src/pages/X01PlayV3.tsx');

assert(app.includes('go={go}'), 'AwenaOverlay ne reçoit pas la navigation App');
assert(core.includes('buildAwenaReply'), 'Réponses structurées Awena V2 absentes');
assert(core.includes('getAdaptiveCheckoutSuggestionV3'), 'Conseil checkout X01 absent');
assert(core.includes('comment faire pour y jouer'), 'Compréhension navigation in-app absente');
assert(knowledge.includes('howToPlayInApp'), 'Guides de lancement in-app absents');
assert(knowledge.includes('configRoute: "x01_config_v3"'), 'Route directe X01 absente');
assert(provider.includes('AWENA_CONTEXT_EVENT'), 'Provider non connecté au contexte live');
assert(provider.includes('mode: reply.modeId'), 'Mémoire de mode conversationnelle absente');
assert(overlay.includes('LOCAL V2'), 'UI Awena V2 absente');
assert(overlay.includes('runAction'), 'Actions interactives Awena absentes');
assert(bridge.includes('dc:awena-context'), 'Pont de contexte Awena absent');
assert(x01.includes('AWENA CONTEXT V2'), 'X01 ne publie pas son contexte vers Awena');
assert(x01.includes('remaining: Number(currentScore)'), 'Score X01 live non exposé');

console.log('AWENA CORE V2 integration: OK');
