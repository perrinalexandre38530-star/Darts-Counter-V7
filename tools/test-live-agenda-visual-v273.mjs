// Run with: node --experimental-strip-types tools/test-live-agenda-visual-v273.mjs
import assert from 'node:assert/strict';
import { agendaVisualFromFixture, agendaVisualFromEvent, agendaCountryFlag, safeAgendaImageUrl } from '../src/pages/agenda/liveAgendaVisual.ts';

const national = agendaVisualFromFixture('foot', {
  id: 'nations-1', competition: 'UEFA Nations League', round: 'Journée 5',
  competitionMeta: { family: 'national_teams', logoUrl: 'https://images.example.com/nations.png' },
  players: [{ name: 'Turkey' }, { name: 'Belgium' }],
  raw: { strTVStation: 'beIN Sports 2', strTVStationThumb: 'https://images.example.com/bein.png' },
});
assert.equal(national.participants[0].countryCode, 'TR');
assert.equal(national.participants[1].countryCode, 'BE');
assert.equal(agendaCountryFlag('BE'), '🇧🇪');
assert.equal(national.broadcast.name, 'beIN Sports 2');
assert.equal(national.competitionLogoUrl, 'https://images.example.com/nations.png');
assert.equal(national.round, 'Journée 5');

const club = agendaVisualFromFixture('foot', {
  id: 'br-1', competition: 'Brazilian Serie B', players: [{ name: 'Londrina' }, { name: 'Náutico' }],
  raw: { strHomeTeamBadge: 'https://images.example.com/londrina.png', strAwayTeamBadge: 'https://images.example.com/nautico.png' },
});
assert.equal(club.participants[0].logoUrl, 'https://images.example.com/londrina.png');
assert.equal(club.participants[1].logoUrl, 'https://images.example.com/nautico.png');
assert.equal(club.participants[0].countryCode, undefined, 'club badge must not become a national flag');
assert.equal(club.broadcast, undefined, 'source without broadcaster must not get imaginary TV channel');

const tt = agendaVisualFromFixture('pingpong', { id: 'tt-1', competition: 'Table Tennis Tour', players: [{ name: 'Player A', photoUrl: 'https://images.example.com/a.png' }, { name: 'Player B' }], raw: {} });
assert.equal(tt.participants[0].logoUrl, 'https://images.example.com/a.png');
assert.equal(tt.participants[1].logoUrl, undefined);
const fixtureWithCrest = agendaVisualFromFixture('foot', { id:'f',competition:'Premier League', players:[{name:'Team A',logoUrl:'https://cdn.example.com/a.png'}, {name:'Team B'}],raw:{} });
assert.equal(fixtureWithCrest.participants[0].logoUrl,'https://cdn.example.com/a.png');

const tournament = agendaVisualFromEvent({id:'m',title:'Open du MAMBO',subtitle:'Mölkky World',status:'upcoming', competitionMeta:{countryCode:'FR'}});
assert.equal(tournament.countryCode, 'FR');
assert.deepEqual(tournament.participants, []);
for (const bad of ['javascript:alert(1)', 'http://example.com/no.png', 'https://127.0.0.1/x.png', 'https://localhost/x.png', '//example.com/a.png']) {
  assert.equal(safeAgendaImageUrl(bad), undefined, `reject ${bad}`);
}
console.log('LIVE Agenda V273: 15 checks passed');
