// @ts-nocheck
// =============================================================
// src/lib/hitsBySegment.ts
// Helper simple pour accumuler les hits par segment (S20/T8/DB...)
// - Fonctionne multi: map par playerId
// - Normalise bull/DBull
// - Exporte une structure prête à injecter dans summary.perPlayer[pid].hitsBySegment
// =============================================================

export type HitsBySegmentMap = Record<string, Record<string, number>>;

export function normalizeSegmentKey(raw: any): string {
  const s = String(raw ?? "").trim().toUpperCase();
  if (!s) return "";

  // Bulls
  if (s === "B" || s === "BULL" || s === "SB" || s === "S25" || s === "25") return "SB";
  if (s === "DBULL" || s === "DB" || s === "D25" || s === "50") return "DB";

  // Formats classiques: S20 / D8 / T19
  const m = s.match(/^([SDT])\s*([0-9]{1,2})$/);
  if (m) return `${m[1]}${String(Number(m[2]))}`;

  // Formats "sales": S-20, T_20, D 16, etc.
  const m2 = s.replace(/[^A-Z0-9]/g, "").match(/^([SDT])([0-9]{1,2})$/);
  if (m2) return `${m2[1]}${String(Number(m2[2]))}`;

  return s;
}

// Construit une clé segment depuis une dart “typique” :
// - { mult: 1|2|3, n: 20 } -> S20/D20/T20
// - { ring: "S"|"D"|"T", number: 8 } -> T8
// - bull -> SB/DB
export function segmentKeyFromDart(d: any): string {
  if (!d) return "";

  // bull flags divers
  if (d.isDBull || d.dbull || d.doubleBull || d.ring === "DB" || d.seg === "DB") return "DB";
  if (d.isBull || d.bull || d.singleBull || d.ring === "SB" || d.seg === "SB") return "SB";

  // déjà une clé prête
  if (typeof d.segment === "string") return normalizeSegmentKey(d.segment);
  if (typeof d.seg === "string") return normalizeSegmentKey(d.seg);

  // ring+number
  const ring = (d.ring || d.multLabel || d.mult || "").toString().toUpperCase();
  const number = Number(d.number ?? d.n ?? d.value ?? d.num);
  if (Number.isFinite(number) && number > 0) {
    if (ring === "S" || ring === "D" || ring === "T") return `${ring}${number}`;
    // mult: 1/2/3
    const m = Number(d.mult);
    if (m === 1) return `S${number}`;
    if (m === 2) return `D${number}`;
    if (m === 3) return `T${number}`;
  }

  return "";
}

export function createHitsAccumulator() {
  const hitsByPlayer: HitsBySegmentMap = {};

  const ensure = (pid: string) => {
    if (!hitsByPlayer[pid]) hitsByPlayer[pid] = {};
    return hitsByPlayer[pid];
  };

  return {
    add(pid: string, segment: any) {
      const id = String(pid || "").trim();
      if (!id) return;
      const key = normalizeSegmentKey(segment);
      if (!key) return;
      const map = ensure(id);
      map[key] = (map[key] || 0) + 1;
    },

    addFromDart(pid: string, dart: any) {
      const seg = segmentKeyFromDart(dart);
      if (!seg) return;
      this.add(pid, seg);
    },

    // pour debug/inspection
    getAll(): HitsBySegmentMap {
      return hitsByPlayer;
    },

    // copie safe
    toJSON(): HitsBySegmentMap {
      const out: HitsBySegmentMap = {};
      for (const pid of Object.keys(hitsByPlayer)) out[pid] = { ...hitsByPlayer[pid] };
      return out;
    },
  };
}
