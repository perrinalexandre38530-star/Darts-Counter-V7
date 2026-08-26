import React from "react";
import { formatDistance } from "../../activity/activityMath";
import { fetchOutdoorRoutePhotos, type OutdoorRoutePhoto } from "../../activity/outdoorRouteMedia";
import type { RunningRouteTemplate } from "../../activity/runningRoutes";
import { RunningSurface } from "./RunningUi";

export default function OutdoorRoutePhotoGallery({ route, lang, accent, textSoft, onSearchImages }: { route: RunningRouteTemplate; lang: string; accent: string; textSoft: string; onSearchImages?: () => void }) {
  const [photos, setPhotos] = React.useState<OutdoorRoutePhoto[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");
  const [openIndex, setOpenIndex] = React.useState<number | null>(null);

  React.useEffect(() => {
    let alive = true;
    setLoading(true); setError(""); setPhotos([]); setOpenIndex(null);
    void fetchOutdoorRoutePhotos(route, 12).then((rows) => { if (alive) setPhotos(rows); }).catch(() => { if (alive) setError("media-unavailable"); }).finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [route.id]);

  React.useEffect(() => {
    if (openIndex == null) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpenIndex(null);
      if (event.key === "ArrowLeft") setOpenIndex((value) => value == null ? null : (value - 1 + photos.length) % photos.length);
      if (event.key === "ArrowRight") setOpenIndex((value) => value == null ? null : (value + 1) % photos.length);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openIndex, photos.length]);

  const copy = lang.startsWith("fr") ? { title: "PHOTOS DU LIEU", loading: "Recherche de photos le long du parcours…", empty: "Aucune photo libre trouvée autour de ce parcours.", source: "Départ · tracé · point culminant · Wikimedia Commons", search: "CHERCHER PLUS D'IMAGES", near: "du tracé", sourceLink: "SOURCE", close: "FERMER" }
    : lang.startsWith("es") ? { title: "FOTOS DEL LUGAR", loading: "Buscando fotos a lo largo de la ruta…", empty: "No se encontraron fotos libres cerca de esta ruta.", source: "Salida · ruta · punto alto · Wikimedia Commons", search: "BUSCAR MÁS IMÁGENES", near: "de la ruta", sourceLink: "FUENTE", close: "CERRAR" }
    : { title: "PLACE PHOTOS", loading: "Finding photos along the route…", empty: "No free photos found around this route.", source: "Start · route · high point · Wikimedia Commons", search: "SEARCH MORE IMAGES", near: "from route", sourceLink: "SOURCE", close: "CLOSE" };

  const activePhoto = openIndex == null ? null : photos[openIndex] || null;
  const anchorLabel = (anchor?: OutdoorRoutePhoto["anchor"]) => anchor === "summit" ? "⛰️" : anchor === "start" ? "🚩" : anchor === "finish" ? "🏁" : "📍";

  return <>
    <RunningSurface accent={accent} style={{ marginTop: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}><div><div style={{ color: accent, fontSize: 9, fontWeight: 1000, letterSpacing: .5 }}>{copy.title}</div><div style={{ marginTop: 2, color: textSoft, fontSize: 7.4 }}>{copy.source}</div></div>{onSearchImages ? <button className="btn" onClick={onSearchImages} style={{ minHeight: 30, padding: "4px 7px", fontSize: 7.2, fontWeight: 1000 }}>{copy.search}</button> : null}</div>
      {loading ? <div style={{ marginTop: 9, color: textSoft, fontSize: 8.2 }}>{copy.loading}</div> : null}
      {!loading && !photos.length ? <div style={{ marginTop: 9, color: textSoft, fontSize: 8.2 }}>{copy.empty}{error ? "" : ""}</div> : null}
      {photos.length ? <div style={{ marginTop: 9, display: "flex", gap: 8, overflowX: "auto", scrollSnapType: "x mandatory", paddingBottom: 4 }}>{photos.map((photo, index) => <button key={photo.id} type="button" onClick={() => setOpenIndex(index)} style={{ flex: "0 0 78%", minWidth: 0, scrollSnapAlign: "center", borderRadius: 14, overflow: "hidden", border: "1px solid rgba(255,255,255,.08)", background: "rgba(255,255,255,.025)", color: "inherit", textAlign: "left", padding: 0, cursor: "pointer" }}><div style={{ aspectRatio: "16/10", background: "rgba(0,0,0,.2)", overflow: "hidden", position: "relative" }}><img src={photo.thumbUrl} alt={photo.description || photo.title} loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}/><div style={{ position: "absolute", left: 6, top: 6, display: "flex", gap: 5 }}><span style={{ padding: "3px 6px", borderRadius: 999, background: "rgba(4,6,10,.78)", color: "#fff", fontSize: 7, fontWeight: 1000 }}>{anchorLabel(photo.anchor)}</span>{photo.distanceToRouteM != null ? <span style={{ padding: "3px 6px", borderRadius: 999, background: "rgba(4,6,10,.78)", color: "#fff", fontSize: 7, fontWeight: 1000 }}>{photo.distanceToRouteM < 100 ? "<100 m" : formatDistance(photo.distanceToRouteM)}</span> : null}</div></div><div style={{ padding: "7px 8px" }}><div style={{ fontSize: 8.2, fontWeight: 1000, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{photo.description || photo.title}</div><div style={{ marginTop: 3, fontSize: 6.8, color: textSoft, lineHeight: 1.3 }}>{[photo.author, photo.license].filter(Boolean).join(" · ") || "Wikimedia Commons"}</div></div></button>)}</div> : null}
    </RunningSurface>

    {activePhoto ? <div role="dialog" aria-modal="true" onClick={() => setOpenIndex(null)} style={{ position: "fixed", inset: 0, zIndex: 160, background: "rgba(0,0,0,.92)", display: "grid", placeItems: "center", padding: "max(16px,env(safe-area-inset-top)) 12px max(16px,env(safe-area-inset-bottom))" }}><div onClick={(event) => event.stopPropagation()} style={{ width: "min(760px,100%)", maxHeight: "92vh", display: "grid", gridTemplateRows: "auto minmax(0,1fr) auto", gap: 8 }}><div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 8, alignItems: "center" }}><div style={{ minWidth: 0 }}><div style={{ color: accent, fontSize: 9, fontWeight: 1000 }}>{openIndex! + 1}/{photos.length}</div><div style={{ marginTop: 2, fontSize: 8, color: "rgba(255,255,255,.68)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{activePhoto.description || activePhoto.title}</div></div><button className="btn" onClick={() => setOpenIndex(null)} style={{ minHeight: 34, fontSize: 7.4, fontWeight: 1000 }}>{copy.close}</button></div><div style={{ position: "relative", minHeight: 220, maxHeight: "72vh", display: "grid", placeItems: "center", overflow: "hidden", borderRadius: 15, background: "#050608" }}><img src={activePhoto.imageUrl} alt={activePhoto.description || activePhoto.title} style={{ maxWidth: "100%", maxHeight: "72vh", objectFit: "contain" }}/>{photos.length > 1 ? <><button className="btn" onClick={() => setOpenIndex((openIndex! - 1 + photos.length) % photos.length)} style={{ position: "absolute", left: 8, top: "50%", transform: "translateY(-50%)", minWidth: 38, minHeight: 42, padding: 0, background: "rgba(5,6,8,.8)", fontSize: 18 }}>‹</button><button className="btn" onClick={() => setOpenIndex((openIndex! + 1) % photos.length)} style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", minWidth: 38, minHeight: 42, padding: 0, background: "rgba(5,6,8,.8)", fontSize: 18 }}>›</button></> : null}</div><div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 8, alignItems: "center" }}><div style={{ color: "rgba(255,255,255,.62)", fontSize: 7.2, lineHeight: 1.35 }}>{[activePhoto.author, activePhoto.license, activePhoto.distanceToRouteM != null ? `${activePhoto.distanceToRouteM < 100 ? "<100 m" : formatDistance(activePhoto.distanceToRouteM)} ${copy.near}` : null].filter(Boolean).join(" · ")}</div><a href={activePhoto.pageUrl} target="_blank" rel="noreferrer" className="btn" style={{ minHeight: 32, display: "grid", placeItems: "center", padding: "4px 8px", color: accent, borderColor: `${accent}55`, fontSize: 7.2, fontWeight: 1000, textDecoration: "none" }}>{copy.sourceLink}</a></div></div></div> : null}
  </>;
}
