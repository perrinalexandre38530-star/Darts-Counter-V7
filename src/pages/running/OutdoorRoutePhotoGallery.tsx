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
    void fetchOutdoorRoutePhotos(route, 18, lang).then((rows) => { if (alive) setPhotos(rows); }).catch(() => { if (alive) setError("media-unavailable"); }).finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [lang, route.id]);

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

  const copy = lang.startsWith("fr") ? {
    title: "DÉCOUVRIR LE LIEU", loading: "Recherche des meilleurs visuels du parcours…", empty: "Aucun visuel suffisamment pertinent n'a été trouvé autour de ce parcours.",
    source: "Photos de lieux · Wikipédia + Wikimedia Commons", search: "CHERCHER PLUS", near: "du tracé", sourceLink: "VOIR LA SOURCE", close: "FERMER", viewAll: "VOIR LES PHOTOS", routePhotos: "photos autour du parcours",
  } : lang.startsWith("es") ? {
    title: "DESCUBRIR EL LUGAR", loading: "Buscando las mejores imágenes de la ruta…", empty: "No se encontraron imágenes suficientemente relevantes cerca de esta ruta.",
    source: "Fotos de lugares · Wikipedia + Wikimedia Commons", search: "BUSCAR MÁS", near: "de la ruta", sourceLink: "VER FUENTE", close: "CERRAR", viewAll: "VER FOTOS", routePhotos: "fotos alrededor de la ruta",
  } : {
    title: "DISCOVER THE PLACE", loading: "Finding the best visuals around the route…", empty: "No sufficiently relevant place imagery was found around this route.",
    source: "Place imagery · Wikipedia + Wikimedia Commons", search: "SEARCH MORE", near: "from route", sourceLink: "VIEW SOURCE", close: "CLOSE", viewAll: "VIEW PHOTOS", routePhotos: "photos around the route",
  };

  const activePhoto = openIndex == null ? null : photos[openIndex] || null;
  const featured = photos.slice(0, 5);
  const anchorLabel = (anchor?: OutdoorRoutePhoto["anchor"]) => anchor === "summit" ? "⛰️" : anchor === "start" ? "🚩" : anchor === "finish" ? "🏁" : anchor === "place" ? "📍" : "◉";
  const sourceLabel = (photo: OutdoorRoutePhoto) => photo.source === "wikipedia" ? "WIKIPÉDIA" : "WIKIMEDIA";

  return <>
    <RunningSurface accent={accent} style={{ marginTop: 8, overflow: "hidden" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}>
        <div>
          <div style={{ color: accent, fontSize: 9.4, fontWeight: 1000, letterSpacing: .6 }}>{copy.title}</div>
          <div style={{ marginTop: 2, color: textSoft, fontSize: 7.5 }}>{copy.source}</div>
        </div>
        {onSearchImages ? <button className="btn" onClick={onSearchImages} style={{ minHeight: 31, padding: "4px 8px", fontSize: 7.2, fontWeight: 1000 }}>{copy.search}</button> : null}
      </div>

      {loading ? <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "1.5fr 1fr 1fr", gridTemplateRows: "104px 104px", gap: 5 }}>
        {[0,1,2,3,4].map((index) => <div key={index} style={{ gridColumn: index === 0 ? "1" : undefined, gridRow: index === 0 ? "1 / span 2" : undefined, borderRadius: 12, background: "linear-gradient(110deg,rgba(255,255,255,.035),rgba(255,255,255,.08),rgba(255,255,255,.035))", border: "1px solid rgba(255,255,255,.05)" }}/>) }
        <div style={{ gridColumn: "1 / -1", marginTop: 3, color: textSoft, fontSize: 8 }}>{copy.loading}</div>
      </div> : null}

      {!loading && !photos.length ? <div style={{ marginTop: 10, padding: 13, borderRadius: 14, background: "rgba(255,255,255,.025)", border: "1px solid rgba(255,255,255,.06)", color: textSoft, fontSize: 8.2, lineHeight: 1.45 }}>{copy.empty}{error ? "" : ""}</div> : null}

      {featured.length ? <div style={{ marginTop: 10, position: "relative" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1.55fr 1fr 1fr", gridTemplateRows: "108px 108px", gap: 5, borderRadius: 15, overflow: "hidden", background: "rgba(0,0,0,.2)" }}>
          {featured.map((photo, index) => <button key={photo.id} type="button" onClick={() => setOpenIndex(index)} style={{ position: "relative", gridColumn: index === 0 ? "1" : undefined, gridRow: index === 0 ? "1 / span 2" : undefined, border: 0, padding: 0, overflow: "hidden", background: "#090b0f", cursor: "pointer" }}>
            <img src={photo.thumbUrl} alt={photo.description || photo.placeName || photo.title} loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", transform: "scale(1.01)" }}/>
            <div style={{ position: "absolute", inset: 0, background: index === 0 ? "linear-gradient(180deg,transparent 48%,rgba(2,4,8,.72))" : "linear-gradient(180deg,transparent 62%,rgba(2,4,8,.55))" }}/>
            <div style={{ position: "absolute", left: 6, top: 6, display: "flex", gap: 4, alignItems: "center" }}>
              <span style={{ padding: "3px 6px", borderRadius: 999, background: "rgba(4,6,10,.76)", color: "#fff", fontSize: 6.5, fontWeight: 1000 }}>{anchorLabel(photo.anchor)}</span>
              {index === 0 ? <span style={{ padding: "3px 6px", borderRadius: 999, background: "rgba(4,6,10,.76)", color: accent, fontSize: 6.2, fontWeight: 1000 }}>{sourceLabel(photo)}</span> : null}
            </div>
            {index === 0 ? <div style={{ position: "absolute", left: 9, right: 9, bottom: 8, textAlign: "left" }}><div style={{ color: "#fff", fontSize: 8.8, fontWeight: 1000, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{photo.placeName || photo.description || photo.title}</div>{photo.distanceToRouteM != null ? <div style={{ marginTop: 2, color: "rgba(255,255,255,.72)", fontSize: 6.8 }}>{photo.distanceToRouteM < 100 ? "<100 m" : formatDistance(photo.distanceToRouteM)} {copy.near}</div> : null}</div> : null}
          </button>)}
        </div>
        {photos.length > 5 ? <button className="btn" onClick={() => setOpenIndex(0)} style={{ position: "absolute", right: 8, bottom: 8, minHeight: 31, padding: "4px 8px", background: "rgba(5,7,11,.86)", borderColor: "rgba(255,255,255,.18)", color: "#fff", fontSize: 7.1, fontWeight: 1000 }}>▦ {copy.viewAll} · {photos.length}</button> : null}
      </div> : null}

      {photos.length ? <div style={{ marginTop: 9, display: "flex", gap: 6, overflowX: "auto", paddingBottom: 2 }}>
        {photos.slice(0, 10).map((photo, index) => <button key={`${photo.id}:chip`} className="btn" onClick={() => setOpenIndex(index)} style={{ flex: "0 0 auto", minHeight: 30, padding: "4px 8px", fontSize: 6.8, fontWeight: 900, display: "flex", alignItems: "center", gap: 5 }}><span>{anchorLabel(photo.anchor)}</span><span style={{ maxWidth: 130, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{photo.placeName || photo.title}</span></button>)}
      </div> : null}
      {photos.length ? <div style={{ marginTop: 6, color: textSoft, fontSize: 6.9 }}>{photos.length} {copy.routePhotos}</div> : null}
    </RunningSurface>

    {activePhoto ? <div role="dialog" aria-modal="true" onClick={() => setOpenIndex(null)} style={{ position: "fixed", inset: 0, zIndex: 160, background: "rgba(0,0,0,.94)", display: "grid", placeItems: "center", padding: "max(16px,env(safe-area-inset-top)) 12px max(16px,env(safe-area-inset-bottom))" }}>
      <div onClick={(event) => event.stopPropagation()} style={{ width: "min(820px,100%)", maxHeight: "94vh", display: "grid", gridTemplateRows: "auto minmax(0,1fr) auto", gap: 8 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 8, alignItems: "center" }}>
          <div style={{ minWidth: 0 }}><div style={{ color: accent, fontSize: 9, fontWeight: 1000 }}>{openIndex! + 1}/{photos.length} · {sourceLabel(activePhoto)}</div><div style={{ marginTop: 2, fontSize: 8.2, color: "rgba(255,255,255,.76)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{activePhoto.placeName || activePhoto.description || activePhoto.title}</div></div>
          <button className="btn" onClick={() => setOpenIndex(null)} style={{ minHeight: 34, fontSize: 7.4, fontWeight: 1000 }}>{copy.close}</button>
        </div>
        <div style={{ position: "relative", minHeight: 240, maxHeight: "74vh", display: "grid", placeItems: "center", overflow: "hidden", borderRadius: 15, background: "#050608" }}>
          <img src={activePhoto.imageUrl} alt={activePhoto.description || activePhoto.title} style={{ maxWidth: "100%", maxHeight: "74vh", objectFit: "contain" }}/>
          {photos.length > 1 ? <><button className="btn" onClick={() => setOpenIndex((openIndex! - 1 + photos.length) % photos.length)} style={{ position: "absolute", left: 8, top: "50%", transform: "translateY(-50%)", minWidth: 40, minHeight: 44, padding: 0, background: "rgba(5,6,8,.82)", fontSize: 18 }}>‹</button><button className="btn" onClick={() => setOpenIndex((openIndex! + 1) % photos.length)} style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", minWidth: 40, minHeight: 44, padding: 0, background: "rgba(5,6,8,.82)", fontSize: 18 }}>›</button></> : null}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 8, alignItems: "center" }}>
          <div style={{ color: "rgba(255,255,255,.62)", fontSize: 7.2, lineHeight: 1.4 }}>{[activePhoto.description, activePhoto.author, activePhoto.license, activePhoto.distanceToRouteM != null ? `${activePhoto.distanceToRouteM < 100 ? "<100 m" : formatDistance(activePhoto.distanceToRouteM)} ${copy.near}` : null].filter(Boolean).join(" · ")}</div>
          <a href={activePhoto.pageUrl} target="_blank" rel="noreferrer" className="btn" style={{ minHeight: 32, display: "grid", placeItems: "center", padding: "4px 8px", color: accent, borderColor: `${accent}55`, fontSize: 7.2, fontWeight: 1000, textDecoration: "none" }}>{copy.sourceLink}</a>
        </div>
      </div>
    </div> : null}
  </>;
}
