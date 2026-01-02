// =============================================================
// src/lib/x01v3/x01CheckoutV3.ts
// Helper de suggestion de check-out pour X01 V3
// - BULL = 25, DBull = 50
// - outMode : "simple" | "double" | "master"
// - dartsLeft : 1 | 2 | 3
// - Retourne au maximum 3 fléchettes, toujours avec une dernière
//   fléchette valide selon le mode de sortie.
// =============================================================

export type X01OutModeV3 = "simple" | "double" | "master";

export type X01DartSuggestionV3 = {
  segment: number; // 1–20 ou 25 (Bull)
  multiplier: 0 | 1 | 2 | 3; // 0 = miss (normalement pas utilisé ici)
};

export type X01CheckoutSuggestionV3 = {
  score: number;
  darts: X01DartSuggestionV3[];
};

type DartDef = {
  seg: number; // 1–20 ou 25
  mul: 1 | 2 | 3;
  value: number;
  kind: "single" | "double" | "triple";
};

// ----------- Génération du catalogue de fléchettes possibles -----------

const SEGMENTS = [
  20, 19, 18, 17, 16, 15, 14, 13, 12, 11,
  10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 25,
];

function buildAllDarts(): DartDef[] {
  const res: DartDef[] = [];

  for (const seg of SEGMENTS) {
    // simple
    res.push({
      seg,
      mul: 1,
      value: seg === 25 ? 25 : seg,
      kind: "single",
    });

    // double
    res.push({
      seg,
      mul: 2,
      value: (seg === 25 ? 25 : seg) * 2,
      kind: "double",
    });

    // triple (uniquement 1–20)
    if (seg !== 25) {
      res.push({
        seg,
        mul: 3,
        value: seg * 3,
        kind: "triple",
      });
    }
  }

  return res;
}

const ALL_DARTS: DartDef[] = buildAllDarts();

// Darts pouvant terminer le leg selon le outMode
function isValidFinisher(dart: DartDef, outMode: X01OutModeV3): boolean {
  if (outMode === "simple") {
    // tout est autorisé pour finir
    return true;
  }
  if (outMode === "double") {
    // uniquement double (y compris DBull)
    return dart.kind === "double";
  }
  // master-out : double, triple, DBull
  return dart.kind === "double" || dart.kind === "triple";
}

// ----------- Conversion en suggestion -----------

function toSuggestion(
  darts: DartDef[],
  score: number
): X01CheckoutSuggestionV3 {
  return {
    score,
    darts: darts.map((d) => ({
      segment: d.seg,
      multiplier: d.mul,
    })),
  };
}

/**
 * Implémentation principale : check-out adaptatif.
 */
export function getAdaptiveCheckoutSuggestionV3(params: {
  score: number;
  dartsLeft: number; // 1–3
  outMode: X01OutModeV3;
}): X01CheckoutSuggestionV3 | null {
  const { score, dartsLeft, outMode } = params;

  // Pas de finish raisonnable au-delà de 170
  if (score <= 0 || score > 170) return null;

  const maxDarts = Math.min(3, Math.max(1, dartsLeft));

  // Liste des finishers possibles (dernière fléchette)
  const finishers = ALL_DARTS.filter((d) => isValidFinisher(d, outMode));

  // ===== 1 dart =====
  if (maxDarts >= 1) {
    const one = finishers.find((d) => d.value === score);
    if (one) {
      return toSuggestion([one], score);
    }
  }

  // ===== 2 darts =====
  if (maxDarts >= 2) {
    for (const first of ALL_DARTS) {
      const remaining = score - first.value;
      if (remaining <= 0) continue;

      const fin = finishers.find((d) => d.value === remaining);
      if (fin) {
        return toSuggestion([first, fin], score);
      }
    }
  }

  // ===== 3 darts =====
  if (maxDarts >= 3) {
    for (const first of ALL_DARTS) {
      const afterFirst = score - first.value;
      if (afterFirst <= 0) continue;

      for (const second of ALL_DARTS) {
        const remaining = afterFirst - second.value;
        if (remaining <= 0) continue;

        const fin = finishers.find((d) => d.value === remaining);
        if (fin) {
          return toSuggestion([first, second, fin], score);
        }
      }
    }
  }

  // Aucun finish trouvé
  return null;
}

/**
 * Alias sans suffixe, au cas où on l’importe sous le nom
 * getAdaptiveCheckoutSuggestion.
 */
export const getAdaptiveCheckoutSuggestion = getAdaptiveCheckoutSuggestionV3;

/**
 * Petit adaptateur pratique pour le moteur X01 V3.
 * (tu peux l’appeler depuis useX01EngineV3.ts)
 */
export function extAdaptCheckoutSuggestion(params: {
  score: number;
  dartsLeft: number;
  outMode: X01OutModeV3;
}): X01CheckoutSuggestionV3 | null {
  return getAdaptiveCheckoutSuggestionV3(params);
}
