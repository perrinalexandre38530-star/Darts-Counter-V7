// @ts-nocheck
// =============================================================
// src/lib/statsKillerAgg.ts
// Agrégateur KILLER (robuste V1/V2/V3)
// - Lit records history (memHistory, store.history, IDB History)
// - Extrait perPlayer (summary.perPlayer / detailedByPlayer / fallback players)
// - Calcule : played, wins, winRate, kills, hits total, favSegment/favNumber
// =============================================================

export type KillerAggRow = {
    playerId: string;
    name?: string;
    avatarDataUrl?: string | null;
  
    played: number;
    wins: number;
    winRate: number;
  
    kills: number;
  
    totalHits: number;
    favSegment: string;
    favSegmentHits: number;
    favNumber: number; // 1..20 ou 25, 0 si inconnu
    favNumberHits: number;
  };
  
  function safeStr(v: any): string {
    if (v === undefined || v === null) return "";
    return String(v);
  }
  
  function numOr0(...values: any[]): number {
    for (const v of values) {
      if (v === undefined || v === null) continue;
      const n = Number(v);
      if (Number.isFinite(n)) return n;
    }
    return 0;
  }
  
  function pickId(obj: any): string {
    if (!obj) return "";
    return obj.profileId || obj.playerId || obj.pid || obj.id || obj._id || obj.uid || "";
  }
  
  function pickName(obj: any): string {
    if (!obj) return "";
    return obj.name || obj.playerName || obj.profileName || obj.label || obj.nickname || obj.displayName || "";
  }
  
  function pickAvatar(obj: any): string | null {
    if (!obj) return null;
    return (
      obj.avatarDataUrl ||
      obj.avatar_data_url ||
      obj.avatar ||
      obj.avatarUrl ||
      obj.avatarURL ||
      obj.avatarBase64 ||
      obj.avatar_b64 ||
      obj.dataUrl ||
      obj.dataURL ||
      obj.photoDataUrl ||
      obj.photo ||
      null
    );
  }
  
  function extractPerPlayerSummary(summary: any): Record<string, any> {
    if (!summary) return {};
    if (summary.detailedByPlayer && typeof summary.detailedByPlayer === "object") return summary.detailedByPlayer;
  
    const out: Record<string, any> = {};
    if (Array.isArray(summary.perPlayer)) {
      for (const p of summary.perPlayer) {
        const pid = pickId(p) || safeStr(p?.id);
        if (!pid) continue;
        out[pid] = p;
      }
      if (Object.keys(out).length) return out;
    }
  
    // fallback old shapes
    if (summary.players && typeof summary.players === "object") {
      for (const [pid, p] of Object.entries(summary.players)) out[String(pid)] = p as any;
      if (Object.keys(out).length) return out;
    }
  
    return {};
  }
  
  function parseSegmentKeyToNumber(segKey: string): number {
    const k = safeStr(segKey).toUpperCase();
    if (k === "SB" || k === "BULL") return 25;
    if (k === "DB" || k === "DBULL") return 25;
    const m = k.match(/^([SDT])(\d{1,2})$/);
    if (m) {
      const n = Number(m[2]);
      if (n >= 1 && n <= 20) return n;
    }
    return 0;
  }
  
  function computeFavsFromHitsMap(hitsBySegment: any) {
    const segCounts: Record<string, number> = {};
    const numCounts: Record<string, number> = {};
    let totalHits = 0;
  
    if (hitsBySegment && typeof hitsBySegment === "object") {
      for (const [k0, v0] of Object.entries(hitsBySegment)) {
        const k = safeStr(k0).toUpperCase();
        const c = numOr0(v0);
        if (c <= 0) continue;
  
        segCounts[k] = (segCounts[k] || 0) + c;
        totalHits += c;
  
        const n = parseSegmentKeyToNumber(k);
        if (n > 0) {
          const nk = String(n);
          numCounts[nk] = (numCounts[nk] || 0) + c;
        }
      }
    }
  
    let favSegment = "";
    let favSegmentHits = 0;
    for (const [k, c] of Object.entries(segCounts)) {
      if (c > favSegmentHits) {
        favSegmentHits = c;
        favSegment = k;
      }
    }
  
    let favNumber = 0;
    let favNumberHits = 0;
    for (const [nk, c] of Object.entries(numCounts)) {
      const n = Number(nk);
      if (c > favNumberHits) {
        favNumberHits = c;
        favNumber = n;
      }
    }
  
    return { favSegment, favSegmentHits, favNumber, favNumberHits, totalHits };
  }
  
  function isKillerRecord(r: any): boolean {
    const kind = r?.kind || r?.payload?.kind || r?.summary?.kind;
    const game = r?.payload?.game || r?.summary?.game?.mode || r?.summary?.game?.game;
    const payloadMode = r?.payload?.mode;
    return kind === "killer" || game === "killer" || payloadMode === "killer";
  }
  
  export function computeKillerAgg(
    history: any[],
    profiles: any[] = [],
    botsMap: Record<string, { name?: string; avatarDataUrl?: string | null }> = {}
  ): Record<string, KillerAggRow> {
    const byId: Record<string, KillerAggRow> = {};
    const profileById: Record<string, any> = {};
    for (const p of profiles || []) profileById[p.id] = p;
  
    const ensure = (pid: string) => {
      if (byId[pid]) return byId[pid];
      const prof = profileById[pid];
      const bot = botsMap?.[pid];
      byId[pid] = {
        playerId: pid,
        name: prof?.name || bot?.name || "",
        avatarDataUrl: (prof as any)?.avatarDataUrl ?? (prof as any)?.avatar ?? bot?.avatarDataUrl ?? null,
        played: 0,
        wins: 0,
        winRate: 0,
        kills: 0,
        totalHits: 0,
        favSegment: "",
        favSegmentHits: 0,
        favNumber: 0,
        favNumberHits: 0,
      };
      return byId[pid];
    };
  
    // hits temp agg (par joueur)
    const hitsAgg: Record<string, Record<string, number>> = {};
  
    for (const rec of history || []) {
      if (!rec || !isKillerRecord(rec)) continue;
  
      const winnerId = rec?.winnerId || rec?.payload?.winnerId || rec?.summary?.winnerId || rec?.payload?.summary?.winnerId || null;
  
      // prefer summary perPlayer
      const summary = rec?.summary || rec?.payload?.summary || null;
      const per = extractPerPlayerSummary(summary);
  
      if (per && Object.keys(per).length) {
        // kills parfois dans summary.players array
        const summaryPlayersArr: any[] = Array.isArray(summary?.players) ? summary.players : [];
  
        for (const key of Object.keys(per)) {
          const det: any = per[key] || {};
          const pid = pickId(det) || key;
          if (!pid) continue;
  
          const row = ensure(pid);
          row.played += 1;
          if (winnerId && winnerId === pid) row.wins += 1;
  
          // name/avatar fallback (si absent)
          if (!row.name) row.name = pickName(det) || botsMap?.[pid]?.name || row.name || "";
          if (!row.avatarDataUrl) row.avatarDataUrl = pickAvatar(det) || botsMap?.[pid]?.avatarDataUrl || null;
  
          // kills
          let k = 0;
          if (summaryPlayersArr.length) {
            const sp = summaryPlayersArr.find((x) => String(pickId(x) || x?.id) === String(pid));
            if (sp) k = numOr0(sp.kills, sp.killCount, sp.k);
          }
          if (!k) k = numOr0(det.kills, det.killCount, det.k);
          row.kills += k;
  
          // hits
          const hbs = det.hitsBySegment || det.hits_by_segment || det.hits || null;
          if (hbs && typeof hbs === "object") {
            if (!hitsAgg[pid]) hitsAgg[pid] = {};
            for (const [seg, c0] of Object.entries(hbs)) {
              const c = numOr0(c0);
              if (c <= 0) continue;
              const s = safeStr(seg).toUpperCase();
              hitsAgg[pid][s] = (hitsAgg[pid][s] || 0) + c;
            }
          }
        }
  
        continue;
      }
  
      // fallback players array (moins riche)
      const playersArr: any[] = Array.isArray(rec?.players)
        ? rec.players
        : Array.isArray(rec?.payload?.players)
        ? rec.payload.players
        : Array.isArray(rec?.payload?.summary?.players)
        ? rec.payload.summary.players
        : [];
  
      for (const pl of playersArr) {
        const pid = pickId(pl);
        if (!pid) continue;
        const row = ensure(pid);
  
        row.played += 1;
        if (winnerId && winnerId === pid) row.wins += 1;
  
        if (!row.name) row.name = pickName(pl) || botsMap?.[pid]?.name || "";
        if (!row.avatarDataUrl) row.avatarDataUrl = pickAvatar(pl) || botsMap?.[pid]?.avatarDataUrl || null;
  
        const k = numOr0(pl.kills, pl.killCount, pl.k);
        row.kills += k;
      }
    }
  
    // finalize favs + winRate
    for (const pid of Object.keys(byId)) {
      const row = byId[pid];
      row.winRate = row.played > 0 ? (row.wins / row.played) * 100 : 0;
  
      const fav = computeFavsFromHitsMap(hitsAgg[pid]);
      row.totalHits = fav.totalHits || 0;
      row.favSegment = fav.favSegment || "";
      row.favSegmentHits = fav.favSegmentHits || 0;
      row.favNumber = fav.favNumber || 0;
      row.favNumberHits = fav.favNumberHits || 0;
    }
  
    return byId;
  }

  // =============================================================
