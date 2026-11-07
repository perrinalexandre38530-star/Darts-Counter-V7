import { getAppSeason, SEASON_THEMES } from "../lib/seasonalThemes";
import SeasonalDoodle from "./SeasonalDoodle";
import React from "react";
import ClubBuvetteCardVisual, { BuvetteGlyph, BUVETTE_BACKGROUNDS, clubBuvetteBackground } from "./ClubBuvetteCardVisual";
import { uploadOrganizationShopImage } from "../lib/organizationSupabaseMedia";
import { BUVETTE_SCENES, DEFAULT_BUVETTE_COVER, buvetteScenePath, type BuvetteSceneKey } from "../organizations/buvetteBackgrounds";
import { useTheme } from "../contexts/ThemeContext";
import { useLang } from "../contexts/LangContext";
import { pickLegacyLocalizedText } from "../i18n/legacyLocalizedText";
import type { OrganizationRecord, OrganizationMember } from "../organizations/organizationService";
import { listOrganizationMembers } from "../organizations/organizationService";
import {
  type DrinkCardIcon, type DrinkCardBackground, type DrinkCardTemplate, type DrinkCardTemplateInput,
  type AssignedDrinkCard, type DrinkCardEvent,
  listDrinkCardTemplates, listAssignedDrinkCards, listDrinkCardEvents,
  saveDrinkCardTemplate, issueDrinkCard, stampDrinkCard, undoDrinkCardConsumption, cancelDrinkCard,
  getOrganizationBuvetteCover, saveOrganizationBuvetteCover,
} from "../organizations/organizationDrinkCards";

const icons: Record<DrinkCardIcon, string> = { cup: "Verre", coffee: "Café", beer: "Bière", soda: "Soda", water: "Eau", wine: "Vin", cocktail: "Cocktail" };
const defaultForm = (): DrinkCardTemplateInput => ({ name: "Carte 10 + 1 offerte", description: "", paidDrinks: 10,
  bonusDrinks: 1, price: 20, currency: "EUR", icon: "cup", color: "#D7A34D", backgroundKey: "bar-night", backgroundUrl: "", validDays: null, status: "active" });
const formatMoney = (amount: number, currency: string, lang: string) => {
  try { return new Intl.NumberFormat(lang === "fr" ? "fr-FR" : "en-GB", { style: "currency", currency }).format(amount); }
  catch { return `${amount.toFixed(2)} ${currency}`; }
};
const formatDate = (date: string, lang: string) => {
  try { return new Intl.DateTimeFormat(lang === "fr" ? "fr-FR" : "en-GB", { dateStyle: "short", timeStyle: "short" }).format(new Date(date)); }
  catch { return date; }
};

