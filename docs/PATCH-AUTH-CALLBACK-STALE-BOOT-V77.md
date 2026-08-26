# PATCH AUTH CALLBACK STALE BOOT — BASE V77

## Symptôme corrigé
Chrome/PWA pouvait rouvrir MULTISPORTS SCORING sur la dernière URL visitée :
`/#/auth/callback?code=...`.

Le code OAuth ayant déjà été consommé et son verifier PKCE supprimé, l'application
rejouait le callback à chaque démarrage et affichait systématiquement :
`PKCE code verifier not found in storage`.

## Correctif
- détection ultra-précoce d'un callback OAuth restauré sans contexte actif ;
- conservation des vrais retours OAuth (pending provider / callback natif / verifier PKCE) ;
- suppression du callback obsolète avant le routage React ;
- retour au démarrage normal `gameSelect` (le gate compte renvoie vers Connexion si nécessaire) ;
- suppression du pending social + verifier PKCE obsolètes ;
- après succès ou erreur, l'URL courante est marquée `handled=1` avec `history.replaceState` ;
- le code OAuth n'est donc jamais retraité après refresh ou prochain lancement ;
- l'écran d'erreur reste visible pendant l'exécution courante, sans provoquer de boucle au prochain boot.

## Fichiers modifiés
- `src/App.tsx`
- `src/lib/socialAuth.ts`

## Test ajouté
- `tools/test-auth-callback-startup-v77.mjs`
