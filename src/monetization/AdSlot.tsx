import React from "react";
import { createPortal } from "react-dom";
import {
  getVerifiedPremiumState,
  loadMonetizationPrefs,
  subscribeMonetizationPrefs,
} from "./prefs";
import { STORE_PACKS } from "./catalog";
import type { AdPlacement, MonetizationPrefs } from "./types";
import { isCapacitorNativeRuntime } from "../lib/nativePlatform";
import { removeNativeBanner, showNativeBanner } from "./nativeAdMob";

const HOME_PHASE_MS = 9000;
const NATIVE_SCROLL_IDLE_MS = 220;

export function resolveBannerPlacementForRoute(tab: string, params?: any): AdPlacement | null {
  const route = String(tab || "");

  if (route === "home") return "home";
  if (route === "messages") return "messages";
  if (route === "profiles") return "profiles";
  if (route === "games") return "games";
  if (route === "tournaments" || route === "tournament_list" || route === "tournament_view") return "competitions";
  if (route === "online" || route === "friends") return "online";
  if (route === "settings") return "settings";
  if (route === "cast_host" || route === "viewer_host" || route === "cast_room") return "screens";
  if (route === "statsDetail") return "history";
  if (route === "statsHub" && String(params?.tab || "").toLowerCase() === "history") return "history";
  if (route === "stats" || route === "statsHub") return "stats";

  // Aucun gameplay / keypad / saisie de volée n'est monétisé ici.
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

  if (!prefs.houseAdsEnabled && !isPreview) {
    return <div aria-label="Emplacement publicitaire" data-dc-inline-ad-empty="1" style={{ minHeight: compact ? 58 : 64 }} />;
  }

  return (
    <aside
      aria-label="Espace publicitaire"
      data-dc-ad-placement={placement}
      style={{
        width: "100%",
        minHeight: compact ? 58 : 64,
        borderRadius: 16,
        border: "1px solid rgba(255,255,255,.15)",
        background: "linear-gradient(135deg,rgba(7,12,24,.98),rgba(17,24,39,.98) 55%,rgba(4,8,16,.98))",
        boxShadow: "0 12px 28px rgba(0,0,0,.38)",
        overflow: "hidden",
        color: "#fff",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: compact ? "7px 10px" : "9px 11px" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 9, opacity: 0.62, letterSpacing: 1.05, fontWeight: 900 }}>
            {isPreview ? "PUBLICITÉ · APERÇU TEST" : "MULTISPORTS SCORING"} · {placement.toUpperCase()}
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
            {isPreview ? "Emplacement prêt pour Google AdMob Android" : pack?.title || "MULTISPORTS SCORING"}
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
            {isPreview
              ? "Sur Android, une vraie bannière TEST Google est affichée à cet emplacement."
              : pack?.subtitle || "Nouveautés, contenus et partenaires."}
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

function findExactTextElement(text: string): HTMLElement | null {
  const wanted = text.trim().toUpperCase();
  const nodes = Array.from(document.querySelectorAll<HTMLElement>("div,span,h1,h2,h3"));
  return (
    nodes.find((el) => {
      if (el.children.length > 0) return false;
      return String(el.textContent || "").trim().toUpperCase() === wanted;
    }) || null
  );
}

function findHomeAnchors(): { header: HTMLElement | null; activeCard: HTMLElement | null } {
  if (typeof document === "undefined") return { header: null, activeCard: null };

  const dartsCounter = findExactTextElement("DARTS COUNTER");
  const dartsScoring = findExactTextElement("DARTS SCORING");
  const knownSports = [
    dartsCounter,
    dartsScoring,
    findExactTextElement("PETANQUE COUNTER"),
    findExactTextElement("BABY-FOOT COUNTER"),
    findExactTextElement("PING-PONG COUNTER"),
    findExactTextElement("MÖLKKY COUNTER"),
    findExactTextElement("DICE COUNTER"),
    findExactTextElement("FOOT SCORING"),
  ].filter(Boolean) as HTMLElement[];

  const title = knownSports[0] || null;
  if (!title) return { header: null, activeCard: null };

  // Renommage demandé uniquement pour le module Darts.
  if (String(title.textContent || "").trim().toUpperCase() === "DARTS COUNTER") {
    title.textContent = "DARTS SCORING";
  }

  const header = title.parentElement as HTMLElement | null;
  if (!header) return { header: null, activeCard: null };

  let cursor = header.nextElementSibling as HTMLElement | null;
  while (cursor && cursor.tagName === "STYLE") {
    cursor = cursor.nextElementSibling as HTMLElement | null;
  }

  return { header, activeCard: cursor };
}

function ensureHomePortalHost(anchor: HTMLElement, key: "home-top" | "home-profile"): HTMLElement {
  const selector = `[data-dc-inline-host="${key}"]`;
  const existing = document.querySelector<HTMLElement>(selector);
  if (existing && existing.isConnected) return existing;

  const host = document.createElement("div");
  host.setAttribute("data-dc-inline-host", key);
  host.style.width = "100%";
  host.style.maxWidth = "520px";
  host.style.margin = "0 auto 14px";
  host.style.boxSizing = "border-box";
  anchor.insertAdjacentElement("afterend", host);
  return host;
}

function removeHomeHosts() {
  if (typeof document === "undefined") return;
  document
    .querySelectorAll<HTMLElement>('[data-dc-inline-host="home-top"],[data-dc-inline-host="home-profile"]')
    .forEach((node) => node.remove());
}

function elementViewportMargin(el: HTMLElement): number | null {
  const rect = el.getBoundingClientRect();
  const vh = window.visualViewport?.height || window.innerHeight || 0;
  const bannerHeight = Math.max(50, Math.min(90, rect.height || 60));

  if (rect.bottom <= 0 || rect.top >= vh) return null;
  if (rect.top < 0 || rect.bottom > vh) return null;

  const offsetTop = Number(window.visualViewport?.offsetTop || 0);
  return Math.max(0, Math.round(rect.top + offsetTop + Math.max(0, (rect.height - bannerHeight) / 2)));
}

function HomeInlineAds({
  placement,
  prefs,
  packIndex,
}: {
  placement: AdPlacement;
  prefs: MonetizationPrefs;
  packIndex: number;
}) {
  const nativeRuntime = isCapacitorNativeRuntime();
  const [phase, setPhase] = React.useState(0);
  const [targets, setTargets] = React.useState<{ top: HTMLElement | null; profile: HTMLElement | null }>({
    top: null,
    profile: null,
  });

  React.useEffect(() => {
    const id = window.setInterval(() => setPhase((p) => (p + 1) % 4), HOME_PHASE_MS);
    return () => window.clearInterval(id);
  }, []);

  React.useEffect(() => {
    let stopped = false;

    const refresh = () => {
      if (stopped) return;
      const anchors = findHomeAnchors();
      if (!anchors.header) {
        setTargets({ top: null, profile: null });
        return;
      }

      const top = ensureHomePortalHost(anchors.header, "home-top");
      const profile = anchors.activeCard ? ensureHomePortalHost(anchors.activeCard, "home-profile") : null;

      setTargets((prev) => (prev.top === top && prev.profile === profile ? prev : { top, profile }));
    };

    refresh();
    const id = window.setInterval(refresh, 1200);

    return () => {
      stopped = true;
      window.clearInterval(id);
      removeHomeHosts();
    };
  }, []);

  const activeTarget = phase === 0 ? targets.top : phase === 2 ? targets.profile : null;

  React.useEffect(() => {
    if (!nativeRuntime) return;
    if (!prefs.adsEnabled || !prefs.bannersEnabled || !activeTarget) {
      void removeNativeBanner();
      return;
    }

    let timer: number | undefined;

    const sync = () => {
      const margin = elementViewportMargin(activeTarget);
      if (margin == null) {
        void removeNativeBanner();
        return;
      }
      void showNativeBanner(`${placement}:${phase === 0 ? "top" : "profile"}`, {
        position: "TOP_CENTER",
        margin,
      });
    };

    const schedule = () => {
      if (timer) window.clearTimeout(timer);
      timer = window.setTimeout(sync, NATIVE_SCROLL_IDLE_MS);
    };

    sync();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);

    return () => {
      if (timer) window.clearTimeout(timer);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      void removeNativeBanner();
    };
  }, [nativeRuntime, prefs.adsEnabled, prefs.bannersEnabled, activeTarget, placement, phase]);

  if (!prefs.adsEnabled || !prefs.bannersEnabled) return null;

  const topVisible = phase === 0;
  const profileVisible = phase === 2;

  const topPortal = targets.top
    ? createPortal(
        <div
          style={{
            maxHeight: topVisible ? 74 : 0,
            opacity: topVisible ? 1 : 0,
            overflow: "hidden",
            transition: "max-height .28s ease, opacity .2s ease",
          }}
        >
          {topVisible && <InlineCard placement={placement} prefs={prefs} packIndex={packIndex} compact />}
        </div>,
        targets.top
      )
    : null;

  const profilePortal = targets.profile
    ? createPortal(
        <div
          style={{
            maxHeight: profileVisible ? 74 : 0,
            opacity: profileVisible ? 1 : 0,
            overflow: "hidden",
            transition: "max-height .28s ease, opacity .2s ease",
          }}
        >
          {profileVisible && <InlineCard placement={placement} prefs={prefs} packIndex={packIndex + 1} compact />}
        </div>,
        targets.profile
      )
    : null;

  return (
    <>
      {topPortal}
      {profilePortal}
    </>
  );
}

export default function AdSlot({ placement }: { placement: AdPlacement | null }) {
  const [prefs, setPrefs] = React.useState<MonetizationPrefs>(() => loadMonetizationPrefs());
  const [packIndex, setPackIndex] = React.useState(0);
  const normalSlotRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => subscribeMonetizationPrefs(setPrefs), []);

  React.useEffect(() => {
    if (!prefs.houseAdsEnabled || STORE_PACKS.length <= 1) return;
    const id = window.setInterval(() => setPackIndex((v) => (v + 1) % STORE_PACKS.length), 9000);
    return () => window.clearInterval(id);
  }, [prefs.houseAdsEnabled]);

  const premiumActive = getVerifiedPremiumState().active;
  const nativeRuntime = isCapacitorNativeRuntime();
  const eligible = !!placement && prefs.adsEnabled && prefs.bannersEnabled && !premiumActive;

  React.useEffect(() => {
    if (placement === "home") return;
    if (!nativeRuntime) return;

    if (!eligible || !normalSlotRef.current) {
      void removeNativeBanner();
      return;
    }

    let timer: number | undefined;

    const sync = () => {
      const el = normalSlotRef.current;
      if (!el) return;

      const margin = elementViewportMargin(el);
      if (margin == null) {
        void removeNativeBanner();
        return;
      }

      void showNativeBanner(String(placement), {
        position: "TOP_CENTER",
        margin,
      });
    };

    const schedule = () => {
      if (timer) window.clearTimeout(timer);
      timer = window.setTimeout(sync, NATIVE_SCROLL_IDLE_MS);
    };

    sync();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);

    return () => {
      if (timer) window.clearTimeout(timer);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      void removeNativeBanner();
    };
  }, [nativeRuntime, eligible, placement]);

  if (!eligible || !placement) return null;

  if (placement === "home") {
    return <HomeInlineAds placement={placement} prefs={prefs} packIndex={packIndex} />;
  }

  return (
    <div
      ref={normalSlotRef}
      data-dc-inline-ad-shell={placement}
      style={{
        width: "min(520px, calc(100vw - 18px))",
        margin: "-142px auto 88px",
        position: "relative",
        zIndex: 20,
        boxSizing: "border-box",
      }}
    >
      <InlineCard placement={placement} prefs={prefs} packIndex={packIndex} />
    </div>
  );
}
