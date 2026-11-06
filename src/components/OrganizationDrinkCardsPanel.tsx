import React from "react";
import { useTheme } from "../contexts/ThemeContext";
import { useLang } from "../contexts/LangContext";
import { pickLegacyLocalizedText } from "../i18n/legacyLocalizedText";
import type { OrganizationRecord, OrganizationMember } from "../organizations/organizationService";
import { listOrganizationMembers } from "../organizations/organizationService";
import {
  type DrinkCardIcon, type DrinkCardTemplate, type DrinkCardTemplateInput,
  type AssignedDrinkCard, type DrinkCardEvent,
  listDrinkCardTemplates, listAssignedDrinkCards, listDrinkCardEvents,
  saveDrinkCardTemplate, issueDrinkCard, consumeDrinkCard, undoDrinkCardConsumption, cancelDrinkCard,
} from "../organizations/organizationDrinkCards";

const icons: Record<DrinkCardIcon, string> = { cup: "🥤", coffee: "☕", beer: "🍺", soda: "🧃", water: "💧", wine: "🍷", cocktail: "🍹" };
const defaultForm = (): DrinkCardTemplateInput => ({ name: "Carte 10 + 1 offerte", description: "", paidDrinks: 10,
  bonusDrinks: 1, price: 20, currency: "EUR", icon: "cup", color: "#D7A34D", validDays: null, status: "active" });
const formatMoney = (amount: number, currency: string, lang: string) => {
  try { return new Intl.NumberFormat(lang === "fr" ? "fr-FR" : "en-GB", { style: "currency", currency }).format(amount); }
  catch { return `${amount.toFixed(2)} ${currency}`; }
};
const formatDate = (date: string, lang: string) => {
  try { return new Intl.DateTimeFormat(lang === "fr" ? "fr-FR" : "en-GB", { dateStyle: "short", timeStyle: "short" }).format(new Date(date)); }
  catch { return date; }
};

