/** Shared pre-match bull-off ordering. Pure, immutable and safe for legacy payloads. */
export type StartOrderChoice = 'default' | 'choice';
export type StartParticipant = { id: string; name: string; avatar?: string; teamId?: string; teamLogo?: string; teamLogoDataUrl?: string };
const ID_KEYS = ['selectedIds', 'playerIds', 'selectedPlayerIds', 'participantIds', 'playersIds', 'teamIds', 'selectedTeamIds'];
const OBJECT_KEYS = ['players', 'playersList', 'participants', 'teams', 'selectedPlayers', 'selectedTeams', 'quickPlayers'];
const idOf = (entry: any): string => String(typeof entry === 'string' || typeof entry === 'number' ? entry : entry?.id ?? entry?.playerId ?? entry?.profileId ?? entry?.teamId ?? '');

export function readStartParticipants(payload: any, profiles: any[] = []): StartParticipant[] {
  if (!payload || typeof payload !== 'object') return [];
  const values: any[] = [];
  const gather = (obj: any) => {
    if (!obj || typeof obj !== 'object') return;
    for (const key of [...OBJECT_KEYS, ...ID_KEYS]) {
      if (Array.isArray(obj[key]) && obj[key].length > values.length) {
        values.splice(0, values.length, ...obj[key]);
      }
    }
  };
  gather(payload);
  gather(payload.config);
  gather(payload.gameConfig);
  gather(payload.settings);
  const known = new Map(profiles.map(p => [String(p.id), p]));
  const seen = new Set<string>();
  return values.map((entry): StartParticipant | null => {
    const id = idOf(entry);
    if (!id || seen.has(id)) return null;
    seen.add(id);
    const profile = known.get(id);
    return { id, name: String((typeof entry === 'object' && (entry.name || entry.label || entry.displayName)) || profile?.name || id), avatar: (typeof entry === 'object' && (entry.avatarDataUrl || entry.avatar)) || profile?.avatarDataUrl || undefined, teamId: (typeof entry === 'object' && entry.teamId) || profile?.teamId || undefined, teamLogoDataUrl: (typeof entry === 'object' && (entry.teamLogoDataUrl || entry.team?.logoDataUrl)) || profile?.teamLogoDataUrl || profile?.team?.logoDataUrl || undefined, teamLogo: (typeof entry === 'object' && (entry.teamLogo || entry.team?.logoUrl || entry.team?.logo)) || profile?.teamLogo || profile?.team?.logoUrl || profile?.team?.logo || undefined };
  }).filter((entry): entry is StartParticipant => !!entry);
}

export function applyChosenStartOrder<T>(payload: T, ids: string[]): T {
  if (!payload || typeof payload !== 'object' || !Array.isArray(ids) || new Set(ids).size !== ids.length) return payload;
  const ranks = new Map(ids.map((id, index) => [String(id), index]));
  const orderArray = (values: any[]) => {
    if (!values.every(v => ranks.has(idOf(v))) || values.length !== ids.length) return values;
    return [...values].sort((a, b) => ranks.get(idOf(a))! - ranks.get(idOf(b))!);
  };
  const walk = (obj: any, depth = 0): any => {
    if (!obj || Array.isArray(obj) || typeof obj !== 'object' || depth > 2) return obj;
    const copy = { ...obj };
    for (const key of [...ID_KEYS, ...OBJECT_KEYS]) {
      if (Array.isArray(copy[key])) copy[key] = orderArray(copy[key]);
    }
    if (depth < 2) for (const key of ['config', 'gameConfig', 'settings']) {
      if (copy[key] && typeof copy[key] === 'object') copy[key] = walk(copy[key], depth + 1);
    }
    // Prevent a second random draw in engines honouring this legacy flag.
    if ('randomOrder' in copy) copy.randomOrder = false;
    if ('startOrderMode' in copy) copy.startOrderMode = 'fixed';
    if ('serveMode' in copy) copy.serveMode = 'alternate';
    copy.startOrderApplied = true;
    copy.chosenStartOrder = [...ids];
    return copy;
  };
  return walk(payload) as T;
}
