import assert from 'node:assert/strict';
import { footballCompetitionCode, projectFootballStandings } from '../src/sportsLive/officialStandings.ts';
assert.equal(footballCompetitionCode('Ligue 1', 'France'), 'FL1');
assert.equal(footballCompetitionCode('Premier League', 'England'), 'PL');
assert.equal(footballCompetitionCode('Premier League', 'South Africa'), null, 'No country cross-contamination');
assert.equal(footballCompetitionCode('Premier League', ''), null, 'Ambiguous league requires a country');
assert.equal(footballCompetitionCode('UEFA Champions League', 'Europe'), 'CL');
assert.equal(footballCompetitionCode('Champions League', 'Asia'), null);
assert.equal(footballCompetitionCode('Fake Premier League', 'England'), null);
const provider = {
 competition:{name:'Ligue 1'}, season:{startDate:'2025-08-01'},
 standings:[
  {type:'HOME',stage:'REGULAR_SEASON',table:[{position:1,team:{name:'Wrong HOME'},points:99}]},
  {type:'TOTAL',stage:'REGULAR_SEASON',table:[
   {position:2,team:{name:'Team B'},playedGames:10,won:5,draw:3,lost:2,points:18,goalsFor:17,goalsAgainst:12,goalDifference:5},
   {position:1,team:{name:'Team A'},playedGames:10,won:7,draw:1,lost:2,points:22,goalsFor:20,goalsAgainst:8,goalDifference:12},
  ]},
 ]
};
const standings = projectFootballStandings(provider,'Ligue 1');
assert.equal(standings.available,true);
assert.equal(standings.season,'2025');
assert.equal(standings.tables.length,1,'Only TOTAL table');
assert.equal(standings.tables[0].rows[0].name,'Team A','Official position kept');
assert.equal(standings.tables[0].rows[0].points,22,'Provider points preserved');
assert.equal(projectFootballStandings({standings:[]},'Ligue 1').available,false);
console.log('LIVE V269: verified competition mapping, provider tables and fallback');
