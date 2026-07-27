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
  darts: Record<string, FeatureStatus>;
};

const releaseFeatures = JSON.parse(
  readFileSync(new URL("./src/config/release-features.json", import.meta.url), "utf8")
) as ReleaseFeaturesFile;

function releaseFeatureGate(mode: string): Plugin | null {
  const channel: ReleaseChannel = mode === "store" ? "store" : mode === "beta" ? "beta" : "dev";
  if (channel === "dev") return null;

  const allowedStatuses = new Set<FeatureStatus>(releaseFeatures.channels[channel] || []);
  const allowedDartsIds = Object.entries(releaseFeatures.darts)
    .filter(([, status]) => allowedStatuses.has(status))
    .map(([id]) => id);

  return {
    name: `multisports-release-gate-${channel}`,
    enforce: "pre",
    transform(code, id) {
      const normalizedId = id.replace(/\\/g, "/").split("?")[0];
      if (!normalizedId.endsWith("/src/games/dartsGameRegistry.ts")) return null;

      const needle = `export const dartsGameRegistry: DartsGameDef[] = rawDartsGameRegistry.map((g) => ({\n  ...g,\n  ready: READY_IDS.has(g.id),\n}));`;
      if (!code.includes(needle)) {
        this.error("MULTISPORTS release gate: dartsGameRegistry export shape changed; refusing an unfiltered beta/store build.");
      }

      const allowedLiteral = JSON.stringify(allowedDartsIds);
      const replacement = `export const dartsGameRegistry: DartsGameDef[] = rawDartsGameRegistry\n  .map((g) => ({\n    ...g,\n    ready: READY_IDS.has(g.id),\n  }))\n  .filter((g) => ${allowedLiteral}.includes(g.id));`;

      return {
        code: code.replace(needle, replacement),
        map: null,
      };
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
