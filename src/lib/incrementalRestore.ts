import LZString from 'lz-string';
import { loadStore, saveStore } from './storage';
import { loadTeams, saveTeams, type TeamEntity } from './petanqueTeamsStore';
import { withIncrementalRecordingSuppressed, type IncrementalChange } from './incrementalBackupJournal';
import { History, upsertFromCloud } from './history';

function changeTime(change: IncrementalChange): number {
  return Number(change?.updatedAt || 0) || 0;
}

function meaningful(value: any): boolean {
  if (value == null) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === 'object') return Object.keys(value).length > 0;
  return true;
}

function stable(value: any): string {
  try {
    const sort = (v: any): any => {
      if (Array.isArray(v)) return v.map(sort);
      if (!v || typeof v !== 'object') return v;
      const out: Record<string, any> = {};
      for (const key of Object.keys(v).sort()) out[key] = sort(v[key]);
      return out;
    };
    return JSON.stringify(sort(value));
  } catch {
    return '';
  }
}

function mergeProfile(current: any, incoming: any, remoteUpdatedAt: number): any {
  const merged: any = { ...(current || {}) };
  for (const [key, value] of Object.entries(incoming || {})) {
    if (meaningful(value) || !meaningful(merged[key])) merged[key] = value;
  }
  merged.privateInfo = { ...((current as any)?.privateInfo || {}), ...((incoming as any)?.privateInfo || {}) };
  merged.preferences = { ...((current as any)?.preferences || {}), ...((incoming as any)?.preferences || {}) };
  const localUpdatedAt = Number((current as any)?.updatedAt || (current as any)?.avatarUpdatedAt || 0) || 0;
  if (current && localUpdatedAt > remoteUpdatedAt && remoteUpdatedAt > 0) {
    for (const [key, value] of Object.entries(incoming || {})) {
      if (!meaningful((current as any)[key]) && meaningful(value)) merged[key] = value;
    }
  }
  return merged;
}

/**
 * Rejoue un journal incrémental sans faire un saveStore() par ligne.
 * Un bundle de 60 profils = une seule écriture du store, pas 60 recompressions.
 */
