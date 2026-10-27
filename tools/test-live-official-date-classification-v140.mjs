import assert from 'node:assert/strict';

const EN_MONTHS = { jan:0,january:0,feb:1,february:1,mar:2,march:2,apr:3,april:3,may:4,jun:5,june:5,jul:6,july:6,aug:7,august:7,sep:8,sept:8,september:8,oct:9,october:9,nov:10,november:10,dec:11,december:11 };
function dayUtc(year, month, day) { return new Date(Date.UTC(year, month, day, 12, 0, 0)); }
function inferYear(month, explicitYear) {
  if (explicitYear && explicitYear >= 2000) return explicitYear;
  const now = new Date();
  const currentYear = now.getUTCFullYear();
  const currentMonth = now.getUTCMonth();
  if (month + 5 < currentMonth) return currentYear + 1;
  return currentYear;
}
function parseEnglishDateRange(label) {
  const raw = String(label || '').replace(/[–—]/g, '-').trim();
  const m = raw.match(/^(\d{1,2})(?:\s*-\s*(\d{1,2}))?\s+([A-Za-z]+)(?:\s+(?:'?(\d{2})|(20\d{2})))?$/i);
  if (!m) return { start:null,end:null };
  const month = EN_MONTHS[m[3].toLowerCase().replace(/\.$/, '')];
  if (month === undefined) return { start:null,end:null };
  const explicit = m[5] ? Number(m[5]) : m[4] ? 2000 + Number(m[4]) : null;
  const year = inferYear(month, explicit);
  return { start:dayUtc(year, month, Number(m[1])), end:dayUtc(year, month, Number(m[2] || m[1])) };
}
function classifyDates(start, end, now = dayUtc(2026,9,27)) {
  if (!start) return 'info';
  const today = dayUtc(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()).getTime();
  const from = dayUtc(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate()).getTime();
  const untilDate = end || start;
  const until = dayUtc(untilDate.getUTCFullYear(), untilDate.getUTCMonth(), untilDate.getUTCDate()).getTime();
  if (today >= from && today <= until) return 'live';
  if (today < from) return 'upcoming';
  return 'info';
}

for (const [label, expected] of [
  ['23-31 October 2026','live'],
  ['27 Oct','live'],
  ['31 Oct','upcoming'],
  ["14 - 18 Oct '26",'info'],
]) {
  const range = parseEnglishDateRange(label);
  assert.ok(range.start, `date parse failed: ${label}`);
  assert.equal(classifyDates(range.start, range.end), expected, label);
}
console.log('LIVE official date classification: 4/4 OK');
