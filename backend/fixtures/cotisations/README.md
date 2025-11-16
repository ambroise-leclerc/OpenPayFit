# Fixtures des cotisations sociales françaises

Ce dossier contient les données de référence des cotisations sociales françaises au format YAML.

## Fichiers disponibles

### Fichier principal : `cotisations-france-2024-2025.yaml`

**Description** : Règles de cotisations sociales françaises officielles pour 2024-2025

**Contenu** :
- 22 règles de cotisations sociales
- 10 catégories (Sécurité sociale, Retraite, Chômage, CSG/CRDS, etc.)
- 3 organismes collecteurs (URSSAF, AGIRC-ARRCO, Pôle emploi)
- Constantes officielles (PASS 2024, SMIC 2024)
- Taux historisés avec dates de début et fin de validité

**Couverture** :
- ✅ Sécurité sociale (maladie, vieillesse) - parts salariale et patronale
- ✅ Allocations familiales
- ✅ Accidents du travail (AT/MP)
- ✅ Assurance chômage
- ✅ Retraite complémentaire AGIRC-ARRCO (tranches 1 et 2)
- ✅ CSG déductible et non déductible
- ✅ CRDS
- ✅ Formation professionnelle
- ✅ Contribution solidarité autonomie (CSA)
- ✅ Fonds national d'aide au logement (FNAL)

### Fichiers d'exemple

- `exemple-simple.yaml` : Exemple simplifié avec 4 cotisations de base
- `exemple-evolution-taux.yaml` : Exemple montrant l'évolution d'un taux dans le temps

## Utilisation

### Charger les données dans la base de données

```bash
# En développement
npm run seed:cotisations

# En test
NODE_ENV=test npm run seed:cotisations

# Avec un fichier personnalisé
node scripts/seed-cotisations.js /chemin/vers/fichier.yaml
```

### Vérifier les données chargées

Le script affiche un récapitulatif à la fin :

```
📊 Récapitulatif des données en base:
   • Catégories: 10
   • Organismes: 3
   • Règles de cotisations: 22
   • Taux historiques: 22
   • Règles comptables: 22

   Répartition par type:
   • CHARGE_FISCALE: 3
   • COTISATION_PATRONALE: 13
   • COTISATION_SALARIALE: 6
```

### Exécuter les tests de validation

```bash
# Exécuter tous les tests
npm test

# Exécuter uniquement les tests de cotisations
npm test -- cotisations.test.ts
```

Les tests valident :
- Le chargement correct des données
- Les taux officiels 2024
- Les plafonds et assiettes
- Les règles comptables
- Des calculs pratiques sur salaires types

## Structure du fichier YAML

```yaml
version: "1.0"
date_creation: "2024-11-16"
description: "Description du fichier"
source: "Sources officielles"

constantes:
  PASS_ANNUEL: 46368
  PASS_MENSUEL: 3864
  SMIC_MENSUEL: 1766.92

cotisations:
  - code: CODE_UNIQUE
    nom: "Nom de la cotisation"
    description: "Description détaillée"
    categorie: CATEGORIE_CODE
    organisme: ORGANISME_CODE
    type: COTISATION_SALARIALE | COTISATION_PATRONALE | CHARGE_FISCALE
    actif: true | false
    calcul:
      type: POURCENTAGE | MONTANT_FIXE | TRANCHES
      assiette: SALAIRE_BRUT | SALAIRE_NET | SALAIRE_PLAFONNE
      plafond: null | montant_en_euros
      plancher: null | montant_en_euros
    taux:
      - taux: 0.0690  # Taux en décimal (6,90% = 0.0690)
        date_debut: "2024-01-01"
        date_fin: null  # null = toujours actif
    comptabilite:
      compte_debit: "6411"  # Compte PCG
      compte_credit: "431"   # Compte PCG
```

## Codes de catégories

- `SECURITE_SOCIALE` : Sécurité sociale (maladie, maternité, invalidité, décès)
- `RETRAITE` : Retraite de base (plafonnée et déplafonnée)
- `RETRAITE_COMPLEMENTAIRE` : Retraite complémentaire AGIRC-ARRCO
- `CHOMAGE` : Assurance chômage
- `FAMILLE` : Allocations familiales
- `AT_MP` : Accidents du travail et maladies professionnelles
- `CSG_CRDS` : CSG et CRDS
- `FORMATION` : Formation professionnelle
- `SOLIDARITE` : Solidarité et autonomie
- `LOGEMENT` : Aide au logement (FNAL)
- `COMPLEMENTAIRE` : Cotisations complémentaires
- `AUTRES` : Autres contributions

## Codes d'organismes

- `URSSAF` : Union de recouvrement des cotisations de sécurité sociale et d'allocations familiales
- `AGIRC_ARRCO` : Association pour le régime de retraite complémentaire des salariés
- `POLE_EMPLOI` : Service public de l'emploi (assurance chômage)

## Mise à jour des données

### Mise à jour annuelle (recommandée en janvier)

1. Consulter les nouvelles circulaires URSSAF et AGIRC-ARRCO
2. Vérifier le nouveau PASS (publié en décembre pour l'année suivante)
3. Vérifier le nouveau SMIC (revalorisations possibles en janvier et juillet)
4. Créer un nouveau fichier `cotisations-france-YYYY.yaml`
5. Mettre à jour les taux modifiés
6. Exécuter les tests pour valider les nouveaux taux
7. Mettre à jour `SOURCES_LEGISLATIVES.md`

### Modification d'un taux en cours d'année

Si un taux change en cours d'année :

1. Ne **pas** modifier le taux existant
2. Ajouter une `date_fin` au taux actuel
3. Ajouter un nouveau taux avec la nouvelle `date_debut`

Exemple :

```yaml
taux:
  - taux: 0.0690
    date_debut: "2024-01-01"
    date_fin: "2024-06-30"  # Fin de validité
  - taux: 0.0700            # Nouveau taux
    date_debut: "2024-07-01"
    date_fin: null
```

## Sources et références

Consultez le fichier [`SOURCES_LEGISLATIVES.md`](./SOURCES_LEGISLATIVES.md) pour :

- Les références légales complètes (Code de la sécurité sociale, décrets, etc.)
- Les sources officielles (URSSAF, AGIRC-ARRCO, Légifrance)
- Les détails des calculs (CSG/CRDS sur 98,25% du brut, etc.)
- L'historique des modifications
- Les ressources complémentaires

## Support

Pour toute question sur les cotisations sociales :

- **Employeurs** : Contacter l'URSSAF au 3957
- **Documentation** : [urssaf.fr](https://www.urssaf.fr)
- **Issues GitHub** : [Signaler un problème](https://github.com/ambroise-leclerc/OpenPayFit/issues)

## Licence

Les données de cotisations sociales sont établies à partir de sources officielles publiques.

La documentation et les scripts associés sont sous licence MIT - voir le fichier [LICENSE](../../../LICENSE) à la racine du projet.

---

**Dernière mise à jour** : 16 novembre 2024
