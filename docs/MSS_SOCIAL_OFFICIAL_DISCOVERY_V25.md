# MSS SOCIAL-001 — Liens officiels et référencement (V7(25))

## Corrections effectives

Le site public expose maintenant deux liens officiels dans le footer de `PublicLandingPage.tsx` (visible dans toutes les langues). Les données structurées `sameAs` sont mises à jour dans `index.html`, `public/seo/entity.json` et les pages d'accueil publiques des **22 langues** (`public/<lang>/index.html`). Le générateur `tools/build-seo-public-pages.mjs` est aussi corrigé : **un prochain `npm run seo:build` ne supprimera pas les liens**. Le marqueur OpenGraph/X `twitter:site` pointe vers `@multisportsscor`.

- X (Twitter) : https://x.com/multisportsscor
- YouTube : https://www.youtube.com/@MultisportsScoring

**Important :** aucun lien Instagram/Threads/Facebook/TikTok/Pinterest/LinkedIn n'a été ajouté : leur propriété n'est pas vérifiée. Cela empêche de diriger les visiteurs MSS vers un compte tiers ou inexistant. L'absence de résultat public sur Instagram/Threads ne prouve **pas** la disponibilité des identifiants.

## Déploiement

Patch **additif/remplacements ciblés uniquement** depuis `Darts-Counter-V7(25).zip`. Extraire le ZIP à la racine du projet (mêmes chemins). Les autres fichiers restent intacts. **Aucun `package.json` inclus**, aucun changement de dépendances, ni de script npm, ni de branche Git.

Après installation : exécuter le test local `node tools/test-mss-social-links-v25.mjs` depuis la racine et, idéalement, les contrôles du build habituel avant déploiement. Les liens ne seront publics qu'après publication de la nouvelle version du site. **Ce ZIP ne déploie rien.**

## Compte utilisateur / consentements

YouTube et X sont vérifiés. YouTube est relié à Metricool ; X n'y est pas encore relié. La création de nouveaux comptes reste soumise à la vérification et aux règles propres à chaque plateforme. Aucun mot de passe, OTP, date de naissance ou cookie n'a été utilisé dans le patch.

Instagram/Threads : exiger un compte Meta réel à créer/activer sur le site officiel, puis robots pour identité et profil. Facebook : créer uniquement une Page depuis un profil administrateur humain authentifié. TikTok : âge réel requis. LinkedIn : compte administrateur réel. Ne jamais créer de faux profil ni partager de données sensibles par GitHub.

## Revue

Mission GitHub : https://github.com/perrinalexandre38530-star/Darts-Counter-V7/issues/47
Lancement de la communication YouTube : quatre Shorts déjà présents dans V7(25), mais non publiés ni programmés à cette étape.
