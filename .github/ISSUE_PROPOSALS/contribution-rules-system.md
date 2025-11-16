# Propositions d'Issues : Système de Règles de Cotisations et Fiscales

Ce document contient les propositions d'issues pour implémenter un système complet de description des règles de cotisations sociales et fiscales pour OpenPayFit.

---

## Issue 1 : [FEATURE] Définir le schéma de données pour les règles de cotisations et fiscales

### Description

Créer le schéma de base de données Prisma pour stocker et gérer les règles de cotisations sociales et fiscales de manière structurée et extensible.

### Contexte

Actuellement, le module de paie utilise un taux fixe de 25% pour les déductions (`DEDUCTION_RATE = 0.25` dans `/backend/src/lib/payroll.ts:83`). Ce système est trop simpliste pour une application de gestion de paie réaliste.

Il est nécessaire de créer un système flexible permettant de :
- Décrire précisément chaque règle de cotisation
- Gérer les différents organismes collecteurs
- Distinguer cotisations salariales et patronales
- Associer les règles comptables
- Maintenir un historique des taux (changements législatifs)

### Proposition de schéma

```prisma
// Catégorie de règle (Sécurité sociale, retraite, chômage, etc.)
model ContributionCategory {
  id          String        @id @default(cuid())
  code        String        @unique // Ex: "SS", "RETRAITE", "CHOMAGE"
  name        String        // Ex: "Sécurité sociale"
  description String?
  rules       ContributionRule[]
  createdAt   DateTime      @default(now())
  updatedAt   DateTime      @updatedAt
}

// Organisme collecteur
model ContributionOrganization {
  id          String        @id @default(cuid())
  code        String        @unique // Ex: "URSSAF", "AGIRC_ARRCO"
  name        String        // Ex: "URSSAF"
  description String?
  rules       ContributionRule[]
  createdAt   DateTime      @default(now())
  updatedAt   DateTime      @updatedAt
}

// Règle de cotisation ou charge
model ContributionRule {
  id                  String                    @id @default(cuid())
  code                String                    @unique // Ex: "SS_MALADIE_SAL"
  name                String                    // Ex: "Assurance maladie - Part salariale"
  description         String?

  // Classification
  category            ContributionCategory      @relation(fields: [categoryId], references: [id])
  categoryId          String
  organization        ContributionOrganization  @relation(fields: [organizationId], references: [id])
  organizationId      String

  // Type de règle
  type                ContributionType          // COTISATION_SALARIALE | COTISATION_PATRONALE | CHARGE_FISCALE

  // Calcul
  calculationType     CalculationType           // PERCENTAGE | FIXED_AMOUNT | TIERED
  baseType            BaseType                  // GROSS_SALARY | NET_SALARY | CAPPED_SALARY

  // Plafond et plancher (optionnels)
  floor               Float?                    // Plancher (montant minimum)
  ceiling             Float?                    // Plafond (montant maximum)

  // Taux actifs
  rates               ContributionRate[]

  // Règles comptables
  accountingRules     AccountingRule[]

  // Statut
  isActive            Boolean                   @default(true)

  createdAt           DateTime                  @default(now())
  updatedAt           DateTime                  @updatedAt
}

// Taux avec historique (pour gérer les changements législatifs)
model ContributionRate {
  id              String            @id @default(cuid())
  rule            ContributionRule  @relation(fields: [ruleId], references: [id])
  ruleId          String

  rate            Float             // Taux en pourcentage (ex: 0.0755 pour 7.55%)
  effectiveFrom   DateTime          // Date de début d'application
  effectiveTo     DateTime?         // Date de fin (null = toujours actif)

  createdAt       DateTime          @default(now())
  updatedAt       DateTime          @updatedAt

  @@index([ruleId, effectiveFrom])
}

// Règles comptables associées
model AccountingRule {
  id              String            @id @default(cuid())
  rule            ContributionRule  @relation(fields: [ruleId], references: [id])
  ruleId          String

  // Comptes comptables
  debitAccount    String            // Compte de débit (ex: "6451")
  creditAccount   String            // Compte de crédit (ex: "431")

  description     String?

  createdAt       DateTime          @default(now())
  updatedAt       DateTime          @updatedAt
}

// Enums
enum ContributionType {
  COTISATION_SALARIALE   // Déduite du salaire brut
  COTISATION_PATRONALE   // À la charge de l'employeur
  CHARGE_FISCALE         // Impôts et taxes
}

enum CalculationType {
  PERCENTAGE     // Pourcentage du salaire
  FIXED_AMOUNT   // Montant fixe
  TIERED         // Calcul par tranches
}

enum BaseType {
  GROSS_SALARY   // Salaire brut
  NET_SALARY     // Salaire net
  CAPPED_SALARY  // Salaire plafonné (PASS)
}
```

