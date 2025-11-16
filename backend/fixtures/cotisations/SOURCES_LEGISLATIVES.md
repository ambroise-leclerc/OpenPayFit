# Sources législatives - Cotisations sociales françaises 2024-2025

Ce document référence les sources officielles utilisées pour établir les taux de cotisations sociales dans le fichier `cotisations-france-2024-2025.yaml`.

## Méthodologie

Les taux de cotisations ont été compilés à partir des sources officielles suivantes :

1. **URSSAF** - Union de recouvrement des cotisations de sécurité sociale et d'allocations familiales
2. **AGIRC-ARRCO** - Association pour le régime de retraite complémentaire des salariés
3. **Code de la sécurité sociale** - Textes législatifs et réglementaires
4. **Pôle emploi** - Service public de l'emploi

## Constantes officielles 2024

### Plafond Annuel de la Sécurité Sociale (PASS)

- **PASS annuel 2024** : 46 368 €
- **PASS mensuel 2024** : 3 864 € (46 368 / 12)
- **Source** : Arrêté du 19 décembre 2023 portant fixation du plafond de la sécurité sociale pour 2024 (JORF n°0294 du 20 décembre 2023)

### Salaire Minimum Interprofessionnel de Croissance (SMIC)

- **SMIC horaire brut** : 11,65 € (au 1er janvier 2024)
- **SMIC mensuel brut** : 1 766,92 € (base 151,67 heures)
- **Source** : Décret n° 2023-1216 du 20 décembre 2023 portant relèvement du salaire minimum de croissance (JORF n°0296 du 22 décembre 2023)

## Cotisations de sécurité sociale (URSSAF)

### Références légales

- **Code de la sécurité sociale** : Articles L241-2 à L241-13
- **Décret n° 2024-43** du 25 janvier 2024 relatif au taux de la cotisation d'allocations familiales
- **Circulaire ACOSS** n° 2024-0000008 du 17 janvier 2024

### Part salariale

| Cotisation | Taux | Assiette | Base légale |
|------------|------|----------|-------------|
| **Maladie, maternité, invalidité, décès** | 0% (1) | Totalité du salaire | CSS Art. L131-9 (suppression depuis 2018, sauf Alsace-Moselle) |
| **Vieillesse plafonnée** | 6,90% | Limitée à 1 PASS | CSS Art. L241-3 |
| **Vieillesse déplafonnée** | 0,40% | Totalité du salaire | CSS Art. L241-2 |

_(1) Sauf Alsace-Moselle : 1,30% maintenu pour financement régime local_

### Part patronale

| Cotisation | Taux | Assiette | Base légale |
|------------|------|----------|-------------|
| **Maladie, maternité, invalidité, décès** | 13% (2) | Totalité du salaire | CSS Art. L242-1, Décret n°2023-1355 |
| **Vieillesse plafonnée** | 8,55% | Limitée à 1 PASS | CSS Art. L241-3 |
| **Vieillesse déplafonnée** | 1,90% | Totalité du salaire | CSS Art. L241-2 |
| **Allocations familiales** | 3,45% (3) | Totalité du salaire | CSS Art. L241-6, Décret n°2024-43 |
| **Accidents du travail (AT/MP)** | Variable (4) | Totalité du salaire | CSS Art. L242-5 |

