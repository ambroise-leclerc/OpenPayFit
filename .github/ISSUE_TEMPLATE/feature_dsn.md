---
name: Support de la DSN (Déclaration Sociale Nominative)
about: Implémentation du support de la DSN pour la conformité légale française
title: '[FEATURE] Support de la DSN'
labels: enhancement, priority-high, backend, compliance
assignees: ''
---

## 📋 Contexte

La **DSN (Déclaration Sociale Nominative)** est une déclaration mensuelle obligatoire en France qui permet de transmettre aux organismes de protection sociale (URSSAF, caisses de retraite, mutuelles, etc.) l'ensemble des données sociales issues de la paie.

### Importance stratégique

- ✅ **Obligation légale** : Toutes les entreprises françaises doivent transmettre la DSN
- ✅ **Conformité RGPD** : Gestion sécurisée des données sociales sensibles
- ✅ **Automatisation** : Remplace plusieurs déclarations papier (DUCS, attestation Pôle Emploi, etc.)
- ✅ **Différenciation** : Fonctionnalité critique pour être une alternative crédible à PayFit

Sans la DSN, OpenPayFit ne peut pas être utilisé en production par des entreprises françaises.

---

## 🎯 Objectif

Implémenter la génération et l'export des fichiers DSN au format **NNORME 4DS** (version actuelle de la norme DSN), permettant aux utilisateurs d'OpenPayFit de :

1. Générer automatiquement les fichiers DSN mensuels basés sur les données de paie
2. Valider la conformité des données avant export
3. Exporter les fichiers DSN aux formats requis (XML/EDI)
4. Transmettre les DSN aux organismes sociaux (phase 2)

---

## 📝 Description détaillée

### Qu'est-ce que la DSN ?

La DSN est un fichier structuré qui contient :

- **Informations de l'entreprise** : SIRET, code NAF, convention collective, etc.
- **Données individuelles des salariés** : NIR, état civil, contrat de travail
- **Données de paie mensuelles** : Rémunérations, cotisations sociales, absences, primes
- **Événements particuliers** : Embauches, fins de contrat, arrêts maladie, AT/MP

### Norme technique

- **Format** : XML structuré selon la norme NNORME 4DS
- **Structure hiérarchique** : Entreprise → Établissement → Individus → Contrats → Versements
- **Validations** : Nombreuses règles de cohérence et contrôles métier
- **Transmission** : Via net-entreprises.fr (API ou dépôt manuel)

### Types de DSN

1. **DSN mensuelle** (la plus courante) : Déclaration des paies du mois
2. **DSN événementielle** : Pour les événements hors cycle (fin de contrat, arrêt maladie)
3. **DSN de signalement** : Embauches et fins de contrat

---

## 🔧 Spécifications techniques

### 1. Nouveaux modèles de données

#### Modèle `Company` (extension)

Ajouter les champs légaux requis :

```prisma
model Company {
  // ... champs existants
  siret              String    @unique  // 14 chiffres
  codeNAF            String               // Code APE/NAF (ex: "6201Z")
  conventionCollective String?            // IDCC (ex: "3018")
  addressLine1       String
  addressLine2       String?
  postalCode         String
  city               String
  urssafCode         String               // Code URSSAF de rattachement
  dsnContact         Json?                // Contact pour la DSN (nom, email, tel)
}
```

#### Modèle `Employee` (extension)

Ajouter les informations sociales :

```prisma
model Employee {
  // ... champs existants
  socialSecurityNumber String  @unique  // NIR (15 caractères)
  birthDate            DateTime
  birthCity            String
  birthCountry         String   @default("FRANCE")
  nationality          String   @default("FRANCE")
  addressLine1         String
  addressLine2         String?
  postalCode           String
  city                 String
  contractType         String             // CDI, CDD, etc.
  contractStartDate    DateTime
  contractEndDate      DateTime?
  weeklyHours          Float     @default(35)
  employmentCategory   String             // Cadre, Non-cadre, etc.
}
```

#### Nouveau modèle `SocialContribution`

Cotisations sociales par employé et période :

```prisma
model SocialContribution {
  id                String   @id @default(cuid())
  payslipId         String
  payslip           Payslip  @relation(fields: [payslipId], references: [id])

  // Type de cotisation (code CTP)
  contributionCode  String   // Ex: "001" (Sécurité sociale), "039" (Retraite complémentaire)
  contributionLabel String

  // Assiettes et montants
  baseAmount        Float    // Assiette de cotisation
  employeeRate      Float    // Taux salarié
  employeeAmount    Float    // Montant part salarié
  employerRate      Float    // Taux employeur
  employerAmount    Float    // Montant part employeur

  // Organisme destinataire
  organismCode      String   // Code de l'organisme (URSSAF, caisse retraite, etc.)

  createdAt         DateTime @default(now())

  @@index([payslipId])
}
```