### Tâches

- [ ] Ajouter les modèles au fichier `backend/prisma/schema.prisma`
- [ ] Créer la migration Prisma : `npx prisma migrate dev --name add_contribution_rules_system`
- [ ] Générer le client Prisma mis à jour
- [ ] Créer des types TypeScript dans `backend/src/types/contributions.ts`
- [ ] Documenter le schéma dans `/docs/CONTRIBUTION_RULES_SCHEMA.md`

### Critères d'acceptation

- [ ] Le schéma Prisma compile sans erreur
- [ ] La migration s'applique correctement sur SQLite et PostgreSQL
- [ ] Les relations entre modèles sont correctement définies
- [ ] Les enums couvrent tous les cas d'usage prévus
- [ ] La documentation est à jour

### Labels

`enhancement`, `database`, `payroll`, `high-priority`

---

## Issue 2 : [FEATURE] Créer un DSL (Domain-Specific Language) pour décrire les règles

### Description

Développer un langage simple et déclaratif permettant de définir les règles de cotisations et fiscales de manière lisible et maintenable.

### Contexte

Pour faciliter la configuration et la maintenance des règles de paie, nous avons besoin d'un format simple qui puisse être :
- Lisible par un non-développeur (RH, comptable)
- Versionnable (Git)
- Facilement modifiable
- Validable automatiquement

### Proposition de format : YAML

```yaml
# Exemple : Assurance maladie
rules:
  - code: SS_MALADIE_SAL
    name: "Assurance maladie - Part salariale"
    category: SECURITE_SOCIALE
    organization: URSSAF
    type: COTISATION_SALARIALE

    calculation:
      type: PERCENTAGE
      base: GROSS_SALARY

    rates:
      - rate: 0.0755  # 7.55%
        effective_from: "2024-01-01"
        effective_to: null

    accounting:
      debit: "6451"   # Charges de sécurité sociale
      credit: "431"   # Sécurité sociale

    active: true

  - code: SS_MALADIE_PAT
    name: "Assurance maladie - Part patronale"
    category: SECURITE_SOCIALE
    organization: URSSAF
    type: COTISATION_PATRONALE

    calculation:
      type: PERCENTAGE
      base: GROSS_SALARY

    rates:
      - rate: 0.1300  # 13.00%
        effective_from: "2024-01-01"
        effective_to: null

    accounting:
      debit: "6451"
      credit: "431"

    active: true

  - code: RETRAITE_BASE_SAL
    name: "Retraite de base - Part salariale"
    category: RETRAITE
    organization: URSSAF
    type: COTISATION_SALARIALE

    calculation:
      type: PERCENTAGE
      base: CAPPED_SALARY  # Plafonné au PASS
      ceiling: 46368  # PASS 2024

    rates:
      - rate: 0.0690  # 6.90%
        effective_from: "2024-01-01"
        effective_to: null

    accounting:
      debit: "6452"
      credit: "431"

    active: true

  - code: CHOMAGE_SAL
    name: "Assurance chômage - Part salariale"
    category: CHOMAGE
    organization: POLE_EMPLOI
    type: COTISATION_SALARIALE

    calculation:
      type: PERCENTAGE
      base: GROSS_SALARY
      ceiling: 185472  # 4 x PASS

    rates:
      - rate: 0.0240  # 2.40%
        effective_from: "2024-01-01"
        effective_to: null

    accounting:
      debit: "6453"
      credit: "437"

    active: true
```

