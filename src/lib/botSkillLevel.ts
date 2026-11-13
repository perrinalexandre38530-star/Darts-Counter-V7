// One canonical bot star-to-difficulty translation shared by the selection UI and gameplay.
export function resolveBotLevelValue(raw: any): number {
  if (typeof raw === "number" && Number.isFinite(raw)) {
    // Les anciens objets peuvent stocker soit un niveau /5, soit une note /100.
    const normalized = raw > 5 ? raw / 20 : raw;
    return Math.max(0, Math.min(5, Math.round(normalized * 2) / 2));
  }
  const s = String(raw ?? "").trim().toLowerCase().replace(",", ".");
  if (!s) return 0;
  const fraction = s.match(/(\d+(?:\.\d+)?)\s*\/\s*5/);
  if (fraction) {
    const n = Number(fraction[1]);
    if (Number.isFinite(n) && n > 0) return Math.max(0, Math.min(5, Math.round(n * 2) / 2));
  }
  const n = Number((s.match(/\d+(?:\.5)?/) || [""])[0]);
  if (Number.isFinite(n) && n > 0) {
    const normalized = n > 5 ? n / 20 : n;
    return Math.max(0, Math.min(5, Math.round(normalized * 2) / 2));
  }
  if (s.includes("elite") || s.includes("legend") || s.includes("légende") || s.includes("legende")) return 5;
  if (s.includes("pro")) return 4.5;
  if (s.includes("challenger")) return 4;
  if (s.includes("mixte") || s.includes("mix")) return 3.5;
  if (s.includes("rising")) return 3;
  if (s.includes("strong") || s.includes("fort") || s.includes("hard") || s.includes("difficile")) return 3;
  if (s.includes("medium") || s.includes("standard") || s.includes("normal") || s.includes("moyen")) return 2;
  if (s.includes("easy") || s.includes("facile") || s.includes("beginner") || s.includes("debutant") || s.includes("débutant") || s.includes("rookie")) return 1;
  return 0;
}

export function resolveBotStars(bot: any): number {
  const candidates = [
    bot?.profileStarring,
    bot?.starring,
    bot?.stars,
    bot?.bssStars,
    bot?.botLevel,
    bot?.level,
    bot?.difficulty,
    bot?.skill,
    bot?.rating,
    bot?.avg3D,
    bot?.avg3d,
    bot?.stats?.avg3D,
    bot?.stats?.avg3d,
  ];
  for (const raw of candidates) {
    const level = resolveBotLevelValue(raw);
    if (level > 0) return level;
  }
  return 0;
}

/** The displayed 1–5-star bot grade is authoritative; the fallback is for unrated legacy CPU bots only. */
export function resolveBotGameDifficulty(bot: any, fallback: "easy" | "normal" | "hard" = "normal"): "easy" | "normal" | "hard" {
  const stars = resolveBotStars(bot);
  if (stars >= 3.5) return "hard";
  if (stars >= 2) return "normal";
  if (stars > 0) return "easy";
  return fallback;
}
