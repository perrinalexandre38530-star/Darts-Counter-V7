---
name: cloud-backup-recovery
description: "Use when working on NAS QNAP, Google Drive, OneDrive, Dropbox, backup snapshots, deltas, cloud sync, restore or local storage destinations."
---

# Compétence cloud-backup-recovery

**Objectif métier :** Fiabiliser sauvegarde/restauration incrémentale sans perdre ni dupliquer les données.

**Autorisation maximale :** Modifier la couche stockage/sync ciblée en s'appuyant sur simulations et données de test.

**Interdictions :** Aucune suppression distante, aucun token réel ou nouvelle migration SQL sans validation ; ne jamais changer une sauvegarde de référence.

## Procédure obligatoire
1. Distinguer source autoritaire, état local, snapshot, deltas, compaction et curseur de synchronisation.
2. Reproduire avec des fixtures de deux appareils et réseaux lent/interrompu ; tester relecture/retry/idempotence.
3. Comparer la restauration sur PC et Android, notamment historique et médias non bloquants.
4. Isoler les particularités NAS, Drive, OneDrive, Dropbox, SD/USB/dossier et détecter credentials expirés/permissions.
5. Tester un aller-retour export/import/restore complet avec contrôle des IDs, quantités, hashes et absence de doublons.
6. Signaler toute modification des contrats cloud, API, SQL, RGPD et auth pour accord humain.

## Preuves exigées avant de conclure
- npm run test:storage
- npm run test:sync
- npm run test:cloud-routing
- npm run test:history-integrity
- npm run test:personal-cloud:v148
- npm run test:cloud-sync-startup:v148
- Simulation de panne, reprise et restauration fidèle explicitement démontrée.

## Règles transversales
Lire `AGENTS.md` et `docs/AI_COMPETENCIES.md`. Se limiter à une mission ; s'arrêter si un résultat obligatoire échoue ou si les données nécessaires ne sont pas disponibles. Ne jamais déclarer les contrôles passés sans exécution. Toute PR doit contenir un rapport avant/après, les changements, les commandes exactes, les sorties de tests et les risques restants.
