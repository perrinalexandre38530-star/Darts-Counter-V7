# MULTISPORTS SCORING — Social Auth V32

## Bugs réellement corrigés

1. TikTok : le Worker V6 interprétait `error.code = "ok"` comme une erreur. TikTok V2 renvoie pourtant ce champ sur une réponse UserInfo réussie. Résultat : token OK puis `Error getting user profile from external provider`. Le Worker V7 accepte désormais `ok` / `0` comme succès et normalise le profil Supabase.
2. Snapchat : Login Kit ne fournit pas un UserInfo OAuth GET standard. Le profil se récupère par POST GraphQL sur `https://kit.snapchat.com/v1/me`. Un adaptateur `/snapchat/userinfo` est ajouté et les scopes `external_id`, `display_name`, `bitmoji.avatar` sont forcés.
3. Instagram : le front force désormais le scope moderne `instagram_business_basic`. Le Worker adapte l'autorisation, le token et normalise `graph.instagram.com/me` vers `sub/name/picture` pour Supabase.
4. PWA : le service worker ne fabrique plus de réponse HTTP 503 `Network unavailable` pour les requêtes GET ordinaires. Il continue de gérer uniquement les packs de contenu, les tuiles cartographiques et les notifications.

## Important sur la console des pages TikTok/Snap/Instagram

Les messages `bytedance://dispatch_message`, `Permissions policy violation: unload`, SDK/Bridge, etc. sont émis par les pages du fournisseur quand DevTools inspecte leur domaine. Ils ne viennent pas du bundle MULTISPORTS SCORING et ne peuvent pas être supprimés depuis l'application.

## Déploiement Worker V7

Remplacer entièrement le code du Worker Cloudflare actuel par `cloudflare/multisports-social-oauth-worker-v7.js`.

Variables/secrets Cloudflare :
- `TIKTOK_CLIENT_KEY`
- `TIKTOK_CLIENT_SECRET`
- `SNAPCHAT_CLIENT_ID`
- `SNAPCHAT_CLIENT_SECRET`
- `INSTAGRAM_CLIENT_ID`
- `INSTAGRAM_CLIENT_SECRET`

Après toute modification de variable/secret, promouvoir la nouvelle version à 100 %.

## Configuration Supabase

Lancer `tools/configure-social-custom-providers.ps1` depuis PowerShell. Le script met à jour `custom:snapchat` et `custom:instagram` vers les routes du Worker V7.

TikTok conserve les routes existantes `/authorize`, `/token`, `/userinfo` et n'a pas besoin d'être reconfiguré.

## Callback fournisseur

Chez TikTok, Snap et Meta/Instagram :
`https://rckbdaqksujehszafior.supabase.co/auth/v1/callback`

Instagram API with Instagram Login ne fonctionne qu'avec un compte Instagram professionnel Business/Creator. En mode développement Meta, le compte utilisé doit aussi être autorisé comme testeur/utilisateur de l'application.
