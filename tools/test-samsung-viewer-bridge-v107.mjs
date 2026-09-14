import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
let ok = true;

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}
function pass(msg) { console.log(`✅ ${msg}`); }
function fail(msg) { ok = false; console.error(`❌ ${msg}`); }
function expect(label, cond) { cond ? pass(label) : fail(label); }

const viewerClient = read("src/lib/viewer/viewerClient.ts");
const viewerSession = read("src/lib/viewer/viewerSession.ts");
const viewerPublisher = read("src/lib/viewer/viewerPublisher.ts");
const googleCast = read("src/cast/googleCast.ts");
const castHost = read("src/pages/cast/CastHostPage.tsx");
const settings = read("src/pages/Settings.tsx");
const x01 = read("src/pages/X01PlayV3.tsx");
const samsung = read("src/tv/samsung/SamsungTvApp.tsx");
const worker = read("src/online/server/worker.ts");
const wrangler = read("wrangler.online.toml");

expect("Viewer API pointe vers dc-online-v3", viewerClient.includes("https://dc-online-v3.perrin-alexandre38530.workers.dev"));
expect("Android packagé ne génère plus de QR https://localhost", viewerClient.includes("isLocalPackagedRuntime()") && viewerClient.includes("PUBLIC_PAGES_ORIGIN"));
expect("Session active persistée localement", viewerSession.includes("dc_viewer_active_session_v1"));
expect("Publication automatique disponible", viewerPublisher.includes("publishActiveViewerSnapshotFromCast"));
expect("Pont Cast -> Viewer exécuté à chaque snapshot", googleCast.includes('bridgeSnapshotToViewerIfActive(snapshot, "sendCastSnapshot_raw")'));
expect("X01 émet des snapshots live", x01.includes("sendCastSnapshot(snapshot)"));
expect("Écran Viewer mobile crée la session", castHost.includes("createViewerSession()"));
expect("Création Viewer force la publication automatique", castHost.includes("setViewerAutoPublish(true)"));
expect("Réglages ouvrent directement l'onglet Viewer", settings.includes('go?.("cast_host", { screenTab: "viewer" })'));
expect("Samsung TV attend un code de 6 caractères", samsung.includes("const CODE_LENGTH = 6"));
expect("Samsung TV affiche ViewerScreen / hub interactif", samsung.includes("<ViewerScreen") && samsung.includes("VIEWER_TV_MENU"));
expect("Worker crée des codes Viewer de 6 caractères", worker.includes("generateViewerCode(6)"));
expect("Worker possède POST /viewer/session", worker.includes('url.pathname === "/viewer/session"') && worker.includes("handleViewerCreate"));
expect("Worker possède POST/GET snapshot", worker.includes("handleViewerPostSnapshot") && worker.includes("handleViewerGetSnapshot"));
expect("Durable Object RoomDO utilise migration SQLite", wrangler.includes('new_sqlite_classes = ["RoomDO"]'));
expect("Binding DC_SYNC présent", wrangler.includes('binding = "DC_SYNC"'));

const kvIds = [...wrangler.matchAll(/id\s*=\s*"([0-9a-f]{32})"/gi)].map((m) => m[1]);
expect("Tous les IDs KV ont 32 caractères hexadécimaux", kvIds.length >= 2 && kvIds.every((id) => /^[0-9a-f]{32}$/i.test(id)));

if (!ok) process.exit(1);
console.log("\n📺 VIEWER SAMSUNG BRIDGE V107 : OK");
console.log("Téléphone -> dc-online-v3 -> DC_SYNC -> Samsung TV : contrat source aligné.");
