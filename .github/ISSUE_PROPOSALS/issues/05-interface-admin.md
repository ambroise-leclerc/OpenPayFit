---
title: "[FEATURE] Interface d'administration des règles de cotisations"
labels: enhancement, frontend, payroll, admin, medium-priority
assignees:
---

## Description

Créer une interface web permettant aux administrateurs de visualiser, créer et modifier les règles de cotisations sans toucher au code.

## Pages à créer

### 1. Liste des règles (`/admin/cotisations/regles`)

**Fonctionnalités** :
- Tableau avec filtres (catégorie, organisme, type, statut)
- Colonnes : Code, Nom, Type, Taux actuel, Organisme, Statut
- Actions : Voir détail, Modifier, Activer/Désactiver, Supprimer
- Bouton "Importer depuis YAML"
- Bouton "Exporter toutes les règles"
- Bouton "Créer une nouvelle règle"

### 2. Détail d'une règle (`/admin/cotisations/regles/:id`)

**Affichage** :
- Informations générales (code, nom, description, catégorie, organisme)
- Type et mode de calcul
- Historique des taux (timeline visuelle)
- Règles comptables
- Bouton "Modifier"
- Bouton "Ajouter un nouveau taux"

### 3. Formulaire de création/modification

**Champs** :
- Code (unique)
- Nom
- Description
- Catégorie (select)
- Organisme (select)
- Type de cotisation (select)
- Type de calcul (select)
- Type d'assiette (select)
- Plafond (optionnel)
- Plancher (optionnel)
- Taux initial
- Date d'effet
- Compte de débit
- Compte de crédit

### 4. Simulateur (`/admin/cotisations/simulateur`)

**Interface** :
- Champ : Salaire brut
- Champ : Date de calcul
- Bouton "Calculer"
- Résultat : Tableau détaillé des cotisations
- Totaux : Cotisations salariales, patronales, net, coût total

## Structure des composants

```
frontend/src/pages/
├── admin/
│   ├── PageReglesCotisations.tsx         # Liste
│   ├── PageDetailRegleCotisation.tsx     # Détail
│   ├── PageFormulaireRegle.tsx           # Formulaire
│   └── PageSimulateurCotisations.tsx     # Simulateur

frontend/src/components/
├── cotisations/
│   ├── ListeRegles.tsx
│   ├── CarteRegle.tsx
│   ├── FormulaireRegle.tsx
│   ├── ChronologieTaux.tsx
│   └── ResultatsSimulateur.tsx
```

## Exemple de composant

```typescript
// frontend/src/pages/admin/PageFormulaireRegle.tsx

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

    try {
      await api.creerRegleCotisation(donnees, token);
      navigate('/admin/cotisations/regles');
    } catch (erreur) {
      console.error('Erreur:', erreur);
    }
  };

  return (
    <form onSubmit={soumettre} className={styles.formulaire}>
      <h1>Nouvelle règle de cotisation</h1>

      <div className={styles.champ}>
        <label>Code</label>
        <input
          type="text"
          value={donnees.code}
          onChange={e => setDonnees({ ...donnees, code: e.target.value })}
          placeholder="Ex: SS_MALADIE_SAL"
          required
        />
      </div>

      <div className={styles.champ}>
        <label>Nom</label>
        <input
          type="text"
          value={donnees.nom}
          onChange={e => setDonnees({ ...donnees, nom: e.target.value })}
          placeholder="Ex: Assurance maladie - Part salariale"
          required
        />
      </div>

      <div className={styles.champ}>
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

      <div className={styles.champ}>
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

      <div className={styles.champ}>
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

      <div className={styles.champ}>
        <label>Taux initial (%)</label>
        <input
          type="number"
          step="0.01"
          value={donnees.tauxInitial}
          onChange={e => setDonnees({ ...donnees, tauxInitial: parseFloat(e.target.value) })}
          required
        />
      </div>

      <button type="submit">Créer la règle</button>
    </form>
  );
}
```

## Tâches

- [ ] Créer les pages d'administration
- [ ] Créer les composants React
- [ ] Intégrer avec l'API backend
- [ ] Ajouter la gestion des permissions (admin uniquement)
- [ ] Implémenter l'import/export de fichiers
- [ ] Créer les styles CSS Modules
- [ ] Ajouter les tests Vitest
- [ ] Mettre à jour le menu de navigation

## Sécurité

- Route `/admin/*` protégée par authentification + rôle admin
- Validation côté client ET serveur
- Confirmation avant suppression
- Messages d'erreur clairs

## Middleware de vérification admin

```typescript
// backend/src/middleware/admin.ts

export function verifierAdmin(req: Request, res: Response, next: NextFunction) {
  // Vérifier si l'utilisateur est admin
  // Pour le MVP, on peut utiliser un flag isAdmin dans User
  const userId = req.userId;

  const user = await prisma.user.findUnique({
    where: { id: userId }
  });

  if (!user || !user.isAdmin) {
    return res.status(403).json({ erreur: 'Accès réservé aux administrateurs' });
  }

  next();
}
```

## Critères d'acceptation

- [ ] Toutes les pages sont fonctionnelles
- [ ] L'interface est intuitive et responsive
- [ ] Les formulaires sont validés correctement
- [ ] L'import/export fonctionne
- [ ] Le simulateur affiche les résultats correctement
- [ ] Les tests couvrent les interactions principales
- [ ] Seuls les administrateurs peuvent accéder à l'interface

## Dépendances

- Requiert : Issue #3 (API de gestion)
- Requiert : Issue #4 (Moteur de calcul pour simulateur)

## Notes

Cette interface permettra aux RH et comptables de gérer les règles sans intervention technique, rendant le système autonome et flexible.
