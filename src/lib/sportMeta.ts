// ============================================
// src/lib/sportMeta.ts
// Meta UI par sport (labels, titres, badges)
// ============================================

export type SportId = "darts" | "petanque" | "pingpong" | "babyfoot";

export function sportLabel(s: SportId) {
  switch (s) {
    case "petanque":
      return "PÉTANQUE";
    case "pingpong":
      return "PING-PONG";
    case "babyfoot":
      return "BABYFOOT";
    default:
      return "DARTS";
  }
}

export function sportHomeSubtitle(s: SportId) {
  switch (s) {
    case "petanque":
      return "Tableau de bord — Pétanque";
    case "pingpong":
      return "Tableau de bord — Ping-Pong";
    case "babyfoot":
      return "Tableau de bord — Babyfoot";
    default:
      return "Tableau de bord — Darts";
  }
}
