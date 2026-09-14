import React from "react";
import { useTheme } from "../contexts/ThemeContext";
import { useLang } from "../contexts/LangContext";
import { pickLegacyLocalizedText } from "../i18n/legacyLocalizedText";
import OrganizationTypeIcon from "./OrganizationTypeIcon";
import {
  listMyOrganizationInvitations,
  organizationKindLabel,
  organizationRoleLabel,
  respondOrganizationInvitation,
  type OrganizationInvitation,
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
  const [busy, setBusy] = React.useState("");
  const [error, setError] = React.useState("");

  const load = React.useCallback(async () => {
    if (!userId) { setItems([]); return; }
    try {
      const result = await listMyOrganizationInvitations(userId);
      setItems(result.invitations.filter((item) => item.status === "pending"));
    } catch {
      setItems([]);
    }
  }, [userId]);

  React.useEffect(() => { void load(); }, [load]);
  if (!items.length && !error) return null;

  const act = async (invitation: OrganizationInvitation, accept: boolean) => {
    setBusy(invitation.id);
    setError("");
    try {
      await respondOrganizationInvitation(userId, invitation.id, accept);
      await load();
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
  </div>;
}
