---
title: "[FEATURE] Moteur de calcul des cotisations"
labels: enhancement, payroll, high-priority, breaking-change
assignees:
---

## Description

Implémenter le moteur de calcul qui applique les règles de cotisations pour générer une fiche de paie détaillée avec le détail de chaque cotisation.

## Fonctionnalités

Le moteur doit :
1. Récupérer toutes les règles actives pour une date donnée
2. Calculer chaque cotisation selon son type (pourcentage, fixe, tranches)
3. Gérer les plafonds (PASS) et planchers
4. Distinguer cotisations salariales et patronales
5. Générer un détail ligne par ligne
6. Calculer les totaux et le salaire net

## Architecture proposée

```typescript
// backend/src/lib/moteurCotisations.ts

interface DonneesCalculPaie {
  salaireBrut: number;
  dateCalcul: Date;
  employeId: string;
}

interface LigneCotisation {
  code: string;
  nom: string;
  type: 'COTISATION_SALARIALE' | 'COTISATION_PATRONALE' | 'CHARGE_FISCALE';
  categorie: string;
  organisme: string;
  assiette: number;       // Base de calcul
  taux: number;           // Taux appliqué
  montant: number;        // Montant calculé
  compteDebit: string;
  compteCredit: string;
}

interface ResultatCalculPaie {
  salaireBrut: number;
  cotisationsSalariales: LigneCotisation[];
  cotisationsPatronales: LigneCotisation[];
  chargesFiscales: LigneCotisation[];
  totalCotisationsSalariales: number;
  totalCotisationsPatronales: number;
  totalChargesFiscales: number;
  salaireNet: number;
  coutTotal: number;  // Coût total employeur
}

export class MoteurCotisations {
  /**
   * Calcule toutes les cotisations pour un salaire donné
   */
  async calculerPaie(donnees: DonneesCalculPaie): Promise<ResultatCalculPaie> {
    // 1. Récupérer les règles actives
    const regles = await this.obtenirReglesActives(donnees.dateCalcul);

    // 2. Calculer chaque cotisation
    const cotisations = await Promise.all(
      regles.map(regle => this.calculerCotisation(regle, donnees))
    );

    // 3. Grouper par type
    const cotisationsSalariales = cotisations.filter(
      c => c.type === 'COTISATION_SALARIALE'
    );
    const cotisationsPatronales = cotisations.filter(
      c => c.type === 'COTISATION_PATRONALE'
    );
    const chargesFiscales = cotisations.filter(
      c => c.type === 'CHARGE_FISCALE'
    );

    // 4. Calculer les totaux
    const totalCotisationsSalariales = this.somme(cotisationsSalariales);
    const totalCotisationsPatronales = this.somme(cotisationsPatronales);
    const totalChargesFiscales = this.somme(chargesFiscales);

    const salaireNet = donnees.salaireBrut - totalCotisationsSalariales;
    const coutTotal = donnees.salaireBrut + totalCotisationsPatronales;

    return {
      salaireBrut: donnees.salaireBrut,
      cotisationsSalariales,
      cotisationsPatronales,
      chargesFiscales,
      totalCotisationsSalariales,
      totalCotisationsPatronales,
      totalChargesFiscales,
      salaireNet,
      coutTotal
    };
  }

  /**
   * Calcule une cotisation individuelle
   */
  private async calculerCotisation(
    regle: RegleCotisation,
    donnees: DonneesCalculPaie
  ): Promise<LigneCotisation> {
    // Récupérer le taux actif
    const taux = await this.obtenirTauxActif(regle.id, donnees.dateCalcul);

    // Calculer l'assiette
    let assiette = this.calculerAssiette(regle.typeAssiette, donnees.salaireBrut);

    // Appliquer plafond/plancher
    if (regle.plafond) assiette = Math.min(assiette, regle.plafond);
    if (regle.plancher) assiette = Math.max(assiette, regle.plancher);

    // Calculer le montant
    let montant = 0;
    switch (regle.typeCalcul) {
      case 'POURCENTAGE':
        montant = assiette * taux.taux;
        break;
      case 'MONTANT_FIXE':
        montant = taux.taux;
        break;
      case 'TRANCHES':
        montant = this.calculerParTranches(assiette, taux);
        break;
    }

    return {
      code: regle.code,
      nom: regle.nom,
      type: regle.typeCotisation,
      categorie: regle.categorie.nom,
      organisme: regle.organisme.nom,
      assiette,
      taux: taux.taux,
      montant: Math.round(montant * 100) / 100,
      compteDebit: regle.reglesComptables[0]?.compteDebit || '',
      compteCredit: regle.reglesComptables[0]?.compteCredit || ''
    };
  }

  /**
   * Obtient les règles actives à une date donnée
   */
  private async obtenirReglesActives(date: Date): Promise<RegleCotisation[]> {
    return await prisma.regleCotisation.findMany({
      where: { estActif: true },
      include: {
        categorie: true,
        organisme: true,
        taux: {
          where: {
            dateDebut: { lte: date },
            OR: [
              { dateFin: null },
              { dateFin: { gte: date } }
            ]
          }
        },
        reglesComptables: true
      }
    });
  }

  /**
   * Calcule l'assiette selon le type
   */
  private calculerAssiette(typeAssiette: TypeAssiette, salaireBrut: number): number {
    switch (typeAssiette) {
      case 'SALAIRE_BRUT':
        return salaireBrut;
      case 'SALAIRE_NET':
        // Simplification : net ≈ brut * 0.75
        return salaireBrut * 0.75;
      case 'SALAIRE_PLAFONNE':
        return salaireBrut;
      default:
        return salaireBrut;
    }
  }

  /**
   * Somme les montants d'un tableau de cotisations
   */
  private somme(cotisations: LigneCotisation[]): number {
    return cotisations.reduce((total, c) => total + c.montant, 0);
  }
}
```

