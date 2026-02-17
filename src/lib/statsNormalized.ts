// =============================================================
// src/lib/statsNormalized.ts
// FONDATION STATS (PHASE 1) — Normalisation universelle des matchs
// Objectif : transformer n'importe quel SavedMatch (History legacy/V2/V3)
// en un format unique NormalizedMatch utilisable partout (StatsHub, Home,
// Leaderboards, DartSets, etc.).
//
// ✅ Safe / tolérant : ne crash jamais
// ✅ Ne remplace rien pour l’instant : ajoute juste une couche stable
// ✅ Source : History.list() (IDB + fallback localStorage déjà géré par History)
// =============================================================

import { History } from "./history";
import type { SavedMatch } from "./history";

/* =========================
   Types NORMALISÉS
========================= */

export type NormalizedMode =
  | "x01"
  | "cricket"
  | "killer"
  | "shanghai"
  | "territories"
  | "golf"
  | "batard"
  | "babyfoot"
  | "pingpong"
  | "petanque"
  | "clock"
  | "training"
  | "unknown";

export type NormalizedPlayer = {
  playerId: string;
  profileId?: string;
  name: string;
  isBot?: boolean;
  botLevel?: string;
  dartSetId?: string | null;
  avatarDataUrl?: string | null;
};

export type NormalizedVisit = {
  playerId: string;
  darts: number[]; // valeurs 0..60 (ou 25/50 si bull)
  score: number; // somme
  isCheckout?: boolean;
  isBust?: boolean;
  ts?: number;
};

export type NormalizedDart = {
  playerId: string;
  value: number; // 0..60 ou 25/50
  segment?: "S" | "D" | "T" | "B" | "DB";
  number?: number; // 1..20 ou 25 (bull)
};

export type NormalizedMatch = {
  id: string;
  mode: NormalizedMode;
  date: number;

  players: NormalizedPlayer[];

  // X01 : visits/darts souvent disponibles
  visits: NormalizedVisit[];
  darts: NormalizedDart[];

  // winner(s)
  winnerIds: string[];

  // raw hints (debug/compat)
  meta: {
    source: "history" | "idb" | "localStorage";
    version?: string;
    rawKind?: string;
    rawMode?: string;
  };

  // on garde un accès “à la demande” pour la PHASE 2 (agrégateurs)
  raw?: any;
};

/* =========================
   Helpers SAFE
========================= */

function N(x: any, d = 0) {
  const v = Number(x);
  return Number.isFinite(v) ? v : d;
}
function S(x: any, d = "") {
  if (x === undefined || x === null) return d;
  return String(x);
}
function A<T = any>(x: any): T[] {
  return Array.isArray(x) ? (x as T[]) : [];
}
function pickFirst<T>(...vals: any[]): T | null {
  for (const v of vals) if (v !== undefined && v !== null) return v as T;
  return null;
}
function safeId(rec: any) {
  const now = Date.now();
  return S(rec?.id || (crypto.randomUUID?.() ?? String(now)));
}

/* =========================
   Détection MODE tolérante
========================= */

