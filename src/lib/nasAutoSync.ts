import { loadStore } from "./storage";
import { isNasSyncEnabled, nasApi } from "./nasApi";

function isoFromAny(value: any): string | undefined {
  if (value == null) return undefined;
  if (typeof value === "string") {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
  }
  if (typeof value === "number") {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
  }
  return undefined;
}

function safeArray<T = any>(value: any): T[] {
  return Array.isArray(value) ? value : [];
}

function normalizePlayers(input: any): string[] {
  if (!Array.isArray(input)) return [];
  return input
    .map((p) => {
      if (typeof p === "string") return p;
      if (p && typeof p.id === "string") return p.id;
      return null;
    })
    .filter(Boolean) as string[];
}

function normalizeSport(match: any): string {
  return String(
    match?.sport ||
      match?.kind ||
      match?.mode ||
      match?.header?.mode ||
      match?.payload?.kind ||
      "unknown"
  ).toLowerCase();
}

function normalizeWinner(match: any): string | null {
  return (
    match?.winnerId ||
    match?.result?.winner ||
    match?.header?.winner ||
    match?.payload?.winnerId ||
    null
  );
}

function normalizeMatches(store: any) {
  const raw = [
    ...safeArray(store?.saved),
    ...safeArray(store?.history),
  ];

  const dedup = new Map<string, any>();

  for (const match of raw) {
    const id = String(match?.id || match?.header?.id || "").trim();
    if (!id) continue;

    const players = normalizePlayers(match?.players || match?.header?.players);
    const winner = normalizeWinner(match);
    const sport = normalizeSport(match);
    const createdAt =
      isoFromAny(match?.createdAt) ||
      isoFromAny(match?.header?.startedAt) ||
      isoFromAny(match?.startedAt) ||
      new Date().toISOString();
    const updatedAt =
      isoFromAny(match?.updatedAt) ||
      isoFromAny(match?.finishedAt) ||
      createdAt;

    dedup.set(id, {
      id,
      sport,
      players,
      result: winner ? { winner } : match?.result || null,
      status: match?.status || (winner ? "finished" : "in_progress"),
      createdAt,
      updatedAt,
      payload: match?.payload || match || null,
      summary: match?.summary || null,
    });
  }

  return Array.from(dedup.values()).sort((a, b) => {
    const ta = new Date(a.updatedAt || a.createdAt || 0).getTime();
    const tb = new Date(b.updatedAt || b.createdAt || 0).getTime();
    return tb - ta;
  });
}

function aggregateStats(matches: any[]) {
  const byProfileSport = new Map<string, any>();

  for (const match of matches) {
    const sport = String(match?.sport || "unknown");
    const winner = match?.result?.winner || null;
    const ts = match?.updatedAt || match?.createdAt || new Date().toISOString();

    for (const profileId of safeArray<string>(match?.players)) {
      const key = `${profileId}::${sport}`;
      const row = byProfileSport.get(key) || {
        profileId,
        sport,
        matches: 0,
        wins: 0,
        losses: 0,
        lastMatchAt: ts,
      };
      row.matches += 1;
      if (winner && winner === profileId) row.wins += 1;
      if (winner && winner !== profileId) row.losses += 1;
      row.lastMatchAt = ts > row.lastMatchAt ? ts : row.lastMatchAt;
      row.winRate = row.matches > 0 ? Math.round((row.wins / row.matches) * 1000) / 10 : 0;
      byProfileSport.set(key, row);
    }
  }

  return Array.from(byProfileSport.values());
}

let running: Promise<any> | null = null;

export async function pushStoreToNas(opts?: { maxMatches?: number }) {
  if (!isNasSyncEnabled()) return { ok: false, skipped: true, reason: "disabled" };
  if (running) return running;

  running = (async () => {
    const store = await loadStore<any>();
    const profiles = safeArray(store?.profiles);
    const normalizedMatches = normalizeMatches(store).slice(0, opts?.maxMatches ?? 250);
    const statsRows = aggregateStats(normalizedMatches);

    for (const profile of profiles) {
      await nasApi.saveProfile({
        id: String(profile?.id || ""),
        name: String(profile?.name || "Sans nom"),
        avatar: profile?.avatarUrl || profile?.avatarDataUrl || null,
        avatarUrl: profile?.avatarUrl || null,
        avatarDataUrl: profile?.avatarDataUrl || null,
        favoriteDartSetId: profile?.favoriteDartSetId ?? null,
        stats: profile?.stats ?? null,
      });
    }

    for (const match of normalizedMatches) {
      await nasApi.saveMatch(match);
    }

    for (const row of statsRows) {
      await nasApi.saveStats(row.profileId, row.sport, row);
    }

    try {
      localStorage.setItem(
        "dc_nas_sync_last_success",
        JSON.stringify({
          at: new Date().toISOString(),
          baseUrl: nasApi.baseUrl,
          profiles: profiles.length,
          matches: normalizedMatches.length,
          stats: statsRows.length,
        })
      );
    } catch {}

    return {
      ok: true,
      profiles: profiles.length,
      matches: normalizedMatches.length,
      stats: statsRows.length,
      baseUrl: nasApi.baseUrl,
    };
  })();

  try {
    return await running;
  } finally {
    running = null;
  }
}
