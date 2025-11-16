# Propositions d'Issues : Système de Règles de Cotisations (Version Française)

Ce document montre les mêmes propositions d'issues mais avec tous les noms de classes, champs et variables en **français**.

---

## Issue 1 : [FEATURE] Définir le schéma de données pour les règles de cotisations et fiscales (Version FR)

### Proposition de schéma en français

```prisma
// Catégorie de règle (Sécurité sociale, retraite, chômage, etc.)
model CategorieCotisation {
  id          String   @id @default(cuid())
  code        String   @unique // Ex: "SS", "RETRAITE", "CHOMAGE"
  nom         String   // Ex: "Sécurité sociale"
  description String?
  regles      RegleCotisation[]
  dateCreation DateTime @default(now())
  dateModification DateTime @updatedAt
}

// Organisme collecteur
model OrganismeCotisation {
  id          String   @id @default(cuid())
  code        String   @unique // Ex: "URSSAF", "AGIRC_ARRCO"
  nom         String   // Ex: "URSSAF"
  description String?
  regles      RegleCotisation[]
  dateCreation DateTime @default(now())
  dateModification DateTime @updatedAt
}

// Règle de cotisation ou charge
model RegleCotisation {
  id                  String                @id @default(cuid())
  code                String                @unique // Ex: "SS_MALADIE_SAL"
  nom                 String                // Ex: "Assurance maladie - Part salariale"
  description         String?

  // Classification
  categorie           CategorieCotisation   @relation(fields: [categorieId], references: [id])
  categorieId         String
  organisme           OrganismeCotisation   @relation(fields: [organismeId], references: [id])
  organismeId         String

  // Type de règle
  typeCotisation      TypeCotisation        // COTISATION_SALARIALE | COTISATION_PATRONALE | CHARGE_FISCALE

  // Calcul
  typeCalcul          TypeCalcul            // POURCENTAGE | MONTANT_FIXE | TRANCHES
  typeAssiette        TypeAssiette          // SALAIRE_BRUT | SALAIRE_NET | SALAIRE_PLAFONNE

  // Plafond et plancher (optionnels)
  plancher            Float?                // Plancher (montant minimum)
  plafond             Float?                // Plafond (montant maximum)

  // Taux actifs
  taux                TauxCotisation[]

  // Règles comptables
  reglesComptables    RegleComptable[]

  // Statut
  estActif            Boolean               @default(true)

  dateCreation        DateTime              @default(now())
  dateModification    DateTime              @updatedAt
}

// Taux avec historique (pour gérer les changements législatifs)
model TauxCotisation {
  id                  String            @id @default(cuid())
  regle               RegleCotisation   @relation(fields: [regleId], references: [id])
  regleId             String

  taux                Float             // Taux en pourcentage (ex: 0.0755 pour 7.55%)
  dateDebut           DateTime          // Date de début d'application
  dateFin             DateTime?         // Date de fin (null = toujours actif)

  dateCreation        DateTime          @default(now())
  dateModification    DateTime          @updatedAt

  @@index([regleId, dateDebut])
}

// Règles comptables associées
model RegleComptable {
  id                  String            @id @default(cuid())
  regle               RegleCotisation   @relation(fields: [regleId], references: [id])
  regleId             String

  // Comptes comptables
  compteDebit         String            // Compte de débit (ex: "6451")
  compteCredit        String            // Compte de crédit (ex: "431")

  description         String?

  dateCreation        DateTime          @default(now())
  dateModification    DateTime          @updatedAt
}

// Enums
enum TypeCotisation {
  COTISATION_SALARIALE   // Déduite du salaire brut
  COTISATION_PATRONALE   // À la charge de l'employeur
  CHARGE_FISCALE         // Impôts et taxes
}

enum TypeCalcul {
  POURCENTAGE       // Pourcentage du salaire
  MONTANT_FIXE      // Montant fixe
  TRANCHES          // Calcul par tranches
}

enum TypeAssiette {
  SALAIRE_BRUT      // Salaire brut
  SALAIRE_NET       // Salaire net
  SALAIRE_PLAFONNE  // Salaire plafonné (PASS)
}
```

### Comparaison lisibilité

**Version anglaise** :
```prisma
model ContributionRule {
  calculationType     CalculationType
  baseType            BaseType
  floor               Float?
  ceiling             Float?
}
```

