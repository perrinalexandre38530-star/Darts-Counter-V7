/** PRISONER — lecture défensive des résultats History V4 et des archives. */
export function prisonerRecordId(record: any): string {
  const id = record?.matchId ?? record?.id ?? record?.payload?.matchId ?? record?.payload?.id;
  return id == null ? '' : String(id).trim();
}

/**
 * Conserve un seul snapshot par identifiant de match. Si History V4 contient
 * plusieurs versions du même match, privilégie la plus récente (sans changer
 * l'ordre des matchs) : la première copie peut être un ancien snapshot.
 * Les archives sans identifiant restent intactes.
 */
export function uniquePrisonerRecords<T>(records: T[]): T[] {
  const retained = new Map<string, { index: number; timestamp: number; record: T }>();
  records.forEach((record: any, index) => {
    const id = prisonerRecordId(record);
    if (!id) return;
    const rawTime = record?.updatedAt ?? record?.payload?.updatedAt ?? record?.summary?.finishedAt ?? record?.createdAt;
    const parsed = typeof rawTime === 'string' && !Number.isFinite(Number(rawTime)) ? Date.parse(rawTime) : Number(rawTime);
    const timestamp = Number.isFinite(parsed) ? parsed : 0;
    const previous = retained.get(id);
    if (!previous || timestamp > previous.timestamp) {
      retained.set(id, { index: previous?.index ?? index, timestamp, record });
    }
  });
  // L'ordre de sortie suit la première apparition du match, mais son contenu
  // provient de la copie la plus récente.
  const byIndex = new Map(Array.from(retained.values()).map((entry) => [entry.index, entry.record]));
  return records.flatMap((record: any, index) => {
    if (!prisonerRecordId(record)) return [record];
    const latest = byIndex.get(index);
    return latest === undefined ? [] : [latest];
  });
}

export function isPrisonerPlayerWinner(record: any, row: any, playerId: string): boolean {
  if (row?.win === true || row?.winner === true) return true;
  const ids = record?.winnerIds ?? record?.summary?.winnerIds ?? record?.payload?.winnerIds ?? record?.payload?.summary?.winnerIds;
  const single = record?.winnerId ?? record?.summary?.winnerId ?? record?.payload?.winnerId ?? record?.payload?.summary?.winnerId;
  const winners = Array.isArray(ids) ? ids.map(String) : single == null ? [] : [String(single)];
  const teamId = row?.teamId ?? row?.team_id ?? null;
  return winners.includes(String(playerId)) || (teamId != null && winners.includes(String(teamId)));
}

/** Longueur de parcours enregistrée lors de la partie. Les archives historiques
 * sans séquence exploitable restent sur le parcours classique de 20 cibles. */
export function prisonerCourseLength(record: any): number {
  const candidates = [
    record?.payload?.stats?.match?.courseLength,
    record?.payload?.stats?.global?.courseLength,
    record?.summary?.matchStats?.courseLength,
    record?.payload?.summary?.matchStats?.courseLength,
    record?.payload?.state?.sequence?.length,
    record?.summary?.sequence?.length,
    record?.payload?.summary?.sequence?.length,
  ];
  for (const candidate of candidates) {
    const length = Number(candidate);
    if (Number.isInteger(length) && length > 0 && length <= 1000) return length;
  }
  return 20;
}