### Proposition de format alternatif : JSON

```json
{
  "rules": [
    {
      "code": "SS_MALADIE_SAL",
      "name": "Assurance maladie - Part salariale",
      "category": "SECURITE_SOCIALE",
      "organization": "URSSAF",
      "type": "COTISATION_SALARIALE",
      "calculation": {
        "type": "PERCENTAGE",
        "base": "GROSS_SALARY"
      },
      "rates": [
        {
          "rate": 0.0755,
          "effective_from": "2024-01-01",
          "effective_to": null
        }
      ],
      "accounting": {
        "debit": "6451",
        "credit": "431"
      },
      "active": true
    }
  ]
}
```

### Tâches

- [ ] Choisir le format (YAML recommandé pour la lisibilité)
- [ ] Créer un parseur dans `backend/src/lib/contributionParser.ts`
- [ ] Implémenter la validation du format (schema JSON ou Zod)
- [ ] Créer des fixtures d'exemple dans `backend/fixtures/contributions/`
- [ ] Documenter le DSL dans `/docs/CONTRIBUTION_DSL.md`
- [ ] Créer des tests unitaires pour le parseur

### Exemples de règles à implémenter

**Cotisations sociales (France 2024)** :
- Maladie, maternité, invalidité, décès
- Vieillesse plafonnée et déplafonnée
- Allocations familiales
- Accident du travail
- Chômage
- Retraite complémentaire (AGIRC-ARRCO)
- CSG/CRDS

### Critères d'acceptation

- [ ] Le parseur charge correctement un fichier YAML/JSON
- [ ] La validation détecte les erreurs de format
- [ ] Les règles sont correctement mappées vers le schéma de base de données
- [ ] Des exemples complets sont fournis
- [ ] La documentation est claire et complète
- [ ] Tests unitaires couvrent les cas nominaux et d'erreur

### Labels

`enhancement`, `payroll`, `high-priority`

---

## Issue 3 : [FEATURE] API de gestion des règles de cotisations

### Description

Créer les endpoints API permettant de gérer (CRUD) les règles de cotisations et fiscales.

### Routes à implémenter

#### Catégories

```
GET    /api/contributions/categories           # Liste des catégories
POST   /api/contributions/categories           # Créer une catégorie
PUT    /api/contributions/categories/:id       # Modifier une catégorie
DELETE /api/contributions/categories/:id       # Supprimer une catégorie
```

#### Organismes

```
GET    /api/contributions/organizations        # Liste des organismes
POST   /api/contributions/organizations        # Créer un organisme
PUT    /api/contributions/organizations/:id    # Modifier un organisme
DELETE /api/contributions/organizations/:id    # Supprimer un organisme
```

#### Règles

```
GET    /api/contributions/rules                # Liste de toutes les règles
GET    /api/contributions/rules/active         # Règles actives uniquement
GET    /api/contributions/rules/:id            # Détail d'une règle
POST   /api/contributions/rules                # Créer une règle
PUT    /api/contributions/rules/:id            # Modifier une règle
DELETE /api/contributions/rules/:id            # Supprimer une règle

# Import/Export
POST   /api/contributions/rules/import         # Importer depuis YAML/JSON
GET    /api/contributions/rules/export         # Exporter en YAML/JSON

# Taux
POST   /api/contributions/rules/:id/rates      # Ajouter un taux historique
PUT    /api/contributions/rates/:rateId        # Modifier un taux
```

#### Simulation

```
POST   /api/contributions/simulate             # Simuler un calcul de paie
```

**Exemple de requête** :
```json
{
  "grossSalary": 3000,
  "date": "2024-11-15"
}
```

