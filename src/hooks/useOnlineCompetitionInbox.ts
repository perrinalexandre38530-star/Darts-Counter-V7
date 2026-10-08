import * as React from "react";
import { getOnlineCompetition, listOnlineCompetitions, updateOnlineCompetition } from "../lib/tournaments/onlineStore";
import { showMessageCenterNotification } from "../lib/messageCenterNotify";

export type OnlineCompetitionRelation =
  | "owner"
  | "admin"
  | "participant"
  | "invited"
  | "request"
  | "following";

export type OnlineCompetitionPlayerProgress = {
  participantId: string;
  division: number | null;
  totalObjectives: number;
  playedObjectives: number;
  completedObjectives: number;
  attemptsUsed: number;
  attemptsMax: number;
  playableObjectives: string[];
  nextObjective: string | null;
};

export type OnlineCompetitionInboxItem = {
  id: string;
  competition: any;
  name: string;
  relation: OnlineCompetitionRelation;
  invitation: any | null;
  request: any | null;
  participant: any | null;
  openRounds: any[];
  openObjectives: string[];
  currentCycle: number;
  updatedAt: number;
  playerProgress: OnlineCompetitionPlayerProgress | null;
  follower: any | null;
};

export type OnlineCompetitionDiscoveryItem = {
  id: string;
  competition: any;
  name: string;
  enrollmentPolicy: "open" | "approval";
  participantsCount: number;
  maxParticipants: number | null;
  competitionIsFull: boolean;
  openObjectives: string[];
  currentCycle: number;
  updatedAt: number;
};

export type OnlineCompetitionAlert = {
  id: string;
  competitionId: string;
  competitionName: string;
  label: string;
  createdAt: number;
};

type Args = {
  userId?: string | null;
  profileId?: string | null;
  displayName?: string | null;
  avatarUrl?: string | null;
  enabled?: boolean;
  pollMs?: number;
};

const SNAPSHOT_PREFIX = "dc_online_competition_watch_v2:";

function asArray<T = any>(value: any): T[] {
  return Array.isArray(value) ? value : [];
}

function normalizeObjective(value: any) {
  const raw = String(value || "").trim().toLowerCase();
  if (!raw) return "";
  if (raw === "bull25" || raw === "bull50" || raw === "bull") return "bull";
  if (raw === "double" || raw === "doubles" || raw === "any-double") return "any-double";
  if (raw === "triple" || raw === "triples" || raw === "any-triple") return "any-triple";
  return raw;
}

function objectiveLabel(value: any) {
  const key = normalizeObjective(value);
  if (key === "bull") return "BULL";
  if (key === "any-double") return "DOUBLES";
  if (key === "any-triple") return "TRIPLES";
  return key.toUpperCase();
}

function getCompetitionId(row: any) {
  return String(row?.onlineCompetitionId || row?.id || "").trim();
}

function getIdentities(userId?: string | null, profileId?: string | null) {
  return new Set([String(userId || "").trim(), String(profileId || "").trim()].filter(Boolean));
}

function findParticipant(row: any, identities: Set<string>) {
  const players = asArray(row?.players?.length ? row.players : row?.participants);
  return players.find((p: any) => {
    const ids = [p?.id, p?.profileId, p?.onlineUserId, p?.userId].map((v) => String(v || "")).filter(Boolean);
    return ids.some((id) => identities.has(id));
  }) || null;
}

function isOwner(row: any, identities: Set<string>) {
  return [row?.ownerOnlineUserId, row?.ownerProfileId]
    .map((v) => String(v || ""))
    .filter(Boolean)
    .some((id) => identities.has(id));
}

function isAdmin(row: any, identities: Set<string>) {
  const ids = asArray(row?.adminProfileIds).map((v) => String(v || "")).filter(Boolean);
  return ids.some((id) => identities.has(id));
}

function getInvitation(row: any, userId: string) {
  return asArray(row?.invitations).find((invite: any) => {
    return String(invite?.userId || "") === userId && !["revoked", "declined"].includes(String(invite?.status || "pending"));
  }) || null;
}

function getRequest(row: any, userId: string) {
  const requests = asArray(row?.enrollmentRequests).filter((request: any) => String(request?.userId || "") === userId);
  return requests.sort((a: any, b: any) => Number(b?.requestedAt || 0) - Number(a?.requestedAt || 0))[0] || null;
}

