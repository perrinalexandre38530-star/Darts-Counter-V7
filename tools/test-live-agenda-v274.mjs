// Run with: node --experimental-strip-types tools/test-live-agenda-v274.mjs
import assert from 'node:assert/strict';
import { findAgendaConflictIds, parseLiveAgendaStart } from '../src/pages/agenda/liveAgendaSchedule.ts';

const dayOnly = parseLiveAgendaStart('2026-11-14');
assert.ok(dayOnly);
assert.equal(dayOnly.timeConfirmed, false);
assert.equal(new Date(dayOnly.startAt).getDate(), 14);
assert.equal(new Date(dayOnly.startAt).getHours(), 12);
assert.equal(parseLiveAgendaStart('2026-02-30'), null);
assert.equal(parseLiveAgendaStart('2026-11-14T17:30:00Z')?.timeConfirmed, true);
assert.equal(parseLiveAgendaStart('garbage'), null);
const now = Date.parse('2026-11-14T14:00:00Z');
const rows = [
  { id: 'foot-1', startAt: now, durationMin: 120, readonly: true, source: 'live', status: 'planned' },
  { id: 'foot-2', startAt: now, durationMin: 120, readonly: true, source: 'live', status: 'planned' },
  { id: 'person-1', startAt: now, durationMin: 60, source: 'manual', status: 'planned' },
];
assert.equal(findAgendaConflictIds(rows).size, 0, 'two simultaneous broadcasts do not conflict with bookings');
const overlap = findAgendaConflictIds([...rows, { id: 'person-2', startAt: now + 30 * 60_000, durationMin: 60, source: 'manual', status: 'planned' }]);
assert.deepEqual([...overlap].sort(), ['person-1', 'person-2']);
assert.equal(findAgendaConflictIds([...rows, { id:'cancelled', startAt:now, source:'manual', status:'cancelled' }]).size, 0);
assert.equal(findAgendaConflictIds([...rows, { id:'next', startAt:now+60*60_000, durationMin:60, source:'manual', status:'planned' }]).size, 0);
console.log('LIVE Agenda V274 scheduling tests passed');
