/** Règles MORPION : 8 valeurs distinctes (1..20), Bull au centre, 4 fléchettes par case. */
export type MorpionDart = { v: number; mult: number };
export type MorpionGrid = { targets: number[]; owners: (number | null)[]; marks: number[][] };
export const MORPION_LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6],
  [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6],
];
export function newMorpionGrid(playerCount: number, rng: () => number = Math.random): MorpionGrid {
  const values = Array.from({ length: 20 }, (_, i) => i + 1);
  for (let i = values.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [values[i], values[j]] = [values[j], values[i]];
  }
  const targets = values.slice(0, 8);
  targets.splice(4, 0, 25);
  return { targets, owners: Array(9).fill(null), marks: Array.from({ length: 9 }, () => Array(Math.max(2, playerCount)).fill(0)) };
}
export function morpionWinner(owners: (number | null)[]): number | null {
  for (const [a, b, c] of MORPION_LINES) {
    if (owners[a] !== null && owners[a] === owners[b] && owners[b] === owners[c]) return owners[a];
  }
  return null;
}
/** Une ligne reste gagnable seulement si toutes les cases déjà prises ont le même propriétaire.
 * Si plus aucune ligne n'est gagnable, la manche est nulle sans attendre 4 marques
 * sur chacune des cases encore libres. */
export function morpionIsDraw(owners: (number | null)[]): boolean {
  if (morpionWinner(owners) !== null) return false;
  return MORPION_LINES.every(line => {
    const taken = new Set(line.map(index => owners[index]).filter((v): v is number => v !== null));
    return taken.size > 1;
  });
}
export function applyMorpionVolley(grid: MorpionGrid, player: number, darts: MorpionDart[], marksToClaim = 4) {
  const next: MorpionGrid = { targets: [...grid.targets], owners: [...grid.owners], marks: grid.marks.map((x) => [...x]) };
  const hits: number[] = [];
  for (const dart of darts.slice(0, 3)) {
    const v = Number(dart.v);
    const idx = next.targets.indexOf(v);
    // Tous les segments (S/D/T) rapportent UNE touche, comme le décrit la règle.
    // Bull simple et double touchent la même case centrale.
    if (idx < 0 || next.owners[idx] !== null || v === 0) continue;
    if (player < 0 || player >= next.marks[idx].length) continue;
    next.marks[idx][player] = Math.min(marksToClaim, next.marks[idx][player] + 1);
    hits.push(idx);
    if (next.marks[idx][player] >= marksToClaim) next.owners[idx] = player;
    if (morpionWinner(next.owners) !== null) break;
  }
  return { grid: next, hits, winner: morpionWinner(next.owners), draw: morpionIsDraw(next.owners) };
}
