# Scripts utilitaires

Ce dossier contient des scripts utilitaires pour le projet OpenPayFit.

## Scripts disponibles

### `creer-issues-github.js`

Crée automatiquement les 7 issues GitHub pour le système de règles de cotisations.

**Prérequis** :
- Node.js 18+ (avec support de `fetch`)
- Un token GitHub avec permission `repo`

**Créer un token GitHub** :
1. Aller sur https://github.com/settings/tokens
2. Cliquer sur "Generate new token" > "Generate new token (classic)"
3. Donner un nom au token (ex: "OpenPayFit Issues Creator")
4. Cocher la permission **`repo`** (Full control of private repositories)
5. Cliquer sur "Generate token"
6. **Copier le token** (vous ne pourrez plus le voir ensuite)

**Usage** :
```bash
# Depuis la racine du projet
GITHUB_TOKEN=votre_token_github node scripts/creer-issues-github.js
```

**Exemple** :
```bash
GITHUB_TOKEN=ghp_abcdef1234567890 node scripts/creer-issues-github.js
```

**Ce que fait le script** :
1. Lit les 7 fichiers markdown dans `.github/ISSUE_PROPOSALS/issues/`
2. Parse le frontmatter YAML (titre, labels)
3. Crée chaque issue via l'API GitHub REST
4. Affiche un résumé avec les URLs des issues créées

**Sortie attendue** :
```
🚀 Création des issues GitHub pour le système de règles de cotisations

Repository: ambroise-leclerc/OpenPayFit

[1/7] Traitement de 01-schema-donnees.md...
  📝 Titre: [FEATURE] Définir le schéma de données pour les règles de cotisations et fiscales
  🏷️  Labels: enhancement, database, payroll, high-priority
  ✅ Issue créée: #42
  🔗 URL: https://github.com/ambroise-leclerc/OpenPayFit/issues/42

[2/7] Traitement de 02-dsl-yaml.md...
  📝 Titre: [FEATURE] Créer un DSL pour décrire les règles de cotisations
  🏷️  Labels: enhancement, payroll, high-priority
  ✅ Issue créée: #43
  🔗 URL: https://github.com/ambroise-leclerc/OpenPayFit/issues/43

...

═══════════════════════════════════════════════════════════
✨ Toutes les issues ont été créées avec succès!

1. #42 - [FEATURE] Définir le schéma de données pour les règles de cotisations et fiscales
   https://github.com/ambroise-leclerc/OpenPayFit/issues/42

2. #43 - [FEATURE] Créer un DSL pour décrire les règles de cotisations
   https://github.com/ambroise-leclerc/OpenPayFit/issues/43

...

═══════════════════════════════════════════════════════════

📋 Prochaines étapes:
  1. Vérifier les issues créées sur GitHub
  2. Ajuster l'ordre ou les priorités si nécessaire
  3. Assigner les issues aux développeurs
  4. Créer un projet GitHub pour suivre l'avancement

🎯 Bon développement!
```

**Gestion des erreurs** :
- Si le token est invalide : erreur HTTP 401
- Si le token n'a pas la permission `repo` : erreur HTTP 403
- Si le repository n'existe pas : erreur HTTP 404
- Si le réseau est indisponible : erreur de connexion

**Sécurité** :
- ⚠️ **Ne jamais committer le token GitHub dans le code**
- Le token doit être passé via une variable d'environnement
- Après création des issues, vous pouvez révoquer le token sur GitHub

**Alternative sans script** :

Si vous préférez créer les issues manuellement :
1. Aller sur https://github.com/ambroise-leclerc/OpenPayFit/issues/new
2. Ouvrir chaque fichier `.md` dans `.github/ISSUE_PROPOSALS/issues/`
3. Copier le titre et le contenu (sans les `---`)
4. Ajouter les labels manuellement
5. Créer l'issue

---

## Autres scripts (à venir)

- `chargerCotisations.ts` - Charger les données de cotisations françaises 2024
- `migrerFichesPaie.ts` - Migrer les anciennes fiches de paie
- `exporterComptabilite.ts` - Exporter les écritures comptables
