/** Display-only identity normalization for immutable History V4 records.
 * Never merges scores, darts or telemetry across two participant rows.
 */
export const HISTORY_NINJA_IDS = new Set([
  'b3517e84-41a1-4eb1-8f20-3e40e3875d38',
  '1ca2469d-2e3b-41b2-807d-dd96eb1d1d4f',
  'bbedd4b7-e181-4b8e-a794-c948a18e8404',
]);
const CURRENT_NINJA_ID = 'b3517e84-41a1-4eb1-8f20-3e40e3875d38';
export function participantId(p: any): string {
  return String(p?.id ?? p?.playerId ?? p?.profileId ?? p?.pid ?? '').trim();
}
function participantName(p: any): string {
  return String(p?.name ?? p?.displayName ?? p?.playerName ?? '').trim().toLowerCase();
}
export function historyCanonicalKey(rec: any, p: any): string {
  const id = participantId(p);
  if (!id) return '';
  const links = [rec?.quickProfileLinks, rec?.summary?.quickProfileLinks, rec?.payload?.summary?.quickProfileLinks];
  const mapped = links.map((x) => x && typeof x === 'object' ? x[id] : null).find((x) => typeof x === 'string' && x);
  const canonical = mapped ? String(mapped) : id;
  // The three known IDs are aliases only for player Ninja, not an arbitrary user.
  if (HISTORY_NINJA_IDS.has(canonical) && (participantName(p) === 'ninja' || Boolean(mapped))) return 'profile:ninja';
  return `profile:${canonical}`;
}
function priority(rec: any, p: any): number {
  const id = participantId(p);
  let n = id === CURRENT_NINJA_ID ? 1000 : HISTORY_NINJA_IDS.has(id) ? 700 : 500;
  if (p?.avatarDataUrl || p?.avatarUrl) n += 5;
  if (p?.rank != null || p?.finalRank != null) n += 10;
  return n;
}
export function uniqueHistoryParticipants<T = any>(rec: any, rows: T[]): T[] {
  const order: string[] = [];
  const selected = new Map<string, T>();
  for (let i = 0; i < (Array.isArray(rows) ? rows.length : 0); i++) {
    const row: any = rows[i];
    if (!row || typeof row !== 'object') continue;
    const key = historyCanonicalKey(rec, row) || `unlinked:${i}`;
    if (!selected.has(key)) { selected.set(key, row); order.push(key); }
    else if (priority(rec, row) > priority(rec, selected.get(key))) selected.set(key, row);
  }
  return order.map((k) => selected.get(k)!).filter(Boolean);
}
