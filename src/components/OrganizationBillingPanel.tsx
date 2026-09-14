import React from "react";
import { useTheme } from "../contexts/ThemeContext";
import { useLang } from "../contexts/LangContext";
import { pickLegacyLocalizedText } from "../i18n/legacyLocalizedText";
import {
  createOrganizationFeeCampaign,
  deleteOrganizationFeeCampaign,
  listOrganizationFeeCampaigns,
  listOrganizationFeeMembers,
  listOrganizationGroups,
  setOrganizationFeeCampaignStatus,
  setOrganizationFeeMemberStatus,
  updateOrganizationFeeCampaign,
  type OrganizationFeeCampaign,
  type OrganizationFeeCampaignInput,
  type OrganizationFeeCampaignStatus,
  type OrganizationFeeKind,
  type OrganizationFeeMember,
  type OrganizationLocalGroup,
  type OrganizationRecord,
} from "../organizations/organizationService";

function money(cents: number, currency: string) {
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency: currency || "EUR" }).format((cents || 0) / 100);
  } catch {
    return `${((cents || 0) / 100).toFixed(2)} ${currency || "EUR"}`;
  }
}

function fmtDate(value: string) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(d);
}

const KINDS: OrganizationFeeKind[] = ["membership", "license", "event", "other"];