**Version française** :
```prisma
model RegleCotisation {
  typeCalcul          TypeCalcul
  typeAssiette        TypeAssiette
  plancher            Float?
  plafond             Float?
}
```

---

## Issue 2 : [FEATURE] DSL pour décrire les règles (Version FR)

### Format YAML en français

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

### Comparaison lisibilité YAML

**Version anglaise** :
```yaml
calculation:
  type: PERCENTAGE
  base: CAPPED_SALARY
  ceiling: 46368
```

**Version française** :
```yaml
calcul:
  type: POURCENTAGE
  assiette: SALAIRE_PLAFONNE
  plafond: 46368
```

---

## Issue 3 : [FEATURE] API de gestion des règles (Version FR)

### Routes en français

```
GET    /api/cotisations/categories           # Liste des catégories
POST   /api/cotisations/categories           # Créer une catégorie
PUT    /api/cotisations/categories/:id       # Modifier une catégorie
DELETE /api/cotisations/categories/:id       # Supprimer une catégorie

GET    /api/cotisations/organismes           # Liste des organismes
POST   /api/cotisations/organismes           # Créer un organisme
PUT    /api/cotisations/organismes/:id       # Modifier un organisme
DELETE /api/cotisations/organismes/:id       # Supprimer un organisme

GET    /api/cotisations/regles               # Liste de toutes les règles
GET    /api/cotisations/regles/actives       # Règles actives uniquement
GET    /api/cotisations/regles/:id           # Détail d'une règle
POST   /api/cotisations/regles               # Créer une règle
PUT    /api/cotisations/regles/:id           # Modifier une règle
DELETE /api/cotisations/regles/:id           # Supprimer une règle

POST   /api/cotisations/regles/importer      # Importer depuis YAML/JSON
GET    /api/cotisations/regles/exporter      # Exporter en YAML/JSON

POST   /api/cotisations/regles/:id/taux      # Ajouter un taux historique
PUT    /api/cotisations/taux/:tauxId         # Modifier un taux

POST   /api/cotisations/simuler              # Simuler un calcul de paie
```

### Exemples de requêtes/réponses en français

**Simulation** :
```json
// POST /api/cotisations/simuler
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

---

## Issue 4 : [FEATURE] Moteur de calcul (Version FR)

### Architecture en français

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
   * Obtient le taux actif à une date donnée
   */
  private async obtenirTauxActif(
    regleId: string,
    date: Date
  ): Promise<TauxCotisation> {
    const taux = await prisma.tauxCotisation.findFirst({
      where: {
        regleId,
        dateDebut: { lte: date },
        OR: [
          { dateFin: null },
          { dateFin: { gte: date } }
        ]
      },
      orderBy: { dateDebut: 'desc' }
    });

    if (!taux) {
      throw new Error(`Aucun taux trouvé pour la règle ${regleId} à la date ${date}`);
    }

    return taux;
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
   * Calcule le montant par tranches
   */
  private calculerParTranches(assiette: number, taux: TauxCotisation): number {
    // À implémenter selon les besoins spécifiques
    return assiette * taux.taux;
  }

  /**
   * Somme les montants d'un tableau de cotisations
   */
  private somme(cotisations: LigneCotisation[]): number {
    return cotisations.reduce((total, c) => total + c.montant, 0);
  }
}
```

### Comparaison lisibilité du code

**Version anglaise** :
```typescript
interface ContributionLine {
  code: string;
  name: string;
  type: 'EMPLOYEE_CONTRIBUTION' | 'EMPLOYER_CONTRIBUTION';
  base: number;
  rate: number;
  amount: number;
}

async calculatePayroll(input: PayrollInput): Promise<PayrollResult> {
  const rules = await this.getActiveRules(input.date);
  const employeeContributions = contributions.filter(c => c.type === 'EMPLOYEE');
}
```

**Version française** :
```typescript
interface LigneCotisation {
  code: string;
  nom: string;
  type: 'COTISATION_SALARIALE' | 'COTISATION_PATRONALE';
  assiette: number;
  taux: number;
  montant: number;
}

async calculerPaie(donnees: DonneesPaie): Promise<ResultatPaie> {
  const regles = await this.obtenirReglesActives(donnees.date);
  const cotisationsSalariales = cotisations.filter(c => c.type === 'COTISATION_SALARIALE');
}
```