function getFollower(row: any, userId: string) {
  return asArray(row?.followers).find((follower: any) => String(follower?.userId || "") === userId) || null;
}

function getOpenRounds(row: any) {
  const cfg = row?.challengeCompetition || {};
  const cycle = Math.max(1, Number(cfg?.currentCycle || 1) || 1);
  const rounds = asArray(cfg?.schedule?.rounds)
    .filter((round: any) => Number(round?.cycle || 1) === cycle)
    .filter((round: any) => String(round?.status || "open") === "open");
  return { cycle, rounds };
}


function challengeObjectivesForCycle(row: any, cycle: number) {
  const cfg = row?.challengeCompetition || {};
  const rounds = asArray(cfg?.schedule?.rounds).filter((round: any) => Number(round?.cycle || 1) === cycle);
  const fromRounds = rounds.flatMap((round: any) => asArray(round?.objectives).map(normalizeObjective)).filter(Boolean);
  if (fromRounds.length) return Array.from(new Set(fromRounds));
  const rules = row?.game?.rules || {};
  const fromRules = asArray(rules?.objectiveTargets).map(normalizeObjective).filter(Boolean);
  if (fromRules.length) return Array.from(new Set(fromRules));
  const target = normalizeObjective(rules?.target || row?.target || "");
  return target ? [target] : [];
}

function participantIdentitySet(participant: any, identities: Set<string>) {
  const ids = new Set(identities);
  [participant?.id, participant?.profileId, participant?.onlineUserId, participant?.userId]
    .map((value) => String(value || "").trim())
    .filter(Boolean)
    .forEach((id) => ids.add(id));
  return ids;
}

function attemptLimitForObjective(row: any, objective: string) {
  const cfg = row?.challengeCompetition || {};
  const override = cfg?.objectiveSettings?.[normalizeObjective(objective)]?.attemptsPerObjective;
  return Math.max(1, Math.min(5, Number(override || cfg?.attemptsPerObjective || row?.game?.rules?.challengeAttemptsPerObjective || 3) || 3));
}

function buildPlayerProgress(row: any, participant: any, identities: Set<string>, cycle: number, openObjectives: string[]): OnlineCompetitionPlayerProgress | null {
  if (!participant) return null;
  const format = String(row?.challengeCompetition?.format || "").toLowerCase();
  const mode = String(row?.game?.mode || "").toLowerCase();
  if (mode !== "challenge" || format === "duels") return null;

  const participantId = String(participant?.id || participant?.profileId || participant?.onlineUserId || participant?.userId || "");
  if (!participantId) return null;
  const identitySet = participantIdentitySet(participant, identities);
  const objectives = challengeObjectivesForCycle(row, cycle);
  const linked = asArray(row?.linkedMatches ?? row?.meta?.linkedMatches).filter((match: any) => Math.max(1, Number(match?.challengeCycle || 1) || 1) === cycle);

  let attemptsUsed = 0;
  let attemptsMax = 0;
  let playedObjectives = 0;
  let completedObjectives = 0;
  const playableObjectives: string[] = [];

  for (const objective of objectives) {
    const max = attemptLimitForObjective(row, objective);
    attemptsMax += max;
    let used = 0;
    for (const match of linked) {
      if (normalizeObjective(match?.challengeObjective || match?.target || match?.objective) !== objective) continue;
      const ranking = asArray(match?.ranking);
      if (ranking.some((entry: any) => {
        const ids = [entry?.playerId, entry?.id, entry?.profileId, entry?.onlineUserId].map((value) => String(value || "")).filter(Boolean);
        return ids.some((id) => identitySet.has(id));
      })) used += 1;
    }
    used = Math.min(max, used);
    attemptsUsed += used;
    if (used > 0) playedObjectives += 1;
    if (used >= max) completedObjectives += 1;
    if (openObjectives.includes(objective) && used < max) playableObjectives.push(objective);
  }

  const cycles = asArray(row?.challengeCompetition?.divisionCycles);
  const currentCycle = cycles.find((entry: any) => Number(entry?.cycle || 0) === cycle);
  const assignments = currentCycle?.assignments && typeof currentCycle.assignments === "object" ? currentCycle.assignments : {};
  let division: number | null = null;
  for (const id of identitySet) {
    const n = Number(assignments?.[id] || 0);
    if (n > 0) { division = n; break; }
  }

  return {
    participantId,
    division,
    totalObjectives: objectives.length,
    playedObjectives,
    completedObjectives,
    attemptsUsed,
    attemptsMax,
    playableObjectives,
    nextObjective: playableObjectives[0] || null,
  };
}