export function detectNormalizedMode(rec: any): NormalizedMode {
  const rawKind = S(
    rec?.kind ||
      rec?.resume?.kind ||
      rec?.resume?.summary?.kind ||
      rec?.summary?.kind ||
      rec?.payload?.kind ||
      ""
  );
  const rawMode =
    S(
      rec?.game?.mode ||
        rec?.resume?.game?.mode ||
        rec?.mode ||
        rec?.resume?.mode ||
        rec?.summary?.mode ||
        rec?.payload?.mode ||
        rec?.payload?.summary?.mode ||
        rec?.resume?.summary?.mode ||
        ""
    ).toLowerCase();

  const k = rawKind.toLowerCase();

  if (k.includes("x01") || rawMode.includes("x01")) return "x01";
  if (k.includes("cricket") || rawMode.includes("cricket")) return "cricket";
  if (k.includes("killer") || rawMode.includes("killer")) return "killer";
  if (k.includes("shanghai") || rawMode.includes("shanghai")) return "shanghai";
  if (k.includes("territ") || rawMode.includes("territ")) return "territories";
  if (k.includes("golf") || rawMode.includes("golf")) return "golf";
  if (k.includes("batard") || rawMode.includes("batard")) return "batard";
  if (k.includes("baby") || rawMode.includes("baby")) return "babyfoot";
  if (k.includes("ping") || rawMode.includes("ping")) return "pingpong";
  if (k.includes("petanque") || rawMode.includes("petanque")) return "petanque";
  if (k.includes("clock") || rawMode.includes("horloge") || rawMode.includes("clock")) return "clock";
  if (k.includes("training") || rawMode.includes("training")) return "training";

  // fallback : certains anciens records ont kind "x01" sans mode
  if (k === "x01") return "x01";
  if (k === "cricket") return "cricket";
  if (k === "killer") return "killer";
  if (k === "shanghai") return "shanghai";
  if (k === "territories") return "territories";
  if (k === "golf") return "golf";
  if (k === "batard") return "batard";
  if (k === "babyfoot") return "babyfoot";
  if (k === "pingpong") return "pingpong";
  if (k === "petanque") return "petanque";
  if (k === "clock") return "clock";

  return "unknown";
}

/* =========================
   Extraction joueurs tolérante
========================= */

function extractPlayers(rec: any): NormalizedPlayer[] {
  const fromTop = A<any>(rec?.players);
  const fromPayload = A<any>(rec?.payload?.players);
  const fromResume = A<any>(rec?.resume?.players);
  const fromResumeCfg = A<any>(rec?.resume?.config?.players);
  const fromSummary = A<any>(rec?.summary?.players || rec?.summary?.perPlayer);
  const fromAny = fromTop.length
    ? fromTop
    : fromPayload.length
    ? fromPayload
    : fromResume.length
    ? fromResume
    : fromResumeCfg.length
    ? fromResumeCfg
    : fromSummary;

  // ✅ DartSet — priorités :
  // 1) payload.meta.dartSetIdsByPlayer / rec.meta.dartSetIdsByPlayer
  // 2) champs sur le joueur (dartSetId / favoriteDartSetId / dartPresetId)
  // 3) dartSetId global (payload/meta/top)
  const dartSetIdsByPlayer =
    (rec?.payload?.meta?.dartSetIdsByPlayer ??
      rec?.resume?.meta?.dartSetIdsByPlayer ??
      rec?.meta?.dartSetIdsByPlayer ??
      rec?.payload?.dartSetIdsByPlayer ??
      rec?.dartSetIdsByPlayer ??
      null) as any;

  const globalDartSetId =
    (rec?.payload?.meta?.dartSetId ??
      rec?.resume?.meta?.dartSetId ??
      rec?.meta?.dartSetId ??
      rec?.payload?.dartSetId ??
      rec?.dartSetId ??
      rec?.payload?.summary?.dartSetId ??
      rec?.summary?.dartSetId ??
      rec?.resume?.summary?.dartSetId ??
      rec?.payload?.config?.dartSetId ??
      rec?.resume?.config?.dartSetId ??
      null) as any;

  const out: NormalizedPlayer[] = [];

  for (const p of A<any>(fromAny)) {
    const id =
      S(p?.id || p?.playerId || p?.profileId || p?.pid || p?.uid || "") ||
      S(p?.name || "player");
    if (!id) continue;

    out.push({
      playerId: id,
      profileId: S(p?.profileId || p?.id || id),
      name: S(p?.name || "Joueur"),
      isBot: !!(p?.isBot || p?.bot),
      botLevel: S(p?.botLevel || p?.level || ""),
      dartSetId: (
        (dartSetIdsByPlayer && typeof dartSetIdsByPlayer === "object"
          ? (dartSetIdsByPlayer[String(id)] ?? dartSetIdsByPlayer[String(p?.profileId)] ?? null)
          : null) ??
        p?.dartSetId ??
        p?.favoriteDartSetId ??
        p?.dartPresetId ??
        globalDartSetId ??
        null
      ) as any,
      avatarDataUrl: (p?.avatarDataUrl ?? p?.avatar ?? null) as any,
    });
  }

  // filtre strict anti “ghost rows”
  return out.filter((p) => !!p.playerId && !!p.name);
}

