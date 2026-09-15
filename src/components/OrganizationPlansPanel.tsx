import React from "react";
import { useTheme } from "../contexts/ThemeContext";
import { useLang } from "../contexts/LangContext";
import { pickLegacyLocalizedText } from "../i18n/legacyLocalizedText";
import {
  organizationPlanLabel,
  updateOrganizationAdminSettings,
  type OrganizationPlan,
  type OrganizationRecord,
} from "../organizations/organizationService";

const CATALOG: Array<{ id: OrganizationPlan; audience: string; summary: string; features: string[] }> = [
  { id: "group", audience: "PETITS GROUPES", summary: "Le socle collectif MSS pour démarrer simplement.", features: ["Membres & rôles", "Équipes / groupes", "Agenda", "Compétitions essentielles"] },
  { id: "club", audience: "CLUBS & ASSOCIATIONS", summary: "Gestion structurée d’une organisation sportive.", features: ["Gestion multi-équipes", "Compétitions & classements", "Communication", "Cotisations & partenaires"] },
  { id: "pro", audience: "STRUCTURES AVANCÉES", summary: "Pilotage plus complet pour structures multi-sections.", features: ["Organisation multi-sections", "Administration avancée", "Fédérations & affiliations", "Exports et intégrations"] },
  { id: "business", audience: "ENTREPRISES / VENUES", summary: "Challenges, établissements et animation communautaire.", features: ["Challenges internes", "Événements", "Partenaires", "Préparation du mode VENUE / QR"] },
  { id: "custom", audience: "FÉDÉRATIONS / RÉSEAUX", summary: "Déploiement sur mesure et intégrations spécifiques.", features: ["Architecture personnalisée", "Connecteurs autorisés", "Déploiement réseau", "Accompagnement spécifique"] },
];

