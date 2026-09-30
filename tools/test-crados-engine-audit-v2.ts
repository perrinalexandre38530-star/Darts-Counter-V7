import assert from "node:assert/strict";
import {
  cloneCradosState,
  createCradosState,
  cradosSideIdForPlayer,
  isCradosTeamMode,
  normalizeCradosConfig,
  pickCradosBotDarts,
  playCradosVisit,
} from "../lib/gameEngines/cradosEngine.ts";

const p2 = [{ id: "a", name: "A" }, { id: "b", name: "B" }];
const base = {
  mode: "crados",
  selectedIds: ["a", "b"],
  seriesWins: 1,
  rules: {
    dirtLimit: 10,
    layersToOwn: 3,
    bullWash: true,
    stealMode: "block",
    sectorRaceMode: "claim",
    cleanBullSplash: false,
    endOnFirstMaxDirt: true,
  },
};

// Normalisation / options par défaut.
const normalized = normalizeCradosConfig({ mode: "crados", selectedIds: ["a", "b"], rules: {} });
assert.equal(normalized.rules.dirtLimit, 10);
assert.equal(normalized.rules.layersToOwn, 3);
assert.equal(normalized.rules.bullWash, true);
assert.equal(normalized.rules.endOnFirstMaxDirt, true);
assert.equal(normalized.sfxEnabled, true);
assert.equal(normalized.awenaEnabled, true);
assert.equal(normalized.coachEnabled, true);

// Contamination classique : S=1, D=2, T=3.
let s = createCradosState(p2 as any, base);
s = playCradosVisit(s, [{ bed: "S", number: 20 }] as any);
assert.equal(s.sectors[20].layers, 1);
s = playCradosVisit(s, [{ bed: "S", number: 1 }] as any); // B joue ailleurs.
s = playCradosVisit(s, [{ bed: "D", number: 20 }] as any);
assert.equal(s.sectors[20].ownerId, "a");
assert.equal(s.statsByPlayer.a.sectorsClaimed, 1);

// BLOCAGE : toucher la zone adverse ajoute la puissance de la touche.
let block = createCradosState(p2 as any, { ...base, rules: { ...base.rules, layersToOwn: 2, bullWash: false } });
block = playCradosVisit(block, [{ bed: "D", number: 20 }] as any); // A possède 20.
block = playCradosVisit(block, [{ bed: "T", number: 20 }] as any); // B prend +3.
assert.equal(block.dirt.b, 3);
assert.equal(block.sectors[20].ownerId, "a");
assert.equal(block.statsByPlayer.b.opponentSectorHits, 1);

// DOUBLE douche -2 conserve l'effet de secteur, et sur zone adverse le bilan peut s'annuler en BLOCAGE.
let shower = createCradosState(p2 as any, { ...base, rules: { ...base.rules, layersToOwn: 2 } });
shower.dirt.a = 5;
shower = playCradosVisit(shower, [{ bed: "D", number: 18 }] as any);
assert.equal(shower.dirt.a, 3);
assert.equal(shower.sectors[18].ownerId, "a");
// B possède 17, puis A touche D17 avec 5 crasses : -2 douche puis +2 adverse => reste à 5.
shower = playCradosVisit(shower, [{ bed: "D", number: 17 }] as any); // B possède 17.
shower.dirt.a = 5;
shower = playCradosVisit(shower, [{ bed: "D", number: 17 }] as any);
assert.equal(shower.dirt.a, 5);
assert.ok(shower.visits.at(-1)?.events.some((e: string) => /DOUBLE DOUCHE/.test(e)));
assert.ok(shower.visits.at(-1)?.events.some((e: string) => /adverse/.test(e)));

// VOL : attaque des couches + seulement +1 crasse par contact adverse.
let flip = createCradosState(p2 as any, { ...base, rules: { ...base.rules, layersToOwn: 2, bullWash: false, stealMode: "flip" } });
flip = playCradosVisit(flip, [{ bed: "D", number: 20 }] as any); // A possède.
flip = playCradosVisit(flip, [{ bed: "T", number: 20 }] as any); // B vole directement (2-3 <=0), +1.
assert.equal(flip.dirt.b, 1);
assert.equal(flip.sectors[20].ownerId, "b");
assert.equal(flip.statsByPlayer.b.sectorsStolen, 1);

// MISS +2, Bull -1, DBull -3.
let wash = createCradosState(p2 as any, { ...base, seriesWins: 2 });
wash = playCradosVisit(wash, [{ bed: "MISS" }] as any);
assert.equal(wash.dirt.a, 2);
wash = playCradosVisit(wash, [{ bed: "S", number: 1 }] as any);
wash = playCradosVisit(wash, [{ bed: "OB" }] as any);
assert.equal(wash.dirt.a, 1);
wash = playCradosVisit(wash, [{ bed: "S", number: 2 }] as any);
wash.dirt.a = 5;
wash = playCradosVisit(wash, [{ bed: "IB" }] as any);
assert.equal(wash.dirt.a, 2);

// Bull propre contagieux : touche tous les adversaires, et arrêt immédiat si une jauge atteint le max.
const p3 = [{ id: "a", name: "A" }, { id: "b", name: "B" }, { id: "c", name: "C" }];
let splash = createCradosState(p3 as any, { ...base, selectedIds: ["a", "b", "c"], seriesWins: 1, rules: { ...base.rules, cleanBullSplash: true } });
splash.dirt.b = 9;
splash.dirt.c = 1;
splash = playCradosVisit(splash, [{ bed: "OB" }, { bed: "T", number: 20 }, { bed: "T", number: 19 }] as any);
assert.equal(splash.phase, "finished", "La première jauge pleine doit stopper la manche immédiatement");
assert.equal(splash.eliminated.b, true);
assert.equal(splash.statsByPlayer.a.darts, 1, "Les darts après l'élimination ne doivent pas compter");
assert.equal(splash.visits.at(-1)?.darts.length, 1, "L'historique ne doit conserver que les darts réellement jouées");
assert.equal(splash.sectors[20].ownerId, null, "Aucune action après le dart létal ne doit être appliquée");


