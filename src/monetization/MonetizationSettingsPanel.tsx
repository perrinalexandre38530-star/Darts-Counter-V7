import React from "react";
import { useTheme } from "../contexts/ThemeContext";
import { GOOGLE_PLAY_CORE_PRODUCTS, STORE_PACKS } from "./catalog";
import { getMonetizationRuntimeSnapshot, previewEndGameInterstitial } from "./MonetizationManager";
import { applyVerifiedEntitlements, getVerifiedAdFreeState, getVerifiedPremiumState, loadMonetizationPrefs, saveMonetizationPrefs, subscribeMonetizationPrefs, subscribeVerifiedEntitlements } from "./prefs";
import type { MonetizationPrefs } from "./types";
import { getNativeAdMobStatus, showNativePrivacyOptions, type NativeAdMobStatus } from "./nativeAdMob";
import { isCapacitorNativeRuntime } from "../lib/nativePlatform";
import { getNativeBillingStatus, type NativeBillingStatus } from "./nativeBilling";
import { getAdMobRuntimeConfig } from "./adMobConfig";

export default function MonetizationSettingsPanel() {
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
    } finally {
      setNativeBusy(false);
    }
  };

  const card: React.CSSProperties = {
    borderRadius: 18,
    border: `1px solid ${theme.borderSoft}`,
    background: theme.card,
    padding: 14,
    boxShadow: `0 14px 30px rgba(0,0,0,.35), 0 0 16px ${theme.primary}18`,
  };
  const smallBtn = (active = false): React.CSSProperties => ({
    borderRadius: 12,
    border: `1px solid ${active ? theme.primary : theme.borderSoft}`,
    background: active ? `${theme.primary}18` : "rgba(255,255,255,.03)",
    color: active ? theme.primary : theme.text,
    padding: "9px 10px",
    fontWeight: 900,
    cursor: "pointer",
  });

  const Toggle = ({ label, help, value, onChange }: { label: string; help: string; value: boolean; onChange: (v: boolean) => void }) => (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "10px 0", borderBottom: `1px solid ${theme.borderSoft}` }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontWeight: 900, fontSize: 13 }}>{label}</div>
        <div style={{ color: theme.textSoft, fontSize: 11, lineHeight: 1.4, marginTop: 2 }}>{help}</div>
      </div>
      <button type="button" onClick={() => onChange(!value)} style={{ ...smallBtn(value), minWidth: 58 }}>{value ? "ON" : "OFF"}</button>
    </div>
  );


  return (
    <div style={{ display: "grid", gap: 12, paddingBottom: 72 }}>
      <section style={card}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
          <div>
            <div style={{ color: theme.primary, fontWeight: 1000, fontSize: 17 }}>PUBLICITÉ & PREMIUM</div>
            <div style={{ color: theme.textSoft, fontSize: 11, marginTop: 3 }}>Socle commun PWA → Android / Google Play.</div>
          </div>
          <div style={{ borderRadius: 999, padding: "7px 10px", border: `1px solid ${adFree.active ? theme.primary : theme.borderSoft}`, color: adFree.active ? theme.primary : theme.textSoft, fontSize: 10, fontWeight: 1000 }}>
            {premium.active ? "PREMIUM · SANS PUB" : adFree.active ? "SANS PUB · À VIE" : "FREE · PUBS"}
          </div>
        </div>
        <div style={{ marginTop: 10, fontSize: 11, color: theme.textSoft, lineHeight: 1.45 }}>
          Le statut Premium réel restera vérifié côté serveur / Google Play. Aucun simple flag local ne déverrouille le Premium de production.
        </div>
        <div style={{ marginTop: 10, display: "grid", gap: 4, fontSize: 9, color: theme.textSoft, fontFamily: "ui-monospace,monospace", overflowWrap: "anywhere" }}>
          <div>Mensuel : {GOOGLE_PLAY_CORE_PRODUCTS.premiumMonthly}</div>
          <div>Annuel : {GOOGLE_PLAY_CORE_PRODUCTS.premiumYearly}</div>
          <div>Sans pub à vie : {GOOGLE_PLAY_CORE_PRODUCTS.removeAdsLifetime}</div>
        </div>

        {allowSessionEntitlementTest ? (
          <div style={{ marginTop: 12, borderRadius: 14, padding: 10, background: "rgba(255,190,0,.06)", border: "1px solid rgba(255,190,0,.2)" }}>
            <div style={{ fontSize: 10, fontWeight: 950, color: theme.primary }}>TEST FREE / PREMIUM — SESSION UNIQUEMENT</div>
            <div style={{ marginTop: 4, fontSize: 10, lineHeight: 1.4, color: theme.textSoft }}>
              Disponible uniquement hors production. Aucun localStorage : le test disparaît au redémarrage et ne remplace jamais la vérification Google Play / serveur.
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 7, marginTop: 8 }}>
              <button type="button" onClick={() => applyVerifiedEntitlements(null)} style={smallBtn(!adFree.active)}>TEST FREE</button>
              <button type="button" onClick={() => applyVerifiedEntitlements({ premium: true, source: "verified-server", products: ["test-premium-session"] })} style={smallBtn(adFree.active)}>TEST PREMIUM</button>
            </div>
          </div>
        ) : null}
      </section>

      <section style={card}>
        <div style={{ color: theme.primary, fontWeight: 950, marginBottom: 5 }}>BANNIÈRES</div>
        <Toggle label="Espaces publicitaires" help="Active les emplacements autorisés : Accueil, Jeux, Stats, Historique et Réglages." value={prefs.adsEnabled} onChange={(v) => patch({ adsEnabled: v })} />
        <Toggle label="Bannières" help="Jamais sur les écrans Play, le keypad ou pendant une volée." value={prefs.bannersEnabled} onChange={(v) => patch({ bannersEnabled: v })} />
        <Toggle label="Promotions MULTISPORTS SCORING" help="Utilise les emplacements de secours pour présenter les packs si aucune bannière AdMob n'est disponible." value={prefs.houseAdsEnabled} onChange={(v) => patch({ houseAdsEnabled: v })} />
      </section>

      <section style={card}>
        <div style={{ color: theme.primary, fontWeight: 950 }}>VIDÉO / INTERSTITIEL FIN DE PARTIE</div>
        <div style={{ color: theme.textSoft, fontSize: 11, lineHeight: 1.4, marginTop: 3 }}>
          Compte FREE : l'interstitiel sera tenté après chaque partie dès que son bloc AdMob réel sera créé. Les bannières, elles, peuvent déjà générer des revenus.
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 7, marginTop: 11 }}>
          <div style={{ ...smallBtn(true), textAlign: "center", cursor: "default" }}>1 PUB / 1 PARTIE</div>
          <div style={{ ...smallBtn(true), textAlign: "center", cursor: "default" }}>APRÈS RÉSULTATS</div>
        </div>

        <div style={{ marginTop: 9, borderRadius: 12, padding: 9, background: "rgba(255,255,255,.025)", border: `1px solid ${theme.borderSoft}`, color: theme.textSoft, fontSize: 10, lineHeight: 1.45 }}>
          PREMIUM / SANS PUB : aucune demande AdMob. Si aucune annonce n'est disponible, la navigation continue immédiatement. La durée et l'apparition du bouton de fermeture sont pilotées par Google.
        </div>

        {getAdMobRuntimeConfig().mode !== "production" ? (
          <button type="button" onClick={() => void previewEndGameInterstitial()} style={{ ...smallBtn(true), width: "100%", marginTop: 12 }}>▶ Aperçu vidéo / interstitiel</button>
        ) : null}
        <div style={{ marginTop: 8, fontSize: 10, color: theme.textSoft }}>
          Parties terminées comptées : {runtime.completedMatches} · dernière pub affichée : {runtime.lastInterstitialAt ? new Date(runtime.lastInterstitialAt).toLocaleString("fr-FR") : "—"}
        </div>
        <button type="button" onClick={() => setRuntimeTick((v) => v + 1)} style={{ ...smallBtn(false), marginTop: 6 }}>Rafraîchir compteur</button>
      </section>

      <section style={card}>
        <div style={{ color: theme.primary, fontWeight: 950 }}>BOUTIQUE — PACKS ADDITIONNELS</div>
        <div style={{ color: theme.textSoft, fontSize: 11, lineHeight: 1.4, marginTop: 3, marginBottom: 10 }}>
          Catalogue préparé avec des Product IDs stables pour Google Play Billing. Les prix et achats réels seront pilotés par Google Play.
        </div>
        <div style={{ display: "grid", gap: 8 }}>
          {STORE_PACKS.map((pack) => (
            <div key={pack.id} style={{ borderRadius: 14, border: `1px solid ${theme.borderSoft}`, background: "rgba(255,255,255,.025)", padding: 11 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 950, color: theme.text }}>{pack.title}</div>
                  <div style={{ fontSize: 10, color: theme.textSoft, lineHeight: 1.35, marginTop: 2 }}>{pack.subtitle}</div>
                </div>
                <span style={{ flexShrink: 0, color: theme.primary, fontSize: 9, fontWeight: 1000 }}>{pack.badge}</span>
              </div>
              <div style={{ marginTop: 7, color: theme.textSoft, fontSize: 9, fontFamily: "ui-monospace,monospace", overflowWrap: "anywhere" }}>{pack.googlePlayProductId}</div>
            </div>
          ))}
        </div>
      </section>


      <section style={card}>
        <div style={{ color: theme.primary, fontWeight: 950 }}>GOOGLE PLAY BILLING</div>
        <div style={{ color: theme.textSoft, fontSize: 11, lineHeight: 1.5, marginTop: 5 }}>
          Le bridge Android est préparé pour Google Play Billing 9.1.0. Les achats restent volontairement verrouillés tant que la vérification serveur des purchaseToken n&apos;est pas raccordée.
        </div>

        {isCapacitorNativeRuntime() ? (
          <div style={{ marginTop: 10, borderRadius: 14, border: `1px solid ${theme.borderSoft}`, padding: 10, background: "rgba(255,255,255,.025)" }}>
            <div style={{ fontSize: 11, fontWeight: 950, color: billingStatus?.connected ? theme.primary : theme.text }}>
              {billingStatus?.connected ? "GOOGLE PLAY BILLING CONNECTÉ" : "GOOGLE PLAY BILLING — CONTRÔLE"}
            </div>
            <div style={{ marginTop: 5, fontSize: 10, color: theme.textSoft, lineHeight: 1.5 }}>
              Plugin : {billingStatus?.pluginAvailable ? "OK" : "—"} · Bibliothèque : {billingStatus?.billingLibrary || "9.1.0"} · Achats : {billingStatus?.purchasesEnabled ? "ACTIVÉS" : "VERROUILLÉS"} · Vérification serveur : OBLIGATOIRE
            </div>
            {billingStatus?.error ? <div style={{ marginTop: 6, color: "#ff8b8b", fontSize: 10 }}>{billingStatus.error}</div> : null}
            <button type="button" disabled={nativeBusy} onClick={() => void refreshNativeStatus()} style={{ ...smallBtn(true), width: "100%", marginTop: 9 }}>
              {nativeBusy ? "…" : "↻ Vérifier Google Play"}
            </button>
          </div>
        ) : (
          <div style={{ marginTop: 9, color: theme.textSoft, fontSize: 10, lineHeight: 1.45 }}>
            PWA détectée : Google Play Billing n&apos;est chargé que dans l&apos;application Android.
          </div>
        )}

        <div style={{ marginTop: 9, borderRadius: 12, padding: 9, background: "rgba(255,180,0,.07)", border: "1px solid rgba(255,180,0,.22)", color: theme.textSoft, fontSize: 10, lineHeight: 1.45 }}>
          Aucun achat ne déverrouille Premium localement. Le reçu Google Play devra d&apos;abord être vérifié par le backend MULTISPORTS SCORING, puis acknowledged.
        </div>
      </section>

      <section style={card}>
        <div style={{ color: theme.primary, fontWeight: 950 }}>ANDROID / ADMOB + CONFIDENTIALITÉ UMP</div>
        <div style={{ color: theme.textSoft, fontSize: 11, lineHeight: 1.5, marginTop: 5 }}>
          Le build Android est configuré pour utiliser les vrais blocs de bannières AdMob. Les appareils déclarés comme appareils de test dans la console AdMob restent protégés ; les autres appareils FREE reçoivent des demandes publicitaires live. Les formats plein écran restent désactivés jusqu'à la création de leurs propres blocs réels.
        </div>

        {isCapacitorNativeRuntime() ? (
          <div style={{ marginTop: 10, borderRadius: 14, border: `1px solid ${theme.borderSoft}`, padding: 10, background: "rgba(255,255,255,.025)" }}>
            <div style={{ fontSize: 11, fontWeight: 950, color: nativeStatus?.initialized ? theme.primary : theme.text }}>
              {nativeStatus?.initialized ? "ADMOB NATIF INITIALISÉ" : "ADMOB NATIF — CONTRÔLE"}
            </div>
            <div style={{ marginTop: 5, fontSize: 10, color: theme.textSoft, lineHeight: 1.45 }}>
              Plugin : {nativeStatus?.pluginAvailable ? "OK" : "—"} · Consentement : {nativeStatus?.consentStatus || "…"} · Publicités autorisées : {nativeStatus?.canRequestAds ? "OUI" : "NON"}
            </div>
            <div style={{ marginTop: 4, fontSize: 10, color: theme.textSoft, lineHeight: 1.45 }}>
              Mode : {nativeStatus?.mode === "production" ? "PRODUCTION · BANNIÈRES LIVE" : nativeStatus?.mode === "real_test" ? (nativeStatus?.realTestUseGoogleDemoBanners ? "REAL_TEST · BANNIÈRES DEMO GOOGLE" : "REAL_TEST · VRAIS IDs") : "GOOGLE TEST"} · Appareil test : {nativeStatus?.testDevicesManagedByAdMobConsole && (nativeStatus?.testDeviceCount ?? 0) > 0 ? `CONSOLE + SDK (${nativeStatus?.testDeviceCount ?? 0})` : nativeStatus?.testDevicesManagedByAdMobConsole ? "CONSOLE ADMOB" : (nativeStatus?.testDeviceCount ?? 0)} · Bannières réelles : {nativeStatus?.productionReady ? "OUI" : "NON"}
            </div>
            <div style={{ marginTop: 4, fontSize: 10, color: theme.textSoft, lineHeight: 1.45 }}>
              Interstitiel réel : {nativeStatus?.interstitialReady ? "PRÊT" : "À CRÉER"} · Rewarded réel : {nativeStatus?.rewardedReady ? "PRÊT" : "À CRÉER"}
            </div>
            {nativeStatus?.configErrors?.length ? (
              <div style={{ marginTop: 7, borderRadius: 10, padding: 8, background: "rgba(255,80,80,.08)", border: "1px solid rgba(255,80,80,.24)", color: "#ff9b9b", fontSize: 10, lineHeight: 1.45 }}>
                {nativeStatus.configErrors.map((message) => <div key={message}>• {message}</div>)}
              </div>
            ) : null}
            {nativeStatus?.error ? <div style={{ marginTop: 6, color: "#ff8b8b", fontSize: 10 }}>{nativeStatus.error}</div> : null}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 7, marginTop: 9 }}>
              <button type="button" disabled={nativeBusy} onClick={() => void refreshNativeStatus()} style={smallBtn(true)}>{nativeBusy ? "…" : "↻ Vérifier AdMob"}</button>
              <button type="button" disabled={nativeBusy || !nativeStatus?.privacyOptionsRequired} onClick={() => void openPrivacyOptions()} style={{ ...smallBtn(false), opacity: nativeStatus?.privacyOptionsRequired ? 1 : .48 }}>
                {nativeStatus?.privacyOptionsRequired ? "Confidentialité" : "Options non requises"}
              </button>
            </div>
          </div>
        ) : (
          <div style={{ marginTop: 9, color: theme.textSoft, fontSize: 10, lineHeight: 1.45 }}>
            PWA détectée : aucun SDK AdMob natif n'est chargé ici. Les bannières live sont demandées uniquement dans l'application Android Capacitor.
          </div>
        )}

        <Toggle label="Aperçu PWA des emplacements" help="Sur le web uniquement, affiche les faux emplacements visuels. Android utilise la configuration AdMob du build." value={prefs.testMode} onChange={(v) => patch({ testMode: v })} />
      </section>
    </div>
  );
}
