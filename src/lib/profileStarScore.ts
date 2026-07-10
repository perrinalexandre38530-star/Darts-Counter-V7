// @ts-nocheck

function numberFromAny(raw: any): number {
  if (typeof raw === "number" && Number.isFinite(raw)) return raw;
  const text = String(raw ?? "").trim().replace(",", ".");
  if (!text) return 0;
  const match = text.match(/-?\d+(?:\.\d+)?/);
  if (!match) return 0;
  const n = Number(match[0]);
  return Number.isFinite(n) ? n : 0;
}

function parseLevelToScore(raw: any): number {
  if (raw == null || raw === "") return 0;
  const text = String(raw ?? "").trim().toLowerCase().replace(",", ".");
  const direct = numberFromAny(raw);
  if (direct > 0) {
    const normalized = direct > 5 ? direct / 20 : direct;
    if (normalized > 0 && normalized <= 5) return Math.round(normalized * 20 * 10) / 10;
  }
  const fraction = text.match(/(\d+(?:\.\d+)?)\s*\/\s*5/);
  if (fraction) {
    const n = Number(fraction[1]);
    if (Number.isFinite(n) && n > 0) return Math.round(Math.max(0, Math.min(5, n)) * 20 * 10) / 10;
  }
  if (text.includes("legend") || text.includes("légende") || text.includes("legende") || text.includes("elite")) return 100;
  if (text.includes("prodige")) return 90;
  if (text.includes("pro")) return 80;
  if (text.includes("challenger")) return 80;
  if (text.includes("mixte") || text.includes("mix")) return 70;
  if (text.includes("strong") || text.includes("fort") || text.includes("hard") || text.includes("difficile")) return 60;
  if (text.includes("medium") || text.includes("standard") || text.includes("normal") || text.includes("moyen")) return 40;
  if (text.includes("easy") || text.includes("facile") || text.includes("beginner") || text.includes("debutant") || text.includes("débutant") || text.includes("rookie")) return 20;
  return 0;
}

function readQuickStats(profile: any): any | null {
  try {
    if (typeof window === "undefined") return null;
    const ids = [
      profile?.id,
      profile?.profileId,
      profile?.playerId,
      profile?.localProfileId,
      profile?.uid,
      profile?.uuid,
    ].map((v) => String(v ?? "").trim()).filter(Boolean);
    if (!ids.length) return null;
    const keys = ["dc-quick-stats", "dc_quick_stats", "dc_profile_quick_stats_v1", "dc-basic-profile-stats"];
    for (const key of keys) {
      const raw = window.localStorage?.getItem(key);
      if (!raw) continue;
      const bag = JSON.parse(raw);
      for (const id of ids) {
        if (bag?.[id]) return bag[id];
      }
    }
  } catch {}
  return null;
}

export function resolveProfileStarScore(profile: any, extraCandidates: any[] = []): number {
  const quick = readQuickStats(profile) || {};

  const avgCandidates = [
    // mêmes sources rapides que les pages HOME / PROFILES : d'abord les stats X01/Darts persistées
    quick?.avg3D,
    quick?.avg3d,
    quick?.avg3,
    quick?.average3Darts,
    profile?.stats?.x01?.avg3D,
    profile?.stats?.x01?.avg3d,
    profile?.stats?.x01?.avg3,
    profile?.x01?.avg3D,
    profile?.x01?.avg3d,
    profile?.x01?.avg3,
    profile?.x01Stats?.avg3D,
    profile?.x01Stats?.avg3d,
    profile?.x01Stats?.avg3,
    profile?.darts?.avg3D,
    profile?.darts?.avg3d,
    profile?.darts?.avg3,
    profile?.stats?.darts?.avg3D,
    profile?.stats?.darts?.avg3d,
    profile?.stats?.darts?.avg3,
    ...extraCandidates,
  ];

  for (const raw of avgCandidates) {
    const n = numberFromAny(raw);
    if (Number.isFinite(n) && n > 0 && n <= 180) return n;
  }

  const levelCandidates = [
    profile?.profileStarring,
    profile?.profileStars,
    profile?.profileStarRating,
    profile?.starring,
    profile?.stars,
    profile?.levelStars,
    profile?.level,
    profile?.botLevel,
    profile?.x01ProfileStarring,
    profile?.dartsProfileStarring,
    profile?.stats?.profileStarring,
    profile?.stats?.profileStars,
    profile?.stats?.profileStarRating,
    profile?.stats?.starring,
    profile?.stats?.stars,
    profile?.stats?.levelStars,
    profile?.stats?.level,
    profile?.stats?.x01?.profileStarring,
    profile?.stats?.x01?.profileStars,
    profile?.stats?.x01?.starring,
    profile?.stats?.x01?.stars,
    profile?.x01?.profileStarring,
    profile?.x01?.profileStars,
    profile?.x01?.starring,
    profile?.x01?.stars,
    profile?.darts?.profileStarring,
    profile?.darts?.profileStars,
    profile?.darts?.starring,
    profile?.darts?.stars,
    profile?.stats?.darts?.profileStarring,
    profile?.stats?.darts?.profileStars,
    profile?.stats?.darts?.starring,
    profile?.stats?.darts?.stars,
    quick?.profileStarring,
    quick?.profileStars,
    quick?.profileStarRating,
    quick?.starring,
    quick?.stars,
    quick?.levelStars,
  ];

  for (const raw of levelCandidates) {
    const score = parseLevelToScore(raw);
    if (score > 0) return score;
  }

  return 0;
}
