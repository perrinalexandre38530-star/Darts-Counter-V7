import assert from "node:assert/strict";
import { createCradosState, playCradosVisit, cradosSideIdForPlayer, cradosSideIds, isCradosTeamMode } from "../lib/gameEngines/cradosEngine.ts";

let seed = 0xC0A005;
function rnd() { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; }
function pick<T>(xs:T[]):T { return xs[Math.floor(rnd()*xs.length)]!; }
function dart(): any {
  const r=rnd();
  if (r<.12) return {bed:"MISS"};
  if (r<.17) return {bed:"OB"};
  if (r<.20) return {bed:"IB"};
  return {bed:pick(["S","D","T"]), number:1+Math.floor(rnd()*20)};
}
function visit(){ return Array.from({length:1+Math.floor(rnd()*3)},dart); }

const soloPlayers = Array.from({length:6},(_,i)=>({id:`p${i+1}`,name:`P${i+1}`}));
const teamPlayers = [
  {id:"a1",name:"A1"},{id:"b1",name:"B1"},{id:"c1",name:"C1"},
  {id:"a2",name:"A2"},{id:"b2",name:"B2"},{id:"c2",name:"C2"},
];

function assertState(s:any){
  const sideIds=cradosSideIds(s);
  const validSides=new Set(sideIds.map(String));
  assert.ok(s.activePlayerIndex>=0 && s.activePlayerIndex<s.players.length, "active index hors bornes");
  for(const id of sideIds){
    assert.ok(Number.isFinite(Number(s.dirt[id])), `dirt NaN ${id}`);
    assert.ok(Number(s.dirt[id])>=0 && Number(s.dirt[id])<=Number(s.config.rules.dirtLimit), `dirt hors bornes ${id}`);
    assert.ok(Number(s.legWins[id]||0)>=0, `legWins négatif ${id}`);
  }
  for(let n=1;n<=20;n++){
    const sec=s.sectors[n];
    assert.ok(sec,`secteur ${n} absent`);
    if(sec.ownerId) assert.ok(validSides.has(String(sec.ownerId)),`owner invalide ${sec.ownerId}`);
    if(sec.claimantId) assert.ok(validSides.has(String(sec.claimantId)),`claimant invalide ${sec.claimantId}`);
    assert.ok(Number(sec.layers||0)>=0,`layers négatives n°${n}`);
    if(sec.ownerId) assert.ok(Number(sec.layers||0)<=Number(s.config.rules.layersToOwn),`layers owner > max n°${n}`);
  }
  for(const v of s.visits){ assert.ok(Array.isArray(v.darts)&&v.darts.length<=3,"visit >3 darts"); }
  if(s.phase==="finished"){
    assert.ok(s.winnerId && validSides.has(String(s.winnerId)),"winner invalide");
    assert.ok(Number(s.legWins[s.winnerId]||0)>=Number(s.config.seriesWins),"winner sans série atteinte");
  } else {
    const active=s.players[s.activePlayerIndex];
    assert.ok(active,"active player absent");
    const side=cradosSideIdForPlayer(s,active.id);
    assert.equal(Boolean(s.eliminated[side]),false,"un camp éliminé ne doit pas rejouer");
    if(s.config.rules.endOnFirstMaxDirt) assert.equal(Object.values(s.eliminated).some(Boolean),false,"premier max ON ne doit pas laisser une élimination active entre deux tours");
  }
}

for(let match=0;match<180;match++){
  const teams=match%3===0;
  const cfg:any={
    mode:"crados",
    selectedIds:(teams?teamPlayers:soloPlayers.slice(0,2+(match%5))).map(p=>p.id),
    seriesWins:pick([1,2,3]),
    participantMode:teams?"teams":"players",
    gameMode:teams?"teams":"players",
    teams:teams?[
      {id:"ta",name:"Alpha",playerIds:["a1","a2"]},
      {id:"tb",name:"Beta",playerIds:["b1","b2"]},
      {id:"tc",name:"Gamma",playerIds:["c1","c2"]},
    ]:undefined,
    rules:{
      dirtLimit:pick([10,15,20]),
      layersToOwn:pick([2,3,4]),
      bullWash:rnd()>.25,
      stealMode:pick(["block","flip"]),
      sectorRaceMode:pick(["claim","race"]),
      cleanBullSplash:rnd()>.65,
      endOnFirstMaxDirt:rnd()>.30,
    },
  };
  let s=createCradosState((teams?teamPlayers:soloPlayers.slice(0,2+(match%5))) as any,cfg);
  assert.equal(isCradosTeamMode(s),teams);
  for(let i=0;i<260 && s.phase!=="finished";i++){
    s=playCradosVisit(s,visit());
    assertState(s);
  }
  assertState(s);
  // La simulation aléatoire n'est pas obligée de finir dans une fenêtre fixe (Bull/Douche peuvent prolonger la partie).
  // On force ensuite des MISS létaux pour vérifier qu'aucun état valide ne peut se retrouver bloqué.
  for(let guard=0;guard<80 && s.phase!=="finished";guard++){
    const active=s.players[s.activePlayerIndex];
    const activeSide=cradosSideIdForPlayer(s,active.id);
    s.dirt[activeSide]=Math.max(0,Number(s.config.rules.dirtLimit)-1);
    s=playCradosVisit(s,[{bed:"MISS"}] as any);
    assertState(s);
  }
  assert.equal(s.phase,"finished",`match ${match} bloqué même après éliminations forcées`);
}

console.log("✅ CRADOS FUZZ V3 OK — 180 matchs / variantes stressées");