/** Photo de fond assez détaillée pour imprimer, sans écriture en localStorage. */
async function preparePrintableBackground(file: File): Promise<string> {
  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image(); el.onload = () => resolve(el); el.onerror = () => reject(new Error("Image illisible")); el.src = objectUrl;
    });
    const canvas = document.createElement("canvas"), ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas indisponible.");
    const srcW = Math.max(1, img.naturalWidth), srcH = Math.max(1, img.naturalHeight);
    for (const [size, quality] of [[1600,.81], [1200,.75], [900,.69]] as const) {
      const scale = Math.min(1, size / Math.max(srcW, srcH));
      canvas.width = Math.round(srcW * scale); canvas.height = Math.round(srcH * scale);
      ctx.clearRect(0,0,canvas.width,canvas.height); ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = "high";
      ctx.drawImage(img,0,0,canvas.width,canvas.height);
      const dataUrl = canvas.toDataURL("image/webp",quality);
      if (dataUrl.length <= 1_200_000 || size === 900) return dataUrl;
    }
    throw new Error("Image trop volumineuse.");
  } finally { URL.revokeObjectURL(objectUrl); }
}

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
  const [selectedHolder, setSelectedHolder] = React.useState("");
  const [pictureDataUrl, setPictureDataUrl] = React.useState("");
  const [printingCard, setPrintingCard] = React.useState("");
  const [coverKey, setCoverKey] = React.useState<BuvetteSceneKey>(DEFAULT_BUVETTE_COVER);
  // La préférence automatique concerne uniquement le choix du fond, jamais les ornements saisonniers.
  const seasonalStorageKey = `mss:buvette:seasonal:${organization.id}`;
  const [seasonalCover, setSeasonalCover] = React.useState(() => {
    try { return localStorage.getItem(`mss:buvette:seasonal:${organization.id}`) !== "off"; }
    catch { return true; }
  });
  React.useEffect(() => {
    try { setSeasonalCover(localStorage.getItem(seasonalStorageKey) !== "off"); }
    catch { setSeasonalCover(true); }
  }, [seasonalStorageKey]);
  const toggleSeasonalCover = (enabled: boolean) => {
    setSeasonalCover(enabled);
    try { localStorage.setItem(seasonalStorageKey, enabled ? "on" : "off"); } catch { /* stockage facultatif */ }
  };
  const season = getAppSeason();
  const seasonalScene: Record<ReturnType<typeof getAppSeason>, BuvetteSceneKey> = {
    winter: "scene-10", spring: "scene-08", summer: "scene-05", autumn: "scene-19",
  };
  const displayedCover = seasonalCover ? seasonalScene[season] : coverKey;
  const [coverEditorOpen, setCoverEditorOpen] = React.useState(false);
  const [coverSaving, setCoverSaving] = React.useState(false);
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
    let live = true;
    void getOrganizationBuvetteCover(userId, organization.id).then((key) => { if (live) setCoverKey(key); })
      .catch((e: any) => { if (live) setError(String(e?.message || "Impossible de charger la couverture buvette.")); });
    return () => { live = false; };
  }, [organization.id, userId]);
  React.useEffect(() => {
    let mounted = true;
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

  const displayedCards = cards.filter((c) => showAll || (c.status === "active" && c.remaining > 0 && !(c.expiresAt && new Date(c.expiresAt).getTime() <= Date.now())));
  const names = new Map(members.map((m) => [m.userId, m.displayName]));
  const avatars = new Map(members.map((m) => [m.userId, m.avatarUrl]));
  const roster = React.useMemo(() => {
    const mapped = new Map<string, { userId: string; remaining: number; count: number }>();
    for (const c of displayedCards) {
      const r = mapped.get(c.holderUserId) || { userId: c.holderUserId, remaining: 0, count: 0 };
      r.remaining += c.remaining; r.count += 1; mapped.set(c.holderUserId, r);
    }
    return [...mapped.values()].sort((a, b) => (names.get(a.userId) || "").localeCompare(names.get(b.userId) || "", "fr"));
  }, [displayedCards, members]);
  const effectiveHolder = selectedHolder && roster.some((m) => m.userId === selectedHolder) ? selectedHolder : roster[0]?.userId;
  const selectedCards = canManage ? displayedCards.filter((c) => c.holderUserId === effectiveHolder) : displayedCards;
  const templateStart = () => { setForm({ ...defaultForm(), color: /^#[0-9a-f]{6}$/i.test(theme.primary) ? theme.primary : "#D7A34D" }); setPictureDataUrl(""); setEditing(null); setFormOpen(true); setError(""); setMessage(""); };
  const templateEdit = (t: DrinkCardTemplate) => {
    setForm({ name: t.name, description: t.description, paidDrinks: t.paidDrinks, bonusDrinks: t.bonusDrinks,
      price: t.price, currency: t.currency, icon: t.icon, color: t.color, backgroundKey: t.backgroundKey, backgroundUrl: t.backgroundUrl, validDays: t.validDays, status: t.status });
    setPictureDataUrl(""); setEditing(t.id); setFormOpen(true); setError(""); setMessage("");
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
  const pickBackground = async (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith("image/") || file.size > 15 * 1024 * 1024) {
      setError(L("Image invalide (15 Mo maximum).", "Invalid picture (15 MB maximum).", "Imagen no válida (máx. 15 MB).")); return;
    }
    try {
      const dataUrl = await preparePrintableBackground(file);
      setPictureDataUrl(dataUrl); setForm((f) => ({ ...f, backgroundKey: "custom" })); setError("");
    } catch { setError(L("Impossible de préparer l'image.", "Could not prepare the image.", "No se pudo preparar la imagen.")); }
  };
  const save = async () => {
    if (pending) return;
    setPending(true); setError(""); setMessage("");
    try {
      const backgroundUrl = form.backgroundKey === "custom" && pictureDataUrl
        ? await uploadOrganizationShopImage({ organizationId: organization.id, userId, dataUrl: pictureDataUrl })
        : form.backgroundUrl;
      await saveDrinkCardTemplate(userId, organization.id, { ...form, backgroundUrl }, editing || undefined);
      setFormOpen(false); setPictureDataUrl(""); setEditing(null); await reload(false);
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
  const isExpired = (c: AssignedDrinkCard) => !!c.expiresAt && new Date(c.expiresAt).getTime() <= Date.now();
  const canUse = (c: AssignedDrinkCard) => c.status === "active" && !isExpired(c) && c.remaining > 0;
  React.useEffect(() => {
    const endPrint = () => { document.body.classList.remove("mss-print-buvette"); setPrintingCard(""); };
    window.addEventListener("afterprint", endPrint);
    return () => { window.removeEventListener("afterprint", endPrint); document.body.classList.remove("mss-print-buvette"); };
  }, []);
  const print = (id: string) => {
    setPrintingCard(id); document.body.classList.add("mss-print-buvette");
    window.setTimeout(() => window.print(), 120);
  };
  const logo = logoUrl || organization.profile.logoUrl || "";
  const updateCover = async (key: BuvetteSceneKey) => {
    if (coverSaving || key === coverKey) return;
    setCoverSaving(true); setError(""); setMessage("");
    try {
      await saveOrganizationBuvetteCover(userId, organization.id, key);
      setCoverKey(key);
      // L'image personnalisée remplace le fond automatique, pas le décor saisonnier.
      toggleSeasonalCover(false);
      setMessage(L("Couverture de la Buvette enregistrée pour le club. Le décor saisonnier reste actif.", "Club cover saved. Seasonal decorations remain active.", "Portada guardada. La decoración de temporada sigue activa."));
    } catch (e: any) { setError(String(e?.message || "Couverture non enregistrée.")); }
    finally { setCoverSaving(false); }
  };

  return <section style={{ display: "grid", gap: 12 }}>
    <div style={{ ...cardStyle, padding: 0, overflow: "hidden" }}>
      <div className="mss-buvette-seasonal-hero" style={{ minHeight: 202, position: "relative", display: "flex", alignItems: "flex-end",
        background: `linear-gradient(180deg,rgba(2,7,16,.02) 3%,rgba(2,7,16,.80) 100%),url("${buvetteScenePath(displayedCover)}") center/cover no-repeat` }}>
        <SeasonalDoodle season={season} variant="cover" />
        <div className="mss-buvette-seasonal-content" style={{ width: "100%", display: "flex", gap: 9, alignItems: "center", padding: "18px 12px", position: "relative", zIndex: 2 }}>
          {logo ? <img alt="" src={logo} style={{ width: 56, height: 56, flexShrink: 0, borderRadius: 13, objectFit: "contain", background: "#fff", padding: 4 }}/>
            : <span style={{ width: 54, height: 54, borderRadius: 12, background: "#060b13bb", display: "grid", placeItems: "center" }}><BuvetteGlyph icon="cup" size={33} color={theme.primary}/></span>}
          <div style={{ minWidth: 0 }}>
            <strong style={{ display: "block", color: "#fff", fontSize: "clamp(17px,3vw,23px)", lineHeight: 1.16, textShadow: "0 2px 8px #000" }}>{L("BUVETTE DU CLUB", "CLUB DRINKS BAR", "BAR DEL CLUB")}</strong>
            <div style={{ color: "#f0f2f6", fontSize: 12, fontWeight: 750, textShadow: "0 2px 7px #000" }}>{organization.name}</div>
          </div>
          <span title={SEASON_THEMES[season].label} style={{ marginLeft: "auto", flexShrink: 0, padding: "5px 9px", borderRadius: 12, border: `1px solid ${SEASON_THEMES[season].color}99`, color: SEASON_THEMES[season].color, background: "#091018dd", fontWeight: 900, fontSize: 11 }} className="mss-buvette-seasonal-badge">{SEASON_THEMES[season].emoji} {SEASON_THEMES[season].label}</span>
          <span style={{ marginLeft: 0, flexShrink: 0, padding: 7, borderRadius: 12, border: `1px solid ${theme.primary}80`, background: "#091018b8" }}><BuvetteGlyph icon="cup" size={29} color={theme.primary}/></span>
        </div>
      </div>
      <div style={{ padding: "11px 14px 13px" }}>
        <p style={{ margin: 0, color: theme.textSoft, fontSize: 12, lineHeight: 1.5 }}>
          {L("Cartes nominatives avec cases à cocher. Consommations et corrections synchronisées entre appareils.",
            "Personal drink cards with digital stamps, synchronized between devices.",
            "Tarjetas personales y consumos sincronizados entre dispositivos.")}
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginTop: 10 }}>
          <button type="button" style={button} disabled={pending} onClick={() => void reload(true)}>↻ {L("Actualiser", "Refresh", "Actualizar")}</button>
          {canManage ? <button type="button" style={primary} disabled={pending} onClick={templateStart}>＋ {L("Créer une carte", "Design a card", "Crear tarjeta")}</button> : null}
          {canManage ? <button type="button" style={button} aria-expanded={coverEditorOpen} onClick={() => setCoverEditorOpen(!coverEditorOpen)}>▧ {L("Personnaliser la couverture", "Customize cover", "Personalizar portada")}</button> : null}
        </div>
      </div>
    </div>
    {canManage && coverEditorOpen ? <div style={{ ...cardStyle, display: "grid", gap: 10 }}>
      <div>
        <strong style={{ display: "block", color: theme.primary, fontSize: 13 }}>{L("COUVERTURE DE L’ESPACE BUVETTE", "BUVETTE PAGE COVER", "PORTADA DE LA CANTINA")}</strong>
        <label style={{ display: "flex", alignItems: "center", gap: 8, margin: "10px 0", fontSize: 12, color: theme.text, cursor: "pointer" }}>
          <input type="checkbox" checked={seasonalCover} onChange={(e) => toggleSeasonalCover(e.target.checked)} />
          {L("Changer automatiquement le fond selon la saison (le décor reste toujours visible)", "Automatically change the background by season (decorations always stay visible)", "Cambiar el fondo según la temporada (la decoración siempre permanece visible)")}
        </label>
        <small style={{ color: theme.textSoft }}>{L("Choisis un des 20 fonds. La couverture est partagée par tous les membres et ne change pas les cartes déjà attribuées.",
          "Choose one of 20 backgrounds. This cover is shared with all members and does not change issued cards.",
          "Elige uno de los 20 fondos. Esta portada es común para todos los socios.")}</small>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(min(100%,125px),1fr))", gap: 8 }}>
        {BUVETTE_SCENES.map((b) => <button key={b.key} type="button" disabled={coverSaving} aria-pressed={coverKey === b.key}
          onClick={() => void updateCover(b.key)}
          style={{ ...button, minWidth: 0, padding: 5, border: `2px solid ${coverKey === b.key ? theme.primary : theme.borderSoft}`, background: coverKey === b.key ? `${theme.primary}18` : "transparent" }}>
          <img src={b.path} alt="" loading="lazy" style={{ display: "block", width: "100%", aspectRatio: "16/9", borderRadius: 6, objectFit: "cover" }}/>
          <span style={{ display: "block", marginTop: 5, color: coverKey === b.key ? theme.primary : theme.textSoft, fontSize: 10, fontWeight: 800 }}>{lang === "en" ? b.en : lang === "es" ? b.es : b.fr}</span>
        </button>)}
      </div>
      <button type="button" style={button} onClick={() => setCoverEditorOpen(false)}>{L("Fermer", "Close", "Cerrar")}</button>
    </div> : null}
    {error ? <div role="alert" style={{ ...cardStyle, color: "#ffb1b1", borderColor: "#d76c6c", fontSize: 12 }}>{error}</div> : null}
    {message ? <div role="status" style={{ ...cardStyle, color: theme.primary, fontSize: 12 }}>{message}</div> : null}

    {canManage ? <div style={{ ...cardStyle, display: "grid", gap: 10 }}>
      <div style={{ display: "flex", gap: 8, alignItems: "center", justifyContent: "space-between", flexWrap: "wrap" }}>
        <strong style={{ color: theme.primary, fontSize: 13 }}>{L("ADHÉRENTS AVEC CARTE BUVETTE", "MEMBERS WITH DRINK CARDS", "SOCIOS CON TARJETA BAR")}</strong>
        <label style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: theme.textSoft }}>
          <input type="checkbox" checked={showAll} onChange={(e) => setShowAll(e.target.checked)}/>{L("Inclure épuisées / annulées", "Include spent / cancelled", "Incluir agotadas / anuladas")}
        </label>
      </div>
      <div style={{ color: theme.textSoft, fontSize: 11 }}>{L("Sélectionne un adhérent pour voir ses cartes et cocher une consommation.", "Select a member to manage their cards and stamp a drink.", "Selecciona un socio para gestionar sus tarjetas.")}</div>
      {!roster.length && !loading ? <small style={{ color: theme.textSoft }}>{L("Aucune carte active attribuée. Les membres sans carte ne sont pas affichés.", "No active assigned cards. Members without cards are hidden.", "No hay tarjetas activas asignadas.")}</small> : null}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,220px),1fr))", gap: 7 }}>
        {roster.map((entry) => <button key={entry.userId} type="button" onClick={() => { setSelectedHolder(entry.userId); setHistoryCard(""); }}
          style={{ ...button, display: "flex", alignItems: "center", textAlign: "left", gap: 10, minHeight: 66,
            background: effectiveHolder === entry.userId ? `${theme.primary}23` : "rgba(255,255,255,.04)", borderColor: effectiveHolder === entry.userId ? theme.primary : theme.borderSoft }}>
          {avatars.get(entry.userId) ? <img src={avatars.get(entry.userId)} alt="" style={{ width: 43, height: 43, borderRadius: "50%", border: `1px solid ${theme.primary}88`, objectFit: "cover" }}/> : <span style={{ width: 43, height: 43, borderRadius: "50%", background: `${theme.primary}33`, display: "grid", placeItems: "center", fontSize: 17 }}>{(names.get(entry.userId) || "?").slice(0,1).toUpperCase()}</span>}
          <span style={{ flex: 1, minWidth: 0 }}><strong style={{ display: "block", fontSize: 12, overflowWrap: "anywhere" }}>{names.get(entry.userId) || entry.userId.slice(0,8)}</strong>
            <small style={{ color: theme.textSoft }}>{entry.count} {L("carte(s)", "card(s)", "tarjeta(s)")}</small></span>
          <strong style={{ fontSize: 15, color: theme.primary, fontVariantNumeric: "tabular-nums" }}>{entry.remaining} <span style={{ fontSize: 9 }}>{L("restantes", "left", "restantes")}</span></strong>
        </button>)}
      </div>
    </div> : null}

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
            {(Object.entries(icons) as Array<[DrinkCardIcon,string]>).map(([key, symbol]) => <option key={key} value={key}>{symbol}</option>)}
          </select>
        </label>
        <label style={label}>{L("Couleur", "Color", "Color")}
          <input style={{ ...control, padding: 3, minHeight: 40 }} type="color" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })}/>
        </label>
        <label style={label}>{L("Fond de la carte", "Card background", "Fondo de la tarjeta")}
          <select style={control} value={form.backgroundKey} onChange={(e) => setForm({ ...form, backgroundKey: e.target.value as DrinkCardBackground })}>
            {BUVETTE_BACKGROUNDS.map((b) => <option key={b.key} value={b.key}>{lang === "en" ? b.en : lang === "es" ? b.es : b.fr}</option>)}
          </select>
        </label>
        <label style={label}>{L("Importer un fond personnel", "Upload a background", "Subir un fondo")}
          <input type="file" accept="image/*" style={{ ...control, padding: 6 }} onChange={(e) => void pickBackground(e.target.files?.[0])}/>
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
      <div style={{ display: "grid", gap: 6 }}>
        <strong style={{ color: theme.textSoft, fontSize: 11 }}>{L("CHOISIR VISUELLEMENT LE FOND", "CHOOSE A BACKGROUND", "ELIGE UN FONDO")}</strong>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(86px,1fr))", gap: 7 }}>
          {BUVETTE_BACKGROUNDS.map((b) => {
            const url = b.key === "custom" && pictureDataUrl ? pictureDataUrl : form.backgroundUrl;
            return <button key={b.key} type="button" aria-pressed={form.backgroundKey === b.key} onClick={() => setForm((f) => ({ ...f, backgroundKey: b.key }))}
              style={{ ...button, padding: 4, display: "grid", gap: 4, borderColor: form.backgroundKey === b.key ? theme.primary : theme.borderSoft }}>
              <span style={{ display: "block", height: 53, borderRadius: 7, border: `1px solid ${theme.borderSoft}`,
                backgroundImage: clubBuvetteBackground(b.key, url), backgroundPosition: "center", backgroundSize: "cover" }}/>
              <span style={{ color: form.backgroundKey === b.key ? theme.primary : theme.text, fontSize: 10 }}>{lang === "en" ? b.en : lang === "es" ? b.es : b.fr}</span>
            </button>;
          })}
        </div>
      </div>
      <label style={label}>{L("Description / conditions", "Description / terms", "Descripción / condiciones")}
        <textarea style={{ ...control, minHeight: 65 }} maxLength={300} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}/>
      </label>
      <strong style={{ fontSize: 12, color: theme.textSoft }}>{L("APERÇU DE LA CARTE", "CARD PREVIEW", "VISTA PREVIA")}</strong>
      <ClubBuvetteCardVisual compact data={{ ...form, templateName: form.name || "Carte buvette", remaining: form.paidDrinks + form.bonusDrinks,
        backgroundUrl: form.backgroundKey === "custom" && pictureDataUrl ? pictureDataUrl : form.backgroundUrl }}
        memberName={L("Adhérent du club", "Club member", "Socio del club")} clubName={organization.name} logoUrl={logo} lang={lang}/>
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
        <span style={{ color: t.color }}><BuvetteGlyph icon={t.icon} size={27} color={t.color}/></span>
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
      <strong style={{ color: theme.primary, fontSize: 13 }}>{canManage ? L("CARTES DU MEMBRE SÉLECTIONNÉ", "SELECTED MEMBER'S CARDS", "TARJETAS DEL SOCIO") : L("MES CARTES BUVETTE", "MY DRINK CARDS", "MIS TARJETAS")}</strong>
      {!canManage ? <label style={{ display: "flex", alignItems: "center", gap: 5, color: theme.textSoft, fontSize: 11 }}>
        <input type="checkbox" checked={showAll} onChange={(e) => setShowAll(e.target.checked)}/>{L("Voir anciennes cartes", "Show old cards", "Ver tarjetas anteriores")}
      </label> : null}
    </div>
    {loading ? <div style={cardStyle}>{L("Chargement des cartes…", "Loading cards…", "Cargando tarjetas…")}</div> : null}
    {!loading && selectedCards.length === 0 ? <div style={{ ...cardStyle, color: theme.textSoft, fontSize: 12 }}>
      {L("Aucune carte buvette à afficher.", "No drink card to display.", "No hay tarjetas que mostrar.")}
    </div> : null}
    <style>{`@media print {
      @page { size: A5 landscape; margin: 8mm; }
      body.mss-print-buvette * { visibility: hidden !important; }
      body.mss-print-buvette .mss-buvette-print-selected, body.mss-print-buvette .mss-buvette-print-selected * { visibility: visible !important; }
      body.mss-print-buvette .mss-buvette-print-selected { position: absolute !important; left: 0 !important; top: 0 !important; width: 100% !important; max-width: 100% !important; transform: none !important; box-shadow: none !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
      body.mss-print-buvette .mss-buvette-print-selected .mss-buvette-stamp { pointer-events: none; }
    }`}</style>
    <div style={{ display: "grid", gap: 15, gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,330px),1fr))" }}>
    {selectedCards.map((c) => {
      const expired = isExpired(c), allowed = canUse(c);
      const undone = new Set(historyCard === c.id ? history.filter((e) => e.action === "undo" && e.reversesEventId).map((e) => e.reversesEventId) : []);
      const onStamp = (slotIndex: number) => {
        if (!allowed || pending) return;
        if (!window.confirm(L(`Valider la boisson n°${slotIndex} ?`, `Stamp drink #${slotIndex}?`, `¿Marcar la bebida ${slotIndex}?`))) return;
        void apply(() => stampDrinkCard(userId, organization.id, c.id, slotIndex), L("Boisson décomptée.", "Drink recorded.", "Bebida descontada."), true);
      };
      return <article key={c.id} style={{ ...cardStyle, display: "grid", gap: 9, alignContent: "start", padding: 10 }}>
        <div className={printingCard === c.id ? "mss-buvette-print-selected" : ""}>
          <ClubBuvetteCardVisual printId={`mss-buvette-print-${c.id}`} data={c} memberName={names.get(c.holderUserId) || (c.holderUserId === userId ? L("Ma carte", "My card", "Mi tarjeta") : c.holderUserId.slice(0,8))}
            avatarUrl={avatars.get(c.holderUserId)} clubName={organization.name} logoUrl={logo} lang={lang} disabled={!allowed} pending={pending} onConsume={onStamp}/>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap", color: theme.textSoft, fontSize: 11 }}>
          <span>{L("Attribuée", "Issued", "Asignada")}: {formatDate(c.issuedAt, lang)} {c.expiresAt ? ` · ${L("Expire", "Expires", "Vence")}: ${formatDate(c.expiresAt, lang)}` : ""}</span>
          <button style={button} type="button" disabled={pending} onClick={() => print(c.id)}>▤ {L("Imprimer", "Print", "Imprimir")}</button>
        </div>
        {c.status === "cancelled" ? <strong style={{ color: "#f58d90", fontSize: 11 }}>{L("CARTE ANNULÉE", "CARD CANCELLED", "TARJETA ANULADA")}</strong> : expired ? <strong style={{ color: "#f58d90", fontSize: 11 }}>{L("CARTE EXPIRÉE", "CARD EXPIRED", "TARJETA CADUCADA")}</strong> : c.remaining === 0 ? <strong style={{ fontSize: 11 }}>{L("CARTE TERMINÉE", "CARD COMPLETE", "TARJETA COMPLETADA")}</strong> : null}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
          {allowed ? <button style={primary} type="button" disabled={pending} onClick={() => {
            const next = Array.from({ length: c.paidDrinks + c.bonusDrinks }, (_, i) => i + 1).find((i) => !c.usedSlots.includes(i));
            if (next != null) onStamp(next);
          }}><BuvetteGlyph icon={c.icon} size={17} color={theme.primary}/> {L("Cocher 1 boisson", "Stamp one drink", "Marcar una bebida")}</button> : null}
          <button style={button} type="button" disabled={pending} onClick={() => void openHistory(c.id)}>{historyCard === c.id ? L("Masquer l'historique", "Hide history", "Ocultar historial") : L("Historique / corrections", "History / corrections", "Historial / correcciones")}</button>
          {canCorrect && c.status === "active" ? <button style={button} type="button" disabled={pending} onClick={() => {
            if (window.confirm(L("Désactiver cette carte ? Son historique sera conservé.", "Cancel this card? Its history remains available.", "¿Desactivar tarjeta? Se conserva el historial.")))
              void apply(() => cancelDrinkCard(userId, organization.id, c.id), L("Carte annulée.", "Card cancelled.", "Tarjeta anulada."), true);
          }}>{L("Désactiver", "Cancel card", "Desactivar")}</button> : null}
        </div>
        {historyCard === c.id ? <div style={{ borderTop: `1px solid ${theme.borderSoft}`, paddingTop: 8, display: "grid", gap: 7 }}>
          <strong style={{ color: theme.textSoft, fontSize: 11 }}>{L("Journal des consommations et corrections", "Drinks and corrections", "Consumos y correcciones")}</strong>
          {historyLoading ? <small>{L("Chargement…", "Loading…", "Cargando…")}</small> : null}
          {!historyLoading && history.length === 0 ? <small style={{ color: theme.textSoft }}>{L("Aucune opération.", "No activity.", "Sin actividad.")}</small> : null}
          {history.map((e) => <div key={e.id} style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "space-between", fontSize: 11, color: theme.textSoft }}>
            <span style={{ minWidth: 0, overflowWrap: "anywhere" }}>{e.action === "undo" ? "↶" : "✓"} {e.action === "undo" ? L("Correction", "Correction", "Corrección") : L("Boisson", "Drink", "Bebida")} {e.slotIndex ? `#${e.slotIndex}` : ""} · {formatDate(e.createdAt, lang)}{canManage ? ` · ${names.get(e.actorUserId) || e.actorUserId.slice(0,8)}` : ""}</span>
            {canCorrect && e.action === "consume" && !undone.has(e.id) ? <button type="button" disabled={pending} style={{ ...button, padding: "5px 7px", minHeight: 28, flexShrink: 0 }} onClick={() => {
              if (window.confirm(L("Restituer cette boisson ? La correction restera enregistrée.", "Restore this stamp? The audit trail is kept.", "¿Devolver esta bebida? La corrección queda registrada.")))
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
