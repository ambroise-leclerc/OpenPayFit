---
title: "[FEATURE] Données de référence françaises pour 2024-2025"
labels: data, payroll, france, medium-priority
assignees:
---

## Description

Créer un jeu de données complet avec les cotisations sociales françaises réelles pour 2024-2025, basé sur les barèmes officiels URSSAF, AGIRC-ARRCO et administration fiscale.

## Cotisations à implémenter

### Sécurité sociale (URSSAF)

#### Part salariale
- Maladie : 0% (supprimée en 2018)
- Vieillesse plafonnée : 6.90% (dans la limite du PASS)
- Vieillesse déplafonnée : 0.40%

#### Part patronale
- Maladie : 13.00%
- Vieillesse plafonnée : 8.55%
- Vieillesse déplafonnée : 1.90%
- Allocations familiales : 3.45% (5.25% si salaire > 3.5 SMIC)
- Accident du travail : 1.5% (variable selon secteur, utiliser moyenne)

### Chômage (Pôle emploi)

- Part salariale : 2.40% (dans la limite de 4 PASS)
- Part patronale : 4.05%

### Retraite complémentaire (AGIRC-ARRCO)

- Tranche 1 (jusqu'au PASS) :
  - Part salariale : 3.15%
  - Part patronale : 4.72%
- Tranche 2 (entre 1 et 8 PASS) :
  - Part salariale : 8.64%
  - Part patronale : 12.95%

### CSG/CRDS

- CSG déductible : 6.80%
- CSG non déductible : 2.40%
- CRDS : 0.50%
- Assiette : 98.25% du salaire brut

### Autres contributions

- Formation professionnelle : 0.55% à 1% (employeur, selon taille entreprise)
- Taxe d'apprentissage : 0.68% (employeur)
- Contribution au dialogue social : 0.016% (employeur)

## Constantes 2024

- **PASS 2024** : 46 368 €/an (3 864 €/mois)
- **SMIC 2024** : 1 766.92 € brut/mois

## Structure du fichier YAML

```yaml
# backend/fixtures/cotisations/france-2024.yaml

categories:
  - code: SECURITE_SOCIALE
    nom: "Sécurité sociale"
    description: "Maladie, vieillesse, allocations familiales"

  - code: RETRAITE
    nom: "Retraite complémentaire"
    description: "AGIRC-ARRCO"

  - code: CHOMAGE
    nom: "Assurance chômage"
    description: "Pôle emploi"

  - code: CSG_CRDS
    nom: "CSG/CRDS"
    description: "Contributions sociales généralisées"

organismes:
  - code: URSSAF
    nom: "URSSAF"
    description: "Union de recouvrement des cotisations de sécurité sociale"

  - code: AGIRC_ARRCO
    nom: "AGIRC-ARRCO"
    description: "Association générale des institutions de retraite des cadres"

  - code: POLE_EMPLOI
    nom: "Pôle emploi"
    description: "Service public de l'emploi"

regles:
  # Sécurité sociale - Vieillesse plafonnée
  - code: SS_VIEILLESSE_PLAF_SAL
    nom: "Vieillesse plafonnée - Part salariale"
    categorie: SECURITE_SOCIALE
    organisme: URSSAF
    type: COTISATION_SALARIALE
    calcul:
      type: POURCENTAGE
      assiette: SALAIRE_PLAFONNE
      plafond: 3864  # PASS mensuel
    taux:
      - taux: 0.0690
        date_debut: "2024-01-01"
    comptabilite:
      compte_debit: "6451"
      compte_credit: "431"
    actif: true

  - code: SS_VIEILLESSE_PLAF_PAT
    nom: "Vieillesse plafonnée - Part patronale"
    categorie: SECURITE_SOCIALE
    organisme: URSSAF
    type: COTISATION_PATRONALE
    calcul:
      type: POURCENTAGE
      assiette: SALAIRE_PLAFONNE
      plafond: 3864
    taux:
      - taux: 0.0855
        date_debut: "2024-01-01"
    comptabilite:
      compte_debit: "6451"
      compte_credit: "431"
    actif: true

  # Sécurité sociale - Vieillesse déplafonnée
  - code: SS_VIEILLESSE_DEPLAF_SAL
    nom: "Vieillesse déplafonnée - Part salariale"
    categorie: SECURITE_SOCIALE
    organisme: URSSAF
    type: COTISATION_SALARIALE
    calcul:
      type: POURCENTAGE
      assiette: SALAIRE_BRUT
    taux:
      - taux: 0.0040
        date_debut: "2024-01-01"
    comptabilite:
      compte_debit: "6451"
      compte_credit: "431"
    actif: true

  - code: SS_VIEILLESSE_DEPLAF_PAT
    nom: "Vieillesse déplafonnée - Part patronale"
    categorie: SECURITE_SOCIALE
    organisme: URSSAF
    type: COTISATION_PATRONALE
    calcul:
      type: POURCENTAGE
      assiette: SALAIRE_BRUT
    taux:
      - taux: 0.0190
        date_debut: "2024-01-01"
    comptabilite:
      compte_debit: "6451"
      compte_credit: "431"
    actif: true

  # Maladie
  - code: SS_MALADIE_PAT
    nom: "Maladie - Part patronale"
    categorie: SECURITE_SOCIALE
    organisme: URSSAF
    type: COTISATION_PATRONALE
    calcul:
      type: POURCENTAGE
      assiette: SALAIRE_BRUT
    taux:
      - taux: 0.1300
        date_debut: "2024-01-01"
    comptabilite:
      compte_debit: "6451"
      compte_credit: "431"
    actif: true

  # Allocations familiales
  - code: SS_ALLOCATIONS_FAMILIALES_PAT
    nom: "Allocations familiales - Part patronale"
    categorie: SECURITE_SOCIALE
    organisme: URSSAF
    type: COTISATION_PATRONALE
    calcul:
      type: POURCENTAGE
      assiette: SALAIRE_BRUT
    taux:
      - taux: 0.0345
        date_debut: "2024-01-01"
    comptabilite:
      compte_debit: "6451"
      compte_credit: "431"
    actif: true

  # Accident du travail
  - code: SS_ACCIDENT_TRAVAIL_PAT
    nom: "Accident du travail - Part patronale"
    categorie: SECURITE_SOCIALE
    organisme: URSSAF
    type: COTISATION_PATRONALE
    calcul:
      type: POURCENTAGE
      assiette: SALAIRE_BRUT
    taux:
      - taux: 0.0150
        date_debut: "2024-01-01"
    comptabilite:
      compte_debit: "6451"
      compte_credit: "431"
    actif: true

  # Chômage
  - code: CHOMAGE_SAL
    nom: "Assurance chômage - Part salariale"
    categorie: CHOMAGE
    organisme: POLE_EMPLOI
    type: COTISATION_SALARIALE
    calcul:
      type: POURCENTAGE
      assiette: SALAIRE_BRUT
      plafond: 15456  # 4 x PASS
    taux:
      - taux: 0.0240
        date_debut: "2024-01-01"
    comptabilite:
      compte_debit: "6453"
      compte_credit: "437"
    actif: true

  - code: CHOMAGE_PAT
    nom: "Assurance chômage - Part patronale"
    categorie: CHOMAGE
    organisme: POLE_EMPLOI
    type: COTISATION_PATRONALE
    calcul:
      type: POURCENTAGE
      assiette: SALAIRE_BRUT
      plafond: 15456
    taux:
      - taux: 0.0405
        date_debut: "2024-01-01"
    comptabilite:
      compte_debit: "6453"
      compte_credit: "437"
    actif: true

  # AGIRC-ARRCO Tranche 1
  - code: RETRAITE_ARRCO_T1_SAL
    nom: "Retraite ARRCO Tranche 1 - Part salariale"
    categorie: RETRAITE
    organisme: AGIRC_ARRCO
    type: COTISATION_SALARIALE
    calcul:
      type: POURCENTAGE
      assiette: SALAIRE_PLAFONNE
      plafond: 3864
    taux:
      - taux: 0.0315
        date_debut: "2024-01-01"
    comptabilite:
      compte_debit: "6452"
      compte_credit: "437"
    actif: true

  - code: RETRAITE_ARRCO_T1_PAT
    nom: "Retraite ARRCO Tranche 1 - Part patronale"
    categorie: RETRAITE
    organisme: AGIRC_ARRCO
    type: COTISATION_PATRONALE
    calcul:
      type: POURCENTAGE
      assiette: SALAIRE_PLAFONNE
      plafond: 3864
    taux:
      - taux: 0.0472
        date_debut: "2024-01-01"
    comptabilite:
      compte_debit: "6452"
      compte_credit: "437"
    actif: true

  # CSG déductible
  - code: CSG_DEDUCTIBLE
    nom: "CSG déductible"
    categorie: CSG_CRDS
    organisme: URSSAF
    type: CHARGE_FISCALE
    calcul:
      type: POURCENTAGE
      assiette: SALAIRE_BRUT  # 98.25% en réalité
    taux:
      - taux: 0.0668  # 6.8% * 98.25%
        date_debut: "2024-01-01"
    comptabilite:
      compte_debit: "6451"
      compte_credit: "437"
    actif: true

  # CSG non déductible
  - code: CSG_NON_DEDUCTIBLE
    nom: "CSG non déductible"
    categorie: CSG_CRDS
    organisme: URSSAF
    type: CHARGE_FISCALE
    calcul:
      type: POURCENTAGE
      assiette: SALAIRE_BRUT
    taux:
      - taux: 0.0236  # 2.4% * 98.25%
        date_debut: "2024-01-01"
    comptabilite:
      compte_debit: "6451"
      compte_credit: "437"
    actif: true

  # CRDS
  - code: CRDS
    nom: "CRDS"
    categorie: CSG_CRDS
    organisme: URSSAF
    type: CHARGE_FISCALE
    calcul:
      type: POURCENTAGE
      assiette: SALAIRE_BRUT
    taux:
      - taux: 0.0049  # 0.5% * 98.25%
        date_debut: "2024-01-01"
    comptabilite:
      compte_debit: "6451"
      compte_credit: "437"
    actif: true
```

## Tâches

- [ ] Créer le fichier `backend/fixtures/cotisations/france-2024.yaml`
- [ ] Définir toutes les catégories et organismes
- [ ] Créer toutes les règles de cotisations (environ 20 règles)
- [ ] Ajouter les taux avec dates d'effet
- [ ] Associer les comptes comptables PCG
- [ ] Créer un script de seed : `backend/scripts/chargerCotisations.ts`
- [ ] Documenter les sources législatives
- [ ] Créer des tests d'intégration vérifiant les montants

## Script de seed

```typescript
// backend/scripts/chargerCotisations.ts

import { AnalyseurCotisations } from '../src/lib/analyseurCotisations';
import prisma from '../src/lib/db';

async function chargerCotisationsFrance2024() {
  console.log('Chargement des cotisations françaises 2024...');

  const analyseur = new AnalyseurCotisations();
  const regles = analyseur.chargerDepuisFichier(
    './fixtures/cotisations/france-2024.yaml'
  );

  console.log(`${regles.length} règles trouvées`);

  // Importer en base de données
  await analyseur.importerRegles(regles);

  console.log('Import terminé avec succès');
}

chargerCotisationsFrance2024()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
```

## Sources officielles

- [Urssaf.fr - Taux de cotisations 2024](https://www.urssaf.fr/portail/home/taux-et-baremes.html)
- [AGIRC-ARRCO - Taux 2024](https://www.agirc-arrco.fr/particuliers/cotiser/taux-cotisations/)
- [Service-public.fr - Cotisations sociales](https://www.service-public.fr/professionnels-entreprises/vosdroits/F23107)
- [Plan comptable général](https://www.plancomptable.com/)

## Critères d'acceptation

- [ ] Toutes les cotisations principales sont présentes
- [ ] Les taux sont à jour et vérifiés avec les sources officielles
- [ ] Le script de seed fonctionne correctement
- [ ] Les calculs de test correspondent aux barèmes officiels
- [ ] La documentation cite les sources
- [ ] Les comptes comptables sont conformes au PCG

## Tests de validation

```typescript
// Vérifier qu'un salaire de 3000€ brut donne environ 2250€ net
describe('Cotisations France 2024', () => {
  it('devrait calculer correctement un salaire de 3000€', async () => {
    const resultat = await moteur.calculerPaie({
      salaireBrut: 3000,
      employeId: 'test',
      dateCalcul: new Date('2024-11-15')
    });

    // Vérifications basées sur les barèmes officiels
    expect(resultat.totalCotisationsSalariales).toBeCloseTo(750, 10);
    expect(resultat.salaireNet).toBeCloseTo(2250, 10);
  });
});
```

## Dépendances

- Requiert : Issue #1 (Schéma de données)
- Requiert : Issue #2 (DSL YAML)
- Utilisé par : Issue #7 (Migration module de paie)

## Notes

Ce jeu de données servira de base de référence pour valider les calculs du moteur de paie. Il doit être maintenu à jour chaque année avec les nouveaux taux.