**Exemple de réponse** :
```json
{
  "grossSalary": 3000,
  "contributions": [
    {
      "code": "SS_MALADIE_SAL",
      "name": "Assurance maladie - Part salariale",
      "type": "COTISATION_SALARIALE",
      "base": 3000,
      "rate": 0.0755,
      "amount": 226.50
    },
    {
      "code": "RETRAITE_BASE_SAL",
      "name": "Retraite de base - Part salariale",
      "type": "COTISATION_SALARIALE",
      "base": 3000,
      "rate": 0.0690,
      "amount": 207.00
    }
  ],
  "totalDeductions": 750.00,
  "netSalary": 2250.00
}
```

### Tâches

- [ ] Créer le fichier de routes `backend/src/api/contributions.ts`
- [ ] Implémenter les contrôleurs pour chaque endpoint
- [ ] Ajouter les middlewares d'authentification (admin uniquement)
- [ ] Implémenter la logique de simulation de calcul
- [ ] Créer les tests API avec Supertest
- [ ] Documenter l'API dans `/docs/API_CONTRIBUTIONS.md`

### Sécurité

- Seuls les utilisateurs **administrateurs** peuvent modifier les règles
- Les utilisateurs standards peuvent uniquement consulter et simuler
- Valider tous les inputs (taux entre 0 et 1, dates valides, etc.)

### Critères d'acceptation

- [ ] Tous les endpoints sont fonctionnels
- [ ] Les erreurs sont gérées avec des codes HTTP appropriés
- [ ] L'authentification et les permissions sont correctement implémentées
- [ ] Les tests API couvrent tous les endpoints
- [ ] La documentation API est complète

### Labels

`enhancement`, `api`, `payroll`, `high-priority`

---

## Issue 4 : [FEATURE] Moteur de calcul des cotisations

### Description

Implémenter le moteur de calcul qui applique les règles de cotisations pour générer une fiche de paie détaillée.

### Fonctionnalités

Le moteur doit :
1. Récupérer toutes les règles actives pour une date donnée
2. Calculer chaque cotisation selon son type (pourcentage, fixe, tranches)
3. Gérer les plafonds (PASS) et planchers
4. Distinguer cotisations salariales et patronales
5. Générer un détail ligne par ligne
6. Calculer les totaux et le salaire net

### Architecture proposée

