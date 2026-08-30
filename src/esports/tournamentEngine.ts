import type { EsportsTournamentMatch, EsportsTournamentParticipant } from "./types";

function nextPowerOfTwo(value: number): number {
  let n = 1;
  while (n < Math.max(2, value)) n *= 2;
  return n;
}

function copy(matches: EsportsTournamentMatch[]): EsportsTournamentMatch[] {
  return matches.map((match) => ({ ...match }));
}

/**
 * Propage les vainqueurs déjà connus (y compris les BYE) vers les tours suivants.
 * La fonction boucle jusqu'à stabilisation afin qu'un BYE puisse traverser
 * plusieurs tours dans un petit bracket incomplet.
 */
export function propagateSingleEliminationWinners(input: EsportsTournamentMatch[]): EsportsTournamentMatch[] {
  const matches = copy(input);
  let changed = true;
  let guard = 0;

  while (changed && guard < 32) {
    changed = false;
    guard += 1;

    for (const source of matches) {
      if (source.status !== "finished" || !source.winnerId) continue;
      const winnerName = source.winnerId === source.participantAId ? source.participantAName : source.participantBName;
      if (!winnerName) continue;

      const target = matches.find((m) => m.round === source.round + 1 && m.slot === Math.floor(source.slot / 2));
      if (!target) continue;

      const side = source.slot % 2 === 0 ? "A" : "B";
      const idKey = side === "A" ? "participantAId" : "participantBId";
      const nameKey = side === "A" ? "participantAName" : "participantBName";
      if (target[idKey] !== source.winnerId || target[nameKey] !== winnerName) {
        (target as any)[idKey] = source.winnerId;
        (target as any)[nameKey] = winnerName;
        changed = true;
      }

      if (target.participantAId && target.participantBId && target.status === "pending") {
        target.status = "ready";
        changed = true;
      }
    }
  }

  return matches;
}

export function buildSingleEliminationBracket(participants: EsportsTournamentParticipant[]): EsportsTournamentMatch[] {
  const size = nextPowerOfTwo(participants.length);
  const rounds = Math.log2(size);
  const out: EsportsTournamentMatch[] = [];
  const firstRoundSlots: Array<[EsportsTournamentParticipant | null, EsportsTournamentParticipant | null]> = [];
  const firstRoundMatchCount = size / 2;
  const byeCount = Math.max(0, size - participants.length);
  const byeSlots = new Set<number>();
  for (let i = 0; i < byeCount; i += 1) byeSlots.add(Math.floor((i * firstRoundMatchCount) / Math.max(1, byeCount)));
  let cursor = 0;
  // Distribue les BYE dans le bracket (ex: 6 joueurs => slots 0 et 2) afin
  // d'éviter qu'ils se rencontrent entre eux et de garder les deux moitiés actives.
  for (let slot = 0; slot < firstRoundMatchCount; slot += 1) {
    if (byeSlots.has(slot)) firstRoundSlots.push([participants[cursor++] || null, null]);
    else firstRoundSlots.push([participants[cursor++] || null, participants[cursor++] || null]);
  }

  for (let round = 1; round <= rounds; round += 1) {
    const matchCount = size / Math.pow(2, round);
    for (let slot = 0; slot < matchCount; slot += 1) {
      const a = round === 1 ? firstRoundSlots[slot]?.[0] || null : null;
      const b = round === 1 ? firstRoundSlots[slot]?.[1] || null : null;
      const byeWinner = round === 1 && ((a && !b) || (!a && b)) ? (a || b) : null;
      out.push({
        id: `r${round}-m${slot + 1}`,
        round,
        slot,
        participantAId: a?.id || null,
        participantBId: b?.id || null,
        participantAName: a?.name || null,
        participantBName: b?.name || null,
        winnerId: byeWinner?.id || null,
        status: byeWinner ? "finished" : a && b ? "ready" : "pending",
      });
    }
  }
  return propagateSingleEliminationWinners(out);
}

export function buildRoundRobinMatches(participants: EsportsTournamentParticipant[]): EsportsTournamentMatch[] {
  const list = [...participants];
  if (list.length % 2 === 1) list.push({ id: "__bye__", name: "BYE", seed: 999 });
  const rounds = list.length - 1;
  const half = list.length / 2;
  const rotation = [...list];
  const out: EsportsTournamentMatch[] = [];

  for (let round = 0; round < rounds; round += 1) {
    for (let i = 0; i < half; i += 1) {
      const a = rotation[i];
      const b = rotation[rotation.length - 1 - i];
      if (a.id === "__bye__" || b.id === "__bye__") continue;
      out.push({
        id: `rr-r${round + 1}-m${i + 1}`,
        round: round + 1,
        slot: i,
        participantAId: a.id,
        participantBId: b.id,
        participantAName: a.name,
        participantBName: b.name,
        status: "ready",
      });
    }
    rotation.splice(1, 0, rotation.pop()!);
  }
  return out;
}

export function applyTournamentMatchScore(
  matches: EsportsTournamentMatch[],
  matchId: string,
  scoreA: number,
  scoreB: number,
  format: "single_elimination" | "round_robin"
): EsportsTournamentMatch[] {
  if (scoreA === scoreB) throw new Error("Un match de tournoi doit avoir un vainqueur.");
  const next = copy(matches);
  const match = next.find((m) => m.id === matchId);
  if (!match) throw new Error("Match de tournoi introuvable.");
  if (!match.participantAId || !match.participantBId) throw new Error("Ce match n'a pas encore ses deux participants.");

  match.scoreA = Math.max(0, Number(scoreA) || 0);
  match.scoreB = Math.max(0, Number(scoreB) || 0);
  match.winnerId = match.scoreA > match.scoreB ? match.participantAId : match.participantBId;
  match.status = "finished";

  return format === "single_elimination" ? propagateSingleEliminationWinners(next) : next;
}

export type RoundRobinStanding = {
  participantId: string;
  name: string;
  played: number;
  wins: number;
  losses: number;
  scored: number;
  conceded: number;
  diff: number;
  points: number;
};

export function buildRoundRobinStandings(participants: EsportsTournamentParticipant[], matches: EsportsTournamentMatch[]): RoundRobinStanding[] {
  const table = new Map<string, RoundRobinStanding>();
  for (const p of participants) table.set(p.id, { participantId: p.id, name: p.name, played: 0, wins: 0, losses: 0, scored: 0, conceded: 0, diff: 0, points: 0 });

  for (const m of matches) {
    if (m.status !== "finished" || !m.participantAId || !m.participantBId) continue;
    const a = table.get(m.participantAId);
    const b = table.get(m.participantBId);
    if (!a || !b) continue;
    const sa = Number(m.scoreA || 0);
    const sb = Number(m.scoreB || 0);
    a.played += 1; b.played += 1;
    a.scored += sa; a.conceded += sb;
    b.scored += sb; b.conceded += sa;
    if (sa > sb) { a.wins += 1; a.points += 3; b.losses += 1; }
    else { b.wins += 1; b.points += 3; a.losses += 1; }
  }

  return [...table.values()]
    .map((row) => ({ ...row, diff: row.scored - row.conceded }))
    .sort((a, b) => b.points - a.points || b.diff - a.diff || b.scored - a.scored || a.name.localeCompare(b.name));
}
