import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const out = path.join(root, "MULTISPORTSSCORINGTV");
const configPath = path.join(out, "config.xml");

if (!fs.existsSync(configPath)) {
  console.error("❌ MULTISPORTSSCORINGTV/config.xml introuvable. Crée d'abord le projet Web TV Tizen 10.0.");
  process.exit(1);
}

for (const entry of ["assets", "index.html"]) {
  const target = path.join(out, entry);
  fs.rmSync(target, { recursive: true, force: true });
}

const viteBin = path.join(root, "node_modules", "vite", "bin", "vite.js");
if (!fs.existsSync(viteBin)) {
  console.error("❌ Vite introuvable. Lance d'abord npm install / npm ci.");
  process.exit(1);
}

const env = {
  ...process.env,
  VITE_VIEWER_API_URL: process.env.VITE_VIEWER_API_URL || process.env.VITE_PUBLIC_PAGES_ORIGIN || "https://multisports-scoring.pages.dev",
  VITE_PUBLIC_PAGES_ORIGIN: process.env.VITE_PUBLIC_PAGES_ORIGIN || "https://multisports-scoring.pages.dev",
};

const result = spawnSync(process.execPath, [viteBin, "build", "--config", path.join(root, "vite.samsung-tv.config.ts"), "--mode", "samsung-tv"], {
  cwd: root,
  stdio: "inherit",
  env,
});

if (result.status !== 0) process.exit(result.status || 1);

const check = spawnSync(process.execPath, [path.join(root, "tools", "check-samsung-tv.mjs")], {
  cwd: root,
  stdio: "inherit",
  env,
});

process.exit(check.status || 0);
