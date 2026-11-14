import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

const read = file => readFileSync(new URL('../'+file, import.meta.url), 'utf8');
for (const file of ['src/pages/CapitalPlay.tsx','src/App.tsx']) {
  const source = read(file);
  const result = ts.transpileModule(source, {
    fileName:file, reportDiagnostics:true,
    compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX},
  });
  const errors=result.diagnostics?.filter(d => d.category===ts.DiagnosticCategory.Error) || [];
  assert.deepEqual(errors.map(e=>ts.flattenDiagnosticMessageText(e.messageText,' ')),[],`Syntaxe ${file}`);
}
const play=read('src/pages/CapitalPlay.tsx');
const app=read('src/App.tsx');
const queueCode=ts.transpileModule(read('src/lib/capitalHistoryQueue.ts'), {
  fileName:'src/lib/capitalHistoryQueue.ts', compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022},
}).outputText;
const {createCapitalHistoryWriteQueue}=await import('data:text/javascript;charset=utf-8,'+encodeURIComponent(queueCode));

assert.match(play, /commitFinishedCapitalRecord\(record\);/, 'Final uses one persistence path');
assert.match(play, /applyOrganizationPlayContext\(record\);/, 'Organization context goes into the authoritative saved record');
assert.match(play, /setHistorySaveStatus\("error"\)/, 'Failed save is visible');
assert.match(play, /RÉESSAYER LA SAUVEGARDE/, 'Player can retry after an error');
assert.match(play, /setHistorySaveStatus\("saved"\);\s*try \{ props\?\.onFinish\?\.\(record\); \}/, 'Finish notification only after commit');
const capitalRoute=app.match(/case "capital_play":([\s\S]*?)\bbreak;/)?.[1] || '';
assert.ok(capitalRoute, 'Capital route found');
assert.doesNotMatch(capitalRoute, /pushHistory\(/, 'App must not enqueue a duplicate final write');
assert.match(capitalRoute, /markCompletedMatchForAds\(String\(m.id\), "capital"\)/, 'Ad counter preserved after commit');
assert.match(capitalRoute, /scheduleStorePersist\(next\)/, 'App mirror refreshed after commit');

// Production FIFO queue: checkpoint precedes final commit, even when a
// previous checkpoint failed; notification is only fired after persistence.
const events=[];
let failFinal=true;
const persist = async record => {
  events.push(`begin:${record.status}`);
  await Promise.resolve();
  if (record.status==='finished' && failFinal) {
    events.push('failed:finished');
    throw Error('QuotaExceededError: IndexedDB quota');
  }
  events.push(`committed:${record.status}`);
};
const enqueue=createCapitalHistoryWriteQueue(persist,()=>{});
const progress=enqueue({status:'in_progress'});
const record={status:'finished',id:'capital-test-v165'};
let notified=0;
const first=enqueue(record).then(()=>{notified++}).catch(()=>{});
assert.equal(notified,0, 'No premature confirmation');
await Promise.all([progress,first]);
assert.equal(notified,0, 'Error cannot be marked as saved');
assert.deepEqual(events,['begin:in_progress','committed:in_progress','begin:finished','failed:finished']);
failFinal=false;
await enqueue(record).then(()=>{notified++});
assert.equal(notified,1,'Retry produces exactly one confirmed event');
assert.equal(events.filter(e=>e==='committed:finished').length,1,'One successful final commit');
console.log('CAPITAL V165 OK — no concurrent double-upsert, final saved before App notification, retry on failure, org context, ads, JSX syntax.');
