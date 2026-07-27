# MULTISPORTS SCORING — tests automatiques

## Objectif

Le Quality Gate évite de refaire manuellement les mêmes contrôles après chaque patch.

### `npm run test:auto`

Exécuté automatiquement par GitHub Actions à chaque push/PR sur `main` :

- TypeScript ;
- build Vite ;
- invariants Auth ;
- synchronisation Cloud ;
- contrats Cloud public / NAS privé ;
- proximité (migration, PostGIS, RPC, confidentialité) ;
- régressions X01, Baseball, Shooter, Loterie et historique profils liés ;
- monétisation ;
- bootstrap Android ;
- AdMob natif ;
- Google Play Billing.

### `npm run test:live`

Test d'intégration réel Supabase. Il crée deux comptes temporaires, réalise le scénario puis les supprime :

1. connexion de deux comptes ;
2. activation de la proximité ;
3. détection par distance ;
4. vérification qu'aucune coordonnée GPS n'est exposée ;
5. contrôle RLS des coordonnées brutes ;
6. visibilité OFF ;
7. filtres sport / disponible / cherche une partie ;
8. proposition de partie + acceptation ;
9. demande d'ami + acceptation ;
10. message privé ;
11. salon ONLINE à deux joueurs ;
12. création/mise à jour d'un match et chat de salon ;
13. nettoyage automatique des comptes et lignes E2E.

## Configuration GitHub — une seule fois

Dans **Settings → Secrets and variables → Actions**, créer :

- `SUPABASE_TEST_URL`
- `SUPABASE_TEST_ANON_KEY`
- `SUPABASE_TEST_SERVICE_ROLE_KEY`

Idéalement, ces secrets pointent vers un projet Supabase de test/staging ayant reçu les mêmes migrations que la production. La `service role` ne doit jamais être ajoutée à `VITE_*`, au frontend ou au dépôt Git.

Le workflow `.github/workflows/quality-gate.yml` lance les tests statiques/régressions à chaque push et le test Supabase réel après succès, ainsi qu'une fois par nuit.

## Commandes utiles

```bash
npm run test:auto
npm run test:live
npm run test:release
```

`test:release` impose les deux couches : tests locaux + intégration Supabase réelle.
