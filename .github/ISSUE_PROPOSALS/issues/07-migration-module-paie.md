---
title: "[FEATURE] Migration du module de paie vers le nouveau système de règles"
labels: enhancement, payroll, breaking-change, high-priority
assignees:
---

## Description

Migrer le module de paie existant (`backend/src/lib/payroll.ts`) pour utiliser le nouveau système de règles de cotisations au lieu du taux fixe de 25%.

## Contexte

Actuellement, le module utilise :
```typescript
// backend/src/lib/payroll.ts:83
const DEDUCTION_RATE = 0.25;

export function calculateDeductions(grossSalary: number): number {
  return Math.round(grossSalary * DEDUCTION_RATE * 100) / 100;
}
```

Cette approche simpliste doit être remplacée par le moteur de calcul détaillé des cotisations.

## Modifications à apporter

### 1. Mise à jour du schéma Prisma - Modèle `Payslip`

**Schéma actuel** :
```prisma
model Payslip {
  id          String   @id @default(cuid())
  payPeriod   String
  grossSalary Float
  deductions  Float    // Montant total simplifié
  netSalary   Float
  employeeId  String
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

**Nouveau schéma proposé** :
```prisma
model FichePaie {
  id                          String                      @id @default(cuid())
  periode                     String                      // Format: "2024-11"
  salaireBrut                 Float

  // Détails calculés
  totalCotisationsSalariales  Float
  totalCotisationsPatronales  Float
  totalChargesFiscales        Float
  salaireNet                  Float
  coutTotal                   Float                       // Coût total employeur

  // Relations
  employe                     Employee                    @relation(fields: [employeId], references: [id])
  employeId                   String
  lignesCotisations           LigneCotisationFichePaie[]

  dateCreation                DateTime                    @default(now())
  dateModification            DateTime                    @updatedAt

  @@unique([employeId, periode])
  @@map("Payslip")  // Garder le nom de table existant pour la migration
}

// Détail ligne par ligne des cotisations
model LigneCotisationFichePaie {
  id              String      @id @default(cuid())
  fichePaie       FichePaie   @relation(fields: [fichePaieId], references: [id], onDelete: Cascade)
  fichePaieId     String

  // Référence à la règle appliquée
  codeRegle       String
  nomRegle        String
  typeRegle       String      // COTISATION_SALARIALE | COTISATION_PATRONALE | CHARGE_FISCALE
  categorie       String
  organisme       String

  // Calcul
  assiette        Float
  taux            Float
  montant         Float

  // Comptabilité
  compteDebit     String
  compteCredit    String

  dateCreation    DateTime    @default(now())

  @@map("PayslipContributionLine")
}
```

### 2. Modification du fichier `backend/src/lib/payroll.ts`

**Avant** :
```typescript
const DEDUCTION_RATE = 0.25;

export function calculateDeductions(grossSalary: number): number {
  return Math.round(grossSalary * DEDUCTION_RATE * 100) / 100;
}

export function calculateNetSalary(grossSalary: number): number {
  const deductions = calculateDeductions(grossSalary);
  return Math.round((grossSalary - deductions) * 100) / 100;
}
```

**Après** :
```typescript
import { MoteurCotisations } from './moteurCotisations';

const moteur = new MoteurCotisations();

/**
 * Calcule les détails d'une fiche de paie avec toutes les cotisations
 */
export async function calculerDetailsFichePaie(
  salaireBrut: number,
  employeId: string,
  dateCalcul: Date
): Promise<ResultatCalculPaie> {
  return await moteur.calculerPaie({
    salaireBrut,
    employeId,
    dateCalcul
  });
}

/**
 * @deprecated Utiliser calculerDetailsFichePaie à la place
 */
