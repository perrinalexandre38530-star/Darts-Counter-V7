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
  const channel: ReleaseChannel = mode === "store" ? "store" : mode === "beta" ? "beta" : "dev";
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
    name: `multisports-release-gate-${channel}`,
    enforce: "pre",
    transform(code, id) {
      const normalizedId = id.replace(/\\/g, "/").split("?")[0];

      if (normalizedId.endsWith("/src/games/dartsGameRegistry.ts")) {
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
