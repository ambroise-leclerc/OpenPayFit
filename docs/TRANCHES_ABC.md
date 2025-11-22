# Calculateur de cotisations avancé avec tranches A, B, C

> Implémentation de l'issue #44 : Support complet des tranches salariales A, B, C pour les cotisations sociales

## Vue d'ensemble

Ce document décrit les nouvelles fonctionnalités ajoutées au moteur de cotisations pour supporter le calcul par tranches salariales A, B, C, notamment pour la retraite complémentaire AGIRC-ARRCO.

## Tranches salariales

Les tranches salariales sont basées sur le **PASS** (Plafond Annuel de la Sécurité Sociale) :

- **Tranche A (T1)** : jusqu'à 1 PASS (3 864 €/mois en 2025)
- **Tranche B (T2)** : de 1 à 8 PASS (de 3 864 € à 30 912 €/mois en 2025)
- **Tranche C** : de 4 à 8 PASS (de 15 456 € à 30 912 €/mois en 2025)

## Nouveaux modèles

### 1. Statut d'employé

Un nouvel enum `StatutEmploye` a été ajouté au modèle `Employee` :

```prisma
enum StatutEmploye {
  NON_CADRE       // Employé ou technicien
  CADRE           // Cadre
  FORFAIT_JOURS   // Cadre au forfait jours
}
```

**Utilisation** : Certaines cotisations ne s'appliquent qu'à certains statuts (ex: CET uniquement pour les cadres).

### 2. Tranches de cotisation

Un nouveau modèle `TrancheCotisation` permet de définir des taux différents selon la tranche de salaire :

```prisma
model TrancheCotisation {
  id            String
  regleId       String
  tranche       TrancheSalariale  // TRANCHE_A, TRANCHE_B, TRANCHE_C
  taux          Float              // Taux applicable à cette tranche
  plancherPASS  Float              // Plancher en multiples de PASS
  plafondPASS   Float              // Plafond en multiples de PASS
  ordre         Int                // Ordre d'application
  dateDebut     DateTime
  dateFin       DateTime?
}
```

### 3. Exonérations

Deux nouveaux modèles gèrent les exonérations de cotisations :

```prisma
enum TypeExoneration {
  ACCRE_ACRE
  ZRR
  ZFU
  BER
  ZRD
  APPRENTI
  PROFESSIONNALISATION
  AUTRE
}

model DefinitionExoneration {
  code              String
  typeExoneration   TypeExoneration
  tauxReduction     Float?
  plafondSalarial   Float?
  dateDebut         DateTime
  dateFin           DateTime?
}

model ExonerationEmploye {
  employeId               String
  definitionExonerationId String
  dateDebut               DateTime
  dateFin                 DateTime?
}
```

## Exemple de calcul par tranches

### AGIRC-ARRCO - Retraite complémentaire

Pour un salaire de 5 000 €/mois avec PASS mensuel = 3 864 € :

