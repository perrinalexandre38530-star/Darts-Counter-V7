import React from "react";
import OrganizationPublicShopRequestForm from "../components/OrganizationPublicShopRequestForm";
import OrganizationShopRequestTracking from "../components/OrganizationShopRequestTracking";
import { useLang } from "../contexts/LangContext";
import { pickLegacyLocalizedText } from "../i18n/legacyLocalizedText";
import { fetchPublicShop, type PublicShopData, type PublicShopProduct } from "../organizations/organizationPublicShop";
import type { OrganizationShopCategory } from "../organizations/organizationShop";

type Category = "all" | OrganizationShopCategory;
const CATEGORY_SYMBOLS: Record<OrganizationShopCategory, string> = {
  official_kit: "★", clothing: "♟", goodies: "✦", drinks: "◉", equipment_ad: "◇",
};
const formatMoney = (price: number | null, currency: string, locale: string, fallback: string) => {
  if (price == null || !Number.isFinite(price)) return fallback;
  try { return new Intl.NumberFormat(locale, { style: "currency", currency }).format(price); }
  catch { return `${price.toFixed(2)} ${currency}`; }
};

export default function OrganizationPublicShopPage({ organizationId }: { organizationId?: string }) {
  const { lang } = useLang();
  const L = (fr: string, en: string, es: string) => pickLegacyLocalizedText(lang, fr, en, es);
  const [data, setData] = React.useState<PublicShopData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const [category, setCategory] = React.useState<Category>("all");
  const [selected, setSelected] = React.useState<PublicShopProduct | null>(null);
  const [trackingReference, setTrackingReference] = React.useState("");
  React.useEffect(() => {
    let cancelled = false;
    setLoading(true); setError(""); setData(null); setCategory("all"); setSelected(null); setTrackingReference("");
    void fetchPublicShop(String(organizationId || "")).then((result) => {
      if (!cancelled) setData(result);
    }).catch((e: any) => { if (!cancelled) setError(String(e?.message || "Boutique indisponible.")); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [organizationId]);

  React.useEffect(() => {
    if (!selected) return;
    const onEscape = (e: KeyboardEvent) => { if (e.key === "Escape") setSelected(null); };
    window.addEventListener("keydown", onEscape);
    return () => window.removeEventListener("keydown", onEscape);
  }, [selected]);

  const categories: Array<{ id: Category; name: string }> = [
    { id: "all", name: L("Tout voir", "All items", "Todo") },
    { id: "official_kit", name: L("Maillot officiel", "Official jersey", "Camiseta oficial") },
    { id: "clothing", name: L("Tenues", "Clothing", "Ropa") },
    { id: "goodies", name: L("Goodies", "Merchandise", "Recuerdos") },
    { id: "drinks", name: L("Carte des boissons", "Drinks menu", "Bebidas") },
    { id: "equipment_ad", name: L("Petites annonces", "Classifieds", "Anuncios") },
  ];
  const categoryName = (id: OrganizationShopCategory) => categories.find((item) => item.id === id)?.name || id;
  const shown = (data?.items || []).filter((item) => category === "all" || category === item.category);
  const availableCategories = categories.filter((item) => item.id === "all" || data?.items.some((product) => product.category === item.id));
  const canEmail = !!data?.contactEmail && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.contactEmail);
  const safePhone = String(data?.contactPhone || "").replace(/[^0-9+]/g, "");
  const title = data?.headline || data?.name || L("Boutique du club", "Club shop", "Tienda del club");
  const card: React.CSSProperties = { border: "1px solid rgba(255,255,255,.13)", borderRadius: 19, background: "#101b2a", overflow: "hidden" };
  const chip = (active: boolean): React.CSSProperties => ({ border: `1px solid ${active ? "#61dcca" : "rgba(255,255,255,.2)"}`,
    background: active ? "rgba(97,220,202,.15)" : "rgba(255,255,255,.055)", color: active ? "#9effec" : "#d9e5f1",
    borderRadius: 999, padding: "9px 13px", fontWeight: 800, fontSize: 12, cursor: "pointer" });
  const money = (item: PublicShopProduct) => formatMoney(item.price, item.currency, lang === "en" ? "en-GB" : "fr-FR", L("Prix sur demande", "Price on request", "Precio a consultar"));
  const availabilityLabel = (item: PublicShopProduct) => {
    if (item.category === "drinks" || item.category === "equipment_ad") return "";
    if (item.availability === "unavailable" || (item.availability === "available" && item.stockQuantity === 0)) return L("Épuisé / indisponible", "Sold out / unavailable", "Agotado / no disponible");
    if (item.availability === "preorder") return L("Précommande", "Preorder", "Prepedido");
    if (item.availability === "on_request") return L("Sur commande", "Made to order", "Bajo pedido");
    return item.stockQuantity == null ? L("Disponible", "Available", "Disponible") : `${item.stockQuantity} ${L("en stock", "in stock", "en stock")}`;
  };
  const canRequest = (item: PublicShopProduct) => ["official_kit", "clothing", "goodies"].includes(item.category)
    && item.availability !== "unavailable" && !(item.availability === "available" && item.stockQuantity === 0);
  const emailLink = (item?: PublicShopProduct) => `mailto:${data?.contactEmail || ""}?subject=${encodeURIComponent(`${L("Demande boutique", "Shop inquiry", "Consulta tienda")} · ${data?.name || ""}${item ? ` · ${item.title}` : ""}`)}`;

  return <main style={{ minHeight: "100dvh", background: "radial-gradient(circle at top,#182a3a,#07101a 70%)", color: "#f5f8fc", fontFamily: "system-ui,-apple-system,sans-serif", overflowX: "hidden" }}>
    <div style={{ maxWidth: 1080, margin: "0 auto", padding: "16px clamp(12px, 3vw, 28px) 56px" }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, paddingBottom: 15 }}>
        <a href="#/gameSelect" style={{ textDecoration: "none", fontWeight: 1000, letterSpacing: .3, color: "#7de7d1", fontSize: 13 }}>← MULTISPORTS SCORING</a>
        <span style={{ border: "1px solid rgba(125,231,209,.38)", padding: "6px 10px", borderRadius: 99, color: "#a3f8e5", fontSize: 10, fontWeight: 900 }}>{L("BOUTIQUE PUBLIQUE", "PUBLIC CLUB SHOP", "TIENDA PÚBLICA")}</span>
      </header>
      {loading ? <div role="status" style={{ ...card, padding: 30, textAlign: "center" }}>{L("Chargement de la boutique…", "Loading the shop…", "Cargando la tienda…")}</div> : null}
      {error ? <div role="alert" style={{ ...card, padding: 20, color: "#ffb8b8" }}>{error}</div> : null}
      {!loading && !error && !data ? <div style={{ ...card, padding: 34, textAlign: "center" }}>
        <div style={{ fontSize: 38 }}>⌁</div>
        <h1 style={{ fontSize: 22 }}>{L("Boutique non disponible", "Shop not available", "Tienda no disponible")}</h1>
        <p style={{ color: "#afbfcc", fontSize: 13, lineHeight: 1.5 }}>{L("Cette boutique n'est pas publiée ou son lien n'est plus valide.", "This storefront is not published or the link is no longer valid.", "Esta tienda no está publicada o su enlace no es válido.")}</p>
      </div> : null}
      {data && !loading ? <>
        <section style={{ ...card, position: "relative", minHeight: 235, background: "#152536", isolation: "isolate" }}>
          {data.coverUrl ? <img src={data.coverUrl} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", zIndex: -2 }} /> : null}
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(90deg,rgba(4,14,24,.94) 0%,rgba(4,14,24,.65) 56%,rgba(4,14,24,.34) 100%)", zIndex: -1 }} />
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "flex-start", padding: "clamp(18px,4vw,34px)" }}>
            {data.logoUrl ? <img src={data.logoUrl} alt="" style={{ width: 82, height: 82, borderRadius: 18, objectFit: "contain", background: "rgba(6,10,15,.75)", border: "1px solid rgba(255,255,255,.25)", padding: 6 }}/> : null}
            <div style={{ flex: "1 1 260px", minWidth: 0 }}>
              <div style={{ color: "#95f5dc", fontWeight: 900, fontSize: 11, letterSpacing: 1.6 }}>{data.name.toUpperCase()}</div>
              <h1 style={{ margin: "6px 0 10px", fontSize: "clamp(24px,4vw,39px)", lineHeight: 1.09, overflowWrap: "anywhere" }}>{title}</h1>
              {data.subtitle ? <p style={{ margin: 0, maxWidth: 650, color: "#e4ecf2", lineHeight: 1.6, fontSize: 13, whiteSpace: "pre-wrap" }}>{data.subtitle}</p> : <p style={{ margin: 0, color: "#e4ecf2", fontSize: 13 }}>{L("Maillots, tenues, goodies et boissons du club", "Jerseys, clothing, merchandise and club drinks", "Camisetas, ropa, recuerdos y bebidas")}</p>}
              {data.city ? <div style={{ marginTop: 10, fontSize: 11, color: "#b2c5d0" }}>⌖ {data.city}</div> : null}
            </div>
          </div>
        </section>
        <section aria-label={L("Catégories", "Categories", "Categorías")} style={{ display: "flex", gap: 7, flexWrap: "wrap", margin: "22px 0 15px" }}>
          {availableCategories.map((item) => <button key={item.id} type="button" onClick={() => setCategory(item.id)} aria-pressed={category === item.id} style={chip(category === item.id)}>{item.name}</button>)}
        </section>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10, marginBottom: 12 }}>
          <h2 style={{ fontSize: 18, margin: 0 }}>{L("Catalogue", "Catalog", "Catálogo")}</h2>
          <span style={{ color: "#adbfce", fontSize: 11 }}>{shown.length} {L("article(s)", "item(s)", "artículo(s)")}</span>
        </div>
        {!shown.length ? <div style={{ ...card, padding: 22, fontSize: 13, color: "#b6c5d2" }}>{L("Aucun article dans cette rubrique pour le moment.", "No items in this category yet.", "No hay artículos en esta categoría.")}</div> : null}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(min(100%,220px),1fr))", gap: 13 }}>
          {shown.map((item) => <button key={item.id} type="button" onClick={() => setSelected(item)} style={{ ...card, padding: 0, color: "inherit", textAlign: "left", cursor: "pointer", display: "flex", flexDirection: "column", minWidth: 0 }}>
            {item.imageUrl ? <img src={item.imageUrl} alt="" loading="lazy" style={{ width: "100%", height: 175, objectFit: "cover" }} /> : <div style={{ height: 140, display: "grid", placeItems: "center", fontSize: 44, color: "#7de7d1", background: "linear-gradient(145deg,#243f4c,#111f2d)" }}>{CATEGORY_SYMBOLS[item.category]}</div>}
            <div style={{ padding: 15, display: "grid", gap: 8, flex: 1 }}>
              <span style={{ color: "#8cedd7", textTransform: "uppercase", letterSpacing: .4, fontSize: 10, fontWeight: 950 }}>{categoryName(item.category)}</span>
              <strong style={{ fontSize: 15, overflowWrap: "anywhere" }}>{item.title}</strong>
              {item.variants ? <div style={{ fontSize: 11, color: "#becbd6", overflowWrap: "anywhere" }}>{item.variants}</div> : null}
              {availabilityLabel(item) ? <span style={{ fontSize: 11, fontWeight: 850, color: canRequest(item) ? "#9af5d8" : "#ffb5b5" }}>{availabilityLabel(item)}</span> : null}
              <strong style={{ color: "#95f5dc", marginTop: "auto", fontSize: 16 }}>{money(item)}</strong>
              <span style={{ fontSize: 10.5, color: "#b9ccdb" }}>{L("Voir la fiche", "View details", "Ver detalles")} ›</span>
            </div>
          </button>)}
        </div>
        <div id="club-shop-tracking" style={{ marginTop: 20 }}><OrganizationShopRequestTracking key={data.organizationId} organizationId={data.organizationId} initialReference={trackingReference} /></div>
        <footer style={{ ...card, padding: 18, marginTop: 24, display: "grid", gap: 10 }}>
          <strong style={{ fontSize: 15 }}>{L("Informations et contact", "Information and contact", "Información y contacto")}</strong>
          <p style={{ color: "#b7cad8", fontSize: 12, margin: 0, lineHeight: 1.6 }}>{L("Vitrine du club. Tu peux transmettre une demande de réservation ou de maillot personnalisé, sous réserve d'acceptation par le club. Aucun paiement en ligne.", "Club storefront. You may submit a reservation or customized jersey request, subject to club approval. No online payments.", "Escaparate del club. Puedes enviar solicitudes de reserva o personalización, sujetas a la aprobación del club. Sin pagos en línea.")}</p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {canEmail ? <a href={emailLink()} style={{ ...chip(true), textDecoration: "none" }}>✉ {L("Contacter le club", "Email the club", "Contactar")}</a> : null}
            {safePhone ? <a href={`tel:${safePhone}`} style={{ ...chip(false), textDecoration: "none" }}>☎ {data.contactPhone}</a> : null}
            {!canEmail && !safePhone ? <span style={{ fontSize: 11, color: "#b6c7d3" }}>{L("Coordonnées non renseignées par le club.", "Contact details not provided by the club.", "El club no ha publicado datos de contacto.")}</span> : null}
          </div>
        </footer>
      </> : null}
    </div>
    {selected && data ? <div role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) setSelected(null); }} style={{ position: "fixed", inset: 0, zIndex: 1200, background: "rgba(0,0,0,.82)", display: "grid", placeItems: "center", padding: 14, overflowY: "auto" }}>
      <div role="dialog" aria-modal="true" aria-label={selected.title} style={{ ...card, width: "min(100%,540px)", maxHeight: "min(90dvh,800px)", overflowY: "auto", boxShadow: "0 25px 80px #000" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: 15, gap: 12 }}>
          <strong style={{ color: "#95f5dc", fontSize: 11, textTransform: "uppercase" }}>{categoryName(selected.category)}</strong>
          <button type="button" style={chip(false)} onClick={() => setSelected(null)} aria-label={L("Fermer", "Close", "Cerrar")}>✕</button>
        </div>
        {selected.imageUrl ? <img src={selected.imageUrl} alt="" style={{ width: "100%", maxHeight: 300, objectFit: "contain", background: "#09111b" }}/> : null}
        <div style={{ padding: 18, display: "grid", gap: 11 }}>
          <h2 style={{ margin: 0, fontSize: 23 }}>{selected.title}</h2>
          {selected.description ? <p style={{ margin: 0, color: "#bcd0de", fontSize: 13, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{selected.description}</p> : null}
          {selected.variants ? <div style={{ fontSize: 12, color: "#bcd0de" }}>{selected.variants}</div> : null}
          <strong style={{ fontSize: 23, color: "#8cedd7" }}>{money(selected)}</strong>
          {availabilityLabel(selected) ? <div style={{ color: canRequest(selected) ? "#9af5d8" : "#ffb5b5", fontSize: 12, fontWeight: 900 }}>{availabilityLabel(selected)}</div> : null}
          {canRequest(selected) ? <OrganizationPublicShopRequestForm key={selected.id} organizationId={data.organizationId} product={selected} onTrackRequest={(ref) => {
            setSelected(null); setTrackingReference(ref);
            window.requestAnimationFrame(() => document.getElementById("club-shop-tracking")?.scrollIntoView({ behavior: "smooth", block: "center" }));
          }} /> : null}
          {canEmail ? <a href={emailLink(selected)} style={{ ...chip(true), textAlign: "center", textDecoration: "none" }}>{L("Demander cet article au club", "Ask the club about this item", "Consultar al club")}</a> : null}
          {safePhone ? <a href={`tel:${safePhone}`} style={{ ...chip(false), textAlign: "center", textDecoration: "none" }}>{L("Appeler le club", "Call the club", "Llamar al club")}</a> : null}
        </div>
      </div>
    </div> : null}
  </main>;
}
