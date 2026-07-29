import React from "react";
import { createPortal } from "react-dom";
import {
  getVerifiedPremiumState,
  loadMonetizationPrefs,
  subscribeMonetizationPrefs,
} from "./prefs";
import { STORE_PACKS } from "./catalog";
import type { AdPlacement, MonetizationPrefs } from "./types";


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
    return null;
  }

  return (
    <aside
      aria-label="Espace promotionnel intégré"
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
        boxSizing: "border-box",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: compact ? "7px 10px" : "9px 11px" }}>
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
  if (existing && existing.isConnected) {
    if (existing.previousElementSibling !== anchor) {
      anchor.insertAdjacentElement("afterend", existing);
    }
    return existing;
  }

  const host = document.createElement("div");
  host.setAttribute("data-dc-inline-host", key);
  host.style.width = "100%";
  host.style.maxWidth = "520px";
  host.style.margin = "0 auto 14px";
  host.style.boxSizing = "border-box";
  host.style.position = "relative";
  host.style.zIndex = "1";
  anchor.insertAdjacentElement("afterend", host);
  return host;
}

function removeHomeHosts() {
  if (typeof document === "undefined") return;
  document
    .querySelectorAll<HTMLElement>('[data-dc-inline-host="home-top"],[data-dc-inline-host="home-profile"]')
    .forEach((node) => node.remove());
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
  const [targets, setTargets] = React.useState<{ top: HTMLElement | null; profile: HTMLElement | null }>({
    top: null,
    profile: null,
  });

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

  if (!prefs.adsEnabled || !prefs.bannersEnabled) return null;

  return (
    <>
      {targets.top
        ? createPortal(
            <InlineCard placement={placement} prefs={prefs} packIndex={packIndex} compact />,
            targets.top
          )
        : null}
      {targets.profile
        ? createPortal(
            <InlineCard placement={placement} prefs={prefs} packIndex={packIndex + 1} compact />,
            targets.profile
          )
        : null}
    </>
  );
}

export default function AdSlot({ placement }: { placement: AdPlacement | null }) {
  const [prefs, setPrefs] = React.useState<MonetizationPrefs>(() => loadMonetizationPrefs());
  const [packIndex, setPackIndex] = React.useState(0);

  React.useEffect(() => subscribeMonetizationPrefs(setPrefs), []);

  // Le contenu du bandeau peut tourner, mais le bandeau reste toujours à sa place.
  React.useEffect(() => {
    if (!prefs.houseAdsEnabled || STORE_PACKS.length <= 1) return;
    const id = window.setInterval(() => setPackIndex((v) => (v + 1) % STORE_PACKS.length), 12000);
    return () => window.clearInterval(id);
  }, [prefs.houseAdsEnabled]);

  const premiumActive = getVerifiedPremiumState().active;
  const eligible = !!placement && prefs.adsEnabled && prefs.bannersEnabled && !premiumActive;

  if (!eligible || !placement) return null;

  if (placement === "home") {
    return <HomeInlineAds placement={placement} prefs={prefs} packIndex={packIndex} />;
  }

  // Pages hors Home : bloc intégré au flux normal de la page.
  // Aucun positionnement natif / flottant au-dessus de la WebView ou de la BottomNav.
  return (
    <div
      data-dc-inline-ad-shell={placement}
      style={{
        width: "min(520px, calc(100vw - 18px))",
        margin: "14px auto 96px",
        position: "relative",
        zIndex: 1,
        boxSizing: "border-box",
      }}
    >
      <InlineCard placement={placement} prefs={prefs} packIndex={packIndex} />
    </div>
  );
}
