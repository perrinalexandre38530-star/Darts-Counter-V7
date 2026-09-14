import * as React from "react";
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
};

export function useViewerInteractiveBridge({ tab, routeParams, go }: Props) {
  const latestRef = React.useRef({ tab: String(tab || ""), routeParams, go });
  latestRef.current = { tab: String(tab || ""), routeParams, go };
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
        if (data.type !== "navigate") return;
        const target = String(data.tab || "");
        if (!isViewerRemoteTabAllowed(target)) return;

        const current = latestRef.current;
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
          window.setTimeout(() => publishNavigation("tv_join"), 20);
        }
      },
    });

    window.setTimeout(() => publishNavigation("host_connect"), 50);
    return () => {
      // La connexion singleton reste active entre deux renders. Elle sera
      // remplacée/fermée automatiquement quand la session change.
    };
  }, [sessionId, publishNavigation]);

  React.useEffect(() => {
    if (!sessionId) return;
    publishNavigation("route_change");
  }, [sessionId, tab, routeParams, publishNavigation]);
}