/* =========================
   X01 — visits & darts (tolérant)
========================= */

type AnySeg = { v: number; mult?: 1 | 2 | 3 };
function dartValueFromSeg(seg?: AnySeg) {
  if (!seg) return 0;
  if (seg.v === 25 && seg.mult === 2) return 50;
  return N(seg.v) * N(seg.mult, 1);
}
function segToDart(playerId: string, seg: AnySeg): NormalizedDart {
  const v = N(seg?.v);
  const m = N(seg?.mult, 1) as 1 | 2 | 3;

  // bull
  if (v === 25) {
    if (m === 2) return { playerId, value: 50, segment: "DB", number: 25 };
    return { playerId, value: 25, segment: "B", number: 25 };
  }

  // classic number
  if (m === 3) return { playerId, value: v * 3, segment: "T", number: v };
  if (m === 2) return { playerId, value: v * 2, segment: "D", number: v };
  return { playerId, value: v, segment: "S", number: v };
}

// Essaie de trouver une liste de visits dans différents formats
function extractX01Visits(rec: any): any[] {
  // V3 souvent : payload.visits
  const v1 = A<any>(rec?.payload?.visits);
  if (v1.length) return v1;

  // parfois : rec.visits directement
  const v2 = A<any>(rec?.visits);
  if (v2.length) return v2;

  // parfois : payload.legs[].visits
  const legs = A<any>(rec?.payload?.legs);
  for (const leg of legs) {
    const vv = A<any>(leg?.visits);
    if (vv.length) return vv;
  }

  // legacy : summary.visits ?
  const v3 = A<any>(rec?.summary?.visits);
  if (v3.length) return v3;

  return [];
}

function normalizeX01(rec: any, base: Omit<NormalizedMatch, "visits" | "darts">): NormalizedMatch {
  const rawVisits = extractX01Visits(rec);

  const visits: NormalizedVisit[] = [];
  const darts: NormalizedDart[] = [];

  for (const v of A<any>(rawVisits)) {
    // formats possibles :
    // - { p: "id", segments:[{v,mult}], score, bust, isCheckout, ts }
    // - { playerId, segments, score, bust, isCheckout, ts }
    const pid = S(v?.p || v?.playerId || v?.pid || "");
    if (!pid) continue;

    const segs: AnySeg[] = A<any>(v?.segments || v?.segs);
    const values = segs.map(dartValueFromSeg).filter((x) => Number.isFinite(x));
    const score = N(v?.score, values.reduce((a, b) => a + b, 0));

    visits.push({
      playerId: pid,
      darts: values,
      score,
      isBust: !!(v?.bust || v?.isBust),
      isCheckout: !!(v?.isCheckout || v?.checkout),
      ts: N(v?.ts || v?.t || v?.time, 0) || undefined,
    });

    for (const s of segs) {
      if (!s) continue;
      darts.push(segToDart(pid, s));
    }
  }

  // fallback minimal : si pas de visits mais liveStatsByPlayer existe, on garde au moins players/date/winner
  return {
    ...base,
    visits,
    darts,
  };
}

/* =========================
   CRICKET — darts (à partir de hits)
========================= */

function normalizeCricket(rec: any, base: Omit<NormalizedMatch, "visits" | "darts">): NormalizedMatch {
  const darts: NormalizedDart[] = [];
  const visits: NormalizedVisit[] = []; // pas vital en cricket (on bossera sur hits/legStats en PHASE 2)

  // payload.players[].hits (format StatsCricket)
  const players = A<any>(rec?.payload?.players);
  for (const p of players) {
    const pid = S(p?.id || p?.playerId || "");
    if (!pid) continue;

    const hits = A<any>(p?.hits);
    for (const h of hits) {
      const target = N(h?.target, 0); // 15-20 ou 25
      const mult = N(h?.multiplier, 1) as 1 | 2 | 3;

      // bull
      if (target === 25) {
        if (mult === 2) darts.push({ playerId: pid, value: 50, segment: "DB", number: 25 });
        else darts.push({ playerId: pid, value: 25, segment: "B", number: 25 });
        continue;
      }

      // cible classique (15-20)
      const seg: "S" | "D" | "T" = mult === 3 ? "T" : mult === 2 ? "D" : "S";
      darts.push({ playerId: pid, value: target * mult, segment: seg, number: target });
    }
  }

  return {
    ...base,
    visits,
    darts,
  };
}

