export function isQuickPartyRecord(value: any): boolean {
  const payload = value?.payload ?? value?.snapshot ?? value?.data ?? null;
  const config = payload?.config ?? value?.config ?? value?.resume?.config ?? null;
  const summary = value?.summary ?? payload?.summary ?? null;
  return (
    value?.quickParty === true ||
    payload?.quickParty === true ||
    config?.quickParty === true ||
    summary?.quickParty === true ||
    String(value?.partyMode || "").toLowerCase() === "quick" ||
    String(payload?.partyMode || "").toLowerCase() === "quick" ||
    String(config?.partyMode || "").toLowerCase() === "quick"
  );
}

export function quickPartyParticipants(value: any): any[] {
  const pools = [
    value?.players,
    value?.payload?.players,
    value?.payload?.config?.players,
    value?.resume?.config?.players,
    value?.config?.players,
  ];
  const src = pools.find((rows) => Array.isArray(rows) && rows.length) || [];
  const seen = new Set<string>();
  return src.filter((player: any) => {
    const id = String(player?.temporaryPlayerId || player?.id || "").trim();
    if (!id || seen.has(id)) return false;
    seen.add(id);
    return true;
  }).map((player: any, index: number) => ({
    ...player,
    id: String(player?.temporaryPlayerId || player?.id || `J${index + 1}`),
    temporaryPlayerId: String(player?.temporaryPlayerId || player?.id || `J${index + 1}`),
    name: String(player?.name || `J${index + 1}`),
  }));
}

export function quickPartyProfileLinks(value: any): Record<string, string> {
  const sources = [value?.quickProfileLinks, value?.payload?.quickProfileLinks, value?.summary?.quickProfileLinks];
  const src = sources.find((row) => row && typeof row === "object" && !Array.isArray(row)) || {};
  return Object.fromEntries(Object.entries(src).map(([k, v]) => [String(k), String(v || "")]).filter(([, v]) => !!v));
}
