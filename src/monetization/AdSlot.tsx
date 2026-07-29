import React from "react";
import {
  getVerifiedPremiumState,
  loadMonetizationPrefs,
  subscribeMonetizationPrefs,
} from "./prefs";
import { STORE_PACKS } from "./catalog";
import type { AdPlacement, MonetizationPrefs } from "./types";
import { removeNativeBanner } from "./nativeAdMob";

export function resolveBannerPlacementForRoute(tab: string, params?: any): AdPlacement | null {
  const route = String(tab || "");

  // Pages principales accessibles depuis la BottomNav.
  if (route === "home") return "home";
  if (route === "messages") return "messages";
  if (route === "profiles") return "profiles";
  if (route === "games") return "games";
  if (route === "tournaments" || route === "tournament_list" || route === "tournament_view") return "competitions";
  if (route === "online" || route === "friends") return "online";
  if (route === "stats") return "stats";
  if (route === "settings") return "settings";
  if (route === "cast_host" || route === "viewer_host" || route === "cast_room") return "screens";

  // Sous-pages statistiques utiles, sans jamais monétiser un écran PLAY.
  if (route === "statsDetail") return "history";
  if (route === "statsHub" && String(params?.tab || "").toLowerCase() === "history") return "history";
  if (route === "statsHub") return "stats";

  return null;
}

type InlineCardProps = {
  placement: AdPlacement;
  prefs: MonetizationPrefs;
  packIndex: number;
  compact?: boolean;
};

function InlineCard({ placement, prefs, packIndex, compact = false }: InlineCardProps) {
  const pack = STORE_PACKS[packIndex % Math.max(1, STORE_PACKS.length)];
  const isPreview = prefs.testMode;

  if (!prefs.houseAdsEnabled && !isPreview) return null;

  return (
    <aside
      aria-label="Espace promotionnel intégré"
      data-dc-ad-placement={placement}
      style={{
        width: "100%",
        minHeight: compact ? 56 : 64,
        borderRadius: 16,
        border: "1px solid rgba(255,255,255,.15)",
        background:
          "linear-gradient(135deg,rgba(7,12,24,.98),rgba(17,24,39,.98) 55%,rgba(4,8,16,.98))",
        boxShadow: "0 12px 28px rgba(0,0,0,.38)",
        overflow: "hidden",
        color: "#fff",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: compact ? "7px 10px" : "9px 11px",
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 9, opacity: 0.62, letterSpacing: 1.05, fontWeight: 900 }}>
            {isPreview ? "PUBLICITÉ · APERÇU INTÉGRÉ" : "MULTISPORTS SCORING"} · {placement.toUpperCase()}
          </div>
          <div
            style={{
              marginTop: 2,
              fontSize: 12,
              fontWeight: 950,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {pack?.title || "MULTISPORTS SCORING"}
          </div>
          <div
            style={{
              marginTop: 1,
              fontSize: 10,
              opacity: 0.72,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {pack?.subtitle || "Nouveautés, contenus et partenaires."}
          </div>
        </div>
        <div
          style={{
            flexShrink: 0,
            borderRadius: 999,
            padding: "6px 8px",
            fontSize: 9,
            fontWeight: 950,
            border: "1px solid rgba(255,194,60,.48)",
            color: "#ffd15a",
          }}
        >
          {isPreview ? "TEST" : "BIENTÔT"}
        </div>
      </div>
    </aside>
  );
}

type InlineAdBannerProps = {
  placement: AdPlacement;
  offset?: number;
  compact?: boolean;
  style?: React.CSSProperties;
};

/**
 * Bandeau 100 % React, intégré dans le flux de la page.
 * Aucun banner AdMob natif flottant n'est utilisé ici.
 */
export function InlineAdBanner({
  placement,
  offset = 0,
  compact = false,
  style,
}: InlineAdBannerProps) {
  const [prefs, setPrefs] = React.useState<MonetizationPrefs>(() => loadMonetizationPrefs());
  const [packIndex, setPackIndex] = React.useState(0);

  React.useEffect(() => subscribeMonetizationPrefs(setPrefs), []);

  // Tue tout reliquat d'un ancien banner natif Android dès qu'un bandeau intégré est monté.
  React.useEffect(() => {
    void removeNativeBanner();
  }, [placement]);

  React.useEffect(() => {
    if (!prefs.houseAdsEnabled || STORE_PACKS.length <= 1) return;
    const id = window.setInterval(
      () => setPackIndex((v) => (v + 1) % STORE_PACKS.length),
      12000
    );
    return () => window.clearInterval(id);
  }, [prefs.houseAdsEnabled]);

  const premiumActive = getVerifiedPremiumState().active;
  const eligible = prefs.adsEnabled && prefs.bannersEnabled && !premiumActive;
  if (!eligible) return null;

  return (
    <div
      data-dc-inline-ad-shell={placement}
      style={{
        width: "100%",
        boxSizing: "border-box",
        position: "relative",
        zIndex: 1,
        ...style,
      }}
    >
      <InlineCard
        placement={placement}
        prefs={prefs}
        packIndex={packIndex + offset}
        compact={compact}
      />
    </div>
  );
}

/**
 * Bandeau générique des pages BottomNav hors Home.
 * Il est rendu DANS le conteneur scrollable de l'application par App.tsx.
 */
export default function AdSlot({ placement }: { placement: AdPlacement | null }) {
  if (!placement || placement === "home") return null;

  return (
    <InlineAdBanner
      placement={placement}
      compact
      style={{
        width: "min(520px, calc(100% - 18px))",
        margin: "10px auto 12px",
      }}
    />
  );
}
