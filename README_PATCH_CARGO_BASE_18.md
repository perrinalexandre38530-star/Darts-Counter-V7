# PATCH CARGO — BASE Darts-Counter-V7 (18)

Ce patch a été reconstruit directement depuis la base de référence fournie :

- `Darts-Counter-V7 (18).zip`
- SHA-256 : `a6d0e9e5fd039f55ed2dcf49bc5f932a88d9c142837aa6808fa745b76ea3279c`

## Intégration

Décompresse ce ZIP puis copie son contenu à la racine de ton projet extrait.
Les chemins `src/`, `tools/` et `package.json` doivent fusionner avec ceux du projet.

Le ZIP contient uniquement les fichiers créés ou modifiés par rapport à la base `(18)`.

## Vérification

```bash
npm run test:cargo
npm run build
```

## Contenu fonctionnel

- carte CARGO active dans la catégorie Défis ;
- ticker CARGO et ajout au bandeau des nouveaux modes ;
- 9 variantes ;
- configuration guidée et complète ;
- joueurs, équipes et bots ;
- moteur de séries, contrats, palettes, capacité, surcharge et colis ;
- clavier et cible interactive ;
- UNDO, autosauvegarde et reprise ;
- écran final ;
- historique enrichi et filtre CARGO ;
- statistiques dédiées, résumé HOME et normalisation ;
- codec compact spécialisé pour conserver le camion, les contrats et le snapshot de reprise ;
- disponibilité Android Store V1.

## Validation effectuée

- `npm run test:cargo` : OK ;
- aller-retour du codec compact CARGO : OK ;
- analyse syntaxique TypeScript/TSX des fichiers touchés : OK ;
- ticker : 800 × 230 px.

Le build npm complet n'a pas pu être lancé dans l'environnement de génération, car le registre de dépendances disponible ne fournit pas `zustand@5.0.11`. Aucun fichier de dépendances n'a été modifié pour contourner ce problème externe.