export async function applyIncrementalChanges(changes: IncrementalChange[], opts: { since?: number } = {}): Promise<{ applied: number; skipped: number }> {
  const since = Math.max(0, Number(opts.since || 0) || 0);
  const rows = (Array.isArray(changes) ? changes : [])
    .filter((row) => row?.key && changeTime(row) > since)
    .sort((a, b) => changeTime(a) - changeTime(b));
  let applied = 0;
  let skipped = 0;

  await withIncrementalRecordingSuppressed(async () => {
    const profileRows = rows.filter((row) => row.entityType === 'profile' || row.entityType === 'store_meta');
    if (profileRows.length) {
      try {
        const store: any = await loadStore<any>();
        if (!store) {
          skipped += profileRows.length;
        } else {
          const profiles = Array.isArray(store.profiles) ? [...store.profiles] : [];
          let nextStore: any = { ...store };
          let dirty = false;
          for (const change of profileRows) {
            if (change.entityType === 'store_meta') {
              if (change.payload && typeof change.payload === 'object') {
                const candidate = { ...nextStore, ...change.payload };
                if (stable(candidate) !== stable(nextStore)) {
                  nextStore = candidate;
                  dirty = true;
                  applied += 1;
                } else {
                  skipped += 1;
                }
              } else skipped += 1;
              continue;
            }
            const id = String(change.entityId || '');
            const idx = profiles.findIndex((p: any) => String(p?.id || '') === id);
            if (change.op === 'delete') {
              if (idx >= 0) {
                profiles.splice(idx, 1);
                dirty = true;
                applied += 1;
              } else {
                skipped += 1;
              }
              continue;
            }
            if (!change.payload || typeof change.payload !== 'object') { skipped += 1; continue; }
            const incoming: any = change.payload;
            const current: any = idx >= 0 ? profiles[idx] : null;
            const merged = mergeProfile(current, incoming, Number(change.updatedAt || incoming?.updatedAt || 0) || 0);
            if (current && stable(current) === stable(merged)) {
              skipped += 1;
              continue;
            }
            if (idx >= 0) profiles[idx] = merged;
            else profiles.push(merged);
            dirty = true;
            applied += 1;
          }
          if (dirty) {
            nextStore.profiles = profiles;
            await saveStore(nextStore, { skipAsyncNormalize: true, skipMediaCapture: true, suppressIncremental: true });
          }
        }
      } catch {
        skipped += profileRows.length;
      }
    }

    const teamRows = rows.filter((row) => row.entityType === 'team');
    if (teamRows.length) {
      try {
        const teams = loadTeams();
        let dirty = false;
        for (const change of teamRows) {
          const id = String(change.entityId || '');
          const idx = teams.findIndex((team) => String(team?.id || '') === id);
          if (change.op === 'delete') {
            if (idx >= 0) {
              teams.splice(idx, 1);
              dirty = true;
              applied += 1;
            } else {
              skipped += 1;
            }
          } else if (change.payload && typeof change.payload === 'object') {
            const team = change.payload as TeamEntity;
            const current = idx >= 0 ? teams[idx] : null;
            if (current && stable(current) === stable(team)) {
              skipped += 1;
              continue;
            }
            if (idx >= 0) teams[idx] = team;
            else teams.push(team);
            dirty = true;
            applied += 1;
          } else skipped += 1;
        }
        if (dirty) saveTeams(teams);
      } catch {
        skipped += teamRows.length;
      }
    }

    for (const change of rows.filter((row) => row.entityType === 'match')) {
      try {
        if (change.op === 'delete') {
          await History.removeFromCloud(String(change.entityId || ''));
          applied += 1;
          continue;
        }
        const p: any = change.payload || {};
        let payload = p.payload ?? null;
        if (!payload && typeof p.payloadCompressed === 'string' && p.payloadCompressed) {
          const text = LZString.decompressFromUTF16(p.payloadCompressed);
          if (text) { try { payload = JSON.parse(text); } catch {} }
        }
        const header = p.header && typeof p.header === 'object' ? p.header : {};
        const matchId = String(p.matchId || change.entityId || p.id || '').trim();
        if (!matchId) { skipped += 1; continue; }
        try {
          const current: any = typeof (History as any).getCanonicalV4 === 'function'
            ? await (History as any).getCanonicalV4(matchId)
            : await (History as any).get?.(matchId);
          const currentUpdatedAt = Number(current?.updatedAt || current?.finishedAt || current?.createdAt || 0) || 0;
          const incomingUpdatedAt = Number(p.updatedAt || header.updatedAt || change.updatedAt || 0) || 0;
          if (current && incomingUpdatedAt > 0 && currentUpdatedAt >= incomingUpdatedAt) {
            skipped += 1;
            continue;
          }
        } catch {}
        const rec: any = {
          ...header,
          id: matchId,
          matchId,
          sport: p.sport || header.sport || payload?.sport || 'darts',
          kind: p.kind || header.kind || payload?.kind || payload?.mode || 'match',
          status: p.status || header.status || 'finished',
          createdAt: Number(p.createdAt || header.createdAt || Date.now()),
          updatedAt: Number(p.updatedAt || header.updatedAt || change.updatedAt || Date.now()),
          players: p.players || header.players || payload?.players || [],
          winnerId: p.winnerId ?? header.winnerId ?? payload?.winnerId ?? null,
          summary: p.summary || header.summary || payload?.summary || {},
          game: p.game || header.game || payload?.game || null,
          payload,
        };
        await upsertFromCloud(rec);
        applied += 1;
      } catch {
        skipped += 1;
      }
    }

    const known = profileRows.length + teamRows.length + rows.filter((row) => row.entityType === 'match').length;
    skipped += Math.max(0, rows.length - known);
  });

  return { applied, skipped };
}
