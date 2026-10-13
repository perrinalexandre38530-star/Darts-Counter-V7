#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const exists = (rel) => fs.existsSync(path.join(root, rel));

const ticker = 'src/assets/tickers/ticker_cargo.png';
assert.ok(exists(ticker), 'ticker officiel CARGO manquant');
const png = fs.readFileSync(path.join(root, ticker));
assert.equal(png.readUInt32BE(16), 800, 'ticker CARGO: largeur invalide');
assert.equal(png.readUInt32BE(20), 230, 'ticker CARGO: hauteur invalide');

const config = read('src/pages/CargoConfig.tsx');
const play = read('src/pages/CargoPlay.tsx');
const visuals = read('src/lib/gameEngines/cargoVisuals.ts');

for (const page of [config, play]) {
  assert.ok(page.includes('import tickerCargo from "../assets/tickers/ticker_cargo.png"'), 'import direct ticker CARGO absent');
  assert.ok(page.includes('tickerSrc={tickerCargo}'), 'ticker officiel non rendu');
  assert.ok(!page.includes('getTicker("cargo")'), 'ancien fallback ticker encore actif');
}

for (const token of [
  'buildCargoMissionCue',
  "config.variant === 'parcel_delivery'",
  "config.variant === 'exact_load'",
  "config.variant === 'fragile_cargo'",
  "config.variant === 'cargo_rush'",
  "config.variant === 'full_pallet'",
  "config.variant === 'free_load'",
  "config.variant === 'convoy'",
  "config.variant === 'long_haul'",
  'PLUS QUE',
  'FRAGILE ACTIF',
  'EXPRESS · DERNIER TOUR',
  'RELAIS CONVOI',
]) assert.ok(visuals.includes(token), `guidage terrain manquant: ${token}`);

for (const token of ['missionCue', 'missionCueColor', 'manifestQuickValue', 'keypadMessage']) {
  assert.ok(play.includes(token), `intégration UX terrain manquante: ${token}`);
}
assert.ok(play.includes('Adresse ${activeSeries.number} · ${activeSeries.count}/5'), 'raccourci Parcel Delivery incomplet');
assert.ok(play.includes('config.variant === "free_load" || config.variant === "full_pallet"'), 'raccourci chargement libre incomplet');

console.log('✅ CARGO FIELD UX V12 OK — ticker officiel + guidage contextuel des 9 variantes');
