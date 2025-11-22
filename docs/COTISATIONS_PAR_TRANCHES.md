# Système de cotisations par tranches

## Vue d'ensemble

OpenPayFit implémente un système avancé de calcul des cotisations sociales par tranches progressives, basé sur le **Plafond Annuel de la Sécurité Sociale (PASS)**.

Ce système permet de gérer les cotisations qui s'appliquent différemment selon des tranches de rémunération, comme la retraite complémentaire, et de prendre en compte le statut professionnel de l'employé (cadre, non-cadre, cadre dirigeant, forfait jours).

## Le PASS (Plafond Annuel de la Sécurité Sociale)

Le PASS est une valeur de référence fixée annuellement par le gouvernement français. Il sert de base au calcul de nombreuses cotisations sociales.

**Valeurs 2025 :**
- PASS annuel : **46 368 €**
- PASS mensuel : **3 864 €** (46 368 / 12)
- PASS journalier : **226 €**
- PASS hebdomadaire : **894 €**

Source : [URSSAF - Plafond de la sécurité sociale](https://www.urssaf.fr/portail/home/taux-et-baremes/plafond-de-la-securite-social.html)

## Système de tranches 1, 2, 3

Les cotisations par tranches sont calculées en **multiples du PASS** :

### Tranche 1
- **Bornes** : 0 à 1 PASS
- **Salaires concernés** : 0 à 46 368 € par an (0 à 3 864 € par mois)
- **Application** : Tous les employés (cadres et non-cadres)

### Tranche 2
- **Bornes** : 1 PASS à 8 PASS
- **Salaires concernés** : 46 368 € à 370 944 € par an (3 864 € à 30 912 € par mois)
- **Application** : Cadres et employés au forfait jours uniquement

### Tranche 3
- **Bornes** : Au-delà de 8 PASS
- **Salaires concernés** : Plus de 370 944 € par an (plus de 30 912 € par mois)
- **Application** : Cadres dirigeants uniquement

## Statuts professionnels

Le système reconnaît quatre statuts d'employés, qui déterminent quelles tranches s'appliquent :

### NON_CADRE
- **Description** : Employés, techniciens, agents de maîtrise
- **Tranches applicables** : Tranche 1 uniquement
- **Plafond effectif** : 1 PASS (46 368 € annuel)

### CADRE
- **Description** : Cadres au statut classique
- **Tranches applicables** : Tranches 1 et 2
- **Plafond effectif** : 8 PASS (370 944 € annuel)

### FORFAIT_JOURS
- **Description** : Cadres au forfait jours (convention de forfait annuel en jours)
- **Tranches applicables** : Tranches 1 et 2 (même traitement que CADRE)
- **Plafond effectif** : 8 PASS (370 944 € annuel)

### CADRE_DIRIGEANT
- **Description** : Cadres dirigeants
- **Tranches applicables** : Tranches 1 et 3 (la tranche 2 ne s'applique généralement pas)
- **Plafond effectif** : Aucun (la tranche 3 est illimitée)

## Principe de calcul

Le calcul par tranches est **progressif** : chaque tranche s'applique uniquement à la portion du salaire qui tombe dans cette tranche.

### Exemple 1 : Non-cadre avec 2 500 € brut/mois

**Salaire annuel** : 2 500 × 12 = 30 000 €

**Calcul** :
- Tranche 1 (0 à 46 368 €) : 30 000 € entrent entièrement dans cette tranche
  - Part salariale : 30 000 × 3,40% = 1 020 €/an = **85 €/mois**
  - Part patronale : 30 000 × 4,60% = 1 380 €/an = **115 €/mois**

**Résultat mensuel** :
- Cotisation salariale : **85 €**
- Cotisation patronale : **115 €**

---

### Exemple 2 : Cadre avec 6 000 € brut/mois

**Salaire annuel** : 6 000 × 12 = 72 000 €

**Calcul** :
- **Tranche 1** (0 à 46 368 €) : 46 368 € dans cette tranche
  - Part salariale : 46 368 × 3,40% = 1 576,51 €/an
  - Part patronale : 46 368 × 4,60% = 2 132,93 €/an

- **Tranche 2** (46 368 € à 72 000 €) : 72 000 - 46 368 = 25 632 € dans cette tranche
  - Part salariale : 25 632 × 8,60% = 2 204,35 €/an
  - Part patronale : 25 632 × 12,90% = 3 306,53 €/an

**Total annuel** :
- Cotisation salariale : 1 576,51 + 2 204,35 = 3 780,86 €/an = **315,07 €/mois**
- Cotisation patronale : 2 132,93 + 3 306,53 = 5 439,46 €/an = **453,29 €/mois**

---

### Exemple 3 : Cadre dirigeant avec 50 000 € brut/mois

**Salaire annuel** : 50 000 × 12 = 600 000 €

**Calcul** :
- **Tranche 1** (0 à 46 368 €) : 46 368 € dans cette tranche
  - Part salariale : 46 368 × 3,40% = 1 576,51 €/an
  - Part patronale : 46 368 × 4,60% = 2 132,93 €/an

- **Tranche 2** : Ne s'applique pas aux cadres dirigeants

- **Tranche 3** (au-delà de 370 944 €) : 600 000 - 370 944 = 229 056 € dans cette tranche
  - Part salarial: 229 056 × 1,00% = 2 290,56 €/an
  - Part patronale : 229 056 × 1,50% = 3 435,84 €/an

**Total annuel** :
- Cotisation salariale : 1 576,51 + 2 290,56 = 3 867,07 €/an = **322,26 €/mois**
- Cotisation patronale : 2 132,93 + 3 435,84 = 5 568,77 €/an = **464,06 €/mois**

## Utilisation dans le code

### Paramètres de calcul

```typescript
import { calculerCotisations, ParametresCalcul } from './lib/moteurCotisations';

const parametres: ParametresCalcul = {
  salaireBrut: 6000,              // Salaire brut mensuel
  dateReference: new Date('2025-01-15'),
  statutEmploye: 'CADRE',         // Statut professionnel
  plafondMensuel: 3864            // Optionnel, par défaut PASS_MENSUEL
};

const resultat = await calculerCotisations(parametres);
```

### Résultat du calcul

```typescript
console.log(resultat.lignesCotisations);
// Affiche les détails de chaque cotisation, y compris celles calculées par tranches

console.log(`Salaire net : ${resultat.salaireNet}€`);
console.log(`Coût employeur : ${resultat.coutTotal}€`);
```

## Configuration des tranches dans la base de données

### Modèle Prisma : TrancheCotisation

```prisma
model TrancheCotisation {
  id              String   @id @default(cuid())
  regleId         String   // Référence à la règle de cotisation

  numeroTranche   Int      // 1, 2 ou 3
  nomTranche      String   // "Tranche 1", "Tranche 2", etc.

  // Bornes en multiples du PASS
  borneInferieure Float    // Ex: 0, 1, 8
  borneSuperieure Float?   // Ex: 1, 8, null (illimité)

  // Taux de cotisation
  tauxSalarial    Float    // Part salariale (ex: 0.034 = 3,4%)
  tauxPatronal    Float    // Part patronale (ex: 0.046 = 4,6%)

  // Applicabilité par statut
  appliqueCadre       Boolean
  appliqueNonCadre    Boolean
  appliqueDirigeant   Boolean

  // Période de validité
  dateDebut       DateTime
  dateFin         DateTime?
}
```

### Exemple d'insertion de tranches

```typescript
// Tranche 1 : 0 à 1 PASS
await prisma.trancheCotisation.create({
  data: {
    regleId: 'regle_retraite_comp',
    numeroTranche: 1,
    nomTranche: 'Tranche 1',
    borneInferieure: 0,
    borneSuperieure: 1,
    tauxSalarial: 0.0340,
    tauxPatronal: 0.0460,
    appliqueCadre: true,
    appliqueNonCadre: true,
    appliqueDirigeant: true,
    dateDebut: new Date('2024-01-01'),
    dateFin: null
  }
});

// Tranche 2 : 1 à 8 PASS (cadres uniquement)
await prisma.trancheCotisation.create({
  data: {
    regleId: 'regle_retraite_comp',
    numeroTranche: 2,
    nomTranche: 'Tranche 2',
    borneInferieure: 1,
    borneSuperieure: 8,
    tauxSalarial: 0.0860,
    tauxPatronal: 0.1290,
    appliqueCadre: true,
    appliqueNonCadre: false,
    appliqueDirigeant: false,
    dateDebut: new Date('2024-01-01'),
    dateFin: null
  }
});
```

## Tests

Le système de tranches est testé de manière exhaustive dans `/backend/src/tests/moteurCotisations.tranches.test.ts`.

Les tests couvrent :
- ✅ Calcul pour chaque statut (NON_CADRE, CADRE, CADRE_DIRIGEANT, FORFAIT_JOURS)
- ✅ Salaires dans différentes tranches
- ✅ Cas limites (salaire = 0, salaire = 1 PASS, salaire > 8 PASS)
- ✅ Vérification de l'applicabilité des tranches selon le statut
- ✅ Précision des calculs

Exécuter les tests :
```bash
cd backend
npm test -- moteurCotisations.tranches.test.ts
```

## Cas spéciaux mentionnés dans l'issue #44

### Exonérations (à implémenter)

L'issue mentionne également la gestion des exonérations spécifiques :

- **ACCRE** (Aide aux Créateurs et Repreneurs d'Entreprise) : Exonération partielle ou totale des cotisations sociales pendant les premières années d'activité
- **ZRR** (Zones de Revitalisation Rurale) : Exonérations liées à l'implantation géographique

Ces exonérations seront implémentées dans une phase ultérieure en ajoutant des règles conditionnelles au moteur de calcul.

### Cotisations sectorielles (à implémenter)

Certains secteurs d'activité ont des règles de cotisations spécifiques qui viendront compléter le système de tranches.

## Références législatives

- [Code de la sécurité sociale - Articles R243-1 à R243-7](https://www.legifrance.gouv.fr/)
- [URSSAF - Plafond de la sécurité sociale](https://www.urssaf.fr/portail/home/taux-et-baremes/plafond-de-la-securite-social.html)
- [AGIRC-ARRCO - Documentation retraite complémentaire](https://www.agirc-arrco.fr/)

## Notes importantes

1. **Mise à jour annuelle** : Le PASS est réévalué chaque année. Les constantes dans `cotisations-constants.ts` doivent être mises à jour en janvier.

2. **Historisation** : Les tranches supportent l'historisation via les champs `dateDebut` et `dateFin`, permettant de suivre l'évolution des taux dans le temps.

3. **Flexibilité** : Le système est conçu pour supporter d'autres types de tranches futures (ex: tranches spécifiques à certains secteurs).

4. **Performance** : Les tranches sont chargées une seule fois par calcul et mises en cache pendant la durée du traitement.

---

**Auteur** : Équipe OpenPayFit
**Date** : 22 novembre 2025
**Issue** : #44 - Calculateur de cotisations avancé avec tranches 1, 2, 3
