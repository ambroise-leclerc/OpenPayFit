---
title: "[FEATURE] Définir le schéma de données pour les règles de cotisations et fiscales"
labels: enhancement, database, payroll, high-priority
assignees:
---

## Description

Créer le schéma de base de données Prisma pour stocker et gérer les règles de cotisations sociales et fiscales de manière structurée et extensible.

## Contexte

Actuellement, le module de paie utilise un taux fixe de 25% pour les déductions (`DEDUCTION_RATE = 0.25` dans `/backend/src/lib/payroll.ts:83`). Ce système est trop simpliste pour une application de gestion de paie réaliste.

Il est nécessaire de créer un système flexible permettant de :
- Décrire précisément chaque règle de cotisation
- Gérer les différents organismes collecteurs
- Distinguer cotisations salariales et patronales
- Associer les règles comptables
- Maintenir un historique des taux (changements législatifs)

## Proposition de schéma

```prisma
// Catégorie de règle (Sécurité sociale, retraite, chômage, etc.)
model CategorieCotisation {
  id               String              @id @default(cuid())
  code             String              @unique // Ex: "SS", "RETRAITE", "CHOMAGE"
  nom              String              // Ex: "Sécurité sociale"
  description      String?
  regles           RegleCotisation[]
  dateCreation     DateTime            @default(now())
  dateModification DateTime            @updatedAt
}

// Organisme collecteur
model OrganismeCotisation {
  id               String              @id @default(cuid())
  code             String              @unique // Ex: "URSSAF", "AGIRC_ARRCO"
  nom              String              // Ex: "URSSAF"
  description      String?
  regles           RegleCotisation[]
  dateCreation     DateTime            @default(now())
  dateModification DateTime            @updatedAt
}

// Règle de cotisation ou charge
model RegleCotisation {
  id                  String                    @id @default(cuid())
  code                String                    @unique // Ex: "SS_MALADIE_SAL"
  nom                 String                    // Ex: "Assurance maladie - Part salariale"
  description         String?

  // Classification
  categorie           CategorieCotisation       @relation(fields: [categorieId], references: [id])
  categorieId         String
  organisme           OrganismeCotisation       @relation(fields: [organismeId], references: [id])
  organismeId         String

  // Type de règle
  typeCotisation      TypeCotisation            // COTISATION_SALARIALE | COTISATION_PATRONALE | CHARGE_FISCALE

  // Calcul
  typeCalcul          TypeCalcul                // POURCENTAGE | MONTANT_FIXE | TRANCHES
  typeAssiette        TypeAssiette              // SALAIRE_BRUT | SALAIRE_NET | SALAIRE_PLAFONNE

  // Plafond et plancher (optionnels)
  plancher            Float?                    // Plancher (montant minimum)
  plafond             Float?                    // Plafond (montant maximum)

  // Taux actifs
  taux                TauxCotisation[]

  // Règles comptables
  reglesComptables    RegleComptable[]

  // Statut
  estActif            Boolean                   @default(true)

  dateCreation        DateTime                  @default(now())
  dateModification    DateTime                  @updatedAt
}

// Taux avec historique (pour gérer les changements législatifs)
model TauxCotisation {
  id               String            @id @default(cuid())
  regle            RegleCotisation   @relation(fields: [regleId], references: [id])
  regleId          String

  taux             Float             // Taux en pourcentage (ex: 0.0755 pour 7.55%)
  dateDebut        DateTime          // Date de début d'application
  dateFin          DateTime?         // Date de fin (null = toujours actif)

  dateCreation     DateTime          @default(now())
  dateModification DateTime          @updatedAt

  @@index([regleId, dateDebut])
}

// Règles comptables associées
model RegleComptable {
  id               String            @id @default(cuid())
  regle            RegleCotisation   @relation(fields: [regleId], references: [id])
  regleId          String

  // Comptes comptables
  compteDebit      String            // Compte de débit (ex: "6451")
  compteCredit     String            // Compte de crédit (ex: "431")

  description      String?

  dateCreation     DateTime          @default(now())
  dateModification DateTime          @updatedAt
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

## Tâches

- [ ] Ajouter les modèles au fichier `backend/prisma/schema.prisma`
- [ ] Créer la migration Prisma : `npx prisma migrate dev --name ajout_systeme_regles_cotisations`
- [ ] Générer le client Prisma mis à jour
- [ ] Créer des types TypeScript dans `backend/src/types/cotisations.ts`
- [ ] Documenter le schéma dans `/docs/SCHEMA_REGLES_COTISATIONS.md`

## Critères d'acceptation

- [ ] Le schéma Prisma compile sans erreur
- [ ] La migration s'applique correctement sur SQLite et PostgreSQL
- [ ] Les relations entre modèles sont correctement définies
- [ ] Les enums couvrent tous les cas d'usage prévus
- [ ] La documentation est à jour

## Notes

Ce schéma pose les fondations pour :
- Issue #2 : DSL pour décrire les règles
- Issue #3 : API de gestion
- Issue #4 : Moteur de calcul
