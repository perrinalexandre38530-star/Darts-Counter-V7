---
name: ui-responsive-performance
description: "Use when adjusting MULTISPORTS SCORING UI, portrait/landscape responsiveness, training page, tickers, buttons or mobile render performance."
---

# Compétence ui-responsive-performance

**Objectif métier :** Offrir une interface fluide, lisible, cohérente sans écrans tronqués ni scroll imposé.

**Autorisation maximale :** Modifier présentation/style/composants de l'écran demandé uniquement.

**Interdictions :** Ne pas changer le scoring, la persistance ou l'authentification pour corriger un visuel ; ne pas ajouter d'animation lourde sans mesure.

## Procédure obligatoire
1. Capturer l'écran actuel sur largeurs et hauteurs cibles et définir problèmes exacts.
2. Préserver le ticker, BackDot, Awena, keypad fixe et logique portrait/paysage applicable.
3. Vérifier hauteur mobile sans scroll non désiré, orientation paysage non aplatie, tailles tactiles et zoom.
4. Réutiliser thèmes, traductions, états désactivés et composants ; limiter re-renders et animations.
5. Contrôler accessibilité, lisibilité, navigation clavier/tactile et images manquantes.

## Preuves exigées avant de conclure
- npm run typecheck
- npm run build
- npm run test:navigation-performance
- Captures comparatives portrait/paysage, PC/Android si possible ; déclarer si appareils indisponibles.

## Règles transversales
Lire `AGENTS.md` et `docs/AI_COMPETENCIES.md`. Se limiter à une mission ; s'arrêter si un résultat obligatoire échoue ou si les données nécessaires ne sont pas disponibles. Ne jamais déclarer les contrôles passés sans exécution. Toute PR doit contenir un rapport avant/après, les changements, les commandes exactes, les sorties de tests et les risques restants.