---

## Issue 5 : [FEATURE] Interface d'administration (Version FR)

### Routes frontend en français

```
/admin/cotisations/regles              # Liste des règles
/admin/cotisations/regles/nouveau      # Créer une règle
/admin/cotisations/regles/:id          # Détail d'une règle
/admin/cotisations/regles/:id/modifier # Modifier une règle
/admin/cotisations/simulateur          # Simulateur de paie
```

### Composants React en français

```
frontend/src/pages/
├── admin/
│   ├── PageReglesCotisations.tsx       # Liste
│   ├── PageDetailRegleCotisation.tsx   # Détail
│   ├── PageFormulaireRegle.tsx         # Formulaire
│   └── PageSimulateurCotisations.tsx   # Simulateur

frontend/src/components/
├── cotisations/
│   ├── ListeRegles.tsx
│   ├── CarteRegle.tsx
│   ├── FormulaireRegle.tsx
│   ├── ChronologieTaux.tsx
│   └── ResultatsSimulateur.tsx
```

### Exemple de formulaire

```typescript
// PageFormulaireRegle.tsx

interface DonneesFormulaireRegle {
  code: string;
  nom: string;
  description: string;
  categorieId: string;
  organismeId: string;
  typeCotisation: 'COTISATION_SALARIALE' | 'COTISATION_PATRONALE' | 'CHARGE_FISCALE';
  typeCalcul: 'POURCENTAGE' | 'MONTANT_FIXE' | 'TRANCHES';
  typeAssiette: 'SALAIRE_BRUT' | 'SALAIRE_NET' | 'SALAIRE_PLAFONNE';
  plafond?: number;
  plancher?: number;
  tauxInitial: number;
  dateDebut: string;
  compteDebit: string;
  compteCredit: string;
}

function PageFormulaireRegle() {
  const [donnees, setDonnees] = useState<DonneesFormulaireRegle>({
    code: '',
    nom: '',
    description: '',
    categorieId: '',
    organismeId: '',
    typeCotisation: 'COTISATION_SALARIALE',
    typeCalcul: 'POURCENTAGE',
    typeAssiette: 'SALAIRE_BRUT',
    tauxInitial: 0,
    dateDebut: new Date().toISOString().split('T')[0],
    compteDebit: '',
    compteCredit: ''
  });

  const soumettre = async (e: React.FormEvent) => {
    e.preventDefault();
    await api.creerRegleCotisation(donnees);
  };

  return (
    <form onSubmit={soumettre}>
      <h1>Nouvelle règle de cotisation</h1>

      <div>
        <label>Code</label>
        <input
          type="text"
          value={donnees.code}
          onChange={e => setDonnees({ ...donnees, code: e.target.value })}
          placeholder="Ex: SS_MALADIE_SAL"
        />
      </div>

      <div>
        <label>Nom</label>
        <input
          type="text"
          value={donnees.nom}
          onChange={e => setDonnees({ ...donnees, nom: e.target.value })}
          placeholder="Ex: Assurance maladie - Part salariale"
        />
      </div>

      <div>
        <label>Type de cotisation</label>
        <select
          value={donnees.typeCotisation}
          onChange={e => setDonnees({ ...donnees, typeCotisation: e.target.value as any })}
        >
          <option value="COTISATION_SALARIALE">Cotisation salariale</option>
          <option value="COTISATION_PATRONALE">Cotisation patronale</option>
          <option value="CHARGE_FISCALE">Charge fiscale</option>
        </select>
      </div>

      <div>
        <label>Type de calcul</label>
        <select
          value={donnees.typeCalcul}
          onChange={e => setDonnees({ ...donnees, typeCalcul: e.target.value as any })}
        >
          <option value="POURCENTAGE">Pourcentage</option>
          <option value="MONTANT_FIXE">Montant fixe</option>
          <option value="TRANCHES">Par tranches</option>
        </select>
      </div>

      <div>
        <label>Assiette de calcul</label>
        <select
          value={donnees.typeAssiette}
          onChange={e => setDonnees({ ...donnees, typeAssiette: e.target.value as any })}
        >
          <option value="SALAIRE_BRUT">Salaire brut</option>
          <option value="SALAIRE_NET">Salaire net</option>
          <option value="SALAIRE_PLAFONNE">Salaire plafonné (PASS)</option>
        </select>
      </div>

      <div>
        <label>Taux initial (%)</label>
        <input
          type="number"
          step="0.01"
          value={donnees.tauxInitial}
          onChange={e => setDonnees({ ...donnees, tauxInitial: parseFloat(e.target.value) })}
        />
      </div>

      <div>
        <label>Plafond (optionnel)</label>
        <input
          type="number"
          value={donnees.plafond || ''}
          onChange={e => setDonnees({ ...donnees, plafond: e.target.value ? parseFloat(e.target.value) : undefined })}
          placeholder="Ex: 46368 (PASS 2024)"
        />
      </div>

      <div>
        <label>Compte de débit</label>
        <input
          type="text"
          value={donnees.compteDebit}
          onChange={e => setDonnees({ ...donnees, compteDebit: e.target.value })}
          placeholder="Ex: 6451"
        />
      </div>

      <div>
        <label>Compte de crédit</label>
        <input
          type="text"
          value={donnees.compteCredit}
          onChange={e => setDonnees({ ...donnees, compteCredit: e.target.value })}
          placeholder="Ex: 431"
        />
      </div>

      <button type="submit">Créer la règle</button>
    </form>
  );
}
```

