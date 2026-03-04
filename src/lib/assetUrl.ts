// src/lib/assetUrl.ts
// Convertit un chemin d’asset importé (png/jpg) vers la version webp générée
// Fallback automatique si l’URL ne suit pas le pattern attendu.

export function assetWebpUrl(originalUrl: string): string {
    // Vite retourne souvent une URL de type /src/assets/...
    // ou /assets/... après build.
    // On bascule juste le dossier + l’extension.
    if (!originalUrl) return originalUrl;
  
    // Remplace "/assets/" -> "/assets-webp/" si présent
    const swapped = originalUrl
      .replace("/assets/", "/assets-webp/")
      .replace("/src/assets/", "/src/assets-webp/");
  
    // Remplace extension -> webp
    return swapped.replace(/\.(png|jpg|jpeg)$/i, ".webp");
  }