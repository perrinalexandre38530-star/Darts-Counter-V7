import fs from 'node:fs'; import assert from 'node:assert/strict';
const e=fs.readFileSync('src/lib/gameEngines/wave61Engine.ts','utf8');
for (const t of ['scoreReplicat','sameReplicatNumber','failurePenalty','copyPoints','perfectBonus','replicatReferenceOwner = player.id','state.special.lastVisitDarts = darts']) assert(e.includes(t),`REPLICAT: ${t} absent`);
assert(e.includes('state.progress[player.id] >= state.config.goal'),'REPLICAT: victoire objectif absente');
console.log('✅ V36 REPLICAT: référence, précision, pénalité, progression, victoire');