```typescript
// backend/src/lib/contributionEngine.ts

interface PayrollCalculationInput {
  grossSalary: number;
  calculationDate: Date;
  employeeId: string;
}

interface ContributionLine {
  code: string;
  name: string;
  type: 'COTISATION_SALARIALE' | 'COTISATION_PATRONALE' | 'CHARGE_FISCALE';
  category: string;
  organization: string;
  base: number;          // Base de calcul
  rate: number;          // Taux appliqué
  amount: number;        // Montant calculé
  accountingDebit: string;
  accountingCredit: string;
}

interface PayrollCalculationResult {
  grossSalary: number;
  employeeContributions: ContributionLine[];
  employerContributions: ContributionLine[];
  fiscalCharges: ContributionLine[];
  totalEmployeeContributions: number;
  totalEmployerContributions: number;
  totalFiscalCharges: number;
  netSalary: number;
  totalCost: number;  // Coût total employeur
}

export class ContributionEngine {
  /**
   * Calcule toutes les cotisations pour un salaire donné
   */
  async calculatePayroll(input: PayrollCalculationInput): Promise<PayrollCalculationResult> {
    // 1. Récupérer les règles actives
    const rules = await this.getActiveRules(input.calculationDate);

    // 2. Calculer chaque cotisation
    const contributions = await Promise.all(
      rules.map(rule => this.calculateContribution(rule, input))
    );

    // 3. Grouper par type
    const employeeContributions = contributions.filter(c => c.type === 'COTISATION_SALARIALE');
    const employerContributions = contributions.filter(c => c.type === 'COTISATION_PATRONALE');
    const fiscalCharges = contributions.filter(c => c.type === 'CHARGE_FISCALE');

    // 4. Calculer les totaux
    const totalEmployeeContributions = this.sum(employeeContributions);
    const totalEmployerContributions = this.sum(employerContributions);
    const totalFiscalCharges = this.sum(fiscalCharges);

    const netSalary = input.grossSalary - totalEmployeeContributions;
    const totalCost = input.grossSalary + totalEmployerContributions;

    return {
      grossSalary: input.grossSalary,
      employeeContributions,
      employerContributions,
      fiscalCharges,
      totalEmployeeContributions,
      totalEmployerContributions,
      totalFiscalCharges,
      netSalary,
      totalCost
    };
  }

  /**
   * Calcule une cotisation individuelle
   */
  private async calculateContribution(
    rule: ContributionRule,
    input: PayrollCalculationInput
  ): Promise<ContributionLine> {
    // Récupérer le taux actif
    const rate = await this.getActiveRate(rule.id, input.calculationDate);

    // Calculer la base
    let base = this.calculateBase(rule.baseType, input.grossSalary);

    // Appliquer plafond/plancher
    if (rule.ceiling) base = Math.min(base, rule.ceiling);
    if (rule.floor) base = Math.max(base, rule.floor);

    // Calculer le montant
    let amount = 0;
    switch (rule.calculationType) {
      case 'PERCENTAGE':
        amount = base * rate.rate;
        break;
      case 'FIXED_AMOUNT':
        amount = rate.rate;
        break;
      case 'TIERED':
        amount = this.calculateTiered(base, rate);
        break;
    }

    return {
      code: rule.code,
      name: rule.name,
      type: rule.type,
      category: rule.category.name,
      organization: rule.organization.name,
      base,
      rate: rate.rate,
      amount: Math.round(amount * 100) / 100,
      accountingDebit: rule.accountingRules[0]?.debitAccount || '',
      accountingCredit: rule.accountingRules[0]?.creditAccount || ''
    };
  }
}
```

### Tâches

- [ ] Créer le fichier `backend/src/lib/contributionEngine.ts`
- [ ] Implémenter la classe `ContributionEngine`
- [ ] Gérer les différents types de calcul (pourcentage, fixe, tranches)
- [ ] Gérer les plafonds et planchers
- [ ] Modifier `backend/src/lib/payroll.ts` pour utiliser le nouveau moteur
- [ ] Mettre à jour le modèle `Payslip` pour stocker le détail des cotisations
- [ ] Créer des tests unitaires complets
- [ ] Documenter le moteur dans `/docs/CONTRIBUTION_ENGINE.md`

### Migration du code existant

Le fichier `backend/src/lib/payroll.ts` utilise actuellement :
```typescript
const DEDUCTION_RATE = 0.25;
```

Il faudra le remplacer par :
```typescript
const engine = new ContributionEngine();
const result = await engine.calculatePayroll({
  grossSalary: employee.grossSalary,
  calculationDate: new Date(),
  employeeId: employee.id
});
```

### Critères d'acceptation

- [ ] Le moteur calcule correctement tous les types de cotisations
- [ ] Les plafonds et planchers sont respectés
- [ ] Les totaux sont exacts
- [ ] Les tests couvrent tous les cas de calcul
- [ ] La performance est acceptable (< 100ms pour un calcul complet)
- [ ] Le code existant continue de fonctionner

### Labels

`enhancement`, `payroll`, `high-priority`, `breaking-change`

---

## Issue 5 : [FEATURE] Interface d'administration des règles de cotisations

### Description

Créer une interface web permettant aux administrateurs de visualiser, créer et modifier les règles de cotisations sans toucher au code.

### Pages à créer

#### 1. Liste des règles (`/admin/contributions/rules`)

- Tableau avec filtres (catégorie, organisme, type, statut)
- Colonnes : Code, Nom, Type, Taux actuel, Organisme, Statut, Actions
- Actions : Voir détail, Modifier, Activer/Désactiver, Supprimer
- Bouton "Importer depuis YAML/JSON"
- Bouton "Exporter toutes les règles"
- Bouton "Créer une nouvelle règle"

