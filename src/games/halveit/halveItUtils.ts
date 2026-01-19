// =============================================================
// src/games/halveit/halveItUtils.ts
// HALVE-IT — Utils
// =============================================================

import type { HalveItTarget, HalveItThrow, HalveItConfig } from "./halveItTypes";

export function defaultTargets(): HalveItTarget[] {
  // Standard populaire
  return [
    { kind: "number", value: 15 },
    { kind: "number", value: 16 },
    { kind: "double" },
    { kind: "number", value: 17 },
    { kind: "number", value: 18 },
    { kind: "number", value: 19 },
    { kind: "number", value: 20 },
    { kind: "bull" },
  ];
}

export function normalizeConfig(cfg: HalveItConfig): HalveItConfig {
  const dartsPerTurn = cfg.dartsPerTurn ?? 3;
  const bullCountsAs = cfg.bullCountsAs ?? "sb_or_db";
  const halveOnMiss = cfg.halveOnMiss ?? true;
  const maxRounds = cfg.maxRounds ?? cfg.targets?.length ?? 0;
  return {
    ...cfg,
    dartsPerTurn,
    bullCountsAs,
    halveOnMiss,
    maxRounds,
    targets: cfg.targets?.length ? cfg.targets : defaultTargets(),
    targetScore: cfg.targetScore ?? null,
  };
}

export function targetLabel(t: HalveItTarget): string {
  if (t.kind === "number") return String(t.value);
  if (t.kind === "double") return "D";
  if (t.kind === "triple") return "T";
  return "BULL";
}

// Parse de jet: "S20" | "D16" | "T5" | "SBULL" | "DBULL" | "0"
export function parseThrow(rawIn: string): HalveItThrow {
  const raw = String(rawIn ?? "").trim().toUpperCase();
  if (!raw || raw === "0" || raw === "MISS") {
    return { raw: raw || "0", mult: 0, value: 0, points: 0 };
  }
  if (raw === "SBULL" || raw === "SB" || raw === "BULL") {
    return { raw: "SBULL", mult: 1, value: 25, points: 25 };
  }
  if (raw === "DBULL" || raw === "DB") {
    return { raw: "DBULL", mult: 2, value: 25, points: 50 };
  }

  const m = raw.match(/^([SDT])\s*(\d{1,2})$/);
  if (!m) {
    // fallback strict
    return { raw, mult: 0, value: 0, points: 0 };
  }
  const multChar = m[1];
  const v = Number(m[2]);
  if (!Number.isFinite(v) || v < 1 || v > 20) return { raw, mult: 0, value: 0, points: 0 };

  const mult = multChar === "S" ? 1 : multChar === "D" ? 2 : 3;
  return { raw: `${multChar}${v}`, mult: mult as 1 | 2 | 3, value: v, points: v * mult };
}

export function isHitTarget(
  t: HalveItTarget,
  thr: HalveItThrow,
  cfg: HalveItConfig
): boolean {
  if (thr.points <= 0) return false;

  if (t.kind === "number") return thr.value === t.value;
  if (t.kind === "double") return thr.mult === 2;
  if (t.kind === "triple") return thr.mult === 3;

  // bull
  if (cfg.bullCountsAs === "sb") {
    return thr.raw === "SBULL";
  }
  return thr.raw === "SBULL" || thr.raw === "DBULL";
}

export function sumPoints(throwsArr: HalveItThrow[]): number {
  return throwsArr.reduce((a, b) => a + (b.points || 0), 0);
}
