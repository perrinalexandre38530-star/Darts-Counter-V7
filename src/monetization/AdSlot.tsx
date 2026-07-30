import React from "react";
import {
  getVerifiedPremiumState,
  loadMonetizationPrefs,
  subscribeMonetizationPrefs,
} from "./prefs";
import { STORE_PACKS } from "./catalog";
import type { AdPlacement, MonetizationPrefs } from "./types";
import { removeNativeBanner } from "./nativeAdMob";
import { isCapacitorNativeRuntime } from "../lib/nativePlatform";
import {
  hideInlineGoogleAd,
  showInlineGoogleAd,
  updateInlineGoogleAd,
  type InlineAdRect,
} from "./inlineAdMob";

export function resolveBannerPlacementForRoute(tab: string, params?: any): AdPlacement | null {
  const route = String(tab || "");

  if (route === "home") return "home";
  if (route === "messages") return "messages";
  if (route === "profiles") return "profiles";
  if (route === "games") return "games";
  if (route === "tournaments" || route === "tournament_list" || route === "tournament_view") return "competitions";
  if (route === "online" || route === "friends") return "online";
  if (route === "stats") return "stats";
  if (route === "settings") return "settings";
  if (route === "cast_host" || route === "viewer_host" || route === "cast_room") return "screens";
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
        minHeight: compact ? 58 : 68,
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

function measureInlineRect(node: HTMLElement): InlineAdRect {
  const rect = node.getBoundingClientRect();
  const viewportHeight = Math.max(0, window.innerHeight || document.documentElement.clientHeight || 0);
  const viewportWidth = Math.max(0, window.innerWidth || document.documentElement.clientWidth || 0);
  const bottomNavSafeArea = 82;

  const visible =
    rect.width >= 300 &&
    rect.height >= 50 &&
    rect.left >= 0 &&
    rect.right <= viewportWidth + 1 &&
    rect.top >= 0 &&
    rect.bottom <= viewportHeight - bottomNavSafeArea;

  return {
    left: Math.max(0, rect.left),
    top: Math.max(0, rect.top),
    width: Math.max(300, rect.width),
    height: Math.max(50, Math.min(100, rect.height)),
    visible,
  };
}

type PaidInlineSurfaceProps = {
  slotKey: string;
  placement: AdPlacement;
  active?: boolean;
  children?: React.ReactNode;
  style?: React.CSSProperties;
  minHeight?: number;
};

/**
 * Surface réellement monétisable sous Android.
 * Le DIV réserve sa place dans le layout React ; le plugin Android superpose
 * une AdView Google exactement sur ce rectangle et la déplace avec le scroll.
 * Sur le web/PWA, le contenu enfant reste visible comme fallback/house promo.
 */
export function PaidInlineSurface({
  slotKey,
  placement,
  active = true,
  children,
  style,
  minHeight = 58,
}: PaidInlineSurfaceProps) {
  const ref = React.useRef<HTMLDivElement | null>(null);
  const shownRef = React.useRef(false);
  const requestRef = React.useRef(false);
  const native = isCapacitorNativeRuntime();
  const [prefs, setPrefs] = React.useState<MonetizationPrefs>(() => loadMonetizationPrefs());

  React.useEffect(() => subscribeMonetizationPrefs(setPrefs), []);

  const premiumActive = getVerifiedPremiumState().active;
  const paidEligible = active && prefs.adsEnabled && prefs.bannersEnabled && !premiumActive;

  React.useEffect(() => {
    if (!native || !paidEligible) {
      shownRef.current = false;
      requestRef.current = false;
      void hideInlineGoogleAd(slotKey);
      return;
    }

    const node = ref.current;
    if (!node) return;
    let raf = 0;
    let destroyed = false;

    const sync = () => {
      if (destroyed) return;
      const rect = measureInlineRect(node);
      if (!rect.visible) {
        if (shownRef.current) void updateInlineGoogleAd(slotKey, rect);
        return;
      }

      if (!shownRef.current && !requestRef.current) {
        requestRef.current = true;
        void showInlineGoogleAd(slotKey, placement, rect)
          .then((shown) => {
            shownRef.current = shown;
          })
          .finally(() => {
            requestRef.current = false;
          });
        return;
      }

      if (shownRef.current) void updateInlineGoogleAd(slotKey, rect);
    };

    const schedule = () => {
      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(sync);
    };

    const resizeObserver = typeof ResizeObserver !== "undefined" ? new ResizeObserver(schedule) : null;
    resizeObserver?.observe(node);
    window.addEventListener("resize", schedule);
    window.addEventListener("orientationchange", schedule);
    document.addEventListener("scroll", schedule, true);
    schedule();

    return () => {
      destroyed = true;
      if (raf) cancelAnimationFrame(raf);
      resizeObserver?.disconnect();
      window.removeEventListener("resize", schedule);
      window.removeEventListener("orientationchange", schedule);
      document.removeEventListener("scroll", schedule, true);
      shownRef.current = false;
      requestRef.current = false;
      void hideInlineGoogleAd(slotKey);
    };
  }, [native, paidEligible, placement, slotKey]);

  return (
    <div
      ref={ref}
      data-dc-paid-inline-ad={slotKey}
      data-dc-paid-inline-placement={placement}
      style={{
        minHeight,
        width: "100%",
        boxSizing: "border-box",
        position: "relative",
        overflow: "hidden",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

type InlineAdBannerProps = {
  placement: AdPlacement;
  slotKey?: string;
  offset?: number;
  compact?: boolean;
  style?: React.CSSProperties;
};

export function InlineAdBanner({
  placement,
  slotKey,
  offset = 0,
  compact = false,
  style,
}: InlineAdBannerProps) {
  const [prefs, setPrefs] = React.useState<MonetizationPrefs>(() => loadMonetizationPrefs());
  const [packIndex, setPackIndex] = React.useState(0);

  React.useEffect(() => subscribeMonetizationPrefs(setPrefs), []);

  // Le vieux banner ancré du plugin communautaire reste interdit : seules les
  // nouvelles AdView inline du plugin InlineAdMob sont autorisées.
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

  const stableSlotKey = slotKey || `menu-${placement}`;

  return (
    <PaidInlineSurface
      slotKey={stableSlotKey}
      placement={placement}
      active={eligible}
      minHeight={compact ? 58 : 68}
      style={{
        width: "100%",
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
    </PaidInlineSurface>
  );
}

type PageAdBannerProps = {
  placement: AdPlacement;
  slotKey: string;
  style?: React.CSSProperties;
};

/**
 * Bannière des pages principales. Elle doit être rendue explicitement juste
 * après le header de la page afin de rester dans le flux et de ne jamais
 * remonter au-dessus du titre.
 */
export function PageAdBanner({ placement, slotKey, style }: PageAdBannerProps) {
  return (
    <InlineAdBanner
      placement={placement}
      slotKey={slotKey}
      compact
      style={{
        width: "100%",
        margin: "0 0 14px",
        ...style,
      }}
    />
  );
}

export default function AdSlot({ placement }: { placement: AdPlacement | null }) {
  if (!placement || placement === "home") return null;

  return (
    <InlineAdBanner
      placement={placement}
      slotKey={`bottomnav-${placement}`}
      compact
      style={{
        width: "min(520px, calc(100% - 18px))",
        margin: "10px auto 12px",
      }}
    />
  );
}
