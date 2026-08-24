# Audit Social Auth — V16

## Corrections appliquées
- Médaillons sociaux avec logos vectoriels seuls ; les noms restent uniquement dans les attributs d'accessibilité.
- 4 providers principaux : Facebook, Google, Microsoft, Apple ; 10 secondaires dans « Plus de connexions ».
- Audit de `/auth/v1/settings` avant lancement OAuth pour détecter les providers natifs activés/désactivés.
- Un provider désactivé reste dans MULTISPORTS SCORING et affiche une erreur claire au lieu d'une page JSON Supabase.
- `signInWithOAuth` utilise `skipBrowserRedirect: true` sur Web et Android pour laisser l'application contrôler l'ouverture OAuth.
- Pré-vérification de l'URL d'autorisation avant ouverture du navigateur.
- Callback Web calculé depuis `window.location.origin`; fallback officiel `https://multisports-scoring.pages.dev`.
- Callback Android conservé : `multisportsscoring://auth/callback`.
- Import du profil social/avatar, verrou global de session et vraie déconnexion conservés.

## Configuration externe encore obligatoire
Chaque provider doit être activé dans Supabase Authentication > Providers avec ses identifiants développeur. Le front-end ne peut pas créer les Client ID / secrets à la place de Google, Meta, Apple, Microsoft, etc.
Instagram (`custom:instagram`) et TikTok (`custom:tiktok`) nécessitent leurs providers OAuth personnalisés Supabase.