export default function OrganizationDrinkCardsPanel({ organization, userId, logoUrl }: {
  organization: OrganizationRecord; userId: string | null; logoUrl?: string;
}) {
  const { theme } = useTheme();
  const { lang } = useLang();
  const L = React.useCallback((fr: string, en: string, es: string) => pickLegacyLocalizedText(lang, fr, en, es), [lang]);
  const canManage = ["owner", "admin", "manager"].includes(organization.role);
  const canCorrect = ["owner", "admin"].includes(organization.role);
  const [templates, setTemplates] = React.useState<DrinkCardTemplate[]>([]);
  const [cards, setCards] = React.useState<AssignedDrinkCard[]>([]);
  const [members, setMembers] = React.useState<OrganizationMember[]>([]);
  const [membersAvailable, setMembersAvailable] = React.useState(true);
  const [loading, setLoading] = React.useState(true);
  const [pending, setPending] = React.useState(false);
  const [message, setMessage] = React.useState("");
  const [error, setError] = React.useState("");
  const [editing, setEditing] = React.useState<string | null>(null);
  const [formOpen, setFormOpen] = React.useState(false);
  const [form, setForm] = React.useState<DrinkCardTemplateInput>(defaultForm);
  const [issueTemplate, setIssueTemplate] = React.useState("");
  const [issueHolder, setIssueHolder] = React.useState("");
  const [historyCard, setHistoryCard] = React.useState("");
  const [history, setHistory] = React.useState<DrinkCardEvent[]>([]);
  const [historyLoading, setHistoryLoading] = React.useState(false);
  const [showAll, setShowAll] = React.useState(false);
  const cardStyle: React.CSSProperties = { border: `1px solid ${theme.borderSoft}`, background: theme.cardBackground || theme.card,
    borderRadius: 17, padding: 13, minWidth: 0 };
  const control: React.CSSProperties = { width: "100%", boxSizing: "border-box", borderRadius: 10, padding: "10px",
    background: "rgba(0,0,0,.27)", border: `1px solid ${theme.borderSoft}`, color: theme.text, fontSize: 12, minHeight: 40 };
  const button: React.CSSProperties = { borderRadius: 10, padding: "9px 12px", minHeight: 38,
    border: `1px solid ${theme.borderSoft}`, color: theme.text, background: "rgba(255,255,255,.055)", cursor: "pointer", fontSize: 11.5, fontWeight: 800 };
  const primary: React.CSSProperties = { ...button, borderColor: `${theme.primary}8f`, color: theme.primary, background: `${theme.primary}15` };
  const label: React.CSSProperties = { display: "grid", gap: 5, fontSize: 11, color: theme.textSoft, minWidth: 0 };

  const reload = React.useCallback(async (withSpinner = false) => {
    if (withSpinner) setLoading(true);
    try {
      const [nextTemplates, nextCards] = await Promise.all([
        listDrinkCardTemplates(userId, organization.id), listAssignedDrinkCards(userId, organization.id),
      ]);
      setTemplates(nextTemplates); setCards(nextCards); setError("");
    } catch (e: any) { setError(String(e?.message || "Chargement des cartes impossible.")); }
    finally { setLoading(false); }
  }, [organization.id, userId]);
  React.useEffect(() => { void reload(true); }, [reload]);
  React.useEffect(() => {
    let mounted = true;
    if (!canManage) { setMembers([]); return; }
    void listOrganizationMembers(userId, organization.id).then((result) => {
      if (!mounted) return;
      setMembers(result.members.filter((m) => m.entityType === "user" && m.status === "active" && !!m.userId));
      setMembersAvailable(result.cloudAvailable);
    }).catch(() => { if (mounted) { setMembersAvailable(false); setMembers([]); } });
    return () => { mounted = false; };
  }, [canManage, organization.id, userId]);
  React.useEffect(() => {
    const refresh = () => { if (document.visibilityState === "visible" && !pending) void reload(false); };
    window.addEventListener("focus", refresh);
    const timer = window.setInterval(refresh, 30000);
    return () => { window.removeEventListener("focus", refresh); window.clearInterval(timer); };
  }, [reload, pending]);

  const activeTemplates = templates.filter((t) => t.status === "active");
  const displayedCards = cards.filter((c) => showAll || c.status === "active");
  const names = new Map(members.map((m) => [m.userId, m.displayName]));
  const templateStart = () => { setForm(defaultForm()); setEditing(null); setFormOpen(true); setError(""); setMessage(""); };
  const templateEdit = (t: DrinkCardTemplate) => {
    setForm({ name: t.name, description: t.description, paidDrinks: t.paidDrinks, bonusDrinks: t.bonusDrinks,
      price: t.price, currency: t.currency, icon: t.icon, color: t.color, validDays: t.validDays, status: t.status });
    setEditing(t.id); setFormOpen(true); setError(""); setMessage("");
  };
  const apply = async (operation: () => Promise<unknown>, ok: string, reloadHistory = false) => {
    if (pending) return;
    setPending(true); setError(""); setMessage("");
    try {
      await operation();
      await reload(false);
      if (reloadHistory && historyCard) {
        setHistory(await listDrinkCardEvents(userId, organization.id, historyCard));
      }
      setMessage(ok);
      return true;
    } catch (e: any) { setError(String(e?.message || "Opération impossible.")); return false; }
    finally { setPending(false); }
  };
  const save = async () => {
    if (pending) return;
    setPending(true); setError(""); setMessage("");
    try {
      await saveDrinkCardTemplate(userId, organization.id, form, editing || undefined);
      setFormOpen(false); setEditing(null); await reload(false);
      setMessage(L("Modèle de carte enregistré.", "Card design saved.", "Modelo de tarjeta guardado."));
    } catch (e: any) { setError(String(e?.message || "Enregistrement impossible.")); }
    finally { setPending(false); }
  };
  const openHistory = async (id: string) => {
    if (historyCard === id) { setHistoryCard(""); return; }
    setHistoryCard(id); setHistory([]); setHistoryLoading(true);
    try { setHistory(await listDrinkCardEvents(userId, organization.id, id)); }
    catch (e: any) { setError(String(e?.message || "Historique indisponible.")); }
    finally { setHistoryLoading(false); }
  };
  const isSpent = (c: AssignedDrinkCard) => c.paidDrinks + c.bonusDrinks - c.remaining;
  const isExpired = (c: AssignedDrinkCard) => !!c.expiresAt && new Date(c.expiresAt).getTime() <= Date.now();
  const canUse = (c: AssignedDrinkCard) => c.status === "active" && !isExpired(c) && c.remaining > 0;
  const logo = logoUrl || organization.profile.logoUrl || "";

  return <section style={{ display: "grid", gap: 12 }}>
    <div style={{ ...cardStyle, background: `linear-gradient(125deg, ${theme.primary}22, transparent), ${theme.cardBackground || theme.card}` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        {logo ? <img alt="" src={logo} style={{ width: 49, height: 49, borderRadius: 12, objectFit: "contain", background: "#fff", padding: 3 }}/> : <span style={{ fontSize: 30 }}>🥤</span>}
        <div style={{ minWidth: 0 }}>
          <strong style={{ display: "block", color: theme.primary, fontSize: 15 }}>{L("CARTES DE CONSOMMATION", "PREPAID DRINK CARDS", "TARJETAS DE CONSUMICIÓN")}</strong>
          <div style={{ color: theme.textSoft, fontSize: 11 }}>{organization.name}</div>
        </div>
      </div>
      <p style={{ margin: "9px 0 0", color: theme.textSoft, fontSize: 12, lineHeight: 1.55 }}>
        {L("Cartes nominatives avec cases à cocher. Les consommations et corrections sont enregistrées et synchronisées entre appareils.",
          "Personal drink cards with digital stamps. Uses and corrections are stored and synced between devices.",
          "Tarjetas personales con casillas digitales. Los consumos y correcciones se guardan y sincronizan.")}
      </p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginTop: 10 }}>
        <button type="button" style={button} disabled={pending} onClick={() => void reload(true)}>↻ {L("Actualiser", "Refresh", "Actualizar")}</button>
        {canManage ? <button type="button" style={primary} disabled={pending} onClick={templateStart}>＋ {L("Créer une carte", "Design a card", "Crear tarjeta")}</button> : null}
      </div>
    </div>
    {error ? <div role="alert" style={{ ...cardStyle, color: "#ffb1b1", borderColor: "#d76c6c", fontSize: 12 }}>{error}</div> : null}
    {message ? <div role="status" style={{ ...cardStyle, color: theme.primary, fontSize: 12 }}>{message}</div> : null}

    {canManage && formOpen ? <div style={{ ...cardStyle, display: "grid", gap: 10 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <strong style={{ color: theme.primary }}>{editing ? L("Modifier le modèle", "Edit design", "Editar modelo") : L("Nouvelle carte", "New card", "Nueva tarjeta")}</strong>
        <button type="button" style={button} onClick={() => setFormOpen(false)} disabled={pending}>✕</button>
      </div>
      <label style={label}>{L("Nom de la carte", "Card name", "Nombre de tarjeta")}
        <input style={control} maxLength={80} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}/>
      </label>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 9 }}>
        <label style={label}>{L("Boissons payantes", "Paid drinks", "Bebidas pagadas")}
          <input style={control} type="number" min={1} max={200} value={form.paidDrinks} onChange={(e) => setForm({ ...form, paidDrinks: Number(e.target.value) })}/>
        </label>
        <label style={label}>{L("Boissons offertes", "Free bonus drinks", "Bebidas gratis")}
          <input style={control} type="number" min={0} max={100} value={form.bonusDrinks} onChange={(e) => setForm({ ...form, bonusDrinks: Number(e.target.value) })}/>
        </label>
        <label style={label}>{L("Prix de la carte", "Card price", "Precio de tarjeta")}
          <input style={control} type="number" min={0} step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}/>
        </label>
        <label style={label}>{L("Devise", "Currency", "Moneda")}
          <select style={control} value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })}>
            {["EUR","USD","GBP","CHF","CAD"].map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </label>
        <label style={label}>{L("Icône", "Icon", "Icono")}
          <select style={control} value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value as DrinkCardIcon })}>
            {(Object.entries(icons) as Array<[DrinkCardIcon,string]>).map(([key, symbol]) => <option key={key} value={key}>{symbol} {key}</option>)}
          </select>
        </label>
        <label style={label}>{L("Couleur", "Color", "Color")}
          <input style={{ ...control, padding: 3, minHeight: 40 }} type="color" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })}/>
        </label>
        <label style={label}>{L("Validité en jours (vide = illimitée)", "Validity in days (blank = unlimited)", "Validez en días (vacío = ilimitada)")}
          <input style={control} type="number" min={1} max={3650} value={form.validDays ?? ""} onChange={(e) => setForm({ ...form, validDays: e.target.value ? Number(e.target.value) : null })}/>
        </label>
        <label style={label}>{L("Disponibilité", "Availability", "Disponibilidad")}
          <select style={control} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as DrinkCardTemplate["status"] })}>
            <option value="active">{L("Active", "Active", "Activa")}</option><option value="archived">{L("Archivée", "Archived", "Archivada")}</option>
          </select>
        </label>
      </div>
      <label style={label}>{L("Description / conditions", "Description / terms", "Descripción / condiciones")}
        <textarea style={{ ...control, minHeight: 65 }} maxLength={300} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}/>
      </label>
      <div style={{ borderRadius: 14, padding: 13, border: `2px solid ${form.color}`, background: `linear-gradient(135deg,${form.color}23,rgba(0,0,0,.17))`, display: "grid", gap: 6 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {logo ? <img src={logo} alt="" style={{ width: 38, height: 38, objectFit: "contain", background: "#fff", borderRadius: 9 }}/> : null}
          <div style={{ fontSize: 12, fontWeight: 850 }}>{organization.name}</div><span style={{ marginLeft: "auto", fontSize: 23 }}>{icons[form.icon]}</span>
        </div>
        <strong>{form.name || "Carte boissons"}</strong>
        <div style={{ fontSize: 11 }}>{form.paidDrinks} + {form.bonusDrinks} {L("offerte(s)", "free", "gratis")} · {formatMoney(form.price || 0, form.currency, lang)}</div>
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
          {Array.from({ length: Math.max(0, Math.min(form.paidDrinks + form.bonusDrinks, 250)) }, (_, i) =>
            <span key={i} style={{ display: "grid", placeItems: "center", width: 21, height: 21, border: `1px solid ${form.color}99`, borderRadius: 5, fontSize: 11 }}>{i >= form.paidDrinks ? "★" : "○"}</span>)}
        </div>
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button type="button" style={primary} disabled={pending} onClick={() => void save()}>{pending ? "…" : L("Enregistrer le modèle", "Save design", "Guardar modelo")}</button>
        <button type="button" style={button} disabled={pending} onClick={() => setFormOpen(false)}>{L("Annuler", "Cancel", "Cancelar")}</button>
      </div>
      <small style={{ color: theme.textSoft }}>{L("Les modifications ne changent pas les cartes déjà attribuées.",
        "Changes do not affect cards already issued.", "Los cambios no afectan a tarjetas ya entregadas.")}</small>
    </div> : null}

    {canManage ? <div style={{ ...cardStyle, display: "grid", gap: 10 }}>
      <strong style={{ color: theme.primary, fontSize: 13 }}>{L("MODÈLES DU CLUB", "CLUB CARD DESIGNS", "MODELOS DEL CLUB")}</strong>
      {loading ? <div>{L("Chargement…", "Loading…", "Cargando…")}</div> : null}
      {templates.length === 0 && !loading ? <p style={{ color: theme.textSoft, fontSize: 12 }}>{L("Crée une première carte 10 + 1, 50 boissons ou toute autre formule.",
        "Create a 10+1 card, a 50-drink card or any custom option.", "Crea una tarjeta 10+1, de 50 bebidas u otra opción.")}</p> : null}
      {templates.map((t) => <div key={t.id} style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8,
        padding: 9, borderRadius: 11, border: `1px solid ${theme.borderSoft}`, opacity: t.status === "archived" ? .65 : 1 }}>
        <span style={{ fontSize: 24 }}>{icons[t.icon]}</span>
        <div style={{ flex: 1, minWidth: 145 }}><strong style={{ fontSize: 12 }}>{t.name}</strong>
          <div style={{ fontSize: 11, color: theme.textSoft }}>{t.paidDrinks} + {t.bonusDrinks} ★ · {formatMoney(t.price, t.currency, lang)} · {t.status === "archived" ? L("Archivée", "Archived", "Archivada") : L("Active", "Active", "Activa")}</div>
        </div>
        <button type="button" style={button} disabled={pending} onClick={() => templateEdit(t)}>{L("Modifier", "Edit", "Editar")}</button>
        {t.status === "active" ? <button type="button" style={primary} disabled={pending} onClick={() => { setIssueTemplate(t.id); setIssueHolder(""); }}>{L("Attribuer", "Issue", "Asignar")}</button> : null}
      </div>)}
      {issueTemplate ? <div style={{ ...cardStyle, display: "grid", gap: 8, background: "rgba(255,255,255,.035)" }}>
        <strong style={{ color: theme.primary }}>{L("Attribuer une carte à un membre", "Issue a card to a member", "Asignar tarjeta a un socio")}</strong>
        <small style={{ color: theme.textSoft, lineHeight: 1.5 }}>{L("Le club confirme ici la remise d'une carte achetée. Aucun paiement n'est encaissé dans l'application.",
          "Confirm a card purchased outside the app. No payment is collected here.",
          "Confirma una tarjeta comprada fuera de la aplicación. No se cobra aquí.")}</small>
        <label style={label}>{L("Membre titulaire", "Cardholder", "Titular")}
          <select style={control} value={issueHolder} onChange={(e) => setIssueHolder(e.target.value)}>
            <option value="">{L("Sélectionner un membre…", "Choose a member…", "Elegir socio…")}</option>
            {members.map((m) => <option key={m.userId} value={m.userId}>{m.displayName}</option>)}
          </select>
        </label>
        {!membersAvailable ? <small style={{ color: "#ffb1b1" }}>{L("Liste des membres indisponible : vérifie la connexion au club.",
          "Member list unavailable: check the club connection.", "Lista de miembros no disponible.")}</small> : null}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button type="button" style={primary} disabled={pending || !issueHolder || !membersAvailable}
            onClick={() => {
              const t = templates.find((x) => x.id === issueTemplate);
              const member = members.find((x) => x.userId === issueHolder);
              if (!t || !member || !window.confirm(L(`Confirmer la remise de « ${t.name} » à ${member.displayName} pour ${formatMoney(t.price, t.currency, lang)} (paiement hors application) ?`,
                `Issue “${t.name}” to ${member.displayName} for ${formatMoney(t.price, t.currency, lang)} (paid outside the app)?`,
                `¿Asignar “${t.name}” a ${member.displayName} por ${formatMoney(t.price, t.currency, lang)} (pago externo)?`))) return;
              void apply(() => issueDrinkCard(userId, organization.id, t.id, member.userId), L("Carte attribuée au membre.", "Card issued.", "Tarjeta asignada.")).then((ok) => { if (ok) { setIssueTemplate(""); setIssueHolder(""); } });
            }}>{L("Confirmer la remise", "Confirm issue", "Confirmar entrega")}</button>
          <button type="button" style={button} disabled={pending} onClick={() => setIssueTemplate("")}>{L("Fermer", "Close", "Cerrar")}</button>
        </div>
      </div> : null}
    </div> : null}

    <div style={{ ...cardStyle, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 9 }}>
      <strong style={{ color: theme.primary, fontSize: 13 }}>{canManage ? L("CARTES ATTRIBUÉES", "ISSUED CARDS", "TARJETAS ASIGNADAS") : L("MES CARTES DE BOISSONS", "MY DRINK CARDS", "MIS TARJETAS")}</strong>
      <label style={{ display: "flex", alignItems: "center", gap: 5, color: theme.textSoft, fontSize: 11 }}>
        <input type="checkbox" checked={showAll} onChange={(e) => setShowAll(e.target.checked)}/>{L("Afficher terminées / annulées", "Show used / cancelled", "Mostrar agotadas / anuladas")}
      </label>
    </div>
    {loading && <div style={cardStyle}>{L("Chargement des cartes…", "Loading cards…", "Cargando tarjetas…")}</div>}
    {!loading && displayedCards.length === 0 ? <div style={{ ...cardStyle, fontSize: 12, color: theme.textSoft }}>
      {L("Aucune carte active pour le moment.", "No active drink cards yet.", "Sin tarjetas activas.")}
    </div> : null}
    <div style={{ display: "grid", gap: 11, gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,310px),1fr))" }}>
      {displayedCards.map((c) => {
        const spent = isSpent(c), expired = isExpired(c), allowed = canUse(c), total = c.paidDrinks+c.bonusDrinks;
        const undone = new Set(historyCard === c.id ? history.filter((e) => e.action === "undo" && e.reversesEventId).map((e) => e.reversesEventId) : []);
        return <article key={c.id} style={{ ...cardStyle, background: `linear-gradient(135deg,${c.color}23,rgba(0,0,0,.06)),${theme.cardBackground || theme.card}`, border: `2px solid ${c.color}aa`, display: "grid", gap: 9 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
            {logo ? <img src={logo} alt="" style={{ width: 42, height: 42, borderRadius: 9, objectFit: "contain", background: "#fff", padding: 3 }}/> : <span style={{ fontSize: 26 }}>🏅</span>}
            <div style={{ minWidth: 0, flex: 1 }}>
              <strong style={{ color: theme.text, display: "block", fontSize: 13, overflowWrap: "anywhere" }}>{c.templateName}</strong>
              <span style={{ color: theme.textSoft, fontSize: 10.5 }}>{canManage ? names.get(c.holderUserId) || c.holderUserId.slice(0, 8) : L("Ma carte", "My card", "Mi tarjeta")}</span>
            </div><span style={{ fontSize: 27 }}>{icons[c.icon]}</span>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "baseline", gap: 6 }}>
            <strong style={{ fontSize: 18, color: c.color }}>{c.remaining} / {total} {L("restantes", "remaining", "restantes")}</strong>
            <span style={{ fontSize: 11, color: theme.textSoft }}>{c.paidDrinks} + {c.bonusDrinks} ★</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(10,minmax(0,1fr))", gap: 4 }}>
            {Array.from({ length: total }, (_, i) => {
              const used = i < spent, gift = i >= c.paidDrinks;
              return <button key={i} type="button" disabled={pending || used || !allowed} title={used ? L("Boisson consommée", "Drink used", "Bebida consumida") : gift ? L("Boisson offerte", "Free drink", "Bebida gratis") : L("Valider une consommation", "Use one drink", "Consumir una bebida")}
                aria-label={`${i+1}/${total} · ${used ? L("consommée", "used", "consumida") : L("disponible", "available", "disponible")}`}
                onClick={() => {
                  if (!window.confirm(L("Décompter une boisson de cette carte ?", "Use one drink from this card?", "¿Consumir una bebida de esta tarjeta?"))) return;
                  void apply(() => consumeDrinkCard(userId, organization.id, c.id), L("Une boisson décomptée.", "One drink used.", "Una bebida consumida."), true);
                }}
                style={{ minWidth: 0, aspectRatio: "1", borderRadius: 6, border: `1px solid ${used ? theme.borderSoft : c.color}`,
                  background: used ? "rgba(0,0,0,.35)" : `${c.color}1c`, opacity: used ? .52 : 1,
                  fontSize: 11, color: used ? theme.textSoft : c.color, cursor: used || !allowed ? "default" : "pointer", padding: 0 }}>
                {used ? "✓" : gift ? "★" : "○"}</button>;
            })}
          </div>
          <div style={{ fontSize: 10.5, color: theme.textSoft, display: "grid", gap: 3 }}>
            <div>{L("Attribuée le", "Issued", "Asignada")}: {formatDate(c.issuedAt, lang)} · {formatMoney(c.price, c.currency, lang)}</div>
            {c.expiresAt ? <div>{L("Expire le", "Expires", "Vence")}: {formatDate(c.expiresAt, lang)}</div> : null}
            {c.status === "cancelled" ? <strong style={{ color: "#ffb1b1" }}>{L("CARTE ANNULÉE", "CARD CANCELLED", "TARJETA ANULADA")}</strong> : expired ? <strong style={{ color: "#ffb1b1" }}>{L("CARTE EXPIRÉE", "CARD EXPIRED", "TARJETA CADUCADA")}</strong> : c.remaining === 0 ? <strong>{L("CARTE TERMINÉE", "CARD COMPLETE", "TARJETA TERMINADA")}</strong> : null}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
            {allowed ? <button style={primary} disabled={pending} type="button" onClick={() => {
              if (window.confirm(L("Décompter une boisson ?", "Use one drink?", "¿Descontar una bebida?"))) void apply(() => consumeDrinkCard(userId, organization.id, c.id), L("Consommation validée.", "Drink recorded.", "Consumo registrado."), true);
            }}>{icons[c.icon]} {L("Cocher 1 boisson", "Use 1 drink", "Marcar 1 bebida")}</button> : null}
            <button style={button} type="button" disabled={pending} onClick={() => void openHistory(c.id)}>
              {historyCard === c.id ? L("Masquer l’historique", "Hide history", "Ocultar historial") : L("Historique", "History", "Historial")}</button>
            {canCorrect && c.status === "active" ? <button style={button} type="button" disabled={pending} onClick={() => {
              if (window.confirm(L("Annuler cette carte ? Cette action ne supprime pas son historique et bloque toute nouvelle consommation.",
                "Cancel this card? Its history is preserved, and no more drinks may be used.",
                "¿Anular esta tarjeta? Su historial se conserva.")))
                void apply(() => cancelDrinkCard(userId, organization.id, c.id), L("Carte annulée.", "Card cancelled.", "Tarjeta anulada."), true);
            }}>{L("Désactiver", "Cancel card", "Desactivar")}</button> : null}
          </div>
          {historyCard === c.id ? <div style={{ borderTop: `1px solid ${theme.borderSoft}`, paddingTop: 8, display: "grid", gap: 7 }}>
            <strong style={{ color: theme.textSoft, fontSize: 11 }}>{L("Journal des consommations et corrections", "Drinks and corrections log", "Historial de consumos y correcciones")}</strong>
            {historyLoading ? <small>{L("Chargement…", "Loading…", "Cargando…")}</small> : null}
            {!historyLoading && history.length === 0 ? <small style={{ color: theme.textSoft }}>{L("Aucune opération.", "No activity.", "Sin actividad.")}</small> : null}
            {history.map((e) => <div key={e.id} style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "space-between", fontSize: 11, color: theme.textSoft }}>
              <span style={{ minWidth: 0 }}>{e.action === "undo" ? "↶" : "✓"} {e.action === "undo" ? L("Correction", "Correction", "Corrección") : L("1 boisson", "1 drink", "1 bebida")} · {formatDate(e.createdAt, lang)}
                {canManage ? ` · ${names.get(e.actorUserId) || e.actorUserId.slice(0, 8)}` : ""}</span>
              {canCorrect && e.action === "consume" && !undone.has(e.id) ? <button type="button" disabled={pending} style={{ ...button, padding: "5px 7px", minHeight: 28, flexShrink: 0 }}
                onClick={() => {
                  if (window.confirm(L("Rétablir cette boisson ? La correction restera visible dans l'historique.",
                    "Restore this drink? The correction remains in the activity log.",
                    "¿Restaurar esta bebida? La corrección quedará registrada.")))
                    void apply(() => undoDrinkCardConsumption(userId, organization.id, e.id), L("Boisson restituée.", "Drink restored.", "Bebida restaurada."), true);
                }}>{L("Corriger +1", "Undo +1", "Corregir +1")}</button> : null}
            </div>)}
          </div> : null}
        </article>;
      })}
    </div>
    <small style={{ color: theme.textSoft, lineHeight: 1.5 }}>
      {L("Les cartes sont nominatives. L'attribution correspond à une remise validée par un responsable, sans paiement intégré. Chaque case cochée représente une boisson. Seuls les responsables peuvent restituer une consommation saisie par erreur.",
        "Cards are personal. Club staff issue them for purchases handled outside the app. Each stamp is one drink. Only staff can correct a mistaken use.",
        "Las tarjetas son personales. Se asignan tras un pago externo. Cada casilla equivale a una bebida. Solo los responsables pueden corregir errores.")}
    </small>
  </section>;
}
