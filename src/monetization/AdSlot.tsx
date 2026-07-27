import React from "react";
import { getVerifiedPremiumState, loadMonetizationPrefs, subscribeMonetizationPrefs } from "./prefs";
import { STORE_PACKS } from "./catalog";
import type { AdPlacement, MonetizationPrefs } from "./types";

export function resolveBannerPlacementForRoute(tab: string, params?: any): AdPlacement | null {
  const route = String(tab || "");
  if (route === "home") return "home";
  if (route === "games") return "games";
  if (route === "settings") return "settings";
  if (route === "statsDetail") return "history";
  if (route === "statsHub" && String(params?.tab || "").toLowerCase() === "history") return "history";
  if (route === "stats" || route === "statsHub") return "stats";
  return null;
}

export default function AdSlot({ placement }: { placement: AdPlacement | null }) {
  const [prefs, setPrefs] = React.useState<MonetizationPrefs>(() => loadMonetizationPrefs());
  const [packIndex, setPackIndex] = React.useState(0);

  React.useEffect(() => subscribeMonetizationPrefs(setPrefs), []);
  React.useEffect(() => {
    if (!prefs.houseAdsEnabled) return;
    const id = window.setInterval(() => setPackIndex((v) => (v + 1) % STORE_PACKS.length), 9000);
    return () => window.clearInterval(id);
  }, [prefs.houseAdsEnabled]);

  if (!placement || !prefs.adsEnabled || !prefs.bannersEnabled || getVerifiedPremiumState().active) return null;

  const pack = STORE_PACKS[packIndex % STORE_PACKS.length];
  const isPreview = prefs.testMode;
  if (!prefs.houseAdsEnabled && !isPreview) return null;

  return (
    <aside
      aria-label="Espace publicitaire"
      data-dc-ad-placement={placement}
      style={{
        position: "fixed",
        zIndex: 1800,
        left: "50%",
        bottom: 76,
        transform: "translateX(-50%)",
        width: "min(520px, calc(100vw - 18px))",
        minHeight: 54,
        borderRadius: 14,
        border: "1px solid rgba(255,255,255,.16)",
        background: "linear-gradient(180deg,rgba(17,24,39,.98),rgba(5,9,16,.98))",
        boxShadow: "0 12px 34px rgba(0,0,0,.48)",
        overflow: "hidden",
        color: "#fff",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 10px" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 9, opacity: .62, letterSpacing: 1.1, fontWeight: 900 }}>
            {isPreview ? "PUBLICITÉ · APERÇU TEST" : "MULTISPORTS SCORING"} · {placement.toUpperCase()}
          </div>
          <div style={{ marginTop: 2, fontSize: 12, fontWeight: 950, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {isPreview ? "Emplacement bannière prêt pour le fournisseur Android" : pack.title}
          </div>
          <div style={{ marginTop: 1, fontSize: 10, opacity: .7, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {isPreview ? "AdMob sera branché ici lors de la création du shell Android." : pack.subtitle}
          </div>
        </div>
        <div style={{ flexShrink: 0, borderRadius: 999, padding: "6px 8px", fontSize: 9, fontWeight: 950, border: "1px solid rgba(255,194,60,.48)", color: "#ffd15a" }}>
          {isPreview ? "TEST" : "BIENTÔT"}
        </div>
      </div>
    </aside>
  );
}
