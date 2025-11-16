---
title: "[FEATURE] API de gestion des règles de cotisations"
labels: enhancement, api, payroll, high-priority
assignees:
---

## Description

Créer les endpoints API permettant de gérer (CRUD) les règles de cotisations et fiscales, avec fonctionnalités d'import/export et de simulation.

## Routes à implémenter

### Catégories

```
GET    /api/cotisations/categories           # Liste des catégories
POST   /api/cotisations/categories           # Créer une catégorie
PUT    /api/cotisations/categories/:id       # Modifier une catégorie
DELETE /api/cotisations/categories/:id       # Supprimer une catégorie
```

### Organismes

```
GET    /api/cotisations/organismes           # Liste des organismes
POST   /api/cotisations/organismes           # Créer un organisme
PUT    /api/cotisations/organismes/:id       # Modifier un organisme
DELETE /api/cotisations/organismes/:id       # Supprimer un organisme
```

### Règles

```
GET    /api/cotisations/regles               # Liste de toutes les règles
GET    /api/cotisations/regles/actives       # Règles actives uniquement
GET    /api/cotisations/regles/:id           # Détail d'une règle
POST   /api/cotisations/regles               # Créer une règle
PUT    /api/cotisations/regles/:id           # Modifier une règle
DELETE /api/cotisations/regles/:id           # Supprimer une règle

# Import/Export
POST   /api/cotisations/regles/importer      # Importer depuis YAML/JSON
GET    /api/cotisations/regles/exporter      # Exporter en YAML/JSON

# Taux
POST   /api/cotisations/regles/:id/taux      # Ajouter un taux historique
PUT    /api/cotisations/taux/:tauxId         # Modifier un taux
```

### Simulation

```
POST   /api/cotisations/simuler              # Simuler un calcul de paie
```

## Exemples de requêtes/réponses

### Simulation de calcul

**Requête** :
```json
POST /api/cotisations/simuler

{
  "salaireBrut": 3000,
  "dateCalcul": "2024-11-15"
}
```

**Réponse** :
```json
{
  "salaireBrut": 3000,
  "cotisations": [
    {
      "code": "SS_MALADIE_SAL",
      "nom": "Assurance maladie - Part salariale",
      "type": "COTISATION_SALARIALE",
      "assiette": 3000,
      "taux": 0.0755,
      "montant": 226.50
    },
    {
      "code": "RETRAITE_BASE_SAL",
      "nom": "Retraite de base - Part salariale",
      "type": "COTISATION_SALARIALE",
      "assiette": 3000,
      "taux": 0.0690,
      "montant": 207.00
    }
  ],
  "totalCotisationsSalariales": 750.00,
  "totalCotisationsPatronales": 1200.00,
  "totalChargesFiscales": 50.00,
  "salaireNet": 2250.00,
  "coutTotal": 4200.00
}
```

### Import de règles

**Requête** :
```json
POST /api/cotisations/regles/importer
Content-Type: multipart/form-data

file: cotisations-2024.yaml
```

**Réponse** :
```json
{
  "statut": "succes",
  "reglesImportees": 15,
  "erreurs": []
}
```

## Tâches

- [ ] Créer le fichier de routes `backend/src/api/cotisations.ts`
- [ ] Implémenter les contrôleurs pour chaque endpoint
- [ ] Ajouter les middlewares d'authentification (admin uniquement pour modification)
- [ ] Implémenter la logique d'import/export YAML
- [ ] Implémenter la logique de simulation de calcul
- [ ] Créer les tests API avec Supertest
- [ ] Documenter l'API dans `/docs/API_COTISATIONS.md`

## Sécurité

- **Consultation** : Tous les utilisateurs authentifiés
- **Modification** : Uniquement les administrateurs
- **Validation** : Tous les inputs doivent être validés (taux entre 0 et 1, dates valides, etc.)
- **Gestion d'erreurs** : Codes HTTP appropriés (400, 401, 403, 404, 500)

## Exemple de contrôleur

```typescript
// backend/src/api/cotisations.ts

import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import { verifierAdmin } from '../middleware/admin';
import prisma from '../lib/db';

const router = Router();

// Liste des règles actives
router.get('/regles/actives', authenticateToken, async (req, res) => {
  try {
    const regles = await prisma.regleCotisation.findMany({
      where: { estActif: true },
      include: {
        categorie: true,
        organisme: true,
        taux: {
          where: {
            dateDebut: { lte: new Date() },
            OR: [
              { dateFin: null },
              { dateFin: { gte: new Date() } }
            ]
          }
        },
        reglesComptables: true
      }
    });

    res.json(regles);
  } catch (error) {
    res.status(500).json({ erreur: 'Erreur lors de la récupération des règles' });
  }
});

// Créer une règle (admin uniquement)
router.post('/regles', authenticateToken, verifierAdmin, async (req, res) => {
  try {
    const regle = await prisma.regleCotisation.create({
      data: req.body
    });

    res.status(201).json(regle);
  } catch (error) {
    res.status(400).json({ erreur: 'Erreur lors de la création de la règle' });
  }
});

// Simuler un calcul
router.post('/simuler', authenticateToken, async (req, res) => {
  try {
    const { salaireBrut, dateCalcul } = req.body;

    // Utiliser le moteur de calcul (Issue #4)
    const resultat = await moteur.calculerPaie({
      salaireBrut,
      dateCalcul: new Date(dateCalcul),
      employeId: 'simulation'
    });

    res.json(resultat);
  } catch (error) {
    res.status(500).json({ erreur: 'Erreur lors de la simulation' });
  }
});

export default router;
```

## Critères d'acceptation

- [ ] Tous les endpoints sont fonctionnels
- [ ] Les erreurs sont gérées avec des codes HTTP appropriés
- [ ] L'authentification et les permissions sont correctement implémentées
- [ ] Les tests API couvrent tous les endpoints
- [ ] La documentation API est complète
- [ ] L'import/export YAML fonctionne correctement
- [ ] Le simulateur retourne des résultats corrects

## Dépendances

- Requiert : Issue #1 (Schéma de données)
- Requiert : Issue #2 (DSL YAML pour import/export)
- Requiert : Issue #4 (Moteur de calcul pour simulation)

## Notes

Cette API sera utilisée par :
- L'interface d'administration (Issue #5)
- Les outils d'import/export
- Le module de paie (Issue #7)
