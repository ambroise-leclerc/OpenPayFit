---
title: "[FEATURE] Créer un DSL (Domain-Specific Language) pour décrire les règles de cotisations"
labels: enhancement, payroll, high-priority
assignees:
---

## Description

Développer un langage simple et déclaratif au format YAML permettant de définir les règles de cotisations et fiscales de manière lisible et maintenable.

## Contexte

Pour faciliter la configuration et la maintenance des règles de paie, nous avons besoin d'un format simple qui puisse être :
- Lisible par un non-développeur (RH, comptable)
- Versionnable (Git)
- Facilement modifiable
- Validable automatiquement

## Proposition de format YAML

```yaml
# Exemple : Assurance maladie
regles:
  - code: SS_MALADIE_SAL
    nom: "Assurance maladie - Part salariale"
    categorie: SECURITE_SOCIALE
    organisme: URSSAF
    type: COTISATION_SALARIALE

    calcul:
      type: POURCENTAGE
      assiette: SALAIRE_BRUT

    taux:
      - taux: 0.0755  # 7.55%
        date_debut: "2024-01-01"
        date_fin: null

    comptabilite:
      compte_debit: "6451"   # Charges de sécurité sociale
      compte_credit: "431"   # Sécurité sociale

    actif: true

  - code: SS_MALADIE_PAT
    nom: "Assurance maladie - Part patronale"
    categorie: SECURITE_SOCIALE
    organisme: URSSAF
    type: COTISATION_PATRONALE

    calcul:
      type: POURCENTAGE
      assiette: SALAIRE_BRUT

    taux:
      - taux: 0.1300  # 13.00%
        date_debut: "2024-01-01"

    comptabilite:
      compte_debit: "6451"
      compte_credit: "431"

    actif: true

  - code: RETRAITE_BASE_SAL
    nom: "Retraite de base - Part salariale"
    categorie: RETRAITE
    organisme: URSSAF
    type: COTISATION_SALARIALE

    calcul:
      type: POURCENTAGE
      assiette: SALAIRE_PLAFONNE  # Plafonné au PASS
      plafond: 46368  # PASS 2024

    taux:
      - taux: 0.0690  # 6.90%
        date_debut: "2024-01-01"

    comptabilite:
      compte_debit: "6452"
      compte_credit: "431"

    actif: true

  - code: CHOMAGE_SAL
    nom: "Assurance chômage - Part salariale"
    categorie: CHOMAGE
    organisme: POLE_EMPLOI
    type: COTISATION_SALARIALE

    calcul:
      type: POURCENTAGE
      assiette: SALAIRE_BRUT
      plafond: 185472  # 4 x PASS

    taux:
      - taux: 0.0240  # 2.40%
        date_debut: "2024-01-01"

    comptabilite:
      compte_debit: "6453"
      compte_credit: "437"

    actif: true
```

## Exemples de règles à implémenter

**Cotisations sociales (France 2024)** :
- Maladie, maternité, invalidité, décès
- Vieillesse plafonnée et déplafonnée
- Allocations familiales
- Accident du travail
- Chômage
- Retraite complémentaire (AGIRC-ARRCO)
- CSG/CRDS

## Tâches

- [ ] Installer la dépendance YAML : `npm install js-yaml` et `npm install -D @types/js-yaml`
- [ ] Créer un parseur dans `backend/src/lib/analyseurCotisations.ts`
- [ ] Implémenter la validation du format avec Zod
- [ ] Créer des fixtures d'exemple dans `backend/fixtures/cotisations/`
- [ ] Documenter le DSL dans `/docs/DSL_REGLES_COTISATIONS.md`
- [ ] Créer des tests unitaires pour le parseur

## Structure du parseur

```typescript
// backend/src/lib/analyseurCotisations.ts

import yaml from 'js-yaml';
import { z } from 'zod';
import fs from 'fs';

// Schéma de validation Zod
const SchemaRegleCotisation = z.object({
  code: z.string().min(1),
  nom: z.string().min(1),
  categorie: z.string(),
  organisme: z.string(),
  type: z.enum(['COTISATION_SALARIALE', 'COTISATION_PATRONALE', 'CHARGE_FISCALE']),
  calcul: z.object({
    type: z.enum(['POURCENTAGE', 'MONTANT_FIXE', 'TRANCHES']),
    assiette: z.enum(['SALAIRE_BRUT', 'SALAIRE_NET', 'SALAIRE_PLAFONNE']),
    plafond: z.number().optional(),
    plancher: z.number().optional()
  }),
  taux: z.array(z.object({
    taux: z.number().min(0).max(1),
    date_debut: z.string(),
    date_fin: z.string().nullable().optional()
  })),
  comptabilite: z.object({
    compte_debit: z.string(),
    compte_credit: z.string()
  }),
  actif: z.boolean()
});

const SchemaFichierCotisations = z.object({
  regles: z.array(SchemaRegleCotisation)
});

export class AnalyseurCotisations {
  /**
   * Charge et valide un fichier YAML de règles
   */
  chargerDepuisFichier(cheminFichier: string) {
    const contenu = fs.readFileSync(cheminFichier, 'utf8');
    const donnees = yaml.load(contenu);

    // Validation avec Zod
    const resultat = SchemaFichierCotisations.safeParse(donnees);

    if (!resultat.success) {
      throw new Error(`Fichier invalide: ${resultat.error.message}`);
    }

    return resultat.data.regles;
  }

  /**
   * Importe les règles en base de données
   */
  async importerRegles(regles: any[]) {
    // À implémenter dans l'issue #3
  }
}
```

## Critères d'acceptation

- [ ] Le parseur charge correctement un fichier YAML
- [ ] La validation détecte les erreurs de format
- [ ] Les règles sont correctement mappées vers le schéma de base de données
- [ ] Des exemples complets sont fournis
- [ ] La documentation est claire et complète
- [ ] Tests unitaires couvrent les cas nominaux et d'erreur

## Dépendances

- Requiert : Issue #1 (Schéma de données)
- Bloque : Issue #3 (API import/export)

## Ressources utiles

- [js-yaml](https://github.com/nodeca/js-yaml)
- [Zod](https://zod.dev/)
