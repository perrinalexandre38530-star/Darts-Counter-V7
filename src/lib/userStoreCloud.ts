// Supabase est volontairement limité à l'authentification et aux données
// utilisateur légères (profil / index). Les snapshots, parties, historiques,
// statistiques et sauvegardes sont stockés dans Cloudflare R2, sur le NAS,
// dans IndexedDB ou dans un fichier choisi par l'utilisateur.
//
// Ces deux fonctions restent exportées pour compatibilité avec d'anciens imports,
// mais elles n'effectuent plus aucune lecture ni écriture dans public.user_store.

export async function loadUserStoreCloud(_userId: string) {
  return null;
}

export async function saveUserStoreCloud(_userId: string, _payload: any, _version = 8) {
  return {
    ok: false,
    skipped: true,
    reason: "supabase_auth_profile_only",
  };
}