#### Nouveau modèle `DSNDeclaration`

Historique des DSN générées :

```prisma
model DSNDeclaration {
  id            String   @id @default(cuid())
  companyId     String
  company       Company  @relation(fields: [companyId], references: [id])

  period        String   // Format "YYYY-MM" (ex: "2025-11")
  dsnType       String   // "MENSUELLE", "EVENEMENTIELLE", "SIGNALEMENT"
  status        String   // "DRAFT", "VALIDATED", "TRANSMITTED", "ACCEPTED", "REJECTED"

  // Fichier généré
  xmlContent    String   @db.Text  // Contenu XML de la DSN
  fileName      String
  fileSize      Int

  // Métadonnées de transmission
  transmittedAt DateTime?
  transmissionId String?           // ID de transmission net-entreprises
  responseCode   String?           // Code retour de l'organisme
  responseMessage String?          // Message de retour

  // Statistiques
  employeeCount Int
  totalGrossSalary Float
  totalContributions Float

  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  @@unique([companyId, period, dsnType])
  @@index([companyId])
  @@index([status])
}
```

### 2. Endpoints API

#### Backend - Routes DSN

**Fichier** : `/backend/src/api/dsn.ts`

```typescript
// Génération DSN
POST /api/companies/:companyId/dsn/generate
Body: { period: "2025-11", type: "MENSUELLE" }
Response: { dsnId: "...", status: "DRAFT", validationErrors: [] }

// Liste des DSN
GET /api/companies/:companyId/dsn
Query: ?period=2025-11&status=VALIDATED
Response: [{ id, period, status, employeeCount, createdAt, ... }]

// Détails d'une DSN
GET /api/companies/:companyId/dsn/:dsnId
Response: { id, xmlContent, validationErrors, statistics, ... }

// Validation d'une DSN
POST /api/companies/:companyId/dsn/:dsnId/validate
Response: { valid: true, errors: [], warnings: [] }

// Export XML
GET /api/companies/:companyId/dsn/:dsnId/download
Response: Fichier XML en téléchargement

// Suppression d'un brouillon
DELETE /api/companies/:companyId/dsn/:dsnId
Response: 204 No Content
```

### 3. Modules métier

#### Module de génération DSN

**Fichier** : `/backend/src/services/dsnGenerator.ts`

Responsabilités :
- Construire la structure XML selon la norme NNORME 4DS
- Récupérer toutes les données nécessaires (entreprise, employés, paies, cotisations)
- Gérer les blocs obligatoires : S10 (déclarant), S20 (entreprise), S21 (établissement), S40 (individu), S41 (contrat), S43 (base assujettie)
- Formater les données selon les spécifications (dates, montants, codes)

#### Module de validation DSN

**Fichier** : `/backend/src/services/dsnValidator.ts`

Responsabilités :
- Valider la structure XML (schéma XSD)
- Vérifier les règles métier (cohérence des montants, codes organisme valides, etc.)
- Contrôles de cohérence (total cotisations = somme des parts salarié + employeur)
- Vérifier les données obligatoires (NIR, SIRET, dates, etc.)
- Retourner les erreurs et avertissements

#### Module de calcul des cotisations

**Fichier** : `/backend/src/services/socialContributionsCalculator.ts`

Responsabilités :
- Calculer les cotisations sociales selon les taux en vigueur
- Gérer les tranches de cotisations (Tranche A, B, C du plafond SS)
- Calculer les réductions de cotisations (réduction Fillon, etc.)
- Préparer les données pour le bloc S43 de la DSN

### 4. Frontend

#### Nouvelle page DSN

**Fichier** : `/frontend/src/pages/DSNPage.tsx`

Fonctionnalités :
- Sélection de la période et du type de DSN
- Bouton "Générer la DSN"
- Liste des DSN générées avec statuts
- Prévisualisation des données avant génération
- Affichage des erreurs de validation
- Téléchargement du fichier XML

#### Composants

- `DSNList.tsx` : Liste des DSN générées
- `DSNGenerator.tsx` : Formulaire de génération
- `DSNPreview.tsx` : Aperçu des données qui seront incluses
- `DSNValidationErrors.tsx` : Affichage des erreurs et avertissements

---

## ✅ Critères d'acceptation

