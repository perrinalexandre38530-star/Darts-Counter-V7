import React from "react";
import OrganizationDrinkCardsPanel from "./OrganizationDrinkCardsPanel";
import { useTheme } from "../contexts/ThemeContext";
import { useLang } from "../contexts/LangContext";
import { pickLegacyLocalizedText } from "../i18n/legacyLocalizedText";
import { fileToCompressedImageDataUrl } from "../lib/teamImageStorage";
import { uploadOrganizationShopImage } from "../lib/organizationSupabaseMedia";
import {
  createOrganizationShopItem, deleteOrganizationShopItem, listOrganizationShopItems,
  updateOrganizationShopItem, type OrganizationShopCategory, type OrganizationShopItem,
  type OrganizationShopInput,
} from "../organizations/organizationShop";
import type { OrganizationRecord } from "../organizations/organizationService";

type Filter = "all" | OrganizationShopCategory;
type Draft = { category: OrganizationShopCategory; title: string; description: string; price: string; currency: string; variants: string; imageUrl: string; status: "draft" | "published"; sortOrder: string };
const emptyDraft = (): Draft => ({ category: "official_kit", title: "", description: "", price: "", currency: "EUR", variants: "", imageUrl: "", status: "draft", sortOrder: "0" });

export default function OrganizationShopPanel({ organization, userId, logoUrl }: { organization: OrganizationRecord; userId: string | null; logoUrl?: string }) {
  const { theme } = useTheme();
  const { lang } = useLang();
  const L = React.useCallback((fr: string, en: string, es: string) => pickLegacyLocalizedText(lang, fr, en, es), [lang]);
  const canManage = ["owner", "admin", "manager"].includes(organization.role);
  const canDelete = ["owner", "admin"].includes(organization.role);
  const [items, setItems] = React.useState<OrganizationShopItem[]>([]);
  const [filter, setFilter] = React.useState<Filter>("all");
  const [showDrinkCards, setShowDrinkCards] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState("");
  const [notice, setNotice] = React.useState("");
  const [formOpen, setFormOpen] = React.useState(false);
  const [editingId, setEditingId] = React.useState("");
  const [draft, setDraft] = React.useState<Draft>(emptyDraft);
  const [pictureDataUrl, setPictureDataUrl] = React.useState("");
  const [showDrafts, setShowDrafts] = React.useState(false);

  const card: React.CSSProperties = { background: theme.cardBackground || theme.card, border: `1px solid ${theme.borderSoft}`, borderRadius: 17, padding: 13 };
  const input: React.CSSProperties = { width: "100%", boxSizing: "border-box", padding: "11px", minHeight: 42, borderRadius: 11, border: `1px solid ${theme.borderSoft}`, background: "rgba(0,0,0,.22)", color: theme.text, fontSize: 12, outline: "none" };
  const button: React.CSSProperties = { padding: "10px 12px", minHeight: 39, border: `1px solid ${theme.borderSoft}`, borderRadius: 11, color: theme.text, background: "rgba(255,255,255,.04)", cursor: "pointer", fontSize: 11, fontWeight: 850 };
  const primary: React.CSSProperties = { ...button, borderColor: `${theme.primary}88`, color: theme.primary, background: `${theme.primary}14` };
  const label: React.CSSProperties = { display: "grid", gap: 5, color: theme.textSoft, fontSize: 11, fontWeight: 750, minWidth: 0 };

  const categories: Array<{ id: Filter; name: string; symbol: string }> = [
    { id: "all", name: L("Tout", "All", "Todo"), symbol: "◈" },
    { id: "official_kit", name: L("Maillot officiel", "Official jersey", "Camiseta oficial"), symbol: "★" },
    { id: "clothing", name: L("Tenues", "Clothing", "Ropa"), symbol: "♜" },
    { id: "goodies", name: L("Goodies", "Merch", "Recuerdos"), symbol: "◆" },
    { id: "drinks", name: L("Carte des boissons", "Drinks menu", "Carta de bebidas"), symbol: "◉" },
    { id: "equipment_ad", name: L("Petites annonces", "Equipment ads", "Anuncios"), symbol: "◇" },
  ];
  const categoryName = (category: OrganizationShopCategory) => categories.find((item) => item.id === category)?.name || category;

  const reload = React.useCallback(async () => {
    setLoading(true); setError("");
    try { setItems(await listOrganizationShopItems(userId, organization.id)); }
    catch (e: any) { setItems([]); setError(String(e?.message || L("Catalogue indisponible.", "Catalog unavailable.", "Catálogo no disponible."))); }
    finally { setLoading(false); }
  }, [organization.id, userId, L]);
  React.useEffect(() => { void reload(); }, [reload]);
  const shown = items.filter((item) => (canManage && showDrafts ? item.status !== "archived" : item.status === "published") && (filter === "all" || item.category === filter));
  const availableCategories = categories.filter((category) => category.id !== "equipment_ad" || canManage || items.some((item) => item.category === "equipment_ad" && item.status === "published"));
  const money = (item: OrganizationShopItem) => item.price == null ? L("Prix sur demande", "Price on request", "Precio a consultar") : new Intl.NumberFormat(lang === "en" ? "en-GB" : "fr-FR", { style: "currency", currency: item.currency }).format(item.price);

  const reset = () => { setFormOpen(false); setEditingId(""); setDraft(emptyDraft()); setPictureDataUrl(""); };
  const edit = (item: OrganizationShopItem) => {
    setDraft({ category: item.category, title: item.title, description: item.description, price: item.price == null ? "" : String(item.price), currency: item.currency, variants: item.variants, imageUrl: item.imageUrl, status: item.status === "published" ? "published" : "draft", sortOrder: String(item.sortOrder) });
    setEditingId(item.id); setPictureDataUrl(""); setError(""); setNotice(""); setFormOpen(true);
  };
  const startNew = (category: OrganizationShopCategory = "official_kit") => {
    reset(); setDraft({ ...emptyDraft(), category }); setFilter(category); setError(""); setNotice(""); setFormOpen(true);
  };

  const pickPicture = async (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith("image/") || file.size > 15 * 1024 * 1024) {
      setError(L("Choisis une image de moins de 15 Mo.", "Choose an image under 15 MB.", "Elige una imagen de menos de 15 MB.")); return;
    }
    try {
      const dataUrl = await fileToCompressedImageDataUrl(file, { maxSize: 720, quality: 0.79 });
      setPictureDataUrl(dataUrl); setError("");
    } catch { setError(L("Impossible de préparer l'image.", "Unable to prepare the image.", "No se puede preparar la imagen.")); }
  };

  const save = async () => {
    if (!canManage || busy) return;
    const title = draft.title.trim();
    if (title.length < 2 || title.length > 120) { setError(L("Indique un nom d'article (2 à 120 caractères).", "Enter an item name (2–120 characters).", "Introduce un nombre (2–120 caracteres).")); return; }
    const normalizedPrice = draft.price.trim().replace(",", ".");
    const price = normalizedPrice === "" ? null : Number(normalizedPrice);
    if (price !== null && (!Number.isFinite(price) || price < 0)) { setError(L("Prix invalide.", "Invalid price.", "Precio no válido.")); return; }
    setBusy(true); setError(""); setNotice("");
    try {
      const imageUrl = pictureDataUrl ? await uploadOrganizationShopImage({ organizationId: organization.id, userId, dataUrl: pictureDataUrl }) : draft.imageUrl.trim();
      const payload: OrganizationShopInput = { category: draft.category, title, description: draft.description.trim(), price,
        currency: draft.currency, variants: draft.variants.trim(), imageUrl, status: draft.status, sortOrder: Number(draft.sortOrder || 0) };
      if (editingId) await updateOrganizationShopItem(userId, organization.id, editingId, payload);
      else await createOrganizationShopItem(userId, organization.id, payload);
      reset(); if (draft.status === "draft") setShowDrafts(true); await reload();
      setNotice(L("Article enregistré.", "Item saved.", "Artículo guardado."));
    } catch (e: any) { setError(String(e?.message || L("Enregistrement impossible.", "Unable to save.", "No se puede guardar."))); }
    finally { setBusy(false); }
  };

  const remove = async (item: OrganizationShopItem) => {
    if (!canDelete || busy || !window.confirm(L(`Supprimer définitivement « ${item.title} » ?`, `Permanently delete “${item.title}”?`, `¿Eliminar definitivamente «${item.title}»?`))) return;
    setBusy(true); setError("");
    try { await deleteOrganizationShopItem(userId, organization.id, item.id); await reload(); setNotice(L("Article supprimé.", "Item deleted.", "Artículo eliminado.")); }
    catch (e: any) { setError(String(e?.message || "Suppression impossible.")); }
    finally { setBusy(false); }
  };

  const contactEmail = String(organization.profile?.contactEmail || "").trim();
  const contactPhone = String(organization.profile?.contactPhone || "").trim();

  return <div style={{ display: "grid", gap: 12 }}>
    <div style={{ ...card, background: `linear-gradient(135deg, ${theme.primary}13, transparent), ${theme.cardBackground || theme.card}` }}>
      <div style={{ color: theme.primary, fontSize: 15, fontWeight: 1000 }}>{L("BOUTIQUE DU CLUB & BUVETTE", "CLUB SHOP & DRINKS", "TIENDA DEL CLUB Y BEBIDAS")}</div>
      <div style={{ marginTop: 5, color: theme.textSoft, fontSize: 11.5, lineHeight: 1.5 }}>
        {L("Maillots officiels, tenues, goodies et carte de boissons. Les annonces de matériel sont facultatives.", "Official jerseys, clothing, merchandise and drinks menu. Equipment classifieds are optional.", "Camisetas oficiales, ropa, recuerdos y carta de bebidas. Los anuncios de material son opcionales.")}
      </div>
      {canManage ? <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
        <button type="button" style={primary} onClick={() => startNew()}>{L("+ AJOUTER UN ARTICLE", "+ ADD ITEM", "+ AÑADIR ARTÍCULO")}</button>
        <button type="button" style={button} onClick={() => setShowDrafts(!showDrafts)}>{showDrafts ? L("Voir la boutique publiée", "View published shop", "Ver tienda publicada") : L("Voir les brouillons", "Show drafts", "Ver borradores")}</button>
      </div> : null}
    </div>

    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      <button type="button" style={!showDrinkCards ? primary : button} onClick={() => setShowDrinkCards(false)}>{L("🛍️ Catalogue & carte des boissons", "🛍️ Catalog & drinks menu", "🛍️ Catálogo y carta de bebidas")}</button>
      <button type="button" style={showDrinkCards ? primary : button} onClick={() => setShowDrinkCards(true)}>{L("🥤 Cartes de consommation", "🥤 Prepaid drink cards", "🥤 Tarjetas de consumición")}</button>
    </div>
    {showDrinkCards ? <OrganizationDrinkCardsPanel key={organization.id} organization={organization} userId={userId} logoUrl={logoUrl} /> : <>
    {error ? <div role="alert" style={{ ...card, borderColor: "#d96f6f", color: "#ffadad", fontSize: 12 }}>{error}</div> : null}
    {notice ? <div role="status" style={{ ...card, color: theme.primary, fontSize: 12 }}>{notice}</div> : null}

    {formOpen && canManage ? <div style={{ ...card, display: "grid", gap: 12 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <strong style={{ fontSize: 13, color: theme.primary }}>{editingId ? L("MODIFIER L'ARTICLE", "EDIT ITEM", "EDITAR ARTÍCULO") : L("NOUVEL ARTICLE", "NEW ITEM", "NUEVO ARTÍCULO")}</strong>
        <button type="button" style={button} disabled={busy} onClick={reset}>✕</button>
      </div>
      <label style={label}>{L("Catégorie", "Category", "Categoría")}
        <select style={input} value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value as OrganizationShopCategory })}>
          {categories.filter((cat) => cat.id !== "all").map((cat) => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
        </select>
      </label>
      <label style={label}>{L("Nom de l'article", "Item name", "Nombre del artículo")}
        <input style={input} maxLength={120} value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} placeholder={L("Ex. Maillot officiel 2026", "e.g. Official jersey 2026", "Ej. Camiseta oficial 2026")}/>
      </label>
      <label style={label}>{L("Description", "Description", "Descripción")}
        <textarea style={{ ...input, minHeight: 75, resize: "vertical" }} maxLength={1200} value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })}/>
      </label>
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,2fr) minmax(90px,1fr)", gap: 9 }}>
        <label style={label}>{L("Prix (vide = sur demande)", "Price (blank = on request)", "Precio (vacío = consultar)")}
          <input style={input} type="text" inputMode="decimal" value={draft.price} onChange={(e) => setDraft({ ...draft, price: e.target.value })} placeholder="0,00"/>
        </label>
        <label style={label}>{L("Devise", "Currency", "Moneda")}
          <select style={input} value={draft.currency} onChange={(e) => setDraft({ ...draft, currency: e.target.value })}><option value="EUR">EUR</option><option value="USD">USD</option><option value="GBP">GBP</option><option value="CHF">CHF</option><option value="CAD">CAD</option></select>
        </label>
      </div>
      <label style={label}>{draft.category === "drinks" ? L("Format / contenance (optionnel)", "Size / serving (optional)", "Formato / volumen (opcional)") : draft.category === "equipment_ad" ? L("État / détails (optionnel)", "Condition / details (optional)", "Estado / detalles (opcional)") : L("Tailles, couleurs ou personnalisation (optionnel)", "Sizes, colors or personalization (optional)", "Tallas, colores o personalización (opcional)")}
        <input style={input} maxLength={250} value={draft.variants} onChange={(e) => setDraft({ ...draft, variants: e.target.value })} placeholder={draft.category === "official_kit" || draft.category === "clothing" ? "XS, S, M, L, XL · Nom / numéro" : ""}/>
      </label>
      <label style={label}>{L("Photo du produit", "Product photo", "Foto del producto")}
        <input style={input} type="file" accept="image/*" onChange={(e) => { void pickPicture(e.target.files?.[0]); e.currentTarget.value = ""; }}/>
      </label>
      {(pictureDataUrl || draft.imageUrl) ? <img src={pictureDataUrl || draft.imageUrl} alt="" style={{ width: 115, height: 105, borderRadius: 13, objectFit: "cover", border: `1px solid ${theme.borderSoft}` }}/>: null}
      <label style={label}>{L("Ou URL HTTPS d'une image", "Or HTTPS image URL", "O URL HTTPS de imagen")}
        <input style={input} type="url" maxLength={1000} placeholder="https://..." value={draft.imageUrl} onChange={(e) => { setDraft({ ...draft, imageUrl: e.target.value }); setPictureDataUrl(""); }}/>
      </label>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 9 }}>
        <label style={label}>{L("Visibilité", "Visibility", "Visibilidad")}
          <select style={input} value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value as Draft["status"] })}>
            <option value="draft">{L("Brouillon", "Draft", "Borrador")}</option><option value="published">{L("Publié", "Published", "Publicado")}</option>
          </select>
        </label>
        <label style={label}>{L("Ordre d'affichage", "Display order", "Orden")}
          <input style={input} type="number" min="0" max="1000000" value={draft.sortOrder} onChange={(e) => setDraft({ ...draft, sortOrder: e.target.value })}/>
        </label>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        <button type="button" style={primary} disabled={busy} onClick={() => void save()}>{busy ? L("Enregistrement…", "Saving…", "Guardando…") : L("ENREGISTRER", "SAVE", "GUARDAR")}</button>
        <button type="button" style={button} disabled={busy} onClick={reset}>{L("Annuler", "Cancel", "Cancelar")}</button>
      </div>
      <small style={{ color: theme.textSoft }}>{L("Les modifications ne sont visibles par les membres qu'après publication.", "Only published items are visible to members.", "Solo los artículos publicados son visibles para los miembros.")}</small>
    </div> : null}

    <div role="tablist" aria-label={L("Catégories", "Categories", "Categorías")} style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
      {availableCategories.map((category) => <button key={category.id} role="tab" aria-selected={filter === category.id} type="button" onClick={() => setFilter(category.id)} style={{ ...button, color: filter === category.id ? theme.primary : theme.text, borderColor: filter === category.id ? theme.primary : theme.borderSoft, padding: "9px 10px" }}>{category.symbol} {category.name}</button>)}
    </div>

    {loading ? <div style={{ ...card, color: theme.textSoft }}>{L("Chargement du catalogue…", "Loading catalog…", "Cargando catálogo…")}</div> : null}
    {!loading && !error && shown.length === 0 ? <div style={{ ...card, textAlign: "center", color: theme.textSoft, fontSize: 12, lineHeight: 1.6 }}>
      {L("Aucun article publié dans cette rubrique pour le moment.", "No published items in this category yet.", "Todavía no hay artículos publicados en esta categoría.")}
      {canManage ? <div style={{ marginTop: 10 }}><button type="button" style={primary} onClick={() => startNew(filter === "all" ? "official_kit" : filter)}>{L("Ajouter un article", "Add an item", "Añadir un artículo")}</button></div> : null}
    </div> : null}
    {!loading && shown.length > 0 ? <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 245px), 1fr))", gap: 11 }}>
      {shown.map((item) => <article key={item.id} style={{ ...card, padding: 0, overflow: "hidden", display: "flex", flexDirection: "column" }}>
        {item.imageUrl ? <img loading="lazy" src={item.imageUrl} alt={item.title} style={{ width: "100%", height: 172, objectFit: "cover", background: "rgba(0,0,0,.25)" }}/> : <div style={{ height: 100, background: `linear-gradient(135deg, ${theme.primary}23, rgba(0,0,0,.16))`, display: "grid", placeItems: "center", color: theme.primary, fontSize: 30 }}>{categories.find((cat) => cat.id === item.category)?.symbol || "◆"}</div>}
        <div style={{ padding: 13, display: "grid", gap: 7, flex: 1, alignContent: "start" }}>
          <div style={{ color: theme.primary, fontSize: 10, fontWeight: 950 }}>{categoryName(item.category)}{item.status !== "published" ? ` · ${L("BROUILLON", "DRAFT", "BORRADOR")}` : ""}</div>
          <strong style={{ fontSize: 15, color: theme.text, overflowWrap: "anywhere" }}>{item.title}</strong>
          {item.description ? <p style={{ margin: 0, color: theme.textSoft, fontSize: 11.5, lineHeight: 1.5, whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{item.description}</p> : null}
          {item.variants ? <p style={{ margin: 0, color: theme.textSoft, fontSize: 11 }}>{item.variants}</p> : null}
          <strong style={{ color: theme.primary, fontSize: 17 }}>{money(item)}</strong>
          {canManage ? <div style={{ display: "flex", gap: 6, marginTop: 5, flexWrap: "wrap" }}>
            <button style={button} type="button" disabled={busy} onClick={() => edit(item)}>{L("Modifier", "Edit", "Editar")}</button>
            {canDelete ? <button style={button} type="button" disabled={busy} onClick={() => void remove(item)}>{L("Supprimer", "Delete", "Eliminar")}</button> : null}
          </div> : null}
        </div>
      </article>)}
    </div> : null}

    <div style={{ ...card, color: theme.textSoft, fontSize: 11, lineHeight: 1.6 }}>
      <strong style={{ display: "block", color: theme.text, fontSize: 12 }}>{L("Informations et disponibilités", "Information and availability", "Información y disponibilidad")}</strong>
      {L("Cette page présente les articles du club et la carte des boissons. Pour un achat ou une réservation, contacte directement le club : aucun paiement n'est réalisé dans l'application.", "This page displays club merchandise and the drinks menu. Contact the club directly for purchases or reservations; no payment is processed in the app.", "Esta página muestra los productos del club y la carta de bebidas. Contacta directamente con el club para comprar o reservar; no se realizan pagos en la aplicación.")}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 9 }}>
        {contactEmail ? <a style={{ ...primary, textDecoration: "none" }} href={`mailto:${encodeURIComponent(contactEmail)}`}>✉ {L("Contacter le club", "Email the club", "Contactar al club")}</a> : null}
        {contactPhone ? <a style={{ ...button, textDecoration: "none" }} href={`tel:${contactPhone.replace(/[^0-9+]/g, "")}`}>☎ {contactPhone}</a> : null}
      </div>
    </div>
    </>}
  </div>;
}
