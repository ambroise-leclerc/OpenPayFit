# Templates d'Issues GitHub

Ce dossier contient des templates pour créer des issues structurées et complètes sur le projet OpenPayFit.

## Templates disponibles

### `feature_dsn.md` - Support de la DSN

Template complet pour l'implémentation de la Déclaration Sociale Nominative (DSN). Cette fonctionnalité est critique pour la conformité légale en France.

**Utilisation :**
1. Créer une nouvelle issue sur GitHub
2. Copier le contenu de `feature_dsn.md`
3. Adapter les sections si nécessaire
4. Ajouter les labels suggérés

## Conventions

- ✅ Toutes les issues doivent être rédigées en **français**
- ✅ Utiliser une structure claire avec des sections bien définies
- ✅ Inclure des critères d'acceptation précis
- ✅ Fournir des références et ressources
- ✅ Estimer la complexité et la durée
- ✅ Proposer un plan de mise en œuvre

## Création d'un nouveau template

Si vous souhaitez ajouter un nouveau template d'issue :

1. Créer un fichier `.md` dans ce dossier
2. Inclure les métadonnées YAML en en-tête :
   ```yaml
   ---
   name: Nom de l'issue
   about: Description courte
   title: '[LABEL] Titre par défaut'
   labels: label1, label2
   assignees: ''
   ---
   ```
3. Structurer le contenu avec des sections claires
4. Mettre à jour ce README

## Ressources

- [Guide GitHub Issues](https://docs.github.com/fr/issues)
- [Templates d'Issues](https://docs.github.com/fr/communities/using-templates-to-encourage-useful-issues-and-pull-requests/configuring-issue-templates-for-your-repository)