---

## Issue 7 : [FEATURE] Migration du module de paie (Version FR)

### Nouveau schéma Prisma en français

```prisma
model FichePaie {
  id                          String              @id @default(cuid())
  periode                     String              // Format: "2024-11"
  salaireBrut                 Float

  // Détails calculés
  totalCotisationsSalariales  Float
  totalCotisationsPatronales  Float
  totalChargesFiscales        Float
  salaireNet                  Float
  coutTotal                   Float  // Coût total employeur

  // Relations
  employe                     Employee            @relation(fields: [employeId], references: [id])
  employeId                   String
  lignesCotisations           LigneCotisationFichePaie[]

  dateCreation                DateTime            @default(now())
  dateModification            DateTime            @updatedAt

  @@unique([employeId, periode])
}

// Détail ligne par ligne des cotisations
model LigneCotisationFichePaie {
  id                String      @id @default(cuid())
  fichePaie         FichePaie   @relation(fields: [fichePaieId], references: [id], onDelete: Cascade)
  fichePaieId       String

  // Référence à la règle appliquée
  codeRegle         String
  nomRegle          String
  typeRegle         String      // COTISATION_SALARIALE | COTISATION_PATRONALE | CHARGE_FISCALE
  categorie         String
  organisme         String

  // Calcul
  assiette          Float
  taux              Float
  montant           Float

  // Comptabilité
  compteDebit       String
  compteCredit      String

  dateCreation      DateTime    @default(now())
}
```

### Code de migration en français

```typescript
// backend/src/lib/paie.ts

import { MoteurCotisations } from './moteurCotisations';

const moteur = new MoteurCotisations();

export async function calculerDetailsFichePaie(
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

export async function creerFichePaie(
  employeId: string,
  periode: string,
  salaireBrut: number
): Promise<FichePaie> {
  const dateCalcul = new Date(periode + '-15'); // 15 du mois

  // Calculer avec le nouveau moteur
  const details = await calculerDetailsFichePaie(salaireBrut, employeId, dateCalcul);

  // Enregistrer en base
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

export async function lancerCalculPaie(
  entrepriseId: string,
  periode: string
): Promise<ResultatCalculPaie> {
  // Validation de la période
  if (!validerPeriode(periode)) {
    return {
      statut: 'erreur',
      fichesGenerees: 0,
      erreurs: [`Format de période invalide: ${periode}. Attendu: YYYY-MM`]
    };
  }

  const employes = await obtenirEmployesEntreprise(entrepriseId);

  if (employes.length === 0) {
    return {
      statut: 'succes',
      fichesGenerees: 0,
      erreurs: ['Aucun employé trouvé pour cette entreprise']
    };
  }

  const erreurs: string[] = [];
  let generees = 0;

  for (const employe of employes) {
    try {
      await creerFichePaie(employe.id, periode, employe.salaireBrut);
      generees++;
    } catch (erreur) {
      erreurs.push(
        `${employe.prenom} ${employe.nom}: ${erreur instanceof Error ? erreur.message : 'Erreur inconnue'}`
      );
    }
  }

  return {
    statut: erreurs.length === 0 ? 'succes' : 'erreur',
    fichesGenerees: generees,
    erreurs: erreurs.length > 0 ? erreurs : undefined
  };
}
```

