import React from "react";
import { useTheme } from "../contexts/ThemeContext";
import { GOOGLE_PLAY_CORE_PRODUCTS, STORE_PACKS } from "./catalog";
import { getMonetizationRuntimeSnapshot, previewEndGameInterstitial } from "./MonetizationManager";
import { getVerifiedPremiumState, loadMonetizationPrefs, saveMonetizationPrefs, subscribeMonetizationPrefs } from "./prefs";
import type { EndGameAdTiming, MonetizationPrefs } from "./types";

export default function MonetizationSettingsPanel() {
  const { theme } = useTheme() as any;
  const [prefs, setPrefs] = React.useState<MonetizationPrefs>(() => loadMonetizationPrefs());
  const [runtimeTick, setRuntimeTick] = React.useState(0);
  const premium = getVerifiedPremiumState();
  const runtime = React.useMemo(() => getMonetizationRuntimeSnapshot(), [runtimeTick]);

  React.useEffect(() => subscribeMonetizationPrefs(setPrefs), []);
  const patch = (next: Partial<MonetizationPrefs>) => setPrefs(saveMonetizationPrefs(next));

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

  const timingOptions: { id: EndGameAdTiming; label: string }[] = [
    { id: "after_results", label: "Après résultats" },
    { id: "before_results", label: "Avant résultats" },
    { id: "off", label: "Jamais" },
  ];

  return (
    <div style={{ display: "grid", gap: 12, paddingBottom: 72 }}>
      <section style={card}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
          <div>
            <div style={{ color: theme.primary, fontWeight: 1000, fontSize: 17 }}>PUBLICITÉ & PREMIUM</div>
            <div style={{ color: theme.textSoft, fontSize: 11, marginTop: 3 }}>Socle commun PWA → Android / Google Play.</div>
          </div>
          <div style={{ borderRadius: 999, padding: "7px 10px", border: `1px solid ${premium.active ? theme.primary : theme.borderSoft}`, color: premium.active ? theme.primary : theme.textSoft, fontSize: 10, fontWeight: 1000 }}>
            {premium.active ? "PREMIUM · SANS PUB" : "FREE · PUBS"}
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
      </section>

      <section style={card}>
        <div style={{ color: theme.primary, fontWeight: 950, marginBottom: 5 }}>BANNIÈRES</div>
        <Toggle label="Espaces publicitaires" help="Active les emplacements autorisés : Accueil, Jeux, Stats, Historique et Réglages." value={prefs.adsEnabled} onChange={(v) => patch({ adsEnabled: v })} />
        <Toggle label="Bannières" help="Jamais sur les écrans Play, le keypad ou pendant une volée." value={prefs.bannersEnabled} onChange={(v) => patch({ bannersEnabled: v })} />
        <Toggle label="Promotions MULTISPORTS SCORING" help="Utilise les emplacements libres pour présenter les packs additionnels tant qu'aucun réseau réel n'est branché." value={prefs.houseAdsEnabled} onChange={(v) => patch({ houseAdsEnabled: v })} />
      </section>

      <section style={card}>
        <div style={{ color: theme.primary, fontWeight: 950 }}>VIDÉO / INTERSTITIEL FIN DE PARTIE</div>
        <div style={{ color: theme.textSoft, fontSize: 11, lineHeight: 1.4, marginTop: 3 }}>
          Par défaut : après fermeture des résultats, pour que le vainqueur et les statistiques apparaissent immédiatement.
        </div>
        <Toggle label="Vidéo de fin de partie" help="Déclenchée uniquement après une partie réellement terminée et enregistrée." value={prefs.endGameVideoEnabled} onChange={(v) => patch({ endGameVideoEnabled: v })} />

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 7, marginTop: 10 }}>
          {timingOptions.map((o) => <button key={o.id} type="button" onClick={() => patch({ endGameAdTiming: o.id })} style={smallBtn(prefs.endGameAdTiming === o.id)}>{o.label}</button>)}
        </div>

        <div style={{ marginTop: 12, fontSize: 11, color: theme.textSoft, fontWeight: 850 }}>Fréquence maximum</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 7, marginTop: 7 }}>
          {[2, 3, 4, 5].map((n) => <button key={n} type="button" onClick={() => patch({ endGameEveryMatches: n })} style={smallBtn(prefs.endGameEveryMatches === n)}>1 / {n}</button>)}
        </div>

        <div style={{ marginTop: 12, fontSize: 11, color: theme.textSoft, fontWeight: 850 }}>Intervalle minimum</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 7, marginTop: 7 }}>
          {[5, 8, 12].map((minutes) => <button key={minutes} type="button" onClick={() => patch({ minInterstitialIntervalMs: minutes * 60_000 })} style={smallBtn(prefs.minInterstitialIntervalMs === minutes * 60_000)}>{minutes} min</button>)}
        </div>

        <button type="button" onClick={() => void previewEndGameInterstitial()} style={{ ...smallBtn(true), width: "100%", marginTop: 12 }}>▶ Aperçu vidéo / interstitiel</button>
        <div style={{ marginTop: 8, fontSize: 10, color: theme.textSoft }}>
          Parties terminées comptées : {runtime.completedMatches} · dernière pub : {runtime.lastInterstitialAt ? new Date(runtime.lastInterstitialAt).toLocaleString("fr-FR") : "—"}
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
        <div style={{ color: theme.primary, fontWeight: 950 }}>ANDROID / ADMOB — PRÊT À BRANCHER</div>
        <div style={{ color: theme.textSoft, fontSize: 11, lineHeight: 1.5, marginTop: 5 }}>
          Le projet React actuel ne contient pas encore de shell Android natif/Capacitor. Le patch expose donc un pont <b>DCNativeMonetization</b> : lors de la migration Play Store, AdMob, UMP et Google Play Billing se brancheront derrière ce pont sans réécrire les écrans.
        </div>
        <Toggle label="Aperçu des emplacements" help="Affiche les faux emplacements publicitaires de test. Aucun revenu et aucun réseau réel en mode aperçu." value={prefs.testMode} onChange={(v) => patch({ testMode: v })} />
      </section>
    </div>
  );
}