export default function OrganizationPlansPanel({ organization, userId, onChanged }: { organization: OrganizationRecord; userId: string | null; onChanged?: () => void }) {
  const { theme } = useTheme();
  const { lang } = useLang();
  const L = React.useCallback((fr: string, en: string, es: string) => pickLegacyLocalizedText(lang, fr, en, es), [lang]);
  const [busy, setBusy] = React.useState("");
  const [notice, setNotice] = React.useState("");
  const [error, setError] = React.useState("");
  const requested = organization.profile.adminSettings.requestedPlan;
  const canRequest = organization.role === "owner";
  const card: React.CSSProperties = { borderRadius: 16, border: `1px solid ${theme.borderSoft}`, background: theme.cardBackground || theme.card, padding: 13 };
  const button: React.CSSProperties = { minHeight: 37, borderRadius: 11, border: `1px solid ${theme.borderSoft}`, background: "rgba(255,255,255,.035)", color: theme.text, padding: "8px 10px", fontSize: 8.8, fontWeight: 950, cursor: "pointer" };

  async function requestPlan(plan: OrganizationPlan | "") {
    if (!canRequest) return;
    setBusy(plan || "clear"); setError(""); setNotice("");
    try {
      await updateOrganizationAdminSettings(userId, organization.id, { requestedPlan: plan });
      setNotice(plan ? L("Demande de changement enregistrée. Aucune facturation n’est déclenchée automatiquement.", "Plan change request saved. No billing is triggered automatically.", "Solicitud de cambio guardada. No se inicia ninguna facturación automáticamente.") : L("Demande annulée.", "Request cancelled.", "Solicitud cancelada."));
      onChanged?.();
    } catch (e: any) { setError(String(e?.message || "Impossible d’enregistrer la demande.")); }
    finally { setBusy(""); }
  }

  return <div style={{ display: "grid", gap: 10 }}>
    <div style={{ ...card, background: `linear-gradient(145deg, ${theme.primary}10, rgba(0,0,0,.16)), ${theme.cardBackground || theme.card}` }}>
      <div style={{ color: theme.primary, fontSize: 12.5, fontWeight: 1000 }}>{L("OFFRES MULTISPORTS SCORING", "MULTISPORTS SCORING PLANS", "PLANES MULTISPORTS SCORING")}</div>
      <div style={{ marginTop: 5, color: theme.textSoft, fontSize: 9.5, lineHeight: 1.45 }}>{L("Cette page prépare le parcours B2B. Une demande d’offre n’active pas de paiement ni de prélèvement automatique.", "This page prepares the B2B flow. Requesting a plan does not activate payment or automatic billing.", "Esta página prepara el flujo B2B. Solicitar un plan no activa pagos ni cobros automáticos.")}</div>
      <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 7 }}><div style={{ borderRadius: 11, border: `1px solid ${theme.primary}55`, background: `${theme.primary}0a`, padding: 9 }}><div style={{ color: theme.textSoft, fontSize: 7.5, fontWeight: 900 }}>{L("FORMULE CONFIGURÉE", "CONFIGURED PLAN", "PLAN CONFIGURADO")}</div><div style={{ marginTop: 3, color: theme.primary, fontSize: 11.5, fontWeight: 1000 }}>{organizationPlanLabel(organization.plan)}</div></div><div style={{ borderRadius: 11, border: `1px solid ${theme.borderSoft}`, background: "rgba(0,0,0,.2)", padding: 9 }}><div style={{ color: theme.textSoft, fontSize: 7.5, fontWeight: 900 }}>{L("DEMANDE EN ATTENTE", "PENDING REQUEST", "SOLICITUD PENDIENTE")}</div><div style={{ marginTop: 3, color: requested ? theme.primary : theme.textSoft, fontSize: 11.5, fontWeight: 1000 }}>{requested ? organizationPlanLabel(requested) : "—"}</div></div></div>
    </div>

    {notice ? <div style={{ borderRadius: 11, border: `1px solid ${theme.primary}44`, background: `${theme.primary}0c`, color: theme.textSoft, padding: 9, fontSize: 9 }}>{notice}</div> : null}
    {error ? <div style={{ borderRadius: 11, border: "1px solid rgba(255,90,90,.45)", background: "rgba(255,60,60,.07)", color: "#ffb1b1", padding: 9, fontSize: 9 }}>{error}</div> : null}

    {CATALOG.map((plan) => {
      const current = organization.plan === plan.id;
      const pending = requested === plan.id;
      return <div key={plan.id} style={{ ...card, border: `1px solid ${current ? theme.primary : pending ? theme.primary + "99" : theme.borderSoft}` }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 9, alignItems: "start" }}><div><div style={{ color: theme.primary, fontSize: 12, fontWeight: 1000 }}>{organizationPlanLabel(plan.id)}</div><div style={{ marginTop: 2, color: theme.textSoft, fontSize: 7.5, fontWeight: 900 }}>{plan.audience}</div></div><div style={{ display: "flex", gap: 5, flexWrap: "wrap", justifyContent: "flex-end" }}>{current ? <span style={{ borderRadius: 999, border: `1px solid ${theme.primary}66`, color: theme.primary, padding: "4px 7px", fontSize: 7, fontWeight: 1000 }}>{L("CONFIGURÉE", "CONFIGURED", "CONFIGURADO")}</span> : null}{pending ? <span style={{ borderRadius: 999, border: `1px solid ${theme.primary}66`, color: theme.primary, padding: "4px 7px", fontSize: 7, fontWeight: 1000 }}>{L("DEMANDÉE", "REQUESTED", "SOLICITADO")}</span> : null}</div></div>
        <div style={{ marginTop: 7, color: theme.text, fontSize: 9.5, lineHeight: 1.4 }}>{plan.summary}</div>
        <div style={{ marginTop: 8, display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 5 }}>{plan.features.map((feature) => <div key={feature} style={{ color: theme.textSoft, fontSize: 8.3, display: "grid", gridTemplateColumns: "7px minmax(0,1fr)", gap: 5 }}><span style={{ width: 4, height: 4, borderRadius: 999, background: theme.primary, marginTop: 4 }}/><span>{feature}</span></div>)}</div>
        {canRequest && !current ? <button type="button" disabled={!!busy} onClick={() => void requestPlan(plan.id)} style={{ ...button, marginTop: 10, width: "100%", borderColor: `${theme.primary}66`, color: theme.primary, opacity: busy ? .55 : 1 }}>{pending ? L("DEMANDE ENREGISTRÉE", "REQUEST SAVED", "SOLICITUD GUARDADA") : L("DEMANDER CETTE OFFRE", "REQUEST THIS PLAN", "SOLICITAR ESTE PLAN")}</button> : null}
      </div>;
    })}

    {requested && canRequest ? <button type="button" disabled={!!busy} onClick={() => void requestPlan("")} style={{ ...button, color: "#ffb0b0", borderColor: "rgba(255,100,100,.35)" }}>{L("ANNULER LA DEMANDE DE CHANGEMENT", "CANCEL PLAN CHANGE REQUEST", "CANCELAR SOLICITUD DE CAMBIO")}</button> : null}
    {!canRequest ? <div style={{ ...card, color: theme.textSoft, fontSize: 9 }}>{L("Seul le propriétaire de l’organisation peut enregistrer une demande de changement d’offre.", "Only the organization owner can register a plan-change request.", "Solo el propietario de la organización puede registrar una solicitud de cambio de plan.")}</div> : null}
  </div>;
}
