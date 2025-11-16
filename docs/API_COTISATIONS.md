# API de Gestion des Règles de Cotisations

> Documentation de l'API REST pour la gestion des catégories, organismes, règles de cotisations sociales et fiscales.

## Vue d'ensemble

Cette API permet de gérer les règles de cotisations sociales françaises utilisées pour le calcul de la paie. Elle comprend :

- **CRUD complet** pour les catégories, organismes, règles et taux de cotisation
- **Import/Export** en formats YAML et JSON
- **Simulation** de calcul de paie avec application des règles

**URL de base** : `/api/cotisations`

**Authentification** : Toutes les routes nécessitent un token JWT valide via header `Authorization: Bearer <token>`.

---

## Table des matières

1. [Catégories de Cotisation](#catégories-de-cotisation)
2. [Organismes de Cotisation](#organismes-de-cotisation)
3. [Règles de Cotisation](#règles-de-cotisation)
4. [Taux de Cotisation](#taux-de-cotisation)
5. [Import/Export](#importexport)
6. [Simulation](#simulation)
7. [Codes d'erreur](#codes-derreur)
8. [Exemples](#exemples)

---

## Catégories de Cotisation

Les catégories regroupent les règles par domaine (sécurité sociale, retraite, chômage, etc.).

### Lister toutes les catégories

```
GET /api/cotisations/categories
```

**Réponse** : `200 OK`

```json
[
  {
    "id": "clxxx...",
    "code": "SS",
    "nom": "Sécurité sociale",
    "description": "Cotisations de sécurité sociale",
    "createdAt": "2025-01-15T10:00:00.000Z",
    "updatedAt": "2025-01-15T10:00:00.000Z",
    "regles": [...]
  }
]
```

### Récupérer une catégorie par ID

```
GET /api/cotisations/categories/:id
```

**Paramètres** :
- `id` (path) : ID de la catégorie

**Réponse** : `200 OK` ou `404 Not Found`

### Créer une catégorie

```
POST /api/cotisations/categories
```

**Corps de la requête** :

```json
{
  "code": "SS",
  "nom": "Sécurité sociale",
  "description": "Cotisations de sécurité sociale"
}
```

**Champs** :
- `code` (obligatoire) : Code unique de la catégorie (ex: "SS", "RETRAITE", "CHOMAGE")
- `nom` (obligatoire) : Nom de la catégorie
- `description` (optionnel) : Description

**Réponse** : `201 Created` ou `400 Bad Request` ou `409 Conflict`

**Codes standards** :
- `SS` : Sécurité sociale
- `RETRAITE` : Retraite de base et complémentaire
- `CHOMAGE` : Assurance chômage
- `AT_MP` : Accidents du travail et maladies professionnelles
- `FAMILLE` : Allocations familiales
- `CSG_CRDS` : Contribution sociale généralisée et CRDS

### Modifier une catégorie

```
PUT /api/cotisations/categories/:id
```

**Corps de la requête** : Identique à la création

**Réponse** : `200 OK` ou `404 Not Found` ou `409 Conflict`

### Supprimer une catégorie

```
DELETE /api/cotisations/categories/:id
```

**Réponse** : `204 No Content` ou `404 Not Found` ou `409 Conflict` (si des règles sont associées)

---

## Organismes de Cotisation

Les organismes collectent les cotisations (URSSAF, AGIRC-ARRCO, etc.).

### Lister tous les organismes

```
GET /api/cotisations/organismes
```

**Réponse** : `200 OK` (structure identique aux catégories)

### Récupérer un organisme par ID

```
GET /api/cotisations/organismes/:id
```

### Créer un organisme

```
POST /api/cotisations/organismes
```

**Corps de la requête** :

```json
{
  "code": "URSSAF",
  "nom": "Union de recouvrement des cotisations de sécurité sociale",
  "description": "Organisme de collecte principal"
}
```

**Codes standards** :
- `URSSAF` : Union de recouvrement
- `AGIRC_ARRCO` : Retraite complémentaire
- `POLE_EMPLOI` : Assurance chômage
- `CPAM` : Caisse primaire d'assurance maladie
- `CARSAT` : Caisse d'assurance retraite

### Modifier un organisme

```
PUT /api/cotisations/organismes/:id
```

### Supprimer un organisme

```
DELETE /api/cotisations/organismes/:id
```

---

## Règles de Cotisation

Une règle définit une cotisation spécifique avec son mode de calcul.

### Lister toutes les règles

```
GET /api/cotisations/regles
```

**Réponse** : `200 OK`

```json
[
  {
    "id": "clxxx...",
    "code": "SS_MALADIE_SAL",
    "nom": "Cotisation maladie salariale",
    "description": "Assurance maladie - part salariale",
    "categorieId": "clxxx...",
    "organismeId": "clxxx...",
    "typeCotisation": "COTISATION_SALARIALE",
    "typeCalcul": "POURCENTAGE",
    "typeAssiette": "SALAIRE_BRUT",
    "plancher": null,
    "plafond": null,
    "estActif": true,
    "categorie": {
      "code": "SS",
      "nom": "Sécurité sociale"
    },
    "organisme": {
      "code": "URSSAF",
      "nom": "Union de recouvrement..."
    },
    "taux": [
      {
        "id": "clxxx...",
        "taux": 0.0755,
        "dateDebut": "2025-01-01T00:00:00.000Z",
        "dateFin": null
      }
    ]
  }
]
```

### Récupérer une règle par ID

```
GET /api/cotisations/regles/:id
```

### Créer une règle

```
POST /api/cotisations/regles
```

**Corps de la requête** :

```json
{
  "code": "SS_MALADIE_SAL",
  "nom": "Cotisation maladie salariale",
  "description": "Assurance maladie - part salariale",
  "categorieId": "clxxx...",
  "organismeId": "clxxx...",
  "typeCotisation": "COTISATION_SALARIALE",
  "typeCalcul": "POURCENTAGE",
  "typeAssiette": "SALAIRE_BRUT",
  "plancher": null,
  "plafond": null,
  "estActif": true
}
```

**Champs** :

- `code` (obligatoire) : Code unique (ex: "SS_MALADIE_SAL")
- `nom` (obligatoire) : Nom de la règle
- `description` (optionnel) : Description
- `categorieId` (obligatoire) : ID de la catégorie
- `organismeId` (obligatoire) : ID de l'organisme
- `typeCotisation` (obligatoire) : Type de cotisation
  - `COTISATION_SALARIALE` : Déduite du salaire brut
  - `COTISATION_PATRONALE` : Charge de l'employeur
  - `CHARGE_FISCALE` : Taxes et impôts
- `typeCalcul` (obligatoire) : Mode de calcul
  - `POURCENTAGE` : Taux appliqué à l'assiette
  - `MONTANT_FIXE` : Montant fixe
  - `TRANCHES` : Calcul par tranches progressives
- `typeAssiette` (obligatoire) : Base de calcul
  - `SALAIRE_BRUT` : Salaire brut total
  - `SALAIRE_NET` : Salaire après cotisations salariales
  - `SALAIRE_PLAFONNE` : Limité au PASS (Plafond Annuel de la Sécurité Sociale)
- `plancher` (optionnel) : Montant minimum en euros
- `plafond` (optionnel) : Montant maximum en euros
- `estActif` (optionnel, défaut: true) : Si la règle est active

**Réponse** : `201 Created` ou `400 Bad Request` ou `409 Conflict`

### Modifier une règle

```
PUT /api/cotisations/regles/:id
```

### Supprimer une règle

```
DELETE /api/cotisations/regles/:id
```

---

## Taux de Cotisation

Les taux définissent les pourcentages applicables aux règles avec historique législatif.

### Lister tous les taux d'une règle

```
GET /api/cotisations/regles/:regleId/taux
```

**Réponse** : `200 OK`

```json
[
  {
    "id": "clxxx...",
    "regleId": "clxxx...",
    "taux": 0.0755,
    "dateDebut": "2025-01-01T00:00:00.000Z",
    "dateFin": null,
    "createdAt": "2025-01-15T10:00:00.000Z",
    "updatedAt": "2025-01-15T10:00:00.000Z"
  }
]
```

### Créer un taux pour une règle

```
POST /api/cotisations/regles/:regleId/taux
```

**Corps de la requête** :

```json
{
  "taux": 0.0755,
  "dateDebut": "2025-01-01",
  "dateFin": null
}
```

**Champs** :

- `taux` (obligatoire) : Taux en format décimal (0.0755 = 7,55%). Doit être entre 0 et 1
- `dateDebut` (obligatoire) : Date de début d'application (format ISO 8601)
- `dateFin` (optionnel) : Date de fin d'application (null = toujours actif)

**Validation** :
- Le taux doit être entre 0 et 1
- La date de fin doit être postérieure à la date de début

**Réponse** : `201 Created` ou `400 Bad Request` ou `409 Conflict`

### Modifier un taux

```
PUT /api/cotisations/taux/:id
```

### Supprimer un taux

```
DELETE /api/cotisations/taux/:id
```

---

## Import/Export

### Importer des règles

```
POST /api/cotisations/import
```

**Corps de la requête** :

```json
{
  "format": "yaml",
  "data": "categories:\n  - code: SS\n    nom: Sécurité sociale\n..."
}
```

ou

```json
{
  "format": "json",
  "data": {
    "categories": [
      {
        "code": "SS",
        "nom": "Sécurité sociale",
        "description": "Cotisations de sécurité sociale"
      }
    ],
    "organismes": [
      {
        "code": "URSSAF",
        "nom": "Union de recouvrement",
        "description": "Organisme de collecte"
      }
    ],
    "regles": [
      {
        "code": "SS_MALADIE_SAL",
        "nom": "Cotisation maladie salariale",
        "description": "Assurance maladie - part salariale",
        "categorieCode": "SS",
        "organismeCode": "URSSAF",
        "typeCotisation": "COTISATION_SALARIALE",
        "typeCalcul": "POURCENTAGE",
        "typeAssiette": "SALAIRE_BRUT",
        "plancher": null,
        "plafond": null,
        "estActif": true,
        "taux": [
          {
            "taux": 0.0755,
            "dateDebut": "2025-01-01",
            "dateFin": null
          }
        ]
      }
    ]
  }
}
```

**Champs** :
- `format` (obligatoire) : "yaml" ou "json"
- `data` (obligatoire) : Données à importer (string pour YAML, objet pour JSON)

**Réponse** : `201 Created`

```json
{
  "categoriesCreated": 1,
  "organismesCreated": 1,
  "reglesCreated": 1,
  "tauxCreated": 1,
  "errors": []
}
```

**Notes** :
- Les entités existantes (même code) ne sont pas écrasées, une erreur est ajoutée au tableau `errors`
- L'import se poursuit même en cas d'erreur sur certaines entités
- Pour les règles, utilisez `categorieCode` et `organismeCode` (pas les IDs)

### Exporter toutes les règles

```
GET /api/cotisations/export?format=yaml
```

ou

```
GET /api/cotisations/export?format=json
```

**Paramètres** :
- `format` (query, obligatoire) : "yaml" ou "json"

**Réponse** : `200 OK`

- Format YAML : `Content-Type: application/x-yaml`
- Format JSON : `Content-Type: application/json`

Les fichiers sont téléchargés avec les noms :
- `cotisations.yaml`
- `cotisations.json`

---

## Simulation

### Simuler un calcul de paie

```
POST /api/cotisations/simulation
```

**Corps de la requête** :

```json
{
  "salaireBrut": 3000,
  "date": "2025-01-15"
}
```

**Champs** :
- `salaireBrut` (obligatoire) : Salaire brut mensuel en euros (nombre positif)
- `date` (optionnel) : Date de simulation pour appliquer les taux valides (défaut: date actuelle)

**Réponse** : `200 OK`

```json
{
  "salaireBrut": 3000,
  "dateSimulation": "2025-01-15",
  "cotisationsSalariales": 226.5,
  "cotisationsPatronales": 850.5,
  "chargesFiscales": 120,
  "salaireNet": 2773.5,
  "coutTotal": 3970.5,
  "details": [
    {
      "code": "SS_MALADIE_SAL",
      "nom": "Cotisation maladie salariale",
      "categorie": "Sécurité sociale",
      "organisme": "Union de recouvrement",
      "typeCotisation": "COTISATION_SALARIALE",
      "assiette": 3000,
      "taux": 0.0755,
      "montant": 226.5
    }
  ]
}
```

**Calculs** :
- `salaireNet` = `salaireBrut` - `cotisationsSalariales`
- `coutTotal` = `salaireBrut` + `cotisationsPatronales` + `chargesFiscales`

**Notes** :
- Seules les règles actives (`estActif: true`) sont appliquées
- Seuls les taux valides à la date de simulation sont utilisés
- Pour `SALAIRE_PLAFONNE`, le PASS mensuel 2025 est de 3 864 €
- Les montants sont arrondis à 2 décimales

---

## Codes d'erreur

| Code | Description |
|------|-------------|
| `200` | Succès |
| `201` | Ressource créée |
| `204` | Suppression réussie (pas de contenu) |
| `400` | Requête invalide (champs manquants, validation échouée) |
| `401` | Non authentifié (token manquant ou invalide) |
| `403` | Accès interdit |
| `404` | Ressource non trouvée |
| `409` | Conflit (code déjà existant, contrainte violée) |
| `500` | Erreur serveur |

**Format des erreurs** :

```json
{
  "error": "Description de l'erreur"
}
```

---

## Exemples

### Exemple complet : Créer une règle de cotisation maladie

**1. Créer la catégorie**

```bash
curl -X POST http://localhost:3000/api/cotisations/categories \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "code": "SS",
    "nom": "Sécurité sociale",
    "description": "Cotisations de sécurité sociale"
  }'
```

**2. Créer l'organisme**

```bash
curl -X POST http://localhost:3000/api/cotisations/organismes \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "code": "URSSAF",
    "nom": "Union de recouvrement des cotisations",
    "description": "Organisme de collecte principal"
  }'
```

**3. Créer la règle**

```bash
curl -X POST http://localhost:3000/api/cotisations/regles \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "code": "SS_MALADIE_SAL",
    "nom": "Cotisation maladie salariale",
    "description": "Assurance maladie - part salariale",
    "categorieId": "CATEGORY_ID",
    "organismeId": "ORGANISME_ID",
    "typeCotisation": "COTISATION_SALARIALE",
    "typeCalcul": "POURCENTAGE",
    "typeAssiette": "SALAIRE_BRUT",
    "estActif": true
  }'
```

**4. Ajouter le taux**

```bash
curl -X POST http://localhost:3000/api/cotisations/regles/REGLE_ID/taux \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "taux": 0.0755,
    "dateDebut": "2025-01-01",
    "dateFin": null
  }'
```

### Exemple : Importer des règles depuis un fichier YAML

**Fichier `cotisations-2025.yaml`** :

```yaml
categories:
  - code: SS
    nom: Sécurité sociale
    description: Cotisations de sécurité sociale
  - code: RETRAITE
    nom: Retraite
    description: Retraite de base et complémentaire

organismes:
  - code: URSSAF
    nom: Union de recouvrement des cotisations
    description: Organisme de collecte principal
  - code: AGIRC_ARRCO
    nom: AGIRC-ARRCO
    description: Retraite complémentaire

regles:
  - code: SS_MALADIE_SAL
    nom: Cotisation maladie salariale
    description: Assurance maladie - part salariale
    categorieCode: SS
    organismeCode: URSSAF
    typeCotisation: COTISATION_SALARIALE
    typeCalcul: POURCENTAGE
    typeAssiette: SALAIRE_BRUT
    plancher: null
    plafond: null
    estActif: true
    taux:
      - taux: 0.0755
        dateDebut: '2025-01-01'
        dateFin: null
```

**Requête** :

```bash
curl -X POST http://localhost:3000/api/cotisations/import \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "format": "yaml",
    "data": "'"$(cat cotisations-2025.yaml)"'"
  }'
```

### Exemple : Simuler un calcul de paie

```bash
curl -X POST http://localhost:3000/api/cotisations/simulation \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "salaireBrut": 3000,
    "date": "2025-01-15"
  }'
```

**Réponse** :

```json
{
  "salaireBrut": 3000,
  "dateSimulation": "2025-01-15",
  "cotisationsSalariales": 226.5,
  "cotisationsPatronales": 850.5,
  "chargesFiscales": 120,
  "salaireNet": 2773.5,
  "coutTotal": 3970.5,
  "details": [
    {
      "code": "SS_MALADIE_SAL",
      "nom": "Cotisation maladie salariale",
      "categorie": "Sécurité sociale",
      "organisme": "Union de recouvrement",
      "typeCotisation": "COTISATION_SALARIALE",
      "assiette": 3000,
      "taux": 0.0755,
      "montant": 226.5
    }
  ]
}
```

---

## Notes importantes

### Sécurité et Permissions

**Version actuelle** :
- Tous les utilisateurs authentifiés peuvent consulter (GET) les règles de cotisations
- Tous les utilisateurs authentifiés peuvent modifier (POST, PUT, DELETE) les règles de cotisations

**À implémenter** :
- Ajouter un système de rôles (admin/user) au modèle User
- Restreindre les modifications aux administrateurs uniquement
- Les utilisateurs normaux ne pourraient que consulter et simuler

### Gestion des taux

**Important** : Pour qu'une règle soit appliquée dans la simulation, elle doit avoir au moins un taux valide à la date de simulation.

**Bonne pratique** :
- Lors de l'ajout d'un nouveau taux, définir une `dateFin` au taux précédent
- Éviter les chevauchements de périodes pour une même règle
- Vérifier que `dateDebut` du nouveau taux >= `dateFin` du taux précédent

### Plafond Annuel de la Sécurité Sociale (PASS)

Le PASS 2025 est de **46 368 €** annuels, soit **3 864 €** mensuels.

Pour les cotisations plafonnées :
- Utiliser `typeAssiette: "SALAIRE_PLAFONNE"`
- Définir `plafond: 3864` (ou laisser null pour utiliser le PASS par défaut)

---

## Support et Questions

Pour toute question ou signalement de bug concernant cette API, veuillez créer une issue sur le dépôt GitHub du projet OpenPayFit.

**Version de la documentation** : 1.0
**Date de dernière mise à jour** : 2025-01-16
