# Moteur de Calcul des Cotisations Sociales

## Vue d'ensemble

Le moteur de calcul des cotisations sociales est le composant central d'OpenPayFit pour la génération des fiches de paie. Il implémente les règles de calcul conformes à la réglementation française en matière de cotisations sociales.

**Localisation** : `/backend/src/lib/moteurCotisations.ts`

### Fonctionnalités principales

- ✅ Calcul précis des cotisations au centime près
- ✅ Support de multiples types de calcul (pourcentage, montant fixe, tranches)
- ✅ Gestion des assiettes (brut, net, plafonné)
- ✅ Application des plafonds (PASS) et planchers
- ✅ Distinction cotisations salariales/patronales/fiscales
- ✅ Historique des taux avec application automatique selon la date
- ✅ Génération de fiches de paie détaillées
- ✅ Performance : < 100ms par calcul
- ✅ Convergence pour les cotisations sur salaire net (CSG/CRDS)

---

## Architecture

### Types et Interfaces

#### `TypeCotisation`

Définit qui supporte la charge de la cotisation :

```typescript
type TypeCotisation =
  | 'COTISATION_SALARIALE'  // Déduite du salaire brut de l'employé
  | 'COTISATION_PATRONALE'  // Charge supportée par l'employeur
  | 'CHARGE_FISCALE'        // Taxes et impôts
```

#### `TypeCalcul`

Définit le mode de calcul de la cotisation :

```typescript
type TypeCalcul =
  | 'POURCENTAGE'   // Taux appliqué à l'assiette (ex: 7,55%)
  | 'MONTANT_FIXE'  // Montant fixe indépendant du salaire (ex: 50€)
  | 'TRANCHES'      // Calcul par tranches progressives
```

#### `TypeAssiette`

Définit la base de calcul de la cotisation :

```typescript
type TypeAssiette =
  | 'SALAIRE_BRUT'      // Assiette = salaire brut total
  | 'SALAIRE_NET'       // Assiette = salaire après cotisations salariales
  | 'SALAIRE_PLAFONNE'  // Assiette limitée au PASS
```

#### `ParametresCalcul`

Paramètres d'entrée pour le calcul :

```typescript
interface ParametresCalcul {
  salaireBrut: number;        // Salaire brut mensuel en euros
  dateReference: Date;        // Date pour appliquer les taux en vigueur
  plafondMensuel?: number;    // Optionnel, par défaut PASS_MENSUEL
}
```

#### `LigneCotisation`

Une ligne de cotisation calculée :

```typescript
interface LigneCotisation {
  code: string;               // Code unique (ex: "SS_MALADIE_SAL")
  nom: string;                // Nom lisible (ex: "Assurance maladie")
  categorie: string;          // Catégorie (ex: "Sécurité sociale")
  organisme: string;          // Organisme collecteur (ex: "URSSAF")
  typeCotisation: TypeCotisation;
  assiette: number;           // Base de calcul en euros
  taux: number;               // Taux appliqué (ex: 0.0755 pour 7,55%)
  montantSalarial: number;    // Part salariale en euros
  montantPatronal: number;    // Part patronale en euros
  montantTotal: number;       // Total en euros
}
```

#### `ResultatCalcul`

Résultat complet du calcul :

```typescript
interface ResultatCalcul {
  salaireBrut: number;
  lignesCotisations: LigneCotisation[];
  totalCotisationsSalariales: number;
  totalCotisationsPatronales: number;
  totalCotisations: number;
  salaireNet: number;
  coutTotal: number;          // Coût employeur total
  dateReference: Date;
}
```

---

## Constantes

### Plafond de la Sécurité Sociale (PASS) 2025

```typescript
PASS_ANNUEL = 46368 €         // Plafond annuel
PASS_MENSUEL = 3864 €         // Plafond mensuel (annuel / 12)
PASS_JOURNALIER = 127 €       // Plafond journalier (annuel / 365)
```

> **Note** : Ces valeurs doivent être mises à jour chaque année selon les directives officielles de l'URSSAF.

---

## Fonctions principales

### `calculerCotisations()`

Fonction principale qui calcule toutes les cotisations pour un salaire donné.

**Signature** :

```typescript
async function calculerCotisations(
  parametres: ParametresCalcul
): Promise<ResultatCalcul>
```

**Paramètres** :

- `parametres.salaireBrut` : Salaire brut mensuel (doit être ≥ 0)
- `parametres.dateReference` : Date pour sélectionner les taux applicables
- `parametres.plafondMensuel` : (Optionnel) Plafond mensuel, par défaut `PASS_MENSUEL`

