import assert from "node:assert/strict";
import fs from "node:fs";
import { buildHomeModeSlides, detectHomeMode } from "../src/lib/homeModeStats.ts";

const profile = { id: "p-ninja", name: "Ninja" };
const finished = (kind: string, player: Record<string, unknown>, extra: Record<string, unknown> = {}) => ({
  id: `${kind}-1`,
  kind,
  mode: kind,
  sport: "darts",
  status: "finished",
  players: [{ id: profile.id, name: profile.name }],
  winnerId: profile.id,
  summary: { finished: true, perPlayer: [{ id: profile.id, name: profile.name, ...player }] },
  ...extra,
});

const matches = [
  finished("five_lives", { totalScore: 150, bestVisit: 60, dartsThrown: 9, hitsTotal: 7, win: true }),
  finished("loterie", { cellsRevealed: 4, dartsThrown: 6, hitsTotal: 2, bestStreak: 2, win: true }),
  finished("golf", { score: 42, dartsThrown: 27, win: true }, { payload: { mode: "golf", sport: "darts", stats: { global: { holes: 9 } } } }),
  finished("enculette", { score: 80, dartsThrown: 9, hitsTotal: 5, win: true }),
  finished("darts_firefighter", { score: 1450, darts: 12, hits: 10, fireReduced: 9, firesExtinguished: 4, propagationBlocked: 2, dbulls: 1, win: true }),
  finished("new_future_mode", { score: 123, dartsThrown: 9, hitsTotal: 6, win: true }, { summary: { title: "Mode Futur", finished: true, perPlayer: [{ id: profile.id, name: profile.name, score: 123, dartsThrown: 9, hitsTotal: 6, win: true }] } }),
  finished("x01", { score: 501, dartsThrown: 24, win: true }),
  finished("cricket", { score: 199, dartsThrown: 9, hitsTotal: 8, win: true }),
  finished("killer", { score: 20, dartsThrown: 9, hitsTotal: 7, win: true }),
];

assert.equal(detectHomeMode(matches[3]), "enculette");
assert.equal(detectHomeMode(matches[4]), "darts_firefighter");
assert.equal(detectHomeMode(matches[5]), "unknown");

const slides = buildHomeModeSlides(matches, profile.id, profile.name, "darts", ["x01", "cricket", "killer"]);
const byId = new Map(slides.map((slide) => [slide.id, slide]));

for (const id of ["mode-five_lives", "mode-loterie", "mode-golf", "mode-enculette", "mode-darts_firefighter", "mode-custom-new_future_mode"]) {
  assert.ok(byId.has(id), `slide manquant: ${id}`);
  const slide = byId.get(id)!;
  assert.equal(slide.rows.length, 6, `${id}: exactement 6 KPI attendus`);
  assert.ok(slide.rows.every((row) => row.value !== "—" && row.value !== ""), `${id}: aucune statistique vide`);
}

assert.equal(byId.get("mode-five_lives")?.rows.find((row) => row.label === "best visit")?.value, "60");
assert.equal(byId.get("mode-darts_firefighter")?.title, "DARTS FIREFIGHTER");
assert.equal(byId.get("mode-darts_firefighter")?.rows.find((row) => row.label === "extinctions")?.value, "4");
assert.equal(byId.get("mode-darts_firefighter")?.rows.find((row) => row.label === "Canadairs")?.value, "1");
assert.equal(byId.get("mode-custom-new_future_mode")?.title, "MODE FUTUR");
assert.ok(!byId.has("mode-x01"));
assert.ok(!byId.has("mode-cricket"));
assert.ok(!byId.has("mode-killer"));

const cardSource = fs.readFileSync(new URL("../src/components/home/ActiveProfileCard.tsx", import.meta.url), "utf8");
assert.ok(!/slice\(0,\s*7\)/.test(cardSource), "le carrousel HOME ne doit plus être limité à 7 slides");
assert.ok(cardSource.includes("out.push(...automaticModeSlides)"), "les slides des modes History doivent entrer dans la boucle");

const homeSource = fs.readFileSync(new URL("../src/pages/Home.tsx", import.meta.url), "utf8");
assert.ok(homeSource.includes("buildHomeModeSlides("), "Home doit construire les résumés de tous les modes joués");

console.log("✅ HOME MODE STATS REGRESSION OK");
