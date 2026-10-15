import fs from 'node:fs';

const visual = fs.readFileSync('src/lib/gameEngines/cargoVisuals.ts','utf8');
const component = fs.readFileSync('src/components/cargo/CargoVariantDashboard.tsx','utf8');
const load = fs.readFileSync('src/components/cargo/CargoLoadStatus.tsx','utf8');
const css = fs.readFileSync('src/styles/cargo-ui.css','utf8');

const variants = [
  'cargo_classic',
  'free_load',
  'full_pallet',
  'exact_load',
  'fragile_cargo',
  'cargo_rush',
  'convoy',
  'long_haul',
  'parcel_delivery',
];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

assert(visual.includes('buildCargoVariantDashboard'), 'buildCargoVariantDashboard manquant');
assert(component.includes('buildCargoVariantDashboard'), 'CargoVariantDashboard non câblé');
assert(load.includes('<CargoVariantDashboard'), 'Dashboard variante absent du HUD live');
assert(css.includes('CARGO Stage 15'), 'Styles Stage 15 absents');

for (const variant of variants) {
  assert(visual.includes(`variant === '${variant}'`) || variant === 'cargo_classic', `Branche ${variant} absente`);
  assert(component.includes(`cargo-variant-${'${data.variant}'}`), 'Classe variante dynamique absente');
}

for (const marker of [
  'BALANCE DE CHARGE',
  'INTÉGRITÉ FRAGILE',
  'EXPRESS / DEADLINE',
  'RELAIS CONVOI',
  'ITINÉRAIRE LONG HAUL',
  'TOURNÉE COLIS',
  'PALETTE COMPLÈTE',
  'CHARGE LIBRE',
  'MANIFESTE CLASSIQUE',
]) {
  assert(visual.includes(marker), `Dashboard visuel manquant: ${marker}`);
}

console.log('✅ CARGO VARIANT DASHBOARDS V15 OK — 9 variantes avec mini-dashboard gameplay dédié');