### Phase 1 : Fondations (MVP)

- [ ] Les nouveaux champs requis sont ajoutés aux modèles `Company` et `Employee`
- [ ] Le modèle `SocialContribution` est créé et migré
- [ ] Le modèle `DSNDeclaration` est créé et migré
- [ ] Les migrations Prisma sont appliquées sans erreur
- [ ] Les formulaires frontend permettent de saisir les nouvelles données

### Phase 2 : Génération DSN mensuelle

- [ ] Le module `dsnGenerator.ts` génère un XML conforme à la norme NNORME 4DS
- [ ] Les blocs obligatoires sont correctement remplis (S10, S20, S21, S40, S41, S43)
- [ ] Les dates sont au format ISO 8601 (YYYY-MM-DD)
- [ ] Les montants sont arrondis à 2 décimales
- [ ] Le fichier XML est valide syntaxiquement
- [ ] L'endpoint `POST /api/companies/:companyId/dsn/generate` fonctionne
- [ ] L'endpoint `GET /api/companies/:companyId/dsn/:dsnId/download` permet de télécharger le XML

### Phase 3 : Validation

- [ ] Le module `dsnValidator.ts` valide le XML contre le schéma XSD officiel
- [ ] Les contrôles métier sont implémentés (NIR valide, SIRET valide, etc.)
- [ ] Les erreurs bloquantes sont clairement identifiées
- [ ] Les avertissements sont distingués des erreurs
- [ ] L'endpoint `POST /api/companies/:companyId/dsn/:dsnId/validate` retourne les résultats

### Phase 4 : Calcul des cotisations

- [ ] Le module `socialContributionsCalculator.ts` calcule les cotisations URSSAF
- [ ] Les tranches A, B, C du plafond SS sont gérées
- [ ] Les taux de cotisations 2025 sont implémentés
- [ ] Les cotisations sont enregistrées dans `SocialContribution`
- [ ] Le total des cotisations correspond au net calculé dans les paies

### Phase 5 : Interface utilisateur

- [ ] La page DSN est accessible depuis le menu principal
- [ ] L'utilisateur peut générer une DSN pour une période donnée
- [ ] La liste des DSN affiche le statut et les métadonnées
- [ ] Les erreurs de validation sont affichées clairement
- [ ] Le téléchargement du fichier XML fonctionne
- [ ] L'interface est responsive et accessible

### Phase 6 : Tests

- [ ] Tests unitaires du générateur DSN (≥80% de couverture)
- [ ] Tests unitaires du validateur DSN (≥80% de couverture)
- [ ] Tests unitaires du calculateur de cotisations (≥90% de couverture)
- [ ] Tests d'intégration des endpoints API
- [ ] Tests E2E du flux complet (génération → validation → téléchargement)
- [ ] Tests avec des jeux de données réalistes

### Phase 7 : Documentation

- [ ] Documentation technique de la norme DSN dans `/docs`
- [ ] Guide utilisateur pour générer une DSN
- [ ] Documentation des codes de cotisations (CTP) supportés
- [ ] Exemples de fichiers DSN générés
- [ ] FAQ sur la DSN

---

## 🚀 Plan de mise en œuvre

### Étape 1 : Préparation (1-2 jours)

1. Étude de la norme NNORME 4DS (documentation officielle)
2. Analyse des schémas XSD fournis par la DSN
3. Identification des blocs obligatoires vs optionnels
4. Téléchargement des référentiels (codes organismes, codes CTP, etc.)

### Étape 2 : Modèles de données (2-3 jours)

1. Extension des modèles `Company` et `Employee`
2. Création du modèle `SocialContribution`
3. Création du modèle `DSNDeclaration`
4. Écriture et test des migrations Prisma
5. Mise à jour des formulaires frontend

### Étape 3 : Calcul des cotisations (3-4 jours)

1. Implémentation du calculateur de cotisations
2. Gestion des tranches du plafond SS
3. Implémentation des taux 2025
4. Tests unitaires exhaustifs
5. Intégration avec le moteur de paie existant

### Étape 4 : Générateur DSN (4-5 jours)

1. Création de la structure XML de base
2. Implémentation des blocs S10, S20, S21
3. Implémentation des blocs S40, S41, S43
4. Gestion des cas particuliers (multi-établissements, etc.)
5. Tests unitaires avec des fixtures

### Étape 5 : Validateur DSN (2-3 jours)

1. Validation XML contre le schéma XSD
2. Implémentation des contrôles métier
3. Gestion des erreurs et avertissements
4. Tests avec des DSN invalides

