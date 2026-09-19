import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const out = path.join(root, "MULTISPORTSSCORINGTV");
const configPath = path.join(out, "config.xml");
const samsungTvSourcePath = path.join(root, "src", "tv", "samsung", "SamsungTvApp.tsx");

function readCurrentTvBuildIdentity() {
  if (!fs.existsSync(samsungTvSourcePath)) {
    console.error("❌ src/tv/samsung/SamsungTvApp.tsx introuvable.");
    process.exit(1);
  }
  const source = fs.readFileSync(samsungTvSourcePath, "utf8");
  const marker = source.match(/const\s+TV_BUILD_MARKER\s*=\s*["'`]([^"'`]+)["'`]/)?.[1] || "";
  const label = source.match(/className=["']mss-tv-build-marker["'][^>]*>([^<]+)</)?.[1]?.trim() || marker;
  if (!marker) {
    console.error("❌ TV_BUILD_MARKER introuvable dans SamsungTvApp.tsx.");
    process.exit(1);
  }
  return { marker, label };
}

const currentTvBuild = readCurrentTvBuildIdentity();

if (!fs.existsSync(configPath)) {
  console.error("❌ MULTISPORTSSCORINGTV/config.xml introuvable. Crée d'abord le projet Web TV Tizen 10.0.");
  process.exit(1);
}

// Force un rebuild/install TV complet.
// Debug + .tizen-rds pouvaient conserver un ancien bundle Tizen même lorsque
// SamsungTvApp.tsx avait déjà été mis à jour.
for (const entry of ["assets", "index.html", "Debug", "Release", ".tizen-rds"]) {
  const target = path.join(out, entry);
  fs.rmSync(target, { recursive: true, force: true });
}

const viteBin = path.join(root, "node_modules", "vite", "bin", "vite.js");
if (!fs.existsSync(viteBin)) {
  console.error("❌ Vite introuvable. Lance d'abord npm install / npm ci.");
  process.exit(1);
}

const DEFAULT_VIEWER_API_URL = "https://dc-online-v3.perrin-alexandre38530.workers.dev";

const env = {
  ...process.env,
  // Viewer TV et téléphone utilisent le même Worker KV DC_SYNC.
  VITE_VIEWER_API_URL: process.env.VITE_VIEWER_API_URL || DEFAULT_VIEWER_API_URL,
  VITE_ONLINE_API_URL: process.env.VITE_ONLINE_API_URL || DEFAULT_VIEWER_API_URL,
  VITE_PUBLIC_PAGES_ORIGIN: process.env.VITE_PUBLIC_PAGES_ORIGIN || "https://multisports-scoring.pages.dev",
};

const result = spawnSync(process.execPath, [viteBin, "build", "--config", path.join(root, "vite.samsung-tv.config.ts"), "--mode", "samsung-tv"], {
  cwd: root,
  stdio: "inherit",
  env,
});

if (result.status !== 0) process.exit(result.status || 1);

// Refuse de continuer si Vite a généré un ancien bundle. Le marqueur attendu
// est lu directement dans SamsungTvApp.tsx afin d'éviter qu'un patch futur
// mette à jour l'interface TV sans mettre à jour ce script de build.
const builtAssetsDir = path.join(out, "assets");
const builtJs = fs.existsSync(builtAssetsDir)
  ? fs.readdirSync(builtAssetsDir).filter((file) => file.endsWith(".js"))
  : [];
const builtBundle = builtJs
  .map((file) => fs.readFileSync(path.join(builtAssetsDir, file), "utf8"))
  .join("\n");
if (!builtBundle.includes(currentTvBuild.marker)) {
  console.error(`❌ Le bundle Samsung généré ne contient pas le build TV courant (${currentTvBuild.label}). Build refusé.`);
  process.exit(1);
}
console.log(`✅ Bundle Samsung TV courant généré : ${currentTvBuild.label}`);

const check = spawnSync(process.execPath, [path.join(root, "tools", "check-samsung-tv.mjs")], {
  cwd: root,
  stdio: "inherit",
  env,
});

process.exit(check.status || 0);