function toInboxItem(row: any, identities: Set<string>, userId: string): OnlineCompetitionInboxItem | null {
  const id = getCompetitionId(row);
  if (!id) return null;

  const participant = findParticipant(row, identities);
  const invitation = userId ? getInvitation(row, userId) : null;
  const request = userId ? getRequest(row, userId) : null;
  const follower = userId ? getFollower(row, userId) : null;
  const owner = isOwner(row, identities);
  const admin = isAdmin(row, identities);

  let relation: OnlineCompetitionRelation | null = null;
  if (owner) relation = "owner";
  else if (admin) relation = "admin";
  else if (participant) relation = "participant";
  else if (invitation) relation = "invited";
  else if (request) relation = "request";
  else if (follower) relation = "following";
  if (!relation) return null;

  const { cycle, rounds } = getOpenRounds(row);
  const openObjectives = Array.from(
    new Set(
      rounds.flatMap((round: any) => asArray(round?.objectives).map(normalizeObjective)).filter(Boolean)
    )
  );

  const playerProgress = buildPlayerProgress(row, participant, identities, cycle, openObjectives);

  return {
    id,
    competition: row,
    name: String(row?.name || "Compétition Online"),
    relation,
    invitation,
    request,
    participant,
    openRounds: rounds,
    openObjectives,
    currentCycle: cycle,
    updatedAt: Number(row?.updatedAt || Date.parse(String(row?.updated_at || "")) || 0) || 0,
    playerProgress,
    follower,
  };
}

function toDiscoveryItem(row: any, identities: Set<string>, userId: string): OnlineCompetitionDiscoveryItem | null {
  const id = getCompetitionId(row);
  if (!id) return null;
  if (toInboxItem(row, identities, userId)) return null;
  if (String(row?.competitionScope || row?.meta?.competitionScope || row?.source || "online").toLowerCase() !== "online") return null;
  const status = String(row?.status || "draft").toLowerCase();
  if (["finished", "completed", "archived", "deleted"].includes(status)) return null;
  const policy = String(row?.enrollment?.policy || row?.meta?.enrollmentPolicy || "fixed").toLowerCase();
  if (policy !== "open" && policy !== "approval") return null;
  const players = asArray(row?.players?.length ? row.players : row?.participants);
  const max = Math.max(0, Number(row?.enrollment?.maxParticipants || row?.meta?.enrollmentMax || 0) || 0);
  const { cycle, rounds } = getOpenRounds(row);
  const openObjectives = Array.from(new Set(rounds.flatMap((round: any) => asArray(round?.objectives).map(normalizeObjective)).filter(Boolean)));
  return {
    id,
    competition: row,
    name: String(row?.name || "Compétition Online"),
    enrollmentPolicy: policy as "open" | "approval",
    participantsCount: players.length,
    maxParticipants: max > 0 ? max : null,
    competitionIsFull: max > 0 && players.length >= max,
    openObjectives,
    currentCycle: cycle,
    updatedAt: Number(row?.updatedAt || Date.parse(String(row?.updated_at || "")) || 0) || 0,
  };
}

function readSnapshot(key: string): Record<string, { openRoundIds: string[]; updatedAt: number; invitationStatus?: string; requestStatus?: string; linkedCount?: number }> | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

function writeSnapshot(key: string, value: Record<string, { openRoundIds: string[]; updatedAt: number; invitationStatus?: string; requestStatus?: string; linkedCount?: number }>) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

function publicCompetitionUrl(id: string) {
  if (typeof window === "undefined") return `/#/competition/${encodeURIComponent(id)}`;
  return `${window.location.origin}${window.location.pathname}#/competition/${encodeURIComponent(id)}`;
}

