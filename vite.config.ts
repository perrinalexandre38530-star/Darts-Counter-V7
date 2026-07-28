// ============================================
// vite.config.ts — Config Cloudflare Pages + React + Tailwind
// ============================================
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: "/", // ✅ important pour Cloudflare Pages (serveur racine)
  plugins: [react()],
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
    // CRITIQUE : IndexedDB/localStorage sont isolés par origine, donc 5173 et
    // 5174 n'utilisent PAS les mêmes données. On refuse désormais tout port
    // de secours silencieux pour éviter l'impression de "perte" des profils.
    strictPort: true,
    // Les anciennes images /media/* vivent encore sur le backend historique.
    // En dev on les fait passer par le même chemin /api/backend qu'en prod afin
    // de supprimer totalement les erreurs CORS navigateur.
    proxy: {
      "/api/backend": {
        target: "https://api.multisports-api.fr",
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/api\/backend/, ""),
      },
    },
  },
});