**Tranche 1 (jusqu'à 1 PASS) :**
- Assiette : min(5000, 3864) = 3 864 €
- Taux salarial : 4,02%
- Montant : 3 864 × 0,0402 = **155,33 €**

**Tranche 2 (de 1 à 8 PASS) :**
- Assiette : min(max(5000 - 3864, 0), 7×3864) = 1 136 €
- Taux salarial : 10,26%
- Montant : 1 136 × 0,1026 = **116,55 €**

**Total AGIRC-ARRCO salarial : 271,89 €**

## Utilisation de l'API

### Endpoint de simulation

```http
POST /api/cotisations/simulation
Content-Type: application/json
Authorization: Bearer <token>

{
  "salaireBrut": 5000,
  "date": "2025-01-15",
  "statutEmploye": "CADRE"  // Optionnel, défaut: NON_CADRE
}
```

**Réponse :**
```json
{
  "salaireBrut": 5000,
  "dateSimulation": "2025-01-15",
  "cotisationsSalariales": 650.00,
  "cotisationsPatronales": 1050.00,
  "chargesFiscales": 0.00,
  "salaireNet": 4350.00,
  "coutTotal": 6050.00,
  "details": [
    {
      "code": "RETRAITE_COMP_T1_SAL",
      "nom": "Retraite complémentaire AGIRC-ARRCO Tranche 1 - Part salariale",
      "categorie": "Retraite complémentaire",
      "organisme": "AGIRC-ARRCO",
      "typeCotisation": "COTISATION_SALARIALE",
      "assiette": 3864.00,
      "taux": 0.0402,
      "montant": 155.33
    }
  ]
}
```

## Fixtures YAML

### Structure pour les tranches

```yaml
cotisations:
  - code: RETRAITE_COMP_T1_SAL
    nom: "Retraite complémentaire AGIRC-ARRCO Tranche 1 - Part salariale"
    categorie: RETRAITE_COMPLEMENTAIRE
    organisme: AGIRC_ARRCO
    type: COTISATION_SALARIALE
    actif: true
    applicableACadre: null       # null = tous les statuts
    applicableANonCadre: null
    applicableAForfaitJours: null
    calcul:
      type: TRANCHES
      assiette: SALAIRE_BRUT
      plafond: null
      plancher: null
    tranches:
      - tranche: TRANCHE_A
        taux: 0.0402
        plancher_pass: 0
        plafond_pass: 1
        ordre: 1
        date_debut: "2024-01-01"
        date_fin: null
    comptabilite:
      compte_debit: "6411"
      compte_credit: "437"
```

### Cotisations spécifiques à un statut

```yaml
  - code: RETRAITE_COMP_CET_SAL
    nom: "Contribution exceptionnelle temporaire (CET) - Part salariale"
    applicableACadre: true         # Uniquement pour les cadres
    applicableANonCadre: null
    applicableAForfaitJours: true
    # ...
```

## Chargement des fixtures

### Charger les tranches AGIRC-ARRCO

```bash
cd backend
node scripts/seed-cotisations.js fixtures/cotisations/cotisations-tranches-abc-2024-2025.yaml
```

### Résultat attendu

```
✅ 10 règles de cotisations synchronisées
📊 Récapitulatif des données en base:
   • Catégories: 1
   • Organismes: 1
   • Règles de cotisations: 10
   • Taux historiques: 0
   • Tranches de cotisation: 10
   • Règles comptables: 10
```

## Migrations

### Migration appliquée

```
20251122_add_tranches_statuts_exonerations
```

Cette migration ajoute :
- Champ `statut` dans la table `Employee`
- Table `tranches_cotisation`
- Champs `applicableACadre`, `applicableANonCadre`, `applicableAForfaitJours` dans `regles_cotisation`
- Tables `definitions_exoneration` et `exonerations_employe`

### Appliquer la migration

```bash
cd backend
node scripts/apply-migrations.js
```

## Tests

### Test manuel rapide

```bash
cd backend
node test-tranches.js
```

Ce script vérifie :
- ✅ Que les tranches sont bien chargées en base
- ✅ Que les calculs manuels fonctionnent correctement
- ✅ Que les montants calculés sont cohérents

### Tests automatiques

Les tests automatiques pour les calculs par tranches seront ajoutés dans `backend/src/tests/cotisations.test.ts`.

## Constantes et validateurs

### Nouveaux validateurs

Ajoutés dans `backend/src/lib/cotisations-constants.ts` :

```typescript
export const STATUT_EMPLOYE_VALIDES = ['NON_CADRE', 'CADRE', 'FORFAIT_JOURS'];
export const TRANCHE_SALARIALE_VALIDES = ['TRANCHE_A', 'TRANCHE_B', 'TRANCHE_C'];
export const TYPE_EXONERATION_VALIDES = ['ACCRE_ACRE', 'ZRR', 'ZFU', 'BER', 'ZRD', 'APPRENTI', 'PROFESSIONNALISATION', 'AUTRE'];

export function isStatutEmployeValide(statut: string): boolean;
export function isTrancheSalarialeValide(tranche: string): boolean;
export function isTypeExonerationValide(type: string): boolean;
```

## Références

- [Documentation URSSAF - PASS 2025](https://www.urssaf.fr/portail/home/taux-et-baremes/plafond-de-la-securite-social.html)
- [AGIRC-ARRCO - Taux de cotisations](https://www.agirc-arrco.fr/employeurs/vos-cotisations/)
- [Issue #44 - GitHub](https://github.com/ambroise-leclerc/OpenPayFit/issues/44)

## Évolutions futures

- [ ] Ajouter des tests automatiques unitaires complets
- [ ] Implémenter la gestion des exonérations dans le calcul
- [ ] Ajouter l'interface frontend pour gérer les statuts d'employés
- [ ] Créer un tableau de bord pour visualiser les cotisations par tranche
- [ ] Support de la tranche C (cadres dirigeants)

---

**Version** : 1.0
**Date** : 2025-11-22
**Auteur** : OpenPayFit Team