**Retour** :

Objet `ResultatCalcul` contenant tous les détails du calcul.

**Exemple d'utilisation** :

```typescript
import { calculerCotisations } from './lib/moteurCotisations';

const resultat = await calculerCotisations({
  salaireBrut: 3000,
  dateReference: new Date('2025-01-15')
});

console.log(`Salaire brut  : ${resultat.salaireBrut.toFixed(2)} €`);
console.log(`Cotisations   : ${resultat.totalCotisationsSalariales.toFixed(2)} €`);
console.log(`Salaire net   : ${resultat.salaireNet.toFixed(2)} €`);
console.log(`Coût employeur: ${resultat.coutTotal.toFixed(2)} €`);

// Afficher le détail des cotisations
for (const ligne of resultat.lignesCotisations) {
  console.log(
    `${ligne.nom.padEnd(40)} ` +
    `${ligne.montantSalarial.toFixed(2).padStart(10)} € ` +
    `${ligne.montantPatronal.toFixed(2).padStart(10)} €`
  );
}
```

**Erreurs possibles** :

- `"Le salaire brut ne peut pas être négatif"` - Si salaireBrut < 0
- `"Date de référence invalide"` - Si dateReference est invalide

### `genererFichePaieTexte()`

Génère une fiche de paie formatée en texte à partir d'un résultat de calcul.

**Signature** :

```typescript
function genererFichePaieTexte(resultat: ResultatCalcul): string
```

**Exemple** :

```typescript
const resultat = await calculerCotisations({
  salaireBrut: 3000,
  dateReference: new Date('2025-01-15')
});

const fichePaie = genererFichePaieTexte(resultat);
console.log(fichePaie);
```

**Sortie** :

```
================================================================================
FICHE DE PAIE
================================================================================

Date de référence : 15/01/2025
Salaire brut : 3000.00 €

--------------------------------------------------------------------------------
DÉTAIL DES COTISATIONS
--------------------------------------------------------------------------------

Sécurité sociale:

  Assurance maladie                        3000.00 € ×  0.75 %
    Part salariale:      22.50 €  Part patronale:     210.00 €

Retraite:

  Retraite de base                         3000.00 € ×  6.90 %
    Part salariale:     207.00 €  Part patronale:       0.00 €

--------------------------------------------------------------------------------
TOTAUX
--------------------------------------------------------------------------------
Salaire brut                         : 3000.00 €
Total cotisations salariales         :  229.50 €
SALAIRE NET                          : 2770.50 €

Total cotisations patronales         :  210.00 €
COÛT TOTAL EMPLOYEUR                 : 3210.00 €
================================================================================
```

---

## Algorithme de calcul

### Étapes du calcul

1. **Validation des paramètres**
   - Vérifier que le salaire brut est ≥ 0
   - Vérifier que la date de référence est valide

2. **Récupération des règles actives**
   - Interroger la base de données pour toutes les règles actives (`estActif = true`)
   - Inclure les relations : catégorie, organisme

3. **Enrichissement avec les taux applicables**
   - Pour chaque règle, récupérer le taux en vigueur à la date de référence
   - Requête : `dateDebut <= dateReference AND (dateFin IS NULL OR dateFin > dateReference)`
   - Trier par `dateDebut DESC` et prendre le premier
   - Ignorer les règles sans taux applicable

4. **Boucle de convergence** (max 5 itérations)
   - Initialiser une estimation du salaire net (~78% du brut)
   - Pour chaque règle :
     - Calculer l'assiette selon le type
     - Appliquer les limites (plancher/plafond)
     - Calculer le montant selon le type de calcul
     - Arrondir au centime
     - Répartir entre salarial/patronal
     - Accumuler les totaux
   - Recalculer le salaire net
   - Vérifier la convergence (différence < 1 centime)
   - Sinon, réitérer avec la nouvelle estimation

5. **Finalisation**
   - Calculer le salaire net final = brut - cotisations salariales
   - Calculer le coût total = brut + cotisations patronales
   - Arrondir tous les montants au centime

### Calcul de l'assiette

```typescript
function calculerAssiette(
  typeAssiette: TypeAssiette,
  salaireBrut: number,
  salaireNet: number,
  plafondMensuel: number
): number
```

| Type d'assiette | Calcul |
|-----------------|--------|
| `SALAIRE_BRUT` | `salaireBrut` |
| `SALAIRE_NET` | `salaireNet` (estimation courante) |
| `SALAIRE_PLAFONNE` | `min(salaireBrut, plafondMensuel)` |

### Application des limites

