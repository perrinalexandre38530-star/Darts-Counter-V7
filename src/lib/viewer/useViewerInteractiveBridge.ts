import * as React from "react";
import { useSport } from "../../contexts/SportContext";
import { getActiveViewerSession, subscribeViewerSessionChanged } from "./viewerSession";
import {
  closeViewerRealtimeHost,
  configureViewerRealtimeHost,
  sendViewerHostCommand,
  sendViewerHostLifecycle,
} from "./viewerRealtime";
import {
  isViewerGameplayRoute,
  isViewerRemoteTabAllowed,
  sanitizeViewerRouteParams,
  viewerRouteLabel,
} from "./viewerNavigation";

type Props = {
  tab: string;
  routeParams?: any;
  go: (tab: any, params?: any) => void;
  store?: any;
  setActiveProfile?: (profileId: string) => void;
  updateSetting?: (key: string, value: any) => void;
  startX01?: (payload: any) => void;
};

const TV_SPORT_IDS = new Set([
  "darts",
  "petanque",
  "pingpong",
  "babyfoot",
  "molkky",
  "dicegame",
  "foot",
  "running",
  "fit",
  "esports",
]);

const TV_SETTING_KEYS = new Set([
  "defaultX01",
  "doubleOut",
  "randomOrder",
  "ttsOnThird",
  "neonTheme",
]);

function n(value: any) {
  const out = Number(value);
  return Number.isFinite(out) ? out : 0;
}

function profileStatsForTv(raw: any) {
  if (!raw || typeof raw !== "object") return {};
  return {
    games: n(raw.games ?? raw.matches ?? raw.played),
    wins: n(raw.wins),
    losses: n(raw.losses),
    avg3: n(raw.avg3 ?? raw.average),
    bestVisit: n(raw.bestVisit),
    bestCheckout: n(raw.bestCheckout),
    h180: n(raw.h180 ?? raw.x180),
    coRate: n(raw.coRate ?? raw.checkoutRate),
  };
}

function buildTvState(store: any, sport: string) {
  const profiles = Array.isArray(store?.profiles) ? store.profiles : [];
  const friends = Array.isArray(store?.friends) ? store.friends : [];
  const saved = Array.isArray(store?.saved) ? store.saved : [];
  const settings = store?.settings && typeof store.settings === "object" ? store.settings : {};

  return {
    type: "tv_state",
    activeSport: TV_SPORT_IDS.has(String(sport || "")) ? String(sport) : "darts",
    activeProfileId: store?.activeProfileId ?? null,
    profiles: profiles.slice(0, 40).map((profile: any) => ({
      id: String(profile?.id || ""),
      name: String(profile?.name || "Joueur"),
      stats: profileStatsForTv(profile?.stats),
    })),
    friends: friends.slice(0, 40).map((friend: any) => ({
      id: String(friend?.id || ""),
      name: String(friend?.name || "Joueur"),
      status: String(friend?.status || "offline"),
    })),
    inProgress: saved
      .filter((match: any) => String(match?.status || "") === "in_progress")
      .slice(0, 8)
      .map((match: any) => ({
        id: String(match?.id || ""),
        kind: String(match?.kind || ""),
        updatedAt: n(match?.updatedAt),
        players: Array.isArray(match?.players)
          ? match.players.slice(0, 12).map((player: any) => ({ id: String(player?.id || ""), name: String(player?.name || "Joueur") }))
          : [],
      })),
    settings: {
      lang: String(settings?.lang || "fr"),
      defaultX01: n(settings?.defaultX01) || 501,
      doubleOut: !!settings?.doubleOut,
      randomOrder: !!settings?.randomOrder,
      ttsOnThird: !!settings?.ttsOnThird,
      neonTheme: !!settings?.neonTheme,
    },
    at: Date.now(),
  };
}

