import assert from 'node:assert/strict';
import fs from 'node:fs';

const play = fs.readFileSync('src/pages/CradosPlay.tsx','utf8');
const badge = fs.readFileSync('src/lib/cradosBadgeAssets.ts','utf8');

for (const key of ['clean','thief','toxic','sniper']) assert.match(badge, new RegExp(`key: '${key}'`), `badge ${key} absent`);
for (const file of ['clean-master.webp','voleur-supreme.webp','boucher-toxique.webp','sniper-crados.webp']) {
  const path = `public/img/crados-badges/${file}`;
  assert.ok(fs.existsSync(path), `${file} absent`);
  assert.ok(fs.statSync(path).size < 500_000, `${file} trop lourd`);
}
assert.match(play, /const teamRanking = isTeams/, 'historique équipes : classement agrégé absent');
assert.match(play, /const winnerBadge = status === "finished" && winnerSummaryId/, 'badge ne doit être attribué qu’à une partie terminée');
assert.match(play, /winnerBadge: winnerBadgeSummary/, 'badge vainqueur absent du résumé historique');
assert.match(play, /stats: \{[^\n]*winnerBadge: winnerBadgeSummary/, 'badge vainqueur absent du payload stats');
assert.match(play, /Score CRASSE et zones partagés par équipe/, 'le texte UI doit refléter les zones réellement partagées');

console.log('✅ CRADOS HISTORY/BADGES V2 OK');
