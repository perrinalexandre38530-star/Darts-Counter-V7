#!/usr/bin/env node
// Import a legally reusable GPX catalogue into MSS/Supabase.
// Usage:
//   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npm run routes:catalog:import-gpx -- --dir ./gpx --sport hiking --provider local-open-data --license ODbL --attribution "Provider name"

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const args = process.argv.slice(2);
function arg(name, fallback = "") {
  const index = args.indexOf(`--${name}`);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
}
function has(name) { return args.includes(`--${name}`); }

const dir = path.resolve(arg("dir", "./gpx-catalog"));
const sport = arg("sport", "hiking");
const provider = arg("provider", "gpx-import").replace(/[^a-z0-9._-]+/gi, "-").toLowerCase();
const sourceLicense = arg("license", "user-supplied");
const attribution = arg("attribution", provider);
const sourceBaseUrl = arg("source-base-url", "");
const dryRun = has("dry-run");
const supabaseUrl = String(process.env.SUPABASE_URL || "").replace(/\/$/, "");
const serviceKey = String(process.env.SUPABASE_SERVICE_ROLE_KEY || "");
const allowedSports = new Set(["running", "trail", "hiking", "walking", "nordic-walking"]);
if (!allowedSports.has(sport)) throw new Error(`Sport invalide: ${sport}`);
if (!fs.existsSync(dir)) throw new Error(`Dossier GPX introuvable: ${dir}`);
if (!dryRun && (!supabaseUrl || !serviceKey)) throw new Error("SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sont requis (sauf --dry-run).");

function walk(root) {
  const out = [];
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    const full = path.join(root, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else if (entry.isFile() && /\.gpx$/i.test(entry.name)) out.push(full);
  }
  return out;
}

function decodeXml(value = "") {
  return String(value)
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"').replace(/&apos;/g, "'").trim();
}

function tag(xml, name) {
  const match = xml.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${name}>`, "i"));
  return match ? decodeXml(match[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ")) : "";
}

function pointsFromGpx(xml) {
  const points = [];
  const regex = /<(?:trkpt|rtept)\b[^>]*\blat=["']([^"']+)["'][^>]*\blon=["']([^"']+)["'][^>]*>([\s\S]*?)<\/(?:trkpt|rtept)>/gi;
  let match;
  while ((match = regex.exec(xml))) {
    const lat = Number(match[1]);
    const lon = Number(match[2]);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;
    const eleMatch = match[3].match(/<ele>([^<]+)<\/ele>/i);
    const altitude = eleMatch && Number.isFinite(Number(eleMatch[1])) ? Number(eleMatch[1]) : undefined;
    points.push({ lat, lon, timestamp: Date.now() + points.length, ...(altitude == null ? {} : { altitude }) });
  }
  return points;
}

function haversine(a, b) {
  const R = 6371000;
  const dLat = (b.lat - a.lat) * Math.PI / 180;
  const dLon = (b.lon - a.lon) * Math.PI / 180;
  const lat1 = a.lat * Math.PI / 180;
  const lat2 = b.lat * Math.PI / 180;
  const h = Math.sin(dLat/2)**2 + Math.cos(lat1)*Math.cos(lat2)*Math.sin(dLon/2)**2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

function stats(points) {
  let distanceM = 0;
  let gain = 0;
  let loss = 0;
  for (let i = 1; i < points.length; i += 1) {
    distanceM += haversine(points[i - 1], points[i]);
    const a = Number(points[i - 1].altitude);
    const b = Number(points[i].altitude);
    if (Number.isFinite(a) && Number.isFinite(b)) {
      const delta = b - a;
      if (delta > 0) gain += delta;
      else loss += Math.abs(delta);
    }
  }
  const lat = points.reduce((sum, point) => sum + point.lat, 0) / points.length;
  const lon = points.reduce((sum, point) => sum + point.lon, 0) / points.length;
  const loop = points.length > 2 && haversine(points[0], points[points.length - 1]) <= Math.max(120, distanceM * 0.04);
  return { distanceM: Math.round(distanceM), gain: Math.round(gain), loss: Math.round(loss), lat, lon, loop };
}

function simplify(points, max = 620) {
  if (points.length <= max) return points;
  const step = Math.ceil(points.length / max);
  const output = points.filter((_, index) => index === 0 || index === points.length - 1 || index % step === 0);
  if (output.at(-1) !== points.at(-1)) output.push(points.at(-1));
  return output;
}

function recordFromFile(file) {
  const xml = fs.readFileSync(file, "utf8");
  const rawPoints = pointsFromGpx(xml);
  if (rawPoints.length < 2) return null;
  const routeStats = stats(rawPoints);
  if (routeStats.distanceM < 700) return null;
  const relative = path.relative(dir, file).replaceAll(path.sep, "/");
  const providerRouteId = crypto.createHash("sha1").update(`${provider}\0${relative}\0${xml}`).digest("hex");
  const title = tag(xml, "name") || path.basename(file, path.extname(file)).replace(/[_-]+/g, " ");
  const description = tag(xml, "desc");
  const sourceUrl = sourceBaseUrl ? `${sourceBaseUrl.replace(/\/$/, "")}/${relative.split("/").map(encodeURIComponent).join("/")}` : null;
  return {
    provider,
    provider_route_id: providerRouteId,
    title: title.slice(0, 180),
    sport,
    route: simplify(rawPoints),
    distance_m: routeStats.distanceM,
    elevation_gain_m: routeStats.gain,
    elevation_loss_m: routeStats.loss,
    center_lat: routeStats.lat,
    center_lon: routeStats.lon,
    source_url: sourceUrl,
    attribution,
    source_license: sourceLicense,
    ranking: 0,
    difficulty: 0,
    is_loop: routeStats.loop,
    metadata: { importFile: relative, description: description.slice(0, 800), importedBy: "mss-gpx-catalog-importer-v1" },
    fetched_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

async function uploadBatch(rows) {
  const response = await fetch(`${supabaseUrl}/rest/v1/ms_running_route_catalog?on_conflict=provider,provider_route_id,sport`, {
    method: "POST",
    headers: {
      apikey: serviceKey,
      authorization: `Bearer ${serviceKey}`,
      "content-type": "application/json",
      prefer: "resolution=merge-duplicates,return=minimal",
    },
    body: JSON.stringify(rows),
  });
  if (!response.ok) throw new Error(`Supabase ${response.status}: ${await response.text()}`);
}

const files = walk(dir);
const rows = files.map(recordFromFile).filter(Boolean);
console.log(`GPX trouvés: ${files.length}`);
console.log(`Parcours valides: ${rows.length}`);
if (!rows.length) process.exit(0);
if (dryRun) {
  const distances = rows.map((row) => row.distance_m / 1000);
  console.log(`Distance min/max: ${Math.min(...distances).toFixed(1)} / ${Math.max(...distances).toFixed(1)} km`);
  console.log("Dry-run: aucune donnée envoyée.");
  process.exit(0);
}
for (let index = 0; index < rows.length; index += 50) {
  const batch = rows.slice(index, index + 50);
  await uploadBatch(batch);
  console.log(`Importés: ${Math.min(index + batch.length, rows.length)}/${rows.length}`);
}
console.log("Import GPX terminé.");
