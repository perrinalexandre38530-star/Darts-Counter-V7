---
name: android-tizen-release
description: "Use when working on Android Capacitor or Samsung Tizen code, Android TV layouts, cross-device controls or mobile native build troubleshooting."
---

# Compétence android-tizen-release

**Objectif métier :** Maintenir Android et Samsung Tizen sans casser l'app Web ni les signatures.

**Autorisation maximale :** Modifier uniquement intégrations ou UI natives désignées ; builds sans publication.

**Interdictions :** Ne pas changer package ID, signature, certificats, distribution Play/Tizen, permissions ou synchronisation des données en production sans accord.

## Procédure obligatoire
1. Identifier plateforme, SDK, tooling et version source vérifiée.
2. Séparer erreur Web/React d'une erreur Capacitor native ou Tizen.
3. Contrôler layout horizontal, télécommande et cohérence téléphone/TV lorsque concernés.
4. Construire la variante en test ; ne pas annoncer que cela fonctionne sur appareil sans test réel.
5. Décrire instructions de test physique et rollback sans distribuer ni signer de release.

## Preuves exigées avant de conclure
- npm run typecheck
- npm run test:android-bootstrap
- npm run test:android-store-v1
- npm run tv:samsung:check (si TV)
- Build/debug ciblé et essai matériel requis pour validation complète.

## Règles transversales
Lire `AGENTS.md` et `docs/AI_COMPETENCIES.md`. Se limiter à une mission ; s'arrêter si un résultat obligatoire échoue ou si les données nécessaires ne sont pas disponibles. Ne jamais déclarer les contrôles passés sans exécution. Toute PR doit contenir un rapport avant/après, les changements, les commandes exactes, les sorties de tests et les risques restants.
