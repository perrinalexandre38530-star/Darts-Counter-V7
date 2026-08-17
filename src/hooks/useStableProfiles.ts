import React from "react";

function profileSig(p: any) {
  return [
    p?.id || "",
    p?.name || "",
    p?.avatarUpdatedAt || 0,
    p?.avatarUrl || "",
    p?.avatarSha256 || p?.avatarAssetId || (p?.avatarDataUrl ? "data" : ""),
    p?.country || "",
    p?.privateInfo?.country || "",
    // Les préférences applicatives doivent faire partie de la signature.
    // Sinon useStableProfiles réutilise l'ancien objet (ex: appLang=fr)
    // même quand Settings vient de passer l'app en EN/ES.
    p?.privateInfo?.appLang || p?.preferences?.appLang || "",
    p?.privateInfo?.appTheme || p?.preferences?.appTheme || "",
    p?.privateInfo?.favX01 ?? p?.preferences?.favX01 ?? "",
    p?.privateInfo?.favDoubleOut ?? p?.preferences?.favDoubleOut ?? "",
    p?.privateInfo?.ttsVoice || p?.preferences?.ttsVoice || "",
    p?.privateInfo?.sfxVolume ?? p?.preferences?.sfxVolume ?? "",
  ].join(":");
}

export function useStableProfiles<T extends Record<string, any>>(profiles: T[]): T[] {
  const previousRef = React.useRef<T[]>(profiles || []);
  const signature = React.useMemo(() => {
    return (profiles || []).map(profileSig).join("|");
  }, [profiles]);

  return React.useMemo(() => {
    const prev = previousRef.current || [];
    const prevById = new Map(prev.map((p: any) => [p?.id, p]));
    const next = (profiles || []).map((profile: any) => {
      const old = prevById.get(profile?.id);
      if (!old) return profile;
      const same =
        old?.name === profile?.name &&
        old?.avatarUpdatedAt === profile?.avatarUpdatedAt &&
        old?.avatarUrl === profile?.avatarUrl &&
        old?.avatarDataUrl === profile?.avatarDataUrl &&
        old?.country === profile?.country &&
        old?.privateInfo?.country === profile?.privateInfo?.country &&
        (old?.privateInfo?.appLang ?? old?.preferences?.appLang) === (profile?.privateInfo?.appLang ?? profile?.preferences?.appLang) &&
        (old?.privateInfo?.appTheme ?? old?.preferences?.appTheme) === (profile?.privateInfo?.appTheme ?? profile?.preferences?.appTheme) &&
        (old?.privateInfo?.favX01 ?? old?.preferences?.favX01) === (profile?.privateInfo?.favX01 ?? profile?.preferences?.favX01) &&
        (old?.privateInfo?.favDoubleOut ?? old?.preferences?.favDoubleOut) === (profile?.privateInfo?.favDoubleOut ?? profile?.preferences?.favDoubleOut) &&
        (old?.privateInfo?.ttsVoice ?? old?.preferences?.ttsVoice) === (profile?.privateInfo?.ttsVoice ?? profile?.preferences?.ttsVoice) &&
        (old?.privateInfo?.sfxVolume ?? old?.preferences?.sfxVolume) === (profile?.privateInfo?.sfxVolume ?? profile?.preferences?.sfxVolume);
      return same ? old : profile;
    }) as T[];
    previousRef.current = next;
    return next;
  }, [signature, profiles]);
}
