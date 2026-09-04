#!/usr/bin/env node
// MULTISPORTS SCORING — worldwide open route catalogue synchronizer V2.
// Reads data/running-route-catalog/world-sources.json and imports only sources
// explicitly marked autoSync=true and commercialReuseAllowed=true.

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const args = process.argv.slice(2);
const arg = (name, fallback = "") => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};
const has = (name) => args.includes(`--${name}`);

const registryPath = path.resolve(arg("registry", "data/running-route-catalog/world-sources.json"));
const onlySource = arg("source", "").trim();
const dryRun = has("dry-run");
const maxFeatures = Math.max(1, Number(arg("max-features", "100000")) || 100000);
const supabaseUrl = String(process.env.SUPABASE_URL || "").replace(/\/$/, "");
const serviceKey = String(process.env.SUPABASE_SERVICE_ROLE_KEY || "");
if (!fs.existsSync(registryPath)) throw new Error(`Registre introuvable: ${registryPath}`);
if (!dryRun && (!supabaseUrl || !serviceKey)) throw new Error("SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sont requis (sauf --dry-run). ");

const registry = JSON.parse(fs.readFileSync(registryPath, "utf8"));
const sources = (registry.sources || []).filter((s) => !onlySource || s.id === onlySource);
if (onlySource && !sources.length) throw new Error(`Source inconnue: ${onlySource}`);

const ALLOWED_SPORTS = new Set([
  "running","trail","hiking","walking","nordic-walking","cycling","mtb","gravel","ebike","bmx","roller","snowshoe","ski-touring","equestrian"
]);

function safeText(value, fallback = "") {
  const text = String(value ?? "").replace(/\s+/g, " ").trim();
  return text ? text.slice(0, 240) : fallback;
}
function normalizeSport(value, fallback = "hiking") {
  const raw = String(value || fallback).toLowerCase().trim();
  const aliases = {
    bike: "cycling", bicycle: "cycling", cycling: "cycling", road_cycling: "cycling", "road-cycling": "cycling",
    mountain_bike: "mtb", mountainbiking: "mtb", vtt: "mtb", e_mtb: "ebike", emtb: "ebike", e_bike: "ebike", vae: "ebike",
    hike: "hiking", trekking: "hiking", walk: "walking", snow_shoe: "snowshoe", ski_touring: "ski-touring", horse: "equestrian"
  };
  const sport = aliases[raw] || raw;
  return ALLOWED_SPORTS.has(sport) ? sport : fallback;
}
function haversine(a, b) {
  const R = 6371000;
  const dLat = (b.lat - a.lat) * Math.PI / 180;
  const dLon = (b.lon - a.lon) * Math.PI / 180;
  const lat1 = a.lat * Math.PI / 180;
  const lat2 = b.lat * Math.PI / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}