export function useViewerInteractiveBridge({
  tab,
  routeParams,
  go,
  store,
  setActiveProfile,
  updateSetting,
  startX01,
}: Props) {
  const sportApi = useSport() as any;
  const sport = String(sportApi?.sport || "darts");

  const latestRef = React.useRef({
    tab: String(tab || ""),
    routeParams,
    go,
    store,
    sport,
    setActiveProfile,
    updateSetting,
    startX01,
  });
  latestRef.current = {
    tab: String(tab || ""),
    routeParams,
    go,
    store,
    sport,
    setActiveProfile,
    updateSetting,
    startX01,
  };

  const [sessionId, setSessionId] = React.useState(() => getActiveViewerSession()?.sessionId || "");

  const publishNavigation = React.useCallback((reason = "route") => {
    const current = latestRef.current;
    if (!sessionId) return false;
    return sendViewerHostCommand({
      type: "navigation_state",
      tab: current.tab,
      params: sanitizeViewerRouteParams(current.routeParams),
      label: viewerRouteLabel(current.tab),
      gameplay: isViewerGameplayRoute(current.tab),
      at: Date.now(),
      reason,
    });
  }, [sessionId]);

  const publishTvState = React.useCallback((reason = "state") => {
    const current = latestRef.current;
    if (!sessionId) return false;
    return sendViewerHostCommand({
      ...buildTvState(current.store, current.sport),
      reason,
    });
  }, [sessionId]);

  React.useEffect(() => {
    const refresh = () => setSessionId(getActiveViewerSession()?.sessionId || "");
    refresh();
    return subscribeViewerSessionChanged(refresh);
  }, []);

  React.useEffect(() => {
    if (!sessionId) {
      closeViewerRealtimeHost();
      return;
    }

    configureViewerRealtimeHost({
      sessionId,
      onCommand: (data) => {
        if (!data || typeof data !== "object") return;
        const current = latestRef.current;

        if (data.type === "request_tv_state") {
          publishTvState("tv_request");
          publishNavigation("tv_request");
          return;
        }

        if (data.type === "select_sport") {
          const nextSport = String(data.sport || "").toLowerCase();
          if (!TV_SPORT_IDS.has(nextSport)) return;
          try {
            sportApi?.setSport?.(nextSport);
            window.dispatchEvent(new CustomEvent("dc:sport-change", {
              detail: { sport: nextSport, source: "samsung-tv" },
            }));
          } catch {}

          const target = String(data.tab || "games");
          if (isViewerRemoteTabAllowed(target)) {
            window.setTimeout(() => {
              try { latestRef.current.go(target as any, data.params || undefined); } catch {}
            }, 0);
          }
          window.setTimeout(() => publishTvState("tv_select_sport"), 30);
          return;
        }

        if (data.type === "select_profile") {
          const profileId = String(data.profileId || "");
          if (!profileId) return;
          const exists = Array.isArray(current.store?.profiles)
            && current.store.profiles.some((profile: any) => String(profile?.id || "") === profileId);
          if (!exists) return;
          try { current.setActiveProfile?.(profileId); } catch {}
          window.setTimeout(() => publishTvState("tv_select_profile"), 30);
          return;
        }

        if (data.type === "update_setting") {
          const key = String(data.key || "");
          if (!TV_SETTING_KEYS.has(key)) return;
          try { current.updateSetting?.(key, data.value); } catch {}
          window.setTimeout(() => publishTvState("tv_update_setting"), 30);
          return;
        }

        if (data.type === "start_x01") {
          try { current.startX01?.(data.config || {}); } catch {}
          return;
        }

        if (data.type !== "navigate") return;
        const target = String(data.tab || "");
        if (!isViewerRemoteTabAllowed(target)) return;

        // En partie, la télécommande TV pilote l'affichage TV sans arracher le
        // téléphone à la saisie de score. La navigation bidirectionnelle reprend
        // dès que le téléphone n'est plus sur un écran de jeu.
        if (isViewerGameplayRoute(current.tab)) {
          sendViewerHostLifecycle({
            type: "navigation_blocked_gameplay",
            tab: current.tab,
            requestedTab: target,
            at: Date.now(),
          });
          return;
        }
        try { current.go(target as any, data.params || undefined); } catch {}
      },
      onLifecycle: (data) => {
        if (data?.type === "join" && data?.role === "guest") {
          window.setTimeout(() => {
            publishNavigation("tv_join");
            publishTvState("tv_join");
          }, 20);
        }
      },
    });

    window.setTimeout(() => {
      publishNavigation("host_connect");
      publishTvState("host_connect");
    }, 50);

    return () => {
      // La connexion singleton reste active entre les écrans. Elle sera
      // remplacée/fermée automatiquement quand la session change.
    };
  }, [publishNavigation, publishTvState, sessionId, sportApi]);

  React.useEffect(() => {
    if (!sessionId) return;
    publishNavigation("route_change");
  }, [sessionId, tab, routeParams, publishNavigation]);

  React.useEffect(() => {
    if (!sessionId) return;
    const timer = window.setTimeout(() => publishTvState("store_change"), 45);
    return () => window.clearTimeout(timer);
  }, [
    sessionId,
    sport,
    store?.profiles,
    store?.activeProfileId,
    store?.friends,
    store?.settings,
    store?.saved,
    publishTvState,
  ]);
}
