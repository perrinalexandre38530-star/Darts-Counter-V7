// ============================================
// vite.config.ts — Config Cloudflare Pages + React
// + MULTISPORTS SCORING release-channel gate
// ============================================
import { readFileSync } from "node:fs";
import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";

type ReleaseChannel = "dev" | "beta" | "store";
type FeatureStatus = "stable" | "beta" | "development" | "disabled";

type ReleaseFeaturesFile = {
  channels: Record<ReleaseChannel, FeatureStatus[]>;
  sports: Record<string, FeatureStatus>;
  darts: Record<string, FeatureStatus>;
  platformFeatures: Record<string, FeatureStatus>;
};

const releaseFeatures = JSON.parse(
  readFileSync(new URL("./src/config/release-features.json", import.meta.url), "utf8")
) as ReleaseFeaturesFile;

function releaseFeatureGate(mode: string): Plugin | null {
  const nativeStoreMode = mode === "android" || mode === "ios" || mode === "tv";
  const channel: ReleaseChannel = mode === "store" || nativeStoreMode ? "store" : mode === "beta" ? "beta" : "dev";
  if (channel === "dev") return null;

  const allowedStatuses = new Set<FeatureStatus>(releaseFeatures.channels[channel] || []);
  const allowedSportsIds = Object.entries(releaseFeatures.sports)
    .filter(([, status]) => allowedStatuses.has(status))
    .map(([id]) => id);
  const allowedDartsIds = Object.entries(releaseFeatures.darts)
    .filter(([, status]) => allowedStatuses.has(status))
    .map(([id]) => id);
  const platformEnabled = (id: string) => allowedStatuses.has(releaseFeatures.platformFeatures?.[id] || "development");

  return {
    name: `multisports-release-gate-${channel}-${mode}`,
    enforce: "pre",
    transform(code, id) {
      const normalizedId = id.replace(/\\/g, "/").split("?")[0];

      if (normalizedId.endsWith("/src/games/dartsGameRegistry.ts")) {
        // Keep the complete internal registry for history/stats compatibility.
        // Only the UI-facing DARTS_GAMES export is filtered for beta/store.
        const needle = "export const DARTS_GAMES = dartsGameRegistry;";
        if (!code.includes(needle)) {
          this.error("MULTISPORTS release gate: DARTS_GAMES export changed; refusing an unfiltered beta/store build.");
        }

        const allowedLiteral = JSON.stringify(allowedDartsIds);
        return {
          code: code.replace(needle, `export const DARTS_GAMES = dartsGameRegistry.filter((game) => ${allowedLiteral}.includes(game.id));`),
          map: null,
        };
      }

      if (normalizedId.endsWith("/src/pages/GameSelect.tsx")) {
        const needle = "const copy = [...items];";
        if (!code.includes(needle)) {
          this.error("MULTISPORTS release gate: GameSelect item sorting changed; refusing a build that could expose unfinished sports.");
        }
        const allowedLiteral = JSON.stringify(allowedSportsIds);
        return {
          code: code.replace(needle, `const copy = items.filter((item) => ${allowedLiteral}.includes(item.id));`),
          map: null,
        };
      }

      if (normalizedId.endsWith("/src/components/BottomNav.tsx")) {
        let next = code;

        if (!platformEnabled("online")) {
          next = next.replaceAll("...(hideOnline ? [] : [", "...(true ? [] : [");
        }
        if (!platformEnabled("competitions")) {
          next = next.replace('    { k: "tournaments", label: "Compétitions", icon: <Icon name="tournaments" /> },\n', "");
        }
        if (!platformEnabled("cast")) {
          next = next.replace('    { k: "cast_host", label: "Écrans", icon: <Icon name="cast_host" /> },\n', "");
        }

        return next === code ? null : { code: next, map: null };
      }

      if (nativeStoreMode && normalizedId.endsWith("/src/main.tsx")) {
        // Native WebViews do not need the PWA Service Worker. More importantly,
        // do not run devUnregisterSW() either: awaiting CacheStorage/SW cleanup
        // before the first React render can hang Android WebView on a black screen.
        const swNeedle = `if (import.meta.env.PROD) await registerServiceWorkerProd();\n    else await devUnregisterSW();`;
        if (!code.includes(swNeedle)) {
          this.error("MULTISPORTS native build: SW boot block changed; refusing a native build with uncertain cache behavior.");
        }

        let next = code.replace(
          swNeedle,
          `// Native build: no PWA Service Worker registration or cache purge before first render.`
        );

        // Keep a visible native boot marker until React takes over. If a future
        // runtime issue happens before App renders, the device won't show a
        // featureless black screen and diagnosis remains possible.
        const containerNeedle = `const container = document.getElementById("root");\n    if (!container) throw new Error("❌ Élément #root introuvable dans index.html");`;
        if (next.includes(containerNeedle)) {
          next = next.replace(
            containerNeedle,
            `${containerNeedle}\n    container.innerHTML = '<div id="ms-native-boot" style="min-height:100vh;display:flex;align-items:center;justify-content:center;background:#0b0b10;color:#fff;font:700 16px Inter,system-ui,sans-serif;text-align:center;padding:24px">MULTISPORTS SCORING<br><span style="opacity:.65;font-size:12px;font-weight:600;margin-left:8px">Démarrage Android…</span></div>';`
          );
        }

        return { code: next, map: null };
      }

      return null;
    },
  };
}

export default defineConfig(({ mode }) => ({
  base: "/", // important pour Cloudflare Pages et Capacitor webDir
  plugins: [react(), releaseFeatureGate(mode)].filter(Boolean) as Plugin[],
  build: {
    outDir: "dist",
    sourcemap: false,
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks: undefined,
      },
    },
  },
  server: {
    host: true,
    port: 5173,
  },
}));
