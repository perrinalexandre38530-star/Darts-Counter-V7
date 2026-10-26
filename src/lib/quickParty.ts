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
    value?.playersList,
    value?.quickPlayers,
    value?.payload?.players,
    value?.payload?.playersList,
    value?.payload?.quickPlayers,
    value?.payload?.config?.players,
    value?.payload?.config?.playersList,
    value?.payload?.config?.quickPlayers,
    value?.resume?.config?.players,
    value?.resume?.config?.playersList,
    value?.config?.players,
    value?.config?.playersList,
  ];

  const allRows = pools.flatMap((rows) => Array.isArray(rows) ? rows : []);
  const isTemporaryQuickPlayer = (player: any) => {
    const id = String(player?.temporaryPlayerId || player?.id || "").trim();
    return !!player?.temporaryPlayerId || player?.isTemporary === true || /^quick[-_:]/i.test(id);
  };

  // Après une association partielle, certains anciens historiques contiennent
  // à la fois le profil canonique ET l'ancien joueur quick-* dans `players`.
  // Toujours privilégier les vrais participants temporaires ; sinon le modal
  // croit que le profil canonique est lui-même un joueur rapide et affiche
  // "déjà associé" alors que l'association visible est incohérente.
  const tempRows = allRows.filter(isTemporaryQuickPlayer);
  const fallbackRows = pools.find((rows) => Array.isArray(rows) && rows.length) || [];
  const src = tempRows.length ? tempRows : fallbackRows;

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
