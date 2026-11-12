---
name: monetization-safety
description: "Use when reviewing ads, premium entitlements, Google Play Billing, AdMob consent or club monetization offers."
---

# Compétence monetization-safety

**Objectif métier :** Préserver revenus, conformité, consentements et lisibilité du score.

**Autorisation maximale :** Analyse et patch ciblé sur sandbox et branche de mission.

**Interdictions :** Pas de modification de prix, paiement réel, activation pubs live, modification de clés ou envoi de campagnes sans accord.

## Procédure obligatoire
1. Identifier le contexte : ads, Premium, play billing, consentement, restrictions de plateforme.
2. Tester revenus simulés, abonnements actifs/expirés, restauration achats, refus de consentement.
3. Vérifier que les encarts ne masquent pas scores, keypad, matchs ni navigation.
4. Évaluer conformité et impacts sur confidentialité sans enregistrer d'identifiants sensibles.
5. Soumettre toute activation en production et toute modification d'offre à une revue humaine.

## Preuves exigées avant de conclure
- npm run test:monetization
- npm run test:admob-native
- npm run test:play-billing
- npm run test:play-privacy
- Captures et résultats des scénarios gratuits/Premium/consentement.

## Règles transversales
Lire `AGENTS.md` et `docs/AI_COMPETENCIES.md`. Se limiter à une mission ; s'arrêter si un résultat obligatoire échoue ou si les données nécessaires ne sont pas disponibles. Ne jamais déclarer les contrôles passés sans exécution. Toute PR doit contenir un rapport avant/après, les changements, les commandes exactes, les sorties de tests et les risques restants.