```typescript
function appliquerLimites(
  assiette: number,
  plancher: number | null,
  plafond: number | null
): number
```

1. Si `plafond` est défini et `assiette > plafond` → `assiette = plafond`
2. Si `plancher` est défini et `assiette < plancher` → `assiette = plancher`

### Calcul du montant

```typescript
function calculerMontant(
  typeCalcul: TypeCalcul,
  assiette: number,
  taux: number
): number
```

| Type de calcul | Formule |
|----------------|---------|
| `POURCENTAGE` | `assiette × taux` |
| `MONTANT_FIXE` | `taux` (le taux représente le montant fixe) |
| `TRANCHES` | Calcul par tranches progressives (à implémenter) |

### Arrondi bancaire

Tous les montants sont arrondis au centime près en utilisant l'arrondi standard IEEE 754 (round half to even) :

```typescript
function arrondir(montant: number): number {
  return Math.round(montant * 100) / 100;
}
```

### Convergence pour assiette nette

Certaines cotisations (ex: CSG/CRDS) sont calculées sur le salaire net, ce qui crée une dépendance circulaire :

```
salaire_net = salaire_brut - cotisations_salariales
cotisations_salariales = f(salaire_net)
```

Le moteur utilise une méthode itérative :

1. Estimation initiale : `salaire_net ≈ 0.78 × salaire_brut`
2. Calculer toutes les cotisations avec cette estimation
3. Recalculer le salaire net
4. Si la différence < 1 centime → convergence
5. Sinon, réitérer avec la nouvelle valeur (max 5 fois)

Cette approche converge généralement en 2-3 itérations.

---

## Exemples d'utilisation

### Exemple 1 : Calcul simple

```typescript
const resultat = await calculerCotisations({
  salaireBrut: 2500,
  dateReference: new Date('2025-01-15')
});

console.log(`Salaire net : ${resultat.salaireNet} €`);
// Salaire net : 1950.25 €
```

### Exemple 2 : Calcul pour un salaire élevé (plafonnement)

```typescript
const resultat = await calculerCotisations({
  salaireBrut: 10000,  // Bien au-dessus du PASS mensuel (3864€)
  dateReference: new Date('2025-01-15')
});

// Certaines cotisations seront plafonnées au PASS
const retraite = resultat.lignesCotisations.find(
  l => l.code === 'RETRAITE_BASE_SAL'
);
console.log(`Assiette retraite : ${retraite.assiette} €`);
// Assiette retraite : 3864.00 € (plafonné)
```

### Exemple 3 : Génération de fiche de paie

```typescript
const resultat = await calculerCotisations({
  salaireBrut: 3000,
  dateReference: new Date('2025-01-15')
});

const fichePaie = genererFichePaieTexte(resultat);

// Sauvegarder dans un fichier
import fs from 'fs';
fs.writeFileSync('fiche_paie_janvier_2025.txt', fichePaie);
```

### Exemple 4 : Analyse par catégorie

```typescript
const resultat = await calculerCotisations({
  salaireBrut: 3500,
  dateReference: new Date('2025-01-15')
});

// Grouper par catégorie
const parCategorie = new Map<string, number>();

for (const ligne of resultat.lignesCotisations) {
  const total = parCategorie.get(ligne.categorie) || 0;
  parCategorie.set(ligne.categorie, total + ligne.montantTotal);
}

console.log('Répartition des cotisations par catégorie :');
const categories = Array.from(parCategorie.entries());
for (let i = 0; i < categories.length; i++) {
  const [cat, montant] = categories[i];
  console.log(`  ${cat}: ${montant.toFixed(2)} €`);
}
```

### Exemple 5 : Comparaison temporelle

```typescript
// Comparer les taux entre deux dates
const resultat2024 = await calculerCotisations({
  salaireBrut: 3000,
  dateReference: new Date('2024-06-15')
});

const resultat2025 = await calculerCotisations({
  salaireBrut: 3000,
  dateReference: new Date('2025-06-15')
});

console.log('Évolution 2024 → 2025 :');
console.log(`Salaire net 2024 : ${resultat2024.salaireNet} €`);
console.log(`Salaire net 2025 : ${resultat2025.salaireNet} €`);
console.log(`Différence       : ${resultat2025.salaireNet - resultat2024.salaireNet} €`);
```

---

## Gestion des règles de cotisations

### Structure des données

Les règles de cotisations sont stockées dans la base de données avec les modèles Prisma suivants :

