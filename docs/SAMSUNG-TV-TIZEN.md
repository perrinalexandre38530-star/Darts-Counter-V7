# MULTISPORTS SCORING — Samsung TV / Tizen

## Architecture

La TV Samsung utilise un build React/Vite dédié et léger. Elle ne charge pas l'application mobile complète : elle démarre directement sur le Viewer et reçoit les snapshots live générés par le téléphone.

- Source TV : `src/tv/samsung/`
- Entrée Vite TV : `tv-samsung/`
- Config build : `vite.samsung-tv.config.ts`
- Projet Tizen : `MULTISPORTSSCORINGTV/`
- Certificat actif attendu : `MULTISPORTS_SCORING_TV`
- Application ID : `wgIoFKG6GG.MULTISPORTSSCORINGTV`
- Package ID : `wgIoFKG6GG`

Les IDs Tizen ci-dessus doivent rester stables pour toutes les mises à jour.

## Construire la version TV

Depuis la racine du projet :

```bash
npm run tv:samsung:build
```

Le build :

1. conserve `MULTISPORTSSCORINGTV/config.xml` et les métadonnées Tizen ;
2. remplace uniquement l'ancien runtime Web (`index.html` + `assets/`) ;
3. force les URLs Viewer vers la production si aucune URL n'est fournie ;
4. lance le précontrôle Samsung TV.

Pour utiliser un autre domaine de production :

```powershell
$env:VITE_VIEWER_API_URL="https://ton-domaine.example"
npm run tv:samsung:build
```

## Test sur une vraie TV Samsung

1. Activer le Developer Mode sur la TV.
2. Renseigner l'IP du PC dans le Developer Mode.
3. Redémarrer la TV.
4. Ouvrir Tizen Device Manager dans VS Code et connecter la TV.
5. Vérifier que `MULTISPORTS_SCORING_TV` est le certificat actif.
6. Dans le projet `MULTISPORTSSCORINGTV`, utiliser Build Project puis Run Project.

Le DUID ajouté au certificat sert uniquement aux appareils de développement/test. Il ne limite pas la distribution publique via Samsung Apps TV Seller Office.

## Packaging Seller Office

Une fois les tests validés, produire le package Web Tizen signé `.wgt` depuis le projet `MULTISPORTSSCORINGTV` avec le profil `MULTISPORTS_SCORING_TV`, puis envoyer ce `.wgt` dans **Package d'application** du TV Seller Office.

## Télécommande

Le build TV gère directement :

- flèches directionnelles ;
- OK / Enter ;
- Retour (code 10009 Samsung) ;
- saisie directe des lettres/chiffres lorsqu'un clavier/télécommande compatible les émet.

Sur l'écran de connexion Viewer, Retour efface un caractère ; lorsque le code est vide, Retour ferme l'application. Pendant le scoreboard, Retour revient à l'écran de code Viewer.
