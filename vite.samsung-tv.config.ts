import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

const projectRoot = path.dirname(fileURLToPath(import.meta.url));
const tvRoot = path.resolve(projectRoot, "tv-samsung");
const tizenOut = path.resolve(projectRoot, "MULTISPORTSSCORINGTV");

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, projectRoot, "");
  const publicOrigin = String(env.VITE_PUBLIC_PAGES_ORIGIN || "https://multisports-scoring.pages.dev").replace(/\/+$/, "");
  const onlineWorker = String(env.VITE_ONLINE_API_URL || "https://dc-online-v3.perrin-alexandre38530.workers.dev").replace(/\/+$/, "");
  const viewerApi = String(env.VITE_VIEWER_API_URL || onlineWorker).replace(/\/+$/, "");

  return {
    root: tvRoot,
    base: "./",
    publicDir: false,
    plugins: [react()],
    define: {
      "import.meta.env.VITE_VIEWER_API_URL": JSON.stringify(viewerApi),
      "import.meta.env.VITE_ONLINE_API_URL": JSON.stringify(onlineWorker),
      "import.meta.env.VITE_PUBLIC_PAGES_ORIGIN": JSON.stringify(publicOrigin),
    },
    build: {
      outDir: tizenOut,
      emptyOutDir: false,
      sourcemap: false,
      target: "es2019",
      cssCodeSplit: true,
      assetsInlineLimit: 4096,
      rollupOptions: {
        output: {
          manualChunks: undefined,
          assetFileNames: "assets/[name]-[hash][extname]",
          chunkFileNames: "assets/[name]-[hash].js",
          entryFileNames: "assets/[name]-[hash].js",
        },
      },
    },
  };
});
