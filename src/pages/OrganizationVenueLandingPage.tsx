import React from "react";
import { useAuthOnline } from "../hooks/useAuthOnline";
import { useTheme } from "../contexts/ThemeContext";
import { useLang } from "../contexts/LangContext";
import { pickLegacyLocalizedText } from "../i18n/legacyLocalizedText";
import { resolveOrganizationInstallationQr, touchOrganizationInstallation, type OrganizationInstallation } from "../organizations/organizationService";
import { activateOrganizationPlayContext } from "../organizations/organizationPlayContext";

export default function OrganizationVenueLandingPage({ go, params }: { go?: (tab: any, params?: any) => void; params?: any }) {
  const auth = useAuthOnline() as any;
  const { theme } = useTheme();
  const { lang } = useLang();
  const L = React.useCallback((fr: string, en: string, es: string) => pickLegacyLocalizedText(lang, fr, en, es), [lang]);
  const userId = String(auth?.userId || auth?.user?.id || "") || null;
  const token = String(params?.venueToken || "").trim();
  const [item, setItem] = React.useState<OrganizationInstallation | null>(null);
  const [error, setError] = React.useState("");
  const [busy, setBusy] = React.useState(true);

  React.useEffect(() => {
    let alive = true;
    setBusy(true); setError("");
    resolveOrganizationInstallationQr(userId, token).then((value) => { if (alive) setItem(value); }).catch((e: any) => { if (alive) setError(String(e?.message || e)); }).finally(() => { if (alive) setBusy(false); });
    return () => { alive = false; };
  }, [userId, token]);

  const card: React.CSSProperties = { borderRadius: 18, border: `1px solid ${theme.borderSoft}`, background: "rgba(5,10,18,.82)", boxShadow: "0 18px 44px rgba(0,0,0,.34)" };
  const button: React.CSSProperties = { width: "100%", minHeight: 46, borderRadius: 13, border: `1px solid ${theme.primary}88`, background: `${theme.primary}18`, color: theme.primary, fontWeight: 1000, fontSize: 11, cursor: "pointer" };

  async function play() {
    if (!item) return;
    activateOrganizationPlayContext({ organizationId: item.organizationId, organizationName: item.organizationName, installationId: item.id, installationName: item.name, installationKind: item.kind, sportId: item.sportId, qrToken: item.qrToken });
    void touchOrganizationInstallation(userId, item.qrToken);
    go?.("games", { organizationId: item.organizationId, organizationInstallationId: item.id, organizationVenue: true });
  }

  return <div style={{ minHeight: "100vh", background: theme.pageBg || "#050914", color: theme.text, padding: "max(20px, env(safe-area-inset-top)) 14px 110px" }}>
    <div style={{ width: "100%", maxWidth: 560, margin: "0 auto", display: "grid", gap: 12 }}>
      <div style={{ ...card, padding: 18, textAlign: "center" }}>
        <div style={{ color: theme.primary, fontSize: 9, fontWeight: 1000, letterSpacing: 1.3 }}>MULTISPORTS SCORING · VENUE</div>
        {busy ? <div style={{ marginTop: 18, color: theme.textSoft }}>…</div> : error ? <><div style={{ marginTop: 18, color: "#ff9f9f", fontWeight: 900 }}>{error}</div><button style={{ ...button, marginTop: 14, color: theme.textSoft, borderColor: theme.borderSoft }} onClick={() => go?.("home")}>{L("RETOUR À L’ACCUEIL", "BACK HOME", "VOLVER AL INICIO")}</button></> : item ? <>
          <div style={{ marginTop: 15, fontSize: 22, fontWeight: 1000 }}>{item.organizationName}</div>
          <div style={{ marginTop: 7, color: theme.primary, fontSize: 16, fontWeight: 1000 }}>{item.name}</div>
          <div style={{ marginTop: 6, color: theme.textSoft, fontSize: 10.5 }}>{item.sportId}{item.zoneLabel ? ` · ${item.zoneLabel}` : ""}</div>
          <div style={{ marginTop: 16, borderRadius: 13, background: `${theme.primary}0c`, border: `1px solid ${theme.primary}33`, padding: 12, color: theme.textSoft, fontSize: 9.5, lineHeight: 1.5 }}>{L("Ce QR rattache ta prochaine partie à ce lieu. Les statistiques détaillées restent dans ton stockage MSS ; le lieu n’enregistre qu’un contexte léger d’installation.", "This QR links your next game to this venue. Detailed statistics remain in your MSS storage; the venue only records a lightweight installation context.", "Este QR vincula tu próxima partida a este lugar. Las estadísticas detalladas permanecen en tu almacenamiento MSS; el lugar solo registra un contexto ligero de instalación.")}</div>
          <button style={{ ...button, marginTop: 14 }} onClick={() => void play()}>{L("ACTIVER CE LIEU ET JOUER", "ACTIVATE THIS VENUE & PLAY", "ACTIVAR ESTE LUGAR Y JUGAR")}</button>
          <button style={{ ...button, marginTop: 8, color: theme.textSoft, borderColor: theme.borderSoft, background: "rgba(255,255,255,.025)" }} onClick={() => go?.("home")}>{L("PAS MAINTENANT", "NOT NOW", "AHORA NO")}</button>
        </> : null}
      </div>
    </div>
  </div>;
}
