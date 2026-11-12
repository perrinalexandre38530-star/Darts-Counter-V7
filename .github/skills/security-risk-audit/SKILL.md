---
name: security-risk-audit
description: "Use when reviewing MULTISPORTS SCORING code changes for authentication, secrets, privacy, SQL, data integrity or changes that can harm production."
---

# Compétence security-risk-audit

**Objectif métier :** Auditer les risques et vérifier les permissions sans écrire de code de production.

**Autorisation maximale :** Lecture et commentaires d'audit uniquement ; aucun changement de la PR testée.

**Interdictions :** Pas de merge, approbation automatique, commande destructive, déploiement, modification de sécurité en production ou utilisation de vrais secrets.

## Procédure obligatoire
1. Lire le diff entier, configuration, permissions Actions, dépendances et surfaces accessibles.
2. Vérifier fuite de secrets, auth, CORS, données personnelles, endpoints et chemins de retour arrière.
3. Rechercher suppressions, migrations irréversibles et divergences History/statistiques/sauvegardes.
4. Classer constats critique/élevé/moyen/faible avec preuve, chemin/ligne et mesure proposée.
5. Si code hors périmètre ou preuves insuffisantes : bloquer ; sinon conclure prêt pour revue humaine, jamais fusionner.

## Preuves exigées avant de conclure
- Une analyse indépendante, traçable, pour tout patch de données/sécurité.
- Aucun constat grave ouvert pour une livraison.
- Rapport des zones non auditées.

## Règles transversales
Lire `AGENTS.md` et `docs/AI_COMPETENCIES.md`. Se limiter à une mission ; s'arrêter si un résultat obligatoire échoue ou si les données nécessaires ne sont pas disponibles. Ne jamais déclarer les contrôles passés sans exécution. Toute PR doit contenir un rapport avant/après, les changements, les commandes exactes, les sorties de tests et les risques restants.
