import React from "react";
import { useTheme } from "../contexts/ThemeContext";
import { useLang } from "../contexts/LangContext";
import { pickLegacyLocalizedText } from "../i18n/legacyLocalizedText";
import {
  organizationPlanLabel,
  organizationRoleLabel,
  rotateOrganizationJoinCode,
  updateOrganizationAdminSettings,
  type OrganizationRecord,
} from "../organizations/organizationService";
import { getStorageDestination, loadStoragePrefs } from "../lib/storagePlans";

const OPTIONAL_MODULES = [
  ["communication", "Communication"],
  ["federations", "Fédérations"],
  ["billing", "Cotisations & paiements"],
  ["sponsors", "Sponsors & partenaires"],
] as const;

export default function OrganizationAdminPanel({
  organization,
  userId,
  go,
  onOpenProfile,
  onChanged,
}: {
  organization: OrganizationRecord;
  userId: string | null;
  go?: (tab: any, params?: any) => void;
  onOpenProfile?: () => void;
  onChanged?: () => void;
}) {
  const { theme } = useTheme();
  const { lang } = useLang();
  const L = React.useCallback((fr: string, en: string, es: string) => pickLegacyLocalizedText(lang, fr, en, es), [lang]);
  const [busy, setBusy] = React.useState("");
  const [notice, setNotice] = React.useState("");
  const [error, setError] = React.useState("");
  const settings = organization.profile.adminSettings;
  const canManage = organization.role === "owner" || organization.role === "admin";
  const storage = getStorageDestination(loadStoragePrefs().selectedDestination);

  const card: React.CSSProperties = { borderRadius: 16, border: `1px solid ${theme.borderSoft}`, background: theme.cardBackground || theme.card, padding: 13 };
  const button: React.CSSProperties = { minHeight: 38, borderRadius: 11, border: `1px solid ${theme.borderSoft}`, background: "rgba(255,255,255,.035)", color: theme.text, padding: "8px 11px", fontSize: 9, fontWeight: 950, cursor: "pointer" };
  const primaryButton: React.CSSProperties = { ...button, border: `1px solid ${theme.primary}77`, background: `${theme.primary}12`, color: theme.primary };

  async function saveSettings(patch: any) {
    if (!canManage) return;
    setBusy("settings"); setError(""); setNotice("");
    try {
      await updateOrganizationAdminSettings(userId, organization.id, patch);
      setNotice(L("Paramètres enregistrés.", "Settings saved.", "Ajustes guardados."));
      onChanged?.();
    } catch (e: any) {
      setError(String(e?.message || L("Enregistrement impossible.", "Unable to save.", "No se puede guardar.")));
    } finally { setBusy(""); }
  }

  async function rotateCode() {
    if (!canManage) return;
    if (!window.confirm(L("L’ancien code d’invitation cessera immédiatement de fonctionner. Continuer ?", "The old invitation code will stop working immediately. Continue?", "El código de invitación anterior dejará de funcionar inmediatamente. ¿Continuar?"))) return;
    setBusy("code"); setError(""); setNotice("");
    try {
      const code = await rotateOrganizationJoinCode(userId, organization.id);
      setNotice(`${L("Nouveau code", "New code", "Nuevo código")}: ${code}`);
      onChanged?.();
    } catch (e: any) { setError(String(e?.message || "Impossible de générer un nouveau code.")); }
    finally { setBusy(""); }
  }

  function exportConfiguration() {
    const payload = {
      format: "mss-organization-config-v1",
      exportedAt: new Date().toISOString(),
      organization: {
        id: organization.id,
        name: organization.name,
        kind: organization.kind,
        plan: organization.plan,
        city: organization.city,
        countryCode: organization.countryCode,
        description: organization.description,
        profile: { ...organization.profile, logoMediaKey: organization.profile.logoMediaKey || "", coverMediaKey: organization.profile.coverMediaKey || "" },
      },
      storage: { destination: storage.id, label: storage.shortLabel },
      note: "Les médias, statistiques détaillées et historiques lourds ne sont pas inclus dans cet export de configuration.",
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `mss-organisation-${organization.name.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase() || "export"}.json`;
    a.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  const enabled = settings.enabledModules || ["communication", "federations", "billing", "sponsors"];
  const toggleModule = (id: string) => {
    const next = enabled.includes(id) ? enabled.filter((value) => value !== id) : [...enabled, id];
    void saveSettings({ enabledModules: next });
  };

  return <div style={{ display: "grid", gap: 10 }}>
    <div style={{ ...card, background: `linear-gradient(145deg, ${theme.primary}10, rgba(0,0,0,.16)), ${theme.cardBackground || theme.card}` }}>
      <div style={{ color: theme.primary, fontSize: 12.5, fontWeight: 1000 }}>{L("CENTRE D’ADMINISTRATION", "ADMINISTRATION CENTER", "CENTRO DE ADMINISTRACIÓN")}</div>
      <div style={{ marginTop: 5, color: theme.textSoft, fontSize: 9.5, lineHeight: 1.45 }}>{L("Paramètres légers de l’espace collectif. Les données sportives lourdes et médias restent hors Supabase.", "Lightweight collective-space settings. Heavy sports data and media stay outside Supabase.", "Ajustes ligeros del espacio colectivo. Los datos deportivos pesados y multimedia permanecen fuera de Supabase.")}</div>
      <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 6 }}>
        {[
          [L("FORMULE", "PLAN", "PLAN"), organizationPlanLabel(organization.plan)],
          [L("RÔLE", "ROLE", "ROL"), organizationRoleLabel(organization.role)],
          [L("MEMBRES", "MEMBERS", "MIEMBROS"), String(organization.memberCount)],
          [L("STOCKAGE", "STORAGE", "ALMACENAMIENTO"), storage.shortLabel],
        ].map(([label,value]) => <div key={label} style={{ borderRadius: 11, border: `1px solid ${theme.borderSoft}`, background: "rgba(0,0,0,.22)", padding: "8px 5px", textAlign: "center", minWidth: 0 }}><div style={{ color: theme.primary, fontSize: 9.5, fontWeight: 1000, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{value}</div><div style={{ marginTop: 2, color: theme.textSoft, fontSize: 6.8, fontWeight: 900 }}>{label}</div></div>)}
      </div>
    </div>

    {notice ? <div style={{ borderRadius: 11, border: `1px solid ${theme.primary}44`, background: `${theme.primary}0c`, color: theme.textSoft, padding: 9, fontSize: 9 }}>{notice}</div> : null}
    {error ? <div style={{ borderRadius: 11, border: "1px solid rgba(255,90,90,.45)", background: "rgba(255,60,60,.07)", color: "#ffb1b1", padding: 9, fontSize: 9 }}>{error}</div> : null}

    <div style={card}>
      <div style={{ color: theme.text, fontSize: 11.5, fontWeight: 1000 }}>{L("IDENTITÉ & STOCKAGE", "IDENTITY & STORAGE", "IDENTIDAD Y ALMACENAMIENTO")}</div>
      <div style={{ marginTop: 8, display: "grid", gap: 7 }}>
        <button type="button" style={button} onClick={() => onOpenProfile?.()}>{L("OUVRIR LA FICHE ORGANISME", "OPEN ORGANIZATION PROFILE", "ABRIR FICHA DE LA ORGANIZACIÓN")}</button>
        <button type="button" style={button} onClick={() => go?.("settings")}>{L("OUVRIR LE CENTRE DE STOCKAGE / RÉGLAGES", "OPEN STORAGE CENTER / SETTINGS", "ABRIR CENTRO DE ALMACENAMIENTO / AJUSTES")}</button>
        <button type="button" style={button} onClick={exportConfiguration}>{L("EXPORTER LA CONFIGURATION JSON", "EXPORT JSON CONFIGURATION", "EXPORTAR CONFIGURACIÓN JSON")}</button>
      </div>
      <div style={{ marginTop: 8, color: theme.textSoft, fontSize: 8.5, lineHeight: 1.45 }}>{L("L’export contient uniquement la configuration légère. Logos, photos, résultats détaillés et médias ne sont pas embarqués.", "The export only contains lightweight configuration. Logos, photos, detailed results and media are not embedded.", "La exportación solo contiene configuración ligera. Logos, fotos, resultados detallados y multimedia no se incluyen.")}</div>
    </div>

    <div style={card}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}><div><div style={{ color: theme.text, fontSize: 11.5, fontWeight: 1000 }}>{L("CODE D’INVITATION", "INVITATION CODE", "CÓDIGO DE INVITACIÓN")}</div><div style={{ marginTop: 3, color: theme.primary, fontSize: 13, fontWeight: 1000, letterSpacing: 1 }}>{organization.joinCode || "—"}</div></div><div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "flex-end" }}><button type="button" style={button} onClick={() => navigator.clipboard?.writeText(organization.joinCode || "")}>{L("COPIER", "COPY", "COPIAR")}</button>{canManage ? <button type="button" disabled={!!busy} style={{ ...primaryButton, opacity: busy === "code" ? .55 : 1 }} onClick={() => void rotateCode()}>{L("RÉGÉNÉRER", "ROTATE", "REGENERAR")}</button> : null}</div></div>
      <div style={{ marginTop: 8, color: theme.textSoft, fontSize: 8.5 }}>{L("La régénération invalide immédiatement l’ancien code.", "Rotating immediately invalidates the old code.", "La regeneración invalida inmediatamente el código anterior.")}</div>
    </div>

    <div style={card}>
      <div style={{ color: theme.text, fontSize: 11.5, fontWeight: 1000 }}>{L("PRÉSENTATION DE L’ESPACE", "SPACE PRESENTATION", "PRESENTACIÓN DEL ESPACIO")}</div>
      <label style={{ marginTop: 9, display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", color: theme.textSoft, fontSize: 9.5 }}><span>{L("Accueil organisation compact", "Compact organization home", "Inicio de organización compacto")}</span><input type="checkbox" disabled={!canManage || !!busy} checked={settings.compactDashboard} onChange={(e) => void saveSettings({ compactDashboard: e.target.checked })}/></label>
      <div style={{ marginTop: 10, color: theme.textSoft, fontSize: 8.5, fontWeight: 900 }}>{L("RACCOURCIS OPTIONNELS VISIBLES SUR L’ACCUEIL", "OPTIONAL SHORTCUTS VISIBLE ON HOME", "ACCESOS OPCIONALES VISIBLES EN INICIO")}</div>
      <div style={{ marginTop: 6, display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 6 }}>{OPTIONAL_MODULES.map(([id,label]) => <label key={id} style={{ minHeight: 38, borderRadius: 10, border: `1px solid ${enabled.includes(id) ? theme.primary + "66" : theme.borderSoft}`, background: enabled.includes(id) ? `${theme.primary}0b` : "rgba(255,255,255,.02)", padding: "7px 8px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 7, color: theme.text, fontSize: 8.8, fontWeight: 850 }}><span>{label}</span><input type="checkbox" disabled={!canManage || !!busy} checked={enabled.includes(id)} onChange={() => toggleModule(id)}/></label>)}</div>
      <div style={{ marginTop: 7, color: theme.textSoft, fontSize: 8 }}>{L("Ce réglage agit sur la présentation de l’accueil ; il ne remplace pas les permissions de sécurité des rôles.", "This setting changes the home presentation; it does not replace role security permissions.", "Este ajuste cambia la presentación del inicio; no sustituye los permisos de seguridad de los roles.")}</div>
    </div>

    <div style={card}>
      <div style={{ color: theme.text, fontSize: 11.5, fontWeight: 1000 }}>{L("GARDE-FOUS DE DONNÉES", "DATA GUARDRAILS", "PROTECCIONES DE DATOS")}</div>
      <div style={{ marginTop: 8, display: "grid", gap: 6 }}>{[
        L("Supabase : identité, rôles, relations et petites métadonnées uniquement.", "Supabase: identity, roles, relations and small metadata only.", "Supabase: identidad, roles, relaciones y metadatos pequeños únicamente."),
        L(`Médias : ${storage.shortLabel} / destination du Centre de stockage.`, `Media: ${storage.shortLabel} / Storage Center destination.`, `Multimedia: ${storage.shortLabel} / destino del Centro de almacenamiento.`),
        L("Aucune carte bancaire, IBAN, secret Stripe ou mot de passe fédéral dans Supabase.", "No bank card, IBAN, Stripe secret or federation password in Supabase.", "Ninguna tarjeta bancaria, IBAN, secreto Stripe o contraseña federativa en Supabase."),
      ].map((line,index) => <div key={index} style={{ display: "grid", gridTemplateColumns: "7px minmax(0,1fr)", gap: 7, color: theme.textSoft, fontSize: 9, lineHeight: 1.4 }}><span style={{ width: 5, height: 5, borderRadius: 999, background: theme.primary, marginTop: 4 }}/><span>{line}</span></div>)}</div>
    </div>

    {!canManage ? <div style={{ ...card, color: theme.textSoft, fontSize: 9.2 }}>{L("Cette page est en lecture seule pour ton rôle. Les réglages sont réservés au propriétaire et aux administrateurs.", "This page is read-only for your role. Settings are reserved for the owner and administrators.", "Esta página es de solo lectura para tu rol. Los ajustes están reservados al propietario y administradores.")}</div> : null}
  </div>;
}