function routeDistance(points) {
  let total = 0;
  for (let i = 1; i < points.length; i += 1) total += haversine(points[i - 1], points[i]);
  return total;
}
function simplify(points, max = 620) {
  if (points.length <= max) return points;
  const step = Math.ceil(points.length / max);
  const out = points.filter((_, i) => i === 0 || i === points.length - 1 || i % step === 0);
  if (out.at(-1) !== points.at(-1)) out.push(points.at(-1));
  return out;
}
function stats(points) {
  let gain = 0, loss = 0;
  for (let i = 1; i < points.length; i += 1) {
    const a = Number(points[i - 1].altitude), b = Number(points[i].altitude);
    if (Number.isFinite(a) && Number.isFinite(b)) {
      const d = b - a;
      if (d > 0) gain += d; else loss += Math.abs(d);
    }
  }
  const distanceM = Math.round(routeDistance(points));
  const centerLat = points.reduce((s, p) => s + p.lat, 0) / points.length;
  const centerLon = points.reduce((s, p) => s + p.lon, 0) / points.length;
  const isLoop = points.length > 2 && haversine(points[0], points.at(-1)) <= Math.max(120, distanceM * 0.04);
  return { distanceM, gain: Math.round(gain), loss: Math.round(loss), centerLat, centerLon, isLoop };
}
function geojsonGeometryToSegments(geometry) {
  if (!geometry) return [];
  const now = Date.now();
  const line = (coords) => (coords || []).map((c, i) => {
    const lon = Number(c?.[0]), lat = Number(c?.[1]), altitude = Number(c?.[2]);
    return Number.isFinite(lat) && Number.isFinite(lon) ? { lat, lon, timestamp: now + i, ...(Number.isFinite(altitude) ? { altitude } : {}) } : null;
  }).filter(Boolean);
  if (geometry.type === "LineString") return [line(geometry.coordinates)].filter((x) => x.length >= 2);
  if (geometry.type === "MultiLineString") return (geometry.coordinates || []).map(line).filter((x) => x.length >= 2);
  return [];
}
function connectSegments(segments) {
  const chains = [];
  for (const seg of segments.filter((s) => s.length >= 2)) {
    if (!chains.length) { chains.push([...seg]); continue; }
    let best = null;
    for (let ci = 0; ci < chains.length; ci += 1) {
      const c = chains[ci];
      const candidates = [
        { ci, gap: haversine(c.at(-1), seg[0]), reverse: false, prepend: false },
        { ci, gap: haversine(c.at(-1), seg.at(-1)), reverse: true, prepend: false },
        { ci, gap: haversine(c[0], seg.at(-1)), reverse: false, prepend: true },
        { ci, gap: haversine(c[0], seg[0]), reverse: true, prepend: true },
      ];
      for (const cand of candidates) if (!best || cand.gap < best.gap) best = cand;
    }
    const oriented = best?.reverse ? [...seg].reverse() : seg;
    if (best && best.gap <= 800) {
      const c = chains[best.ci];
      chains[best.ci] = best.prepend ? [...oriented.slice(0, -1), ...c] : [...c, ...oriented.slice(1)];
    } else chains.push([...seg]);
  }
  return chains.sort((a, b) => routeDistance(b) - routeDistance(a));
}
function firstProperty(props, fields = []) {
  for (const f of fields) if (props?.[f] != null && safeText(props[f])) return props[f];
  return "";
}
function propertySport(source, props) {
  const text = `${safeText(props?.[source.sportField])} ${safeText(props?.TRLUSE)} ${safeText(props?.trl_trail_type)} ${safeText(props?.OBJECT_TYPE_DESCRIPTION)}`.toLowerCase();
  if (/mountain bike|mtb|vtt/.test(text)) return "mtb";
  if (/cycle|cycling|bicycle|bike/.test(text)) return "cycling";
  if (/snowshoe/.test(text)) return "snowshoe";
  if (/ski/.test(text)) return "ski-touring";
  if (/horse|equestrian|saddle/.test(text)) return "equestrian";
  if (/trail run|running/.test(text)) return "trail";
  return normalizeSport(source.defaultSport || "hiking");
}
function sourceRecord(source, { id, title, points, props = {}, sourceUrl }) {
  if (!points || points.length < 2) return null;
  const st = stats(points);
  if (st.distanceM < 500) return null;
  const route = simplify(points);
  const providerRouteId = safeText(id) || crypto.createHash("sha1").update(JSON.stringify(route)).digest("hex");
  return {
    provider: source.id,
    provider_route_id: providerRouteId,
    title: safeText(title, `${source.name} ${providerRouteId}`),
    sport: propertySport(source, props),
    route,
    distance_m: st.distanceM,
    elevation_gain_m: st.gain,
    elevation_loss_m: st.loss,
    center_lat: st.centerLat,
    center_lon: st.centerLon,
    network: safeText(props.network || props.Network || props.route_network) || null,
    route_ref: safeText(props.ref || props.Ref || props.trail_no || props.TRNO) || null,
    operator: safeText(props.operator || props.MAINTAINER || props.managing_org || props.ORIGINATOR) || null,
    source_url: sourceUrl || source.sourceUrl || source.portalUrl || null,
    image_url: null,
    attribution: source.attribution || source.name,
    source_license: source.license || null,
    ranking: Number(source.ranking || 0),
    difficulty: 0,
    is_loop: st.isLoop,
    country_code: source.countryCode || null,
    region_name: source.regionName || null,
    locality: safeText(props.UNITNAME || props.locality || props.commune || props.city) || null,
    metadata: { sourceName: source.name, scope: source.scope, upstreamProperties: props, importedBy: "mss-world-route-sync-v2" },
    fetched_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}
async function fetchJson(url) {
  const response = await fetch(url, { headers: { accept: "application/json, application/geo+json;q=0.9,*/*;q=0.1", "user-agent": "MULTISPORTS-SCORING-RouteCatalogSync/2.0" } });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText} — ${url}`);
  return response.json();
}
async function syncArcgis(source) {
  const features = [];
  let offset = 0;
  const batch = 1000;
  while (features.length < maxFeatures) {
    const params = new URLSearchParams({
      where: source.where || "1=1",
      outFields: "*",
      returnGeometry: "true",
      outSR: "4326",
      f: "geojson",
      resultOffset: String(offset),
      resultRecordCount: String(Math.min(batch, maxFeatures - features.length)),
    });
    const payload = await fetchJson(`${source.layerUrl.replace(/\/$/, "")}/query?${params}`);
    const chunk = Array.isArray(payload?.features) ? payload.features : [];
    features.push(...chunk);
    if (chunk.length < batch) break;
    offset += chunk.length;
  }
  const groups = new Map();
  for (const feature of features) {
    const props = feature?.properties || {};
    const groupFields = source.groupByFields || (source.groupByField ? [source.groupByField] : []);
    const groupKey = groupFields.length ? groupFields.map((f) => safeText(props[f], "_")).join("|") : safeText(props[source.idField] ?? props[source.fallbackIdField] ?? feature.id);
    const key = groupKey || crypto.createHash("sha1").update(JSON.stringify(feature.geometry)).digest("hex");
    if (!groups.has(key)) groups.set(key, { props, segments: [], ids: [] });
    const g = groups.get(key);
    g.segments.push(...geojsonGeometryToSegments(feature.geometry));
    g.ids.push(safeText(props[source.idField] ?? props[source.fallbackIdField] ?? feature.id));
  }
  const rows = [];
  for (const [groupKey, group] of groups) {
    const chains = connectSegments(group.segments);
    if (!chains.length) continue;
    const props = group.props || {};
    const title = firstProperty(props, source.titleFields || [source.titleField, source.groupByField].filter(Boolean)) || groupKey;
    const id = group.ids.filter(Boolean)[0] || groupKey;
    const row = sourceRecord(source, { id, title, points: chains[0], props, sourceUrl: source.sourceUrl });
    if (row) rows.push(row);
  }
  return rows;
}
function extractGeotrekFeatures(payload) {
  if (payload?.type === "FeatureCollection" && Array.isArray(payload.features)) return payload.features;
  if (Array.isArray(payload?.results)) return payload.results;
  if (Array.isArray(payload)) return payload;
  return [];
}
function pointsFromMaybeGeometry(item) {
  const geometry = item?.geometry || item?.geom || item?.shape || item?.properties?.geometry;
  return geojsonGeometryToSegments(geometry)[0] || [];
}
async function downloadGpxPoints(url) {
  const response = await fetch(url, { headers: { accept: "application/gpx+xml,application/xml,text/xml,*/*" } });
  if (!response.ok) return [];
  const xml = await response.text();
  const points = [];
  const re = /<(?:trkpt|rtept)\b[^>]*\blat=["']([^"']+)["'][^>]*\blon=["']([^"']+)["'][^>]*>([\s\S]*?)<\/(?:trkpt|rtept)>/gi;
  let m;
  while ((m = re.exec(xml))) {
    const lat = Number(m[1]), lon = Number(m[2]);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;
    const em = m[3].match(/<ele>([^<]+)<\/ele>/i);
    const altitude = em && Number.isFinite(Number(em[1])) ? Number(em[1]) : undefined;
    points.push({ lat, lon, timestamp: Date.now() + points.length, ...(altitude == null ? {} : { altitude }) });
  }
  return points;
}
function slugify(s = "") {
  return String(s).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[’']/g, "-").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}
async function syncGeotrek(source) {
  // GeoJSON gives the best chance to receive geometry directly. If an instance
  // returns a normal paginated payload, this still handles `results`.
  const firstUrl = new URL(source.apiUrl);
  firstUrl.searchParams.set("language", source.language || "fr");
  firstUrl.searchParams.set("format", "geojson");
  firstUrl.searchParams.set("page_size", "500");
  const items = [];
  let nextUrl = firstUrl.toString();
  const visited = new Set();
  while (nextUrl && items.length < maxFeatures && !visited.has(nextUrl)) {
    visited.add(nextUrl);
    const payload = await fetchJson(nextUrl);
    items.push(...extractGeotrekFeatures(payload).slice(0, maxFeatures - items.length));
    const next = payload?.next || payload?.links?.next || null;
    nextUrl = next ? (String(next).startsWith("http") ? String(next) : new URL(String(next), source.apiUrl).href) : "";
  }
  const rows = [];
  for (const item of items) {
    const props = item?.properties || item || {};
    const id = item?.id ?? props.id ?? props.pk;
    const title = safeText(props.name || props.title || props.label, `Parcours ${id}`);
    let points = pointsFromMaybeGeometry(item);
    if (points.length < 2 && id != null) {
      const candidates = [
        props.gpx_url, props.gpx, props.download_gpx,
        `${String(source.portalUrl || "").replace(/\/$/, "")}/api/fr/treks/${id}/${slugify(title)}.gpx`,
      ].filter(Boolean);
      for (const candidate of candidates) {
        const gpxUrl = String(candidate).startsWith("http") ? String(candidate) : new URL(String(candidate), source.portalUrl || source.apiUrl).href;
        try { points = await downloadGpxPoints(gpxUrl); } catch { points = []; }
        if (points.length >= 2) break;
      }
    }
    const practice = safeText(props.practice?.name || props.practice || props.practices?.[0]?.name || props.practices?.[0]);
    const row = sourceRecord(source, { id, title, points, props: { ...props, OBJECT_TYPE_DESCRIPTION: practice }, sourceUrl: props.url || props.web_url || source.portalUrl });
    if (row) rows.push(row);
  }
  return rows;
}
async function uploadRows(rows) {
  for (let i = 0; i < rows.length; i += 50) {
    const batch = rows.slice(i, i + 50);
    const response = await fetch(`${supabaseUrl}/rest/v1/ms_running_route_catalog?on_conflict=provider,provider_route_id,sport`, {
      method: "POST",
      headers: { apikey: serviceKey, authorization: `Bearer ${serviceKey}`, "content-type": "application/json", prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify(batch),
    });
    if (!response.ok) throw new Error(`Supabase ${response.status}: ${await response.text()}`);
  }
}

let total = 0;
for (const source of sources) {
  console.log(`\n[${source.id}] ${source.name}`);
  if (!source.autoSync) { console.log("  ↳ ignorée: autoSync=false"); continue; }
  if (source.commercialReuseAllowed !== true) { console.log("  ↳ ignorée: licence non validée pour réutilisation commerciale"); continue; }
  let rows = [];
  if (source.adapter === "arcgis-feature-service") rows = await syncArcgis(source);
  else if (source.adapter === "geotrek-v2") rows = await syncGeotrek(source);
  else { console.log(`  ↳ adaptateur non batch: ${source.adapter}`); continue; }
  const dedupe = new Map();
  for (const row of rows) dedupe.set(`${row.provider}|${row.provider_route_id}|${row.sport}`, row);
  rows = [...dedupe.values()];
  console.log(`  ↳ ${rows.length} parcours normalisés`);
  total += rows.length;
  if (!dryRun && rows.length) await uploadRows(rows);
}
console.log(`\nTerminé: ${total} parcours ${dryRun ? "inspectés (dry-run)" : "synchronisés"}.`);