export default function OrganizationBillingPanel({ organization, userId }: { organization: OrganizationRecord; userId: string | null }) {
  const { theme } = useTheme();
  const { lang } = useLang();
  const L = React.useCallback((fr: string, en: string, es: string) => pickLegacyLocalizedText(lang, fr, en, es), [lang]);
  const canManage = ["owner", "admin"].includes(organization.role);
  const canAudit = ["owner", "admin", "manager"].includes(organization.role);

  const [campaigns, setCampaigns] = React.useState<OrganizationFeeCampaign[]>([]);
  const [groups, setGroups] = React.useState<OrganizationLocalGroup[]>([]);
  const [expandedId, setExpandedId] = React.useState("");
  const [members, setMembers] = React.useState<OrganizationFeeMember[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [action, setAction] = React.useState("");
  const [error, setError] = React.useState("");
  const [notice, setNotice] = React.useState("");
  const [editingId, setEditingId] = React.useState("");
  const [title, setTitle] = React.useState("");
  const [feeKind, setFeeKind] = React.useState<OrganizationFeeKind>("membership");
  const [amount, setAmount] = React.useState("");
  const [currency, setCurrency] = React.useState("EUR");
  const [dueAt, setDueAt] = React.useState("");
  const [groupId, setGroupId] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [paymentUrl, setPaymentUrl] = React.useState("");

  const card: React.CSSProperties = {
    borderRadius: 18,
    border: `1px solid ${theme.borderSoft}`,
    background: theme.cardBackground || theme.card,
    boxShadow: `0 16px 34px rgba(0,0,0,.34), 0 0 16px ${theme.primary}0d`,
  };
  const input: React.CSSProperties = {
    width: "100%",
    minHeight: 41,
    borderRadius: 12,
    border: `1px solid ${theme.borderSoft}`,
    background: "rgba(0,0,0,.28)",
    color: theme.text,
    padding: "9px 10px",
    outline: "none",
    boxSizing: "border-box",
    fontSize: 10.2,
  };
  const button: React.CSSProperties = {
    minHeight: 35,
    borderRadius: 11,
    border: `1px solid ${theme.borderSoft}`,
    background: "rgba(255,255,255,.035)",
    color: theme.text,
    fontWeight: 900,
    fontSize: 8.8,
    padding: "7px 10px",
    cursor: "pointer",
  };
  const primaryButton: React.CSSProperties = { ...button, border: `1px solid ${theme.primary}`, color: theme.primary, background: `${theme.primary}13` };

  const kindLabel = (kind: OrganizationFeeKind) => ({
    membership: L("Cotisation", "Membership fee", "Cuota"),
    license: L("Licence", "License", "Licencia"),
    event: L("Inscription / événement", "Registration / event", "Inscripción / evento"),
    other: L("Autre", "Other", "Otro"),
  }[kind]);

  const statusLabel = (status: OrganizationFeeCampaignStatus) => ({
    draft: L("BROUILLON", "DRAFT", "BORRADOR"),
    open: L("OUVERTE", "OPEN", "ABIERTA"),
    closed: L("CLÔTURÉE", "CLOSED", "CERRADA"),
    archived: L("ARCHIVÉE", "ARCHIVED", "ARCHIVADA"),
  }[status]);

  const refresh = React.useCallback(async () => {
    setLoading(true); setError("");
    try {
      const [fees, groupResult] = await Promise.all([
        listOrganizationFeeCampaigns(userId, organization.id),
        listOrganizationGroups(userId, organization.id),
      ]);
      setCampaigns(fees.campaigns);
      setGroups(groupResult.groups.filter((g) => g.status !== "archived"));
    } catch (e: any) {
      setError(String(e?.message || L("Impossible de charger les cotisations.", "Unable to load fees.", "No se pueden cargar las cuotas.")));
    } finally {
      setLoading(false);
    }
  }, [L, organization.id, userId]);

  React.useEffect(() => { void refresh(); }, [refresh]);

  const resetForm = () => {
    setEditingId(""); setTitle(""); setFeeKind("membership"); setAmount(""); setCurrency("EUR");
    setDueAt(""); setGroupId(""); setDescription(""); setPaymentUrl("");
  };

  const editCampaign = (campaign: OrganizationFeeCampaign) => {
    setEditingId(campaign.id);
    setTitle(campaign.title);
    setFeeKind(campaign.feeKind);
    setAmount(((campaign.amountCents || 0) / 100).toFixed(2).replace(".", ","));
    setCurrency(campaign.currency);
    setDueAt(campaign.dueAt ? campaign.dueAt.slice(0, 10) : "");
    setGroupId(campaign.groupId);
    setDescription(campaign.description);
    setPaymentUrl(campaign.paymentUrl);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const save = async () => {
    if (!canManage) return;
    const numeric = Number(String(amount || "").replace(",", "."));
    if (title.trim().length < 2) { setError(L("Indique un titre.", "Enter a title.", "Indica un título.")); return; }
    if (!Number.isFinite(numeric) || numeric < 0) { setError(L("Montant invalide.", "Invalid amount.", "Importe inválido.")); return; }
    if (paymentUrl.trim() && !/^https:\/\//i.test(paymentUrl.trim())) { setError(L("Le lien de paiement doit commencer par https://", "Payment link must start with https://", "El enlace de pago debe empezar por https://")); return; }
    const payload: OrganizationFeeCampaignInput = {
      groupId: groupId || null,
      title,
      feeKind,
      amountCents: Math.round(numeric * 100),
      currency,
      dueAt: dueAt ? new Date(`${dueAt}T23:59:59`).toISOString() : null,
      description,
      paymentUrl,
    };
    setAction("save"); setError(""); setNotice("");
    try {
      if (editingId) await updateOrganizationFeeCampaign(userId, editingId, payload);
      else await createOrganizationFeeCampaign(userId, organization.id, payload);
      setNotice(editingId ? L("Cotisation mise à jour.", "Fee updated.", "Cuota actualizada.") : L("Cotisation créée.", "Fee created.", "Cuota creada."));
      resetForm();
      await refresh();
    } catch (e: any) {
      setError(String(e?.message || L("Enregistrement impossible.", "Save failed.", "No se pudo guardar.")));
    } finally { setAction(""); }
  };

  const loadMembers = async (campaign: OrganizationFeeCampaign) => {
    if (!canAudit) return;
    if (expandedId === campaign.id) { setExpandedId(""); setMembers([]); return; }
    setExpandedId(campaign.id); setMembers([]); setAction(`members:${campaign.id}`); setError("");
    try { setMembers(await listOrganizationFeeMembers(userId, campaign.id)); }
    catch (e: any) { setError(String(e?.message || L("Règlements indisponibles.", "Payment records unavailable.", "Pagos no disponibles."))); }
    finally { setAction(""); }
  };

  const setMemberStatus = async (campaignId: string, member: OrganizationFeeMember, status: "pending" | "paid" | "waived") => {
    if (!canManage) return;
    setAction(`member:${member.userId}`); setError("");
    try {
      await setOrganizationFeeMemberStatus(userId, campaignId, member.userId, status);
      setMembers(await listOrganizationFeeMembers(userId, campaignId));
      await refresh();
    } catch (e: any) { setError(String(e?.message || L("Mise à jour impossible.", "Update failed.", "No se pudo actualizar."))); }
    finally { setAction(""); }
  };

  const changeStatus = async (campaign: OrganizationFeeCampaign, status: OrganizationFeeCampaignStatus) => {
    if (!canManage) return;
    setAction(`status:${campaign.id}`); setError("");
    try { await setOrganizationFeeCampaignStatus(userId, campaign.id, status); await refresh(); }
    catch (e: any) { setError(String(e?.message || L("Modification impossible.", "Update failed.", "No se pudo actualizar."))); }
    finally { setAction(""); }
  };

  const remove = async (campaign: OrganizationFeeCampaign) => {
    if (!canManage || !window.confirm(L("Supprimer cette cotisation ? Les marqueurs de règlement associés seront supprimés, mais aucun paiement externe n’est annulé.", "Delete this fee? Associated payment markers will be removed, but no external payment is cancelled.", "¿Eliminar esta cuota? Se eliminarán los marcadores de pago, pero no se cancelará ningún pago externo."))) return;
    setAction(`delete:${campaign.id}`); setError("");
    try { await deleteOrganizationFeeCampaign(userId, campaign.id); if (expandedId === campaign.id) { setExpandedId(""); setMembers([]); } await refresh(); }
    catch (e: any) { setError(String(e?.message || L("Suppression impossible.", "Deletion failed.", "No se pudo eliminar."))); }
    finally { setAction(""); }
  };

  const openCampaigns = campaigns.filter((c) => c.status === "open");
  const summaryCurrencies = Array.from(new Set(openCampaigns.map((c) => c.currency || "EUR")));
  const summaryCurrency = summaryCurrencies[0] || "EUR";
  const mixedCurrencies = summaryCurrencies.length > 1;
  const expectedCents = openCampaigns.reduce((sum, c) => sum + c.amountCents * c.targetCount, 0);
  const paidCents = openCampaigns.reduce((sum, c) => sum + c.amountCents * c.paidCount, 0);
  const waivedCents = openCampaigns.reduce((sum, c) => sum + c.amountCents * c.waivedCount, 0);
  const remainingCents = Math.max(0, expectedCents - paidCents - waivedCents);

  return <div style={{ display: "grid", gap: 10 }}>
    <div style={{ ...card, padding: 14, background: `linear-gradient(135deg, ${theme.primary}12, rgba(0,0,0,.18))` }}>
      <div style={{ color: theme.primary, fontSize: 8.4, fontWeight: 1000, letterSpacing: 1.1 }}>{L("GESTION FINANCIÈRE LÉGÈRE", "LIGHTWEIGHT FINANCIAL TRACKING", "GESTIÓN FINANCIERA LIGERA")}</div>
      <div style={{ marginTop: 4, color: theme.text, fontSize: 17, fontWeight: 1000 }}>{L("Cotisations & paiements", "Fees & payments", "Cuotas y pagos")}</div>
      <div style={{ marginTop: 5, color: theme.textSoft, fontSize: 9.3, lineHeight: 1.45 }}>
        {L("MSS suit uniquement les montants dus et l’état du règlement. Aucune carte bancaire, IBAN ni donnée de paiement sensible n’est stocké dans Supabase.", "MSS only tracks amounts due and settlement status. No card, IBAN or sensitive payment data is stored in Supabase.", "MSS solo registra importes debidos y estado de pago. No se almacena ninguna tarjeta, IBAN ni dato sensible de pago en Supabase.")}
      </div>
    </div>

    <div style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 7 }}>
      {[
        [L("OUVERTES", "OPEN", "ABIERTAS"), String(openCampaigns.length)],
        [L("ATTENDU", "EXPECTED", "ESPERADO"), mixedCurrencies ? "—" : money(expectedCents, summaryCurrency)],
        [L("RÉGLÉ", "PAID", "PAGADO"), mixedCurrencies ? "—" : money(paidCents, summaryCurrency)],
        [L("RESTANT", "REMAINING", "RESTANTE"), mixedCurrencies ? "—" : money(remainingCents, summaryCurrency)],
      ].map(([label, value]) => <div key={label} style={{ ...card, padding: "10px 8px", textAlign: "center" }}>
        <div style={{ color: theme.primary, fontSize: 11.5, fontWeight: 1000 }}>{value}</div>
        <div style={{ marginTop: 2, color: theme.textSoft, fontSize: 7.3, fontWeight: 900 }}>{label}</div>
      </div>)}
    </div>

    {canManage ? <div style={{ ...card, padding: 12, display: "grid", gap: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}>
        <div style={{ color: theme.text, fontSize: 10.8, fontWeight: 1000 }}>{editingId ? L("MODIFIER LA COTISATION", "EDIT FEE", "EDITAR CUOTA") : L("CRÉER UNE COTISATION", "CREATE A FEE", "CREAR UNA CUOTA")}</div>
        {editingId ? <button type="button" onClick={resetForm} style={button}>{L("ANNULER", "CANCEL", "CANCELAR")}</button> : null}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1.45fr .75fr", gap: 8 }}>
        <input style={input} value={title} onChange={(e) => setTitle(e.target.value)} placeholder={L("Ex. Cotisation saison 2026/2027", "E.g. 2026/2027 membership fee", "Ej. Cuota temporada 2026/2027")} />
        <select style={input} value={feeKind} onChange={(e) => setFeeKind(e.target.value as OrganizationFeeKind)}>{KINDS.map((kind) => <option key={kind} value={kind}>{kindLabel(kind)}</option>)}</select>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: ".8fr .55fr 1fr", gap: 8 }}>
        <input style={input} inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="45,00" />
        <input style={input} value={currency} onChange={(e) => setCurrency(e.target.value.toUpperCase().slice(0,3))} placeholder="EUR" />
        <input style={input} type="date" value={dueAt} onChange={(e) => setDueAt(e.target.value)} />
      </div>
      <select style={input} value={groupId} onChange={(e) => setGroupId(e.target.value)}>
        <option value="">{L("Toute l’organisation", "Whole organization", "Toda la organización")}</option>
        {groups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}
      </select>
      <textarea style={{ ...input, minHeight: 68, resize: "vertical" }} value={description} onChange={(e) => setDescription(e.target.value)} placeholder={L("Description / instructions (optionnel)", "Description / instructions (optional)", "Descripción / instrucciones (opcional)")} />
      <input style={input} value={paymentUrl} onChange={(e) => setPaymentUrl(e.target.value)} placeholder={L("Lien de paiement sécurisé externe (Stripe, banque…) — optionnel", "External secure payment link (Stripe, bank…) — optional", "Enlace externo de pago seguro (Stripe, banco…) — opcional")} />
      <button type="button" disabled={action === "save"} onClick={() => void save()} style={{ ...primaryButton, opacity: action === "save" ? .55 : 1 }}>{editingId ? L("ENREGISTRER", "SAVE", "GUARDAR") : L("CRÉER", "CREATE", "CREAR")}</button>
    </div> : null}

    {notice ? <div style={{ ...card, padding: 10, color: theme.primary, fontSize: 9.2 }}>{notice}</div> : null}
    {error ? <div style={{ ...card, padding: 10, borderColor: "rgba(255,90,90,.45)", color: "#ffaaaa", fontSize: 9.2 }}>{error}</div> : null}

    {loading ? <div style={{ ...card, padding: 16, color: theme.textSoft }}>{L("Chargement…", "Loading…", "Cargando…")}</div> :
      campaigns.length ? campaigns.map((campaign) => {
        const settled = campaign.paidCount + campaign.waivedCount;
        const percent = campaign.targetCount ? Math.min(100, Math.round((settled / campaign.targetCount) * 100)) : 0;
        const mineDue = campaign.isTargeted && (campaign.myStatus === "pending" || campaign.myStatus === "overdue");
        return <div key={campaign.id} style={{ ...card, padding: 12, display: "grid", gap: 9 }}>
          <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) auto", gap: 10 }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                <strong style={{ color: theme.text, fontSize: 11.6 }}>{campaign.title}</strong>
                <span style={{ borderRadius: 999, border: `1px solid ${theme.primary}55`, color: theme.primary, padding: "2px 6px", fontSize: 7.3, fontWeight: 1000 }}>{kindLabel(campaign.feeKind)}</span>
              </div>
              <div style={{ marginTop: 4, color: theme.textSoft, fontSize: 8.5 }}>{campaign.groupName || L("Toute l’organisation", "Whole organization", "Toda la organización")} · {campaign.dueAt ? `${L("Échéance", "Due", "Vence")} ${fmtDate(campaign.dueAt)}` : L("Sans échéance", "No due date", "Sin vencimiento")}</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ color: theme.primary, fontSize: 13, fontWeight: 1000 }}>{money(campaign.amountCents, campaign.currency)}</div>
              <div style={{ marginTop: 2, color: campaign.status === "open" ? theme.primary : theme.textSoft, fontSize: 7.4, fontWeight: 1000 }}>{statusLabel(campaign.status)}</div>
            </div>
          </div>
          {campaign.description ? <div style={{ color: theme.textSoft, fontSize: 9, lineHeight: 1.42 }}>{campaign.description}</div> : null}
          <div style={{ height: 7, borderRadius: 999, overflow: "hidden", background: "rgba(255,255,255,.08)" }}><div style={{ width: `${percent}%`, height: "100%", background: theme.primary, transition: "width .2s ease" }} /></div>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap", color: theme.textSoft, fontSize: 8.2 }}>
            <span>{campaign.paidCount} {L("payé(s)", "paid", "pagados")} · {campaign.waivedCount} {L("exonéré(s)", "waived", "exentos")} · {campaign.targetCount} {L("cible(s)", "targeted", "destinatarios")}</span>
            {campaign.isTargeted ? <span style={{ color: campaign.myStatus === "paid" ? "#7ee787" : campaign.myStatus === "waived" ? "#d2b4ff" : campaign.myStatus === "overdue" ? "#ff9b9b" : theme.textSoft, fontWeight: 900 }}>
              {L("Moi", "Me", "Yo")}: {campaign.myStatus === "paid" ? L("PAYÉ", "PAID", "PAGADO") : campaign.myStatus === "waived" ? L("EXONÉRÉ", "WAIVED", "EXENTO") : campaign.myStatus === "overdue" ? L("EN RETARD", "OVERDUE", "ATRASADO") : L("À RÉGLER", "DUE", "PENDIENTE")}
            </span> : <span style={{ color: theme.textSoft, fontWeight: 850 }}>{L("Non concerné personnellement", "Not personally targeted", "No afectado personalmente")}</span>}
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {campaign.paymentUrl && mineDue && campaign.status === "open" ? <button type="button" onClick={() => window.open(campaign.paymentUrl, "_blank", "noopener,noreferrer")} style={primaryButton}>{L("PAYER / OUVRIR LE LIEN", "PAY / OPEN LINK", "PAGAR / ABRIR ENLACE")}</button> : null}
            {canAudit ? <button type="button" onClick={() => void loadMembers(campaign)} style={button}>{expandedId === campaign.id ? L("MASQUER LES RÈGLEMENTS", "HIDE PAYMENTS", "OCULTAR PAGOS") : L("SUIVRE LES RÈGLEMENTS", "TRACK PAYMENTS", "SEGUIR PAGOS")}</button> : null}
            {canManage ? <button type="button" onClick={() => editCampaign(campaign)} style={button}>{L("MODIFIER", "EDIT", "EDITAR")}</button> : null}
            {canManage && campaign.status === "draft" ? <button type="button" onClick={() => void changeStatus(campaign, "open")} style={primaryButton}>{L("OUVRIR", "OPEN", "ABRIR")}</button> : null}
            {canManage && campaign.status === "open" ? <button type="button" onClick={() => void changeStatus(campaign, "closed")} style={button}>{L("CLÔTURER", "CLOSE", "CERRAR")}</button> : null}
            {canManage && campaign.status === "closed" ? <button type="button" onClick={() => void changeStatus(campaign, "archived")} style={button}>{L("ARCHIVER", "ARCHIVE", "ARCHIVAR")}</button> : null}
            {canManage ? <button type="button" onClick={() => void remove(campaign)} style={{ ...button, color: "#ff9a9a" }}>{L("SUPPRIMER", "DELETE", "ELIMINAR")}</button> : null}
          </div>
          {expandedId === campaign.id ? <div style={{ display: "grid", gap: 6, borderTop: `1px solid ${theme.borderSoft}`, paddingTop: 9 }}>
            {action === `members:${campaign.id}` ? <div style={{ color: theme.textSoft, fontSize: 8.5 }}>{L("Chargement…", "Loading…", "Cargando…")}</div> :
              members.length ? members.map((member) => <div key={member.userId} style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) auto", gap: 8, alignItems: "center", padding: 8, borderRadius: 11, background: "rgba(0,0,0,.18)", border: `1px solid ${theme.borderSoft}` }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ color: theme.text, fontSize: 9.6, fontWeight: 900, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{member.displayName}</div>
                  <div style={{ marginTop: 2, color: member.status === "paid" ? "#7ee787" : member.status === "waived" ? "#d2b4ff" : member.status === "overdue" ? "#ff9b9b" : theme.textSoft, fontSize: 7.8, fontWeight: 900 }}>
                    {member.status === "paid" ? `${L("Payé", "Paid", "Pagado")} ${member.paidAt ? fmtDate(member.paidAt) : ""}` : member.status === "waived" ? L("Exonéré", "Waived", "Exento") : member.status === "overdue" ? L("En retard", "Overdue", "Atrasado") : L("À régler", "Due", "Pendiente")}
                  </div>
                </div>
                {canManage ? <div style={{ display: "flex", gap: 5, flexWrap: "wrap", justifyContent: "flex-end" }}>
                  <button type="button" disabled={action === `member:${member.userId}`} onClick={() => void setMemberStatus(campaign.id, member, "paid")} style={{ ...button, minHeight: 30, padding: "5px 7px", color: "#7ee787" }}>✓ {L("PAYÉ", "PAID", "PAGADO")}</button>
                  <button type="button" disabled={action === `member:${member.userId}`} onClick={() => void setMemberStatus(campaign.id, member, "waived")} style={{ ...button, minHeight: 30, padding: "5px 7px", color: "#d2b4ff" }}>{L("EXONÉRER", "WAIVE", "EXONERAR")}</button>
                  <button type="button" disabled={action === `member:${member.userId}`} onClick={() => void setMemberStatus(campaign.id, member, "pending")} style={{ ...button, minHeight: 30, padding: "5px 7px" }}>{L("À RÉGLER", "DUE", "PENDIENTE")}</button>
                </div> : null}
              </div>) : <div style={{ color: theme.textSoft, fontSize: 8.5 }}>{L("Aucun membre concerné.", "No targeted member.", "Ningún miembro afectado.")}</div>}
          </div> : null}
        </div>;
      }) : <div style={{ ...card, padding: 17, color: theme.textSoft, fontSize: 9.5 }}>{L("Aucune cotisation créée pour le moment.", "No fee has been created yet.", "Aún no se ha creado ninguna cuota.")}</div>}
  </div>;
}
