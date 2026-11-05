export type IdentityResolutionSource =
  | "exact_profile"
  | "quick_profile_link"
  | "known_alias"
  | "account_link"
  | "unknown";

export type IdentityResolutionConfidence = "exact" | "high" | "medium" | "unknown";

export type X01IdentityAliasMap = Record<string, string>;
export type X01AccountProfileMap = Record<string, string>;

export type X01IdentityResolverOptions = {
  aliasMap?: X01IdentityAliasMap | null;
  accountProfileMap?: X01AccountProfileMap | null;
  knownProfileIds?: Iterable<string> | null;
};

export type X01ResolvedIdentity = {
  historicalPlayerId: string;
  canonicalProfileId: string | null;
  resolutionSource: IdentityResolutionSource;
  confidence: IdentityResolutionConfidence;
  matchedValue: string | null;
};

const text = (v: unknown): string => String(v ?? "").trim();

function asStringMap(value: unknown): Record<string, string> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    const key = text(k);
    const val = text(v);
    if (key && val) out[key] = val;
  }
  return out;
}

function knownSet(values?: Iterable<string> | null): Set<string> {
  const out = new Set<string>();
  if (!values) return out;
  for (const value of values) {
    const id = text(value);
    if (id) out.add(id);
  }
  return out;
}

export function getQuickProfileLinks(record: any): Record<string, string> {
  const sources = [
    record?.quickProfileLinks,
    record?.payload?.quickProfileLinks,
    record?.summary?.quickProfileLinks,
  ];
  for (const source of sources) {
    const mapped = asStringMap(source);
    if (Object.keys(mapped).length) return mapped;
  }
  return {};
}

export function historicalParticipantId(participant: any): string {
  return text(
    participant?.temporaryPlayerId ??
      participant?.playerId ??
      participant?.id ??
      participant?.pid ??
      participant?.sideId
  );
}

/**
 * Resolve a logical profile without mutating the historical participant.
 * IMPORTANT: player/display name is deliberately NOT a resolution key.
 */
export function resolveX01CanonicalIdentity(
  participant: any,
  record: any,
  options: X01IdentityResolverOptions = {}
): X01ResolvedIdentity {
  const historicalPlayerId = historicalParticipantId(participant);
  const explicitProfileId = text(participant?.profileId);
  const aliasMap = asStringMap(options.aliasMap);
  const accountProfileMap = asStringMap(options.accountProfileMap);
  const knownProfiles = knownSet(options.knownProfileIds);
  const quickLinks = getQuickProfileLinks(record);

  if (explicitProfileId) {
    // Legacy backups may store an obsolete identity as `profileId` itself.
    // Validated aliases must take precedence over that historical field.
    const canonicalAlias = aliasMap[explicitProfileId];
    if (canonicalAlias) {
      return {
        historicalPlayerId,
        canonicalProfileId: canonicalAlias,
        resolutionSource: "known_alias",
        confidence: "high",
        matchedValue: explicitProfileId,
      };
    }
    if (knownProfiles.size === 0 || knownProfiles.has(explicitProfileId)) {
      return {
        historicalPlayerId,
        canonicalProfileId: explicitProfileId,
        resolutionSource: "exact_profile",
        confidence: "exact",
        matchedValue: explicitProfileId,
      };
    }
    const aliased = aliasMap[explicitProfileId];
    if (aliased) {
      return {
        historicalPlayerId,
        canonicalProfileId: aliased,
        resolutionSource: "known_alias",
        confidence: "high",
        matchedValue: explicitProfileId,
      };
    }
  }

  const quickKeys = [
    text(participant?.temporaryPlayerId),
    historicalPlayerId,
    text(participant?.id),
    text(participant?.playerId),
    text(participant?.pid),
    text(participant?.sideId),
  ].filter(Boolean);
  for (const key of quickKeys) {
    const linked = quickLinks[key];
    if (!linked) continue;
    const canonical = aliasMap[linked] || linked;
    return {
      historicalPlayerId,
      canonicalProfileId: canonical,
      resolutionSource: "quick_profile_link",
      confidence: "exact",
      matchedValue: key,
    };
  }

  const aliasCandidates = [
    explicitProfileId,
    historicalPlayerId,
    text(participant?.id),
    text(participant?.playerId),
    text(participant?.pid),
    text(participant?.sideId),
  ].filter(Boolean);
  for (const candidate of aliasCandidates) {
    const canonical = aliasMap[candidate];
    if (!canonical) continue;
    return {
      historicalPlayerId,
      canonicalProfileId: canonical,
      resolutionSource: "known_alias",
      confidence: "high",
      matchedValue: candidate,
    };
  }

  const accountCandidates = [text(participant?.onlineUserId), text(participant?.userId)].filter(Boolean);
  for (const accountId of accountCandidates) {
    const canonical = accountProfileMap[accountId];
    if (!canonical) continue;
    return {
      historicalPlayerId,
      canonicalProfileId: canonical,
      resolutionSource: "account_link",
      confidence: "medium",
      matchedValue: accountId,
    };
  }

  if (historicalPlayerId && knownProfiles.has(historicalPlayerId)) {
    return {
      historicalPlayerId,
      canonicalProfileId: historicalPlayerId,
      resolutionSource: "exact_profile",
      confidence: "exact",
      matchedValue: historicalPlayerId,
    };
  }

  return {
    historicalPlayerId,
    canonicalProfileId: null,
    resolutionSource: "unknown",
    confidence: "unknown",
    matchedValue: null,
  };
}