export function useOnlineCompetitionInbox({ userId, profileId, displayName, avatarUrl, enabled = true, pollMs = 20_000 }: Args) {
  const normalizedUserId = String(userId || "").trim();
  const normalizedProfileId = String(profileId || "").trim();
  const normalizedDisplayName = String(displayName || "Joueur Online").trim() || "Joueur Online";
  const normalizedAvatarUrl = String(avatarUrl || "").trim() || null;
  const [items, setItems] = React.useState<OnlineCompetitionInboxItem[]>([]);
  const [discoverable, setDiscoverable] = React.useState<OnlineCompetitionDiscoveryItem[]>([]);
  const [alerts, setAlerts] = React.useState<OnlineCompetitionAlert[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");
  const [lastSyncAt, setLastSyncAt] = React.useState<number>(0);
  const [actionBusy, setActionBusy] = React.useState<string>("");
  const [actionNotice, setActionNotice] = React.useState<string>("");
  const aliveRef = React.useRef(true);

  React.useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
    };
  }, []);

  const refresh = React.useCallback(async (notify = true) => {
    if (!enabled || !normalizedUserId) {
      setItems([]);
      setDiscoverable([]);
      setAlerts([]);
      setError("");
      return [] as OnlineCompetitionInboxItem[];
    }

    setLoading((prev) => prev || !items.length);
    try {
      const rows = await listOnlineCompetitions({ limit: 100 });
      const identities = getIdentities(normalizedUserId, normalizedProfileId);
      const allRows = asArray(rows);
      const next = allRows
        .map((row: any) => toInboxItem(row, identities, normalizedUserId))
        .filter(Boolean) as OnlineCompetitionInboxItem[];
      const nextDiscoverable = allRows
        .map((row: any) => toDiscoveryItem(row, identities, normalizedUserId))
        .filter(Boolean) as OnlineCompetitionDiscoveryItem[];
      nextDiscoverable.sort((a, b) => Number(a.competitionIsFull) - Number(b.competitionIsFull) || b.updatedAt - a.updatedAt || a.name.localeCompare(b.name));

      next.sort((a, b) => {
        const aPending = a.invitation?.status === "pending" ? 1 : a.request?.status === "pending" ? 1 : 0;
        const bPending = b.invitation?.status === "pending" ? 1 : b.request?.status === "pending" ? 1 : 0;
        return bPending - aPending || b.updatedAt - a.updatedAt || a.name.localeCompare(b.name);
      });

      const snapshotKey = `${SNAPSHOT_PREFIX}${normalizedUserId}`;
      const previous = readSnapshot(snapshotKey);
      const freshSnapshot: Record<string, { openRoundIds: string[]; updatedAt: number; invitationStatus?: string; requestStatus?: string; linkedCount?: number }> = {};
      const newAlerts: OnlineCompetitionAlert[] = [];

      for (const item of next) {
        const roundIds = item.openRounds.map((round: any) => String(round?.id || `c${item.currentCycle}-r${round?.round || 0}`));
        const invitationStatus = String(item.invitation?.status || "");
        const requestStatus = String(item.request?.status || "");
        const linkedCount = asArray(item.competition?.linkedMatches ?? item.competition?.meta?.linkedMatches).length;
        freshSnapshot[item.id] = { openRoundIds: roundIds, updatedAt: item.updatedAt, invitationStatus, requestStatus, linkedCount };

        const previousItem = previous?.[item.id];
        if (previous) {
          if (invitationStatus === "pending" && previousItem?.invitationStatus !== "pending") {
            const label = "Nouvelle invitation à rejoindre la compétition";
            newAlerts.push({ id: `${item.id}:invite:${item.invitation?.id || Date.now()}`, competitionId: item.id, competitionName: item.name, label, createdAt: Date.now() });
            if (notify) void showMessageCenterNotification("Invitation compétition", `${item.name} · ${label}`, { tag: `competition-invite-${item.id}`, data: { url: publicCompetitionUrl(item.id) } } as NotificationOptions);
          }
          if (previousItem?.requestStatus === "pending" && requestStatus && requestStatus !== "pending") {
            const accepted = requestStatus === "approved" || requestStatus === "accepted";
            const label = accepted ? "Ta demande d’inscription a été acceptée" : requestStatus === "rejected" ? "Ta demande d’inscription a été refusée" : "Ta demande d’inscription a changé";
            newAlerts.push({ id: `${item.id}:request:${requestStatus}:${Date.now()}`, competitionId: item.id, competitionName: item.name, label, createdAt: Date.now() });
            if (notify) void showMessageCenterNotification("Inscription compétition", `${item.name} · ${label}`, { tag: `competition-request-${item.id}`, data: { url: publicCompetitionUrl(item.id) } } as NotificationOptions);
          }
          if (["owner", "admin", "participant", "following"].includes(item.relation) && previousItem && linkedCount > Number(previousItem.linkedCount || 0)) {
            const delta = linkedCount - Number(previousItem.linkedCount || 0);
            const label = `${delta} nouveau${delta > 1 ? "x" : ""} résultat${delta > 1 ? "s" : ""} enregistré${delta > 1 ? "s" : ""}`;
            newAlerts.push({ id: `${item.id}:result:${linkedCount}`, competitionId: item.id, competitionName: item.name, label, createdAt: Date.now() });
          }
        }

        // Joueurs, admins et spectateurs qui suivent la compétition peuvent recevoir l'ouverture des journées.
        if (!previous || !["owner", "admin", "participant", "following"].includes(item.relation)) continue;
        const seen = new Set(previous[item.id]?.openRoundIds || []);
        const newlyOpened = item.openRounds.filter((round: any) => {
          const rid = String(round?.id || `c${item.currentCycle}-r${round?.round || 0}`);
          return !seen.has(rid);
        });
        for (const round of newlyOpened) {
          const objectives = asArray(round?.objectives).map(objectiveLabel).filter(Boolean);
          const label = `J${Number(round?.round || 0) || 1} ouverte${objectives.length ? ` · ${objectives.join(" · ")}` : ""}`;
          newAlerts.push({
            id: `${item.id}:${String(round?.id || round?.round || Date.now())}`,
            competitionId: item.id,
            competitionName: item.name,
            label,
            createdAt: Date.now(),
          });
          if (notify) {
            void showMessageCenterNotification(
              "Compétition Challenge",
              `${item.name} · ${label}`,
              {
                tag: `competition-${item.id}-${String(round?.id || round?.round || "round")}`,
                data: { url: publicCompetitionUrl(item.id) },
              } as NotificationOptions
            );
          }
        }
      }

      writeSnapshot(snapshotKey, freshSnapshot);
      if (!aliveRef.current) return next;
      setItems(next);
      setDiscoverable(nextDiscoverable);
      if (newAlerts.length) {
        setAlerts((prev) => [...newAlerts, ...prev].slice(0, 8));
      }
      setLastSyncAt(Date.now());
      setError("");
      return next;
    } catch (err: any) {
      if (aliveRef.current) setError(String(err?.message || "Compétitions Online indisponibles."));
      return [] as OnlineCompetitionInboxItem[];
    } finally {
      if (aliveRef.current) setLoading(false);
    }
  }, [enabled, normalizedUserId, normalizedProfileId, normalizedDisplayName, normalizedAvatarUrl, pollMs]);

  React.useEffect(() => {
    if (!enabled || !normalizedUserId) return;
    void refresh(false);
    const id = window.setInterval(() => {
      void refresh(true);
    }, Math.max(10_000, pollMs));
    return () => window.clearInterval(id);
  }, [enabled, normalizedUserId, normalizedProfileId, pollMs, refresh]);

  const invitations = React.useMemo(
    () => items.filter((item) => String(item.invitation?.status || "") === "pending"),
    [items]
  );
  const requests = React.useMemo(
    () => items.filter((item) => Boolean(item.request) && !["cancelled"].includes(String(item.request?.status || ""))),
    [items]
  );
  const active = React.useMemo(
    () => items.filter((item) => ["owner", "admin", "participant"].includes(item.relation)),
    [items]
  );
  const followed = React.useMemo(
    () => items.filter((item) => item.relation === "following"),
    [items]
  );

  const mutateCompetition = React.useCallback(async (item: OnlineCompetitionInboxItem, mutate: (latest: any) => any, successMessage: string) => {
    if (!normalizedUserId || !item?.id) return false;
    setActionBusy(item.id);
    setActionNotice("");
    try {
      const latest = await getOnlineCompetition(item.id);
      const next = mutate(latest);
      if (!next) return false;
      await updateOnlineCompetition(item.id, {
        name: next?.name,
        status: next?.status,
        tournament: next,
        matches: asArray(next?.matches ?? next?.__onlineRow?.payload?.matches),
        participants: asArray(next?.players?.length ? next.players : next?.participants),
        settings: { ...(next?.game?.rules || {}), identity: next?.identity || null },
      } as any);
      setActionNotice(successMessage);
      await refresh(false);
      return true;
    } catch (err: any) {
      setActionNotice(String(err?.message || "Action Online impossible."));
      return false;
    } finally {
      setActionBusy("");
    }
  }, [normalizedUserId, refresh]);

  const acceptInvitation = React.useCallback(async (item: OnlineCompetitionInboxItem) => {
    return mutateCompetition(item, (latest: any) => {
      const invitations = asArray(latest?.invitations);
      const invitation = invitations.find((row: any) => String(row?.userId || "") === normalizedUserId && String(row?.status || "pending") === "pending");
      if (!invitation) throw new Error("Cette invitation n’est plus disponible.");
      const players = asArray(latest?.players?.length ? latest.players : latest?.participants);
      const max = Math.max(0, Number(latest?.enrollment?.maxParticipants || latest?.meta?.enrollmentMax || 0) || 0);
      if (max > 0 && players.length >= max) throw new Error("La compétition est complète.");
      const already = players.some((row: any) => [row?.onlineUserId, row?.userId, row?.profileId, row?.id].map((value) => String(value || "")).includes(normalizedUserId) || (normalizedProfileId && [row?.profileId, row?.id].map((value) => String(value || "")).includes(normalizedProfileId)));
      const participant = {
        id: String(invitation?.profileId || normalizedProfileId || normalizedUserId),
        profileId: String(invitation?.profileId || normalizedProfileId || normalizedUserId),
        onlineUserId: normalizedUserId,
        userId: normalizedUserId,
        name: String(invitation?.name || "Joueur"),
        avatarDataUrl: invitation?.avatarUrl || null,
        avatarUrl: invitation?.avatarUrl || null,
        isBot: false,
        source: "online",
      };
      return {
        ...latest,
        players: already ? players : [...players, participant],
        invitations: invitations.map((row: any) => String(row?.id || "") === String(invitation?.id || "") ? { ...row, status: "accepted", respondedAt: Date.now() } : row),
        updatedAt: Date.now(),
      };
    }, `Invitation acceptée · ${item.name}`);
  }, [mutateCompetition, normalizedUserId, normalizedProfileId]);

  const declineInvitation = React.useCallback(async (item: OnlineCompetitionInboxItem) => {
    return mutateCompetition(item, (latest: any) => ({
      ...latest,
      invitations: asArray(latest?.invitations).map((row: any) => String(row?.userId || "") === normalizedUserId && String(row?.status || "pending") === "pending" ? { ...row, status: "declined", respondedAt: Date.now() } : row),
      updatedAt: Date.now(),
    }), `Invitation refusée · ${item.name}`);
  }, [mutateCompetition, normalizedUserId]);

  const cancelRequest = React.useCallback(async (item: OnlineCompetitionInboxItem) => {
    return mutateCompetition(item, (latest: any) => ({
      ...latest,
      enrollmentRequests: asArray(latest?.enrollmentRequests).map((row: any) => String(row?.userId || "") === normalizedUserId && String(row?.status || "pending") === "pending" ? { ...row, status: "cancelled", respondedAt: Date.now() } : row),
      updatedAt: Date.now(),
    }), `Demande annulée · ${item.name}`);
  }, [mutateCompetition, normalizedUserId]);

  const mutateDiscoveryCompetition = React.useCallback(async (item: OnlineCompetitionDiscoveryItem, mutate: (latest: any) => any, successMessage: string) => {
    if (!normalizedUserId || !item?.id) return false;
    setActionBusy(item.id);
    setActionNotice("");
    try {
      const latest = await getOnlineCompetition(item.id);
      const next = mutate(latest);
      await updateOnlineCompetition(item.id, {
        name: next?.name,
        status: next?.status,
        tournament: next,
        matches: asArray(next?.matches ?? next?.__onlineRow?.payload?.matches),
        participants: asArray(next?.players?.length ? next.players : next?.participants),
        settings: { ...(next?.game?.rules || {}), identity: next?.identity || null },
      } as any);
      setActionNotice(successMessage);
      await refresh(false);
      return true;
    } catch (err: any) {
      setActionNotice(String(err?.message || "Action Online impossible."));
      return false;
    } finally {
      setActionBusy("");
    }
  }, [normalizedUserId, refresh]);

  const joinOpenCompetition = React.useCallback(async (item: OnlineCompetitionDiscoveryItem) => {
    return mutateDiscoveryCompetition(item, (latest: any) => {
      const policy = String(latest?.enrollment?.policy || latest?.meta?.enrollmentPolicy || "fixed").toLowerCase();
      if (policy !== "open") throw new Error("Cette compétition n’accepte plus les inscriptions immédiates.");
      const players = asArray(latest?.players?.length ? latest.players : latest?.participants);
      const max = Math.max(0, Number(latest?.enrollment?.maxParticipants || latest?.meta?.enrollmentMax || 0) || 0);
      if (max > 0 && players.length >= max) throw new Error("La compétition est complète.");
      const already = players.some((row: any) => [row?.onlineUserId, row?.userId, row?.profileId, row?.id].map((value) => String(value || "")).includes(normalizedUserId) || (normalizedProfileId && [row?.profileId, row?.id].map((value) => String(value || "")).includes(normalizedProfileId)));
      if (already) return latest;
      const participant = {
        id: normalizedProfileId || normalizedUserId,
        profileId: normalizedProfileId || normalizedUserId,
        onlineUserId: normalizedUserId,
        userId: normalizedUserId,
        name: normalizedDisplayName,
        avatarDataUrl: normalizedAvatarUrl,
        avatarUrl: normalizedAvatarUrl,
        isBot: false,
        source: "online",
      };
      return { ...latest, players: [...players, participant], updatedAt: Date.now() };
    }, `Inscription confirmée · ${item.name}`);
  }, [mutateDiscoveryCompetition, normalizedUserId, normalizedProfileId, normalizedDisplayName, normalizedAvatarUrl]);

  const requestCompetitionAccess = React.useCallback(async (item: OnlineCompetitionDiscoveryItem) => {
    return mutateDiscoveryCompetition(item, (latest: any) => {
      const policy = String(latest?.enrollment?.policy || latest?.meta?.enrollmentPolicy || "fixed").toLowerCase();
      if (policy !== "approval") throw new Error("Cette compétition n’accepte plus les demandes d’inscription.");
      const players = asArray(latest?.players?.length ? latest.players : latest?.participants);
      const max = Math.max(0, Number(latest?.enrollment?.maxParticipants || latest?.meta?.enrollmentMax || 0) || 0);
      if (max > 0 && players.length >= max) throw new Error("La compétition est complète.");
      const requests = asArray(latest?.enrollmentRequests);
      if (requests.some((row: any) => String(row?.userId || "") === normalizedUserId && String(row?.status || "pending") === "pending")) return latest;
      const request = {
        id: `request-${Date.now()}-${normalizedUserId.slice(-6)}`,
        userId: normalizedUserId,
        profileId: normalizedProfileId || normalizedUserId,
        name: normalizedDisplayName,
        avatarUrl: normalizedAvatarUrl,
        status: "pending",
        requestedAt: Date.now(),
      };
      return { ...latest, enrollmentRequests: [...requests, request], updatedAt: Date.now() };
    }, `Demande envoyée · ${item.name}`);
  }, [mutateDiscoveryCompetition, normalizedUserId, normalizedProfileId, normalizedDisplayName, normalizedAvatarUrl]);

  const followCompetition = React.useCallback(async (item: OnlineCompetitionDiscoveryItem) => {
    return mutateDiscoveryCompetition(item, (latest: any) => {
      const followers = asArray(latest?.followers);
      if (followers.some((row: any) => String(row?.userId || "") === normalizedUserId)) return latest;
      const follower = {
        userId: normalizedUserId,
        profileId: normalizedProfileId || normalizedUserId,
        name: normalizedDisplayName,
        avatarUrl: normalizedAvatarUrl,
        followedAt: Date.now(),
      };
      return { ...latest, followers: [...followers, follower], updatedAt: Date.now() };
    }, `Suivi activé · ${item.name}`);
  }, [mutateDiscoveryCompetition, normalizedUserId, normalizedProfileId, normalizedDisplayName, normalizedAvatarUrl]);

  const unfollowCompetition = React.useCallback(async (item: OnlineCompetitionInboxItem) => {
    return mutateCompetition(item, (latest: any) => ({
      ...latest,
      followers: asArray(latest?.followers).filter((row: any) => String(row?.userId || "") !== normalizedUserId),
      updatedAt: Date.now(),
    }), `Suivi arrêté · ${item.name}`);
  }, [mutateCompetition, normalizedUserId]);

  return {
    items,
    invitations,
    requests,
    active,
    followed,
    discoverable,
    alerts,
    loading,
    error,
    lastSyncAt,
    refresh,
    actionBusy,
    actionNotice,
    acceptInvitation,
    declineInvitation,
    cancelRequest,
    joinOpenCompetition,
    requestCompetitionAccess,
    followCompetition,
    unfollowCompetition,
    clearActionNotice: () => setActionNotice(""),
    clearAlerts: () => setAlerts([]),
  };
}