_(2) Taux normal. Taux réduit à 7% pour certaines entreprises (chiffre d'affaires < 2,5M€)_
_(3) Taux réduit. Taux majoré à 5,25% si la rémunération brute annuelle dépasse 3,5 SMIC annuels_
_(4) Taux variable selon le secteur d'activité et le risque. Taux moyen : 2,2%_

### Sources URSSAF

- **Site officiel** : [urssaf.fr/portail/home/taux-et-baremes.html](https://www.urssaf.fr/portail/home/taux-et-baremes.html)
- **Documentation employeurs** : "Taux de cotisations - Secteur privé" (mise à jour janvier 2024)

## Assurance chômage (Pôle emploi)

### Références légales

- **Décret n° 2019-797** du 26 juillet 2019 relatif au régime d'assurance chômage
- **Convention d'assurance chômage** du 14 avril 2017 (révisée en 2024)

### Taux de cotisation

| Cotisation | Part salariale | Part patronale | Assiette | Base légale |
|------------|----------------|----------------|----------|-------------|
| **Assurance chômage** | 0% (5) | 4,05% | Limitée à 4 PASS (185 472 €) | Convention Unédic 2017, Décret 2019-797 |

_(5) Supprimée depuis le 1er octobre 2018_

### Sources Pôle emploi

- **Site officiel** : [pole-emploi.fr](https://www.pole-emploi.fr)
- **Unédic** : [unedic.org](https://www.unedic.org) - Convention d'assurance chômage

## Retraite complémentaire (AGIRC-ARRCO)

### Références légales

- **Accord national interprofessionnel (ANI)** du 17 novembre 2017
- **Circulaire AGIRC-ARRCO** n° 2024-01-DRE du 12 janvier 2024

### Taux de cotisation 2024

Les taux incluent la **Contribution d'Équilibre Général (CEG)**.

#### Tranche 1 (salaire de 0 à 1 PASS)

| Part | Taux contractuel | CEG | Taux total | Base légale |
|------|------------------|-----|------------|-------------|
| **Salariale** | 3,15% | 0,87% | **4,02%** | ANI 2017, Art. 36 |
| **Patronale** | 4,72% | 1,29% | **6,01%** | ANI 2017, Art. 36 |

#### Tranche 2 (salaire de 1 à 8 PASS)

| Part | Taux contractuel | CEG | Taux total | Base légale |
|------|------------------|-----|------------|-------------|
| **Salariale** | 8,64% | 1,62% | **10,26%** | ANI 2017, Art. 36 |
| **Patronale** | 12,95% | 2,43% | **15,38%** | ANI 2017, Art. 36 |

### Sources AGIRC-ARRCO

- **Site officiel** : [agirc-arrco.fr](https://www.agirc-arrco.fr)
- **Documentation** : "Guide des cotisations 2024" (publié en janvier 2024)
- **Textes de référence** : [Accords nationaux interprofessionnels](https://www.agirc-arrco.fr/entreprises/textes-de-reference/)

## Contribution Sociale Généralisée (CSG) et CRDS

### Références légales

- **Code de la sécurité sociale** : Articles L136-1 à L136-8
- **Loi de financement de la sécurité sociale pour 2024** (Loi n°2023-1250 du 26 décembre 2023)

### Assiette de calcul

**Assiette CSG/CRDS** : 98,25% du salaire brut (abattement de 1,75% pour frais professionnels)

### Taux de cotisation

| Contribution | Taux théorique | Taux effectif (6) | Déductible fiscalement |
|--------------|----------------|-------------------|------------------------|
| **CSG déductible** | 6,80% | 6,68% | Oui |
| **CSG non déductible** | 2,40% | 2,36% | Non |
| **CRDS** | 0,50% | 0,49% | Non |
| **Total CSG/CRDS** | 9,70% | 9,53% | Partiel |

_(6) Taux effectif = Taux théorique × 98,25%_

### Calcul de l'assiette

```
Assiette CSG/CRDS = Salaire brut × 98,25%
Montant CSG déductible = Assiette × 6,80%
Montant CSG non déductible = Assiette × 2,40%
Montant CRDS = Assiette × 0,50%
```

### Sources légales

- **Article L136-2 CSS** : Assiette de la CSG sur les revenus d'activité
- **Article L136-8 CSS** : Taux de la CSG
- **Article 14 de l'ordonnance n°96-50** du 24 janvier 1996 : CRDS

## Autres contributions patronales

### Formation professionnelle

| Effectif entreprise | Taux | Assiette | Base légale |
|---------------------|------|----------|-------------|
| **< 11 salariés** | 0,55% | Totalité du salaire | CSS Art. L6331-2 |
| **≥ 11 salariés** | 1,00% | Totalité du salaire | CSS Art. L6331-2 |

**Source** : Loi n° 2018-771 du 5 septembre 2018 pour la liberté de choisir son avenir professionnel

### Contribution Solidarité Autonomie (CSA)

- **Taux** : 0,30%
- **Assiette** : Totalité du salaire
- **Base légale** : CSS Art. L14-10-4
- **Source** : Loi n° 2004-626 du 30 juin 2004 relative à la solidarité pour l'autonomie

### Fonds National d'Aide au Logement (FNAL)

#### Tranche 1 (toutes entreprises)

- **Taux** : 0,10%
- **Assiette** : Salaires limités à 1 PASS
- **Base légale** : CSS Art. L834-1

#### Tranche 2 (entreprises ≥ 50 salariés)

- **Taux** : 0,50%
- **Assiette** : Totalité du salaire
- **Base légale** : CSS Art. L834-1

## Comptabilité des cotisations

### Plan Comptable Général (PCG)

Les écritures comptables suivent le Plan Comptable Général français :

#### Comptes de charges (débit)

- **6411** : Salaires bruts (cotisations salariales déduites)
- **6451** : Cotisations à l'URSSAF (part patronale)
- **6452** : Cotisations aux mutuelles et autres organismes (part patronale)

#### Comptes de dettes sociales (crédit)

- **421** : Personnel - Rémunérations dues
- **431** : Sécurité sociale (URSSAF)
- **437** : Autres organismes sociaux (Pôle emploi, AGIRC-ARRCO)

### Références comptables

- **Règlement ANC n°2018-07** relatif au plan comptable général
- **Autorité des Normes Comptables (ANC)** : [anc.gouv.fr](https://www.anc.gouv.fr)

## Historique des modifications

### 2024

- **01/01/2024** : Revalorisation du PASS à 46 368 €
- **01/01/2024** : Revalorisation du SMIC à 11,65 € de l'heure
- **01/01/2024** : Maintien des taux AGIRC-ARRCO
- **01/01/2024** : Maintien des taux CSG/CRDS

### Évolutions attendues en 2025

Les taux de cotisations sociales sont susceptibles d'évoluer chaque année. Il est recommandé de :

1. Consulter les sites officiels URSSAF et AGIRC-ARRCO en janvier de chaque année
2. Vérifier les décrets de revalorisation du PASS et du SMIC
3. Mettre à jour le fichier YAML avec les nouveaux taux
4. Ajouter un nouvel enregistrement dans la table `taux_cotisation` avec les nouvelles dates de validité

## Ressources complémentaires

### Sites officiels

- **URSSAF** : [urssaf.fr](https://www.urssaf.fr)
- **AGIRC-ARRCO** : [agirc-arrco.fr](https://www.agirc-arrco.fr)
- **Pôle emploi** : [pole-emploi.fr](https://www.pole-emploi.fr)
- **Service-Public.fr** : [entreprendre.service-public.fr](https://entreprendre.service-public.fr)
- **Légifrance** : [legifrance.gouv.fr](https://www.legifrance.gouv.fr)

### Documentation technique

- **Guide de la paie 2024** - Éditions Législatives
- **Mémento Paie 2024** - Éditions Francis Lefebvre
- **Bulletin Officiel de la Sécurité Sociale (BOSS)** : [boss.gouv.fr](https://boss.gouv.fr)

### Organismes de référence

- **ACOSS** (Agence centrale des organismes de sécurité sociale)
- **CNAV** (Caisse nationale d'assurance vieillesse)
- **CNAM** (Caisse nationale d'assurance maladie)
- **CNAF** (Caisse nationale des allocations familiales)
- **Unédic** (Union nationale interprofessionnelle pour l'emploi dans l'industrie et le commerce)

## Avertissement

Les informations contenues dans ce document sont fournies à titre informatif et ont été établies avec le plus grand soin. Cependant :

1. Les taux de cotisations sociales évoluent régulièrement
2. Des cas particuliers peuvent s'appliquer selon les secteurs d'activité
3. Certaines exonérations ou réductions de cotisations peuvent s'appliquer (réduction Fillon, etc.)
4. Il est recommandé de consulter un expert-comptable ou un conseiller URSSAF pour les situations spécifiques

**En cas de doute, toujours se référer aux sources officielles citées ci-dessus.**

---

**Document version** : 1.0
**Date de création** : 16 novembre 2024
**Dernière mise à jour** : 16 novembre 2024
**Auteur** : Équipe OpenPayFit
**Licence** : CC BY-SA 4.0