#### 2. Détail d'une règle (`/admin/contributions/rules/:id`)

- Informations générales (code, nom, description, catégorie, organisme)
- Type et mode de calcul
- Historique des taux (timeline)
- Règles comptables
- Bouton "Modifier"
- Bouton "Ajouter un nouveau taux"

#### 3. Formulaire de création/modification (`/admin/contributions/rules/new` ou `/edit/:id`)

Champs :
- Code (unique)
- Nom
- Description
- Catégorie (select)
- Organisme (select)
- Type de cotisation (select)
- Type de calcul (select)
- Base de calcul (select)
- Plafond (optionnel)
- Plancher (optionnel)
- Taux initial
- Date d'effet
- Compte de débit
- Compte de crédit

#### 4. Simulateur (`/admin/contributions/simulator`)

- Champ : Salaire brut
- Champ : Date de calcul
- Bouton "Calculer"
- Résultat : Tableau détaillé des cotisations
- Totaux : Cotisations salariales, patronales, net, coût total

### Composants React

```
frontend/src/pages/
├── admin/
│   ├── ContributionRulesPage.tsx         # Liste
│   ├── ContributionRuleDetailPage.tsx    # Détail
│   ├── ContributionRuleFormPage.tsx      # Formulaire
│   └── ContributionSimulatorPage.tsx     # Simulateur
│
frontend/src/components/
├── contributions/
│   ├── RulesList.tsx
│   ├── RuleCard.tsx
│   ├── RuleForm.tsx
│   ├── RateTimeline.tsx
│   └── SimulatorResults.tsx
```

### Tâches

- [ ] Créer les pages d'administration
- [ ] Créer les composants React
- [ ] Intégrer avec l'API backend
- [ ] Ajouter la gestion des permissions (admin uniquement)
- [ ] Implémenter l'import/export de fichiers
- [ ] Créer les styles CSS
- [ ] Ajouter les tests Vitest
- [ ] Mettre à jour le menu de navigation

### Sécurité

- Route `/admin/*` protégée par authentification + vérification du rôle admin
- Validation côté client ET serveur
- Confirmation avant suppression

### Critères d'acceptation

- [ ] Toutes les pages sont fonctionnelles
- [ ] L'interface est intuitive et responsive
- [ ] Les formulaires sont validés correctement
- [ ] L'import/export fonctionne
- [ ] Le simulateur affiche les résultats correctement
- [ ] Les tests couvrent les interactions principales

### Labels

`enhancement`, `frontend`, `payroll`, `admin`, `medium-priority`

---

## Issue 6 : [FEATURE] Données de référence françaises pour 2024-2025

### Description

Créer un jeu de données complet avec les cotisations sociales françaises réelles pour 2024-2025.

### Cotisations à implémenter

#### Sécurité sociale (URSSAF)

**Part salariale** :
- Maladie : 0% (supprimée en 2018)
- Vieillesse plafonnée : 6.90% (dans la limite du PASS)
- Vieillesse déplafonnée : 0.40%

**Part patronale** :
- Maladie : 13.00%
- Vieillesse plafonnée : 8.55%
- Vieillesse déplafonnée : 1.90%
- Allocations familiales : 3.45% (5.25% si salaire > 3.5 SMIC)
- Accident du travail : variable (1% à 3% selon secteur)

#### Chômage (Pôle emploi)

- Part salariale : 2.40% (dans la limite de 4 PASS)
- Part patronale : 4.05%

#### Retraite complémentaire (AGIRC-ARRCO)

