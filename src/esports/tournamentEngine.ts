import type { EsportsTournamentMatch, EsportsTournamentParticipant } from "./types";

function nextPowerOfTwo(value: number): number {
  let n = 1;
  while (n < Math.max(2, value)) n *= 2;
  return n;
}

export function buildSingleEliminationBracket(participants: EsportsTournamentParticipant[]): EsportsTournamentMatch[] {
  const size = nextPowerOfTwo(participants.length);
  const seeded = Array.from({ length: size }, (_, i) => participants[i] || null);
  const rounds = Math.log2(size);
  const out: EsportsTournamentMatch[] = [];

  for (let round = 1; round <= rounds; round += 1) {
    const matchCount = size / Math.pow(2, round);
    for (let slot = 0; slot < matchCount; slot += 1) {
      const a = round === 1 ? seeded[slot * 2] : null;
      const b = round === 1 ? seeded[slot * 2 + 1] : null;
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
  return out;
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
