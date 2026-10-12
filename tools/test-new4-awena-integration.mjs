import fs from "node:fs";

const read = (p) => fs.readFileSync(p, "utf8");
const knowledge = read("src/awena/AwenaKnowledge.ts");
const config = read("src/awena/AwenaConfigKnowledge.ts");
const detail = read("src/awena/AwenaDetailedKnowledge.ts");
const records = read("src/awena/AwenaRecords.ts");

function assert(ok, message) { if (!ok) throw new Error(message); }

const modes = ["fifty_one_by_five", "looper", "call_three", "steeplechase"];
for (const id of modes) {
  assert(knowledge.includes(`${id}: [`), `Knowledge aliases missing: ${id}`);
  assert(knowledge.includes(`${id}: {`), `Knowledge expert override missing: ${id}`);
  assert(config.includes(`${id}: {`), `Configuration knowledge missing: ${id}`);
  assert(detail.includes(`  ${id}: {`), `Detailed rules/config missing: ${id}`);
  assert(records.includes(`${id}: "${id}"`), `Records mode isolation missing: ${id}`);
}

assert(knowledge.includes('fifty_one_by_five: "51_by_5"'), "51 BY 5 Awena ticker alias missing");
for (const token of [
  "validvisits", "bestquotient", "bestvalidstreak",
  "lifelosses", "loopssurvived", "besthitstreak",
  "perfectrounds", "callsmade", "doublehits", "triplehits",
  "fencescleared", "fenceattempts", "bullfinishes", "bestvisitsteps",
]) assert(records.includes(token), `Records KPI translation missing: ${token}`);

for (const token of ["PHASE CALLER", "FULL CALL", "BOUCLIER DU POSEUR", "VOLÉE ET DIVISION", "PARCOURS CLASSIQUE", "HAIES"]) {
  assert(detail.includes(token), `Detailed Awena concept missing: ${token}`);
}

console.log("NEW4 AWENA integration: OK — rules, config, aliases, tickers and records KPIs wired for 4/4 modes");
