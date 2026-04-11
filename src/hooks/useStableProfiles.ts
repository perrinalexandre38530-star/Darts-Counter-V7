import React from "react";

export function useStableProfiles<T extends Record<string, any>>(profiles: T[]): T[] {
  const previousRef = React.useRef<T[]>(profiles || []);
  const signature = React.useMemo(() => {
    return (profiles || [])
      .map((p) => `${p?.id || ""}:${p?.name || ""}:${p?.avatarUpdatedAt || 0}:${p?.country || ""}:${p?.privateInfo?.country || ""}`)
      .join("|");
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
        JSON.stringify(old?.privateInfo || {}) === JSON.stringify(profile?.privateInfo || {});
      return same ? old : profile;
    }) as T[];
    previousRef.current = next;
    return next;
  }, [signature, profiles]);
}
