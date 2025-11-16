# DSL des Règles de Cotisations

## Vue d'ensemble

Le DSL (Domain-Specific Language) des règles de cotisations est un format YAML déclaratif permettant de définir les cotisations sociales et fiscales de manière lisible et maintenable. Ce format est conçu pour être compréhensible par des non-développeurs (RH, comptables) tout en permettant un contrôle de version via Git.

## Objectifs

- ✅ **Lisibilité** : Format clair et structuré, compréhensible sans expertise technique
- ✅ **Maintenabilité** : Facile à modifier et à mettre à jour
- ✅ **Validation** : Validation automatique des règles avec des messages d'erreur explicites
- ✅ **Versionning** : Historique des modifications via Git
- ✅ **Conformité** : Respect des règles françaises de cotisations sociales

## Structure du fichier YAML

### En-tête du fichier

Chaque fichier de règles de cotisations doit contenir un en-tête avec les informations suivantes :

```yaml
version: "1.0"                           # Version du format YAML (requis)
date_creation: "2024-01-01"              # Date de création au format YYYY-MM-DD (requis)
description: "Description du fichier"    # Description optionnelle
cotisations: []                          # Liste des règles de cotisations (requis, min 1)
```

### Structure d'une règle de cotisation

Chaque règle de cotisation contient les champs suivants :

#### Champs d'identification

| Champ | Type | Requis | Description |
|-------|------|--------|-------------|
| `code` | string | ✅ | Code unique identifiant la cotisation (ex: `SS_MALADIE_SAL`) |
| `nom` | string | ✅ | Nom lisible de la cotisation (ex: "Assurance maladie - Part salariale") |
| `categorie` | enum | ✅ | Catégorie de cotisation (voir énumérations ci-dessous) |
| `organisme` | enum | ✅ | Organisme collecteur (voir énumérations ci-dessous) |
| `type` | enum | ✅ | Type de cotisation (voir énumérations ci-dessous) |
| `actif` | boolean | ✅ | Indicateur d'activation de la règle (true/false) |

#### Bloc de calcul

Le bloc `calcul` définit la méthode de calcul de la cotisation :

```yaml
calcul:
  type: POURCENTAGE              # Type de calcul (requis)
  assiette: SALAIRE_BRUT        # Assiette de calcul (requis)
  plafond: 46368                # Plafond optionnel (nombre positif ou null)
  plancher: 0                   # Plancher optionnel (nombre >= 0 ou null)
```

**Types de calcul** (`type`) :
- `POURCENTAGE` : Calcul en pourcentage de l'assiette
- `MONTANT_FIXE` : Montant fixe indépendant du salaire
- `TRANCHES` : Calcul par tranches (non encore implémenté)

**Assiettes de calcul** (`assiette`) :
- `SALAIRE_BRUT` : Salaire brut total
- `SALAIRE_NET` : Salaire net imposable
- `SALAIRE_PLAFONNE` : Salaire plafonné au PASS ou multiple du PASS

#### Bloc de taux

Le bloc `taux` contient la liste des taux applicables avec leurs périodes de validité :

```yaml
taux:
  - taux: 0.0755                # Taux entre 0 et 1 (requis)
    date_debut: "2024-01-01"    # Date de début au format YYYY-MM-DD (requis)
    date_fin: null              # Date de fin optionnelle (null si toujours en vigueur)
  - taux: 0.0700                # Taux précédent (historique)
    date_debut: "2022-01-01"
    date_fin: "2023-12-31"
```

**Règles** :
- Au moins un taux doit être défini
- Le taux doit être compris entre 0 et 1 (0% à 100%)
- Les dates doivent être au format `YYYY-MM-DD`
- `date_fin` peut être `null` pour indiquer que le taux est toujours en vigueur

#### Bloc de comptabilité (optionnel)

Le bloc `comptabilite` définit les comptes comptables à débiter et créditer :

```yaml
comptabilite:
  compte_debit: "6451"          # Numéro de compte à débiter
  compte_credit: "431"          # Numéro de compte à créditer
```