/* =========================
   KILLER — minimal (stats détaillées via summary en PHASE 2)
========================= */

function normalizeKiller(rec: any, base: Omit<NormalizedMatch, "visits" | "darts">): NormalizedMatch {
  // KillerPlay sauve surtout summary.perPlayer + detailedByPlayer
  // => on gardera rec.raw pour l’agrégateur killer existant.
  return {
    ...base,
    visits: [],
    darts: [],
  };
}


function normalizeGeneric(rec: any, base: any): NormalizedMatch | null {
  try {
    const stats = rec?.payload?.stats || rec?.summary?.stats || rec?.payload?.summary?.stats || null;

    const players: NormalizedPlayer[] = (rec?.players || []).map((p: any) => ({
      playerId: String(p?.id ?? p?.playerId ?? p?.profileId ?? ""),
      profileId: String(p?.id ?? p?.profileId ?? ""),
      name: String(p?.name ?? "—"),
      isBot: !!p?.isBot,
      botLevel: p?.botLevel,
      dartSetId: p?.dartSetId ?? p?.dartPresetId ?? null,
      avatarDataUrl: p?.avatarDataUrl ?? null,
    })).filter((p: any) => p.playerId);

    const winnerIds: string[] = [];
    const wid = rec?.winnerId ?? stats?.global?.winnerId ?? stats?.winnerId ?? null;
    if (wid) winnerIds.push(String(wid));

    return {
      ...base,
      players,
      visits: [],
      darts: [],
      winnerIds,
      meta: {
        ...base.meta,
        raw: rec,
        stats,
      },
    } as NormalizedMatch;
  } catch {
    return null;
  }
}

function normalizeUnknown(rec: any, base: Omit<NormalizedMatch, "visits" | "darts">): NormalizedMatch {
  return {
    ...base,
    visits: [],
    darts: [],
  };
}

/* =========================
   Normalisation 1 record
========================= */

export function normalizeOne(rec: SavedMatch | any): NormalizedMatch | null {
  try {
    if (!rec) return null;

    const id = safeId(rec);

    const date =
      N(
        rec?.updatedAt,
        N(rec?.finishedAt, 0),
        N(rec?.createdAt, 0),
        N(rec?.ts, 0),
        N(rec?.date, 0),
        N(rec?.payload?.updatedAt, 0),
        N(rec?.payload?.finishedAt, 0),
        N(rec?.payload?.createdAt, 0)
      ) || Date.now();

    const mode = detectNormalizedMode(rec);

    const players = extractPlayers(rec);
    const winnerIds = A<string>(
      pickFirst<any[]>(
        rec?.winnerIds,
        rec?.summary?.winnerIds,
        rec?.payload?.winnerIds
      ) || []
    );

    const winnerId = S(rec?.winnerId || rec?.summary?.winnerId || rec?.payload?.winnerId || "");
    const winners = winnerIds.length ? winnerIds : winnerId ? [winnerId] : [];

// ✅ Fallback winners depuis payload.stats unifié (players[].win)
if (!winners.length) {
  try {
    const uPlayers =
      rec?.payload?.stats?.players ||
      rec?.payload?.payload?.stats?.players ||
      rec?.payload?.summary?.stats?.players ||
      rec?.stats?.players ||
      null;
    if (Array.isArray(uPlayers)) {
      const w2 = uPlayers
        .filter((p: any) => !!p?.win)
        .map((p: any) => String(p?.id ?? p?.profileId ?? "").trim())
        .filter(Boolean);
      if (w2.length) {
        (winners as any).push(...Array.from(new Set(w2)));
      }
    }
  } catch {}
}

    const base: Omit<NormalizedMatch, "visits" | "darts"> = {
      id,
      mode,
      date,
      players,
      winnerIds: winners,
      meta: {
        source: "history",
        version: S(rec?.version || rec?.summary?.version || rec?.payload?.version || ""),
        rawKind: S(rec?.kind || ""),
        rawMode: S(rec?.game?.mode || rec?.mode || rec?.summary?.mode || rec?.payload?.mode || ""),
      },
      raw: rec, // gardé pour agrégateurs PHASE 2 (killer/cricket legacy)
    };

    if (mode === "x01") return normalizeX01(rec, base);
    if (mode === "cricket") return normalizeCricket(rec, base);
    if (mode === "killer") return normalizeKiller(rec, base);
    if (mode === "training") return normalizeUnknown(rec, base);

    // autres modes : normalisation minimale + stats unifiées si dispo
    return normalizeGeneric(rec, base) || normalizeUnknown(rec, base);
  } catch {
    return null;
  }
}

