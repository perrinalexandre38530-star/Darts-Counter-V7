import React from "react";

function compactMediaSig(value: any) {
  const raw = typeof value === "string" ? value : "";
  if (!raw) return "";
  // Les photos peuvent peser plusieurs Mo. On ne concatène jamais le base64 entier
  // pour savoir si un profil a changé : longueur + extrémités + avatarUpdatedAt suffisent.
  if (raw.length > 256) return `${raw.length}:${raw.slice(0, 28)}:${raw.slice(-28)}`;
  return raw;
}

function profileSig(p: any) {
  return [
    p?.id || "",
    p?.name || "",
    p?.avatarUpdatedAt || 0,
    compactMediaSig(p?.avatarUrl),
    compactMediaSig(p?.avatarDataUrl),
    compactMediaSig(p?.photoDataUrl),
    p?.avatarSha256 || p?.avatarAssetId || "",
    p?.country || "",
    p?.privateInfo?.country || "",
    // MON PROFIL doit réagir aux changements d'identité et d'informations
    // personnelles, pas seulement au nom racine. Avant V17, un profil dont
    // `name` restait "Ninja" mais dont `privateInfo.nickname` repassait à
    // "Perrin" pouvait réutiliser une ancienne référence et afficher un état
    // différent de Home/Stats.
    p?.privateInfo?.nickname || "",
    p?.privateInfo?.firstName || "",
    p?.privateInfo?.lastName || "",
    p?.privateInfo?.birthDate || "",
    p?.privateInfo?.city || "",
    p?.privateInfo?.email || "",
    p?.privateInfo?.onlineUserId || p?.privateInfo?.accountUserId || "",
    p?.privateInfo?.appLang || p?.preferences?.appLang || "",
    p?.privateInfo?.appTheme || p?.preferences?.appTheme || "",
    p?.privateInfo?.favX01 ?? p?.preferences?.favX01 ?? "",
    p?.privateInfo?.favDoubleOut ?? p?.preferences?.favDoubleOut ?? "",
    p?.privateInfo?.ttsVoice || p?.preferences?.ttsVoice || "",
    p?.privateInfo?.sfxVolume ?? p?.preferences?.sfxVolume ?? "",
    // Le tableau Profiles est la seule surface qui utilise ce hook. Inclure les
    // mini KPI évite de conserver un objet profil obsolète après une restauration
    // ou une réconciliation de stats.
    p?.stats?.avg3 ?? p?.stats?.avg3d ?? p?.stats?.avg3D ?? "",
    p?.stats?.bestVisit ?? p?.stats?.best_visit ?? "",
    p?.stats?.bestCheckout ?? p?.stats?.best_checkout ?? "",
    p?.stats?.games ?? p?.stats?.sessions ?? "",
    p?.stats?.wins ?? "",
  ].join(":");
}

/**
 * Conserve les références des profils réellement inchangés sans figer la liste.
 *
 * FIX V72 : le Store historique peut réhydrater/muter son tableau `profiles` en place.
 * Une signature enveloppée dans useMemo([profiles]) ne voyait alors JAMAIS la mutation
 * si la référence du tableau restait identique. La page Profils locaux pouvait rester
 * bloquée sur le premier tableau vide. La signature compacte est maintenant recalculée
 * à chaque render (travail O(n) très léger, sans parcourir les base64 complets).
 */
export function useStableProfiles<T extends Record<string, any>>(profiles: T[]): T[] {
  const source = Array.isArray(profiles) ? profiles : [];
  const previousRef = React.useRef<T[]>(source);
  const signature = source.map(profileSig).join("|");

  return React.useMemo(() => {
    const prev = previousRef.current || [];
    const prevById = new Map(prev.map((p: any) => [String(p?.id || ""), p]));
    const next = source.map((profile: any) => {
      const old = prevById.get(String(profile?.id || ""));
      if (!old) return profile;
      const same = profileSig(old) === profileSig(profile);
      return same ? old : profile;
    }) as T[];
    previousRef.current = next;
    return next;
    // La signature primitive détecte aussi les mutations in-place du tableau Store.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature]);
}
