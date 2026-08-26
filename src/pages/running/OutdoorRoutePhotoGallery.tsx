import React from "react";
import { fetchOutdoorRoutePhotos, type OutdoorRoutePhoto } from "../../activity/outdoorRouteMedia";
import type { RunningRouteTemplate } from "../../activity/runningRoutes";
import { RunningSurface } from "./RunningUi";

export default function OutdoorRoutePhotoGallery({ route, lang, accent, textSoft, onSearchImages }: { route: RunningRouteTemplate; lang: string; accent: string; textSoft: string; onSearchImages?: () => void }) {
  const [photos, setPhotos] = React.useState<OutdoorRoutePhoto[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");

  React.useEffect(() => {
    let alive = true;
    setLoading(true); setError(""); setPhotos([]);
    void fetchOutdoorRoutePhotos(route, 8).then((rows) => { if (alive) setPhotos(rows); }).catch(() => { if (alive) setError("media-unavailable"); }).finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [route.id]);

  const copy = lang.startsWith("fr") ? { title: "PHOTOS DU LIEU", loading: "Recherche de photos autour du parcours…", empty: "Aucune photo libre trouvée autour de ce parcours.", source: "Photos proches via Wikimedia Commons", search: "CHERCHER PLUS D'IMAGES" }
    : lang.startsWith("es") ? { title: "FOTOS DEL LUGAR", loading: "Buscando fotos cerca de la ruta…", empty: "No se encontraron fotos libres cerca de esta ruta.", source: "Fotos cercanas vía Wikimedia Commons", search: "BUSCAR MÁS IMÁGENES" }
    : { title: "PLACE PHOTOS", loading: "Finding photos around the route…", empty: "No free photos found around this route.", source: "Nearby photos via Wikimedia Commons", search: "SEARCH MORE IMAGES" };

  return <RunningSurface accent={accent} style={{ marginTop: 8 }}>
    <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}><div><div style={{ color: accent, fontSize: 9, fontWeight: 1000, letterSpacing: .5 }}>{copy.title}</div><div style={{ marginTop: 2, color: textSoft, fontSize: 7.4 }}>{copy.source}</div></div>{onSearchImages ? <button className="btn" onClick={onSearchImages} style={{ minHeight: 30, padding: "4px 7px", fontSize: 7.2, fontWeight: 1000 }}>{copy.search}</button> : null}</div>
    {loading ? <div style={{ marginTop: 9, color: textSoft, fontSize: 8.2 }}>{copy.loading}</div> : null}
    {!loading && !photos.length ? <div style={{ marginTop: 9, color: textSoft, fontSize: 8.2 }}>{copy.empty}{error ? "" : ""}</div> : null}
    {photos.length ? <div style={{ marginTop: 9, display: "flex", gap: 8, overflowX: "auto", scrollSnapType: "x mandatory", paddingBottom: 4 }}>{photos.map((photo) => <a key={photo.id} href={photo.pageUrl} target="_blank" rel="noreferrer" style={{ flex: "0 0 78%", minWidth: 0, scrollSnapAlign: "center", borderRadius: 14, overflow: "hidden", border: "1px solid rgba(255,255,255,.08)", background: "rgba(255,255,255,.025)", color: "inherit", textDecoration: "none" }}><div style={{ aspectRatio: "16/10", background: "rgba(0,0,0,.2)", overflow: "hidden" }}><img src={photo.thumbUrl} alt={photo.description || photo.title} loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}/></div><div style={{ padding: "7px 8px" }}><div style={{ fontSize: 8.2, fontWeight: 1000, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{photo.description || photo.title}</div><div style={{ marginTop: 3, fontSize: 6.8, color: textSoft, lineHeight: 1.3 }}>{[photo.author, photo.license].filter(Boolean).join(" · ") || "Wikimedia Commons"}</div></div></a>)}</div> : null}
  </RunningSurface>;
}
