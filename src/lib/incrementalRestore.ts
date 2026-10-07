import LZString from 'lz-string';
import { loadStore, saveStore } from './storage';
import { loadTeams, saveTeams, type TeamEntity } from './petanqueTeamsStore';
import { withIncrementalRecordingSuppressed, type IncrementalChange } from './incrementalBackupJournal';
import { upsertFromCloud } from './history';

function changeTime(change: IncrementalChange): number {
  return Number(change?.updatedAt || 0) || 0;
}

export async function applyIncrementalChanges(changes: IncrementalChange[], opts: { since?: number } = {}): Promise<{ applied: number; skipped: number }> {
  const since = Math.max(0, Number(opts.since || 0) || 0);
  const rows = (Array.isArray(changes) ? changes : [])
    .filter((row) => row?.key && changeTime(row) > since)
    .sort((a, b) => changeTime(a) - changeTime(b));
  let applied = 0;
  let skipped = 0;

  await withIncrementalRecordingSuppressed(async () => {
    for (const change of rows) {
      try {
        if (change.entityType === 'profile') {
          const store: any = await loadStore<any>();
          if (!store) { skipped += 1; continue; }
          const profiles = Array.isArray(store.profiles) ? [...store.profiles] : [];
          const id = String(change.entityId || '');
          const idx = profiles.findIndex((p: any) => String(p?.id || '') === id);
          if (change.op === 'delete') {
            if (idx >= 0) profiles.splice(idx, 1);
          } else if (change.payload && typeof change.payload === 'object') {
            const incoming: any = change.payload;
            const current: any = idx >= 0 ? profiles[idx] : null;
            const meaningful = (value: any) => {
              if (value == null) return false;
              if (typeof value === 'string') return value.trim().length > 0;
              if (Array.isArray(value)) return value.length > 0;
              if (typeof value === 'object') return Object.keys(value).length > 0;
              return true;
            };
            const merged: any = { ...(current || {}) };
            for (const [key, value] of Object.entries(incoming)) {
              if (meaningful(value) || !meaningful(merged[key])) merged[key] = value;
            }
            merged.privateInfo = { ...((current as any)?.privateInfo || {}), ...((incoming as any)?.privateInfo || {}) };
            merged.preferences = { ...((current as any)?.preferences || {}), ...((incoming as any)?.preferences || {}) };
            const localUpdatedAt = Number((current as any)?.updatedAt || (current as any)?.avatarUpdatedAt || 0) || 0;
            const remoteUpdatedAt = Number(change.updatedAt || (incoming as any)?.updatedAt || 0) || 0;
            if (current && localUpdatedAt > remoteUpdatedAt && remoteUpdatedAt > 0) {
              for (const [key, value] of Object.entries(incoming)) {
                if (!meaningful((current as any)[key]) && meaningful(value)) merged[key] = value;
              }
            }
            if (idx >= 0) profiles[idx] = merged;
            else profiles.push(merged);
          }
          await saveStore({ ...store, profiles } as any, { skipAsyncNormalize: true });
          applied += 1;
          continue;
        }

        if (change.entityType === 'store_meta') {
          const store: any = await loadStore<any>();
          if (!store || !change.payload || typeof change.payload !== 'object') { skipped += 1; continue; }
          await saveStore({ ...store, ...change.payload } as any, { skipAsyncNormalize: true });
          applied += 1;
          continue;
        }

        if (change.entityType === 'team') {
          const teams = loadTeams();
          const id = String(change.entityId || '');
          const idx = teams.findIndex((team) => String(team?.id || '') === id);
          if (change.op === 'delete') {
            if (idx >= 0) teams.splice(idx, 1);
          } else if (change.payload && typeof change.payload === 'object') {
            const team = change.payload as TeamEntity;
            if (idx >= 0) teams[idx] = team;
            else teams.push(team);
          }
          saveTeams(teams);
          applied += 1;
          continue;
        }

        if (change.entityType === 'match') {
          if (change.op === 'delete') { skipped += 1; continue; }
          const p: any = change.payload || {};
          let payload = p.payload ?? null;
          if (!payload && typeof p.payloadCompressed === 'string' && p.payloadCompressed) {
            const text = LZString.decompressFromUTF16(p.payloadCompressed);
            if (text) { try { payload = JSON.parse(text); } catch {} }
          }
          const header = p.header && typeof p.header === 'object' ? p.header : {};
          const rec: any = {
            ...header,
            id: p.matchId || change.entityId || p.id,
            matchId: p.matchId || change.entityId || p.id,
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
          continue;
        }

        skipped += 1;
      } catch {
        skipped += 1;
      }
    }
  });

  return { applied, skipped };
}
