import fs from 'node:fs';

const read = (p) => fs.readFileSync(p, 'utf8');
const play = read('src/pages/CradosPlay.tsx');
const css = read('src/pages/CradosPlay.css');
const shared = read('src/pages/newModes/newModePlayShared.tsx');
const hub = read('src/components/ScoreInputHub.tsx');
const knowledge = read('src/awena/AwenaKnowledge.ts');
const detailed = read('src/awena/AwenaDetailedKnowledge.ts');
const config = read('src/awena/AwenaConfigKnowledge.ts');
const routes = read('src/awena/AwenaRouteAtlas.ts');

function ok(cond, msg) { if (!cond) throw new Error(msg); }

ok(play.includes('function CradosDirtMeter'), 'frise de crasse absente');
ok(play.includes('function StatsTrendIcon'), 'icône graphique stats absente');
ok(play.includes('function LandscapeStatsStrip'), 'bloc 4 KPI paysage absent');
ok(play.includes('validateLabel="VALIDER"'), 'keypad doit afficher VALIDER');
ok(play.includes('fitMinScale={0.30}'), 'auto-fit CRADOS paysage trop haut');
ok(play.includes('onCancel={handleKeypadCancel}'), 'ANNULER keypad non câblé à l’undo');
ok(!play.includes('InfoDot'), 'InfoDot doit être retiré du joueur actif');
ok(!play.includes('VALIDER LA VOLÉE'), 'ancien libellé validation encore présent');
ok(!play.includes('OUVRIR ▸'), 'ancien libellé OUVRIR encore présent');
ok(!play.includes('Les premières contaminations apparaîtront ici.'), 'message stats vide encore présent');
ok(play.includes('crados-stats-panel__grid'), 'grille stats complète absente');
ok(play.includes('dirtPercent'), 'contexte Awena: pourcentage de crasse absent');
ok(css.includes('grid-template-columns:repeat(3,minmax(0,1fr))'), 'stats flottantes non équilibrées en 3 colonnes');
ok(css.includes('.crados-landscape-stats { width:100%; height:52px'), 'KPI paysage sous liste joueurs absent');
ok(css.includes('background-image') || play.includes('backgroundImage: `url(${tickerCrados})`'), 'texture CRADOS de jauge absente');
ok(shared.includes('fitMinScale=0.42') && shared.includes('onCancel'), 'NewModeInput ne propage pas auto-fit/annulation');
ok(hub.includes('fitMinScale = 0.42'), 'ScoreInputHub ne lit pas fitMinScale');
ok(hub.includes('height: "100%", minHeight: 0, display: "flex"'), 'racine ScoreInputHub non contrainte en hauteur');
ok(knowledge.includes('crados: ["crados"'), 'alias Awena CRADOS absent');
ok(detailed.includes('MODE BLOCAGE') && detailed.includes('MODE VOL') && detailed.includes('BULL DOUCHE'), 'règles expertes Awena CRADOS incomplètes');
ok(config.includes('jauge de crasse maximale : 10, 15 ou 20'), 'configuration Awena CRADOS incomplète');
ok(routes.includes('id: "crados_play"') && routes.includes('id: "crados_config"'), 'routes Awena CRADOS absentes');

console.log('✅ CRADOS V84 UI/Awena regression OK: radar compact, frise crasse, keypad auto-fit, stats équilibrées, Awena enrichie.');
