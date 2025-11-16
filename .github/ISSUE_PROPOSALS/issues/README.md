# Issues pour le Système de Règles de Cotisations

Ce dossier contient 7 issues prêtes à être créées sur GitHub pour implémenter un système complet de gestion des règles de cotisations sociales et fiscales.

## Liste des issues (version française)

1. **[01-schema-donnees.md](./01-schema-donnees.md)** - Schéma de données Prisma
   - Labels : `enhancement`, `database`, `payroll`, `high-priority`
   - Définir les modèles : `RegleCotisation`, `TauxCotisation`, `CategorieCotisation`, etc.

2. **[02-dsl-yaml.md](./02-dsl-yaml.md)** - DSL YAML pour décrire les règles
   - Labels : `enhancement`, `payroll`, `high-priority`
   - Format YAML simple et lisible pour définir les cotisations

3. **[03-api-gestion.md](./03-api-gestion.md)** - API de gestion des règles
   - Labels : `enhancement`, `api`, `payroll`, `high-priority`
   - Endpoints CRUD + import/export + simulateur

4. **[04-moteur-calcul.md](./04-moteur-calcul.md)** - Moteur de calcul des cotisations
   - Labels : `enhancement`, `payroll`, `high-priority`, `breaking-change`
   - Classe `MoteurCotisations` pour calculer les fiches de paie

5. **[05-interface-admin.md](./05-interface-admin.md)** - Interface d'administration web
   - Labels : `enhancement`, `frontend`, `payroll`, `admin`, `medium-priority`
   - Pages React pour gérer les règles sans code

6. **[06-donnees-france-2024.md](./06-donnees-france-2024.md)** - Données françaises 2024-2025
   - Labels : `data`, `payroll`, `france`, `medium-priority`
   - Cotisations URSSAF, AGIRC-ARRCO, CSG/CRDS avec taux officiels

7. **[07-migration-module-paie.md](./07-migration-module-paie.md)** - Migration du module existant
   - Labels : `enhancement`, `payroll`, `breaking-change`, `high-priority`
   - Remplacer le taux fixe de 25% par le système détaillé

## Comment créer les issues sur GitHub

### Option 1 : Manuellement via l'interface GitHub

1. Aller sur https://github.com/ambroise-leclerc/OpenPayFit/issues/new
2. Copier le contenu d'un fichier markdown (sans la section frontmatter `---`)
3. Coller dans le champ description
4. Ajouter le titre depuis la ligne `title:` du frontmatter
5. Ajouter les labels depuis la ligne `labels:` du frontmatter
6. Créer l'issue
7. Répéter pour les 7 issues

### Option 2 : Via l'API GitHub (si vous avez un token)

```bash
# Nécessite gh CLI installé et configuré
for file in .github/ISSUE_PROPOSALS/issues/*.md; do
  gh issue create --body-file "$file"
done
```

### Option 3 : Script Node.js

```javascript
// create-issues.js
const fs = require('fs');
const { Octokit } = require('@octokit/rest');

const octokit = new Octokit({ auth: 'VOTRE_TOKEN_GITHUB' });

const files = [
  '01-schema-donnees.md',
  '02-dsl-yaml.md',
  '03-api-gestion.md',
  '04-moteur-calcul.md',
  '05-interface-admin.md',
  '06-donnees-france-2024.md',
  '07-migration-module-paie.md'
];

async function createIssues() {
  for (const file of files) {
    const content = fs.readFileSync(`.github/ISSUE_PROPOSALS/issues/${file}`, 'utf8');

    // Parser le frontmatter
    const titleMatch = content.match(/title: "(.+)"/);
    const labelsMatch = content.match(/labels: (.+)/);

    const title = titleMatch ? titleMatch[1] : 'Sans titre';
    const labels = labelsMatch ? labelsMatch[1].split(', ') : [];

    // Extraire le body (après le frontmatter)
    const body = content.split('---\n')[2];

    await octokit.issues.create({
      owner: 'ambroise-leclerc',
      repo: 'OpenPayFit',
      title,
      body,
      labels
    });

    console.log(`✅ Issue créée : ${title}`);
  }
}

createIssues();
```

## Roadmap proposée

### Phase 1 : Fondations (Sprint 1-2)
- ✅ Issue #1 : Schéma de données
- ✅ Issue #2 : DSL YAML

### Phase 2 : Backend (Sprint 3-4)
- ✅ Issue #3 : API de gestion
- ✅ Issue #4 : Moteur de calcul
- ✅ Issue #6 : Données françaises 2024-2025

### Phase 3 : Intégration (Sprint 5)
- ✅ Issue #7 : Migration du module de paie

### Phase 4 : Interface (Sprint 6-7)
- ✅ Issue #5 : Interface d'administration

## Dépendances entre issues

```
Issue #1 (Schéma)
    ├──> Issue #2 (DSL YAML)
    │       └──> Issue #6 (Données France)
    │
    ├──> Issue #4 (Moteur)
    │       ├──> Issue #3 (API - simulateur)
    │       └──> Issue #7 (Migration)
    │
    └──> Issue #3 (API)
            └──> Issue #5 (Interface admin)
```

**Ordre recommandé** :
1. Issue #1 (bloque toutes les autres)
2. Issues #2, #4 (en parallèle)
3. Issues #3, #6 (en parallèle)
4. Issue #7 (intégration)
5. Issue #5 (interface)

## Nomenclature française

Tous les noms de classes, champs et variables utilisent le **français** :
- `RegleCotisation` au lieu de `ContributionRule`
- `typeAssiette` au lieu de `baseType`
- `calculerPaie()` au lieu de `calculatePayroll()`

**Justification** :
- Logiciel RH/Paie spécifiquement français
- Termes métier exacts ("assiette", "cotisation salariale")
- Cohérence avec la documentation URSSAF
- Utilisateurs finaux parlent français

## Estimation globale

**Temps total estimé** : 8-10 semaines (2 développeurs)

| Issue | Complexité | Temps estimé |
|-------|-----------|--------------|
| #1 - Schéma | Moyenne | 1 semaine |
| #2 - DSL YAML | Faible | 3 jours |
| #3 - API | Moyenne | 1 semaine |
| #4 - Moteur | Élevée | 2 semaines |
| #5 - Interface | Moyenne | 2 semaines |
| #6 - Données | Faible | 3 jours |
| #7 - Migration | Élevée | 1 semaine |

## Support

Pour toute question sur ces issues, consulter :
- Document complet : [contribution-rules-system-fr.md](../contribution-rules-system-fr.md)
- Guide projet : [/CLAUDE.md](/CLAUDE.md)
- Spécifications : [/docs/SPECIFICATIONS.md](/docs/SPECIFICATIONS.md)

---

**Créé par** : Claude Code
**Date** : 2025-11-16
**Version** : 1.0