## Tâches

- [ ] Créer le fichier `backend/src/lib/moteurCotisations.ts`
- [ ] Implémenter la classe `MoteurCotisations`
- [ ] Gérer les différents types de calcul (pourcentage, fixe, tranches)
- [ ] Gérer les plafonds et planchers
- [ ] Créer les interfaces TypeScript dans `backend/src/types/moteurCotisations.ts`
- [ ] Créer des tests unitaires complets
- [ ] Documenter le moteur dans `/docs/MOTEUR_COTISATIONS.md`

## Migration du code existant

Le fichier `backend/src/lib/payroll.ts` utilise actuellement :
```typescript
const DEDUCTION_RATE = 0.25;

export function calculateDeductions(grossSalary: number): number {
  return Math.round(grossSalary * DEDUCTION_RATE * 100) / 100;
}
```

Il faudra le remplacer par :
```typescript
const moteur = new MoteurCotisations();

export async function calculerDetailsPaie(
  salaireBrut: number,
  employeId: string,
  dateCalcul: Date
) {
  return await moteur.calculerPaie({
    salaireBrut,
    employeId,
    dateCalcul
  });
}
```

## Tests à implémenter

```typescript
// backend/src/tests/moteurCotisations.test.ts

describe('MoteurCotisations', () => {
  it('devrait calculer correctement les cotisations salariales', async () => {
    const resultat = await moteur.calculerPaie({
      salaireBrut: 3000,
      employeId: 'test',
      dateCalcul: new Date('2024-11-15')
    });

    expect(resultat.totalCotisationsSalariales).toBeCloseTo(750, 2);
    expect(resultat.salaireNet).toBeCloseTo(2250, 2);
  });

  it('devrait respecter les plafonds (PASS)', async () => {
    // Tester avec un salaire > PASS
  });

  it('devrait appliquer les bons taux selon la date', async () => {
    // Tester l'historique des taux
  });

  it('devrait calculer les cotisations patronales', async () => {
    // Vérifier le coût total employeur
  });
});
```

## Critères d'acceptation

- [ ] Le moteur calcule correctement tous les types de cotisations
- [ ] Les plafonds et planchers sont respectés
- [ ] Les totaux sont exacts
- [ ] Les tests couvrent tous les cas de calcul
- [ ] La performance est acceptable (< 100ms pour un calcul complet)
- [ ] Le code est bien documenté

## Dépendances

- Requiert : Issue #1 (Schéma de données)
- Bloque : Issue #3 (API simulation)
- Bloque : Issue #7 (Migration module de paie)

## Performance

- Cible : < 100ms pour calculer une fiche de paie complète
- Optimisations possibles :
  - Cache des règles actives
  - Calculs en parallèle
  - Indexation des dates dans la base

## Notes

Ce moteur est le cœur du système de paie. Il doit être :
- **Fiable** : calculs précis au centime près
- **Performant** : gérer des centaines de calculs par seconde
- **Maintenable** : code clair et bien testé
