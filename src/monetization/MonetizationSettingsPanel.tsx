import React from "react";
import { useTheme } from "../contexts/ThemeContext";
import { useLang } from "../contexts/LangContext";
import { GOOGLE_PLAY_CORE_PRODUCTS, STORE_PACKS } from "./catalog";
import * as MonetizationManager from "./MonetizationManager";
import {
  applyVerifiedEntitlements,
  arePaidAdsLockedForFreeAccount,
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
import { areNativePurchasesEnabled, getNativeBillingStatus, purchaseNativeProduct, queryNativeBillingProduct, restoreNativePurchases, type NativeBillingProduct, type NativeBillingStatus } from "./nativeBilling";
import { getAdMobRuntimeConfig } from "./adMobConfig";
import { localeForLang } from "../i18n/legacyLocalizedText";
import { monetizationUiDynamic, monetizationUiText } from "../i18n/monetizationUiLiteralRegistry";

type Mode = "advertising" | "shop" | "all";
type ShopTab = "premium" | "packs" | "billing";

type Props = { mode?: Mode; initialShopTab?: ShopTab; focusPackId?: string | null };

function MonoIcon({ name, size = 24 }: { name: "ads" | "shop" | "play" | "premium" | "billing" | "privacy"; size?: number }) {
  const p = { fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round" } as const;
  if (name === "ads") return <svg width={size} height={size} viewBox="0 0 24 24"><rect {...p} x="3" y="5" width="18" height="14" rx="3"/><path {...p} d="M7 15V9m0 3h4m5-3v6m0-3h3"/></svg>;
  if (name === "shop") return <svg width={size} height={size} viewBox="0 0 24 24"><path {...p} d="M5 8h14l-1 12H6L5 8Z"/><path {...p} d="M9 9V6a3 3 0 0 1 6 0v3"/></svg>;
  if (name === "play") return <svg width={size} height={size} viewBox="0 0 24 24"><rect {...p} x="3" y="4" width="18" height="16" rx="3"/><path {...p} d="m10 9 5 3-5 3V9Z"/></svg>;
  if (name === "premium") return <svg width={size} height={size} viewBox="0 0 24 24"><path {...p} d="m4 8 4 4 4-7 4 7 4-4-2 10H6L4 8Z"/><path {...p} d="M7 20h10"/></svg>;
  if (name === "billing") return <svg width={size} height={size} viewBox="0 0 24 24"><rect {...p} x="3" y="5" width="18" height="14" rx="3"/><path {...p} d="M3 9h18M7 15h4"/></svg>;
  return <svg width={size} height={size} viewBox="0 0 24 24"><path {...p} d="M12 3 5 6v5c0 4.5 2.7 8 7 10 4.3-2 7-5.5 7-10V6l-7-3Z"/><path {...p} d="M9.5 12 11 13.5l3.5-4"/></svg>;
}

export default function MonetizationSettingsPanel({ mode = "all", initialShopTab = "premium", focusPackId = null }: Props) {
  const { theme } = useTheme() as any;
  const { lang } = useLang();
  const M = React.useCallback((fr: string) => monetizationUiText(lang, fr), [lang]);
  const MD = React.useCallback((fr: string, en: string, es: string) => monetizationUiDynamic(lang, fr, en, es), [lang]);
  const locale = localeForLang(lang);
  const [prefs, setPrefs] = React.useState<MonetizationPrefs>(() => loadMonetizationPrefs());
  const [runtimeTick, setRuntimeTick] = React.useState(0);
  const [nativeStatus, setNativeStatus] = React.useState<NativeAdMobStatus | null>(null);
  const [billingStatus, setBillingStatus] = React.useState<NativeBillingStatus | null>(null);
  const [nativeBusy, setNativeBusy] = React.useState(false);
  const [billingBusy, setBillingBusy] = React.useState(false);
  const [billingMessage, setBillingMessage] = React.useState("");
  const [billingProducts, setBillingProducts] = React.useState<Record<string, NativeBillingProduct | null>>({});
  const [adDiagnosticBusy, setAdDiagnosticBusy] = React.useState<"preload" | "interstitial" | "rewarded" | null>(null);
  const [adDiagnosticMessage, setAdDiagnosticMessage] = React.useState("");
  const [rewardedPassBusy, setRewardedPassBusy] = React.useState(false);
  const [rewardedPassMessage, setRewardedPassMessage] = React.useState("");
  const [adTab, setAdTab] = React.useState<"ads" | "endgame" | "admob">("ads");
  const [shopTab, setShopTab] = React.useState<ShopTab>(initialShopTab);
  const [entitlementRevision, setEntitlementRevision] = React.useState(0);
  const premium = React.useMemo(() => getVerifiedPremiumState(), [entitlementRevision]);
  const adFree = React.useMemo(() => getVerifiedAdFreeState(), [entitlementRevision]);
  const runtime = React.useMemo(() => MonetizationManager.getMonetizationRuntimeSnapshot(), [runtimeTick]);
  const adMobConfig = getAdMobRuntimeConfig();
  const productionAdsLocked = adMobConfig.mode === "production";
  const freeAdsLocked = arePaidAdsLockedForFreeAccount();
  const allowSessionEntitlementTest = adMobConfig.mode !== "production";

  React.useEffect(() => subscribeMonetizationPrefs(setPrefs), []);
  React.useEffect(() => subscribeVerifiedEntitlements(() => setEntitlementRevision((value) => value + 1)), []);
  React.useEffect(() => {
    if (mode === "shop") setShopTab(initialShopTab);
  }, [mode, initialShopTab]);
  React.useEffect(() => {
    if (mode !== "shop" || shopTab !== "packs" || !focusPackId || typeof document === "undefined") return;
    const timer = window.setTimeout(() => {
      document.querySelector(`[data-store-pack="${focusPackId}"]`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 80);
    return () => window.clearTimeout(timer);
  }, [mode, shopTab, focusPackId]);
  React.useEffect(() => {
    if (!isCapacitorNativeRuntime()) return;
    void getNativeAdMobStatus().then(setNativeStatus);
    void getNativeBillingStatus().then(setBillingStatus);
    const productIds = [
      GOOGLE_PLAY_CORE_PRODUCTS.premiumMonthly,
      GOOGLE_PLAY_CORE_PRODUCTS.premiumYearly,
      GOOGLE_PLAY_CORE_PRODUCTS.removeAdsLifetime,
      ...STORE_PACKS.map((pack) => pack.googlePlayProductId),
    ];
    void Promise.all(productIds.map(async (id) => [id, await queryNativeBillingProduct(id)] as const)).then((pairs) => setBillingProducts(Object.fromEntries(pairs)));
  }, []);

  React.useEffect(() => {
    if (adTab !== "endgame" || !isCapacitorNativeRuntime() || adFree.active || !adMobConfig.rewardedReady) return;
    const fn = (MonetizationManager as any).preloadRewardedInterstitialPassAd;
    if (typeof fn === "function") void fn();
  }, [adTab, adFree.active, adMobConfig.rewardedReady, runtimeTick]);

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

  const runAdDiagnostic = async (kind: "preload" | "interstitial" | "rewarded") => {
    if (!isCapacitorNativeRuntime()) {
      setAdDiagnosticMessage(MD(
        "Les tests plein écran AdMob nécessitent l’application Android native.",
        "AdMob fullscreen tests require the native Android app.",
        "Las pruebas de AdMob a pantalla completa requieren la aplicación Android nativa."
      ));
      return;
    }
    setAdDiagnosticBusy(kind);
    setAdDiagnosticMessage("");
    try {
      if (kind === "preload") {
        const fn = (MonetizationManager as any).preloadGoogleTestFullscreenAds;
        if (typeof fn !== "function") throw new Error(MD(
          "Diagnostic V78 indisponible dans ce build.",
          "V78 diagnostic unavailable in this build.",
          "Diagnóstico V78 no disponible en esta compilación."
        ));
        const result = await fn();
        setAdDiagnosticMessage(MD(
          `Préchargement Google TEST · interstitiel ${result?.interstitialPreloaded ? "OK" : "NON"} · rewarded ${result?.rewardedPreloaded ? "OK" : "NON"}.`,
          `Google TEST preload · interstitial ${result?.interstitialPreloaded ? "OK" : "NO"} · rewarded ${result?.rewardedPreloaded ? "OK" : "NO"}.`,
          `Precarga Google TEST · intersticial ${result?.interstitialPreloaded ? "OK" : "NO"} · rewarded ${result?.rewardedPreloaded ? "OK" : "NO"}.`
        ));
      } else if (kind === "interstitial") {
        const fn = (MonetizationManager as any).previewGoogleTestInterstitial;
        if (typeof fn !== "function") throw new Error(MD(
          "Diagnostic interstitiel indisponible dans ce build.",
          "Interstitial diagnostic unavailable in this build.",
          "Diagnóstico del intersticial no disponible en esta compilación."
        ));
        const result = await fn();
        setAdDiagnosticMessage(result?.status === "shown"
          ? MD(
              "Interstitiel Google TEST affiché correctement.",
              "Google TEST interstitial displayed correctly.",
              "Intersticial Google TEST mostrado correctamente."
            )
          : MD(
              `Interstitiel Google TEST : ${String(result?.status || "indisponible")}.`,
              `Google TEST interstitial: ${String(result?.status || "unavailable")}.`,
              `Intersticial Google TEST: ${String(result?.status || "no disponible")}.`
            )
        );
      } else {
        const fn = (MonetizationManager as any).previewGoogleTestRewarded;
        if (typeof fn !== "function") throw new Error(MD(
          "Diagnostic rewarded indisponible dans ce build.",
          "Rewarded diagnostic unavailable in this build.",
          "Diagnóstico Rewarded no disponible en esta compilación."
        ));
        const result = await fn();
        if (result?.status === "shown" && result?.earned) {
          setAdDiagnosticMessage(MD(
            "Rewarded Google TEST validé par le SDK. Aucun bonus applicatif n’a été attribué.",
            "Google TEST Rewarded validated by the SDK. No app bonus was granted.",
            "Rewarded Google TEST validado por el SDK. No se ha concedido ningún bonus de la aplicación."
          ));
        } else {
          setAdDiagnosticMessage(MD(
            `Rewarded Google TEST : ${String(result?.status || "indisponible")} · récompense SDK ${result?.earned ? "reçue" : "non reçue"}.`,
            `Google TEST Rewarded: ${String(result?.status || "unavailable")} · SDK reward ${result?.earned ? "received" : "not received"}.`,
            `Rewarded Google TEST: ${String(result?.status || "no disponible")} · recompensa SDK ${result?.earned ? "recibida" : "no recibida"}.`
          ));
        }
      }
    } catch (error: any) {
      setAdDiagnosticMessage(MD(
        `Test AdMob impossible : ${String(error?.message || error || "erreur inconnue")}`,
        `AdMob test failed: ${String(error?.message || error || "unknown error")}`,
        `Prueba AdMob imposible: ${String(error?.message || error || "error desconocido")}`
      ));
    } finally {
      setAdDiagnosticBusy(null);
    }
  };

  const claimRewardedPass = async () => {
    if (!isCapacitorNativeRuntime()) {
      setRewardedPassMessage(MD(
        "La pub récompensée est disponible dans l’application Android.",
        "Rewarded ads are available in the Android app.",
        "Los anuncios recompensados están disponibles en la aplicación Android."
      ));
      return;
    }
    setRewardedPassBusy(true);
    setRewardedPassMessage("");
    try {
      const fn = (MonetizationManager as any).claimRewardedInterstitialPasses;
      if (typeof fn !== "function") throw new Error(MD(
        "Bonus Rewarded indisponible dans ce build.",
        "Rewarded bonus unavailable in this build.",
        "Bonus Rewarded no disponible en esta compilación."
      ));
      const result = await fn();
      setRuntimeTick((v) => v + 1);
      if (result?.status === "earned") {
        setRewardedPassMessage(MD(
          `Bonus obtenu : ${Number(result?.passesRemaining) || 3} prochaines parties sans interstitiel.`,
          `Bonus earned: ${Number(result?.passesRemaining) || 3} next games without an interstitial.`,
          `Bonus obtenido: ${Number(result?.passesRemaining) || 3} próximas partidas sin intersticial.`
        ));
      } else if (result?.status === "skipped" && Number(result?.passesRemaining) > 0) {
        setRewardedPassMessage(MD(
          `Bonus déjà actif : ${Number(result?.passesRemaining)} partie(s) sans interstitiel restante(s).`,
          `Bonus already active: ${Number(result?.passesRemaining)} game(s) remaining without an interstitial.`,
          `Bonus ya activo: ${Number(result?.passesRemaining)} partida(s) restante(s) sin intersticial.`
        ));
      } else if (result?.status === "skipped" && adFree.active) {
        setRewardedPassMessage(MD(
          "Ton compte est déjà Sans pub / Premium.",
          "Your account is already Ad-free / Premium.",
          "Tu cuenta ya es Sin anuncios / Premium."
        ));
      } else if (!adMobConfig.rewardedReady) {
        setRewardedPassMessage(MD(
          "Le bonus est prêt côté application ; il manque encore l’ID Rewarded réel dans AdMob.",
          "The bonus is ready in the app; the real Rewarded ID is still missing in AdMob.",
          "El bonus está listo en la aplicación; aún falta el ID Rewarded real en AdMob."
        ));
      } else {
        setRewardedPassMessage(MD(
          "Rewarded indisponible pour le moment. Aucun bonus n’a été consommé.",
          "Rewarded is currently unavailable. No bonus was consumed.",
          "Rewarded no está disponible por el momento. No se ha consumido ningún bonus."
        ));
      }
    } catch (error: any) {
      setRewardedPassMessage(MD(
        `Rewarded impossible : ${String(error?.message || error || "erreur inconnue")}`,
        `Rewarded failed: ${String(error?.message || error || "unknown error")}`,
        `Rewarded imposible: ${String(error?.message || error || "error desconocido")}`
      ));
    } finally {
      setRewardedPassBusy(false);
    }
  };

  const openPrivacyOptions = async () => {
    setNativeBusy(true);
    try {
      await showNativePrivacyOptions();
      setNativeStatus(await getNativeAdMobStatus());
    } finally { setNativeBusy(false); }
  };

  const purchase = async (productId: string) => {
    if (!isCapacitorNativeRuntime()) {
      setBillingMessage(MD(
        "Les achats s’ouvrent depuis la version Android installée via Google Play.",
        "Purchases open from the Android version installed via Google Play.",
        "Las compras se abren desde la versión Android instalada mediante Google Play."
      ));
      return;
    }
    setBillingBusy(true);
    setBillingMessage("");
    try {
      const receipt = await purchaseNativeProduct(productId);
      if (receipt.status === "purchased") setBillingMessage(MD(
        "Achat reçu. La validation serveur doit maintenant confirmer le droit avant activation.",
        "Purchase received. Server validation must now confirm the entitlement before activation.",
        "Compra recibida. La validación del servidor debe confirmar ahora el derecho antes de activarlo."
      ));
      else if (receipt.status === "pending") setBillingMessage(MD(
        "Paiement en attente de confirmation Google Play.",
        "Payment pending Google Play confirmation.",
        "Pago pendiente de confirmación de Google Play."
      ));
      else if (receipt.status === "cancelled") setBillingMessage(MD(
        "Achat annulé.",
        "Purchase cancelled.",
        "Compra cancelada."
      ));
      else setBillingMessage(receipt.error || MD(
        "Achat indisponible pour le moment.",
        "Purchase currently unavailable.",
        "Compra no disponible por el momento."
      ));
    } finally {
      setBillingBusy(false);
    }
  };

  const restorePurchases = async () => {
    if (!isCapacitorNativeRuntime()) {
      setBillingMessage(MD(
        "La restauration des achats est disponible dans l’application Android.",
        "Purchase restoration is available in the Android app.",
        "La restauración de compras está disponible en la aplicación Android."
      ));
      return;
    }
    setBillingBusy(true);
    try {
      const receipts = await restoreNativePurchases();
      setBillingMessage(MD(
        `${receipts.length} achat(s) retrouvé(s). Les jetons doivent être vérifiés côté serveur avant activation.`,
        `${receipts.length} purchase(s) found. Tokens must be verified server-side before activation.`,
        `${receipts.length} compra(s) encontrada(s). Los tokens deben verificarse en el servidor antes de la activación.`
      ));
    } finally {
      setBillingBusy(false);
    }
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

  const Toggle = ({ label, help, value, onChange, disabled = false }: { label: string; help: string; value: boolean; onChange: (v: boolean) => void; disabled?: boolean }) => (
    <button type="button" disabled={disabled} onClick={() => { if (!disabled) onChange(!value); }} style={{ width: "100%", border: "none", borderTop: `1px solid ${theme.borderSoft}`, background: "transparent", color: theme.text, padding: "11px 0", display: "grid", gridTemplateColumns: "minmax(0,1fr) auto", gap: 10, alignItems: "center", textAlign: "left", cursor: disabled ? "default" : "pointer", opacity: disabled ? .82 : 1 }}>
      <div><div style={{ fontSize: 12, fontWeight: 950 }}>{label}</div><div style={{ marginTop: 2, color: theme.textSoft, fontSize: 10, lineHeight: 1.35 }}>{help}</div></div>
      <span style={{ width: 46, height: 26, borderRadius: 999, padding: 3, background: value ? theme.primary : "rgba(255,255,255,.10)", display: "flex", justifyContent: value ? "flex-end" : "flex-start", alignItems: "center", boxShadow: value ? `0 0 12px ${theme.primary}44` : "none" }}><span style={{ width: 20, height: 20, borderRadius: "50%", background: value ? "#061018" : "rgba(255,255,255,.85)" }} /></span>
    </button>
  );

  const IconTabs = ({ tabs, active, onChange }: { tabs: Array<{ id: string; label: string; icon: React.ReactNode }>; active: string; onChange: (id: any) => void }) => (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(${tabs.length},minmax(0,1fr))`, gap: 7, marginBottom: 11 }}>
      {tabs.map((tab) => {
        const selected = tab.id === active;
        return (
          <button key={tab.id} type="button" onClick={() => onChange(tab.id)} style={{ minHeight: 64, borderRadius: 15, border: `1px solid ${selected ? theme.primary : theme.borderSoft}`, background: selected ? `${theme.primary}18` : "rgba(255,255,255,.025)", color: selected ? theme.primary : theme.textSoft, display: "grid", placeItems: "center", gap: 3, padding: 6, cursor: "pointer", boxShadow: selected ? `0 0 16px ${theme.primary}2f` : "none" }}>
            <span style={{ lineHeight: 0 }}>{tab.icon}</span>
            <span style={{ fontSize: 8.8, fontWeight: 1000, textTransform: "uppercase", letterSpacing: .45, textAlign: "center" }}>{tab.label}</span>
          </button>
        );
      })}
    </div>
  );

  const showAds = mode === "advertising" || mode === "all";
  const showShop = mode === "shop" || mode === "all";

  return (
    <div style={{ display: "grid", gap: 12, paddingBottom: 72 }}>
      {showAds ? (
        <>
          <IconTabs
            active={adTab}
            onChange={setAdTab}
            tabs={[
              { id: "ads", label: M("Publicité"), icon: <MonoIcon name="ads" size={23} /> },
              { id: "endgame", label: M("Fin de partie"), icon: <MonoIcon name="play" size={23} /> },
              { id: "admob", label: "Android AdMob", icon: <MonoIcon name="privacy" size={23} /> },
            ]}
          />

          {adTab === "ads" ? (
            <section style={card}>
              <SectionHead icon={<MonoIcon name="ads" />} title={M("PUBLICITÉ")} subtitle={M("Contrôle les emplacements autorisés sans surcharger les écrans de jeu.")} />
              <div style={{ borderRadius: 14, border: `1px solid ${theme.borderSoft}`, background: "rgba(255,255,255,.025)", padding: "0 11px" }}>
                <Toggle label={M("Espaces publicitaires")} help={productionAdsLocked ? (freeAdsLocked ? M("Compte FREE : publicités actives automatiquement. Premium/Sans pub les supprime.") : M("Géré automatiquement par le droit Premium/Sans pub vérifié.")) : M("Accueil, Jeux, Stats, Historique et Réglages uniquement.")} value={prefs.adsEnabled} onChange={(v) => patch({ adsEnabled: v })} disabled={productionAdsLocked} />
                <Toggle label={M("Bannières")} help={productionAdsLocked ? (freeAdsLocked ? M("Compte FREE : bannières actives automatiquement, jamais pendant le jeu.") : M("Géré automatiquement par le droit Premium/Sans pub vérifié.")) : M("Jamais sur le keypad ou pendant une volée.")} value={prefs.bannersEnabled} onChange={(v) => patch({ bannersEnabled: v })} disabled={productionAdsLocked} />
                <Toggle label={M("Promotions MULTISPORTS")} help={M("Affiche les packs maison si aucune bannière AdMob n’est disponible.")} value={prefs.houseAdsEnabled} onChange={(v) => patch({ houseAdsEnabled: v })} />
              </div>
            </section>
          ) : null}

          {adTab === "endgame" ? (
            <section style={card}>
              <SectionHead icon={<MonoIcon name="play" />} title={M("FIN DE PARTIE")} subtitle={M("Interstitiel réservé aux comptes FREE, uniquement après les résultats.")} />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <div style={{ ...button(true), display: "grid", placeItems: "center", cursor: "default" }}>{M("1 PUB / 1 PARTIE")}</div>
                <div style={{ ...button(true), display: "grid", placeItems: "center", cursor: "default" }}>{M("APRÈS RÉSULTATS")}</div>
              </div>
              {!adFree.active ? (
                <div style={{ marginTop: 10, borderRadius: 14, border: `1px solid ${theme.primary}44`, background: `${theme.primary}09`, padding: 11 }}>
                  <div style={{ color: theme.primary, fontWeight: 1000, fontSize: 10.5 }}>{M("PUB RÉCOMPENSÉE · BONUS SANS COUPURE")}</div>
                  <div style={{ marginTop: 4, color: theme.textSoft, fontSize: 9.3, lineHeight: 1.45 }}>
                    {M("Choix volontaire : regarde 1 Rewarded jusqu’à la validation de la récompense et les ")}<b style={{ color: theme.text }}>{M("3 prochaines parties")}</b>{M(" n’auront pas d’interstitiel de fin. Les bannières restent actives.")}
                  </div>
                  <div style={{ marginTop: 7, color: theme.text, fontSize: 10, fontWeight: 900 }}>
                    {M("Passes restants :")} <b style={{ color: theme.primary }}>{runtime.rewardedInterstitialPasses || 0} / 3</b>
                  </div>
                  <button
                    type="button"
                    disabled={rewardedPassBusy || !isCapacitorNativeRuntime() || !adMobConfig.rewardedReady || (runtime.rewardedInterstitialPasses || 0) > 0}
                    onClick={() => void claimRewardedPass()}
                    style={{ ...button(true), width: "100%", marginTop: 8, opacity: (!adMobConfig.rewardedReady || (runtime.rewardedInterstitialPasses || 0) > 0) ? .62 : 1 }}
                  >
                    {rewardedPassBusy ? M("CHARGEMENT…") : (runtime.rewardedInterstitialPasses || 0) > 0 ? M("BONUS ACTIF") : adMobConfig.rewardedReady ? M("REGARDER 1 PUB → 3 PARTIES") : M("PRÊT · ID REWARDED À CRÉER")}
                  </button>
                  {rewardedPassMessage ? <div style={{ marginTop: 7, color: theme.text, fontSize: 9.3, lineHeight: 1.4 }}>{rewardedPassMessage}</div> : null}
                </div>
              ) : null}
              {adMobConfig.mode !== "production" ? <button type="button" onClick={() => void MonetizationManager.previewEndGameInterstitial()} style={{ ...button(true), width: "100%", marginTop: 9 }}>{M("APERÇU INTERSTITIEL")}</button> : null}
              <div style={{ marginTop: 9, display: "grid", gap: 5, color: theme.textSoft, fontSize: 9.5, lineHeight: 1.4 }}>
                <div>{M("Interstitiel AdMob :")} <b style={{ color: adMobConfig.interstitialReady ? theme.primary : theme.textSoft }}>{adMobConfig.interstitialReady ? M("ID PRÊT") : M("ID À CRÉER DANS ADMOB")}</b></div>
                <div>{M("Rewarded AdMob :")} <b style={{ color: adMobConfig.rewardedReady ? theme.primary : theme.textSoft }}>{adMobConfig.rewardedReady ? M("ID PRÊT") : M("TECHNIQUE PRÊTE · ID À CRÉER")}</b></div>
                <div>{M("Préchargement interstitiel :")} <b style={{ color: theme.primary }}>{M("ACTIF PENDANT LES RÉSULTATS")}</b></div>
                <div>{M("Rewarded : bonus accordé uniquement après confirmation réelle de la récompense AdMob.")}</div>
                <div>{M("Parties comptées :")} {runtime.completedMatches} · {M("Dernière pub :")} {runtime.lastInterstitialAt ? new Date(runtime.lastInterstitialAt).toLocaleString(locale) : "—"}</div>
                <div>{M("Bonus Rewarded cumulés :")} {runtime.rewardedPassesEarnedTotal || 0} · {M("Dernier bonus :")} {runtime.lastRewardedAt ? new Date(runtime.lastRewardedAt).toLocaleString(locale) : "—"}</div>
              </div>
              <button type="button" onClick={() => setRuntimeTick((v) => v + 1)} style={{ ...button(false), marginTop: 7 }}>{M("Rafraîchir")}</button>
            </section>
          ) : null}

          {adTab === "admob" ? (
            <section style={card}>
              <SectionHead icon={<MonoIcon name="privacy" />} title={M("ANDROID / ADMOB")} subtitle={M("État du consentement et du SDK natif. Les détails techniques restent repliés.")} />
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                <div style={{ color: nativeStatus?.initialized ? theme.primary : theme.textSoft, fontSize: 11, fontWeight: 950 }}>{isCapacitorNativeRuntime() ? (nativeStatus?.initialized ? M("ADMOB INITIALISÉ") : M("À VÉRIFIER")) : M("PWA · ADMOB NATIF INACTIF")}</div>
                {isCapacitorNativeRuntime() ? <button type="button" disabled={nativeBusy} onClick={() => void refreshNativeStatus()} style={button(true)}>{nativeBusy ? "…" : M("VÉRIFIER")}</button> : null}
              </div>
              {isCapacitorNativeRuntime() && nativeStatus?.privacyOptionsRequired ? <button type="button" disabled={nativeBusy} onClick={() => void openPrivacyOptions()} style={{ ...button(false), width: "100%", marginTop: 8 }}>{M("Options de confidentialité")}</button> : null}

              <div style={{ marginTop: 10, borderRadius: 14, border: `1px solid ${adMobConfig.fullMonetizationReady ? theme.primary : theme.borderSoft}`, background: adMobConfig.fullMonetizationReady ? `${theme.primary}0d` : "rgba(255,255,255,.025)", padding: 10 }}>
                <div style={{ color: adMobConfig.fullMonetizationReady ? theme.primary : theme.text, fontWeight: 1000, fontSize: 10.5 }}>
                  {adMobConfig.fullMonetizationReady ? M("MONÉTISATION ADMOB COMPLÈTE · PRÊTE") : adMobConfig.productionReady ? M("BANNIÈRES LIVE · PLEIN ÉCRAN EN ATTENTE") : M("ADMOB · CONFIGURATION À VÉRIFIER")}
                </div>
                <div style={{ marginTop: 4, color: theme.textSoft, fontSize: 9.2, lineHeight: 1.4 }}>
                  {adMobConfig.fullMonetizationReady
                    ? M("App ID, bannières, interstitiel et rewarded utilisent des IDs réels valides du même éditeur. Le garde-fou de release peut valider la monétisation complète.")
                    : adMobConfig.productionReady
                      ? M("Les bannières réelles sont déjà prêtes. L’interstitiel et le rewarded resteront désactivés tant que leurs deux IDs AdMob réels ne sont pas renseignés.")
                      : M("La configuration AdMob n’est pas encore prête pour une release publicitaire complète.")}
                </div>
              </div>

              <div style={{ marginTop: 10, borderRadius: 14, border: `1px solid ${theme.primary}33`, background: `${theme.primary}08`, padding: 10 }}>
                <div style={{ color: theme.primary, fontWeight: 1000, fontSize: 10.5 }}>{M("TESTS PLEIN ÉCRAN GOOGLE · AUCUN REVENU")}</div>
                <div style={{ marginTop: 4, color: theme.textSoft, fontSize: 9.2, lineHeight: 1.4 }}>{M("Utilise exclusivement les IDs de démonstration officiels Google. Ces boutons servent à valider le SDK Android avant de créer les vrais blocs Interstitiel et Rewarded.")}</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 7, marginTop: 9 }}>
                  <button type="button" disabled={!!adDiagnosticBusy || !isCapacitorNativeRuntime()} onClick={() => void runAdDiagnostic("preload")} style={button(false)}>{adDiagnosticBusy === "preload" ? "…" : M("PRÉCHARGER")}</button>
                  <button type="button" disabled={!!adDiagnosticBusy || !isCapacitorNativeRuntime()} onClick={() => void runAdDiagnostic("interstitial")} style={button(true)}>{adDiagnosticBusy === "interstitial" ? "…" : M("INTERSTITIEL")}</button>
                  <button type="button" disabled={!!adDiagnosticBusy || !isCapacitorNativeRuntime()} onClick={() => void runAdDiagnostic("rewarded")} style={button(true)}>{adDiagnosticBusy === "rewarded" ? "…" : "REWARDED"}</button>
                </div>
                {adDiagnosticMessage ? <div style={{ marginTop: 8, color: theme.text, fontSize: 9.3, lineHeight: 1.4 }}>{adDiagnosticMessage}</div> : null}
              </div>

              <details style={{ marginTop: 10, color: theme.textSoft, fontSize: 9.5 }}>
                <summary style={{ cursor: "pointer", color: theme.primary, fontWeight: 900 }}>{M("Détails techniques")}</summary>
                <div style={{ marginTop: 8, lineHeight: 1.5 }}>{M("Consentement :")} {nativeStatus?.consentStatus || "—"}<br/>{M("Demandes autorisées :")} {nativeStatus?.canRequestAds ? M("oui") : M("non")}<br/>{M("Mode :")} {nativeStatus?.mode || adMobConfig.mode}<br/>{M("Bannières réelles :")} {nativeStatus?.productionReady ? M("oui") : M("non")}<br/>{M("Interstitiel :")} {nativeStatus?.interstitialReady ? M("prêt") : M("ID manquant")}<br/>{M("Rewarded :")} {nativeStatus?.rewardedReady ? M("prêt") : M("ID manquant")}<br/>{M("Monétisation complète :")} {nativeStatus?.fullMonetizationReady ? M("PRÊTE") : M("en attente")}</div>
              </details>
            </section>
          ) : null}
        </>
      ) : null}

      {showShop ? (
        <>
          <IconTabs
            active={shopTab}
            onChange={setShopTab}
            tabs={[
              { id: "premium", label: "Premium", icon: <MonoIcon name="premium" size={23} /> },
              { id: "packs", label: "Packs", icon: <MonoIcon name="shop" size={23} /> },
              { id: "billing", label: "Google Play", icon: <MonoIcon name="billing" size={23} /> },
            ]}
          />

          {shopTab === "premium" ? (
            <section style={card}>
              <SectionHead icon={<MonoIcon name="premium" />} title={M("PREMIUM")} subtitle={M("Choisis une offre ou conserve le compte FREE.")} />
              <div style={{ borderRadius: 14, border: `1px solid ${adFree.active ? theme.primary : theme.borderSoft}`, background: adFree.active ? `${theme.primary}10` : "rgba(255,255,255,.025)", padding: 11 }}>
                <div style={{ color: adFree.active ? theme.primary : theme.text, fontWeight: 1000, fontSize: 13 }}>{premium.active ? M("PREMIUM · SANS PUB") : adFree.active ? M("SANS PUB · À VIE") : M("COMPTE FREE")}</div>
                <div style={{ marginTop: 5, color: theme.textSoft, fontSize: 9.5, lineHeight: 1.4 }}>{M("Les droits réels sont vérifiés côté serveur / Google Play.")}</div>
              </div>
              <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
                {[
                  { id: GOOGLE_PLAY_CORE_PRODUCTS.premiumMonthly, title: "PREMIUM MENSUEL", desc: "Premium complet, renouvelé chaque mois." },
                  { id: GOOGLE_PLAY_CORE_PRODUCTS.premiumYearly, title: "PREMIUM ANNUEL", desc: "Premium complet avec formule annuelle." },
                  { id: GOOGLE_PLAY_CORE_PRODUCTS.removeAdsLifetime, title: "SANS PUB À VIE", desc: "Supprime les publicités sans abonnement Premium." },
                ].map((offer) => (
                  <div key={offer.id} style={{ borderRadius: 14, border: `1px solid ${theme.borderSoft}`, background: "rgba(255,255,255,.025)", padding: 11, display: "grid", gridTemplateColumns: "minmax(0,1fr) auto", gap: 10, alignItems: "center" }}>
                    <div><div style={{ color: theme.primary, fontSize: 11.5, fontWeight: 1000 }}>{M(offer.title)}</div><div style={{ marginTop: 3, color: theme.textSoft, fontSize: 9.5, lineHeight: 1.35 }}>{M(offer.desc)}</div><div style={{ marginTop: 4, color: theme.text, fontSize: 10.5, fontWeight: 900 }}>{billingProducts[offer.id]?.formattedPrice || (isCapacitorNativeRuntime() ? M("Prix Google Play") : M("Voir sur Android"))}</div></div>
                    <button type="button" disabled={billingBusy} onClick={() => void purchase(offer.id)} style={button(true)}>{billingBusy ? "…" : M("CHOISIR")}</button>
                  </div>
                ))}
              </div>
              {!areNativePurchasesEnabled() && isCapacitorNativeRuntime() ? <div style={{ marginTop: 9, color: theme.textSoft, fontSize: 9.5, lineHeight: 1.4 }}>{M("Les boutons sont prêts, mais les achats restent verrouillés jusqu’à l’activation de la vérification serveur Google Play.")}</div> : null}
              {billingMessage ? <div style={{ marginTop: 9, borderRadius: 12, border: `1px solid ${theme.primary}33`, background: `${theme.primary}0d`, color: theme.textSoft, padding: 9, fontSize: 9.5, lineHeight: 1.4 }}>{billingMessage}</div> : null}
              {allowSessionEntitlementTest ? <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 9 }}><button type="button" onClick={() => applyVerifiedEntitlements(null)} style={button(!adFree.active)}>TEST FREE</button><button type="button" onClick={() => applyVerifiedEntitlements({ premium: true, source: "verified-server", products: ["test-premium-session"] })} style={button(adFree.active)}>TEST PREMIUM</button></div> : null}
            </section>
          ) : null}

          {shopTab === "packs" ? (
            <section style={card}>
              <SectionHead icon={<MonoIcon name="shop" />} title={M("PACKS ADDITIONNELS")} subtitle={M("Avatars, logos, sets, thèmes, bots IA et bundles de personnalisation.")} />
              <div style={{ display: "grid", gap: 8 }}>
                {STORE_PACKS.map((pack) => {
                  const focused = focusPackId === pack.id;
                  const price = billingProducts[pack.googlePlayProductId]?.formattedPrice || "";
                  return (
                    <div
                      key={pack.id}
                      data-store-pack={pack.id}
                      style={{
                        borderRadius: 14,
                        border: `1px solid ${focused ? theme.primary : theme.borderSoft}`,
                        background: focused ? `${theme.primary}0d` : "rgba(255,255,255,.025)",
                        padding: 11,
                        boxShadow: focused ? `0 0 20px ${theme.primary}22` : "none",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                        <div>
                          <div style={{ fontSize: 12, fontWeight: 950 }}>{M(pack.title)}</div>
                          <div style={{ marginTop: 2, color: theme.textSoft, fontSize: 9.5, lineHeight: 1.35 }}>{M(pack.subtitle)}</div>
                        </div>
                        <div style={{ textAlign: "right", flexShrink: 0 }}>
                          <span style={{ color: theme.primary, fontSize: 8.5, fontWeight: 1000 }}>{focused ? M("SÉLECTIONNÉ") : (pack.badge ? M(pack.badge) : "")}</span>
                          {price ? <div style={{ marginTop: 3, color: theme.text, fontSize: 10.5, fontWeight: 950 }}>{price}</div> : null}
                        </div>
                      </div>
                      <div style={{ marginTop: 7, display: "flex", flexWrap: "wrap", gap: 5 }}>{pack.contents.map((item) => <span key={item} style={{ borderRadius: 999, border: `1px solid ${theme.primary}33`, background: `${theme.primary}0c`, color: theme.textSoft, padding: "4px 7px", fontSize: 8.5, fontWeight: 850 }}>{M(item)}</span>)}</div>
                      <button type="button" disabled={billingBusy} onClick={() => void purchase(pack.googlePlayProductId)} style={{ ...button(true), width: "100%", marginTop: 8 }}>{billingBusy ? "…" : isCapacitorNativeRuntime() ? (price ? MD(`ACHETER · ${price}`, `BUY · ${price}`, `COMPRAR · ${price}`) : M("VOIR / ACHETER SUR GOOGLE PLAY")) : M("DISPONIBLE SUR ANDROID")}</button>
                    </div>
                  );
                })}
              </div>
              {billingMessage ? <div style={{ marginTop: 9, color: theme.textSoft, fontSize: 9.5, lineHeight: 1.4 }}>{billingMessage}</div> : null}
            </section>
          ) : null}

          {shopTab === "billing" ? (
            <section style={card}>
              <SectionHead icon={<MonoIcon name="billing" />} title={M("GOOGLE PLAY")} subtitle={M("Connexion Billing, produits Android, achats et restauration.")} />
              <div style={{ borderRadius: 14, border: `1px solid ${theme.borderSoft}`, background: "rgba(255,255,255,.025)", padding: 11 }}>
                <div style={{ color: billingStatus?.connected ? theme.primary : theme.textSoft, fontSize: 11, fontWeight: 950 }}>{isCapacitorNativeRuntime() ? (billingStatus?.connected ? M("BILLING CONNECTÉ") : M("BILLING À VÉRIFIER")) : M("PWA · BILLING DISPONIBLE SUR ANDROID")}</div>
                <div style={{ marginTop: 6, display: "grid", gap: 4, color: theme.textSoft, fontSize: 9.5, lineHeight: 1.4 }}>
                  <div>{M("Premium mensuel")} · {GOOGLE_PLAY_CORE_PRODUCTS.premiumMonthly}</div>
                  <div>{M("Premium annuel")} · {GOOGLE_PLAY_CORE_PRODUCTS.premiumYearly}</div>
                  <div>{M("Sans pub à vie")} · {GOOGLE_PLAY_CORE_PRODUCTS.removeAdsLifetime}</div>
                  <div>{M("Achats activés :")} {areNativePurchasesEnabled() ? M("oui") : M("non — vérification serveur requise")}</div>
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 9 }}>
                <button type="button" disabled={nativeBusy || billingBusy || !isCapacitorNativeRuntime()} onClick={() => void refreshNativeStatus()} style={button(true)}>{nativeBusy ? "…" : M("VÉRIFIER")}</button>
                <button type="button" disabled={billingBusy || !isCapacitorNativeRuntime()} onClick={() => void restorePurchases()} style={button(false)}>{billingBusy ? "…" : M("RESTAURER ACHATS")}</button>
              </div>
              {billingMessage ? <div style={{ marginTop: 9, borderRadius: 12, border: `1px solid ${theme.primary}33`, background: `${theme.primary}0d`, color: theme.textSoft, padding: 9, fontSize: 9.5, lineHeight: 1.4 }}>{billingMessage}</div> : null}
              <details style={{ marginTop: 10, color: theme.textSoft, fontSize: 9.5 }}>
                <summary style={{ cursor: "pointer", color: theme.primary, fontWeight: 900 }}>{M("Pourquoi cet onglet ?")}</summary>
                <div style={{ marginTop: 8, lineHeight: 1.5 }}>{M("Il sert à vérifier que l’application Android dialogue bien avec Google Play Billing, restaurer les achats d’un utilisateur et diagnostiquer les produits configurés. Aucun droit Premium n’est accordé uniquement depuis le téléphone : le reçu doit être validé côté serveur.")}</div>
              </details>
            </section>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