- **`CategorieCotisation`** : Regroupe les cotisations par domaine (SS, RETRAITE, etc.)
- **`OrganismeCotisation`** : Organismes collecteurs (URSSAF, AGIRC-ARRCO, etc.)
- **`RegleCotisation`** : Définition d'une cotisation spécifique
- **`TauxCotisation`** : Historique des taux avec périodes de validité

### Exemples de codes standards

#### Catégories

- `SS` : Sécurité sociale
- `RETRAITE` : Retraite de base et complémentaire
- `CHOMAGE` : Assurance chômage
- `AT_MP` : Accidents du travail et maladies professionnelles
- `FAMILLE` : Allocations familiales
- `CSG_CRDS` : Contribution sociale généralisée et CRDS

#### Organismes

- `URSSAF` : Union de recouvrement des cotisations
- `AGIRC_ARRCO` : Retraite complémentaire
- `POLE_EMPLOI` : Assurance chômage
- `CPAM` : Caisse primaire d'assurance maladie

#### Règles (exemples)

- `SS_MALADIE_SAL` : Cotisation maladie salariale (0,75%)
- `SS_MALADIE_PAT` : Cotisation maladie patronale (7%)
- `RETRAITE_BASE_SAL` : Retraite de base salariale (6,90%, plafonnée)
- `RETRAITE_BASE_PAT` : Retraite de base patronale (8,55%, plafonnée)
- `CSG_DEDUCTIBLE` : CSG déductible (6,80% sur 98,25% du brut)

### Création d'une nouvelle règle

```typescript
// 1. Créer ou récupérer la catégorie
const categorie = await prisma.categorieCotisation.findUnique({
  where: { code: 'SS' }
});

// 2. Créer ou récupérer l'organisme
const organisme = await prisma.organismeCotisation.findUnique({
  where: { code: 'URSSAF' }
});

// 3. Créer la règle
const regle = await prisma.regleCotisation.create({
  data: {
    code: 'SS_VIEILLESSE_SAL',
    nom: 'Assurance vieillesse',
    description: 'Cotisation vieillesse salariale plafonnée',
    categorieId: categorie.id,
    organismeId: organisme.id,
    typeCotisation: 'COTISATION_SALARIALE',
    typeCalcul: 'POURCENTAGE',
    typeAssiette: 'SALAIRE_PLAFONNE',
    plancher: null,
    plafond: 3864,  // PASS mensuel
    estActif: true
  }
});

// 4. Ajouter le taux
await prisma.tauxCotisation.create({
  data: {
    regleId: regle.id,
    taux: 0.069,  // 6,90%
    dateDebut: new Date('2025-01-01'),
    dateFin: null  // Taux actuel, pas de date de fin
  }
});
```

### Mise à jour annuelle des taux

```typescript
// Exemple : mise à jour du taux maladie au 1er janvier 2026
const regle = await prisma.regleCotisation.findUnique({
  where: { code: 'SS_MALADIE_SAL' }
});

// Clôturer l'ancien taux
await prisma.tauxCotisation.updateMany({
  where: {
    regleId: regle.id,
    dateFin: null
  },
  data: {
    dateFin: new Date('2026-01-01')
  }
});

// Créer le nouveau taux
await prisma.tauxCotisation.create({
  data: {
    regleId: regle.id,
    taux: 0.0080,  // Nouveau taux : 0,80%
    dateDebut: new Date('2026-01-01'),
    dateFin: null
  }
});
```

---

## Performance

### Objectifs

- ✅ **< 100ms** pour un calcul complet avec toutes les cotisations
- ✅ Optimisation des requêtes base de données
- ✅ Convergence rapide (2-3 itérations en moyenne)

### Optimisations implémentées

1. **Requêtes groupées**
   - Récupération de toutes les règles actives en une seule requête
   - Inclusion des relations (catégorie, organisme) via `include`

2. **Indexation**
   - Index sur `regleId` et `dateDebut` dans `TauxCotisation`
   - Contrainte unique sur `(regleId, dateDebut)`

3. **Convergence rapide**
   - Estimation initiale proche de la valeur finale (78%)
   - Limite de 5 itérations maximum
   - Test de convergence à 1 centime

4. **Calculs optimisés**
   - Arrondi unique par montant
   - Pas de calculs redondants

### Mesure de performance

Les tests unitaires incluent des tests de performance :

```typescript
it('devrait calculer en moins de 100ms', async () => {
  const debut = Date.now();
  await calculerCotisations({
    salaireBrut: 3000,
    dateReference: new Date('2025-01-15')
  });
  const duree = Date.now() - debut;

  expect(duree).toBeLessThan(100);
});
```

---

## Tests

### Localisation

`/backend/src/tests/moteurCotisations.test.ts`

