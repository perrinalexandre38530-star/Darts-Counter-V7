# MSS AI CONTROL V0 — premier centre de commande mobile

## Ce qui est préparé
GitHub Issues + un rapport GitHub Actions **en lecture seule**. Cette V0 ne remplace pas la future interface Web/PWA privée ; elle en est la base testable sans jeton personnel et sans appel à un moteur IA payant.

### Accès sur mobile
1. Ouvrir le [dépôt Darts-Counter-V7](https://github.com/perrinalexandre38530-star/Darts-Counter-V7).
2. Aller dans **Issues**, puis **New issue** et sélectionner **Mission pour un agent IA** (accessible dès que la PR #23 est fusionnée).
3. Indiquer l'agent, l'objectif, les fichiers à préserver, les critères et le risque. À ce stade, la mission est seulement enregistrée : aucun robot ne la lance.
4. Pour visualiser les rapports après fusion, ouvrir **Actions** → **MSS AI CONTROL - suivi des missions (lecture seule)** → dernier run → **Summary** (résumé), ou télécharger l'artifact JSON/Markdown.
5. Le workflow est prévu en déclenchement manuel et quotidien à 06:35 **UTC**, uniquement une fois présent dans `main`. Pas de garantie de démarrage à la seconde.

### Précisions de sécurité
- Le dépôt est **public**, donc les titres des GitHub Issues, PR et résumés d'Actions sont publics. Ne jamais y écrire de mots de passe, tokens, données privées ou historiques de joueurs.
- Cette surveillance n'exécute **aucune tâche de développement**, ne crée aucune branche, ne répond à aucun tiers, ne fusionne ni ne déploie.
- `GITHUB_TOKEN` est le jeton éphémère fourni par GitHub Actions avec permissions de lecture seulement, jamais conservé dans la page ni dans les rapports.
- Un seul niveau d'autorisation de mise en oeuvre est une **Issue** approuvée par le propriétaire ; une étiquette GitHub ne vaut jamais autorisation de merge.
- Quand le moteur IA sera choisi, l'orchestrateur devra confirmer l'identité de l'approbateur (et non seulement lire une étiquette modifiable par d'autres), le budget disponible, les skills certifiées et les SHA cibles. Laisser la version V0 en observation pendant cette conception.

### Champs de statut envisagés
`mss:draft`, `mss:approved`, `mss:queued`, `mss:running`, `mss:review`, `mss:blocked`. Sans étiquette, une mission est **À QUALIFIER**. Ces étiquettes ne sont pas créées automatiquement par la V0.

### Activation de l'autonomie réelle (V1)
- Sécuriser `main` avec un ruleset obligatoire, CI, revues et restriction de push.
- Vérifier le plan d'accès au moteur IA, son coût et ses secrets puis activer GitHub Agentic Workflows (`gh-aw`) et la compilation en `.lock.yml` après contrôle du fichier généré.
- Commencer avec une mission de QA en lecture seule ; préparer seulement une PR de test si le pilote est concluant.
- Concevoir ensuite l'interface privée indépendante avec authentification côté serveur, synchronisation GitHub, budgets et arrêt d'urgence.

## Tests locaux
```sh
node --test tools/test-ai-control-report.mjs
node tools/test-ai-team-contracts.mjs
```
Le test du rapport est reproductible sans réseau ni identifiant GitHub. Le test de contrat vérifie les profils et skills dans la branche. Aucun test de production n'est implicite.
