# RUNNING V3 — PATCH MANUEL

Base de référence : `Darts-Counter-V7(7).zip`

## Important
Ce patch est volontairement limité au module RUNNING. Il ne modifie PAS :
- `src/App.tsx`
- `src/pages/GameSelect.tsx`
- `src/components/SportQuickSwitch.tsx`
- `src/config/androidStoreV1.ts`
- `android/app/src/main/AndroidManifest.xml`

RUNNING reste donc hors de la whitelist Android Store V1. La V3 est à tester sur Web/PWA avant toute activation Android.

## Fichiers du patch
- MODIFIÉ `src/activity/activityTypes.ts`
- MODIFIÉ `src/activity/activityMath.ts`
- NOUVEAU `src/activity/runningInsights.ts`
- MODIFIÉ `src/pages/running/RunningHome.tsx`
- MODIFIÉ `src/pages/running/RunningModule.tsx`

## Principales améliorations V3
- HOME Running beaucoup plus riche et fidèle à MULTISPORTS SCORING : profil actif, ArcadeTicker, KPIs, XP/niveau, objectif hebdo réglable, challenges, 7 jours, 4 semaines, records, sorties récentes, recommandation coach.
- Formats : Course libre, 1 km, 5 km, 10 km.
- Entraînements structurés : Easy Run 30 min, Tempo 35 min, Intervalles 6×1'/1', Long Run 60 min, Récupération 20 min.
- PACER : 5 km / 10 km / semi / marathon + choix d'allure cible.
- Départ avec compte à rebours 3-2-1-GO.
- Test GPS avant départ + indicateur de qualité.
- Écran live : distance, temps, allure moyenne, allure live glissante, vitesse, D+, précision, temps en mouvement.
- PACER live : avance/retard sur objectif et temps d'arrivée projeté.
- Entraînements live : bloc courant, temps restant, progression de phase.
- Tours manuels (LAP) + splits kilométriques automatiques.
- Vibration légère sur split/tour lorsque le navigateur/appareil le permet.
- Correction majeure : les splits utilisent désormais le temps actif et excluent les pauses.
- Historique filtrable : toutes / libres / séances / pacer.
- Meilleurs efforts 1 km / 5 km / 10 km calculés à partir de tous les tracés GPS, pas seulement des sorties lancées avec un objectif prédéfini.
- Résultat post-course : badges première sortie, plus longue sortie, nouveaux PR, negative split, score de régularité.
- FR / EN / ES intégrés dans les nouveaux écrans.

## Contrôles effectués
- Parsing TypeScript/TSX des 5 fichiers : OK.
- Typecheck isolé du module RUNNING avec stubs des composants externes : OK.
- Test moteur sur trajet synthétique : calcul distance / meilleur effort / split : OK.
- Test spécifique pause : 10 min de course + longue pause => split 1 km ~10:00 (pause exclue) : OK.
- Hashes des fichiers App/GameSelect/Android/QuickSwitch : identiques à la base.

## Limitation du contrôle local
Le build npm complet n'a pas pu être relancé dans l'environnement de génération car les dépendances du ZIP ne sont pas embarquées et l'accès au registre npm est indisponible. Le contrôle TypeScript ciblé et les tests du moteur ont en revanche été exécutés.

## Méthode d'intégration conseillée
1. Faire une copie de ton projet actuel.
2. Comparer `PATCH_DIFF.txt`.
3. Copier uniquement les 5 fichiers ci-dessus en respectant l'arborescence.
4. Tester Web/PWA : HOME Running, configuration, GPS, pause/reprise, LAP, fin de sortie, historique, records.
5. Ne pas activer Android tant que le tracking natif écran verrouillé / arrière-plan n'est pas développé et validé.