/* =========================
   Normalisation liste
========================= */

export function normalizeMany(recs: Array<SavedMatch | any>): NormalizedMatch[] {
  return A<any>(recs)
    .map(normalizeOne)
    .filter(Boolean) as NormalizedMatch[];
}

/* =========================
   Loader officiel (pour PHASE 2+)
========================= */

export async function loadNormalizedHistory(): Promise<NormalizedMatch[]> {
  try {
    let rows: any[] = (await History.list()) as any[];

    // =====================================================
    // ✅ PATCH (CRITICAL): KPI vides sur mobile
    // -----------------------------------------------------
    // Dans certaines versions, History.list() renvoie une version
    // "lite" (perf) qui ne décode pas le payload X01.
    // Or la normalisation X01 dépend du payload (visits/darts/hits).
    // Résultat: normalizeX01() voit visits=[] -> KPI + radar = 0.
    //
    // Ici, dans le pipeline STATS uniquement, on hydrate best-effort
    // le payload via History.get(id) pour X01/Cricket.
    // Cap + concurrence pour éviter tout freeze.
    // =====================================================
    try {
      const NEED = new Set<NormalizedMode>([
        "x01",
        "cricket",
        "killer",
        "shanghai",
        "territories",
        "golf",
        "batard",
        "babyfoot",
        "pingpong",
        "petanque",
        "clock",
        "training",
      ]);

      // ⚠️ IMPORTANT: certains records récents stockent l'info de mode/kind dans `resume`.
      // On s'appuie donc sur detectNormalizedMode() plutôt que r.kind/r.mode bruts.
      const candidates = (rows || [])
        .filter((r: any) => r && NEED.has(detectNormalizedMode(r)))
        .filter((r: any) => r.payload == null);

      const MAX_HYDRATE = 260;
      const toHydrate = candidates.slice(0, MAX_HYDRATE);

      if (toHydrate.length) {
        const byId = new Map<string, any>((rows || []).map((r: any) => [String(r?.id ?? ""), r]));

        const CONCURRENCY = 6;
        let i = 0;
        const workers = Array.from(
          { length: Math.min(CONCURRENCY, toHydrate.length) },
          async () => {
            while (i < toHydrate.length) {
              const idx = i++;
              const r = toHydrate[idx];
              const id = String(r?.id ?? r?.matchId ?? "");
              if (!id) continue;
              try {
                const full = (await History.get(id).catch(() => null as any)) as any;
                if (full && full.payload != null) {
                  const cur = byId.get(id) || r;
                  byId.set(id, { ...cur, payload: full.payload });
                }
              } catch {
                // ignore
              }
            }
          }
        );

        await Promise.all(workers);
        rows = Array.from(byId.values());
      }
    } catch {
      // ignore hydration failures
    }

    return normalizeMany(rows as any[]);
  } catch {
    return [];
  }
}
