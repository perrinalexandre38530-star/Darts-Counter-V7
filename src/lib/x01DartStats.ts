// =============================================================
// src/lib/x01DartStats.ts
// Helpers pour calculer les stats détaillées X01 par joueur
// - hitsS / hitsD / hitsT / miss / bull / dBull / bust
// - bySegmentS / bySegmentD / bySegmentT
// - dartsDetail (liste de darts normalisés)
// =============================================================

export type AnyDart = {
    v?: number;          // segment (1-20, 25)
    value?: number;
    segment?: number;
    s?: number;
  
    mult?: number;       // 0,1,2,3 ou "S" | "D" | "T"
    m?: number | string;
    multiplier?: number | string;
    type?: number | string;
  
    kind?: string;       // "miss" / "bust" / "hit" selon ton moteur
    isMiss?: boolean;
    isBust?: boolean;
  };
  
  export type X01DartDetail = {
    v: number;          // 1-20, 25
    mult: 0 | 1 | 2 | 3;
  };
  
  export type X01DartCounters = {
    darts: number;
    hitsS: number;
    hitsD: number;
    hitsT: number;
    miss: number;
    bull: number;
    dBull: number;
    bust: number;
  
    bySegmentS: Record<string, number>;
    bySegmentD: Record<string, number>;
    bySegmentT: Record<string, number>;
  
    dartsDetail: X01DartDetail[];
  };
  
  // --------- normalisation ---------
  
  function normMult(raw: any): 0 | 1 | 2 | 3 {
    if (raw === "S") return 1;
    if (raw === "D") return 2;
    if (raw === "T") return 3;
    const n = Number(raw) || 0;
    if (n === 1 || n === 2 || n === 3) return n;
    return 0;
  }
  
  function normValue(raw: any): number {
    const n = Number(raw) || 0;
    return n;
  }
  
  export function normalizeAnyDart(d: AnyDart | any): X01DartDetail | null {
    if (!d) return null;
  
    const vRaw =
      (d as any).v ??
      (d as any).value ??
      (d as any).segment ??
      (d as any).s;
  
    const mRaw =
      (d as any).mult ??
      (d as any).m ??
      (d as any).multiplier ??
      (d as any).type;
  
    const v = normValue(vRaw);
    const mult = normMult(mRaw);
  
    if (!Number.isFinite(v) || v < 0) return null;
  
    return { v, mult };
  }
  
  // --------- accumulateurs ---------
  
  export function buildX01DartCountersFromList(
    rawDarts: AnyDart[] | any[],
  ): X01DartCounters {
    const counters: X01DartCounters = {
      darts: 0,
      hitsS: 0,
      hitsD: 0,
      hitsT: 0,
      miss: 0,
      bull: 0,
      dBull: 0,
      bust: 0,
      bySegmentS: {},
      bySegmentD: {},
      bySegmentT: {},
      dartsDetail: [],
    };
  
    for (const raw of rawDarts || []) {
      const nd = normalizeAnyDart(raw);
      if (!nd) {
        // si ton moteur marque explicitement les miss/bust sur le dart,
        // tu peux brancher ici d.kind / d.isMiss / d.isBust
        continue;
      }
  
      counters.darts++;
  
      const seg = nd.v;
      const mult = nd.mult;
  
      // bull / dBull
      if (seg === 25) {
        if (mult === 2) counters.dBull++;
        else counters.bull++;
      }
  
      if (mult === 0) {
        counters.miss++;
      } else if (mult === 1) {
        counters.hitsS++;
        const k = String(seg);
        counters.bySegmentS[k] = (counters.bySegmentS[k] || 0) + 1;
      } else if (mult === 2) {
        counters.hitsD++;
        const k = String(seg);
        counters.bySegmentD[k] = (counters.bySegmentD[k] || 0) + 1;
      } else if (mult === 3) {
        counters.hitsT++;
        const k = String(seg);
        counters.bySegmentT[k] = (counters.bySegmentT[k] || 0) + 1;
      }
  
      counters.dartsDetail.push(nd);
    }
  
    return counters;
  }
  
  // Exemple d’API plus complète si tu as la notion de "bust" par volée
  export function addBustsToCounters(
    counters: X01DartCounters,
    bustCount: number,
  ) {
    counters.bust += bustCount || 0;
  }
  