// @ts-nocheck

import { getAccountLocalStorageItem } from "./accountScope";

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


function readCurrentLevelStats(profile: any): any | null {
  try {
    const raw = getAccountLocalStorageItem("dc_x01_current_level_v127");
    if (!raw) return null;
    const bag = JSON.parse(raw);
    const ids = [profile?.id, profile?.profileId, profile?.playerId, profile?.localProfileId, profile?.uid, profile?.uuid]
      .map((v) => String(v ?? "").trim()).filter(Boolean);
    for (const id of ids) if (bag?.[id]) return bag[id];
    const name = String(profile?.name || profile?.displayName || profile?.nickname || "").trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
    return name ? bag?.[`name:${name}`] || null : null;
  } catch { return null; }
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
  const current = readCurrentLevelStats(profile) || {};
  const isBotProfile = Boolean(
    profile?.isBot || profile?.bot || profile?.cpu || profile?.type === "bot" || profile?.kind === "bot" ||
    String(profile?.id || "").startsWith("bot_") || profile?.botLevel != null
  );

  // V129 : pour un HUMAIN, la couronne est STRICTEMENT le niveau ACTUEL X01,
  // c.-à-d. l'AVG3D calculée sur la fenêtre des 10 derniers matchs X01.
  // Une AVG3D lifetime ne doit jamais servir de fallback silencieux : sinon le
  // médaillon peut afficher le niveau historique alors que l'UI dit "actuel".
  const currentCandidates = [
    current?.currentAvg3D,
    current?.x01CurrentAvg3D,
    current?.last10Avg3D,
    quick?.currentAvg3D,
    quick?.x01CurrentAvg3D,
    quick?.last10Avg3D,
    profile?.stats?.x01?.currentAvg3D,
    profile?.stats?.x01?.last10Avg3D,
    profile?.x01?.currentAvg3D,
    profile?.x01?.last10Avg3D,
    profile?.x01Stats?.currentAvg3D,
    profile?.x01Stats?.last10Avg3D,
  ];

  for (const raw of currentCandidates) {
    const n = numberFromAny(raw);
    if (Number.isFinite(n) && n > 0 && n <= 180) return n;
  }

  // Tant que le cache current n'est pas prêt, un humain affiche 0 étoile plutôt
  // qu'un faux niveau lifetime. Les bots conservent leurs fallbacks historiques.
  if (!isBotProfile) return 0;

  const botAvgCandidates = [
    ...extraCandidates,
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
  ];
  for (const raw of botAvgCandidates) {
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