- Tranche 1 (jusqu'au PASS) : 3.15% salarié + 4.72% employeur
- Tranche 2 (entre 1 et 8 PASS) : 8.64% salarié + 12.95% employeur

#### CSG/CRDS

- CSG déductible : 6.80%
- CSG non déductible : 2.40%
- CRDS : 0.50%
- Base : 98.25% du salaire brut

#### Autres

- Contribution formation professionnelle : 0.55% à 1% (employeur)
- Taxe d'apprentissage : 0.68% (employeur)

### Constantes

- **PASS 2024** : 46 368 €/an (3 864 €/mois)
- **SMIC 2024** : 1 766.92 € brut/mois

### Tâches

- [ ] Créer le fichier `backend/fixtures/contributions/france-2024.yaml`
- [ ] Définir toutes les catégories d'organismes
- [ ] Créer toutes les règles de cotisations
- [ ] Ajouter les taux historiques (2024-2025)
- [ ] Associer les comptes comptables PCG
- [ ] Créer un script de seed : `backend/scripts/seed-contributions.ts`
- [ ] Documenter les sources législatives
- [ ] Créer des tests d'intégration vérifiant les montants

### Sources

- Urssaf.fr
- AGIRC-ARRCO.fr
- Légifrance
- Bulletins officiels de la Sécurité sociale

### Critères d'acceptation

- [ ] Toutes les cotisations principales sont présentes
- [ ] Les taux sont à jour et vérifiés
- [ ] Le script de seed fonctionne correctement
- [ ] Les calculs de test correspondent aux barèmes officiels
- [ ] La documentation cite les sources

### Labels

`data`, `payroll`, `france`, `medium-priority`

---

## Issue 7 : [FEATURE] Migration du module de paie vers le nouveau système

### Description

Migrer le module de paie existant (`backend/src/lib/payroll.ts`) pour utiliser le nouveau système de règles de cotisations au lieu du taux fixe de 25%.

### Modifications à apporter

#### 1. Schéma Prisma - Modèle `Payslip`

Actuellement :
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

Nouveau schéma proposé :
```prisma
model Payslip {
  id                      String              @id @default(cuid())
  payPeriod               String
  grossSalary             Float

  // Détails calculés
  totalEmployeeContributions  Float
  totalEmployerContributions  Float
  totalFiscalCharges          Float
  netSalary                   Float
  totalCost                   Float  // Coût total employeur

  // Relations
  employee                Employee            @relation(fields: [employeeId], references: [id])
  employeeId              String
  contributionLines       PayslipContributionLine[]

  createdAt               DateTime            @default(now())
  updatedAt               DateTime            @updatedAt

  @@unique([employeeId, payPeriod])
}

// Détail ligne par ligne des cotisations
model PayslipContributionLine {
  id              String   @id @default(cuid())
  payslip         Payslip  @relation(fields: [payslipId], references: [id], onDelete: Cascade)
  payslipId       String

  // Référence à la règle appliquée
  ruleCode        String
  ruleName        String
  ruleType        String   // COTISATION_SALARIALE | COTISATION_PATRONALE | CHARGE_FISCALE
  category        String
  organization    String

  // Calcul
  base            Float
  rate            Float
  amount          Float

  // Comptabilité
  debitAccount    String
  creditAccount   String

  createdAt       DateTime @default(now())
}
```

#### 2. Fichier `backend/src/lib/payroll.ts`

Remplacer :
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

Par :
```typescript
import { ContributionEngine } from './contributionEngine';

const engine = new ContributionEngine();

export async function calculatePayslipDetails(
  grossSalary: number,
  employeeId: string,
  calculationDate: Date
) {
  return await engine.calculatePayroll({
    grossSalary,
    employeeId,
    calculationDate
  });
}
```

#### 3. Fonction `createPayslip`

Modifier pour enregistrer le détail des cotisations :
```typescript
export async function createPayslip(
  employeeId: string,
  payPeriod: string,
  grossSalary: number
): Promise<Payslip> {
  const calculationDate = new Date(payPeriod + '-15'); // 15 du mois

  // Calculer avec le nouveau moteur
  const details = await calculatePayslipDetails(grossSalary, employeeId, calculationDate);

  // Enregistrer en base
  const payslip = await prisma.payslip.create({
    data: {
      payPeriod,
      grossSalary,
      totalEmployeeContributions: details.totalEmployeeContributions,
      totalEmployerContributions: details.totalEmployerContributions,
      totalFiscalCharges: details.totalFiscalCharges,
      netSalary: details.netSalary,
      totalCost: details.totalCost,
      employeeId,
      contributionLines: {
        create: [
          ...details.employeeContributions,
          ...details.employerContributions,
          ...details.fiscalCharges
        ].map(line => ({
          ruleCode: line.code,
          ruleName: line.name,
          ruleType: line.type,
          category: line.category,
          organization: line.organization,
          base: line.base,
          rate: line.rate,
          amount: line.amount,
          debitAccount: line.accountingDebit,
          creditAccount: line.accountingCredit
        }))
      }
    },
    include: {
      contributionLines: true
    }
  });

  return payslip;
}
```

### Tâches

- [ ] Créer la migration Prisma pour le nouveau schéma `Payslip`
- [ ] Modifier `backend/src/lib/payroll.ts`
- [ ] Mettre à jour tous les tests du module de paie
- [ ] Modifier l'API `/api/payroll/*` si nécessaire
- [ ] Mettre à jour le générateur PDF pour afficher le détail
- [ ] Créer un script de migration des données existantes
- [ ] Tester en conditions réelles
- [ ] Mettre à jour la documentation

### Rétrocompatibilité

Option 1 : **Migration automatique**
- Convertir les anciennes fiches de paie au nouveau format
- Créer des lignes de cotisation fictives "Legacy - 25%"

Option 2 : **Coexistence**
- Garder l'ancien format pour les anciennes fiches
- Utiliser le nouveau format pour les nouvelles fiches
- Afficher différemment selon le format

### Critères d'acceptation

- [ ] Le nouveau système génère des fiches de paie détaillées
- [ ] Les tests passent tous
- [ ] Les anciennes fiches de paie restent consultables
- [ ] Le PDF affiche le détail des cotisations
- [ ] La performance reste acceptable
- [ ] La documentation est à jour

### Labels

`enhancement`, `payroll`, `breaking-change`, `high-priority`

---

## Roadmap proposée

### Phase 1 : Fondations (Sprint 1-2)
1. Issue #1 : Schéma de données ✅
2. Issue #2 : DSL pour décrire les règles ✅

### Phase 2 : Backend (Sprint 3-4)
3. Issue #3 : API de gestion ✅
4. Issue #4 : Moteur de calcul ✅
5. Issue #6 : Données françaises 2024-2025 ✅

### Phase 3 : Intégration (Sprint 5)
6. Issue #7 : Migration du module de paie ✅

### Phase 4 : Interface (Sprint 6-7)
7. Issue #5 : Interface d'administration ✅

---

## Notes importantes

### Avantages du système

✅ **Flexibilité** : Ajouter ou modifier une règle sans toucher au code
✅ **Traçabilité** : Historique complet des taux et changements
✅ **Conformité** : Respect des obligations légales françaises
✅ **Comptabilité** : Export automatique des écritures comptables
✅ **Évolutivité** : Facile d'ajouter de nouveaux types de calculs
✅ **Testabilité** : Simulateur pour vérifier les calculs

### Défis techniques

⚠️ **Performance** : Optimiser les requêtes (indexes, cache)
⚠️ **Complexité** : Bien documenter le système
⚠️ **Migration** : Gérer la transition sans perte de données
⚠️ **Validation** : S'assurer de la cohérence des données

### Ressources utiles

- [Urssaf.fr - Taux de cotisations](https://www.urssaf.fr/portail/home/taux-et-baremes.html)
- [AGIRC-ARRCO - Taux et plafonds](https://www.agirc-arrco.fr/)
- [Service-public.fr - Cotisations sociales](https://www.service-public.fr/)
- [Plan comptable général](https://www.plancomptable.com/)

---

**Auteur** : Généré par Claude Code
**Date** : 2025-11-16
**Version** : 1.0