## Énumérations

### Catégories de cotisations

| Code | Description |
|------|-------------|
| `SECURITE_SOCIALE` | Cotisations de sécurité sociale (maladie, famille, etc.) |
| `RETRAITE` | Cotisations de retraite de base et complémentaire |
| `CHOMAGE` | Cotisations d'assurance chômage |
| `COMPLEMENTAIRE` | Cotisations complémentaires (santé, prévoyance) |
| `FORMATION` | Cotisations de formation professionnelle |
| `AUTRES` | Autres cotisations et contributions |

### Types de cotisations

| Code | Description |
|------|-------------|
| `COTISATION_SALARIALE` | Part salariale (déduite du salaire brut) |
| `COTISATION_PATRONALE` | Part patronale (charge pour l'employeur) |
| `CHARGE_FISCALE` | Contribution fiscale (CSG, CRDS, etc.) |

### Organismes collecteurs

| Code | Description |
|------|-------------|
| `URSSAF` | Union de Recouvrement des Cotisations de Sécurité Sociale et d'Allocations Familiales |
| `POLE_EMPLOI` | Pôle Emploi (assurance chômage) |
| `AGIRC_ARRCO` | Association Générale des Institutions de Retraite Complémentaire |
| `AUTRES` | Autres organismes |

## Exemples

### Exemple simple : Assurance maladie salariale

```yaml
version: "1.0"
date_creation: "2024-01-01"
description: "Exemple simple d'une cotisation"

cotisations:
  - code: SS_MALADIE_SAL
    nom: "Assurance maladie - Part salariale"
    categorie: SECURITE_SOCIALE
    organisme: URSSAF
    type: COTISATION_SALARIALE
    actif: true
    calcul:
      type: POURCENTAGE
      assiette: SALAIRE_BRUT
      plafond: null
      plancher: null
    taux:
      - taux: 0.0755
        date_debut: "2024-01-01"
        date_fin: null
    comptabilite:
      compte_debit: "6451"
      compte_credit: "431"
```

### Exemple avec plafond : Retraite de base

```yaml
- code: SS_VIEILLESSE_PLAFONNE_SAL
  nom: "Assurance vieillesse plafonnée - Part salariale"
  categorie: RETRAITE
  organisme: URSSAF
  type: COTISATION_SALARIALE
  actif: true
  calcul:
    type: POURCENTAGE
    assiette: SALAIRE_PLAFONNE
    plafond: 46368                    # Plafond annuel de la Sécurité Sociale (PASS) 2024
    plancher: null
  taux:
    - taux: 0.0690
      date_debut: "2024-01-01"
      date_fin: null
  comptabilite:
    compte_debit: "6451"
    compte_credit: "431"
```

### Exemple avec évolution de taux

```yaml
- code: CHOMAGE_SAL
  nom: "Assurance chômage - Part salariale"
  categorie: CHOMAGE
  organisme: POLE_EMPLOI
  type: COTISATION_SALARIALE
  actif: true
  calcul:
    type: POURCENTAGE
    assiette: SALAIRE_PLAFONNE
    plafond: 185472                   # 4 fois le PASS
    plancher: null
  taux:
    - taux: 0.0240                    # Taux 2024
      date_debut: "2024-01-01"
      date_fin: null
    - taux: 0.0205                    # Taux 2022-2023
      date_debut: "2022-01-01"
      date_fin: "2023-12-31"
  comptabilite:
    compte_debit: "6451"
    compte_credit: "437"
```

### Exemple de cotisation désactivée

```yaml
- code: COTISATION_COVID
  nom: "Cotisation temporaire COVID-19"
  categorie: AUTRES
  organisme: URSSAF
  type: COTISATION_PATRONALE
  actif: false                        # Cotisation désactivée
  calcul:
    type: POURCENTAGE
    assiette: SALAIRE_BRUT
    plafond: null
    plancher: null
  taux:
    - taux: 0.0100
      date_debut: "2020-03-01"
      date_fin: "2021-12-31"
```

## Utilisation en code

### Charger un fichier de cotisations

```typescript
import { analyseurCotisations } from './lib/analyseurCotisations';

// Charger et valider un fichier YAML
const fichier = analyseurCotisations.chargerDepuisFichier(
  './fixtures/cotisations/cotisations-2024.yaml'
);

console.log(`Fichier version ${fichier.version}`);
console.log(`Nombre de cotisations : ${fichier.cotisations.length}`);
```

### Valider une chaîne YAML

```typescript
const yamlContent = `
version: "1.0"
date_creation: "2024-01-01"
cotisations:
  - code: TEST
    nom: "Test"
    ...
`;

try {
  const fichier = analyseurCotisations.validerYaml(yamlContent);
  console.log('YAML valide !');
} catch (error) {
  console.error('Erreur de validation :', error.message);
}
```

### Obtenir le taux applicable à une date

```typescript
const fichier = analyseurCotisations.chargerDepuisFichier('./cotisations-2024.yaml');
const cotisation = fichier.cotisations[0];

// Taux actuel
const tauxActuel = analyseurCotisations.obtenirTauxADate(cotisation);

// Taux à une date spécifique
const tauxHistorique = analyseurCotisations.obtenirTauxADate(
  cotisation,
  new Date('2023-06-15')
);

console.log(`Taux actuel : ${tauxActuel?.taux}`);
console.log(`Taux en juin 2023 : ${tauxHistorique?.taux}`);
```

### Filtrer les règles

```typescript
import { TypeCotisation, CategorieCotisation } from './lib/analyseurCotisations';

const fichier = analyseurCotisations.chargerDepuisFichier('./cotisations-2024.yaml');

// Règles actives uniquement
const reglesActives = analyseurCotisations.obtenirReglesActives(fichier);

// Cotisations salariales
const salariales = analyseurCotisations.obtenirReglesParType(
  fichier,
  TypeCotisation.COTISATION_SALARIALE
);

// Cotisations de sécurité sociale
const secu = analyseurCotisations.obtenirReglesParCategorie(
  fichier,
  CategorieCotisation.SECURITE_SOCIALE
);
```

## Validation et messages d'erreur

Le parseur utilise Zod pour valider les fichiers YAML. En cas d'erreur, un message détaillé indique le champ problématique :

```
Erreurs de validation du fichier YAML:
  - cotisations.0.taux.0.taux: Number must be less than or equal to 1
  - cotisations.1.date_creation: String must match regex /^\d{4}-\d{2}-\d{2}$/
```

### Erreurs courantes

| Erreur | Cause | Solution |
|--------|-------|----------|
| `Number must be less than or equal to 1` | Taux > 1 | Utiliser des décimales (ex: 0.075 pour 7,5%) |
| `Number must be greater than or equal to 0` | Taux négatif | Utiliser un taux positif |
| `String must match regex` | Format de date invalide | Utiliser le format YYYY-MM-DD |
| `Invalid enum value` | Type énuméré incorrect | Vérifier les énumérations valides |
| `Array must contain at least 1 element(s)` | Pas de cotisations ou taux | Ajouter au moins un élément |
| `String must contain at least 1 character(s)` | Code ou nom vide | Remplir le champ |

## Fichiers d'exemple

Le projet contient plusieurs fichiers d'exemple dans `/backend/fixtures/cotisations/` :

- **`cotisations-2024.yaml`** : Fichier complet avec toutes les cotisations françaises 2024
- **`exemple-simple.yaml`** : Exemple simplifié avec 4 cotisations de base
- **`exemple-evolution-taux.yaml`** : Exemple montrant l'évolution des taux dans le temps

## Valeurs de référence 2024

### Plafond Annuel de la Sécurité Sociale (PASS)

- **PASS 2024** : 46 368 €
- **PASS mensuel** : 3 864 €
- **4 × PASS** : 185 472 € (plafond chômage)

### Principaux taux 2024

| Cotisation | Part salariale | Part patronale |
|------------|----------------|----------------|
| Assurance maladie | 7,55% | 13,00% |
| Vieillesse plafonnée | 6,90% | 8,55% |
| Vieillesse déplafonnée | 0,40% | 1,90% |
| Allocations familiales | - | 3,40% |
| Assurance chômage | 2,40% | 4,05% |
| Retraite complémentaire T1 | 3,87% | 6,03% |
| CSG déductible | 6,80% | - |
| CSG non déductible | 2,40% | - |
| CRDS | 0,50% | - |
| Formation professionnelle | - | 0,55% |

## Limitations actuelles

- ⚠️ Le type de calcul `TRANCHES` n'est pas encore implémenté
- ⚠️ La méthode `importerRegles()` sera implémentée dans l'issue #3
- ⚠️ Pas de validation métier avancée (ex: cohérence des plafonds)

## Évolutions futures

### Issue #3 : API Import/Export

L'issue #3 implémentera :
- Import des règles YAML vers la base de données
- Export de la configuration actuelle en YAML
- API REST pour gérer les règles de cotisations
- Interface web pour éditer les règles

### Améliorations prévues

- Support du calcul par tranches (tranches AGIRC-ARRCO)
- Validation métier avancée (cohérence, dépendances)
- Templates pour les configurations courantes
- Vérification de cohérence des taux historiques
- Support de formules de calcul personnalisées

## Bonnes pratiques

### Organisation des fichiers

```
fixtures/cotisations/
├── cotisations-2024.yaml          # Configuration principale annuelle
├── cotisations-2025.yaml          # Configuration future
├── historique/
│   ├── cotisations-2023.yaml
│   └── cotisations-2022.yaml
└── tests/
    ├── exemple-simple.yaml
    └── exemple-evolution-taux.yaml
```

### Gestion des versions

1. **Créer un fichier par année** : `cotisations-YYYY.yaml`
2. **Archiver les anciennes versions** dans `historique/`
3. **Commiter chaque modification** avec un message explicite
4. **Tagger les versions importantes** : `git tag v2024.1`

### Modification des taux

Pour modifier un taux :

1. **Ne jamais modifier un taux existant avec `date_fin: null`**
2. **Ajouter une `date_fin` au taux actuel**
3. **Ajouter un nouveau taux avec `date_debut` = jour suivant

```yaml
taux:
  # Ancien taux (fermer la période)
  - taux: 0.0755
    date_debut: "2022-01-01"
    date_fin: "2024-12-31"

  # Nouveau taux (ouvrir nouvelle période)
  - taux: 0.0760
    date_debut: "2025-01-01"
    date_fin: null
```

## Support et ressources

- **Documentation Prisma** : https://www.prisma.io/docs/
- **Documentation Zod** : https://zod.dev/
- **Référence URSSAF** : https://www.urssaf.fr/portail/home/taux-et-baremes.html
- **PASS officiel** : https://www.securite-sociale.fr/home/infos-pratiques/valeurs/pass.html

## Questions fréquentes

### Comment ajouter une nouvelle cotisation ?

1. Ouvrir le fichier `cotisations-2024.yaml`
2. Copier une cotisation existante similaire
3. Modifier le code, nom, taux, etc.
4. Valider avec les tests : `npm test`

### Comment désactiver temporairement une cotisation ?

Mettre le champ `actif` à `false` :

```yaml
- code: MA_COTISATION
  actif: false
  # ... reste de la configuration
```

### Comment gérer les cotisations spécifiques à certains secteurs ?

Créer des fichiers séparés :
- `cotisations-batiment-2024.yaml`
- `cotisations-transport-2024.yaml`
- etc.

### Que faire en cas d'erreur de validation ?

1. Lire attentivement le message d'erreur
2. Identifier le chemin du champ problématique (ex: `cotisations.0.taux.0.taux`)
3. Vérifier le type et les contraintes dans cette documentation
4. Corriger et retester

---

**Version** : 1.0
**Date** : 2024-01-01
**Auteur** : Équipe OpenPayFit
