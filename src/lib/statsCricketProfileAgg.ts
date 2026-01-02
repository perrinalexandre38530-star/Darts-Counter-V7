// =============================================================
// src/lib/statsCricketProfileAgg.ts
// Agrégation Cricket "par profil" pour la page StatsCricket
// - Utilise ton moteur existant (CricketHit + buildCricketStatsFromEvents)
// - Sait mapper des SavedMatch (History) vers CricketPlayerStats
// - Fournit un helper async: loadCricketStatsByProfileFromHistory()
// =============================================================

import {
  type CricketHit,
  type CricketPlayerStats,
  type CricketThrowEvent,
  buildCricketStatsFromEvents,
} from "./StatsCricket"; // <-- S majuscule

import { History, type SavedMatch } from "./history";

// -------------------------------------------------------------
// Types intermédiaires
// -------------------------------------------------------------

/**
 * Représente un leg Cricket pour UN joueur.
 */
export type CricketLegHistoryForProfile = {
  profileId: string;
  hits: CricketHit[];
  won?: boolean; // true si ce joueur gagne ce leg / match (simple)
};

/**
 * Représente un match Cricket (multi-legs) pour UN joueur.
 * Pour l'instant on traite chaque SavedMatch comme un match simple.
 */
export type CricketMatchHistoryForProfile = {
  profileId: string;
  legs: CricketLegHistoryForProfile[];
  wins?: number;  // nombre de victoires (souvent 0 ou 1)
  games?: number; // nombre de matchs joués (souvent 1)
};

// -------------------------------------------------------------
// 1) Legs → événements "simples" pour l'agrégateur générique
// -------------------------------------------------------------

export function buildCricketThrowEventsFromLegs(
  legs: CricketLegHistoryForProfile[]
): CricketThrowEvent[] {
  const events: CricketThrowEvent[] = [];

  for (const leg of legs) {
    const { profileId, hits } = leg;
    if (!profileId || !hits || !hits.length) continue;

    // Approx pour le MPR : nb de rounds = darts / 3
    const rounds = Math.max(1, Math.ceil(hits.length / 3));

    hits.forEach((h, idx) => {
      const target = h.target;
      // On ne garde que 15–20 + 25
      if (![15, 16, 17, 18, 19, 20, 25].includes(target)) return;

      const number =
        (target === 25 ? "25" : String(target)) as
          | "15"
          | "16"
          | "17"
          | "18"
          | "19"
          | "20"
          | "25";

      const marks = h.multiplier;
      const points = h.isScoring
        ? (target === 25 ? 25 : target) * h.multiplier
        : 0;

      const closed =
        h.afterHits >= 3 &&
        h.beforeHits < 3 &&
        !h.opponentOpen;

      const ev: CricketThrowEvent = {
        profileId,
        number,
        marks,
        points,
        closed,
        gameIncrement: false, // géré plus haut
        winIncrement: false,  // géré plus haut
        // On porte les "rounds" sur la dernière flèche du leg
        rounds: idx === hits.length - 1 ? rounds : 0,
      };

      events.push(ev);
    });
  }

  return events;
}

// -------------------------------------------------------------
// 2) SavedMatch[] (avec payload Cricket) → matches par profil
// -------------------------------------------------------------

/**
 * À partir de rows History (SavedMatch avec payload Cricket),
 * produit une liste de CricketMatchHistoryForProfile.
 */
export function extractCricketMatchesFromHistoryRows(
  rows: SavedMatch[]
): CricketMatchHistoryForProfile[] {
  const out: CricketMatchHistoryForProfile[] = [];

  for (const row of rows) {
    if (row.kind !== "cricket") continue;
    if (!row.payload || typeof row.payload !== "object") continue;

    const payload = row.payload as any;
    const players = Array.isArray(payload.players) ? payload.players : [];
    if (!players.length) continue;

    const winnerId = row.winnerId ?? payload.winnerId ?? null;

    for (const p of players) {
      const profileId: string | undefined = p.id || p.profileId || p.playerId;
      if (!profileId) continue;

      const hits: CricketHit[] = Array.isArray(p.hits) ? p.hits : [];

      const leg: CricketLegHistoryForProfile = {
        profileId,
        hits,
        won: winnerId ? winnerId === profileId : undefined,
      };

      const match: CricketMatchHistoryForProfile = {
        profileId,
        legs: [leg],
        wins: winnerId ? (winnerId === profileId ? 1 : 0) : 0,
        games: row.status === "finished" ? 1 : 0,
      };

      out.push(match);
    }
  }

  return out;
}

// -------------------------------------------------------------
// 3) Matches par profil → CricketPlayerStats par profil
// -------------------------------------------------------------

export function buildCricketStatsByProfileFromMatches(
  matches: CricketMatchHistoryForProfile[]
): Record<string, CricketPlayerStats> {
  const allEvents: CricketThrowEvent[] = [];

  for (const m of matches) {
    const profileId = m.profileId;
    if (!profileId) continue;

    // 1) events "par flèche"
    const legEvents = buildCricketThrowEventsFromLegs(m.legs ?? []);
    allEvents.push(...legEvents);

    // 2) petit event synthétique pour compter games / wins
    const games = m.games ?? 1;
    const wins = m.wins ?? 0;

    allEvents.push({
      profileId,
      number: "20", // sans importance, marks=0
      marks: 0,
      points: 0,
      closed: false,
      gameIncrement: games > 0,
      winIncrement: wins > 0,
      rounds: 0,
    });
  }

  return buildCricketStatsFromEvents(allEvents);
}

/**
 * Helper : à partir de rows History complets (avec payload Cricket)
 * renvoie directement Record<profileId, CricketPlayerStats>.
 */
export function buildCricketStatsByProfileFromHistoryRows(
  rows: SavedMatch[]
): Record<string, CricketPlayerStats> {
  const matches = extractCricketMatchesFromHistoryRows(rows);
  return buildCricketStatsByProfileFromMatches(matches);
}

// -------------------------------------------------------------
// 4) Helper async clé-en-main pour la page StatsCricket
// -------------------------------------------------------------

export async function loadCricketStatsByProfileFromHistory(): Promise<
  Record<string, CricketPlayerStats>
> {
  // 1) on récupère seulement les "finished"
  const finished = await History.listFinished();

  // 2) on filtre les matches Cricket, puis on recharge avec payload
  const cricketIds = finished
    .filter((r) => r.kind === "cricket")
    .map((r) => r.id);

  const full: SavedMatch[] = [];
  for (const id of cricketIds) {
    const rec = await History.get(id);
    if (rec && rec.kind === "cricket" && rec.payload) {
      full.push(rec);
    }
  }

  // 3) agrégation finale par profil
  return buildCricketStatsByProfileFromHistoryRows(full);
}