---

## Tableau comparatif de lisibilité

| Concept | Version anglaise | Version française | Lisibilité |
|---------|------------------|-------------------|------------|
| **Modèles Prisma** |
| Règle | `ContributionRule` | `RegleCotisation` | ✅ Plus naturel |
| Taux | `ContributionRate` | `TauxCotisation` | ✅ Plus clair |
| Organisme | `ContributionOrganization` | `OrganismeCotisation` | ✅ Plus précis |
| Fiche de paie | `Payslip` | `FichePaie` | ✅ Plus évident |
| **Champs** |
| Type de calcul | `calculationType` | `typeCalcul` | ✅ Plus naturel |
| Assiette | `baseType` | `typeAssiette` | ✅ Terme métier exact |
| Plafond | `ceiling` | `plafond` | ✅ Terme comptable français |
| Plancher | `floor` | `plancher` | ✅ Terme comptable français |
| **Enums** |
| Cotisation salariale | `EMPLOYEE_CONTRIBUTION` | `COTISATION_SALARIALE` | ✅ Juridiquement exact |
| Pourcentage | `PERCENTAGE` | `POURCENTAGE` | ≈ Équivalent |
| Salaire brut | `GROSS_SALARY` | `SALAIRE_BRUT` | ✅ Terme RH standard |
| **Fonctions** |
| Calculer paie | `calculatePayroll()` | `calculerPaie()` | ✅ Plus naturel |
| Obtenir règles actives | `getActiveRules()` | `obtenirReglesActives()` | ✅ Plus lisible |
| Calculer cotisation | `calculateContribution()` | `calculerCotisation()` | ✅ Plus direct |
| **Variables** |
| Cotisations salariales | `employeeContributions` | `cotisationsSalariales` | ✅ Terme exact |
| Salaire net | `netSalary` | `salaireNet` | ≈ Équivalent |
| Coût total | `totalCost` | `coutTotal` | ≈ Équivalent |

---

## Avantages de la version française

### ✅ Avantages

1. **Précision terminologique**
   - "Assiette" est le terme comptable exact (pas "base")
   - "Cotisation salariale/patronale" sont les termes juridiques officiels
   - "Plafond/Plancher" sont les termes du droit social français

2. **Compréhension métier**
   - Un RH ou comptable comprend immédiatement `typeAssiette` et `plafond`
   - Les termes sont alignés avec la documentation URSSAF
   - Cohérence avec les bulletins de paie français

3. **Maintenance**
   - Documentation et code dans la même langue
   - Moins de confusion lors de l'ajout de nouvelles règles
   - Formation des nouveaux développeurs facilitée

4. **Conformité**
   - Nomenclature identique aux textes législatifs
   - Facilite les audits et certifications
   - Exports comptables plus clairs

### ⚠️ Inconvénients potentiels

1. **Conventions de code**
   - Mélange français/anglais (ex: `useState`, `prisma.regleCotisation`)
   - Peut perturber certains développeurs habitués à l'anglais

2. **Longueur**
   - `totalCotisationsSalariales` vs `totalEmployeeContributions`
   - Certains noms sont plus longs

3. **Communauté**
   - Moins de ressources en ligne avec cette nomenclature
   - Stack Overflow utilise principalement l'anglais

---

## Recommandation

**Pour OpenPayFit, je recommande la version française** pour ces raisons :

1. ✅ C'est un logiciel RH/Paie spécifiquement français
2. ✅ Les utilisateurs finaux (RH, comptables) parlent français
3. ✅ Les termes métier doivent être exacts ("assiette", "cotisation salariale")
4. ✅ Cohérence avec le reste de la documentation déjà en français
5. ✅ Facilite la collaboration avec des non-développeurs

**Exemple de cohérence** :
- Documentation URSSAF : "assiette de cotisation", "plafond annuel de la sécurité sociale"
- Code : `typeAssiette`, `plafond`
- → Parfaite alignement

---

Voulez-vous que je procède avec la version française pour les issues ?