// COURSE : si la conquête transforme les touches adverses en crasse létale, la volée s'arrête immédiatement.
let race = createCradosState(p3 as any, { ...base, selectedIds: ["a", "b", "c"], seriesWins: 1, rules: { ...base.rules, layersToOwn: 3, sectorRaceMode: "race" } });
race = playCradosVisit(race, [{ bed: "S", number: 20 }] as any); // A pression 1
race = playCradosVisit(race, [{ bed: "D", number: 20 }] as any); // B pression 2
race = playCradosVisit(race, [{ bed: "S", number: 1 }] as any);  // C ailleurs
race.dirt.b = 8;
race = playCradosVisit(race, [{ bed: "D", number: 20 }, { bed: "T", number: 19 }] as any); // A gagne 20, B prend +2 => max
assert.equal(race.phase, "finished");
assert.equal(race.eliminated.b, true);
assert.equal(race.statsByPlayer.a.darts, 2);
assert.equal(race.visits.at(-1)?.darts.length, 1);
assert.equal(race.sectors[19].ownerId, null);

// Même protection si le tireur lui-même atteint la limite au premier MISS.
let lethal = createCradosState(p2 as any, { ...base, seriesWins: 1 });
lethal.dirt.a = 9;
lethal = playCradosVisit(lethal, [{ bed: "MISS" }, { bed: "T", number: 20 }, { bed: "T", number: 19 }] as any);
assert.equal(lethal.phase, "finished");
assert.equal(lethal.winnerId, "b");
assert.equal(lethal.statsByPlayer.a.darts, 1);
assert.equal(lethal.visits.at(-1)?.darts.length, 1);

// BO3 : une élimination remporte la manche puis remet jauges/zones à zéro sans perdre les manches gagnées.
let bo3 = createCradosState(p2 as any, { ...base, seriesWins: 2 });
bo3.dirt.a = 9;
bo3 = playCradosVisit(bo3, [{ bed: "MISS" }] as any);
assert.equal(bo3.phase, "playing");
assert.equal(bo3.legIndex, 1);
assert.equal(bo3.legWins.b, 1);
assert.equal(bo3.dirt.a, 0);
assert.equal(bo3.dirt.b, 0);
assert.equal(bo3.eliminated.a, false);
assert.equal(bo3.sectors[20].ownerId, null);

// Si "première jauge pleine" est désactivé, on continue jusqu'au dernier camp vivant.
let survival = createCradosState(p3 as any, { ...base, selectedIds: ["a", "b", "c"], seriesWins: 1, rules: { ...base.rules, endOnFirstMaxDirt: false } });
survival.dirt.a = 9;
survival = playCradosVisit(survival, [{ bed: "MISS" }] as any); // A OUT, mais partie continue B/C.
assert.equal(survival.phase, "playing");
assert.equal(survival.eliminated.a, true);
assert.ok(["b", "c"].includes(survival.players[survival.activePlayerIndex]?.id));

// Équipes : crasse/zone partagées, vraie alternance des équipes, partenaire non adverse.
const tp = [{ id: "a1", name: "A1" }, { id: "b1", name: "B1" }, { id: "a2", name: "A2" }, { id: "b2", name: "B2" }];
const teamCfg = {
  ...base,
  selectedIds: tp.map(p => p.id),
  participantMode: "teams",
  gameMode: "teams",
  teams: [
    { id: "ta", name: "Alpha", playerIds: ["a1", "a2"] },
    { id: "tb", name: "Beta", playerIds: ["b1", "b2"] },
  ],
  rules: { ...base.rules, layersToOwn: 2 },
};
let teams = createCradosState(tp as any, teamCfg);
assert.equal(isCradosTeamMode(teams), true);
assert.equal(cradosSideIdForPlayer(teams, "a1"), "ta");
assert.equal(cradosSideIdForPlayer(teams, "a2"), "ta");
assert.equal(teams.players[teams.activePlayerIndex].id, "a1");
teams = playCradosVisit(teams, [{ bed: "D", number: 20 }] as any); // Alpha possède.
assert.equal(teams.sectors[20].ownerId, "ta");
assert.equal(teams.players[teams.activePlayerIndex].id, "b1");
teams = playCradosVisit(teams, [{ bed: "MISS" }] as any);
assert.equal(teams.dirt.tb, 2);
assert.equal(teams.players[teams.activePlayerIndex].id, "a2");
teams = playCradosVisit(teams, [{ bed: "S", number: 20 }] as any); // partenaire sur zone Alpha => aucun handicap.
assert.equal(teams.dirt.ta, 0);
assert.equal(teams.players[teams.activePlayerIndex].id, "b2");

// Clone/reprise : snapshot indépendant.
const cloned = cloneCradosState(teams);
cloned.dirt.ta = 9;
assert.equal(teams.dirt.ta, 0);

// Bots : toujours 3 darts valides maximum, sans crash sur différents niveaux.
for (const level of [1, 20, 50, 80, 100, "easy", "normal", "hard"] as any[]) {
  const botState = createCradosState(p2 as any, base);
  const darts = pickCradosBotDarts(botState, level);
  assert.equal(darts.length, 3);
  for (const dart of darts as any[]) assert.ok(["S", "D", "T", "OB", "IB", "MISS"].includes(String(dart.bed)), `bed bot invalide: ${dart.bed}`);
}

console.log("✅ CRADOS ENGINE AUDIT V2 OK");
