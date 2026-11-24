import { MSS_COMMON_PREBUILT_AVATARS } from "./prebuiltAvatarCatalog";

/**
 * Attribue une image de la galerie officielle MSS à chaque participant rapide.
 * Le seed correspond à la partie (id de session) : une même image est renvoyée
 * pour avatarDataUrl et avatarUrl, sans changement pendant la partie.
 * Les participants d'une même session ont des images distinctes (jusqu'à ce que
 * le catalogue soit épuisé). Aucun profil enregistré n'est créé ou modifié.
 */
const FALLBACK_SESSION_SEED = `${Date.now()}-${Math.random()}`;

function seedFromString(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function shuffledGallery(seed: string): string[] {
  // La base V7(64) fournie contient précisément 12 portraits common.
  // Éviter de tirer des URL de portraits absents de cette archive.
  // La galerie de profils reste inchangée pour ne pas supprimer ses choix.
  const gallery = MSS_COMMON_PREBUILT_AVATARS.slice(0, 12);
  let state = seedFromString(seed) || 0x9e3779b9;
  // Fisher-Yates, avec un PRNG initialisé par la session (stable et sans doublons).
  for (let i = gallery.length - 1; i > 0; i -= 1) {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    const j = (state >>> 0) % (i + 1);
    [gallery[i], gallery[j]] = [gallery[j], gallery[i]];
  }
  return gallery;
}

export function quickPartyAvatar(playerIndex: number, sessionId = FALLBACK_SESSION_SEED): string {
  const gallery = shuffledGallery(String(sessionId || FALLBACK_SESSION_SEED));
  const safeIndex = Number.isFinite(playerIndex) ? Math.max(0, Math.floor(playerIndex)) : 0;
  return gallery[safeIndex % gallery.length];
}
