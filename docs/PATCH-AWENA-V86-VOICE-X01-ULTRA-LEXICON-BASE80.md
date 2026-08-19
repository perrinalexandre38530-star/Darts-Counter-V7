# MULTISPORTS SCORING — AWENA V8.6 ULTRA LEXICON + VOICE X01

Base de référence : `Darts-Counter-V7 (80).zip`.

## 1. Encyclopédie V8.6

La V8.6 ajoute `AwenaUltraLexicon.ts`, soit 466 nouvelles entrées structurées couvrant :

- Fléchettes : matériel, lexique, technique, trajectoire, entraînement, scoring et vocabulaire de compétition.
- Pétanque : point, tir, tactique, terrain, boules et vocabulaire.
- Tennis de table : coups, effets, service, retour, tactique et matériel.
- Football : règles, postes, systèmes, phases de jeu, statistiques et analyse.
- Baby-foot : positions, techniques et vocabulaire.
- Mölkky : tactique, vocabulaire et gestion du score.
- Dés : vocabulaire, probabilités et situations de jeu.
- Statistiques : indicateurs, dispersion, comparaison, tendances et interprétation.
- Application : architecture MULTISPORTS SCORING, données, profils, équipes, scoring, Android, Awena et commandes vocales.

Ces 466 entrées complètent les 320 fiches Omni V8.5 et les 94 références expertes V8.4.

## 2. Commande « Awena… »

Nouveau moteur `AwenaSpeechRecognition` :

- Android : `SpeechRecognizer` natif.
- API 31+ : préférence pour `createOnDeviceSpeechRecognizer` si disponible.
- Fallback : recognizer Android système.
- Navigateur : fallback Web Speech lorsqu'il est exposé.
- Permission Android : `RECORD_AUDIO`.
- Le micro est suspendu pendant la synthèse vocale d'Awena afin d'éviter l'auto-détection.
- L'écoute est limitée à l'application ouverte / au premier plan dans ce pilote.

Le mot d'appel accepte des variantes usuelles de transcription : `Awena`, `Awéna`, `Avena`, `A Wena`, `Wena`.

## 3. Pilote X01

Commande de départ :

> « Awena, lance une partie de X01 »

Awena ouvre `x01_config_v3`, active la vue guidée, puis conduit oralement les étapes :

1. Joueurs ou équipes.
2. Sélection des profils/bots par nom, ou équipes enregistrées.
3. Score de départ 301 / 501 / 701 / 901.
4. Simple / Double / Master IN.
5. Simple / Double / Master OUT.
6. Format en sets ou legs.
7. Best Of / First To pour sets et legs.
8. Ordre alterné ou aléatoire.
9. Méthode de saisie : keypad / cible / presets / voice.
10. Sons arcade.
11. Bruitages d'impact.
12. Voix de partie.
13. Comptage externe et type d'appareil.
14. Récapitulatif vocal.
15. Confirmation puis lancement via le vrai `handleStart()` X01.

Commandes de contrôle disponibles pendant le dialogue : `annule`, `stop`, `recommence`.

Les réglages compris vocalement mettent à jour en temps réel les vrais états et contrôles visibles de `X01ConfigV3`.

### Limite volontaire du pilote équipes

La sélection vocale d'équipes V8.6 prend en charge les **équipes Fléchettes enregistrées**. La composition orale d'équipes manuelles et le brassage automatique restent accessibles à l'écran et seront étendus dans une version ultérieure.

## 4. Questions générales à la voix

Lorsque aucun dialogue guidé n'est actif, une phrase comme :

> « Awena, c'est quoi un checkout ? »

est transmise à l'encyclopédie d'Awena et la réponse est prononcée si la voix est activée.

## 5. Réglages

La section Awena des Settings contient désormais :

- activation/désactivation des commandes vocales ;
- demande explicite de permission micro ;
- état du moteur de reconnaissance ;
- état de la permission ;
- préférence reconnaissance sur appareil.

La fonctionnalité est désactivée par défaut pour ne pas ouvrir le micro sans action de l'utilisateur.

## 6. Contrôles réalisés

- `npm run typecheck` : OK.
- `npm run test:awena:v86` : OK.
- V8.5 : OK.
- V8.4 : OK.
- V8.3 : OK.
- 466 entrées Ultra Lexicon détectées.
- Manifest Android : permission + RecognitionService présents.
- MainActivity : plugin enregistré.
- Plugin natif : on-device + fallback système détectés par test structurel.

Le build Vite n'a pas pu être exécuté dans l'environnement de patch (`vite` absent). La compilation Gradle n'a pas pu télécharger la distribution Gradle faute d'accès réseau du sandbox.