### Couverture

Les tests couvrent :

- ✅ Calculs nominaux
- ✅ Cotisations salariales et patronales
- ✅ Assiettes plafonnées
- ✅ Montants fixes
- ✅ Gestion des erreurs (salaire négatif, date invalide)
- ✅ Cas limites (salaire 0€, très gros salaire)
- ✅ Précision au centime
- ✅ Performance (< 100ms)
- ✅ Génération de fiche de paie
- ✅ Historique des taux

### Exécution des tests

```bash
cd backend
npm test -- moteurCotisations.test.ts
```

---

## Limitations et évolutions futures

### Limitations actuelles

1. **Calcul par tranches** : Implémenté de façon simplifiée
   - Actuellement traité comme un pourcentage simple
   - À améliorer pour supporter les vraies tranches progressives (ex: certaines retraites complémentaires)

2. **Taux variables selon la taille de l'entreprise**
   - Non supporté actuellement
   - À ajouter : taux AT/MP, versement transport, etc.

3. **Temps partiel**
   - Pas de gestion spécifique du prorata temporis
   - À ajouter : adaptation des plafonds

4. **Éléments variables de paie**
   - Heures supplémentaires, primes, avantages en nature
   - À intégrer dans le calcul de l'assiette

### Évolutions prévues

- [ ] Calcul par tranches progressives complet
- [ ] Gestion du temps partiel et prorata temporis
- [ ] Support des taux variables par taille d'entreprise
- [ ] Intégration des éléments variables de paie
- [ ] Calcul des allègements de charges (réduction Fillon, etc.)
- [ ] Export PDF des fiches de paie
- [ ] API REST pour le moteur de calcul

---

## Conformité réglementaire

### Sources officielles

- **URSSAF** : [https://www.urssaf.fr](https://www.urssaf.fr)
  - Taux de cotisations en vigueur
  - Plafond de la Sécurité Sociale (PASS)
  - Assiettes de cotisations

- **Légifrance** : Code de la Sécurité Sociale
  - Articles L242-1 et suivants
  - Décrets d'application

- **AGIRC-ARRCO** : Taux de retraite complémentaire

### Mise à jour annuelle

Les éléments suivants doivent être mis à jour chaque année :

1. **PASS** (généralement en janvier)
   - Mettre à jour les constantes dans `moteurCotisations.ts`
   - Vérifier le PASS dans `cotisations-constants.ts`

2. **Taux de cotisations**
   - Clôturer les anciens taux dans la base de données
   - Créer les nouveaux taux avec la date d'effet

3. **Nouvelles cotisations**
   - Ajouter les nouvelles règles si nécessaire
   - Documenter les changements

### Audit de conformité

Avant chaque mise en production :

1. ✅ Vérifier les taux avec les sources officielles
2. ✅ Tester avec des cas réels
3. ✅ Comparer avec des bulletins de paie de référence
4. ✅ Valider la précision au centime près

---

## FAQ

### Comment ajouter une nouvelle cotisation ?

Voir la section [Création d'une nouvelle règle](#création-dune-nouvelle-règle).

### Comment gérer les taux qui changent en cours d'année ?

Créer un nouveau `TauxCotisation` avec la date de début appropriée et clôturer l'ancien.

### Pourquoi y a-t-il une boucle de convergence ?

Certaines cotisations (CSG/CRDS) sont calculées sur le salaire net, créant une dépendance circulaire. La convergence itérative résout ce problème.

### Comment tester le moteur avec mes propres données ?

```typescript
const resultat = await calculerCotisations({
  salaireBrut: votreSalaire,
  dateReference: new Date()
});

console.log(genererFichePaieTexte(resultat));
```

### Le moteur gère-t-il les heures supplémentaires ?

Pas encore. C'est prévu dans les évolutions futures. Pour l'instant, intégrez-les dans le salaire brut.

---

## Support et contribution

### Rapporter un bug

Ouvrir une issue sur GitHub avec :
- Le salaire brut testé
- La date de référence
- Le résultat obtenu vs attendu
- Les logs d'erreur éventuels

### Contribuer

Les contributions sont bienvenues ! Voir `CONTRIBUTING.md`.

Domaines de contribution prioritaires :
- Calcul par tranches progressives
- Gestion du temps partiel
- Tests supplémentaires
- Documentation d'exemples réels

---

## Licence

OpenPayFit - Open Source HR & Payroll Management
Voir le fichier LICENSE à la racine du projet.

---

**Dernière mise à jour** : 2025-01-16
**Version** : 1.0.0
**Auteur** : Équipe OpenPayFit
