import * as React from "react";
import { listOnlineCompetitions } from "../lib/tournaments/onlineStore";
import { showMessageCenterNotification } from "../lib/messageCenterNotify";

export type OnlineCompetitionRelation =
  | "owner"
  | "admin"
  | "participant"
  | "invited"
  | "request";

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

function getOpenRounds(row: any) {
  const cfg = row?.challengeCompetition || {};
  const cycle = Math.max(1, Number(cfg?.currentCycle || 1) || 1);
  const rounds = asArray(cfg?.schedule?.rounds)
    .filter((round: any) => Number(round?.cycle || 1) === cycle)
    .filter((round: any) => String(round?.status || "open") === "open");
  return { cycle, rounds };
}

function toInboxItem(row: any, identities: Set<string>, userId: string): OnlineCompetitionInboxItem | null {
  const id = getCompetitionId(row);
  if (!id) return null;

  const participant = findParticipant(row, identities);
  const invitation = userId ? getInvitation(row, userId) : null;
  const request = userId ? getRequest(row, userId) : null;
  const owner = isOwner(row, identities);
  const admin = isAdmin(row, identities);

  let relation: OnlineCompetitionRelation | null = null;
  if (owner) relation = "owner";
  else if (admin) relation = "admin";
  else if (participant) relation = "participant";
  else if (invitation) relation = "invited";
  else if (request) relation = "request";
  if (!relation) return null;

  const { cycle, rounds } = getOpenRounds(row);
  const openObjectives = Array.from(
    new Set(
      rounds.flatMap((round: any) => asArray(round?.objectives).map(normalizeObjective)).filter(Boolean)
    )
  );

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
  };
}

function readSnapshot(key: string): Record<string, { openRoundIds: string[]; updatedAt: number }> | null {
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

function writeSnapshot(key: string, value: Record<string, { openRoundIds: string[]; updatedAt: number }>) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

function publicCompetitionUrl(id: string) {
  if (typeof window === "undefined") return `/#/competition/${encodeURIComponent(id)}`;
  return `${window.location.origin}${window.location.pathname}#/competition/${encodeURIComponent(id)}`;
}

export function useOnlineCompetitionInbox({ userId, profileId, enabled = true, pollMs = 20_000 }: Args) {
  const normalizedUserId = String(userId || "").trim();
  const normalizedProfileId = String(profileId || "").trim();
  const [items, setItems] = React.useState<OnlineCompetitionInboxItem[]>([]);
  const [alerts, setAlerts] = React.useState<OnlineCompetitionAlert[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");
  const [lastSyncAt, setLastSyncAt] = React.useState<number>(0);
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
      setAlerts([]);
      setError("");
      return [] as OnlineCompetitionInboxItem[];
    }

    setLoading((prev) => prev || !items.length);
    try {
      const rows = await listOnlineCompetitions({ limit: 100 });
      const identities = getIdentities(normalizedUserId, normalizedProfileId);
      const next = asArray(rows)
        .map((row: any) => toInboxItem(row, identities, normalizedUserId))
        .filter(Boolean) as OnlineCompetitionInboxItem[];

      next.sort((a, b) => {
        const aPending = a.invitation?.status === "pending" ? 1 : a.request?.status === "pending" ? 1 : 0;
        const bPending = b.invitation?.status === "pending" ? 1 : b.request?.status === "pending" ? 1 : 0;
        return bPending - aPending || b.updatedAt - a.updatedAt || a.name.localeCompare(b.name);
      });

      const snapshotKey = `${SNAPSHOT_PREFIX}${normalizedUserId}`;
      const previous = readSnapshot(snapshotKey);
      const freshSnapshot: Record<string, { openRoundIds: string[]; updatedAt: number }> = {};
      const newAlerts: OnlineCompetitionAlert[] = [];

      for (const item of next) {
        const roundIds = item.openRounds.map((round: any) => String(round?.id || `c${item.currentCycle}-r${round?.round || 0}`));
        freshSnapshot[item.id] = { openRoundIds: roundIds, updatedAt: item.updatedAt };

        // Ne notifier que les joueurs/admins déjà engagés dans la compétition.
        if (!previous || !["owner", "admin", "participant"].includes(item.relation)) continue;
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
  }, [enabled, normalizedUserId, normalizedProfileId, pollMs]);

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

  return {
    items,
    invitations,
    requests,
    active,
    alerts,
    loading,
    error,
    lastSyncAt,
    refresh,
    clearAlerts: () => setAlerts([]),
  };
}