export function calculateDeductions(grossSalary: number): number {
  // Garder pour rétrocompatibilité
  return Math.round(grossSalary * 0.25 * 100) / 100;
}
```

### 3. Mise à jour de la fonction `createPayslip`

**Avant** :
```typescript
export function createPayslip(
  employeeId: string,
  payPeriod: string,
  grossSalary: number
): Payslip {
  const deductions = calculateDeductions(grossSalary);
  const netSalary = calculateNetSalary(grossSalary);

  // Insertion simple
  db.prepare(`INSERT INTO Payslip ...`).run(...);
}
```

**Après** :
```typescript
export async function creerFichePaie(
  employeId: string,
  periode: string,
  salaireBrut: number
): Promise<FichePaie> {
  const dateCalcul = new Date(periode + '-15'); // 15 du mois

  // Calculer avec le nouveau moteur
  const details = await calculerDetailsFichePaie(
    salaireBrut,
    employeId,
    dateCalcul
  );

  // Enregistrer en base avec le détail des cotisations
  const fichePaie = await prisma.fichePaie.create({
    data: {
      periode,
      salaireBrut,
      totalCotisationsSalariales: details.totalCotisationsSalariales,
      totalCotisationsPatronales: details.totalCotisationsPatronales,
      totalChargesFiscales: details.totalChargesFiscales,
      salaireNet: details.salaireNet,
      coutTotal: details.coutTotal,
      employeId,
      lignesCotisations: {
        create: [
          ...details.cotisationsSalariales,
          ...details.cotisationsPatronales,
          ...details.chargesFiscales
        ].map(ligne => ({
          codeRegle: ligne.code,
          nomRegle: ligne.nom,
          typeRegle: ligne.type,
          categorie: ligne.categorie,
          organisme: ligne.organisme,
          assiette: ligne.assiette,
          taux: ligne.taux,
          montant: ligne.montant,
          compteDebit: ligne.compteDebit,
          compteCredit: ligne.compteCredit
        }))
      }
    },
    include: {
      lignesCotisations: true
    }
  });

  return fichePaie;
}
```

### 4. Mise à jour de l'API

**Modifier** : `backend/src/api/payroll.ts`

Ajouter un endpoint pour récupérer le détail des cotisations :

```typescript
// GET /api/companies/:companyId/payslips/:payslipId/details
router.get('/companies/:companyId/payslips/:payslipId/details',
  authenticateToken,
  async (req, res) => {
    const { payslipId } = req.params;

    const fichePaie = await prisma.fichePaie.findUnique({
      where: { id: payslipId },
      include: {
        lignesCotisations: true,
        employe: true
      }
    });

    if (!fichePaie) {
      return res.status(404).json({ erreur: 'Fiche de paie introuvable' });
    }

    res.json(fichePaie);
  }
);
```

### 5. Mise à jour du générateur PDF

**Modifier** : `backend/src/lib/pdfGenerator.ts`

Ajouter l'affichage détaillé des cotisations dans le bulletin de paie :

```typescript
export async function genererBulletinPaiePDF(fichePaieId: string): Promise<Buffer> {
  const fichePaie = await prisma.fichePaie.findUnique({
    where: { id: fichePaieId },
    include: {
      lignesCotisations: true,
      employe: {
        include: { company: true }
      }
    }
  });

  // Créer le PDF avec le détail ligne par ligne
  const doc = new PDFDocument();

  // Titre
  doc.fontSize(20).text('Bulletin de paie', { align: 'center' });

  // Informations employé
  doc.fontSize(12).text(`Employé: ${fichePaie.employe.firstName} ${fichePaie.employe.lastName}`);
  doc.text(`Période: ${fichePaie.periode}`);
  doc.text(`Salaire brut: ${fichePaie.salaireBrut.toFixed(2)} €`);

  // Tableau des cotisations salariales
  doc.fontSize(14).text('\nCotisations salariales', { underline: true });
  fichePaie.lignesCotisations
    .filter(l => l.typeRegle === 'COTISATION_SALARIALE')
    .forEach(ligne => {
      doc.fontSize(10).text(
        `${ligne.nomRegle}: ${ligne.montant.toFixed(2)} € (${(ligne.taux * 100).toFixed(2)}%)`
      );
    });

  // Tableau des cotisations patronales
  doc.fontSize(14).text('\nCotisations patronales', { underline: true });
  fichePaie.lignesCotisations
    .filter(l => l.typeRegle === 'COTISATION_PATRONALE')
    .forEach(ligne => {
      doc.fontSize(10).text(
        `${ligne.nomRegle}: ${ligne.montant.toFixed(2)} € (${(ligne.taux * 100).toFixed(2)}%)`
      );
    });

  // Totaux
  doc.fontSize(12).text(`\nTotal cotisations salariales: ${fichePaie.totalCotisationsSalariales.toFixed(2)} €`);
  doc.fontSize(14).text(`Salaire net: ${fichePaie.salaireNet.toFixed(2)} €`, { bold: true });
  doc.fontSize(12).text(`Coût total employeur: ${fichePaie.coutTotal.toFixed(2)} €`);

  doc.end();
  return doc;
}
```

## Tâches

- [ ] Créer la migration Prisma pour le nouveau schéma
- [ ] Modifier `backend/src/lib/payroll.ts` pour utiliser le moteur
- [ ] Mettre à jour tous les tests du module de paie
- [ ] Modifier l'API `/api/payroll/*` si nécessaire
- [ ] Mettre à jour le générateur PDF pour afficher le détail
- [ ] Créer un script de migration des données existantes
- [ ] Tester en conditions réelles
- [ ] Mettre à jour la documentation

## Migration des données existantes

```typescript
// backend/scripts/migrerFichesPaie.ts

async function migrerAnciennesFichesPaie() {
  const anciennesFiches = await prisma.payslip.findMany();

  for (const ancienne of anciennesFiches) {
    // Créer une ligne de cotisation "Legacy" pour conserver l'historique
    await prisma.fichePaie.create({
      data: {
        id: ancienne.id,
        periode: ancienne.payPeriod,
        salaireBrut: ancienne.grossSalary,
        totalCotisationsSalariales: ancienne.deductions,
        totalCotisationsPatronales: 0,
        totalChargesFiscales: 0,
        salaireNet: ancienne.netSalary,
        coutTotal: ancienne.grossSalary,
        employeId: ancienne.employeeId,
        lignesCotisations: {
          create: [{
            codeRegle: 'LEGACY_25',
            nomRegle: 'Cotisations (ancien système - 25%)',
            typeRegle: 'COTISATION_SALARIALE',
            categorie: 'Legacy',
            organisme: 'Système simplifié',
            assiette: ancienne.grossSalary,
            taux: 0.25,
            montant: ancienne.deductions,
            compteDebit: '6451',
            compteCredit: '431'
          }]
        }
      }
    });
  }

  console.log(`${anciennesFiches.length} fiches de paie migrées`);
}
```

## Stratégie de migration

**Option recommandée** : Migration automatique avec conservation de l'historique

1. Créer le nouveau schéma
2. Migrer les anciennes fiches avec une ligne "Legacy - 25%"
3. Toutes les nouvelles fiches utilisent le système détaillé
4. Affichage adapté selon le format (ancien/nouveau)

## Tests de non-régression

```typescript
describe('Migration module de paie', () => {
  it('devrait générer des fiches avec le nouveau système', async () => {
    const resultat = await creerFichePaie('emp1', '2024-11', 3000);

    expect(resultat.lignesCotisations.length).toBeGreaterThan(10);
    expect(resultat.totalCotisationsSalariales).toBeCloseTo(750, 2);
  });

  it('devrait conserver les anciennes fiches lisibles', async () => {
    // Vérifier qu'on peut toujours lire les anciennes fiches
  });

  it('devrait calculer le même résultat qu\'avant pour la rétrocompatibilité', async () => {
    // Vérifier que salaireNet ≈ salaireBrut * 0.75
  });
});
```

## Critères d'acceptation

- [ ] Le nouveau système génère des fiches de paie détaillées
- [ ] Tous les tests passent (unitaires + intégration)
- [ ] Les anciennes fiches de paie restent consultables
- [ ] Le PDF affiche le détail des cotisations
- [ ] La performance reste acceptable
- [ ] La documentation est à jour
- [ ] Aucune régression sur les fonctionnalités existantes

## Dépendances

- Requiert : Issue #1 (Schéma de données)
- Requiert : Issue #4 (Moteur de calcul)
- Recommandé : Issue #6 (Données françaises 2024)

## Notes importantes

⚠️ **Breaking change** : Cette migration modifie profondément le fonctionnement du module de paie.

✅ **Avantages** :
- Calculs précis et conformes
- Détail complet des cotisations
- Traçabilité comptable
- Bulletins de paie conformes

⚠️ **Risques** :
- Migration des données existantes
- Tests exhaustifs nécessaires
- Formation des utilisateurs

## Rollback

En cas de problème, possibilité de revenir à l'ancien système en :
1. Gardant l'ancienne fonction `calculateDeductions`
2. Ajoutant un flag de feature toggle
3. Conservant les deux systèmes en parallèle temporairement
