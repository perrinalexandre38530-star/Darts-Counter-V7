import React from "react";
import { useTheme } from "../contexts/ThemeContext";
import { useLang } from "../contexts/LangContext";
import { pickLegacyLocalizedText } from "../i18n/legacyLocalizedText";
import OrganizationTypeIcon from "./OrganizationTypeIcon";
import {
  listMyOrganizationInvitations,
  listMyOrganizationMemberProposals,
  organizationKindLabel,
  organizationRoleLabel,
  respondOrganizationInvitation,
  respondOrganizationMemberProposal,
  type OrganizationInvitation,
  type OrganizationMemberProposal,
} from "../organizations/organizationService";

type Props = {
  userId: string | null;
  onChanged?: () => void | Promise<void>;
};

export default function OrganizationInvitationsInbox({ userId, onChanged }: Props) {
  const { theme } = useTheme();
  const { lang } = useLang();
  const L = React.useCallback((fr: string, en: string, es: string) => pickLegacyLocalizedText(lang, fr, en, es), [lang]);
  const [items, setItems] = React.useState<OrganizationInvitation[]>([]);
  const [proposals, setProposals] = React.useState<OrganizationMemberProposal[]>([]);
  const [busy, setBusy] = React.useState("");
  const [error, setError] = React.useState("");

  const load = React.useCallback(async () => {
    if (!userId) { setItems([]); return; }
    try {
      const [result, proposalResult] = await Promise.all([
        listMyOrganizationInvitations(userId),
        listMyOrganizationMemberProposals(userId),
      ]);
      setItems(result.invitations.filter((item) => item.status === "pending"));
      setProposals(proposalResult.proposals.filter((item) => item.status === "pending" && item.targetStatus === "pending"));
    } catch {
      setItems([]);
      setProposals([]);
    }
  }, [userId]);

  React.useEffect(() => { void load(); }, [load]);

  // A proposal can be approved by the organization owner on another device.
  // Refresh quietly so the friend sees the updated state without reopening the page.
  React.useEffect(() => {
    if (!userId) return;
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") void load();
    }, 8000);
    const onFocus = () => { if (document.visibilityState === "visible") void load(); };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, [userId, load]);

  if (!items.length && !proposals.length && !error) return null;

  const act = async (invitation: OrganizationInvitation, accept: boolean) => {
    setBusy(invitation.id);
    setError("");
    try {
      await respondOrganizationInvitation(userId, invitation.id, accept);
      await load();
      if (accept && typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("mss:organization-members-changed", { detail: { organizationId: invitation.organizationId } }));
      }
      await onChanged?.();
    } catch (e: any) {
      setError(String(e?.message || L("Réponse impossible.", "Unable to respond.", "No se puede responder.")));
    } finally { setBusy(""); }
  };

  const actProposal = async (proposal: OrganizationMemberProposal, accept: boolean) => {
    setBusy(`proposal:${proposal.id}`);
    setError("");
    try {
      await respondOrganizationMemberProposal(userId, proposal.id, accept);
      await load();
      if (accept && typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("mss:organization-members-changed", { detail: { organizationId: proposal.organizationId } }));
      }
      await onChanged?.();
    } catch (e: any) {
      setError(String(e?.message || L("Réponse impossible.", "Unable to respond.", "No se puede responder.")));
    } finally { setBusy(""); }
  };

  return <div style={{ borderRadius: 18, border: `1px solid ${theme.primary}55`, background: `linear-gradient(145deg, ${theme.primary}12, rgba(0,0,0,.2)), ${theme.cardBackground || theme.card}`, padding: 13, boxShadow: `0 0 20px ${theme.primary}12` }}>
    <div style={{ color: theme.primary, fontSize: 10.5, fontWeight: 1000, letterSpacing: .6 }}>{L("INVITATIONS REÇUES", "RECEIVED INVITATIONS", "INVITACIONES RECIBIDAS")}</div>
    {error ? <div style={{ marginTop: 7, color: "#ffaaaa", fontSize: 9 }}>{error}</div> : null}
    <div style={{ display: "grid", gap: 7, marginTop: 8 }}>{items.map((item) => <div key={item.id} style={{ borderRadius: 12, border: `1px solid ${theme.borderSoft}`, background: "rgba(0,0,0,.18)", padding: 9, display: "grid", gridTemplateColumns: "38px minmax(0,1fr)", gap: 9 }}>
      <span style={{ width: 36, height: 36, borderRadius: 999, border: `1px solid ${theme.primary}55`, display: "grid", placeItems: "center", background: "rgba(5,10,18,.9)" }}><OrganizationTypeIcon kind={item.organizationKind || "other"} size={15} color={theme.primary} /></span>
      <div style={{ minWidth: 0 }}>
        <strong style={{ display: "block", color: theme.text, fontSize: 10.8, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>{item.organizationName || L("Organisation MSS", "MSS organization", "Organización MSS")}</strong>
        <div style={{ marginTop: 2, color: theme.textSoft, fontSize: 8.5 }}>{organizationKindLabel(item.organizationKind || "other")} · {organizationRoleLabel(item.role)}</div>
        <div style={{ marginTop: 7, display: "grid", gridTemplateColumns: "1fr 1.2fr", gap: 6 }}><button type="button" disabled={!!busy} onClick={() => void act(item, false)} style={{ minHeight: 32, borderRadius: 10, border: `1px solid ${theme.borderSoft}`, background: "rgba(255,255,255,.025)", color: theme.textSoft, fontSize: 8.5, fontWeight: 900 }}>{L("REFUSER", "DECLINE", "RECHAZAR")}</button><button type="button" disabled={!!busy} onClick={() => void act(item, true)} style={{ minHeight: 32, borderRadius: 10, border: `1px solid ${theme.primary}66`, background: `${theme.primary}12`, color: theme.primary, fontSize: 8.5, fontWeight: 1000 }}>{busy === item.id ? "…" : L("ACCEPTER", "ACCEPT", "ACEPTAR")}</button></div>
      </div>
    </div>)}</div>
    {proposals.length ? <><div style={{ marginTop: 12, color: theme.primary, fontSize: 10.5, fontWeight: 1000, letterSpacing: .6 }}>{L("PROPOSITIONS D’ADHÉSION", "MEMBERSHIP PROPOSALS", "PROPUESTAS DE ADHESIÓN")}</div><div style={{ display: "grid", gap: 7, marginTop: 8 }}>{proposals.map((proposal) => <div key={proposal.id} style={{ borderRadius: 12, border: `1px solid ${theme.borderSoft}`, background: "rgba(0,0,0,.18)", padding: 9, display: "grid", gridTemplateColumns: "38px minmax(0,1fr)", gap: 9 }}>
      <span style={{ width: 36, height: 36, borderRadius: 999, border: `1px solid ${theme.primary}55`, display: "grid", placeItems: "center", background: "rgba(5,10,18,.9)" }}><OrganizationTypeIcon kind={proposal.organizationKind || "other"} size={15} color={theme.primary} /></span>
      <div style={{ minWidth: 0 }}>
        <strong style={{ display: "block", color: theme.text, fontSize: 10.8, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>{proposal.organizationName || L("Organisation MSS", "MSS organization", "Organización MSS")}</strong>
        <div style={{ marginTop: 2, color: theme.textSoft, fontSize: 8.5 }}>{L("Proposé par", "Proposed by", "Propuesto por")} {proposal.proposerDisplayName} · {organizationRoleLabel(proposal.role)}</div>
        <div style={{ marginTop: 6, display: "flex", gap: 5, alignItems: "center", flexWrap: "wrap" }}>
          <span style={{ borderRadius: 999, padding: "4px 7px", border: `1px solid ${proposal.adminStatus === "approved" ? theme.primary : theme.borderSoft}`, background: proposal.adminStatus === "approved" ? `${theme.primary}10` : "rgba(255,255,255,.025)", color: proposal.adminStatus === "approved" ? theme.primary : theme.textSoft, fontSize: 7.4, fontWeight: 1000 }}>{proposal.adminStatus === "approved" ? "✓" : "○"} {L("CRÉATEUR", "OWNER", "CREADOR")}</span>
          <span style={{ color: theme.textSoft, fontSize: 8 }}>→</span>
          <span style={{ borderRadius: 999, padding: "4px 7px", border: `1px solid ${theme.primary}55`, background: `${theme.primary}0b`, color: theme.primary, fontSize: 7.4, fontWeight: 1000 }}>○ {L("TON ACCORD", "YOUR CONSENT", "TU ACUERDO")}</span>
          <span style={{ color: theme.textSoft, fontSize: 8 }}>→</span>
          <span style={{ borderRadius: 999, padding: "4px 7px", border: `1px solid ${theme.borderSoft}`, color: theme.textSoft, fontSize: 7.4, fontWeight: 1000 }}>○ {L("AJOUT AUTO", "AUTO ADD", "ALTA AUTO")}</span>
        </div>
        <div style={{ marginTop: 4, color: proposal.adminStatus === "approved" ? theme.primary : theme.textSoft, fontSize: 8 }}>{proposal.adminStatus === "approved" ? L("Le créateur a déjà validé. Ton accord finalisera l’adhésion immédiatement.", "The owner has already approved. Your acceptance will finalize membership immediately.", "El creador ya ha aprobado. Tu aceptación finalizará la adhesión inmediatamente.") : L("Tu peux accepter maintenant : l’adhésion sera finalisée automatiquement dès que le créateur validera aussi.", "You can accept now: membership will finalize automatically as soon as the owner also approves.", "Puedes aceptar ahora: el alta se finalizará automáticamente cuando el creador también apruebe.")}</div>
        <div style={{ marginTop: 7, display: "grid", gridTemplateColumns: "1fr 1.2fr", gap: 6 }}><button type="button" disabled={!!busy} onClick={() => void actProposal(proposal, false)} style={{ minHeight: 32, borderRadius: 10, border: `1px solid ${theme.borderSoft}`, background: "rgba(255,255,255,.025)", color: theme.textSoft, fontSize: 8.5, fontWeight: 900 }}>{L("REFUSER", "DECLINE", "RECHAZAR")}</button><button type="button" disabled={!!busy} onClick={() => void actProposal(proposal, true)} style={{ minHeight: 32, borderRadius: 10, border: `1px solid ${theme.primary}66`, background: `${theme.primary}12`, color: theme.primary, fontSize: 8.5, fontWeight: 1000 }}>{busy === `proposal:${proposal.id}` ? "…" : L("ACCEPTER", "ACCEPT", "ACEPTAR")}</button></div>
      </div>
    </div>)}</div></> : null}
  </div>;
}