### Étape 6 : API Backend (2 jours)

1. Création du router `/api/dsn`
2. Implémentation des endpoints CRUD
3. Sécurisation et vérification des permissions
4. Tests d'intégration des endpoints

### Étape 7 : Interface Frontend (3-4 jours)

1. Création de la page DSN
2. Formulaire de génération
3. Liste et statuts des DSN
4. Affichage des erreurs de validation
5. Téléchargement du fichier XML
6. Tests Vitest des composants

### Étape 8 : Tests et validation (2-3 jours)

1. Tests E2E du flux complet
2. Tests avec des données de production anonymisées
3. Validation manuelle des fichiers générés
4. Test de soumission sur un environnement de test DSN

### Étape 9 : Documentation (1-2 jours)

1. Rédaction de la documentation technique
2. Guide utilisateur
3. Documentation des limitations (phase 1)
4. Mise à jour du README

**Durée totale estimée : 20-28 jours de développement**

---

## 📚 Ressources et références

### Documentation officielle

- [DSN - Documentation net-entreprises.fr](https://www.net-entreprises.fr/declaration/dsn/)
- [Norme NNORME 4DS - Cahier technique](https://dsn-info.custhelp.com/app/answers/detail/a_id/2655)
- [Schémas XSD officiels](https://www.net-entreprises.fr/ressources-dsn/)
- [Référentiel des codes CTP](https://www.net-entreprises.fr/ressources-dsn/referentiels/)
- [URSSAF - Guide DSN](https://www.urssaf.fr/portail/home/employeur/declarer-et-payer/la-declaration-sociale-nominativ.html)

### Outils de validation

- [TéléDSN - Outil de test net-entreprises](https://www.net-entreprises.fr/services-en-ligne/teledec/)
- [Validateur XSD en ligne](https://www.freeformatter.com/xml-validator-xsd.html)

### Exemples et librairies

- [Exemples de DSN](https://dsn-info.custhelp.com/app/answers/list/kw/exemple/search/1)
- [Librairies Node.js XML](https://www.npmjs.com/package/xmlbuilder2)

### Conformité légale

- [Code de la Sécurité Sociale - Article R243-14](https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000038610253)
- [Arrêté du 10 février 2016 (norme DSN)](https://www.legifrance.gouv.fr/loda/id/JORFTEXT000032046033)

---

## 🔮 Évolutions futures (hors scope MVP)

### Phase 2 : Transmission automatique

- Intégration avec l'API net-entreprises.fr
- Authentification par certificat
- Transmission automatique des DSN
- Récupération des accusés de réception (CRA)
- Gestion des rejets et corrections

### Phase 3 : DSN événementielles

- Génération de DSN événementielles (fins de contrat, AT/MP)
- Gestion des arrêts maladie et maternité
- DSN de signalement (embauche immédiate)

### Phase 4 : Fonctionnalités avancées

- Gestion multi-établissements
- Support des conventions collectives spécifiques
- Calcul de la réduction Fillon
- Gestion des acomptes de cotisations
- Export vers les cabinets comptables

---

## 🏷️ Labels suggérés

- `enhancement` : Nouvelle fonctionnalité
- `priority-high` : Priorité élevée (obligation légale)
- `backend` : Impacte principalement le backend
- `frontend` : Nécessite aussi des changements frontend
- `compliance` : Conformité réglementaire
- `complex` : Tâche complexe nécessitant expertise
- `documentation` : Nécessite documentation approfondie

---

## 💬 Questions ouvertes

1. **Calendrier** : Quelle est la deadline visée pour cette fonctionnalité ?
2. **Données de test** : Avons-nous accès à des données de test réalistes ?
3. **Environnement de test DSN** : Pouvons-nous obtenir un accès au bac à sable net-entreprises ?
4. **Expertise métier** : Avons-nous accès à un expert DSN/paie pour valider l'implémentation ?
5. **Portée MVP** : Doit-on se limiter à la DSN mensuelle standard ou inclure les cas complexes ?
6. **Transmission** : La transmission automatique fait-elle partie du MVP ou d'une phase 2 ?

---

## 📝 Checklist avant démarrage

- [ ] Validation de la portée fonctionnelle par le product owner
- [ ] Confirmation du planning et des ressources
- [ ] Accès à la documentation officielle DSN
- [ ] Création d'un compte de test net-entreprises
- [ ] Téléchargement des référentiels et schémas XSD
- [ ] Préparation de jeux de données de test
- [ ] Briefing avec un expert paie (si disponible)
- [ ] Création de la branche feature `feature/dsn-support`
