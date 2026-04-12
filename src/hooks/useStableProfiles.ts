import React from "react";

function profileSig(p: any) {
  return [
    p?.id || "",
    p?.name || "",
    p?.avatarUpdatedAt || 0,
    p?.avatarUrl || "",
    p?.avatarDataUrl ? "data" : "",
    p?.country || "",
    p?.privateInfo?.country || "",
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
        old?.privateInfo?.country === profile?.privateInfo?.country;
      return same ? old : profile;
    }) as T[];
    previousRef.current = next;
    return next;
  }, [signature, profiles]);
}
