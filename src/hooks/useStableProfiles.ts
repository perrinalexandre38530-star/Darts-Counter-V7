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
    p?.privateInfo?.appLang || p?.preferences?.appLang || "",
    p?.privateInfo?.appTheme || p?.preferences?.appTheme || "",
    p?.privateInfo?.favX01 ?? p?.preferences?.favX01 ?? "",
    p?.privateInfo?.favDoubleOut ?? p?.preferences?.favDoubleOut ?? "",
    p?.privateInfo?.ttsVoice || p?.preferences?.ttsVoice || "",
    p?.privateInfo?.sfxVolume ?? p?.preferences?.sfxVolume ?? "",
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