// Helper "par joueur" (pour StatsHub / Dashboard)
// - Ne casse pas l'API existante computeKillerAgg(history, profiles, botsMap)
// =============================================================

export type KillerAggPlayer = {
  matches: number;
  wins: number;
  winRate: number;
  kills: number;
  totalHits: number;
  favSegment: string;
  favSegmentHits: number;
  favNumber: number;
  favNumberHits: number;
};

export function computeKillerAggForPlayer(
  history: any[],
  playerId: string,
  profiles: any[] = [],
  botsMap: Record<string, { name?: string; avatarDataUrl?: string | null }> = {}
): KillerAggPlayer {
  const byId = computeKillerAgg(history || [], profiles || [], botsMap || {});
  const row = byId?.[String(playerId)];

  const matches = numOr0(row?.played);
  const wins = numOr0(row?.wins);
  const winRate = matches > 0 ? Math.round((wins / matches) * 100) : 0;

  return {
    matches,
    wins,
    winRate,
    kills: numOr0(row?.kills),
    totalHits: numOr0(row?.totalHits),
    favSegment: safeStr(row?.favSegment),
    favSegmentHits: numOr0(row?.favSegmentHits),
    favNumber: numOr0(row?.favNumber),
    favNumberHits: numOr0(row?.favNumberHits),
  };
}

  