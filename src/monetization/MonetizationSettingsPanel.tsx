import React from "react";
import { useTheme } from "../contexts/ThemeContext";
import { GOOGLE_PLAY_CORE_PRODUCTS, STORE_PACKS } from "./catalog";
import { getMonetizationRuntimeSnapshot, previewEndGameInterstitial } from "./MonetizationManager";
import {
  applyVerifiedEntitlements,
  getVerifiedAdFreeState,
  getVerifiedPremiumState,
  loadMonetizationPrefs,
  saveMonetizationPrefs,
  subscribeMonetizationPrefs,
  subscribeVerifiedEntitlements,
} from "./prefs";
import type { MonetizationPrefs } from "./types";
import { getNativeAdMobStatus, showNativePrivacyOptions, type NativeAdMobStatus } from "./nativeAdMob";
import { isCapacitorNativeRuntime } from "../lib/nativePlatform";
import { getNativeBillingStatus, type NativeBillingStatus } from "./nativeBilling";
import { getAdMobRuntimeConfig } from "./adMobConfig";

type Mode = "advertising" | "shop" | "all";

type Props = { mode?: Mode };

function MonoIcon({ name, size = 24 }: { name: "ads" | "shop" | "play" | "premium" | "billing" | "privacy"; size?: number }) {
  const p = { fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round" } as const;
  if (name === "ads") return <svg width={size} height={size} viewBox="0 0 24 24"><rect {...p} x="3" y="5" width="18" height="14" rx="3"/><path {...p} d="M7 15V9m0 3h4m5-3v6m0-3h3"/></svg>;
  if (name === "shop") return <svg width={size} height={size} viewBox="0 0 24 24"><path {...p} d="M5 8h14l-1 12H6L5 8Z"/><path {...p} d="M9 9V6a3 3 0 0 1 6 0v3"/></svg>;
  if (name === "play") return <svg width={size} height={size} viewBox="0 0 24 24"><rect {...p} x="3" y="4" width="18" height="16" rx="3"/><path {...p} d="m10 9 5 3-5 3V9Z"/></svg>;
  if (name === "premium") return <svg width={size} height={size} viewBox="0 0 24 24"><path {...p} d="m4 8 4 4 4-7 4 7 4-4-2 10H6L4 8Z"/><path {...p} d="M7 20h10"/></svg>;
  if (name === "billing") return <svg width={size} height={size} viewBox="0 0 24 24"><rect {...p} x="3" y="5" width="18" height="14" rx="3"/><path {...p} d="M3 9h18M7 15h4"/></svg>;
  return <svg width={size} height={size} viewBox="0 0 24 24"><path {...p} d="M12 3 5 6v5c0 4.5 2.7 8 7 10 4.3-2 7-5.5 7-10V6l-7-3Z"/><path {...p} d="M9.5 12 11 13.5l3.5-4"/></svg>;
}

export default function MonetizationSettingsPanel({ mode = "all" }: Props) {
  const { theme } = useTheme() as any;
  const [prefs, setPrefs] = React.useState<MonetizationPrefs>(() => loadMonetizationPrefs());
  const [runtimeTick, setRuntimeTick] = React.useState(0);
  const [nativeStatus, setNativeStatus] = React.useState<NativeAdMobStatus | null>(null);
  const [billingStatus, setBillingStatus] = React.useState<NativeBillingStatus | null>(null);
  const [nativeBusy, setNativeBusy] = React.useState(false);
  const [entitlementRevision, setEntitlementRevision] = React.useState(0);
  const premium = React.useMemo(() => getVerifiedPremiumState(), [entitlementRevision]);
  const adFree = React.useMemo(() => getVerifiedAdFreeState(), [entitlementRevision]);
  const runtime = React.useMemo(() => getMonetizationRuntimeSnapshot(), [runtimeTick]);
  const allowSessionEntitlementTest = getAdMobRuntimeConfig().mode !== "production";

  React.useEffect(() => subscribeMonetizationPrefs(setPrefs), []);
  React.useEffect(() => subscribeVerifiedEntitlements(() => setEntitlementRevision((value) => value + 1)), []);
  React.useEffect(() => {
    if (!isCapacitorNativeRuntime()) return;
    void getNativeAdMobStatus().then(setNativeStatus);
    void getNativeBillingStatus().then(setBillingStatus);
  }, []);

  const patch = (next: Partial<MonetizationPrefs>) => setPrefs(saveMonetizationPrefs(next));

  const refreshNativeStatus = async () => {
    if (!isCapacitorNativeRuntime()) return;
    setNativeBusy(true);
    try {
      const [ads, billing] = await Promise.all([getNativeAdMobStatus(true), getNativeBillingStatus()]);
      setNativeStatus(ads);
      setBillingStatus(billing);
    } finally { setNativeBusy(false); }
  };

  const openPrivacyOptions = async () => {
    setNativeBusy(true);
    try {
      await showNativePrivacyOptions();
      setNativeStatus(await getNativeAdMobStatus());
    } finally { setNativeBusy(false); }
  };

  const card: React.CSSProperties = {
    borderRadius: 18,
    border: `1px solid ${theme.borderSoft}`,
    background: theme.card,
    padding: 14,
    boxShadow: `0 14px 30px rgba(0,0,0,.32), 0 0 16px ${theme.primary}14`,
  };
  const iconBox: React.CSSProperties = {
    width: 42, height: 42, borderRadius: 14, border: `1px solid ${theme.primary}55`, background: `${theme.primary}10`,
    color: theme.primary, display: "grid", placeItems: "center", flexShrink: 0, boxShadow: `0 0 14px ${theme.primary}22`,
  };
  const button = (active = false): React.CSSProperties => ({
    minHeight: 40, borderRadius: 13, border: `1px solid ${active ? theme.primary : theme.borderSoft}`,
    background: active ? `${theme.primary}18` : "rgba(255,255,255,.03)", color: active ? theme.primary : theme.text,
    padding: "8px 11px", fontWeight: 950, fontSize: 10.5, cursor: "pointer",
  });

  const SectionHead = ({ icon, title, subtitle }: { icon: React.ReactNode; title: string; subtitle: string }) => (
    <div style={{ display: "grid", gridTemplateColumns: "42px minmax(0,1fr)", gap: 11, alignItems: "center", marginBottom: 11 }}>
      <div style={iconBox}>{icon}</div>
      <div><div style={{ color: theme.primary, fontWeight: 1000, fontSize: 14.5 }}>{title}</div><div style={{ marginTop: 3, color: theme.textSoft, fontSize: 10.5, lineHeight: 1.35 }}>{subtitle}</div></div>
    </div>
  );

  const Toggle = ({ label, help, value, onChange }: { label: string; help: string; value: boolean; onChange: (v: boolean) => void }) => (
    <button type="button" onClick={() => onChange(!value)} style={{ width: "100%", border: "none", borderTop: `1px solid ${theme.borderSoft}`, background: "transparent", color: theme.text, padding: "11px 0", display: "grid", gridTemplateColumns: "minmax(0,1fr) auto", gap: 10, alignItems: "center", textAlign: "left", cursor: "pointer" }}>
      <div><div style={{ fontSize: 12, fontWeight: 950 }}>{label}</div><div style={{ marginTop: 2, color: theme.textSoft, fontSize: 10, lineHeight: 1.35 }}>{help}</div></div>
      <span style={{ width: 46, height: 26, borderRadius: 999, padding: 3, background: value ? theme.primary : "rgba(255,255,255,.10)", display: "flex", justifyContent: value ? "flex-end" : "flex-start", alignItems: "center", boxShadow: value ? `0 0 12px ${theme.primary}44` : "none" }}><span style={{ width: 20, height: 20, borderRadius: "50%", background: value ? "#061018" : "rgba(255,255,255,.85)" }} /></span>
    </button>
  );

  const showAds = mode === "advertising" || mode === "all";
  const showShop = mode === "shop" || mode === "all";

  return (
    <div style={{ display: "grid", gap: 12, paddingBottom: 72 }}>
      {showAds ? (
        <>
          <section style={card}>
            <SectionHead icon={<MonoIcon name="ads" />} title="PUBLICITÉ" subtitle="Contrôle les emplacements autorisés sans surcharger les écrans de jeu." />
            <div style={{ borderRadius: 14, border: `1px solid ${theme.borderSoft}`, background: "rgba(255,255,255,.025)", padding: "0 11px" }}>
              <Toggle label="Espaces publicitaires" help="Accueil, Jeux, Stats, Historique et Réglages uniquement." value={prefs.adsEnabled} onChange={(v) => patch({ adsEnabled: v })} />
              <Toggle label="Bannières" help="Jamais sur le keypad ou pendant une volée." value={prefs.bannersEnabled} onChange={(v) => patch({ bannersEnabled: v })} />
              <Toggle label="Promotions MULTISPORTS" help="Affiche les packs maison si aucune bannière AdMob n’est disponible." value={prefs.houseAdsEnabled} onChange={(v) => patch({ houseAdsEnabled: v })} />
            </div>
          </section>

          <section style={card}>
            <SectionHead icon={<MonoIcon name="play" />} title="FIN DE PARTIE" subtitle="Interstitiel réservé aux comptes FREE, uniquement après les résultats." />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <div style={{ ...button(true), display: "grid", placeItems: "center", cursor: "default" }}>1 PUB / PARTIE</div>
              <div style={{ ...button(true), display: "grid", placeItems: "center", cursor: "default" }}>APRÈS RÉSULTATS</div>
            </div>
            {getAdMobRuntimeConfig().mode !== "production" ? <button type="button" onClick={() => void previewEndGameInterstitial()} style={{ ...button(true), width: "100%", marginTop: 9 }}>APERÇU INTERSTITIEL</button> : null}
            <div style={{ marginTop: 9, color: theme.textSoft, fontSize: 9.5, lineHeight: 1.4 }}>Parties comptées : {runtime.completedMatches} · Dernière pub : {runtime.lastInterstitialAt ? new Date(runtime.lastInterstitialAt).toLocaleString("fr-FR") : "—"}</div>
            <button type="button" onClick={() => setRuntimeTick((v) => v + 1)} style={{ ...button(false), marginTop: 7 }}>Rafraîchir</button>
          </section>

          <section style={card}>
            <SectionHead icon={<MonoIcon name="privacy" />} title="ANDROID / ADMOB" subtitle="État du consentement et du SDK natif. Les détails techniques restent repliés." />
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
              <div style={{ color: nativeStatus?.initialized ? theme.primary : theme.textSoft, fontSize: 11, fontWeight: 950 }}>{isCapacitorNativeRuntime() ? (nativeStatus?.initialized ? "ADMOB INITIALISÉ" : "À VÉRIFIER") : "PWA · ADMOB NATIF INACTIF"}</div>
              {isCapacitorNativeRuntime() ? <button type="button" disabled={nativeBusy} onClick={() => void refreshNativeStatus()} style={button(true)}>{nativeBusy ? "…" : "VÉRIFIER"}</button> : null}
            </div>
            {isCapacitorNativeRuntime() && nativeStatus?.privacyOptionsRequired ? <button type="button" disabled={nativeBusy} onClick={() => void openPrivacyOptions()} style={{ ...button(false), width: "100%", marginTop: 8 }}>Options de confidentialité</button> : null}
            <details style={{ marginTop: 10, color: theme.textSoft, fontSize: 9.5 }}>
              <summary style={{ cursor: "pointer", color: theme.primary, fontWeight: 900 }}>Détails techniques</summary>
              <div style={{ marginTop: 8, lineHeight: 1.5 }}>Consentement : {nativeStatus?.consentStatus || "—"}<br/>Demandes autorisées : {nativeStatus?.canRequestAds ? "oui" : "non"}<br/>Mode : {nativeStatus?.mode || getAdMobRuntimeConfig().mode}<br/>Bannières réelles : {nativeStatus?.productionReady ? "oui" : "non"}</div>
            </details>
          </section>
        </>
      ) : null}

      {showShop ? (
        <>
          <section style={card}>
            <SectionHead icon={<MonoIcon name="premium" />} title="PREMIUM" subtitle="Statut du compte et produits cœur de l’application." />
            <div style={{ borderRadius: 14, border: `1px solid ${adFree.active ? theme.primary : theme.borderSoft}`, background: adFree.active ? `${theme.primary}10` : "rgba(255,255,255,.025)", padding: 11 }}>
              <div style={{ color: adFree.active ? theme.primary : theme.text, fontWeight: 1000, fontSize: 13 }}>{premium.active ? "PREMIUM · SANS PUB" : adFree.active ? "SANS PUB · À VIE" : "COMPTE FREE"}</div>
              <div style={{ marginTop: 5, color: theme.textSoft, fontSize: 9.5, lineHeight: 1.4 }}>Les droits réels sont vérifiés côté serveur / Google Play.</div>
            </div>
            {allowSessionEntitlementTest ? <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 9 }}><button type="button" onClick={() => applyVerifiedEntitlements(null)} style={button(!adFree.active)}>TEST FREE</button><button type="button" onClick={() => applyVerifiedEntitlements({ premium: true, source: "verified-server", products: ["test-premium-session"] })} style={button(adFree.active)}>TEST PREMIUM</button></div> : null}
          </section>

          <section style={card}>
            <SectionHead icon={<MonoIcon name="shop" />} title="PACKS ADDITIONNELS" subtitle="Avatars, logos, sets, thèmes et contenus additionnels." />
            <div style={{ display: "grid", gap: 8 }}>
              {STORE_PACKS.map((pack) => (
                <div key={pack.id} style={{ borderRadius: 14, border: `1px solid ${theme.borderSoft}`, background: "rgba(255,255,255,.025)", padding: 11 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}><div><div style={{ fontSize: 12, fontWeight: 950 }}>{pack.title}</div><div style={{ marginTop: 2, color: theme.textSoft, fontSize: 9.5, lineHeight: 1.35 }}>{pack.subtitle}</div></div><span style={{ color: theme.primary, fontSize: 8.5, fontWeight: 1000, flexShrink: 0 }}>{pack.badge}</span></div>
                </div>
              ))}
            </div>
          </section>

          <section style={card}>
            <SectionHead icon={<MonoIcon name="billing" />} title="GOOGLE PLAY" subtitle="Paiements Android et état du bridge Billing." />
            <div style={{ display: "grid", gap: 5, color: theme.textSoft, fontSize: 9.5, lineHeight: 1.4 }}><div>Premium mensuel · {GOOGLE_PLAY_CORE_PRODUCTS.premiumMonthly}</div><div>Premium annuel · {GOOGLE_PLAY_CORE_PRODUCTS.premiumYearly}</div><div>Sans pub à vie · {GOOGLE_PLAY_CORE_PRODUCTS.removeAdsLifetime}</div></div>
            <div style={{ marginTop: 9, color: billingStatus?.connected ? theme.primary : theme.textSoft, fontSize: 10.5, fontWeight: 950 }}>{isCapacitorNativeRuntime() ? (billingStatus?.connected ? "BILLING CONNECTÉ" : "BILLING À VÉRIFIER") : "PWA · BILLING DISPONIBLE SUR ANDROID"}</div>
            {isCapacitorNativeRuntime() ? <button type="button" disabled={nativeBusy} onClick={() => void refreshNativeStatus()} style={{ ...button(true), width: "100%", marginTop: 8 }}>{nativeBusy ? "…" : "VÉRIFIER GOOGLE PLAY"}</button> : null}
          </section>
        </>
      ) : null}
    </div>
  );
}
