import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
let ok = true;
function read(rel) { return fs.readFileSync(path.join(root, rel), "utf8"); }
function expect(label, cond) {
  if (cond) console.log(`✅ ${label}`);
  else { ok = false; console.error(`❌ ${label}`); }
}

const app = read("src/App.tsx");
const realtime = read("src/lib/viewer/viewerRealtime.ts");
const nav = read("src/lib/viewer/viewerNavigation.ts");
const publisher = read("src/lib/viewer/viewerPublisher.ts");
const cast = read("src/cast/googleCast.ts");
const tv = read("src/tv/samsung/SamsungTvApp.tsx");
const worker = read("src/online/server/worker.ts");
const room = read("src/online/server/RoomDO.ts");
const wrangler = read("wrangler.online.toml");

expect("App branche le pont Viewer interactif", app.includes("useViewerInteractiveBridge({"));
expect("Le téléphone ouvre un WebSocket Viewer dédié", realtime.includes("/api/viewer/session/${encodeURIComponent(sid)}/socket"));
expect("Le téléphone sait publier navigation + snapshots", realtime.includes("sendViewerHostCommand") && realtime.includes("sendViewerHostSnapshot"));
expect("Navigation distante limitée à une allowlist", nav.includes("REMOTE_ALLOWED_TABS") && nav.includes("isViewerRemoteTabAllowed"));
expect("Le Viewer envoie le snapshot en WebSocket ET HTTP/KV", publisher.includes("sendViewerHostSnapshot(payload)") && publisher.includes("publishViewerSnapshot(session.sessionId, payload)"));
expect("Le Viewer est alimenté avant la sanitation Google Cast", cast.includes('bridgeSnapshotToViewerIfActive(snapshot, "sendCastSnapshot_raw")'));
expect("Pas de chargement dynamique viewerPublisher dans Google Cast", !cast.includes('import("../lib/viewer/viewerPublisher")'));
expect("TV possède un vrai menu interactif", tv.includes("VIEWER_TV_MENU.map") && tv.includes("mss-tv-menu-card"));
expect("TV peut envoyer une commande navigate au téléphone", tv.includes('type: "navigate"') && tv.includes('source: "samsung-tv"'));
expect("TV reçoit la navigation du téléphone", tv.includes('data.type !== "navigation_state"'));
expect("TV reçoit les snapshots en temps réel", tv.includes("onSnapshot: (next) => applySnapshot(next)"));
expect("TV garde un fallback HTTP de snapshot", tv.includes("fetchViewerSnapshot(sessionId)"));
expect("Worker expose le socket Viewer", worker.includes("viewerSocketMatch") && worker.includes('idFromName(`viewer:${sessionId}`)'));
expect("Worker vérifie que la session Viewer existe avant le socket", worker.includes("viewerSessionKey(sessionId)") && worker.includes("Viewer session not found"));
expect("Durable Object utilise getWebSockets pour survivre à l'hibernation", room.includes("getWebSockets"));
expect("Tizen sans Origin est accepté quand ALLOW_ORIGINS est vide", room.includes("if (allowed.length === 0) return true"));
expect("RoomDO est SQLite-backed", wrangler.includes('new_sqlite_classes = ["RoomDO"]'));
expect("Binding ROOMS présent", wrangler.includes('name = "ROOMS"') && wrangler.includes('class_name = "RoomDO"'));
expect("Binding DC_SYNC présent", wrangler.includes('binding = "DC_SYNC"'));

if (!ok) process.exit(1);
console.log("\n📺 SAMSUNG TV INTERACTIVE V1 : OK");
console.log("Téléphone ⇄ Durable Object ⇄ Samsung TV + snapshot KV fallback : contrat source aligné.");
